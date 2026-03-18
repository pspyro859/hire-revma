# Revma Heavy Equipment Hire - SPanel Deployment Files

This directory contains everything you need to deploy the app on SPanel with MySQL.

## Files Included

1. **server_mysql.py** - Backend server configured for MySQL instead of MongoDB
2. **.env.example** - Environment variables template
3. **package.json** - Node.js compatible start script
4. **requirements.txt** - Python dependencies
5. **deploy_instructions.md** - Step-by-step deployment guide

## Quick Start

1. Copy all files to your SPanel server
2. Create a MySQL database
3. Configure your `.env` file with database credentials
4. Install dependencies: `pip install -r requirements.txt`
5. Run: `npm start` or `python server_mysql.py`

## MySQL Schema

The app will automatically create the required tables on first run.
