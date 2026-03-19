# Revma Heavy Equipment Hire & Agreement App - PRD

## Original Problem Statement
Build a Heavy Equipment Hire & Agreement App for Revma Pty Ltd (electrical and pump contracting business) with:
- Digital Hire Agreement (Customer Name, License #, Mobile) generating signable PDF
- Machine Selection from fleet (6 machines from revma.com.au)
- Digital Signature canvas for tablet/phone signing
- Pre-Start Checklist (Oil, Fuel, Tracks/Tyres, Damage) - must complete before signing
- Photo Upload (4 views: Front, Back, Left, Right)
- Customer and Staff authentication
- Mobile-first design for on-site use
- **Node.js backend** for SPanel deployment (user requirement)
- MySQL compatible for SPanel deployment

## User Personas
1. **Staff/Admin**: Create quotes from inquiries, manage inquiries, update terms
2. **Customer**: Submit inquiries, receive quotes via email, upload ID, sign agreements

## Core Requirements (Static)
- JWT-based authentication for staff and customers
- Equipment fleet with pricing from Revma website
- Customer inquiry submission → Staff creates quote → Customer accepts & signs
- 100-point ID verification (Australian standard)
- Digital hire agreement workflow
- Pre-start safety checklist (8 items)
- 4-photo equipment condition capture
- Canvas-based digital signature
- Editable Terms & Conditions

## What's Been Implemented (March 2025)

### ✅ Backend (Python FastAPI - Preview Environment)
- [x] User authentication (register, login, JWT tokens)
- [x] Role-based access control (customer, staff, admin)
- [x] Machines CRUD with full specifications
- [x] Agreements management with status workflow
- [x] Pre-start checklist updates
- [x] Photo uploads (4 positions)
- [x] Digital signature storage
- [x] Customer inquiries management
- [x] Quote creation and management
- [x] Quote email sending to customers
- [x] Customer quote access (token-based, no login required)
- [x] ID document uploads with 100-point tracking
- [x] Customer quote signing
- [x] Terms & Conditions CRUD
- [x] Email notifications (SMTP) for inquiries
- [x] Data seeding with 6 Revma machines

### ✅ Backend (Node.js/Express - SPanel Deployment Package)
**Location: `/app/spanel_deploy/`**
- [x] Complete Node.js/Express backend rewrite
- [x] MongoDB and MySQL database support
- [x] All API endpoints matching Python version
- [x] JWT authentication
- [x] Nodemailer for email
- [x] File uploads (multer)
- [x] Ready for SPanel NodeJS Manager deployment
- [x] `.env.example` with all configuration options
- [x] Deployment instructions for SPanel

### ✅ Frontend (React + Tailwind + Shadcn)
- [x] Landing page with fleet showcase
- [x] Login/Register pages
- [x] Dashboard with stats
- [x] Equipment browse page with filters
- [x] Customer inquiry form
- [x] Inquiries management with "Create Quote" button
- [x] **Quotes management page** (staff)
- [x] **Create Quote page** with equipment selection, pricing calculator
- [x] **Customer Quote page** (public, token-based access)
- [x] **ID Document upload interface** with 100-point tracker
- [x] **Terms acceptance and digital signature**
- [x] Multi-step agreement creation (4 steps)
- [x] Agreement detail with tabs
- [x] Pre-start checklist UI
- [x] Photo upload interface
- [x] Signature canvas component
- [x] PDF download functionality
- [x] Settings page (admin)
- [x] Mobile-responsive design

### Equipment Fleet
1. Isuzu NLR Tipper - $190/day
2. Kubota K008-3 Mini Excavator - $220/day
3. Kubota 2.5T Excavator - $260/day
4. 7x5 Box Trailer - $60/day
5. Ditch Witch FX20 Vac Trailer - $350/day
6. Vermeer VX30-250 Vac Trailer - $500/day

## Quote → ID → Sign Workflow (COMPLETED)
1. **Customer submits inquiry** → Admin notified via email
2. **Staff creates quote** from inquiry (pre-populated data)
3. **Staff sends quote** → Customer receives email with secure link
4. **Customer views quote** → Reviews equipment, pricing, dates
5. **Customer uploads ID** → 100-point verification (Driver's License, Medicare, etc.)
6. **Customer signs agreement** → Digital signature after terms acceptance
7. **Agreement confirmed** → Staff notified, customer receives confirmation

## Deployment

### Preview Environment (Current)
- Backend: Python FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB
- URL: https://dry-hire-pro.preview.emergentagent.com

### Production (SPanel)
- Use `/app/spanel_deploy/` package
- Node.js backend via NodeJS Manager
- MySQL database
- See `DEPLOY_INSTRUCTIONS.md` for step-by-step guide

## Test Credentials
- **Admin**: admin@revma.com.au / admin123
- **Staff**: staff@revma.com.au / staff123

## Prioritized Backlog

### P0 - Critical (✅ COMPLETE)
- [x] Core authentication
- [x] Equipment management
- [x] Inquiry → Quote workflow
- [x] ID verification (100 points)
- [x] Digital signature for quotes
- [x] Agreement creation workflow
- [x] Pre-start checklist
- [x] Photo upload
- [x] Digital signature
- [x] Node.js backend for SPanel

### P1 - Important
- [ ] Customer confirmation emails after inquiry submission
- [ ] PDF generation for signed quotes
- [ ] Staff notification when customer signs
- [ ] MySQL deployment verification

### P2 - Nice to Have
- [ ] Equipment availability calendar
- [ ] Recurring hire agreements
- [ ] Damage assessment tool with annotations
- [ ] Invoice generation
- [ ] Payment integration (Stripe)

## Technical Notes
- Backend (Preview): FastAPI on port 8001
- Backend (Production): Node.js/Express
- Frontend: React on port 3000
- Database: MongoDB (dev) / MySQL (production)
- Auth: JWT with 24hr expiry
- PDF: Client-side jsPDF generation
- Signatures: react-signature-canvas
- Email: aiosmtplib (Python) / Nodemailer (Node.js)
