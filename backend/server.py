from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
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
async def create_inquiry(inquiry: InquiryCreate):
    inquiry_id = str(uuid.uuid4())
    inquiry_doc = {
        "id": inquiry_id,
        **inquiry.model_dump(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiries.insert_one(inquiry_doc)
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
    
    # Create admin user
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
    
    # Create staff user
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
    
    # Seed machines from Revma website
    machines = [
        {
            "id": str(uuid.uuid4()),
            "name": "Isuzu NLR Tipper",
            "make": "Isuzu",
            "model": "NLR 45-150",
            "category": "tipper",
            "description": "Reliable light-duty Isuzu NLR tipper truck ideal for hauling soil, gravel, sand, rubble and construction materials. Perfect for earthworks, demolition and landscaping projects.",
            "image_url": "https://images.unsplash.com/photo-1678984239707-8eb712b6fae1?auto=format&fit=crop&q=80&w=600",
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
            "image_url": "https://images.unsplash.com/photo-1768666197979-f8f0777ef04c?auto=format&fit=crop&q=80&w=600",
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
            "image_url": "https://images.unsplash.com/photo-1768666197979-f8f0777ef04c?auto=format&fit=crop&q=80&w=600",
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
            "image_url": "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?auto=format&fit=crop&q=80&w=600",
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
            "image_url": "https://images.unsplash.com/photo-1769629918284-64b191456534?auto=format&fit=crop&q=80&w=600",
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
            "image_url": "https://images.unsplash.com/photo-1769629918284-64b191456534?auto=format&fit=crop&q=80&w=600",
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
