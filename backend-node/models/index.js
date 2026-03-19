const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
  company_name: String,
  abn: String,
  drivers_licence: String,
  address: String,
  created_at: { type: String, default: () => new Date().toISOString() }
});

// Machine Schema
const machineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  make: String,
  model: String,
  category: String,
  description: String,
  image_url: String,
  daily_rate: Number,
  weekly_rate: Number,
  monthly_rate: Number,
  security_bond: Number,
  specifications: { type: Object, default: {} },
  is_available: { type: Boolean, default: true }
});

// Agreement Schema
const agreementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  agreement_number: { type: String, unique: true },
  customer_id: String,
  customer_name: String,
  customer_email: String,
  customer_phone: String,
  customer_licence: String,
  customer_abn: String,
  customer_company: String,
  customer_address: String,
  machine_id: String,
  machine_name: String,
  machine_make: String,
  machine_model: String,
  hire_start_date: String,
  hire_end_date: String,
  hire_rate_type: String,
  hire_rate: Number,
  security_bond: Number,
  delivery_method: String,
  delivery_address: String,
  job_site: String,
  purpose: String,
  special_conditions: String,
  checklist: { type: Array, default: [] },
  photos: { type: Array, default: [] },
  customer_signature: String,
  staff_signature: String,
  status: { type: String, default: 'draft' },
  pdf_path: String,
  created_at: { type: String, default: () => new Date().toISOString() },
  signed_at: String
});

// Inquiry Schema
const inquirySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  is_business: { type: Boolean, default: false },
  company_name: String,
  abn: String,
  equipment: { type: Array, default: [] },
  hire_start_date: String,
  hire_end_date: String,
  hire_rate_preference: String,
  delivery_method: String,
  delivery_address: String,
  job_description: String,
  additional_notes: String,
  status: { type: String, default: 'new' },
  created_at: { type: String, default: () => new Date().toISOString() }
});

// Quote Schema
const quoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  quote_number: { type: String, unique: true },
  inquiry_id: String,
  customer_email: String,
  customer_name: String,
  customer_phone: String,
  line_items: { type: Array, default: [] },
  hire_start_date: String,
  hire_end_date: String,
  delivery_method: String,
  delivery_address: String,
  delivery_fee: { type: Number, default: 0 },
  subtotal: Number,
  security_bond: Number,
  total: Number,
  notes: String,
  valid_until: String,
  status: { type: String, default: 'draft' },
  access_token: String,
  id_documents: { type: Array, default: [] },
  id_verified: { type: Boolean, default: false },
  customer_signature: String,
  signed_at: String,
  created_at: { type: String, default: () => new Date().toISOString() },
  created_by: String
});

// Terms Schema
const termsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  section_name: String,
  content: String,
  order: Number,
  is_active: { type: Boolean, default: true },
  updated_at: { type: String, default: () => new Date().toISOString() }
});

// Create models
const User = mongoose.model('User', userSchema);
const Machine = mongoose.model('Machine', machineSchema);
const Agreement = mongoose.model('Agreement', agreementSchema);
const Inquiry = mongoose.model('Inquiry', inquirySchema);
const Quote = mongoose.model('Quote', quoteSchema);
const Terms = mongoose.model('Terms', termsSchema);

module.exports = {
  User,
  Machine,
  Agreement,
  Inquiry,
  Quote,
  Terms
};
