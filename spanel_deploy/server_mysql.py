"""
Revma Heavy Equipment Hire API - MySQL Version for SPanel
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import aiomysql
import os
import logging
from pathlib import Path
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import aiofiles
import json
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uvicorn

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MySQL Configuration
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = int(os.environ.get('DB_PORT', '3306'))
DB_NAME = os.environ.get('DB_NAME', 'revma_hire')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'revma-hire-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '465'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', '')
NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', '')

# Create directories for uploads
UPLOAD_DIR = ROOT_DIR / "uploads"
PHOTOS_DIR = UPLOAD_DIR / "photos"
SIGNATURES_DIR = UPLOAD_DIR / "signatures"
PDFS_DIR = UPLOAD_DIR / "pdfs"

for directory in [UPLOAD_DIR, PHOTOS_DIR, SIGNATURES_DIR, PDFS_DIR]:
    directory.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="Revma Heavy Equipment Hire API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MySQL Connection Pool
pool = None

async def get_pool():
    global pool
    if pool is None:
        pool = await aiomysql.create_pool(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            db=DB_NAME,
            autocommit=True,
            charset='utf8mb4'
        )
    return pool

async def execute_query(query: str, params: tuple = None, fetch: str = None):
    """Execute a MySQL query"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(query, params)
            if fetch == 'one':
                return await cur.fetchone()
            elif fetch == 'all':
                return await cur.fetchall()
            return cur.lastrowid

# ======================== MODELS ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "customer"
    company_name: Optional[str] = None
    abn: Optional[str] = None
    drivers_licence: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    phone: str
    role: str
    company_name: Optional[str] = None
    abn: Optional[str] = None
    drivers_licence: Optional[str] = None
    address: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MachineResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    make: str
    model: str
    category: str
    description: str
    image_url: str
    daily_rate: float
    weekly_rate: float
    monthly_rate: float
    security_bond: float
    specifications: dict = {}
    is_available: bool

class InquiryCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    is_business: bool = False
    company_name: Optional[str] = None
    abn: Optional[str] = None
    equipment: List[str]
    hire_start_date: str
    hire_end_date: str
    hire_rate_preference: str
    delivery_method: str
    delivery_address: Optional[str] = None
    job_description: str
    additional_notes: Optional[str] = None

class InquiryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    is_business: bool
    company_name: Optional[str] = None
    abn: Optional[str] = None
    equipment: List[str]
    hire_start_date: str
    hire_end_date: str
    hire_rate_preference: str
    delivery_method: str
    delivery_address: Optional[str] = None
    job_description: str
    additional_notes: Optional[str] = None
    status: str
    created_at: str

class AgreementCreate(BaseModel):
    customer_id: str
    machine_id: str
    hire_start_date: str
    hire_end_date: str
    hire_rate_type: str
    delivery_method: str
    delivery_address: Optional[str] = None
    job_site: str
    purpose: str
    special_conditions: Optional[str] = None

# ======================== AUTH HELPERS ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await execute_query(
            "SELECT * FROM users WHERE id = %s", 
            (payload["sub"],), 
            fetch='one'
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_staff(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    return current_user

# ======================== EMAIL HELPERS ========================

async def send_email(to_email: str, subject: str, html_content: str):
    """Send email via SMTP"""
    if not all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD]):
        logger.warning("SMTP not configured, skipping email")
        return False
    
    try:
        message = MIMEMultipart("alternative")
        message["From"] = SMTP_FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USERNAME,
            password=SMTP_PASSWORD,
            use_tls=True
        )
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

