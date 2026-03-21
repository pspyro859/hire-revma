const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');

let sendQuoteToCustomer;
try {
  sendQuoteToCustomer = require('../utils/email').sendQuoteToCustomer;
} catch {
  sendQuoteToCustomer = async () => {};
}

const router = express.Router();

// Configure multer for ID document uploads
const idDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/id_documents'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.params.quoteId}_${req.body.doc_type}_${uuidv4().slice(0, 8)}.jpg`;
    cb(null, uniqueName);
  }
});

const uploadIdDoc = multer({ storage: idDocStorage });

// ID Points values for Australian 100-point check
const ID_POINTS = {
  drivers_licence: 40,
  passport: 70,
  birth_certificate: 70,
  citizenship_certificate: 70,
  medicare: 25,
  credit_card: 25,
  utility_bill: 25,
  bank_statement: 25,
  other: 10
};

const generateQuoteNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `Q-${dateStr}-${uuidv4().slice(0, 6).toUpperCase()}`;
};

const generateAccessToken = () => {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
};

const parseJSON = (val) => {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
};

const formatQuote = (row) => ({
  ...row,
  line_items: parseJSON(row.line_items) || [],
  id_documents: parseJSON(row.id_documents) || []
});

// ===================== STAFF ROUTES =====================

// POST /api/quotes (Staff only)
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      inquiry_id, customer_email, customer_name, customer_phone,
      line_items, hire_start_date, hire_end_date, delivery_method,
      delivery_address, delivery_fee, notes, valid_until
    } = req.body;

    const subtotal = line_items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    // Calculate security bond
    let security_bond = 0;
    for (const item of line_items) {
      if (item.machine_id) {
        const [mRows] = await getPool().query('SELECT security_bond FROM machines WHERE id = ?', [item.machine_id]);
        if (mRows.length > 0) security_bond += parseFloat(mRows[0].security_bond) || 0;
      }
    }

    const total = subtotal + (delivery_fee || 0) + security_bond;

    const id = uuidv4();
    await getPool().query('INSERT INTO quotes SET ?', [{
      id,
      quote_number: generateQuoteNumber(),
      inquiry_id: inquiry_id || null,
      customer_email,
      customer_name,
      customer_phone,
      line_items: JSON.stringify(line_items),
      hire_start_date: hire_start_date || null,
      hire_end_date: hire_end_date || null,
      delivery_method: delivery_method || null,
      delivery_address: delivery_address || null,
      delivery_fee: delivery_fee || 0,
      subtotal,
      security_bond,
      total,
      notes: notes || null,
      valid_until: valid_until || null,
      status: 'draft',
      access_token: generateAccessToken(),
      id_documents: JSON.stringify([]),
      id_verified: 0,
      customer_signature: null,
      signed_at: null,
      created_by: req.user.id
    }]);

    // Update inquiry status
    if (inquiry_id) {
      await getPool().query('UPDATE inquiries SET status = ? WHERE id = ?', ['quoted', inquiry_id]);
    }

    const [rows] = await getPool().query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json(formatQuote(rows[0]));
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ detail: 'Failed to create quote' });
  }
});

// GET /api/quotes (Staff only)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM quotes';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await getPool().query(sql, params);
    res.json(rows.map(formatQuote));
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ detail: 'Failed to get quotes' });
  }
});

// GET /api/quotes/:id (Staff only)
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Quote not found' });
    }
    res.json(formatQuote(rows[0]));
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ detail: 'Failed to get quote' });
  }
});

// POST /api/quotes/:id/send (Staff only)
router.post('/:id/send', authenticate, requireStaff, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Quote not found' });
    }
    const quote = formatQuote(rows[0]);

    await getPool().query('UPDATE quotes SET status = ? WHERE id = ?', ['sent', req.params.id]);
    quote.status = 'sent';

    sendQuoteToCustomer(quote).catch(err => console.error('Failed to send quote email:', err));

    res.json({ success: true, message: 'Quote sent to customer' });
  } catch (error) {
    console.error('Send quote error:', error);
    res.status(500).json({ detail: 'Failed to send quote' });
  }
});

