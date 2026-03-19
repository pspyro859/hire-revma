const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Quote, Machine, Inquiry, Terms } = require('../models');
const { authenticate, requireStaff } = require('../middleware/auth');
const { sendQuoteToCustomer } = require('../utils/email');

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

// Generate quote number
const generateQuoteNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `Q-${dateStr}-${uuidv4().slice(0, 6).toUpperCase()}`;
};

// Generate access token
const generateAccessToken = () => {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
};

// ===================== STAFF ROUTES =====================

// POST /api/quotes (Staff only)
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      inquiry_id, customer_email, customer_name, customer_phone,
      line_items, hire_start_date, hire_end_date, delivery_method,
      delivery_address, delivery_fee, notes, valid_until
    } = req.body;

    // Calculate totals
    const subtotal = line_items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    // Calculate security bond
    let security_bond = 0;
    for (const item of line_items) {
      const machine = await Machine.findOne({ id: item.machine_id });
      if (machine) {
        security_bond += machine.security_bond || 0;
      }
    }

    const total = subtotal + (delivery_fee || 0) + security_bond;

    const quote = new Quote({
      id: uuidv4(),
      quote_number: generateQuoteNumber(),
      inquiry_id,
      customer_email,
      customer_name,
      customer_phone,
      line_items,
      hire_start_date,
      hire_end_date,
      delivery_method,
      delivery_address,
      delivery_fee: delivery_fee || 0,
      subtotal,
      security_bond,
      total,
      notes,
      valid_until,
      status: 'draft',
      access_token: generateAccessToken(),
      id_documents: [],
      id_verified: false,
      customer_signature: null,
      signed_at: null,
      created_at: new Date().toISOString(),
      created_by: req.user.id
    });

    await quote.save();

    // Update inquiry status
    if (inquiry_id) {
      await Inquiry.updateOne({ id: inquiry_id }, { $set: { status: 'quoted' } });
    }

    const result = quote.toObject();
    delete result._id;
    delete result.__v;
    res.json(result);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ detail: 'Failed to create quote' });
  }
});

// GET /api/quotes (Staff only)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const quotes = await Quote.find(query).select('-_id -__v').sort({ created_at: -1 });
    res.json(quotes);
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ detail: 'Failed to get quotes' });
  }
});

// GET /api/quotes/:id (Staff only)
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const quote = await Quote.findOne({ id: req.params.id }).select('-_id -__v');
    if (!quote) {
      return res.status(404).json({ detail: 'Quote not found' });
    }
    res.json(quote);
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ detail: 'Failed to get quote' });
  }
});

// POST /api/quotes/:id/send (Staff only)
router.post('/:id/send', authenticate, requireStaff, async (req, res) => {
  try {
    const quote = await Quote.findOne({ id: req.params.id });
    if (!quote) {
      return res.status(404).json({ detail: 'Quote not found' });
    }

    // Update status
    await Quote.updateOne({ id: req.params.id }, { $set: { status: 'sent' } });

    // Send email
    const quoteObj = quote.toObject();
    quoteObj.status = 'sent';
    sendQuoteToCustomer(quoteObj).catch(err => {
      console.error('Failed to send quote email:', err);
    });

    res.json({ success: true, message: 'Quote sent to customer' });
  } catch (error) {
    console.error('Send quote error:', error);
    res.status(500).json({ detail: 'Failed to send quote' });
  }
});