async def send_inquiry_notification(inquiry: dict):
    """Send notification email for new inquiry"""
    if not NOTIFICATION_EMAIL:
        return
    
    equipment_list = ", ".join(inquiry.get("equipment", []))
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #1A1D23; color: white; padding: 20px; text-align: center; }}
            .header h1 {{ margin: 0; color: #E63946; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .field {{ margin-bottom: 15px; }}
            .label {{ font-weight: bold; color: #1A1D23; }}
            .equipment {{ background-color: #E63946; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin: 2px; }}
            .cta {{ background-color: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>REVMA HIRE</h1>
                <p>New Equipment Hire Enquiry</p>
            </div>
            <div class="content">
                <h2>Customer Details</h2>
                <p><strong>Name:</strong> {inquiry.get('first_name', '')} {inquiry.get('last_name', '')}</p>
                <p><strong>Email:</strong> {inquiry.get('email', '')}</p>
                <p><strong>Phone:</strong> {inquiry.get('phone', '')}</p>
                
                <h2>Equipment Required</h2>
                <p>{"".join([f'<span class="equipment">{eq}</span> ' for eq in inquiry.get('equipment', [])])}</p>
                
                <h2>Hire Details</h2>
                <p><strong>Dates:</strong> {inquiry.get('hire_start_date', '')} to {inquiry.get('hire_end_date', '')}</p>
                <p><strong>Delivery:</strong> {inquiry.get('delivery_method', '').capitalize()}</p>
                
                <h2>Job Description</h2>
                <p>{inquiry.get('job_description', '')}</p>
                
                <p style="text-align: center;">
                    <a href="mailto:{inquiry.get('email', '')}" class="cta">Reply to Customer</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"New Hire Enquiry: {inquiry.get('first_name', '')} {inquiry.get('last_name', '')} - {equipment_list}"
    await send_email(NOTIFICATION_EMAIL, subject, html_content)

# ======================== DATABASE SETUP ========================

async def setup_database():
    """Create tables if they don't exist"""
    tables = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(20) DEFAULT 'customer',
            company_name VARCHAR(255),
            abn VARCHAR(50),
            drivers_licence VARCHAR(50),
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS machines (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            make VARCHAR(100),
            model VARCHAR(100),
            category VARCHAR(50),
            description TEXT,
            image_url VARCHAR(500),
            daily_rate DECIMAL(10,2),
            weekly_rate DECIMAL(10,2),
            monthly_rate DECIMAL(10,2),
            security_bond DECIMAL(10,2),
            specifications JSON,
            is_available BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS inquiries (
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
            delivery_method VARCHAR(20),
            delivery_address TEXT,
            job_description TEXT,
            additional_notes TEXT,
            status VARCHAR(20) DEFAULT 'new',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS agreements (
            id VARCHAR(36) PRIMARY KEY,
            agreement_number VARCHAR(50) UNIQUE,
            customer_id VARCHAR(36),
            customer_name VARCHAR(255),
            customer_email VARCHAR(255),
            customer_phone VARCHAR(50),
            customer_licence VARCHAR(50),
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
            delivery_method VARCHAR(20),
            delivery_address TEXT,
            job_site TEXT,
            purpose TEXT,
            special_conditions TEXT,
            checklist JSON,
            photos JSON,
            customer_signature VARCHAR(255),
            staff_signature VARCHAR(255),
            status VARCHAR(30) DEFAULT 'draft',
            pdf_path VARCHAR(500),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            signed_at DATETIME
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS terms (
            id VARCHAR(36) PRIMARY KEY,
            section_name VARCHAR(255),
            content TEXT,
            sort_order INT,
            is_active BOOLEAN DEFAULT TRUE,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    ]
    
    for table_sql in tables:
        await execute_query(table_sql)
    
    logger.info("Database tables created successfully")

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await execute_query(
        "SELECT id FROM users WHERE email = %s", 
        (user_data.email,), 
        fetch='one'
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    await execute_query(
        """INSERT INTO users (id, email, password_hash, full_name, phone, role, company_name, abn, drivers_licence, address)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, user_data.email, hash_password(user_data.password), user_data.full_name, 
         user_data.phone, "customer", user_data.company_name, user_data.abn, 
         user_data.drivers_licence, user_data.address)
    )
    
    token = create_token(user_id, user_data.email, "customer")
    user = await execute_query("SELECT * FROM users WHERE id = %s", (user_id,), fetch='one')
    user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
    
    return TokenResponse(access_token=token, user=UserResponse(**user))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await execute_query(
        "SELECT * FROM users WHERE email = %s", 
        (credentials.email,), 
        fetch='one'
    )
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"], user["role"])
    user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
    
    return TokenResponse(access_token=token, user=UserResponse(**user))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user['created_at'] = current_user['created_at'].isoformat() if current_user['created_at'] else None
    return UserResponse(**current_user)

# ======================== MACHINE ROUTES ========================

@api_router.get("/machines", response_model=List[MachineResponse])
async def get_machines(category: Optional[str] = None, available_only: bool = False):
    query = "SELECT * FROM machines WHERE 1=1"
    params = []
    
    if category:
        query += " AND category = %s"
        params.append(category)
    if available_only:
        query += " AND is_available = TRUE"
    
    machines = await execute_query(query, tuple(params), fetch='all')
    
    for m in machines:
        m['specifications'] = json.loads(m['specifications']) if m['specifications'] else {}
    
    return [MachineResponse(**m) for m in machines]

@api_router.get("/machines/{machine_id}", response_model=MachineResponse)
async def get_machine(machine_id: str):
    machine = await execute_query(
        "SELECT * FROM machines WHERE id = %s", 
        (machine_id,), 
        fetch='one'
    )
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    machine['specifications'] = json.loads(machine['specifications']) if machine['specifications'] else {}
    return MachineResponse(**machine)

# ======================== INQUIRY ROUTES ========================

@api_router.post("/inquiries", response_model=InquiryResponse)
async def create_inquiry(inquiry: InquiryCreate, background_tasks: BackgroundTasks):
    inquiry_id = str(uuid.uuid4())
    
    await execute_query(
        """INSERT INTO inquiries (id, first_name, last_name, email, phone, is_business, company_name, abn, 
           equipment, hire_start_date, hire_end_date, hire_rate_preference, delivery_method, 
           delivery_address, job_description, additional_notes, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'new')""",
        (inquiry_id, inquiry.first_name, inquiry.last_name, inquiry.email, inquiry.phone,
         inquiry.is_business, inquiry.company_name, inquiry.abn, json.dumps(inquiry.equipment),
         inquiry.hire_start_date, inquiry.hire_end_date, inquiry.hire_rate_preference,
         inquiry.delivery_method, inquiry.delivery_address, inquiry.job_description, inquiry.additional_notes)
    )
    
    inquiry_doc = inquiry.model_dump()
    inquiry_doc['id'] = inquiry_id
    inquiry_doc['status'] = 'new'
    inquiry_doc['created_at'] = datetime.now(timezone.utc).isoformat()
    
    background_tasks.add_task(send_inquiry_notification, inquiry_doc)
    
    return InquiryResponse(**inquiry_doc)

@api_router.get("/inquiries", response_model=List[InquiryResponse])
async def get_inquiries(status: Optional[str] = None, current_user: dict = Depends(require_staff)):
    query = "SELECT * FROM inquiries WHERE 1=1"
    params = []
    
    if status:
        query += " AND status = %s"
        params.append(status)
    
    query += " ORDER BY created_at DESC"
    
    inquiries = await execute_query(query, tuple(params), fetch='all')
    
    for i in inquiries:
        i['equipment'] = json.loads(i['equipment']) if i['equipment'] else []
        i['hire_start_date'] = i['hire_start_date'].isoformat() if i['hire_start_date'] else None
        i['hire_end_date'] = i['hire_end_date'].isoformat() if i['hire_end_date'] else None
        i['created_at'] = i['created_at'].isoformat() if i['created_at'] else None
    
    return [InquiryResponse(**i) for i in inquiries]

# ======================== HEALTH CHECK ========================

@api_router.get("/")
async def root():
    return {"message": "Revma Heavy Equipment Hire API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ======================== SEED DATA ========================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data"""
    
    # Check if already seeded
    machines = await execute_query("SELECT COUNT(*) as count FROM machines", fetch='one')
    if machines['count'] > 0:
        return {"message": "Data already seeded"}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    await execute_query(
        """INSERT INTO users (id, email, password_hash, full_name, phone, role, company_name, abn, address)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (admin_id, 'admin@revma.com.au', hash_password('admin123'), 'Admin User',
         '0448 473 862', 'admin', 'Revma Pty Ltd', '37 121 035 710', 
         'Unit 9/12 Channel Road, Mayfield West NSW 2304')
    )
    
    # Seed machines
    machines = [
        (str(uuid.uuid4()), 'Isuzu NLR Tipper', 'Isuzu', 'NLR 45-150', 'tipper',
         'Reliable light-duty Isuzu NLR tipper truck ideal for hauling soil, gravel, sand, rubble and construction materials.',
         'https://www.revma.com.au/assets/images/isuzu-nlr-tipper.webp',
         190.0, 1140.0, 3990.0, 400.0, json.dumps({"gvm": "4,500 kg", "licence": "Driver's Licence"}), True),
        (str(uuid.uuid4()), 'Kubota K008-3 Mini Excavator', 'Kubota', 'K008-3', 'excavator',
         'Ultra-compact Kubota K008-3 mini excavator — perfect for tight access areas, landscaping, trenching.',
         'https://www.revma.com.au/assets/images/kubota-k008-3.jpg',
         220.0, 1320.0, 4620.0, 500.0, json.dumps({"operating_weight": "1,000 kg"}), True),
        (str(uuid.uuid4()), 'Kubota 2.5T Excavator', 'Kubota', 'U25', 'excavator',
         'Versatile Kubota 2.5 tonne excavator suited to residential and commercial earthworks.',
         'https://www.revma.com.au/assets/images/kubota-2.5t.jpg',
         260.0, 1560.0, 5460.0, 600.0, json.dumps({"operating_weight": "2,551 kg"}), True),
        (str(uuid.uuid4()), '7x5 Box Trailer', 'Custom', '7x5 Single Axle', 'trailer',
         'Sturdy 7x5 single axle box trailer suitable for moving equipment and materials.',
         'https://www.revma.com.au/assets/images/box-trailer-7x5.jpg',
         60.0, 360.0, 1260.0, 200.0, json.dumps({"size": "7 x 5 ft"}), True),
        (str(uuid.uuid4()), 'Ditch Witch FX20 Vac Trailer', 'Ditch Witch', 'FX20', 'vac',
         'The Ditch Witch FX20 vacuum excavation trailer for safe non-destructive digging.',
         'https://www.revma.com.au/assets/images/ditch-witch-fx20.jpg',
         350.0, 2100.0, 7350.0, 800.0, json.dumps({"spoils_tank": "568 L"}), True),
        (str(uuid.uuid4()), 'Vermeer VX30-250 Vac Trailer', 'Vermeer', 'VX30-250', 'vac',
         'The Vermeer VX30-250 vacuum excavation trailer delivers powerful suction.',
         'https://www.revma.com.au/assets/images/vermeer-vx30-250.jpg',
         500.0, 3000.0, 10500.0, 1000.0, json.dumps({"spoils_tank": "946 L"}), True),
    ]
    
    for machine in machines:
        await execute_query(
            """INSERT INTO machines (id, name, make, model, category, description, image_url, 
               daily_rate, weekly_rate, monthly_rate, security_bond, specifications, is_available)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            machine
        )
    
    return {"message": "Data seeded successfully", "machines": len(machines)}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await setup_database()
    logger.info("Application started")

@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        pool.close()
        await pool.wait_closed()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8001))
    host = os.environ.get('HOST', '0.0.0.0')
    uvicorn.run(app, host=host, port=port)
