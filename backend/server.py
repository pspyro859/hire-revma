from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class MachineStatus(str, Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"
    OUT_OF_SERVICE = "out_of_service"

class ChecklistItemStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    NA = "na"

class MaintenanceType(str, Enum):
    SCHEDULED = "scheduled"
    UNSCHEDULED = "unscheduled"
    EMERGENCY = "emergency"

# ============== MODELS ==============

# Document Models
class MachineDocuments(BaseModel):
    safety_guide_url: Optional[str] = None
    operators_manual_url: Optional[str] = None
    risk_assessment_url: Optional[str] = None
    service_maintenance_url: Optional[str] = None
    safety_alerts_url: Optional[str] = None

# Machine Models
class Machine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    asset_id: str
    category: str
    make: str
    model: str
    serial_number: str
    year: Optional[int] = None
    status: MachineStatus = MachineStatus.AVAILABLE
    image_url: Optional[str] = None
    hours_operated: float = 0
    next_service_hours: float = 250
    last_service_date: Optional[str] = None
    notes: Optional[str] = None
    # Document URLs
    safety_guide_url: Optional[str] = None
    operators_manual_url: Optional[str] = None
    risk_assessment_url: Optional[str] = None
    service_maintenance_url: Optional[str] = None
    safety_alerts_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MachineCreate(BaseModel):
    name: str
    asset_id: str
    category: str
    make: str
    model: str
    serial_number: str
    year: Optional[int] = None
    image_url: Optional[str] = None
    hours_operated: float = 0
    next_service_hours: float = 250
    notes: Optional[str] = None
    # Document URLs
    safety_guide_url: Optional[str] = None
    operators_manual_url: Optional[str] = None
    risk_assessment_url: Optional[str] = None
    service_maintenance_url: Optional[str] = None
    safety_alerts_url: Optional[str] = None

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    status: Optional[MachineStatus] = None
    image_url: Optional[str] = None
    hours_operated: Optional[float] = None
    next_service_hours: Optional[float] = None
    notes: Optional[str] = None
    # Document URLs
    safety_guide_url: Optional[str] = None
    operators_manual_url: Optional[str] = None
    risk_assessment_url: Optional[str] = None
    service_maintenance_url: Optional[str] = None
    safety_alerts_url: Optional[str] = None

# Checklist Models
class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # e.g., "Fluids", "Safety", "Operational"
    item: str
    description: Optional[str] = None
    status: ChecklistItemStatus = ChecklistItemStatus.NA
    notes: Optional[str] = None
    photo_url: Optional[str] = None  # Required if failed

class ChecklistTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # Equipment category this applies to
    items: List[dict]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChecklistSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_id: str
    machine_name: str
    asset_id: str
    operator_name: str
    items: List[ChecklistItem]
    overall_status: str = "pending"  # pass, fail, pending
    hours_reading: Optional[float] = None
    notes: Optional[str] = None
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChecklistSubmissionCreate(BaseModel):
    machine_id: str
    operator_name: str
    items: List[ChecklistItem]
    hours_reading: Optional[float] = None
    notes: Optional[str] = None

# Maintenance Models
class MaintenanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    machine_id: str
    machine_name: str
    asset_id: str
    maintenance_type: MaintenanceType
    description: str
    performed_by: str
    hours_at_service: Optional[float] = None
    parts_replaced: Optional[List[str]] = None
    cost: Optional[float] = None
    next_service_due: Optional[str] = None
    next_service_hours: Optional[float] = None
    notes: Optional[str] = None
    completed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MaintenanceRecordCreate(BaseModel):
    machine_id: str
    maintenance_type: MaintenanceType
    description: str
    performed_by: str
    hours_at_service: Optional[float] = None
    parts_replaced: Optional[List[str]] = None
    cost: Optional[float] = None
    next_service_due: Optional[str] = None
    next_service_hours: Optional[float] = None
    notes: Optional[str] = None

# Dashboard Stats
class DashboardStats(BaseModel):
    total_machines: int
    available_machines: int
    in_maintenance: int
    due_for_service: int
    recent_checklists: int
    failed_checklists: int

# Hire Contract Models
class HireContract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    machine_id: str
    machine_name: str
    asset_id: str
    hire_start: str
    hire_end: Optional[str] = None
    status: str = "active"  # active, completed, cancelled
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HireContractCreate(BaseModel):
    contract_number: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    machine_id: str
    hire_start: str
    hire_end: Optional[str] = None
    notes: Optional[str] = None

# ============== DEFAULT CHECKLIST TEMPLATES ==============
DEFAULT_CHECKLIST_ITEMS = [
    {"category": "Pre-Start Safety", "item": "Fire extinguisher present and charged", "description": "Check gauge is in green zone"},
    {"category": "Pre-Start Safety", "item": "Seat belt functional", "description": "Check buckle and retraction"},
    {"category": "Pre-Start Safety", "item": "Warning lights and alarms working", "description": "Test horn, reverse alarm, strobe"},
    {"category": "Pre-Start Safety", "item": "ROPS/FOPS intact", "description": "Check for damage or modifications"},
    {"category": "Fluids", "item": "Engine oil level", "description": "Check dipstick between min/max"},
    {"category": "Fluids", "item": "Hydraulic fluid level", "description": "Check sight glass or dipstick"},
    {"category": "Fluids", "item": "Coolant level", "description": "Check expansion tank level"},
    {"category": "Fluids", "item": "Fuel level", "description": "Check fuel gauge or sight glass"},
    {"category": "Visual Inspection", "item": "No visible leaks", "description": "Check under machine for oil/fluid"},
    {"category": "Visual Inspection", "item": "Tyres/tracks condition", "description": "Check pressure, damage, wear"},
    {"category": "Visual Inspection", "item": "Lights and reflectors clean", "description": "Check all lights operational"},
    {"category": "Visual Inspection", "item": "No structural damage", "description": "Check for cracks, bends, welds"},
    {"category": "Operational Check", "item": "Brakes functional", "description": "Test service and park brakes"},
    {"category": "Operational Check", "item": "Steering responsive", "description": "Check for smooth operation"},
    {"category": "Operational Check", "item": "Controls operational", "description": "Test all levers and pedals"},
    {"category": "Operational Check", "item": "Gauges reading normal", "description": "Check all dashboard indicators"},
]

# ============== MACHINE ENDPOINTS ==============
@api_router.get("/")
async def root():
    return {"message": "Dry Hire Equipment Management API"}

@api_router.post("/machines", response_model=Machine)
async def create_machine(machine_data: MachineCreate):
    machine = Machine(**machine_data.model_dump())
    doc = machine.model_dump()
    await db.machines.insert_one(doc)
    return machine

@api_router.get("/machines", response_model=List[Machine])
async def get_machines(status: Optional[MachineStatus] = None, category: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    machines = await db.machines.find(query, {"_id": 0}).to_list(1000)
    return machines

@api_router.get("/machines/{machine_id}", response_model=Machine)
async def get_machine(machine_id: str):
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@api_router.put("/machines/{machine_id}", response_model=Machine)
async def update_machine(machine_id: str, update_data: MachineUpdate):
    machine = await db.machines.find_one({"id": machine_id})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.machines.update_one({"id": machine_id}, {"$set": update_dict})
    updated = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    return updated

@api_router.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str):
    result = await db.machines.delete_one({"id": machine_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {"message": "Machine deleted successfully"}

# QR Code endpoint - returns machine info for QR scanning
@api_router.get("/machines/{machine_id}/qr-info")
async def get_machine_qr_info(machine_id: str):
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Get last checklist
    last_checklist = await db.checklists.find_one(
        {"machine_id": machine_id}, 
        {"_id": 0},
        sort=[("submitted_at", -1)]
    )
    
    # Get checklist template items
    checklist_items = DEFAULT_CHECKLIST_ITEMS
    
    # Get documents
    documents = {
        "safety_guide": {"name": "General Safety Guide", "url": machine.get("safety_guide_url")},
        "operators_manual": {"name": "Operators Manual", "url": machine.get("operators_manual_url")},
        "risk_assessment": {"name": "Risk Assessment", "url": machine.get("risk_assessment_url")},
        "service_maintenance": {"name": "Service Maintenance", "url": machine.get("service_maintenance_url")},
        "safety_alerts": {"name": "Safety Alerts", "url": machine.get("safety_alerts_url")},
    }
    
    # Get active hire contract for this machine
    active_hire = await db.hire_contracts.find_one(
        {"machine_id": machine_id, "status": "active"},
        {"_id": 0}
    )
    
    return {
        "machine": machine,
        "last_checklist": last_checklist,
        "checklist_template": checklist_items,
        "documents": documents,
        "active_hire": active_hire
    }

# ============== HIRE CONTRACT ENDPOINTS ==============
@api_router.post("/hire-contracts", response_model=HireContract)
async def create_hire_contract(contract_data: HireContractCreate):
    # Get machine info
    machine = await db.machines.find_one({"id": contract_data.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Check for existing active contract
    existing = await db.hire_contracts.find_one({
        "machine_id": contract_data.machine_id,
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Machine already has an active hire contract")
    
    contract = HireContract(
        contract_number=contract_data.contract_number,
        customer_name=contract_data.customer_name,
        customer_email=contract_data.customer_email,
        customer_phone=contract_data.customer_phone,
        machine_id=contract_data.machine_id,
        machine_name=machine["name"],
        asset_id=machine["asset_id"],
        hire_start=contract_data.hire_start,
        hire_end=contract_data.hire_end,
        notes=contract_data.notes
    )
    
    doc = contract.model_dump()
    await db.hire_contracts.insert_one(doc)
    
    # Update machine status to in_use
    await db.machines.update_one(
        {"id": contract_data.machine_id},
        {"$set": {"status": MachineStatus.IN_USE, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return contract

@api_router.get("/hire-contracts", response_model=List[HireContract])
async def get_hire_contracts(
    status: Optional[str] = None,
    machine_id: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    query = {}
    if status:
        query["status"] = status
    if machine_id:
        query["machine_id"] = machine_id
    
    contracts = await db.hire_contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return contracts

@api_router.get("/hire-contracts/{contract_id}", response_model=HireContract)
async def get_hire_contract(contract_id: str):
    contract = await db.hire_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Hire contract not found")
    return contract

@api_router.get("/hire-contracts/lookup/{contract_number}")
async def lookup_hire_contract(contract_number: str):
    """Customer portal lookup by contract number"""
    contract = await db.hire_contracts.find_one({"contract_number": contract_number}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get machine details
    machine = await db.machines.find_one({"id": contract["machine_id"]}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Get documents
    documents = {
        "safety_guide": {"name": "General Safety Guide", "url": machine.get("safety_guide_url")},
        "operators_manual": {"name": "Operators Manual", "url": machine.get("operators_manual_url")},
        "risk_assessment": {"name": "Risk Assessment", "url": machine.get("risk_assessment_url")},
        "service_maintenance": {"name": "Service Maintenance", "url": machine.get("service_maintenance_url")},
        "safety_alerts": {"name": "Safety Alerts", "url": machine.get("safety_alerts_url")},
    }
    
    # Get checklists for this machine during hire period
    checklists = await db.checklists.find(
        {"machine_id": contract["machine_id"]},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(10)
    
    return {
        "contract": contract,
        "machine": machine,
        "documents": documents,
        "checklists": checklists
    }

@api_router.put("/hire-contracts/{contract_id}/complete")
async def complete_hire_contract(contract_id: str):
    contract = await db.hire_contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    await db.hire_contracts.update_one(
        {"id": contract_id},
        {"$set": {"status": "completed", "hire_end": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update machine status back to available
    await db.machines.update_one(
        {"id": contract["machine_id"]},
        {"$set": {"status": MachineStatus.AVAILABLE, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Contract completed successfully"}

# ============== CHECKLIST ENDPOINTS ==============
@api_router.get("/checklist-template")
async def get_checklist_template(category: Optional[str] = None):
    """Get default checklist items, optionally filtered by category"""
    items = DEFAULT_CHECKLIST_ITEMS
    if category:
        items = [i for i in items if i["category"] == category]
    return {"items": items}

@api_router.post("/checklists", response_model=ChecklistSubmission)
async def submit_checklist(checklist_data: ChecklistSubmissionCreate):
    # Get machine info
    machine = await db.machines.find_one({"id": checklist_data.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Determine overall status
    items = checklist_data.items
    failed_items = [i for i in items if i.status == ChecklistItemStatus.FAIL]
    overall_status = "fail" if failed_items else "pass"
    
    # Create submission
    submission = ChecklistSubmission(
        machine_id=checklist_data.machine_id,
        machine_name=machine["name"],
        asset_id=machine["asset_id"],
        operator_name=checklist_data.operator_name,
        items=items,
        overall_status=overall_status,
        hours_reading=checklist_data.hours_reading,
        notes=checklist_data.notes
    )
    
    doc = submission.model_dump()
    # Convert ChecklistItem objects to dicts
    doc["items"] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in doc["items"]]
    await db.checklists.insert_one(doc)
    
    # Update machine hours if provided
    if checklist_data.hours_reading:
        await db.machines.update_one(
            {"id": checklist_data.machine_id},
            {"$set": {"hours_operated": checklist_data.hours_reading, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # If failed, update machine status
    if overall_status == "fail":
        await db.machines.update_one(
            {"id": checklist_data.machine_id},
            {"$set": {"status": MachineStatus.OUT_OF_SERVICE, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return submission

@api_router.get("/checklists", response_model=List[ChecklistSubmission])
async def get_checklists(
    machine_id: Optional[str] = None, 
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    query = {}
    if machine_id:
        query["machine_id"] = machine_id
    if status:
        query["overall_status"] = status
    
    checklists = await db.checklists.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(limit)
    return checklists

@api_router.get("/checklists/{checklist_id}", response_model=ChecklistSubmission)
async def get_checklist(checklist_id: str):
    checklist = await db.checklists.find_one({"id": checklist_id}, {"_id": 0})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return checklist

# ============== MAINTENANCE ENDPOINTS ==============
@api_router.post("/maintenance", response_model=MaintenanceRecord)
async def create_maintenance_record(maintenance_data: MaintenanceRecordCreate):
    # Get machine info
    machine = await db.machines.find_one({"id": maintenance_data.machine_id}, {"_id": 0})
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    record = MaintenanceRecord(
        machine_id=maintenance_data.machine_id,
        machine_name=machine["name"],
        asset_id=machine["asset_id"],
        maintenance_type=maintenance_data.maintenance_type,
        description=maintenance_data.description,
        performed_by=maintenance_data.performed_by,
        hours_at_service=maintenance_data.hours_at_service,
        parts_replaced=maintenance_data.parts_replaced,
        cost=maintenance_data.cost,
        next_service_due=maintenance_data.next_service_due,
        next_service_hours=maintenance_data.next_service_hours,
        notes=maintenance_data.notes
    )
    
    doc = record.model_dump()
    await db.maintenance.insert_one(doc)
    
    # Update machine last service info
    update_data = {
        "last_service_date": record.completed_at,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if maintenance_data.next_service_hours:
        update_data["next_service_hours"] = maintenance_data.next_service_hours
    if maintenance_data.hours_at_service:
        update_data["hours_operated"] = maintenance_data.hours_at_service
    
    await db.machines.update_one({"id": maintenance_data.machine_id}, {"$set": update_data})
    
    return record

@api_router.get("/maintenance", response_model=List[MaintenanceRecord])
async def get_maintenance_records(
    machine_id: Optional[str] = None,
    maintenance_type: Optional[MaintenanceType] = None,
    limit: int = Query(default=50, le=100)
):
    query = {}
    if machine_id:
        query["machine_id"] = machine_id
    if maintenance_type:
        query["maintenance_type"] = maintenance_type
    
    records = await db.maintenance.find(query, {"_id": 0}).sort("completed_at", -1).to_list(limit)
    return records

@api_router.get("/maintenance/{record_id}", response_model=MaintenanceRecord)
async def get_maintenance_record(record_id: str):
    record = await db.maintenance.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return record

# ============== DASHBOARD ENDPOINTS ==============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total = await db.machines.count_documents({})
    available = await db.machines.count_documents({"status": MachineStatus.AVAILABLE})
    in_maintenance = await db.machines.count_documents({"status": MachineStatus.MAINTENANCE})
    
    # Count machines due for service (hours_operated >= next_service_hours)
    due_for_service = await db.machines.count_documents({
        "$expr": {"$gte": ["$hours_operated", "$next_service_hours"]}
    })
    
    # Recent checklists (last 7 days)
    from datetime import timedelta
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_checklists = await db.checklists.count_documents({
        "submitted_at": {"$gte": seven_days_ago}
    })
    
    failed_checklists = await db.checklists.count_documents({
        "submitted_at": {"$gte": seven_days_ago},
        "overall_status": "fail"
    })
    
    return DashboardStats(
        total_machines=total,
        available_machines=available,
        in_maintenance=in_maintenance,
        due_for_service=due_for_service,
        recent_checklists=recent_checklists,
        failed_checklists=failed_checklists
    )

@api_router.get("/dashboard/recent-activity")
async def get_recent_activity(limit: int = Query(default=10, le=50)):
    # Get recent checklists
    checklists = await db.checklists.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(limit)
    
    # Get recent maintenance
    maintenance = await db.maintenance.find({}, {"_id": 0}).sort("completed_at", -1).to_list(limit)
    
    return {
        "recent_checklists": checklists,
        "recent_maintenance": maintenance
    }

# Include the router in the main app
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
