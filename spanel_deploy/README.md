# Revma Heavy Equipment Hire - Backend API

A Node.js/Express backend API for the Revma Equipment Hire & Agreement system.

## Features

- **User Authentication** - JWT-based auth with Admin, Staff, and Customer roles
- **Equipment Management** - Full CRUD for hire equipment with categories and pricing
- **Inquiry System** - Customer inquiries with email notifications
- **Quote System** - Staff creates quotes, customers view and accept via email link
- **100 Point ID Verification** - Australian ID verification before hire agreement
- **Digital Agreements** - Pre-start checklists, photo uploads, digital signatures
- **Email Notifications** - Automated emails for inquiries and quotes

## Quick Start (Development)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy and configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Seed initial data:
   ```bash
   curl -X POST http://localhost:8001/api/seed
   ```

## Default Login Credentials

After seeding:
- **Admin**: admin@revma.com.au / admin123
- **Staff**: staff@revma.com.au / staff123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Machines
- `GET /api/machines` - List all machines
- `GET /api/machines/:id` - Get machine details
- `POST /api/machines` - Create machine (staff)
- `PUT /api/machines/:id` - Update machine (staff)

### Inquiries
- `POST /api/inquiries` - Submit inquiry (public)
- `GET /api/inquiries` - List inquiries (staff)
- `PUT /api/inquiries/:id/status` - Update status (staff)

### Quotes
- `POST /api/quotes` - Create quote (staff)
- `GET /api/quotes` - List quotes (staff)
- `POST /api/quotes/:id/send` - Send quote to customer (staff)
- `GET /api/customer/quote/:id?token=xxx` - Customer views quote
- `POST /api/customer/quote/:id/upload-id` - Upload ID document
- `POST /api/customer/quote/:id/sign` - Sign agreement

### Agreements
- `POST /api/agreements` - Create agreement
- `GET /api/agreements` - List agreements
- `PUT /api/agreements/:id/checklist` - Update checklist
- `POST /api/agreements/:id/photos` - Upload photo
- `POST /api/agreements/:id/sign` - Sign agreement

### Terms & Conditions
- `GET /api/terms` - Get active terms (public)
- `POST /api/terms` - Create terms (admin)
- `PUT /api/terms/:id` - Update terms (admin)

## Environment Variables

See `.env.example` for all configuration options.

### Required
- `DB_TYPE` - "mongodb" or "mysql"
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL for email links

### Database (MongoDB)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name

### Database (MySQL)
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

### Email (SMTP)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL` - Sender email address
- `NOTIFICATION_EMAIL` - Admin notification email

## License

Private - Revma Pty Ltd
