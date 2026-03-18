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
- MySQL compatible for SPanel deployment

## User Personas
1. **Staff/Admin**: Create agreements, manage inquiries, update terms
2. **Customer**: Submit inquiries, view agreements, sign digitally

## Core Requirements (Static)
- JWT-based authentication for staff and customers
- Equipment fleet with pricing from Revma website
- Digital hire agreement workflow
- Pre-start safety checklist (8 items)
- 4-photo equipment condition capture
- Canvas-based digital signature
- PDF agreement generation with jsPDF
- Editable Terms & Conditions

## What's Been Implemented (March 2025)

### Backend (FastAPI + MongoDB)
- [x] User authentication (register, login, JWT tokens)
- [x] Role-based access control (customer, staff, admin)
- [x] Machines CRUD with full specifications
- [x] Agreements management with status workflow
- [x] Pre-start checklist updates
- [x] Photo uploads (4 positions)
- [x] Digital signature storage
- [x] Customer inquiries management
- [x] Terms & Conditions CRUD
- [x] Data seeding with 6 Revma machines

### Frontend (React + Tailwind + Shadcn)
- [x] Landing page with fleet showcase
- [x] Login/Register pages
- [x] Dashboard with stats
- [x] Equipment browse page with filters
- [x] Multi-step agreement creation (4 steps)
- [x] Agreement detail with tabs
- [x] Pre-start checklist UI
- [x] Photo upload interface
- [x] Signature canvas component
- [x] PDF download functionality
- [x] Customer inquiry form
- [x] Inquiries management (staff)
- [x] Settings page (admin)
- [x] Mobile-responsive design

### Equipment Fleet
1. Isuzu NLR Tipper - $190/day
2. Kubota K008-3 Mini Excavator - $220/day
3. Kubota 2.5T Excavator - $260/day
4. 7x5 Box Trailer - $60/day
5. Ditch Witch FX20 Vac Trailer - $350/day
6. Vermeer VX30-250 Vac Trailer - $500/day

## Prioritized Backlog

### P0 - Critical (MVP Complete)
- [x] Core authentication
- [x] Equipment management
- [x] Agreement creation workflow
- [x] Pre-start checklist
- [x] Photo upload
- [x] Digital signature
- [x] PDF generation

### P1 - Important
- [ ] Email notifications for new inquiries
- [ ] Agreement status change notifications
- [ ] Actual MySQL adapter for SPanel deployment
- [ ] Enhanced PDF with embedded signatures/photos

### P2 - Nice to Have
- [ ] Equipment availability calendar
- [ ] Recurring hire agreements
- [ ] Damage assessment tool with annotations
- [ ] Invoice generation
- [ ] Payment integration (Stripe)

## Next Action Items
1. Add email notifications for inquiries (SendGrid/Resend)
2. Create MySQL adapter for production deployment
3. Add equipment availability calendar view
4. Enhance PDF to include embedded photos/signatures
5. Consider adding payment integration

## Technical Notes
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB (can be adapted to MySQL)
- Auth: JWT with 24hr expiry
- PDF: Client-side jsPDF generation
- Signatures: react-signature-canvas
