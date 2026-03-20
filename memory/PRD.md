# Dry Hire Equipment Management System - PRD

## Original Problem Statement
Add features to dry hire contract system:
1. Pre-start checklists - operators complete before using equipment
2. Maintenance tracking with service history
3. QR codes on machines - scanning shows machine details + checklist

## User Personas
- **Fleet Managers**: Oversee all equipment, track maintenance schedules, review checklist compliance
- **Operators**: Complete pre-start checklists before using machines
- **Maintenance Technicians**: Log service records, track parts replaced, schedule future maintenance

## Core Requirements (Static)
1. Machine Management (CRUD operations)
2. Pre-start Checklist System with 16 items in 4 categories
3. QR Code Generation for each machine
4. QR Scan Page showing machine details + checklist access
5. Maintenance Logging and History
6. Dashboard with Fleet Overview

## What's Been Implemented (Jan 2026)

### Backend API (/app/backend/server.py)
- Machine CRUD endpoints
- Checklist template with 16 items (Pre-Start Safety, Fluids, Visual Inspection, Operational Check)
- Checklist submission API
- Maintenance record CRUD
- Dashboard statistics endpoint
- QR info endpoint for machines

### Frontend (/app/frontend/src/App.js)
- Dashboard with stats grid (Total Machines, Available, In Maintenance, Service Due, Recent Checks, Failed Checks)
- Machines List with status filtering (All, Available, In Use, Maintenance, Out of Service)
- Machine Detail page with:
  - QR Code display
  - Printable QR label
  - Checklist history
  - Maintenance history
- QR Scan Page (mobile-friendly, shows machine info + Start Pre-Start Check button)
- Pre-start Checklist Form with Pass/Fail/N/A buttons for each item
- Maintenance Form with fields for type, description, technician, parts, cost
- Checklists List with pass/fail filtering
- Maintenance List

### Design
- Industrial "Safety" theme with yellow/black palette
- Barlow Condensed headings, JetBrains Mono for codes
- Mobile-first for operators

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] Machine CRUD
- [x] Pre-start Checklist (16 items, 4 categories)
- [x] QR Code on machines
- [x] QR Scan shows machine details + checklist
- [x] Maintenance logging

### P1 (High Priority)
- [ ] User authentication (operators login before submitting checklists)
- [ ] Photo upload for failed checklist items
- [ ] Email notifications for overdue maintenance
- [ ] PDF export for checklist reports

### P2 (Medium Priority)
- [ ] Equipment categories customization
- [ ] Custom checklist templates per equipment type
- [ ] Maintenance scheduling with calendar view
- [ ] Cost tracking reports

### P3 (Low Priority)
- [ ] GPS location tracking
- [ ] Integration with accounting systems
- [ ] Mobile app (React Native)

## Next Tasks
1. Add user authentication
2. Photo upload for failed items
3. Email notifications for maintenance due
