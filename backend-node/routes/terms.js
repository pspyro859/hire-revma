const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Terms } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/terms (Public)
router.get('/', async (req, res) => {
  try {
    const terms = await Terms.find({ is_active: true }).select('-_id -__v').sort({ order: 1 });
    res.json(terms);
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ detail: 'Failed to get terms' });
  }
});

// POST /api/terms (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { section_name, content, order, is_active } = req.body;

    const terms = new Terms({
      id: uuidv4(),
      section_name,
      content,
      order,
      is_active: is_active !== false,
      updated_at: new Date().toISOString()
    });

    await terms.save();

    const result = terms.toObject();
    delete result._id;
    delete result.__v;
    res.json(result);
  } catch (error) {
    console.error('Create terms error:', error);
    res.status(500).json({ detail: 'Failed to create terms' });
  }
});

// PUT /api/terms/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { section_name, content, order, is_active } = req.body;

    const result = await Terms.updateOne(
      { id: req.params.id },
      { $set: { section_name, content, order, is_active, updated_at: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'Terms section not found' });
    }

    const terms = await Terms.findOne({ id: req.params.id }).select('-_id -__v');
    res.json(terms);
  } catch (error) {
    console.error('Update terms error:', error);
    res.status(500).json({ detail: 'Failed to update terms' });
  }
});

// DELETE /api/terms/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await Terms.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Terms section not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete terms error:', error);
    res.status(500).json({ detail: 'Failed to delete terms' });
  }
});

module.exports = router;
