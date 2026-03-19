const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Inquiry } = require('../models');
const { authenticate, requireStaff } = require('../middleware/auth');
const { sendInquiryNotification } = require('../utils/email');

const router = express.Router();

// POST /api/inquiries (Public - no auth required)
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, is_business, company_name, abn,
      equipment, hire_start_date, hire_end_date, hire_rate_preference,
      delivery_method, delivery_address, job_description, additional_notes
    } = req.body;

    const inquiry = new Inquiry({
      id: uuidv4(),
      first_name,
      last_name,
      email,
      phone,
      is_business: is_business || false,
      company_name,
      abn,
      equipment: equipment || [],
      hire_start_date,
      hire_end_date,
      hire_rate_preference,
      delivery_method,
      delivery_address,
      job_description,
      additional_notes,
      status: 'new',
      created_at: new Date().toISOString()
    });

    await inquiry.save();

    // Send email notification (async, don't wait)
    sendInquiryNotification(inquiry.toObject()).catch(err => {
      console.error('Failed to send inquiry notification:', err);
    });

    const result = inquiry.toObject();
    delete result._id;
    delete result.__v;
    res.json(result);
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ detail: 'Failed to create inquiry' });
  }
});

// GET /api/inquiries (Staff only)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const inquiries = await Inquiry.find(query).select('-_id -__v').sort({ created_at: -1 });
    res.json(inquiries);
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ detail: 'Failed to get inquiries' });
  }
});

// GET /api/inquiries/:id (Staff only)
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const inquiry = await Inquiry.findOne({ id: req.params.id }).select('-_id -__v');
    if (!inquiry) {
      return res.status(404).json({ detail: 'Inquiry not found' });
    }
    res.json(inquiry);
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ detail: 'Failed to get inquiry' });
  }
});

// PUT /api/inquiries/:id/status (Staff only)
router.put('/:id/status', authenticate, requireStaff, async (req, res) => {
  try {
    const { status } = req.query;

    const result = await Inquiry.updateOne(
      { id: req.params.id },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Inquiry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({ detail: 'Failed to update inquiry status' });
  }
});

module.exports = router;
