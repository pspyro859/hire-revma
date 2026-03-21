const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');

const router = express.Router();

// POST /api/seed
router.post('/seed', async (req, res) => {
  try {
    const [[{ count }]] = await getPool().query('SELECT COUNT(*) as count FROM machines');
    if (parseInt(count) > 0) {
      return res.json({ message: 'Data already seeded' });
    }
    return await reseed(res);
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ detail: 'Failed to seed data' });
  }
});

// POST /api/reseed
router.post('/reseed', async (req, res) => {
  try {
    return await reseed(res);
  } catch (error) {
    console.error('Reseed error:', error);
    res.status(500).json({ detail: 'Failed to reseed data' });
  }
});

async function reseed(res) {
  const pool = getPool();

  // Clear existing data (order matters for FK constraints)
  await pool.query('DELETE FROM prestart_submission_items');
  await pool.query('DELETE FROM prestart_submissions');
  await pool.query('DELETE FROM maintenance_logs');
  await pool.query('DELETE FROM machine_documents');
  await pool.query('DELETE FROM prestart_checklist_templates');
  await pool.query('DELETE FROM quotes');
  await pool.query('DELETE FROM inquiries');
  await pool.query('DELETE FROM agreements');
  await pool.query('DELETE FROM machines');
  await pool.query('DELETE FROM terms');

  // Create admin user if not exists
  const [[adminExists]] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@revma.com.au']);
  if (!adminExists) {
    await pool.query('INSERT INTO users SET ?', [{
      id: uuidv4(),
      email: 'admin@revma.com.au',
      password_hash: await bcrypt.hash('admin123', 10),
      full_name: 'Admin User',
      phone: '0448 473 862',
      role: 'admin',
      company_name: 'Revma Pty Ltd',
      abn: '37 121 035 710',
      address: 'Unit 9/12 Channel Road, Mayfield West NSW 2304'
    }]);
  }

  // Create staff user if not exists
  const [[staffExists]] = await pool.query('SELECT id FROM users WHERE email = ?', ['staff@revma.com.au']);
  if (!staffExists) {
    await pool.query('INSERT INTO users SET ?', [{
      id: uuidv4(),
      email: 'staff@revma.com.au',
      password_hash: await bcrypt.hash('staff123', 10),
      full_name: 'Staff Member',
      phone: '0400 000 000',
      role: 'staff',
      company_name: 'Revma Pty Ltd'
    }]);
  }

  // Seed machines
  const machines = [
    {
      id: uuidv4(),
      name: 'Isuzu NLR Tipper',
      make: 'Isuzu',
      model: 'NLR 45-150',
      category: 'tipper',
      description: 'Reliable light-duty Isuzu NLR tipper truck ideal for hauling soil, gravel, sand, rubble and construction materials. Perfect for earthworks, demolition and landscaping projects.',
      image_url: 'https://www.revma.com.au/assets/images/isuzu-nlr-tipper.webp',
      daily_rate: 190.0,
      weekly_rate: 1140.0,
      monthly_rate: 3990.0,
      security_bond: 400.0,
      specifications: JSON.stringify({ gvm: '4,500 kg', licence: "Driver's Licence", engine: 'Isuzu 4JJ1-TCS', power: '110 kW (148 HP)', tipper_volume: '2.0 m³' }),
      is_available: 1,
      serial_number: 'ISU-NLR-001',
      year: 2022,
      hours_reading: 0,
      qr_code_id: 'RVM-001'
    },
    {
      id: uuidv4(),
      name: 'Kubota K008-3 Mini Excavator',
      make: 'Kubota',
      model: 'K008-3',
      category: 'excavator',
      description: 'Ultra-compact Kubota K008-3 mini excavator — perfect for tight access areas, landscaping, trenching and small earthworks where a larger machine can\'t fit.',
      image_url: 'https://www.revma.com.au/assets/images/kubota-k008-3.jpg',
      daily_rate: 220.0,
      weekly_rate: 1320.0,
      monthly_rate: 4620.0,
      security_bond: 500.0,
      specifications: JSON.stringify({ operating_weight: '1,000 kg', engine: 'Kubota D722-E4', power: '7.7 kW', dig_depth: '1.6 m', track_type: 'Rubber' }),
      is_available: 1,
      serial_number: 'KUB-K008-001',
      year: 2021,
      hours_reading: 450.5,
      qr_code_id: 'RVM-002'
    },
    {
      id: uuidv4(),
      name: 'Kubota 2.5T Excavator',
      make: 'Kubota',
      model: 'U25',
      category: 'excavator',
      description: 'Versatile Kubota 2.5 tonne excavator suited to residential and commercial earthworks, trenching, drainage, landscaping and civil construction projects.',
      image_url: 'https://www.revma.com.au/assets/images/kubota-2.5t.jpg',
      daily_rate: 260.0,
      weekly_rate: 1560.0,
      monthly_rate: 5460.0,
      security_bond: 600.0,
      specifications: JSON.stringify({ operating_weight: '2,551 kg', engine: 'Kubota D1105', power: '15.4 kW (20.7 hp)', fuel_capacity: '28 L' }),
      is_available: 1,
      serial_number: 'KUB-U25-001',
      year: 2020,
      hours_reading: 1200.0,
      qr_code_id: 'RVM-003'
    },
    {
      id: uuidv4(),
      name: '7x5 Box Trailer',
      make: 'Custom',
      model: '7x5 Single Axle',
      category: 'trailer',
      description: 'Sturdy 7x5 single axle box trailer suitable for moving equipment, materials and general loads. Easy to tow and ideal for both residential and commercial use.',
      image_url: 'https://www.revma.com.au/assets/images/box-trailer-7x5.jpg',
      daily_rate: 60.0,
      weekly_rate: 360.0,
      monthly_rate: 1260.0,
      security_bond: 200.0,
      specifications: JSON.stringify({ size: '7 x 5 ft', atm: '1,350 kg', tow_coupling: '50mm override', brakes: 'Mechanical disc' }),
      is_available: 1,
      serial_number: 'TRL-7X5-001',
      year: 2023,
      qr_code_id: 'RVM-004'
    },
    {
      id: uuidv4(),
      name: 'Ditch Witch FX20 Vac Trailer',
      make: 'Ditch Witch',
      model: 'FX20',
      category: 'vac',
      description: 'The Ditch Witch FX20 vacuum excavation trailer is ideal for safe non-destructive digging around underground services, potholing, slot trenching and debris removal.',
      image_url: 'https://www.revma.com.au/assets/images/ditch-witch-fx20.jpg',
      daily_rate: 350.0,
      weekly_rate: 2100.0,
      monthly_rate: 7350.0,
      security_bond: 800.0,
      specifications: JSON.stringify({ spoils_tank: '568 L (150 gal)', water_tank: '303 L (80 gal)', engine: 'Kohler CH740S', power: '20.1 kW (25 hp)', air_flow: '15.3 m³/min' }),
      is_available: 1,
      serial_number: 'DW-FX20-001',
      year: 2022,
      hours_reading: 320.0,
      qr_code_id: 'RVM-005'
    },
    {
      id: uuidv4(),
      name: 'Vermeer VX30-250 Vac Trailer',
      make: 'Vermeer',
      model: 'VX30-250',
      category: 'vac',
      description: 'The Vermeer VX30-250 vacuum excavation trailer delivers powerful suction for non-destructive digging, utility locating, potholing and hydro excavation on civil and construction sites.',
      image_url: 'https://www.revma.com.au/assets/images/vermeer-vx30-250.jpg',
      daily_rate: 500.0,
      weekly_rate: 3000.0,
      monthly_rate: 10500.0,
      security_bond: 1000.0,
      specifications: JSON.stringify({ spoils_tank: '946 L (250 gal)', water_tank: '378 L total', engine: 'Yanmar diesel', power: '23.1 kW (31 hp)', air_flow: '16.3 m³/min' }),
      is_available: 1,
      serial_number: 'VER-VX30-001',
      year: 2023,
      hours_reading: 180.0,
      qr_code_id: 'RVM-006'
    }
  ];

  for (const machine of machines) {
    await pool.query('INSERT INTO machines SET ?', [machine]);
  }

  // Seed terms and conditions
  const terms = [
    { id: uuidv4(), section_name: 'Hire Agreement', content: "The term of this Hire Form and the Hire Terms (together, this 'Agreement') will commence on the Start Date and continue until the Equipment has been returned in accordance with this Agreement and the referable Fees have been paid.", display_order: 1, is_active: 1 },
    { id: uuidv4(), section_name: 'Equipment Use', content: "Equipment must be used only on the specified Job Site, for the stated Purpose, properly and skillfully by trained/licensed personnel, in accordance with manufacturer's requirements, and in accordance with all applicable Laws, rules, and regulations.", display_order: 2, is_active: 1 },
    { id: uuidv4(), section_name: 'Maintenance', content: 'Keep equipment locked and keys under control when unattended. For hires over 2 days, customer is responsible for daily maintenance including checking fluids, tightening, lubrication, and track tension.', display_order: 3, is_active: 1 },
    { id: uuidv4(), section_name: 'Insurance', content: 'All Revma hire equipment is covered by comprehensive insurance for the full duration of your hire period, giving you complete peace of mind on site.', display_order: 4, is_active: 1 },
    { id: uuidv4(), section_name: 'GPS Tracking', content: 'Revma Pty Ltd monitors equipment location, usage, speed, etc., via GPS. Customer consents to GPS Tracking by accepting the agreement. Customer must not remove or alter GPS tracking functionality.', display_order: 5, is_active: 1 }
  ];

  for (const term of terms) {
    await pool.query('INSERT INTO terms SET ?', [term]);
  }

  // Seed universal prestart checklist templates
  const checklistItems = [
    // Safety
    { id: uuidv4(), machine_id: null, category: 'Safety', item_order: 1, item_text: 'Emergency stop functional', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Safety', item_order: 2, item_text: 'Seatbelt condition', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Safety', item_order: 3, item_text: 'ROPS/FOPS intact', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Safety', item_order: 4, item_text: 'Fire extinguisher present', is_active: 1 },
    // Fluids
    { id: uuidv4(), machine_id: null, category: 'Fluids', item_order: 1, item_text: 'Engine oil level', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Fluids', item_order: 2, item_text: 'Hydraulic oil level', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Fluids', item_order: 3, item_text: 'Coolant level', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Fluids', item_order: 4, item_text: 'Fuel level', is_active: 1 },
    // Visual Inspection
    { id: uuidv4(), machine_id: null, category: 'Visual Inspection', item_order: 1, item_text: 'Tyres/tracks condition', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Visual Inspection', item_order: 2, item_text: 'Lights and indicators', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Visual Inspection', item_order: 3, item_text: 'Mirrors and cameras', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Visual Inspection', item_order: 4, item_text: 'Body/chassis damage', is_active: 1 },
    // Operational Check
    { id: uuidv4(), machine_id: null, category: 'Operational Check', item_order: 1, item_text: 'Horn functional', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Operational Check', item_order: 2, item_text: 'Brakes operational', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Operational Check', item_order: 3, item_text: 'Steering response', is_active: 1 },
    { id: uuidv4(), machine_id: null, category: 'Operational Check', item_order: 4, item_text: 'All controls responsive', is_active: 1 }
  ];

  for (const item of checklistItems) {
    await pool.query('INSERT INTO prestart_checklist_templates SET ?', [item]);
  }

  res.json({
    message: 'Data seeded successfully',
    machines: machines.length,
    terms: terms.length,
    checklist_items: checklistItems.length
  });
}

module.exports = router;