// PUT /api/quotes/:id/verify-id (Staff only)
router.put('/:id/verify-id', authenticate, requireStaff, async (req, res) => {
  try {
    const { verified } = req.body;

    const [result] = await getPool().query(
      'UPDATE quotes SET id_verified = ? WHERE id = ?',
      [verified ? 1 : 0, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Quote not found' });
    }

    res.json({ success: true, id_verified: verified });
  } catch (error) {
    console.error('Verify ID error:', error);
    res.status(500).json({ detail: 'Failed to verify ID' });
  }
});

// ===================== CUSTOMER ROUTES (No Auth) =====================

// GET /api/customer/quote/:quoteId
router.get('/quote/:quoteId', async (req, res) => {
  try {
    const { token } = req.query;
    
    const [rows] = await getPool().query(
      'SELECT * FROM quotes WHERE id = ? AND access_token = ?',
      [req.params.quoteId, token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Quote not found or invalid token' });
    }
    const quote = formatQuote(rows[0]);

    // Get terms
    const [termsRows] = await getPool().query('SELECT * FROM terms WHERE is_active = 1 ORDER BY display_order ASC');

    const totalPoints = (quote.id_documents || []).reduce((sum, doc) => sum + (doc.points || 0), 0);

    res.json({
      quote,
      terms: termsRows,
      id_points_total: totalPoints,
      id_points_required: 100
    });
  } catch (error) {
    console.error('Get customer quote error:', error);
    res.status(500).json({ detail: 'Failed to get quote' });
  }
});

// POST /api/customer/quote/:quoteId/upload-id
router.post('/quote/:quoteId/upload-id', uploadIdDoc.single('file'), async (req, res) => {
  try {
    const { token, doc_type } = req.body;

    const [rows] = await getPool().query(
      'SELECT * FROM quotes WHERE id = ? AND access_token = ?',
      [req.params.quoteId, token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Quote not found or invalid token' });
    }
    const quote = formatQuote(rows[0]);

    if (!['sent', 'accepted'].includes(quote.status)) {
      return res.status(400).json({ detail: 'Quote is not available for ID upload' });
    }

    const points = ID_POINTS[doc_type] || 10;
    const filename = req.file.filename;

    let idDocuments = quote.id_documents || [];
    idDocuments = idDocuments.filter(d => d.doc_type !== doc_type);
    idDocuments.push({ doc_type, points, filename, uploaded_at: new Date().toISOString() });

    const totalPoints = idDocuments.reduce((sum, doc) => sum + (doc.points || 0), 0);
    const idVerified = totalPoints >= 100;

    await getPool().query(
      'UPDATE quotes SET id_documents = ?, id_verified = ? WHERE id = ?',
      [JSON.stringify(idDocuments), idVerified ? 1 : 0, req.params.quoteId]
    );

    res.json({ success: true, filename, points, total_points: totalPoints, id_verified: idVerified });
  } catch (error) {
    console.error('Upload ID error:', error);
    res.status(500).json({ detail: 'Failed to upload ID document' });
  }
});

// POST /api/customer/quote/:quoteId/sign
router.post('/quote/:quoteId/sign', async (req, res) => {
  try {
    const { token, signature_data, agreed_to_terms } = req.body;

    const [rows] = await getPool().query(
      'SELECT * FROM quotes WHERE id = ? AND access_token = ?',
      [req.params.quoteId, token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Quote not found or invalid token' });
    }
    const quote = rows[0];

    if (agreed_to_terms !== 'true' && agreed_to_terms !== true) {
      return res.status(400).json({ detail: 'You must agree to the terms and conditions' });
    }

    if (!quote.id_verified) {
      return res.status(400).json({ detail: 'Please upload 100 points of ID before signing' });
    }

    const sigFilename = `${req.params.quoteId}_customer_${uuidv4().slice(0, 8)}.png`;
    const sigPath = path.join(__dirname, '../uploads/signatures', sigFilename);

    const sigData = signature_data.includes(',') ? signature_data.split(',')[1] : signature_data;
    const sigBuffer = Buffer.from(sigData, 'base64');
    fs.writeFileSync(sigPath, sigBuffer);

    await getPool().query(
      'UPDATE quotes SET customer_signature = ?, signed_at = NOW(), status = ? WHERE id = ?',
      [sigFilename, 'accepted', req.params.quoteId]
    );

    res.json({ success: true, message: 'Agreement signed successfully' });
  } catch (error) {
    console.error('Sign quote error:', error);
    res.status(500).json({ detail: 'Failed to sign agreement' });
  }
});

module.exports = router;
