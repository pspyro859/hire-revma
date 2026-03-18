# Revma Equipment Hire - SPanel Deployment Guide

## Prerequisites

- SPanel with Node.js Manager enabled
- MySQL database
- Python 3.9+ installed on server
- Access to your domain's DNS settings

## Step 1: Create MySQL Database

1. Log into SPanel
2. Go to **MySQL Databases**
3. Create a new database: `revma_hire`
4. Create a MySQL user and grant all privileges to the database
5. Note down: database name, username, and password

## Step 2: Upload Files

Upload these files to your server (e.g., `/home/yourdomain/revma-hire/`):

```
/revma-hire/
├── server_mysql.py
├── package.json
├── requirements.txt
├── .env
└── uploads/
    ├── photos/
    ├── signatures/
    └── pdfs/
```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Edit `.env` with your actual credentials:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=revma_hire
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT (generate a random string)
JWT_SECRET=your-very-long-random-secret-string

# SMTP (your email settings)
SMTP_HOST=mail.revma.com.au
SMTP_PORT=465
SMTP_USERNAME=office@revma.com.au
SMTP_PASSWORD=your_email_password
SMTP_FROM_EMAIL=office@revma.com.au
NOTIFICATION_EMAIL=peter@revma.com.au

# CORS (your frontend domain)
CORS_ORIGINS=https://hire.revma.com.au

# Server
PORT=8001
HOST=0.0.0.0
```

## Step 4: Install Python Dependencies

SSH into your server and run:

```bash
cd /home/yourdomain/revma-hire
pip install -r requirements.txt
```

## Step 5: Set Up Node.js Manager

1. In SPanel, go to **Node.js Manager**
2. Click **Create Application**
3. Configure:
   - **Application Root**: `/home/yourdomain/revma-hire`
   - **Application URL**: `hire.revma.com.au` (or your subdomain)
   - **Application Startup File**: `server_mysql.py`
   - **Node.js Version**: Latest available
   - **Application Mode**: Production

4. Click **Create**
5. The app will start automatically

## Step 6: Initial Data Setup

After the app is running, seed the initial data:

```bash
curl -X POST https://hire.revma.com.au/api/seed
```

This creates:
- Admin user: `admin@revma.com.au` / `admin123`
- Your 6 equipment machines

## Step 7: Deploy Frontend

### Option A: Static Build (Recommended)

1. Build the React frontend locally:
   ```bash
   cd frontend
   REACT_APP_BACKEND_URL=https://hire.revma.com.au yarn build
   ```

2. Upload the `build/` folder contents to your web root

### Option B: Separate Frontend Deployment

Deploy the React app to Vercel, Netlify, or another static host with:
- `REACT_APP_BACKEND_URL=https://hire.revma.com.au`

## Troubleshooting

### App won't start
- Check logs in SPanel Node.js Manager
- Verify `.env` file exists and has correct values
- Ensure MySQL database is accessible

### Email not sending
- Verify SMTP credentials in `.env`
- Check if port 465 is not blocked
- Try connecting via telnet: `telnet mail.revma.com.au 465`

### Database connection failed
- Verify MySQL credentials
- Ensure database exists
- Check if MySQL user has proper privileges

### CORS errors
- Add your frontend domain to `CORS_ORIGINS` in `.env`
- Restart the application

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Enable HTTPS on your domain
- [ ] Restrict database user to only required privileges
- [ ] Set up regular database backups
- [ ] Keep Python packages updated

## Support

For technical issues, contact your hosting provider or development team.