// PUT /api/quotes/:id/verify-id (Staff only - approve/reject ID)
router.put('/:id/verify-id', authenticate, requireStaff, async (req, res) => {
  try {
    const { verified } = req.body;

    const result = await Quote.updateOne(
      { id: req.params.id },
      { $set: { id_verified: verified } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Quote not found' });
    }

    res.json({ success: true, id_verified: verified });
  } catch (error) {
    console.error('Verify ID error:', error);
    res.status(500).json({ detail: 'Failed to verify ID' });
  }
});

// ===================== CUSTOMER ROUTES (No Auth) =====================

// GET /api/customer/quote/:quoteId (Customer access with token)
router.get('/quote/:quoteId', async (req, res) => {
  try {
    const { token } = req.query;
    
    const quote = await Quote.findOne({ 
      id: req.params.quoteId, 
      access_token: token 
    }).select('-_id -__v');

    if (!quote) {
      return res.status(404).json({ detail: 'Quote not found or invalid token' });
    }

    // Get terms
    const terms = await Terms.find({ is_active: true }).select('-_id -__v').sort({ order: 1 });

    // Calculate ID points
    const totalPoints = (quote.id_documents || []).reduce((sum, doc) => sum + (doc.points || 0), 0);

    res.json({
      quote,
      terms,
      id_points_total: totalPoints,
      id_points_required: 100
    });
  } catch (error) {
    console.error('Get customer quote error:', error);
    res.status(500).json({ detail: 'Failed to get quote' });
  }
});

// POST /api/customer/quote/:quoteId/upload-id (Customer uploads ID)
router.post('/quote/:quoteId/upload-id', uploadIdDoc.single('file'), async (req, res) => {
  try {
    const { token, doc_type } = req.body;

    const quote = await Quote.findOne({ 
      id: req.params.quoteId, 
      access_token: token 
    });

    if (!quote) {
      return res.status(404).json({ detail: 'Quote not found or invalid token' });
    }

    if (!['sent', 'accepted'].includes(quote.status)) {
      return res.status(400).json({ detail: 'Quote is not available for ID upload' });
    }

    const points = ID_POINTS[doc_type] || 10;
    const filename = req.file.filename;

    // Update ID documents
    let idDocuments = quote.id_documents || [];
    idDocuments = idDocuments.filter(d => d.doc_type !== doc_type);
    idDocuments.push({
      doc_type,
      points,
      filename,
      uploaded_at: new Date().toISOString()
    });

    // Calculate total points
    const totalPoints = idDocuments.reduce((sum, doc) => sum + (doc.points || 0), 0);
    const idVerified = totalPoints >= 100;

    await Quote.updateOne(
      { id: req.params.quoteId },
      { $set: { id_documents: idDocuments, id_verified: idVerified } }
    );

    res.json({
      success: true,
      filename,
      points,
      total_points: totalPoints,
      id_verified: idVerified
    });
  } catch (error) {
    console.error('Upload ID error:', error);
    res.status(500).json({ detail: 'Failed to upload ID document' });
  }
});

// POST /api/customer/quote/:quoteId/sign (Customer signs)
router.post('/quote/:quoteId/sign', async (req, res) => {
  try {
    const { token, signature_data, agreed_to_terms } = req.body;

    const quote = await Quote.findOne({ 
      id: req.params.quoteId, 
      access_token: token 
    });

    if (!quote) {
      return res.status(404).json({ detail: 'Quote not found or invalid token' });
    }

    if (agreed_to_terms !== 'true' && agreed_to_terms !== true) {
      return res.status(400).json({ detail: 'You must agree to the terms and conditions' });
    }

    if (!quote.id_verified) {
      return res.status(400).json({ detail: 'Please upload 100 points of ID before signing' });
    }

    // Save signature
    const sigFilename = `${req.params.quoteId}_customer_${uuidv4().slice(0, 8)}.png`;
    const sigPath = path.join(__dirname, '../uploads/signatures', sigFilename);

    const sigData = signature_data.includes(',') ? signature_data.split(',')[1] : signature_data;
    const sigBuffer = Buffer.from(sigData, 'base64');
    fs.writeFileSync(sigPath, sigBuffer);

    // Update quote
    await Quote.updateOne(
      { id: req.params.quoteId },
      { $set: {
        customer_signature: sigFilename,
        signed_at: new Date().toISOString(),
        status: 'accepted'
      }}
    );

    res.json({ success: true, message: 'Agreement signed successfully' });
  } catch (error) {
    console.error('Sign quote error:', error);
    res.status(500).json({ detail: 'Failed to sign agreement' });
  }
});

module.exports = router;
