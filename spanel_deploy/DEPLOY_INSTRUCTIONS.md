# SPanel Deployment Guide - Revma Equipment Hire

This guide walks you through deploying the Revma Equipment Hire app on SPanel using the NodeJS Manager.

## Prerequisites

- SPanel account with NodeJS Manager access
- MySQL database (can create via SPanel)
- Domain or subdomain pointed to your server

## Step 1: Create MySQL Database

1. Log into SPanel
2. Go to **Databases** → **MySQL Databases**
3. Create a new database (e.g., `revma_hire`)
4. Create a database user with full privileges
5. Note down: database name, username, password

## Step 2: Upload Files

### Option A: Via File Manager
1. Go to **File Manager** in SPanel
2. Navigate to your domain's directory (e.g., `/home/username/yourdomain.com/`)
3. Upload all files from this package (excluding `node_modules`)

### Option B: Via SFTP
1. Connect via SFTP to your server
2. Upload all files to your domain's directory

## Step 3: Configure Environment

1. In File Manager, edit the `.env` file:

```env
# Database - Use MySQL for SPanel
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password
MYSQL_DATABASE=revma_hire

# Security - CHANGE THIS!
JWT_SECRET=your-super-secret-key-minimum-32-characters

# Email - Your SMTP settings
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USERNAME=office@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_EMAIL=office@yourdomain.com
NOTIFICATION_EMAIL=admin@yourdomain.com

# URLs
FRONTEND_URL=https://yourdomain.com
PORT=8001
CORS_ORIGINS=https://yourdomain.com
```

## Step 4: Create Node.js Application

1. Go to **NodeJS Manager** in SPanel
2. Click **Create Application**
3. Configure:
   - **Node.js version**: 18.x or 20.x (LTS)
   - **Application mode**: Production
   - **Application root**: `/home/username/yourdomain.com` (where you uploaded files)
   - **Application URL**: Your domain
   - **Application startup file**: `server.js`
4. Click **Create**

## Step 5: Install Dependencies & Start

1. In NodeJS Manager, click on your application
2. Click **Run NPM Install** (or use SSH: `npm install`)
3. Click **Start Application**

## Step 6: Initialize Database

After the app is running, seed the initial data:

```bash
curl -X POST https://yourdomain.com/api/seed
```

Or via SSH in your app directory:
```bash
curl -X POST http://localhost:8001/api/seed
```

## Step 7: Deploy Frontend

The React frontend needs to be built and deployed separately:

1. On your local machine or build server:
   ```bash
   cd frontend
   npm install
   REACT_APP_BACKEND_URL=https://yourdomain.com npm run build
   ```

2. Upload the contents of `frontend/build/` to your public_html directory

3. Configure your web server (Apache/Nginx) to:
   - Serve static files from public_html
   - Proxy `/api/*` requests to `http://localhost:8001`

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    root /home/username/public_html;
    index index.html;

    # Frontend - React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API - Proxy to Node.js
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 8: SSL Certificate

1. In SPanel, go to **SSL Certificates**
2. Install Let's Encrypt certificate for your domain
3. Enable **Force HTTPS**

## Troubleshooting

### App won't start
- Check logs in NodeJS Manager
- Verify `.env` file has correct database credentials
- Ensure MySQL database exists and user has permissions

### Database connection errors
- Test MySQL connection: `mysql -u username -p database_name`
- Check if MySQL is running: `systemctl status mysql`

### Email not sending
- Verify SMTP credentials
- Check if port 465 is open
- Test with a simpler SMTP service first

### 502/503 errors
- App may have crashed - check logs
- Restart application in NodeJS Manager
- Verify Node.js version compatibility

## Default Credentials

After seeding the database:
- **Admin**: admin@revma.com.au / admin123
- **Staff**: staff@revma.com.au / staff123

**IMPORTANT**: Change these passwords immediately after first login!

## Support

For technical issues, contact your developer or hosting provider.
