const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Agreement, User, Machine } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for photo uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/photos'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.params.id}_${req.body.position}_${uuidv4().slice(0, 8)}.jpg`;
    cb(null, uniqueName);
  }
});

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/signatures'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.params.id}_${req.body.signature_type}_${uuidv4().slice(0, 8)}.png`;
    cb(null, uniqueName);
  }
});

const uploadPhoto = multer({ storage: photoStorage });
const uploadSignature = multer({ storage: signatureStorage });

// Generate agreement number
const generateAgreementNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `REV-${dateStr}-${uuidv4().slice(0, 6).toUpperCase()}`;
};

// Default checklist items
const getDefaultChecklist = () => [
  { item: 'Engine Oil Level', checked: false, notes: null },
  { item: 'Fuel Level', checked: false, notes: null },
  { item: 'Coolant Level', checked: false, notes: null },
  { item: 'Hydraulic Fluid Level', checked: false, notes: null },
  { item: 'Tracks/Tyres Condition', checked: false, notes: null },
  { item: 'Visible Damage Inspection', checked: false, notes: null },
  { item: 'Lights & Indicators Working', checked: false, notes: null },
  { item: 'Safety Equipment Present', checked: false, notes: null }
];

// POST /api/agreements
router.post('/', authenticate, async (req, res) => {
  try {
    const { customer_id, machine_id, hire_start_date, hire_end_date, hire_rate_type, delivery_method, delivery_address, job_site, purpose, special_conditions } = req.body;

    // Get customer
    const customer = await User.findOne({ id: customer_id }).select('-password_hash -_id -__v');
    if (!customer) {
      return res.status(404).json({ detail: 'Customer not found' });
    }

    // Get machine
    const machine = await Machine.findOne({ id: machine_id }).select('-_id -__v');
    if (!machine) {
      return res.status(404).json({ detail: 'Machine not found' });
    }

    // Calculate hire rate
    const rateMap = { daily: machine.daily_rate, weekly: machine.weekly_rate, monthly: machine.monthly_rate };
    const hireRate = rateMap[hire_rate_type] || machine.daily_rate;

    const agreement = new Agreement({
      id: uuidv4(),
      agreement_number: generateAgreementNumber(),
      customer_id,
      customer_name: customer.full_name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_licence: customer.drivers_licence,
      customer_abn: customer.abn,
      customer_company: customer.company_name,
      customer_address: customer.address,
      machine_id,
      machine_name: machine.name,
      machine_make: machine.make,
      machine_model: machine.model,
      hire_start_date,
      hire_end_date,
      hire_rate_type,
      hire_rate: hireRate,
      security_bond: machine.security_bond,
      delivery_method,
      delivery_address,
      job_site,
      purpose,
      special_conditions,
      checklist: getDefaultChecklist(),
      photos: [],
      customer_signature: null,
      staff_signature: null,
      status: 'draft',
      pdf_path: null,
      created_at: new Date().toISOString(),
      signed_at: null
    });

    await agreement.save();

    const result = agreement.toObject();
    delete result._id;
    delete result.__v;
    res.json(result);
  } catch (error) {
    console.error('Create agreement error:', error);
    res.status(500).json({ detail: 'Failed to create agreement' });
  }
});

// GET /api/agreements
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (req.user.role === 'customer') {
      query.customer_id = req.user.id;
    }
    if (status) query.status = status;

    const agreements = await Agreement.find(query).select('-_id -__v').sort({ created_at: -1 });
    res.json(agreements);
  } catch (error) {
    console.error('Get agreements error:', error);
    res.status(500).json({ detail: 'Failed to get agreements' });
  }
});

// GET /api/agreements/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ id: req.params.id }).select('-_id -__v');
    if (!agreement) {
      return res.status(404).json({ detail: 'Agreement not found' });
    }

    // Check access
    if (req.user.role === 'customer' && agreement.customer_id !== req.user.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    res.json(agreement);
  } catch (error) {
    console.error('Get agreement error:', error);
    res.status(500).json({ detail: 'Failed to get agreement' });
  }
});

// PUT /api/agreements/:id/checklist
router.put('/:id/checklist', authenticate, async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ id: req.params.id });
    if (!agreement) {
      return res.status(404).json({ detail: 'Agreement not found' });
    }

    const checklist = req.body;
    const allChecked = checklist.every(item => item.checked);
    
    let newStatus = allChecked ? 'pending_photos' : 'pending_checklist';
    if (agreement.status === 'draft') {
      newStatus = 'pending_checklist';
    }

    await Agreement.updateOne(
      { id: req.params.id },
      { $set: { checklist, status: newStatus } }
    );

    res.json({ success: true, all_checked: allChecked });
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ detail: 'Failed to update checklist' });
  }
});

// POST /api/agreements/:id/photos
router.post('/:id/photos', authenticate, uploadPhoto.single('file'), async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ id: req.params.id });
    if (!agreement) {
      return res.status(404).json({ detail: 'Agreement not found' });
    }

    const { position } = req.body;
    const filename = req.file.filename;

    // Update photos array
    let photos = agreement.photos || [];
    photos = photos.filter(p => p.position !== position);
    photos.push({
      position,
      filename,
      uploaded_at: new Date().toISOString()
    });

    // Check if all 4 photos uploaded
    const hasAllPhotos = new Set(photos.map(p => p.position)).size >= 4;
    const newStatus = hasAllPhotos ? 'pending_signature' : 'pending_photos';

    await Agreement.updateOne(
      { id: req.params.id },
      { $set: { photos, status: newStatus } }
    );

    res.json({ success: true, filename, has_all_photos: hasAllPhotos });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ detail: 'Failed to upload photo' });
  }
});

// POST /api/agreements/:id/sign
router.post('/:id/sign', authenticate, async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ id: req.params.id });
    if (!agreement) {
      return res.status(404).json({ detail: 'Agreement not found' });
    }

    const { signature_type, signature_data } = req.body;

    // Validate signature type
    if (signature_type === 'customer' && !['customer', 'staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Cannot sign as customer' });
    }
    if (signature_type === 'staff' && !['staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Staff access required' });
    }

    // Save signature file
    const sigFilename = `${req.params.id}_${signature_type}_${uuidv4().slice(0, 8)}.png`;
    const sigPath = path.join(__dirname, '../uploads/signatures', sigFilename);

    // Decode and save base64 signature
    const sigData = signature_data.includes(',') ? signature_data.split(',')[1] : signature_data;
    const sigBuffer = Buffer.from(sigData, 'base64');
    fs.writeFileSync(sigPath, sigBuffer);

    // Update agreement
    const updateData = { [`${signature_type}_signature`]: sigFilename };

    // Check if both signatures present
    if (signature_type === 'customer' && agreement.staff_signature) {
      updateData.status = 'active';
      updateData.signed_at = new Date().toISOString();
    } else if (signature_type === 'staff' && agreement.customer_signature) {
      updateData.status = 'active';
      updateData.signed_at = new Date().toISOString();
    }

    await Agreement.updateOne({ id: req.params.id }, { $set: updateData });

    res.json({ success: true, signature_filename: sigFilename });
  } catch (error) {
    console.error('Sign agreement error:', error);
    res.status(500).json({ detail: 'Failed to sign agreement' });
  }
});

module.exports = router;
