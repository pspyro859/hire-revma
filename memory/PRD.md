# Dry Hire Equipment Management System - PRD

## Original Problem Statement
Add features to dry hire contract system:
1. Pre-start checklists - operators complete before using equipment
2. Maintenance tracking with service history
3. QR codes on machines - scanning shows machine details + checklist
4. **NEW**: Kennards-style customer document portal with all machine documents

## User Personas
- **Fleet Managers**: Oversee all equipment, track maintenance schedules, review checklist compliance
- **Operators**: Complete pre-start checklists before using machines
- **Maintenance Technicians**: Log service records, track parts replaced, schedule future maintenance
- **Customers**: Access hire documents via QR code or Customer Portal

## Core Requirements (Static)
1. Machine Management (CRUD operations)
2. Pre-start Checklist System with 16 items in 4 categories
3. QR Code Generation for each machine
4. QR Scan Page showing machine details + checklist + documents
5. Maintenance Logging and History
6. Dashboard with Fleet Overview
7. Customer Document Access (Safety Guide, Manual, Risk Assessment, Service Maintenance, Safety Alerts)
8. Customer Portal with contract lookup
9. Hire Contract Management

## What's Been Implemented (Jan 2026)

### Backend API (/app/backend/server.py)
- Machine CRUD with 5 document URL fields
- Checklist template with 16 items
- Checklist submission API
- Maintenance record CRUD
- Dashboard statistics endpoint
- QR info endpoint with documents
- **NEW**: Hire contracts CRUD
- **NEW**: Customer portal lookup endpoint

### Frontend (/app/frontend/src/App.js)
- Dashboard with stats grid
- Machines List with status filtering
- Machine Detail with QR Code & documents
- Machine Form with document URL fields
- **NEW**: QR Scan Page with Documents section
- Pre-start Checklist Form
- Checklists List
- Maintenance logging
- **NEW**: Hire Contracts management
- **NEW**: Customer Portal (contract lookup)

### Design
- Industrial "Safety" theme with yellow/black palette
- Mobile-first for operators
- Kennards-style document portal

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] Machine CRUD
- [x] Pre-start Checklist (16 items, 4 categories)
- [x] QR Code on machines
- [x] QR Scan shows machine details + checklist
- [x] Maintenance logging
- [x] Document URLs on machines (5 types)
- [x] QR scan page shows documents
- [x] Customer Portal with contract lookup
- [x] Hire contract management

### P1 (High Priority)
- [ ] User authentication
- [ ] Photo upload for failed checklist items
- [ ] Email notifications for overdue maintenance
- [ ] PDF export for checklist reports

### P2 (Medium Priority)
- [ ] Equipment categories customization
- [ ] Custom checklist templates per equipment type
- [ ] Maintenance scheduling with calendar view
- [ ] File upload for documents (instead of URLs)

## Next Tasks
1. Add user authentication
2. PDF document upload feature
3. Email notifications
