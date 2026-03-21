const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');

let sendInquiryNotification, sendInquiryConfirmation;
try {
  const emailUtils = require('../utils/email');
  sendInquiryNotification = emailUtils.sendInquiryNotification;
  sendInquiryConfirmation = emailUtils.sendInquiryConfirmation;
} catch {
  sendInquiryNotification = async () => {};
  sendInquiryConfirmation = async () => {};
}

const router = express.Router();

// Generate quote number
const generateQuoteNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `Q-${dateStr}-${uuidv4().slice(0, 6).toUpperCase()}`;
};

const generateAccessToken = () => {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
};

const calculatePricing = (machine, startDate, endDate, ratePreference) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let rate = 0;
  let rate_type = ratePreference || 'daily';
  let quantity = diffDays;
  let subtotal = 0;

  if (ratePreference === 'monthly' && diffDays >= 28 && machine.monthly_rate) {
    const months = Math.max(1, Math.round(diffDays / 30));
    rate = machine.monthly_rate;
    rate_type = 'monthly';
    quantity = months;
    subtotal = rate * months;
  } else if (ratePreference === 'weekly' && diffDays >= 7 && machine.weekly_rate) {
    const weeks = Math.max(1, Math.round(diffDays / 7));
    rate = machine.weekly_rate;
    rate_type = 'weekly';
    quantity = weeks;
    subtotal = rate * weeks;
  } else {
    rate = machine.daily_rate || 0;
    rate_type = 'daily';
    quantity = diffDays;
    subtotal = rate * diffDays;
  }

  return { rate, rate_type, quantity, subtotal };
};

const parseJSON = (val) => {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
};

// POST /api/inquiries (Public)
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, is_business, company_name, abn,
      equipment, hire_start_date, hire_end_date, hire_rate_preference,
      delivery_method, delivery_address, job_description, additional_notes
    } = req.body;

    const inquiryId = uuidv4();
    await getPool().query('INSERT INTO inquiries SET ?', [{
      id: inquiryId,
      first_name,
      last_name,
      email,
      phone,
      is_business: is_business ? 1 : 0,
      company_name: company_name || null,
      abn: abn || null,
      equipment: JSON.stringify(equipment || []),
      hire_start_date: hire_start_date || null,
      hire_end_date: hire_end_date || null,
      hire_rate_preference: hire_rate_preference || null,
      delivery_method: delivery_method || null,
      delivery_address: delivery_address || null,
      job_description: job_description || null,
      additional_notes: additional_notes || null,
      status: 'new'
    }]);

    // Auto-generate a draft quote
    let quoteId = null;
    try {
      const [allMachines] = await getPool().query('SELECT * FROM machines');
      const line_items = [];
      let security_bond = 0;

      for (const eqName of (equipment || [])) {
        const machine = allMachines.find(m =>
          m.name.toLowerCase().includes(eqName.toLowerCase()) ||
          eqName.toLowerCase().includes(m.name.toLowerCase())
        );

        if (machine) {
          const pricing = calculatePricing(machine, hire_start_date, hire_end_date, hire_rate_preference);
          line_items.push({
            machine_id: machine.id,
            machine_name: machine.name,
            rate_type: pricing.rate_type,
            rate: pricing.rate,
            quantity: pricing.quantity,
            subtotal: pricing.subtotal
          });
          security_bond += parseFloat(machine.security_bond) || 0;
        } else {
          line_items.push({
            machine_id: null,
            machine_name: eqName,
            rate_type: hire_rate_preference || 'daily',
            rate: 0,
            quantity: 1,
            subtotal: 0
          });
        }
      }

      const subtotal = line_items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const delivery_fee_amount = delivery_method === 'delivery' ? 50 : 0;
      const total = subtotal + delivery_fee_amount + security_bond;

      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 14);

      quoteId = uuidv4();
      await getPool().query('INSERT INTO quotes SET ?', [{
        id: quoteId,
        quote_number: generateQuoteNumber(),
        inquiry_id: inquiryId,
        customer_email: email,
        customer_name: `${first_name} ${last_name}`,
        customer_phone: phone,
        line_items: JSON.stringify(line_items),
        hire_start_date: hire_start_date || null,
        hire_end_date: hire_end_date || null,
        delivery_method: delivery_method || null,
        delivery_address: delivery_address || null,
        delivery_fee: delivery_fee_amount,
        subtotal,
        security_bond,
        total,
        notes: job_description || '',
        valid_until: validDate.toISOString().slice(0, 10),
        status: 'draft',
        access_token: generateAccessToken(),
        id_documents: JSON.stringify([]),
        id_verified: 0,
        customer_signature: null,
        created_by: 'auto'
      }]);

      // Update inquiry with quote_id
      await getPool().query('UPDATE inquiries SET quote_id = ? WHERE id = ?', [quoteId, inquiryId]);
    } catch (quoteErr) {
      console.error('Failed to auto-generate quote:', quoteErr);
    }

    const [rows] = await getPool().query('SELECT * FROM inquiries WHERE id = ?', [inquiryId]);
    const inquiry = { ...rows[0], equipment: parseJSON(rows[0].equipment) || [] };
    inquiry.quote_id = quoteId;

    // Send emails async
    sendInquiryNotification(inquiry).catch(err => console.error('Failed to send inquiry notification:', err));
    sendInquiryConfirmation(inquiry).catch(err => console.error('Failed to send inquiry confirmation:', err));

    res.json(inquiry);
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ detail: 'Failed to create inquiry' });
  }
});

// GET /api/inquiries (Staff only)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM inquiries';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await getPool().query(sql, params);
    res.json(rows.map(r => ({ ...r, equipment: parseJSON(r.equipment) || [] })));
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ detail: 'Failed to get inquiries' });
  }
});

// GET /api/inquiries/:id (Staff only)
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Inquiry not found' });
    }
    res.json({ ...rows[0], equipment: parseJSON(rows[0].equipment) || [] });
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ detail: 'Failed to get inquiry' });
  }
});

// PUT /api/inquiries/:id/status (Staff only)
router.put('/:id/status', authenticate, requireStaff, async (req, res) => {
  try {
    const { status } = req.query;

    const [result] = await getPool().query(
      'UPDATE inquiries SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Inquiry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({ detail: 'Failed to update inquiry status' });
  }
});

module.exports = router;
