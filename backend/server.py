from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
ID_DOCS_DIR = UPLOAD_DIR / "id_documents"

for directory in [UPLOAD_DIR, PHOTOS_DIR, SIGNATURES_DIR, PDFS_DIR, ID_DOCS_DIR]:
    directory.mkdir(exist_ok=True)

# Frontend URL for customer links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://dry-hire-pro.preview.emergentagent.com')

# Create the main app
app = FastAPI(title="Revma Heavy Equipment Hire API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== MODELS ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "customer"  # customer, staff, admin
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

class MachineCreate(BaseModel):
    name: str
    make: str
    model: str
    category: str  # excavator, tipper, trailer, vac
    description: str
    image_url: str
    daily_rate: float
    weekly_rate: float
    monthly_rate: float
    security_bond: float
    specifications: dict = {}
    is_available: bool = True

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

class ChecklistItem(BaseModel):
    item: str
    checked: bool
    notes: Optional[str] = None

class PhotoRecord(BaseModel):
    position: str  # front, back, left, right
    filename: str
    uploaded_at: str

class AgreementCreate(BaseModel):
    customer_id: str
    machine_id: str
    hire_start_date: str
    hire_end_date: str
    hire_rate_type: str  # daily, weekly, monthly
    delivery_method: str  # pickup, delivery
    delivery_address: Optional[str] = None
    job_site: str
    purpose: str
    special_conditions: Optional[str] = None

class AgreementUpdate(BaseModel):
    checklist: Optional[List[ChecklistItem]] = None
    photos: Optional[List[PhotoRecord]] = None
    customer_signature: Optional[str] = None
    staff_signature: Optional[str] = None

class AgreementResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    agreement_number: str
    customer_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_licence: Optional[str] = None
    customer_abn: Optional[str] = None
    customer_company: Optional[str] = None
    customer_address: Optional[str] = None
    machine_id: str
    machine_name: str
    machine_make: str
    machine_model: str
    hire_start_date: str
    hire_end_date: str
    hire_rate_type: str
    hire_rate: float
    security_bond: float
    delivery_method: str
    delivery_address: Optional[str] = None
    job_site: str
    purpose: str
    special_conditions: Optional[str] = None
    checklist: List[ChecklistItem] = []
    photos: List[PhotoRecord] = []
    customer_signature: Optional[str] = None
    staff_signature: Optional[str] = None
    status: str  # draft, pending_checklist, pending_photos, pending_signature, active, completed, cancelled
    pdf_path: Optional[str] = None
    created_at: str
    signed_at: Optional[str] = None

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
    hire_rate_preference: str  # daily, weekly, monthly
    delivery_method: str  # pickup, delivery
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
    status: str  # new, contacted, converted, declined
    created_at: str

class TermsConditions(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    section_name: str
    content: str
    order: int
    is_active: bool = True
    updated_at: str

class TermsConditionsCreate(BaseModel):
    section_name: str
    content: str
    order: int
    is_active: bool = True

# ======================== QUOTE MODELS ========================

class QuoteLineItem(BaseModel):
    machine_id: str
    machine_name: str
    rate_type: str  # daily, weekly, monthly
    rate: float
    quantity: int = 1
    subtotal: float

class QuoteCreate(BaseModel):
    inquiry_id: str
    customer_email: str
    customer_name: str
    customer_phone: str
    line_items: List[QuoteLineItem]
    hire_start_date: str
    hire_end_date: str
    delivery_method: str
    delivery_address: Optional[str] = None
    delivery_fee: float = 0
    notes: Optional[str] = None
    valid_until: str  # Quote expiry date

class QuoteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    quote_number: str
    inquiry_id: str
    customer_email: str
    customer_name: str
    customer_phone: str
    line_items: List[dict]
    hire_start_date: str
    hire_end_date: str
    delivery_method: str
    delivery_address: Optional[str] = None
    delivery_fee: float
    subtotal: float
    security_bond: float
    total: float
    notes: Optional[str] = None
    valid_until: str
    status: str  # draft, sent, accepted, declined, expired
    access_token: str  # Token for customer to access quote
    id_documents: List[dict] = []
    id_verified: bool = False
    customer_signature: Optional[str] = None
    signed_at: Optional[str] = None
    created_at: str

class IDDocument(BaseModel):
    doc_type: str  # drivers_licence_front, drivers_licence_back, passport, medicare, other
    points: int  # ID points value
    filename: str
    uploaded_at: str

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
            .value {{ color: #555; }}
            .equipment {{ background-color: #E63946; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin: 2px; }}
            .footer {{ text-align: center; padding: 20px; color: #888; font-size: 12px; }}
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
                <div class="field">
                    <span class="label">Name:</span>
                    <span class="value">{inquiry.get('first_name', '')} {inquiry.get('last_name', '')}</span>
                </div>
                <div class="field">
                    <span class="label">Email:</span>
                    <span class="value">{inquiry.get('email', '')}</span>
                </div>
                <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value">{inquiry.get('phone', '')}</span>
                </div>
                {"<div class='field'><span class='label'>Company:</span> <span class='value'>" + inquiry.get('company_name', '') + "</span></div>" if inquiry.get('is_business') else ""}
                {"<div class='field'><span class='label'>ABN:</span> <span class='value'>" + inquiry.get('abn', '') + "</span></div>" if inquiry.get('abn') else ""}
                
                <h2>Equipment Required</h2>
                <div class="field">
                    {"".join([f'<span class="equipment">{eq}</span>' for eq in inquiry.get('equipment', [])])}
                </div>
                
                <h2>Hire Details</h2>
                <div class="field">
                    <span class="label">Start Date:</span>
                    <span class="value">{inquiry.get('hire_start_date', '')}</span>
                </div>
                <div class="field">
                    <span class="label">End Date:</span>
                    <span class="value">{inquiry.get('hire_end_date', '')}</span>
                </div>
                <div class="field">
                    <span class="label">Preferred Rate:</span>
                    <span class="value">{inquiry.get('hire_rate_preference', '').capitalize()}</span>
                </div>
                <div class="field">
                    <span class="label">Delivery Method:</span>
                    <span class="value">{inquiry.get('delivery_method', '').capitalize()}</span>
                </div>
                {"<div class='field'><span class='label'>Delivery Address:</span> <span class='value'>" + inquiry.get('delivery_address', '') + "</span></div>" if inquiry.get('delivery_address') else ""}
                
                <h2>Job Description</h2>
                <p>{inquiry.get('job_description', '')}</p>
                
                {"<h2>Additional Notes</h2><p>" + inquiry.get('additional_notes', '') + "</p>" if inquiry.get('additional_notes') else ""}
                
                <p style="text-align: center; margin-top: 20px;">
                    <a href="mailto:{inquiry.get('email', '')}" class="cta">Reply to Customer</a>
                    <a href="tel:{inquiry.get('phone', '')}" class="cta" style="background-color: #1A1D23;">Call Customer</a>
                </p>
            </div>
            <div class="footer">
                <p>This notification was sent from the Revma Equipment Hire Portal</p>
                <p>Revma Pty Ltd | ABN: 37 121 035 710 | 0448 473 862</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"New Hire Enquiry: {inquiry.get('first_name', '')} {inquiry.get('last_name', '')} - {equipment_list}"
    await send_email(NOTIFICATION_EMAIL, subject, html_content)

async def send_quote_to_customer(quote: dict):
    """Send quote email to customer with link to view, upload ID, and sign"""
    customer_email = quote.get('customer_email', '')
    if not customer_email:
        return
    
    quote_url = f"{FRONTEND_URL}/quote/{quote.get('id')}?token={quote.get('access_token')}"
    
    # Format line items
    items_html = ""
    for item in quote.get('line_items', []):
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.get('machine_name', '')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item.get('rate_type', '').capitalize()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.get('rate', 0):.2f}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.get('subtotal', 0):.2f}</td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; }}
            .header {{ background-color: #1A1D23; color: white; padding: 30px; text-align: center; }}
            .header img {{ max-height: 60px; }}
            .header h1 {{ margin: 10px 0 0 0; color: #E63946; font-size: 24px; }}
            .content {{ padding: 30px; background-color: #ffffff; }}
            .quote-box {{ background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .quote-number {{ color: #E63946; font-size: 18px; font-weight: bold; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th {{ background-color: #1A1D23; color: white; padding: 12px; text-align: left; }}
            .totals {{ background-color: #f8f9fa; }}
            .totals td {{ padding: 10px; font-weight: bold; }}
            .total-row {{ background-color: #E63946; color: white; }}
            .cta {{ display: inline-block; background-color: #E63946; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 10px 5px; }}
            .cta-secondary {{ background-color: #1A1D23; }}
            .steps {{ margin: 30px 0; }}
            .step {{ display: flex; align-items: flex-start; margin: 15px 0; }}
            .step-number {{ background-color: #E63946; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }}
            .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            .id-notice {{ background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://www.revma.com.au/assets/images/revma-logo.jpg" alt="Revma Logo" />
                <h1>YOUR EQUIPMENT HIRE QUOTE</h1>
            </div>
            <div class="content">
                <p>Hi {quote.get('customer_name', '').split()[0] if quote.get('customer_name') else 'there'},</p>
                <p>Thank you for your equipment hire enquiry. Please find your quote below:</p>
                
                <div class="quote-box">
                    <span class="quote-number">Quote #{quote.get('quote_number', '')}</span>
                    <p style="margin: 5px 0; color: #666;">Valid until: {quote.get('valid_until', '')}</p>
                </div>
                
                <h3>Hire Details</h3>
                <p><strong>Hire Period:</strong> {quote.get('hire_start_date', '')} to {quote.get('hire_end_date', '')}</p>
                <p><strong>Collection:</strong> {quote.get('delivery_method', '').capitalize()}</p>
                {f"<p><strong>Delivery Address:</strong> {quote.get('delivery_address', '')}</p>" if quote.get('delivery_address') else ""}
                
                <table>
                    <thead>
                        <tr>
                            <th>Equipment</th>
                            <th style="text-align: center;">Rate</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                    <tfoot class="totals">
                        <tr>
                            <td colspan="3" style="text-align: right; padding: 10px;">Subtotal:</td>
                            <td style="text-align: right; padding: 10px;">${quote.get('subtotal', 0):.2f}</td>
                        </tr>
                        {f'<tr><td colspan="3" style="text-align: right; padding: 10px;">Delivery Fee:</td><td style="text-align: right; padding: 10px;">${quote.get("delivery_fee", 0):.2f}</td></tr>' if quote.get('delivery_fee', 0) > 0 else ''}
                        <tr>
                            <td colspan="3" style="text-align: right; padding: 10px;">Security Bond (refundable):</td>
                            <td style="text-align: right; padding: 10px;">${quote.get('security_bond', 0):.2f}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right; padding: 12px;">TOTAL:</td>
                            <td style="text-align: right; padding: 12px; font-size: 18px;">${quote.get('total', 0):.2f}</td>
                        </tr>
                    </tfoot>
                </table>
                
                {f"<p><strong>Notes:</strong> {quote.get('notes', '')}</p>" if quote.get('notes') else ""}
                
                <div class="id-notice">
                    <strong>📋 100 Points of ID Required</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">To proceed with your hire, you'll need to upload identification documents (e.g., Driver's Licence + Medicare Card or Passport).</p>
                </div>
                
                <div class="steps">
                    <h3>To Accept This Quote:</h3>
                    <div class="step">
                        <div class="step-number">1</div>
                        <div>
                            <strong>Review Quote</strong>
                            <p style="margin: 5px 0; color: #666;">Check the equipment, dates, and pricing</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div>
                            <strong>Upload ID Documents</strong>
                            <p style="margin: 5px 0; color: #666;">Provide 100 points of identification</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div>
                            <strong>Read & Sign Agreement</strong>
                            <p style="margin: 5px 0; color: #666;">Review terms and sign digitally</p>
                        </div>
                    </div>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{quote_url}" class="cta">View Quote & Accept</a>
                </p>
                
                <p style="color: #666; font-size: 14px;">If you have any questions, please call us on <a href="tel:0448473862" style="color: #E63946;">0448 473 862</a> or reply to this email.</p>
            </div>
            <div class="footer">
                <p>Revma Pty Ltd | ABN: 37 121 035 710</p>
                <p>Unit 9/12 Channel Road, Mayfield West NSW 2304</p>
                <p>Phone: 0448 473 862 | Email: office@revma.com.au</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"Your Equipment Hire Quote #{quote.get('quote_number', '')} - Revma Pty Ltd"
    await send_email(customer_email, subject, html_content)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
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

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in ["customer"] else "customer",
        "company_name": user_data.company_name,
        "abn": user_data.abn,
        "drivers_licence": user_data.drivers_licence,
        "address": user_data.address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email, user_doc["role"])
    
    user_response = {k: v for k, v in user_doc.items() if k != "password_hash"}
    return TokenResponse(access_token=token, user=UserResponse(**user_response))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    return TokenResponse(access_token=token, user=UserResponse(**user_response))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in current_user.items() if k != "password_hash"})

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    company_name: Optional[str] = None,
    abn: Optional[str] = None,
    drivers_licence: Optional[str] = None,
    address: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    if full_name: update_data["full_name"] = full_name
    if phone: update_data["phone"] = phone
    if company_name: update_data["company_name"] = company_name
    if abn: update_data["abn"] = abn
    if drivers_licence: update_data["drivers_licence"] = drivers_licence
    if address: update_data["address"] = address
    
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    return UserResponse(**user)

# ======================== MACHINE ROUTES ========================

@api_router.get("/machines", response_model=List[MachineResponse])
async def get_machines(category: Optional[str] = None, available_only: bool = False):
    query = {}
    if category:
        query["category"] = category
    if available_only:
        query["is_available"] = True
    
    machines = await db.machines.find(query, {"_id": 0}).to_list(100)
    return [MachineResponse(**m) for m in machines]

@api_router.get("/machines/{machine_id}", response_model=MachineResponse)
async def get_machine(machine_id: str):
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return MachineResponse(**machine)

@api_router.post("/machines", response_model=MachineResponse)
async def create_machine(machine: MachineCreate, current_user: dict = Depends(require_staff)):
    machine_id = str(uuid.uuid4())
    machine_doc = {"id": machine_id, **machine.model_dump()}
    await db.machines.insert_one(machine_doc)
    return MachineResponse(**machine_doc)

@api_router.put("/machines/{machine_id}", response_model=MachineResponse)
async def update_machine(machine_id: str, machine: MachineCreate, current_user: dict = Depends(require_staff)):
    result = await db.machines.update_one({"id": machine_id}, {"$set": machine.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    updated = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    return MachineResponse(**updated)

# ======================== AGREEMENT ROUTES ========================

def generate_agreement_number():
    now = datetime.now(timezone.utc)
    return f"REV-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

@api_router.post("/agreements", response_model=AgreementResponse)
async def create_agreement(agreement: AgreementCreate, current_user: dict = Depends(get_current_user)):
    # Get customer info
    customer = await db.users.find_one({"id": agreement.customer_id}, {"_id": 0, "password_hash": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get machine info
    machine = await db.machines.find_one({"id": agreement.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Calculate hire rate based on type
    rate_map = {"daily": machine["daily_rate"], "weekly": machine["weekly_rate"], "monthly": machine["monthly_rate"]}
    hire_rate = rate_map.get(agreement.hire_rate_type, machine["daily_rate"])
    
    # Default checklist
    default_checklist = [
        {"item": "Engine Oil Level", "checked": False, "notes": None},
        {"item": "Fuel Level", "checked": False, "notes": None},
        {"item": "Coolant Level", "checked": False, "notes": None},
        {"item": "Hydraulic Fluid Level", "checked": False, "notes": None},
        {"item": "Tracks/Tyres Condition", "checked": False, "notes": None},
        {"item": "Visible Damage Inspection", "checked": False, "notes": None},
        {"item": "Lights & Indicators Working", "checked": False, "notes": None},
        {"item": "Safety Equipment Present", "checked": False, "notes": None},
    ]
    
    agreement_id = str(uuid.uuid4())
    agreement_doc = {
        "id": agreement_id,
        "agreement_number": generate_agreement_number(),
        "customer_id": agreement.customer_id,
        "customer_name": customer["full_name"],
        "customer_email": customer["email"],
        "customer_phone": customer["phone"],
        "customer_licence": customer.get("drivers_licence"),
        "customer_abn": customer.get("abn"),
        "customer_company": customer.get("company_name"),
        "customer_address": customer.get("address"),
        "machine_id": agreement.machine_id,
        "machine_name": machine["name"],
        "machine_make": machine["make"],
        "machine_model": machine["model"],
        "hire_start_date": agreement.hire_start_date,
        "hire_end_date": agreement.hire_end_date,
        "hire_rate_type": agreement.hire_rate_type,
        "hire_rate": hire_rate,
        "security_bond": machine["security_bond"],
        "delivery_method": agreement.delivery_method,
        "delivery_address": agreement.delivery_address,
        "job_site": agreement.job_site,
        "purpose": agreement.purpose,
        "special_conditions": agreement.special_conditions,
        "checklist": default_checklist,
        "photos": [],
        "customer_signature": None,
        "staff_signature": None,
        "status": "draft",
        "pdf_path": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "signed_at": None
    }
    
    await db.agreements.insert_one(agreement_doc)
    return AgreementResponse(**agreement_doc)

@api_router.get("/agreements", response_model=List[AgreementResponse])
async def get_agreements(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "customer":
        query["customer_id"] = current_user["id"]
    if status:
        query["status"] = status
    
    agreements = await db.agreements.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [AgreementResponse(**a) for a in agreements]

@api_router.get("/agreements/{agreement_id}", response_model=AgreementResponse)
async def get_agreement(agreement_id: str, current_user: dict = Depends(get_current_user)):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    if current_user["role"] == "customer" and agreement["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return AgreementResponse(**agreement)

@api_router.put("/agreements/{agreement_id}/checklist")
async def update_checklist(agreement_id: str, checklist: List[ChecklistItem], current_user: dict = Depends(get_current_user)):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    checklist_data = [item.model_dump() for item in checklist]
    all_checked = all(item["checked"] for item in checklist_data)
    
    new_status = "pending_photos" if all_checked else "pending_checklist"
    if agreement["status"] == "draft":
        new_status = "pending_checklist"
    
    await db.agreements.update_one(
        {"id": agreement_id},
        {"$set": {"checklist": checklist_data, "status": new_status}}
    )
    
    return {"success": True, "all_checked": all_checked}

@api_router.post("/agreements/{agreement_id}/photos")
async def upload_photo(
    agreement_id: str,
    position: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Save the file
    filename = f"{agreement_id}_{position}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = PHOTOS_DIR / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Update agreement photos
    photos = agreement.get("photos", [])
    # Remove existing photo for this position
    photos = [p for p in photos if p["position"] != position]
    photos.append({
        "position": position,
        "filename": filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Check if all 4 photos are uploaded
    has_all_photos = len(set(p["position"] for p in photos)) >= 4
    new_status = "pending_signature" if has_all_photos else "pending_photos"
    
    await db.agreements.update_one(
        {"id": agreement_id},
        {"$set": {"photos": photos, "status": new_status}}
    )
    
    return {"success": True, "filename": filename, "has_all_photos": has_all_photos}

@api_router.get("/photos/{filename}")
async def get_photo(filename: str):
    file_path = PHOTOS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(file_path)

@api_router.post("/agreements/{agreement_id}/sign")
async def sign_agreement(
    agreement_id: str,
    signature_type: str = Form(...),  # customer or staff
    signature_data: str = Form(...),  # base64 encoded signature image
    current_user: dict = Depends(get_current_user)
):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Validate signature type based on user role
    if signature_type == "customer" and current_user["role"] not in ["customer", "staff", "admin"]:
        raise HTTPException(status_code=403, detail="Cannot sign as customer")
    if signature_type == "staff" and current_user["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Save signature image
    sig_filename = f"{agreement_id}_{signature_type}_{uuid.uuid4().hex[:8]}.png"
    sig_path = SIGNATURES_DIR / sig_filename
    
    # Decode and save base64 signature
    try:
        sig_data = signature_data.split(",")[1] if "," in signature_data else signature_data
        sig_bytes = base64.b64decode(sig_data)
        async with aiofiles.open(sig_path, 'wb') as f:
            await f.write(sig_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid signature data: {str(e)}")
    
    # Update agreement
    update_data = {f"{signature_type}_signature": sig_filename}
    
    # Check if both signatures are present
    if signature_type == "customer":
        if agreement.get("staff_signature"):
            update_data["status"] = "active"
            update_data["signed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        if agreement.get("customer_signature"):
            update_data["status"] = "active"
            update_data["signed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.agreements.update_one({"id": agreement_id}, {"$set": update_data})
    
    return {"success": True, "signature_filename": sig_filename}

@api_router.get("/signatures/{filename}")
async def get_signature(filename: str):
    file_path = SIGNATURES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Signature not found")
    return FileResponse(file_path)

# ======================== INQUIRY ROUTES ========================

@api_router.post("/inquiries", response_model=InquiryResponse)
async def create_inquiry(inquiry: InquiryCreate, background_tasks: BackgroundTasks):
    inquiry_id = str(uuid.uuid4())
    inquiry_doc = {
        "id": inquiry_id,
        **inquiry.model_dump(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiries.insert_one(inquiry_doc)
    
    # Send email notification in background
    background_tasks.add_task(send_inquiry_notification, inquiry_doc)
    
    return InquiryResponse(**inquiry_doc)

@api_router.get("/inquiries", response_model=List[InquiryResponse])
async def get_inquiries(status: Optional[str] = None, current_user: dict = Depends(require_staff)):
    query = {}
    if status:
        query["status"] = status
    
    inquiries = await db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [InquiryResponse(**i) for i in inquiries]

@api_router.put("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, status: str, current_user: dict = Depends(require_staff)):
    result = await db.inquiries.update_one({"id": inquiry_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"success": True}

# ======================== QUOTE ROUTES ========================

def generate_quote_number():
    now = datetime.now(timezone.utc)
    return f"Q-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

def generate_access_token():
    """Generate a secure token for customer quote access"""
    return str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')[:16]

# ID Points values for Australian 100-point check
ID_POINTS = {
    "drivers_licence": 40,
    "passport": 70,
    "birth_certificate": 70,
    "citizenship_certificate": 70,
    "medicare": 25,
    "credit_card": 25,
    "utility_bill": 25,
    "bank_statement": 25,
    "other": 10
}

@api_router.post("/quotes", response_model=QuoteResponse)
async def create_quote(quote_data: QuoteCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(require_staff)):
    """Create a quote from an inquiry and optionally send to customer"""
    
    # Calculate totals
    subtotal = sum(item.subtotal for item in quote_data.line_items)
    
    # Calculate security bond (sum of all machine bonds)
    security_bond = 0
    for item in quote_data.line_items:
        machine = await db.machines.find_one({"id": item.machine_id}, {"_id": 0})
        if machine:
            security_bond += machine.get("security_bond", 0)
    
    total = subtotal + quote_data.delivery_fee + security_bond
    
    quote_id = str(uuid.uuid4())
    access_token = generate_access_token()
    
    quote_doc = {
        "id": quote_id,
        "quote_number": generate_quote_number(),
        "inquiry_id": quote_data.inquiry_id,
        "customer_email": quote_data.customer_email,
        "customer_name": quote_data.customer_name,
        "customer_phone": quote_data.customer_phone,
        "line_items": [item.model_dump() for item in quote_data.line_items],
        "hire_start_date": quote_data.hire_start_date,
        "hire_end_date": quote_data.hire_end_date,
        "delivery_method": quote_data.delivery_method,
        "delivery_address": quote_data.delivery_address,
        "delivery_fee": quote_data.delivery_fee,
        "subtotal": subtotal,
        "security_bond": security_bond,
        "total": total,
        "notes": quote_data.notes,
        "valid_until": quote_data.valid_until,
        "status": "draft",
        "access_token": access_token,
        "id_documents": [],
        "id_verified": False,
        "customer_signature": None,
        "signed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.quotes.insert_one(quote_doc)
    
    # Update inquiry status
    await db.inquiries.update_one({"id": quote_data.inquiry_id}, {"$set": {"status": "quoted"}})
    
    return QuoteResponse(**quote_doc)

@api_router.get("/quotes", response_model=List[QuoteResponse])
async def get_quotes(status: Optional[str] = None, current_user: dict = Depends(require_staff)):
    query = {}
    if status:
        query["status"] = status
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [QuoteResponse(**q) for q in quotes]

@api_router.get("/quotes/{quote_id}", response_model=QuoteResponse)
async def get_quote(quote_id: str, current_user: dict = Depends(require_staff)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return QuoteResponse(**quote)

@api_router.post("/quotes/{quote_id}/send")
async def send_quote(quote_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(require_staff)):
    """Send quote email to customer"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Update status to sent
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "sent"}})
    quote["status"] = "sent"
    
    # Send email in background
    background_tasks.add_task(send_quote_to_customer, quote)
    
    return {"success": True, "message": "Quote sent to customer"}

# ======================== CUSTOMER QUOTE ACCESS (No Auth Required) ========================

@api_router.get("/customer/quote/{quote_id}")
async def get_quote_for_customer(quote_id: str, token: str):
    """Get quote details for customer (requires access token)"""
    quote = await db.quotes.find_one({"id": quote_id, "access_token": token}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or invalid token")
    
    # Get terms and conditions
    terms = await db.terms.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Calculate ID points
    total_points = sum(doc.get("points", 0) for doc in quote.get("id_documents", []))
    
    return {
        "quote": quote,
        "terms": terms,
        "id_points_total": total_points,
        "id_points_required": 100
    }

@api_router.post("/customer/quote/{quote_id}/upload-id")
async def upload_id_document(
    quote_id: str,
    token: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload ID document for quote (customer access)"""
    quote = await db.quotes.find_one({"id": quote_id, "access_token": token}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or invalid token")
    
    if quote.get("status") not in ["sent", "accepted"]:
        raise HTTPException(status_code=400, detail="Quote is not available for ID upload")
    
    # Get points for this document type
    points = ID_POINTS.get(doc_type, 10)
    
    # Save the file
    filename = f"{quote_id}_{doc_type}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = ID_DOCS_DIR / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Update quote with new ID document
    id_doc = {
        "doc_type": doc_type,
        "points": points,
        "filename": filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    id_documents = quote.get("id_documents", [])
    # Replace existing document of same type
    id_documents = [d for d in id_documents if d.get("doc_type") != doc_type]
    id_documents.append(id_doc)
    
    # Calculate total points
    total_points = sum(doc.get("points", 0) for doc in id_documents)
    id_verified = total_points >= 100
    
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"id_documents": id_documents, "id_verified": id_verified}}
    )
    
    return {
        "success": True,
        "filename": filename,
        "points": points,
        "total_points": total_points,
        "id_verified": id_verified
    }

@api_router.get("/id-documents/{filename}")
async def get_id_document(filename: str, current_user: dict = Depends(require_staff)):
    """Get ID document (staff only)"""
    file_path = ID_DOCS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(file_path)

@api_router.post("/customer/quote/{quote_id}/sign")
async def sign_quote(
    quote_id: str,
    token: str = Form(...),
    signature_data: str = Form(...),
    agreed_to_terms: bool = Form(...)
):
    """Customer signs the quote/agreement"""
    quote = await db.quotes.find_one({"id": quote_id, "access_token": token}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or invalid token")
    
    if not agreed_to_terms:
        raise HTTPException(status_code=400, detail="You must agree to the terms and conditions")
    
    if not quote.get("id_verified"):
        raise HTTPException(status_code=400, detail="Please upload 100 points of ID before signing")
    
    # Save signature
    sig_filename = f"{quote_id}_customer_{uuid.uuid4().hex[:8]}.png"
    sig_path = SIGNATURES_DIR / sig_filename
    
    try:
        sig_data = signature_data.split(",")[1] if "," in signature_data else signature_data
        sig_bytes = base64.b64decode(sig_data)
        async with aiofiles.open(sig_path, 'wb') as f:
            await f.write(sig_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid signature data: {str(e)}")
    
    # Update quote
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "customer_signature": sig_filename,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "status": "accepted"
        }}
    )
    
    # Send notification to staff
    # (Could add email notification here)
    
    return {"success": True, "message": "Agreement signed successfully"}

# ======================== TERMS & CONDITIONS ROUTES ========================

@api_router.get("/terms", response_model=List[TermsConditions])
async def get_terms():
    terms = await db.terms.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return [TermsConditions(**t) for t in terms]

@api_router.post("/terms", response_model=TermsConditions)
async def create_terms(terms: TermsConditionsCreate, current_user: dict = Depends(require_admin)):
    terms_id = str(uuid.uuid4())
    terms_doc = {
        "id": terms_id,
        **terms.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.terms.insert_one(terms_doc)
    return TermsConditions(**terms_doc)

@api_router.put("/terms/{terms_id}", response_model=TermsConditions)
async def update_terms(terms_id: str, terms: TermsConditionsCreate, current_user: dict = Depends(require_admin)):
    update_data = {**terms.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.terms.update_one({"id": terms_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Terms section not found")
    
    updated = await db.terms.find_one({"id": terms_id}, {"_id": 0})
    return TermsConditions(**updated)

@api_router.delete("/terms/{terms_id}")
async def delete_terms(terms_id: str, current_user: dict = Depends(require_admin)):
    result = await db.terms.delete_one({"id": terms_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Terms section not found")
    return {"success": True}

# ======================== USERS ROUTES (Admin) ========================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, current_user: dict = Depends(require_staff)):
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(500)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(require_admin)):
    if role not in ["customer", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True}

# ======================== SEED DATA ========================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data for the application"""
    
    # Check if already seeded
    existing_machines = await db.machines.count_documents({})
    if existing_machines > 0:
        return {"message": "Data already seeded"}
    
    return await reseed_data()

@api_router.post("/reseed")
async def reseed_data():
    """Force reseed - drops existing data and reseeds"""
    
    # Drop existing collections
    await db.machines.delete_many({})
    await db.terms.delete_many({})
    
    # Create admin user if not exists
    existing_admin = await db.users.find_one({"email": "admin@revma.com.au"})
    if not existing_admin:
        admin_id = str(uuid.uuid4())
        admin_doc = {
            "id": admin_id,
            "email": "admin@revma.com.au",
            "password_hash": hash_password("admin123"),
            "full_name": "Admin User",
            "phone": "0448 473 862",
            "role": "admin",
            "company_name": "Revma Pty Ltd",
            "abn": "37 121 035 710",
            "drivers_licence": None,
            "address": "Unit 9/12 Channel Road, Mayfield West NSW 2304",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
    
    # Create staff user if not exists
    existing_staff = await db.users.find_one({"email": "staff@revma.com.au"})
    if not existing_staff:
        staff_id = str(uuid.uuid4())
        staff_doc = {
            "id": staff_id,
            "email": "staff@revma.com.au",
            "password_hash": hash_password("staff123"),
            "full_name": "Staff Member",
            "phone": "0400 000 000",
            "role": "staff",
            "company_name": "Revma Pty Ltd",
            "abn": None,
            "drivers_licence": None,
            "address": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(staff_doc)
    
    # Seed machines from Revma website with actual images
    machines = [
        {
            "id": str(uuid.uuid4()),
            "name": "Isuzu NLR Tipper",
            "make": "Isuzu",
            "model": "NLR 45-150",
            "category": "tipper",
            "description": "Reliable light-duty Isuzu NLR tipper truck ideal for hauling soil, gravel, sand, rubble and construction materials. Perfect for earthworks, demolition and landscaping projects.",
            "image_url": "https://www.revma.com.au/assets/images/isuzu-nlr-tipper.webp",
            "daily_rate": 190.0,
            "weekly_rate": 1140.0,
            "monthly_rate": 3990.0,
            "security_bond": 400.0,
            "specifications": {
                "gvm": "4,500 kg",
                "licence": "Driver's Licence",
                "engine": "Isuzu 4JJ1-TCS",
                "power": "110 kW (148 HP)",
                "tipper_volume": "2.0 m³"
            },
            "is_available": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Kubota K008-3 Mini Excavator",
            "make": "Kubota",
            "model": "K008-3",
            "category": "excavator",
            "description": "Ultra-compact Kubota K008-3 mini excavator — perfect for tight access areas, landscaping, trenching and small earthworks where a larger machine can't fit.",
            "image_url": "https://www.revma.com.au/assets/images/kubota-k008-3.jpg",
            "daily_rate": 220.0,
            "weekly_rate": 1320.0,
            "monthly_rate": 4620.0,
            "security_bond": 500.0,
            "specifications": {
                "operating_weight": "1,000 kg",
                "engine": "Kubota D722-E4",
                "power": "7.7 kW",
                "dig_depth": "1.6 m",
                "track_type": "Rubber"
            },
            "is_available": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Kubota 2.5T Excavator",
            "make": "Kubota",
            "model": "U25",
            "category": "excavator",
            "description": "Versatile Kubota 2.5 tonne excavator suited to residential and commercial earthworks, trenching, drainage, landscaping and civil construction projects.",
            "image_url": "https://www.revma.com.au/assets/images/kubota-2.5t.jpg",
            "daily_rate": 260.0,
            "weekly_rate": 1560.0,
            "monthly_rate": 5460.0,
            "security_bond": 600.0,
            "specifications": {
                "operating_weight": "2,551 kg",
                "engine": "Kubota D1105",
                "power": "15.4 kW (20.7 hp)",
                "fuel_capacity": "28 L"
            },
            "is_available": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "7x5 Box Trailer",
            "make": "Custom",
            "model": "7x5 Single Axle",
            "category": "trailer",
            "description": "Sturdy 7x5 single axle box trailer suitable for moving equipment, materials and general loads. Easy to tow and ideal for both residential and commercial use.",
            "image_url": "https://www.revma.com.au/assets/images/box-trailer-7x5.jpg",
            "daily_rate": 60.0,
            "weekly_rate": 360.0,
            "monthly_rate": 1260.0,
            "security_bond": 200.0,
            "specifications": {
                "size": "7 x 5 ft",
                "atm": "1,350 kg",
                "tow_coupling": "50mm override",
                "brakes": "Mechanical disc"
            },
            "is_available": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ditch Witch FX20 Vac Trailer",
            "make": "Ditch Witch",
            "model": "FX20",
            "category": "vac",
            "description": "The Ditch Witch FX20 vacuum excavation trailer is ideal for safe non-destructive digging around underground services, potholing, slot trenching and debris removal.",
            "image_url": "https://www.revma.com.au/assets/images/ditch-witch-fx20.jpg",
            "daily_rate": 350.0,
            "weekly_rate": 2100.0,
            "monthly_rate": 7350.0,
            "security_bond": 800.0,
            "specifications": {
                "spoils_tank": "568 L (150 gal)",
                "water_tank": "303 L (80 gal)",
                "engine": "Kohler CH740S",
                "power": "20.1 kW (25 hp)",
                "air_flow": "15.3 m³/min"
            },
            "is_available": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vermeer VX30-250 Vac Trailer",
            "make": "Vermeer",
            "model": "VX30-250",
            "category": "vac",
            "description": "The Vermeer VX30-250 vacuum excavation trailer delivers powerful suction for non-destructive digging, utility locating, potholing and hydro excavation on civil and construction sites.",
            "image_url": "https://www.revma.com.au/assets/images/vermeer-vx30-250.jpg",
            "daily_rate": 500.0,
            "weekly_rate": 3000.0,
            "monthly_rate": 10500.0,
            "security_bond": 1000.0,
            "specifications": {
                "spoils_tank": "946 L (250 gal)",
                "water_tank": "378 L total",
                "engine": "Yanmar diesel",
                "power": "23.1 kW (31 hp)",
                "air_flow": "16.3 m³/min"
            },
            "is_available": True
        }
    ]
    
    await db.machines.insert_many(machines)
    
    # Seed default terms and conditions
    terms = [
        {
            "id": str(uuid.uuid4()),
            "section_name": "Hire Agreement",
            "content": "The term of this Hire Form and the Hire Terms (together, this 'Agreement') will commence on the Start Date and continue until the Equipment has been returned in accordance with this Agreement and the referable Fees have been paid.",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "section_name": "Equipment Use",
            "content": "Equipment must be used only on the specified Job Site, for the stated Purpose, properly and skillfully by trained/licensed personnel, in accordance with manufacturer's requirements, and in accordance with all applicable Laws, rules, and regulations.",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "section_name": "Maintenance",
            "content": "Keep equipment locked and keys under control when unattended. For hires over 2 days, customer is responsible for daily maintenance including checking fluids, tightening, lubrication, and track tension.",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "section_name": "Insurance",
            "content": "All Revma hire equipment is covered by comprehensive insurance for the full duration of your hire period, giving you complete peace of mind on site.",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "section_name": "GPS Tracking",
            "content": "Revma Pty Ltd monitors equipment location, usage, speed, etc., via GPS. Customer consents to GPS Tracking by accepting the agreement. Customer must not remove or alter GPS tracking functionality.",
            "order": 5,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.terms.insert_many(terms)
    
    return {"message": "Data seeded successfully", "machines": len(machines), "terms": len(terms)}

# ======================== ROOT ROUTES ========================

@api_router.get("/")
async def root():
    return {"message": "Revma Heavy Equipment Hire API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
