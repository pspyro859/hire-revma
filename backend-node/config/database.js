// Database Configuration - Supports both MongoDB and MySQL
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

let db = null;
let dbType = process.env.DB_TYPE || 'mongodb';

// MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME || 'revma_hire'
    });
    console.log('Connected to MongoDB');
    db = mongoose.connection;
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// MySQL connection pool
let mysqlPool = null;
const connectMySQL = async () => {
  try {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test connection
    const connection = await mysqlPool.getConnection();
    console.log('Connected to MySQL');
    connection.release();
    
    // Initialize tables
    await initMySQLTables();
    
    return mysqlPool;
  } catch (error) {
    console.error('MySQL connection error:', error);
    throw error;
  }
};

// Initialize MySQL tables
const initMySQLTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role ENUM('customer', 'staff', 'admin') DEFAULT 'customer',
      company_name VARCHAR(255),
      abn VARCHAR(50),
      drivers_licence VARCHAR(100),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS machines (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      make VARCHAR(100),
      model VARCHAR(100),
      category VARCHAR(50),
      description TEXT,
      image_url TEXT,
      daily_rate DECIMAL(10,2),
      weekly_rate DECIMAL(10,2),
      monthly_rate DECIMAL(10,2),
      security_bond DECIMAL(10,2),
      specifications JSON,
      is_available BOOLEAN DEFAULT TRUE
    )`,
    `CREATE TABLE IF NOT EXISTS agreements (
      id VARCHAR(36) PRIMARY KEY,
      agreement_number VARCHAR(50) UNIQUE,
      customer_id VARCHAR(36),
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      customer_licence VARCHAR(100),
      customer_abn VARCHAR(50),
      customer_company VARCHAR(255),
      customer_address TEXT,
      machine_id VARCHAR(36),
      machine_name VARCHAR(255),
      machine_make VARCHAR(100),
      machine_model VARCHAR(100),
      hire_start_date DATE,
      hire_end_date DATE,
      hire_rate_type VARCHAR(20),
      hire_rate DECIMAL(10,2),
      security_bond DECIMAL(10,2),
      delivery_method VARCHAR(50),
      delivery_address TEXT,
      job_site TEXT,
      purpose TEXT,
      special_conditions TEXT,
      checklist JSON,
      photos JSON,
      customer_signature VARCHAR(255),
      staff_signature VARCHAR(255),
      status VARCHAR(50) DEFAULT 'draft',
      pdf_path VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      signed_at TIMESTAMP NULL,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (machine_id) REFERENCES machines(id)
    )`,
    `CREATE TABLE IF NOT EXISTS inquiries (
      id VARCHAR(36) PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      is_business BOOLEAN DEFAULT FALSE,
      company_name VARCHAR(255),
      abn VARCHAR(50),
      equipment JSON,
      hire_start_date DATE,
      hire_end_date DATE,
      hire_rate_preference VARCHAR(20),
      delivery_method VARCHAR(50),
      delivery_address TEXT,
      job_description TEXT,
      additional_notes TEXT,
      status VARCHAR(50) DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS quotes (
      id VARCHAR(36) PRIMARY KEY,
      quote_number VARCHAR(50) UNIQUE,
      inquiry_id VARCHAR(36),
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      line_items JSON,
      hire_start_date DATE,
      hire_end_date DATE,
      delivery_method VARCHAR(50),
      delivery_address TEXT,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      subtotal DECIMAL(10,2),
      security_bond DECIMAL(10,2),
      total DECIMAL(10,2),
      notes TEXT,
      valid_until DATE,
      status VARCHAR(50) DEFAULT 'draft',
      access_token VARCHAR(100),
      id_documents JSON,
      id_verified BOOLEAN DEFAULT FALSE,
      customer_signature VARCHAR(255),
      signed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(36),
      FOREIGN KEY (inquiry_id) REFERENCES inquiries(id)
    )`,
    `CREATE TABLE IF NOT EXISTS terms (
      id VARCHAR(36) PRIMARY KEY,
      section_name VARCHAR(255),
      content TEXT,
      display_order INT,
      is_active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    await mysqlPool.query(sql);
  }
  console.log('MySQL tables initialized');
};

// Main connection function
const connectDB = async () => {
  if (dbType === 'mysql') {
    return connectMySQL();
  }
  return connectMongoDB();
};

// Get database instance
const getDB = () => {
  if (dbType === 'mysql') {
    return mysqlPool;
  }
  return mongoose.connection;
};

const getDBType = () => dbType;

module.exports = {
  connectDB,
  getDB,
  getDBType,
  mongoose
};
