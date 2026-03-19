const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User, Machine, Terms } = require('../models');

const router = express.Router();

// POST /api/seed
router.post('/seed', async (req, res) => {
  try {
    // Check if already seeded
    const existingMachines = await Machine.countDocuments();
    if (existingMachines > 0) {
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
  // Clear existing data
  await Machine.deleteMany({});
  await Terms.deleteMany({});

  // Create admin user if not exists
  const existingAdmin = await User.findOne({ email: 'admin@revma.com.au' });
  if (!existingAdmin) {
    const adminUser = new User({
      id: uuidv4(),
      email: 'admin@revma.com.au',
      password_hash: await bcrypt.hash('admin123', 10),
      full_name: 'Admin User',
      phone: '0448 473 862',
      role: 'admin',
      company_name: 'Revma Pty Ltd',
      abn: '37 121 035 710',
      address: 'Unit 9/12 Channel Road, Mayfield West NSW 2304',
      created_at: new Date().toISOString()
    });
    await adminUser.save();
  }

  // Create staff user if not exists
  const existingStaff = await User.findOne({ email: 'staff@revma.com.au' });
  if (!existingStaff) {
    const staffUser = new User({
      id: uuidv4(),
      email: 'staff@revma.com.au',
      password_hash: await bcrypt.hash('staff123', 10),
      full_name: 'Staff Member',
      phone: '0400 000 000',
      role: 'staff',
      company_name: 'Revma Pty Ltd',
      created_at: new Date().toISOString()
    });
    await staffUser.save();
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
      specifications: {
        gvm: '4,500 kg',
        licence: "Driver's Licence",
        engine: 'Isuzu 4JJ1-TCS',
        power: '110 kW (148 HP)',
        tipper_volume: '2.0 m³'
      },
      is_available: true
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
      specifications: {
        operating_weight: '1,000 kg',
        engine: 'Kubota D722-E4',
        power: '7.7 kW',
        dig_depth: '1.6 m',
        track_type: 'Rubber'
      },
      is_available: true
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
      specifications: {
        operating_weight: '2,551 kg',
        engine: 'Kubota D1105',
        power: '15.4 kW (20.7 hp)',
        fuel_capacity: '28 L'
      },
      is_available: true
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
      specifications: {
        size: '7 x 5 ft',
        atm: '1,350 kg',
        tow_coupling: '50mm override',
        brakes: 'Mechanical disc'
      },
      is_available: true
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
      specifications: {
        spoils_tank: '568 L (150 gal)',
        water_tank: '303 L (80 gal)',
        engine: 'Kohler CH740S',
        power: '20.1 kW (25 hp)',
        air_flow: '15.3 m³/min'
      },
      is_available: true
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
      specifications: {
        spoils_tank: '946 L (250 gal)',
        water_tank: '378 L total',
        engine: 'Yanmar diesel',
        power: '23.1 kW (31 hp)',
        air_flow: '16.3 m³/min'
      },
      is_available: true
    }
  ];

  await Machine.insertMany(machines);

  // Seed terms and conditions
  const terms = [
    {
      id: uuidv4(),
      section_name: 'Hire Agreement',
      content: "The term of this Hire Form and the Hire Terms (together, this 'Agreement') will commence on the Start Date and continue until the Equipment has been returned in accordance with this Agreement and the referable Fees have been paid.",
      order: 1,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      section_name: 'Equipment Use',
      content: "Equipment must be used only on the specified Job Site, for the stated Purpose, properly and skillfully by trained/licensed personnel, in accordance with manufacturer's requirements, and in accordance with all applicable Laws, rules, and regulations.",
      order: 2,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      section_name: 'Maintenance',
      content: 'Keep equipment locked and keys under control when unattended. For hires over 2 days, customer is responsible for daily maintenance including checking fluids, tightening, lubrication, and track tension.',
      order: 3,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      section_name: 'Insurance',
      content: 'All Revma hire equipment is covered by comprehensive insurance for the full duration of your hire period, giving you complete peace of mind on site.',
      order: 4,
      is_active: true,
      updated_at: new Date().toISOString()
    },
    {
      id: uuidv4(),
      section_name: 'GPS Tracking',
      content: 'Revma Pty Ltd monitors equipment location, usage, speed, etc., via GPS. Customer consents to GPS Tracking by accepting the agreement. Customer must not remove or alter GPS tracking functionality.',
      order: 5,
      is_active: true,
      updated_at: new Date().toISOString()
    }
  ];

  await Terms.insertMany(terms);

  res.json({ message: 'Data seeded successfully', machines: machines.length, terms: terms.length });
}

module.exports = router;
