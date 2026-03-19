const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Machine } = require('../models');
const { authenticate, requireStaff } = require('../middleware/auth');

const router = express.Router();

// GET /api/machines
router.get('/', async (req, res) => {
  try {
    const { category, available_only } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (available_only === 'true') query.is_available = true;

    const machines = await Machine.find(query).select('-_id -__v');
    res.json(machines);
  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({ detail: 'Failed to get machines' });
  }
});

// GET /api/machines/:id
router.get('/:id', async (req, res) => {
  try {
    const machine = await Machine.findOne({ id: req.params.id }).select('-_id -__v');
    if (!machine) {
      return res.status(404).json({ detail: 'Machine not found' });
    }
    res.json(machine);
  } catch (error) {
    console.error('Get machine error:', error);
    res.status(500).json({ detail: 'Failed to get machine' });
  }
});

// POST /api/machines (Staff only)
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { name, make, model, category, description, image_url, daily_rate, weekly_rate, monthly_rate, security_bond, specifications, is_available } = req.body;

    const machine = new Machine({
      id: uuidv4(),
      name,
      make,
      model,
      category,
      description,
      image_url,
      daily_rate,
      weekly_rate,
      monthly_rate,
      security_bond,
      specifications: specifications || {},
      is_available: is_available !== false
    });

    await machine.save();
    
    const result = machine.toObject();
    delete result._id;
    delete result.__v;
    res.json(result);
  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ detail: 'Failed to create machine' });
  }
});

// PUT /api/machines/:id (Staff only)
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { name, make, model, category, description, image_url, daily_rate, weekly_rate, monthly_rate, security_bond, specifications, is_available } = req.body;

    const result = await Machine.updateOne(
      { id: req.params.id },
      { $set: { name, make, model, category, description, image_url, daily_rate, weekly_rate, monthly_rate, security_bond, specifications, is_available } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }

    const machine = await Machine.findOne({ id: req.params.id }).select('-_id -__v');
    res.json(machine);
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ detail: 'Failed to update machine' });
  }
});

module.exports = router;
