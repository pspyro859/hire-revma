import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { 
  Wrench, 
  ClipboardCheck, 
  QrCode, 
  AlertTriangle, 
  Fuel, 
  Gauge,
  CalendarClock,
  ChevronRight,
  Check,
  X,
  Minus,
  Plus,
  Home,
  Truck,
  Menu,
  Eye,
  Printer,
  ArrowLeft,
  Settings,
  FileText,
  Download,
  Search,
  Shield,
  BookOpen,
  AlertCircle,
  FileCheck,
  Users
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Status badge component
const StatusBadge = ({ status }) => {
  const styles = {
    available: "bg-emerald-500 text-white",
    in_use: "bg-blue-500 text-white",
    maintenance: "bg-amber-500 text-black",
    out_of_service: "bg-red-500 text-white",
  };
  const labels = {
    available: "Available",
    in_use: "In Use",
    maintenance: "Maintenance",
    out_of_service: "Out of Service",
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${styles[status] || styles.available}`}>
      {labels[status] || status}
    </span>
  );
};

// Navigation Component
const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <nav className="bg-secondary text-secondary-foreground sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold tracking-wider">DRY HIRE</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 hover:text-primary transition-colors" data-testid="nav-dashboard">
              <Home className="w-4 h-4" />
              <span className="font-semibold uppercase text-sm tracking-wider">Dashboard</span>
            </Link>
            <Link to="/machines" className="flex items-center gap-2 hover:text-primary transition-colors" data-testid="nav-machines">
              <Truck className="w-4 h-4" />
              <span className="font-semibold uppercase text-sm tracking-wider">Machines</span>
            </Link>
            <Link to="/hires" className="flex items-center gap-2 hover:text-primary transition-colors" data-testid="nav-hires">
              <Users className="w-4 h-4" />
              <span className="font-semibold uppercase text-sm tracking-wider">Hires</span>
            </Link>
            <Link to="/checklists" className="flex items-center gap-2 hover:text-primary transition-colors" data-testid="nav-checklists">
              <ClipboardCheck className="w-4 h-4" />
              <span className="font-semibold uppercase text-sm tracking-wider">Checklists</span>
            </Link>
            <Link to="/maintenance" className="flex items-center gap-2 hover:text-primary transition-colors" data-testid="nav-maintenance">
              <Wrench className="w-4 h-4" />
              <span className="font-semibold uppercase text-sm tracking-wider">Maintenance</span>
            </Link>
          </div>
          
          <button 
            className="md:hidden p-2" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-secondary-foreground/20 py-4 space-y-4">
            <Link to="/" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <Link to="/machines" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Machines</Link>
            <Link to="/hires" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Hires</Link>
            <Link to="/checklists" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Checklists</Link>
            <Link to="/maintenance" className="block py-2" onClick={() => setMobileMenuOpen(false)}>Maintenance</Link>
            <Link to="/portal" className="block py-2 text-primary" onClick={() => setMobileMenuOpen(false)}>Customer Portal</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

// Dashboard Page
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/dashboard/recent-activity?limit=5`)
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Gauge className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="mt-4 font-heading text-xl">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="dashboard">
      <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">FLEET OVERVIEW</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard 
          label="Total Machines" 
          value={stats?.total_machines || 0} 
          icon={<Truck className="w-6 h-6" />}
          testId="stat-total"
        />
        <StatCard 
          label="Available" 
          value={stats?.available_machines || 0} 
          icon={<Check className="w-6 h-6" />}
          color="text-emerald-500"
          testId="stat-available"
        />
        <StatCard 
          label="In Maintenance" 
          value={stats?.in_maintenance || 0} 
          icon={<Wrench className="w-6 h-6" />}
          color="text-amber-500"
          testId="stat-maintenance"
        />
        <StatCard 
          label="Service Due" 
          value={stats?.due_for_service || 0} 
          icon={<AlertTriangle className="w-6 h-6" />}
          color="text-red-500"
          testId="stat-service-due"
        />
        <StatCard 
          label="Recent Checks" 
          value={stats?.recent_checklists || 0} 
          icon={<ClipboardCheck className="w-6 h-6" />}
          testId="stat-checks"
        />
        <StatCard 
          label="Failed Checks" 
          value={stats?.failed_checklists || 0} 
          icon={<X className="w-6 h-6" />}
          color="text-red-500"
          testId="stat-failed"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 card-accent">
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            RECENT CHECKLISTS
          </h2>
          {activity?.recent_checklists?.length > 0 ? (
            <div className="space-y-3">
              {activity.recent_checklists.map((check) => (
                <Link 
                  key={check.id} 
                  to={`/checklists/${check.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`checklist-item-${check.id}`}
                >
                  <div>
                    <p className="font-semibold">{check.machine_name}</p>
                    <p className="text-sm text-muted-foreground">{check.operator_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${check.overall_status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent checklists</p>
          )}
        </div>

        <div className="bg-card border border-border p-6 card-accent">
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            RECENT MAINTENANCE
          </h2>
          {activity?.recent_maintenance?.length > 0 ? (
            <div className="space-y-3">
              {activity.recent_maintenance.map((record) => (
                <Link 
                  key={record.id} 
                  to={`/maintenance/${record.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`maintenance-item-${record.id}`}
                >
                  <div>
                    <p className="font-semibold">{record.machine_name}</p>
                    <p className="text-sm text-muted-foreground">{record.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent maintenance</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link 
          to="/machines/new" 
          className="btn-industrial bg-primary text-primary-foreground px-6 py-3 inline-flex items-center gap-2"
          data-testid="add-machine-btn"
        >
          <Plus className="w-5 h-5" />
          ADD MACHINE
        </Link>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = "text-foreground", testId }) => (
  <div className="bg-card border border-border p-4" data-testid={testId}>
    <div className={`mb-2 ${color}`}>{icon}</div>
    <p className="font-heading text-2xl md:text-3xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);

// Machines List Page
const MachinesList = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchMachines();
  }, [filter]);

  const fetchMachines = async () => {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await axios.get(`${API}/machines${params}`);
      setMachines(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="machines-list">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">MACHINES</h1>
        <div className="flex flex-wrap gap-2">
          {["all", "available", "in_use", "maintenance", "out_of_service"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === status 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid={`filter-${status}`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <Link 
          to="/machines/new" 
          className="btn-industrial bg-primary text-primary-foreground px-6 py-3 inline-flex items-center gap-2"
          data-testid="add-machine-link"
        >
          <Plus className="w-5 h-5" />
          ADD MACHINE
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Gauge className="w-12 h-12 mx-auto animate-spin text-primary" />
        </div>
      ) : machines.length === 0 ? (
        <div className="text-center py-12 bg-muted">
          <Truck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="font-heading text-xl">NO MACHINES FOUND</p>
          <p className="text-muted-foreground mt-2">Add your first machine to get started</p>
        </div>
      ) : (
        <div className="machine-grid">
          {machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
};

const MachineCard = ({ machine }) => (
  <div className="bg-card border border-border overflow-hidden card-accent" data-testid={`machine-card-${machine.id}`}>
    <div className="aspect-video bg-muted relative overflow-hidden">
      {machine.image_url ? (
        <img src={machine.image_url} alt={machine.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary/10">
          <Truck className="w-16 h-16 text-muted-foreground" />
        </div>
      )}
      <div className="absolute top-2 right-2">
        <StatusBadge status={machine.status} />
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-heading text-xl font-bold mb-1">{machine.name}</h3>
      <p className="text-sm text-muted-foreground font-mono">{machine.asset_id}</p>
      <p className="text-sm text-muted-foreground mt-1">{machine.make} {machine.model}</p>
      
      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-1">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span>{machine.hours_operated || 0}h</span>
        </div>
        <div className="flex items-center gap-1">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          <span>Service @ {machine.next_service_hours}h</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Link 
          to={`/machines/${machine.id}`}
          className="flex-1 btn-industrial bg-secondary text-secondary-foreground px-4 py-2 text-center text-sm"
          data-testid={`view-machine-${machine.id}`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          VIEW
        </Link>
        <Link 
          to={`/checklist/${machine.id}`}
          className="flex-1 btn-industrial bg-primary text-primary-foreground px-4 py-2 text-center text-sm"
          data-testid={`checklist-machine-${machine.id}`}
        >
          <ClipboardCheck className="w-4 h-4 inline mr-2" />
          CHECK
        </Link>
      </div>
    </div>
  </div>
);

// Add/Edit Machine Page
const MachineForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: "",
    asset_id: "",
    category: "",
    make: "",
    model: "",
    serial_number: "",
    year: "",
    image_url: "",
    hours_operated: 0,
    next_service_hours: 250,
    notes: "",
    safety_guide_url: "",
    operators_manual_url: "",
    risk_assessment_url: "",
    service_maintenance_url: "",
    safety_alerts_url: ""
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      axios.get(`${API}/machines/${id}`)
        .then(res => {
          setFormData(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          navigate("/machines");
        });
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/machines/${id}`, formData);
      } else {
        await axios.post(`${API}/machines`, formData);
      }
      navigate("/machines");
    } catch (err) {
      console.error(err);
      alert("Error saving machine");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Gauge className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="machine-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      
      <h1 className="font-heading text-3xl font-bold mb-8">
        {isEdit ? "EDIT MACHINE" : "ADD NEW MACHINE"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Machine Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              placeholder="e.g., Excavator 320D"
              data-testid="input-name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Asset ID *</label>
            <input
              type="text"
              required
              value={formData.asset_id}
              onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none font-mono"
              placeholder="e.g., EXC-001"
              data-testid="input-asset-id"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-category"
            >
              <option value="">Select category</option>
              <option value="Excavator">Excavator</option>
              <option value="Loader">Loader</option>
              <option value="Dozer">Dozer</option>
              <option value="Crane">Crane</option>
              <option value="Forklift">Forklift</option>
              <option value="Compactor">Compactor</option>
              <option value="Generator">Generator</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Year</label>
            <input
              type="number"
              value={formData.year || ""}
              onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : "" })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              placeholder="e.g., 2020"
              data-testid="input-year"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Make *</label>
            <input
              type="text"
              required
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              placeholder="e.g., Caterpillar"
              data-testid="input-make"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Model *</label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              placeholder="e.g., 320D"
              data-testid="input-model"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Serial Number *</label>
          <input
            type="text"
            required
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none font-mono"
            placeholder="e.g., CAT3E20D12345"
            data-testid="input-serial"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Current Hours</label>
            <input
              type="number"
              value={formData.hours_operated}
              onChange={(e) => setFormData({ ...formData, hours_operated: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-hours"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Next Service (Hours)</label>
            <input
              type="number"
              value={formData.next_service_hours}
              onChange={(e) => setFormData({ ...formData, next_service_hours: parseFloat(e.target.value) || 250 })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-service-hours"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Image URL</label>
          <input
            type="url"
            value={formData.image_url || ""}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            placeholder="https://..."
            data-testid="input-image"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Notes</label>
          <textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none h-24 resize-none"
            placeholder="Additional notes..."
            data-testid="input-notes"
          />
        </div>

        {/* Document URLs Section */}
        <div className="border-t border-border pt-6">
          <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            MACHINE DOCUMENTS
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Add URLs to documents that will be available to customers</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">General Safety Guide URL</label>
              <input
                type="url"
                value={formData.safety_guide_url || ""}
                onChange={(e) => setFormData({ ...formData, safety_guide_url: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
                placeholder="https://..."
                data-testid="input-safety-guide"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Operators Manual URL</label>
              <input
                type="url"
                value={formData.operators_manual_url || ""}
                onChange={(e) => setFormData({ ...formData, operators_manual_url: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
                placeholder="https://..."
                data-testid="input-operators-manual"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Risk Assessment URL</label>
              <input
                type="url"
                value={formData.risk_assessment_url || ""}
                onChange={(e) => setFormData({ ...formData, risk_assessment_url: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
                placeholder="https://..."
                data-testid="input-risk-assessment"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Service Maintenance URL</label>
              <input
                type="url"
                value={formData.service_maintenance_url || ""}
                onChange={(e) => setFormData({ ...formData, service_maintenance_url: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
                placeholder="https://..."
                data-testid="input-service-maintenance"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Safety Alerts URL</label>
              <input
                type="url"
                value={formData.safety_alerts_url || ""}
                onChange={(e) => setFormData({ ...formData, safety_alerts_url: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
                placeholder="https://..."
                data-testid="input-safety-alerts"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full btn-industrial bg-primary text-primary-foreground px-6 py-4 font-bold disabled:opacity-50"
          data-testid="submit-machine"
        >
          {saving ? "SAVING..." : isEdit ? "UPDATE MACHINE" : "ADD MACHINE"}
        </button>
      </form>
    </div>
  );
};

// Machine Detail Page with QR Code
const MachineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrintQR, setShowPrintQR] = useState(false);

  const qrUrl = `${window.location.origin}/scan/${id}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machineRes, checklistsRes, maintenanceRes] = await Promise.all([
          axios.get(`${API}/machines/${id}`),
          axios.get(`${API}/checklists?machine_id=${id}&limit=10`),
          axios.get(`${API}/maintenance?machine_id=${id}&limit=10`)
        ]);
        setMachine(machineRes.data);
        setChecklists(checklistsRes.data);
        setMaintenance(maintenanceRes.data);
      } catch (e) {
        console.error(e);
        navigate("/machines");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handlePrint = () => {
    setShowPrintQR(true);
    setTimeout(() => {
      window.print();
      setShowPrintQR(false);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Gauge className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!machine) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="machine-detail">
      {/* Print-only QR section */}
      {showPrintQR && (
        <div className="print-only fixed inset-0 bg-white flex items-center justify-center">
          <div className="text-center qr-print">
            <QRCodeSVG value={qrUrl} size={300} level="H" />
            <p className="font-heading text-2xl font-bold mt-4">{machine.name}</p>
            <p className="font-mono text-xl">{machine.asset_id}</p>
            <p className="text-sm mt-2">{machine.make} {machine.model}</p>
          </div>
        </div>
      )}

      <div className="no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Machines
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Machine Info + QR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {machine.image_url ? (
                  <img src={machine.image_url} alt={machine.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                    <Truck className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={machine.status} />
                </div>
              </div>
              <div className="p-6">
                <h1 className="font-heading text-2xl font-bold">{machine.name}</h1>
                <p className="font-mono text-lg text-muted-foreground">{machine.asset_id}</p>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make/Model:</span>
                    <span className="font-semibold">{machine.make} {machine.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-mono">{machine.serial_number}</span>
                  </div>
                  {machine.year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year:</span>
                      <span>{machine.year}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours:</span>
                    <span className="font-semibold">{machine.hours_operated}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Service:</span>
                    <span className={machine.hours_operated >= machine.next_service_hours ? "text-red-500 font-bold" : ""}>
                      {machine.next_service_hours}h
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-card border border-border p-6" data-testid="qr-section">
              <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                MACHINE QR CODE
              </h3>
              <div className="qr-container mx-auto">
                <QRCodeSVG value={qrUrl} size={180} level="H" />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Scan to view machine details & start checklist
              </p>
              <button
                onClick={handlePrint}
                className="w-full btn-industrial bg-secondary text-secondary-foreground px-4 py-3 mt-4 flex items-center justify-center gap-2"
                data-testid="print-qr-btn"
              >
                <Printer className="w-4 h-4" />
                PRINT QR LABEL
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Link
                to={`/checklist/${machine.id}`}
                className="w-full btn-industrial bg-primary text-primary-foreground px-4 py-4 flex items-center justify-center gap-2"
                data-testid="start-checklist-btn"
              >
                <ClipboardCheck className="w-5 h-5" />
                START PRE-START CHECK
              </Link>
              <Link
                to={`/maintenance/new?machine_id=${machine.id}`}
                className="w-full btn-industrial bg-secondary text-secondary-foreground px-4 py-4 flex items-center justify-center gap-2"
                data-testid="add-maintenance-btn"
              >
                <Wrench className="w-5 h-5" />
                LOG MAINTENANCE
              </Link>
              <Link
                to={`/machines/${machine.id}/edit`}
                className="w-full btn-industrial bg-muted text-foreground px-4 py-3 flex items-center justify-center gap-2"
                data-testid="edit-machine-btn"
              >
                <Settings className="w-4 h-4" />
                EDIT MACHINE
              </Link>
            </div>
          </div>

          {/* Right Column - History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Checklist History */}
            <div className="bg-card border border-border p-6 card-accent">
              <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                CHECKLIST HISTORY
              </h2>
              {checklists.length > 0 ? (
                <div className="space-y-3">
                  {checklists.map((check) => (
                    <Link
                      key={check.id}
                      to={`/checklists/${check.id}`}
                      className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                      data-testid={`checklist-history-${check.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center ${check.overall_status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                          {check.overall_status === 'pass' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold">{check.operator_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(check.submitted_at).toLocaleDateString()} at {new Date(check.submitted_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {check.hours_reading && (
                          <span className="text-sm text-muted-foreground">{check.hours_reading}h</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center">No checklists completed yet</p>
              )}
            </div>

            {/* Maintenance History */}
            <div className="bg-card border border-border p-6 card-accent">
              <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                MAINTENANCE HISTORY
              </h2>
              {maintenance.length > 0 ? (
                <div className="space-y-3">
                  {maintenance.map((record) => (
                    <Link
                      key={record.id}
                      to={`/maintenance/${record.id}`}
                      className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                      data-testid={`maintenance-history-${record.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-secondary text-secondary-foreground">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{record.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.performed_by} - {new Date(record.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs uppercase ${
                          record.maintenance_type === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          record.maintenance_type === 'emergency' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {record.maintenance_type}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center">No maintenance records yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// QR Scan Landing Page (Public)
const QRScanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/machines/${id}/qr-info`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Machine not found");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center text-secondary-foreground">
          <Gauge className="w-16 h-16 mx-auto animate-spin text-primary" />
          <p className="mt-4 font-heading text-xl">LOADING MACHINE...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center text-secondary-foreground p-8">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <p className="font-heading text-2xl">{error}</p>
          <button 
            onClick={() => navigate("/")}
            className="mt-6 btn-industrial bg-primary text-primary-foreground px-6 py-3"
          >
            GO TO DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  const { machine, last_checklist, documents } = data;
  const isServiceDue = machine.hours_operated >= machine.next_service_hours;
  
  // Check if any documents exist
  const hasDocuments = documents && Object.values(documents).some(doc => doc.url);

  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground" data-testid="qr-scan-page">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Machine Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-primary mx-auto flex items-center justify-center mb-4">
            <Truck className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">{machine.name}</h1>
          <p className="font-mono text-xl text-muted-foreground">{machine.asset_id}</p>
        </div>

        {/* Status Card */}
        <div className="bg-card text-card-foreground p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-heading text-lg">STATUS</span>
            <StatusBadge status={machine.status} />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Make/Model</span>
              <span className="font-semibold">{machine.make} {machine.model}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Serial Number</span>
              <span className="font-mono text-sm">{machine.serial_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Hours</span>
              <span className="font-mono font-semibold">{machine.hours_operated}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Service Due</span>
              <span className={`font-semibold ${isServiceDue ? "text-red-500" : ""}`}>
                {machine.next_service_hours}h {isServiceDue && "(OVERDUE)"}
              </span>
            </div>
          </div>

          {isServiceDue && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-red-500">SERVICE OVERDUE - CHECK REQUIRED</span>
            </div>
          )}
        </div>

        {/* Documents Section */}
        {hasDocuments && (
          <div className="bg-card text-card-foreground p-6 mb-6" data-testid="documents-section">
            <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              DOCUMENTS
            </h3>
            <div className="space-y-2">
              {documents.safety_guide?.url && (
                <a 
                  href={documents.safety_guide.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid="doc-safety-guide"
                >
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="flex-1">General Safety Guide</span>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              {documents.operators_manual?.url && (
                <a 
                  href={documents.operators_manual.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid="doc-operators-manual"
                >
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <span className="flex-1">Operators Manual</span>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              {documents.risk_assessment?.url && (
                <a 
                  href={documents.risk_assessment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid="doc-risk-assessment"
                >
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span className="flex-1">Risk Assessment</span>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              {documents.service_maintenance?.url && (
                <a 
                  href={documents.service_maintenance.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid="doc-service-maintenance"
                >
                  <FileCheck className="w-5 h-5 text-purple-500" />
                  <span className="flex-1">Service Maintenance</span>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              {documents.safety_alerts?.url && (
                <a 
                  href={documents.safety_alerts.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                  data-testid="doc-safety-alerts"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="flex-1">Safety Alerts</span>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Last Checklist */}
        {last_checklist && (
          <div className="bg-card text-card-foreground p-6 mb-6">
            <h3 className="font-heading text-lg mb-3">LAST PRE-START CHECK</h3>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 flex items-center justify-center ${last_checklist.overall_status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                {last_checklist.overall_status === 'pass' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-semibold">{last_checklist.operator_name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(last_checklist.submitted_at).toLocaleDateString()} at {new Date(last_checklist.submitted_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Start Checklist Button */}
        <button
          onClick={() => navigate(`/checklist/${machine.id}`)}
          className="w-full btn-industrial bg-primary text-primary-foreground px-6 py-5 font-bold text-lg pulse-glow"
          data-testid="start-prestart-check-btn"
        >
          <ClipboardCheck className="w-6 h-6 inline mr-3" />
          START PRE-START CHECK
        </button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Complete the pre-start checklist before operating this machine
        </p>
        
        {/* Customer Portal Link */}
        <div className="text-center mt-8 pt-6 border-t border-secondary-foreground/20">
          <Link 
            to="/portal" 
            className="text-primary hover:underline text-sm"
            data-testid="customer-portal-link"
          >
            Looking up a hire contract? Visit Customer Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

// Checklist Form Page
const ChecklistForm = () => {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [template, setTemplate] = useState([]);
  const [items, setItems] = useState([]);
  const [operatorName, setOperatorName] = useState("");
  const [hoursReading, setHoursReading] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machineRes, templateRes] = await Promise.all([
          axios.get(`${API}/machines/${machineId}`),
          axios.get(`${API}/checklist-template`)
        ]);
        setMachine(machineRes.data);
        setTemplate(templateRes.data.items);
        setItems(templateRes.data.items.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          status: "na",
          notes: ""
        })));
        setHoursReading(machineRes.data.hours_operated.toString());
      } catch (e) {
        console.error(e);
        navigate("/machines");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [machineId, navigate]);

  const updateItemStatus = (index, status) => {
    const newItems = [...items];
    newItems[index].status = status;
    setItems(newItems);
  };

  const updateItemNotes = (index, notes) => {
    const newItems = [...items];
    newItems[index].notes = notes;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!operatorName.trim()) {
      alert("Please enter your name");
      return;
    }

    const incompleteItems = items.filter(i => i.status === "na");
    if (incompleteItems.length > 0) {
      const proceed = window.confirm(`${incompleteItems.length} items are marked as N/A. Continue anyway?`);
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/checklists`, {
        machine_id: machineId,
        operator_name: operatorName,
        items: items,
        hours_reading: hoursReading ? parseFloat(hoursReading) : null,
        notes: notes || null
      });
      navigate(`/machines/${machineId}`);
    } catch (err) {
      console.error(err);
      alert("Error submitting checklist");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Gauge className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item, index) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, index });
    return acc;
  }, {});

  const passCount = items.filter(i => i.status === "pass").length;
  const failCount = items.filter(i => i.status === "fail").length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="checklist-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 no-print">
        <ArrowLeft className="w-4 h-4" />
        Cancel
      </button>

      <div className="bg-card border border-border p-6 mb-6 card-accent">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary flex items-center justify-center">
            <ClipboardCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">PRE-START CHECKLIST</h1>
            <p className="text-muted-foreground">{machine?.name} ({machine?.asset_id})</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Operator Info */}
        <div className="bg-card border border-border p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Operator Name *</label>
              <input
                type="text"
                required
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
                placeholder="Enter your name"
                data-testid="input-operator"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Hours Reading</label>
              <input
                type="number"
                value={hoursReading}
                onChange={(e) => setHoursReading(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none font-mono"
                placeholder="Current hours"
                data-testid="input-hours-reading"
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card border border-border p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Progress: {passCount + failCount} / {items.length}</span>
            <div className="flex gap-4">
              <span className="text-emerald-500">{passCount} Pass</span>
              <span className="text-red-500">{failCount} Fail</span>
            </div>
          </div>
          <div className="h-2 bg-muted overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all" 
              style={{ width: `${(passCount / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Checklist Items by Category */}
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} className="bg-card border border-border mb-4 overflow-hidden">
            <div className="bg-secondary text-secondary-foreground px-4 py-3">
              <h3 className="font-heading font-bold uppercase tracking-wider">{category}</h3>
            </div>
            {categoryItems.map((item) => (
              <div 
                key={item.id}
                className={`checklist-item ${
                  item.status === 'pass' ? 'checklist-pass' : 
                  item.status === 'fail' ? 'checklist-fail' : 'checklist-na'
                }`}
                data-testid={`checklist-item-${item.index}`}
              >
                <div className="flex-1">
                  <p className="font-semibold">{item.item}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.status === 'fail' && (
                    <input
                      type="text"
                      placeholder="Add notes for failed item..."
                      value={item.notes || ""}
                      onChange={(e) => updateItemNotes(item.index, e.target.value)}
                      className="mt-2 w-full px-3 py-2 bg-red-50 border border-red-200 text-sm"
                      data-testid={`checklist-notes-${item.index}`}
                    />
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    type="button"
                    onClick={() => updateItemStatus(item.index, "pass")}
                    className={`w-12 h-12 flex items-center justify-center transition-colors touch-target ${
                      item.status === 'pass' ? 'bg-emerald-500 text-white' : 'bg-muted hover:bg-emerald-100'
                    }`}
                    data-testid={`btn-pass-${item.index}`}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItemStatus(item.index, "fail")}
                    className={`w-12 h-12 flex items-center justify-center transition-colors touch-target ${
                      item.status === 'fail' ? 'bg-red-500 text-white' : 'bg-muted hover:bg-red-100'
                    }`}
                    data-testid={`btn-fail-${item.index}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItemStatus(item.index, "na")}
                    className={`w-12 h-12 flex items-center justify-center transition-colors touch-target ${
                      item.status === 'na' ? 'bg-gray-400 text-white' : 'bg-muted hover:bg-gray-200'
                    }`}
                    data-testid={`btn-na-${item.index}`}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Additional Notes */}
        <div className="bg-card border border-border p-6 mb-6">
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Additional Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none h-24 resize-none"
            placeholder="Any additional comments or observations..."
            data-testid="input-additional-notes"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full btn-industrial px-6 py-5 font-bold text-lg disabled:opacity-50 ${
            failCount > 0 ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
          }`}
          data-testid="submit-checklist-btn"
        >
          {submitting ? "SUBMITTING..." : failCount > 0 ? "SUBMIT (FAILED ITEMS FOUND)" : "SUBMIT CHECKLIST"}
        </button>
      </form>
    </div>
  );
};

// Checklists List Page
const ChecklistsList = () => {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const params = filter !== "all" ? `?status=${filter}` : "";
        const res = await axios.get(`${API}/checklists${params}`);
        setChecklists(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchChecklists();
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="checklists-list">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">CHECKLISTS</h1>
        <div className="flex gap-2">
          {["all", "pass", "fail"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === status 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid={`filter-checklist-${status}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Gauge className="w-12 h-12 mx-auto animate-spin text-primary" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="text-center py-12 bg-muted">
          <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="font-heading text-xl">NO CHECKLISTS FOUND</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checklists.map((check) => (
            <Link
              key={check.id}
              to={`/checklists/${check.id}`}
              className="block bg-card border border-border p-4 hover:bg-muted/50 transition-colors card-accent"
              data-testid={`checklist-row-${check.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex items-center justify-center ${check.overall_status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                    {check.overall_status === 'pass' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-heading text-lg font-bold">{check.machine_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{check.asset_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{check.operator_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(check.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Checklist Detail Page
const ChecklistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/checklists/${id}`)
      .then(res => {
        setChecklist(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        navigate("/checklists");
      });
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Gauge className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const groupedItems = checklist.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="checklist-detail">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className={`p-6 mb-6 ${checklist.overall_status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 flex items-center justify-center">
            {checklist.overall_status === 'pass' ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase">
              {checklist.overall_status === 'pass' ? 'CHECKLIST PASSED' : 'CHECKLIST FAILED'}
            </h1>
            <p>{checklist.machine_name} ({checklist.asset_id})</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Operator:</span>
            <p className="font-semibold">{checklist.operator_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-semibold">{new Date(checklist.submitted_at).toLocaleString()}</p>
          </div>
          {checklist.hours_reading && (
            <div>
              <span className="text-muted-foreground">Hours Reading:</span>
              <p className="font-mono font-semibold">{checklist.hours_reading}h</p>
            </div>
          )}
        </div>
        {checklist.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-muted-foreground text-sm">Notes:</span>
            <p className="mt-1">{checklist.notes}</p>
          </div>
        )}
      </div>

      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="bg-card border border-border mb-4 overflow-hidden">
          <div className="bg-secondary text-secondary-foreground px-4 py-3">
            <h3 className="font-heading font-bold uppercase tracking-wider">{category}</h3>
          </div>
          {categoryItems.map((item, idx) => (
            <div 
              key={idx}
              className={`p-4 border-b border-border last:border-0 ${
                item.status === 'pass' ? 'border-l-4 border-l-emerald-500' : 
                item.status === 'fail' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{item.item}</span>
                <span className={`px-3 py-1 text-xs font-semibold uppercase ${
                  item.status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'fail' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {item.status}
                </span>
              </div>
              {item.notes && (
                <p className="text-sm text-red-600 mt-2">{item.notes}</p>
              )}
            </div>
          ))}
        </div>
      ))}

      <Link
        to={`/machines/${checklist.machine_id}`}
        className="w-full btn-industrial bg-secondary text-secondary-foreground px-6 py-4 flex items-center justify-center gap-2"
      >
        VIEW MACHINE
      </Link>
    </div>
  );
};

// Maintenance List Page
const MaintenanceList = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/maintenance`)
      .then(res => {
        setRecords(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="maintenance-list">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">MAINTENANCE</h1>
        <Link 
          to="/maintenance/new"
          className="btn-industrial bg-primary text-primary-foreground px-6 py-3 inline-flex items-center gap-2"
          data-testid="add-maintenance-link"
        >
          <Plus className="w-5 h-5" />
          LOG MAINTENANCE
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Gauge className="w-12 h-12 mx-auto animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-muted">
          <Wrench className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="font-heading text-xl">NO MAINTENANCE RECORDS</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Link
              key={record.id}
              to={`/maintenance/${record.id}`}
              className="block bg-card border border-border p-4 hover:bg-muted/50 transition-colors card-accent"
              data-testid={`maintenance-row-${record.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-secondary text-secondary-foreground">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-bold">{record.machine_name}</p>
                    <p className="text-sm text-muted-foreground">{record.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs uppercase ${
                    record.maintenance_type === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    record.maintenance_type === 'emergency' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {record.maintenance_type}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(record.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Maintenance Form Page
const MaintenanceForm = () => {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedMachineId = searchParams.get('machine_id');
  
  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({
    machine_id: preselectedMachineId || "",
    maintenance_type: "scheduled",
    description: "",
    performed_by: "",
    hours_at_service: "",
    parts_replaced: "",
    cost: "",
    next_service_due: "",
    next_service_hours: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/machines`)
      .then(res => setMachines(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        hours_at_service: formData.hours_at_service ? parseFloat(formData.hours_at_service) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_service_hours: formData.next_service_hours ? parseFloat(formData.next_service_hours) : null,
        parts_replaced: formData.parts_replaced ? formData.parts_replaced.split(',').map(p => p.trim()) : null,
        next_service_due: formData.next_service_due || null,
        notes: formData.notes || null
      };
      await axios.post(`${API}/maintenance`, payload);
      navigate(preselectedMachineId ? `/machines/${preselectedMachineId}` : "/maintenance");
    } catch (err) {
      console.error(err);
      alert("Error saving maintenance record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="maintenance-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="font-heading text-3xl font-bold mb-8">LOG MAINTENANCE</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Machine *</label>
          <select
            required
            value={formData.machine_id}
            onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            data-testid="select-machine"
          >
            <option value="">Select machine</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.asset_id})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Maintenance Type *</label>
          <select
            required
            value={formData.maintenance_type}
            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            data-testid="select-type"
          >
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Unscheduled</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Description *</label>
          <input
            type="text"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            placeholder="e.g., 250 hour service"
            data-testid="input-description"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Performed By *</label>
          <input
            type="text"
            required
            value={formData.performed_by}
            onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            placeholder="Technician name"
            data-testid="input-performed-by"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Hours at Service</label>
            <input
              type="number"
              value={formData.hours_at_service}
              onChange={(e) => setFormData({ ...formData, hours_at_service: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-service-hours"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Cost ($)</label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-cost"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Parts Replaced</label>
          <input
            type="text"
            value={formData.parts_replaced}
            onChange={(e) => setFormData({ ...formData, parts_replaced: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            placeholder="Comma-separated: Oil filter, Air filter, etc."
            data-testid="input-parts"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Next Service Due</label>
            <input
              type="date"
              value={formData.next_service_due}
              onChange={(e) => setFormData({ ...formData, next_service_due: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-next-service-date"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Next Service Hours</label>
            <input
              type="number"
              value={formData.next_service_hours}
              onChange={(e) => setFormData({ ...formData, next_service_hours: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-next-service-hours"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none h-24 resize-none"
            placeholder="Additional notes..."
            data-testid="input-maintenance-notes"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full btn-industrial bg-primary text-primary-foreground px-6 py-4 font-bold disabled:opacity-50"
          data-testid="submit-maintenance"
        >
          {saving ? "SAVING..." : "LOG MAINTENANCE"}
        </button>
      </form>
    </div>
  );
};

// Maintenance Detail Page
const MaintenanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/maintenance/${id}`)
      .then(res => {
        setRecord(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        navigate("/maintenance");
      });
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Gauge className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="maintenance-detail">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-secondary text-secondary-foreground p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary flex items-center justify-center">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">{record.description}</h1>
            <p>{record.machine_name} ({record.asset_id})</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Type</span>
            <p className={`font-semibold uppercase ${
              record.maintenance_type === 'scheduled' ? 'text-blue-600' :
              record.maintenance_type === 'emergency' ? 'text-red-600' :
              'text-amber-600'
            }`}>{record.maintenance_type}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Performed By</span>
            <p className="font-semibold">{record.performed_by}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Date</span>
            <p className="font-semibold">{new Date(record.completed_at).toLocaleString()}</p>
          </div>
          {record.hours_at_service && (
            <div>
              <span className="text-sm text-muted-foreground">Hours at Service</span>
              <p className="font-mono font-semibold">{record.hours_at_service}h</p>
            </div>
          )}
          {record.cost && (
            <div>
              <span className="text-sm text-muted-foreground">Cost</span>
              <p className="font-semibold">${record.cost.toFixed(2)}</p>
            </div>
          )}
          {record.next_service_hours && (
            <div>
              <span className="text-sm text-muted-foreground">Next Service</span>
              <p className="font-mono font-semibold">{record.next_service_hours}h</p>
            </div>
          )}
        </div>

        {record.parts_replaced && record.parts_replaced.length > 0 && (
          <div className="pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">Parts Replaced</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {record.parts_replaced.map((part, idx) => (
                <span key={idx} className="px-3 py-1 bg-muted text-sm">{part}</span>
              ))}
            </div>
          </div>
        )}

        {record.notes && (
          <div className="pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">Notes</span>
            <p className="mt-1">{record.notes}</p>
          </div>
        )}
      </div>

      <Link
        to={`/machines/${record.machine_id}`}
        className="w-full btn-industrial bg-secondary text-secondary-foreground px-6 py-4 mt-6 flex items-center justify-center gap-2"
      >
        VIEW MACHINE
      </Link>
    </div>
  );
};

// Hires List Page
const HiresList = () => {
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    const fetchHires = async () => {
      try {
        const params = filter !== "all" ? `?status=${filter}` : "";
        const res = await axios.get(`${API}/hire-contracts${params}`);
        setHires(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHires();
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="hires-list">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">HIRE CONTRACTS</h1>
        <div className="flex gap-2">
          {["all", "active", "completed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === status 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid={`filter-hire-${status}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <Link 
          to="/hires/new"
          className="btn-industrial bg-primary text-primary-foreground px-6 py-3 inline-flex items-center gap-2"
          data-testid="add-hire-link"
        >
          <Plus className="w-5 h-5" />
          NEW HIRE CONTRACT
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Gauge className="w-12 h-12 mx-auto animate-spin text-primary" />
        </div>
      ) : hires.length === 0 ? (
        <div className="text-center py-12 bg-muted">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="font-heading text-xl">NO HIRE CONTRACTS FOUND</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hires.map((hire) => (
            <div
              key={hire.id}
              className="bg-card border border-border p-4 card-accent"
              data-testid={`hire-row-${hire.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex items-center justify-center ${hire.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'} text-white`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-bold">{hire.customer_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{hire.contract_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{hire.machine_name}</p>
                  <p className="text-sm text-muted-foreground">{hire.asset_id}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="text-sm">
                  <span className="text-muted-foreground">Start:</span> {new Date(hire.hire_start).toLocaleDateString()}
                  {hire.hire_end && (
                    <span className="ml-4"><span className="text-muted-foreground">End:</span> {new Date(hire.hire_end).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/machines/${hire.machine_id}`}
                    className="btn-industrial bg-secondary text-secondary-foreground px-4 py-2 text-sm"
                  >
                    VIEW MACHINE
                  </Link>
                  {hire.status === 'active' && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Complete this hire contract?')) {
                          await axios.put(`${API}/hire-contracts/${hire.id}/complete`);
                          setHires(hires.map(h => h.id === hire.id ? { ...h, status: 'completed' } : h));
                        }
                      }}
                      className="btn-industrial bg-emerald-500 text-white px-4 py-2 text-sm"
                      data-testid={`complete-hire-${hire.id}`}
                    >
                      COMPLETE
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Hire Contract Form
const HireForm = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({
    contract_number: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    machine_id: "",
    hire_start: new Date().toISOString().split('T')[0],
    hire_end: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/machines?status=available`)
      .then(res => setMachines(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/hire-contracts`, formData);
      navigate("/hires");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error creating hire contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="hire-form">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="font-heading text-3xl font-bold mb-8">NEW HIRE CONTRACT</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Contract Number *</label>
            <input
              type="text"
              required
              value={formData.contract_number}
              onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none font-mono"
              placeholder="e.g., HC-2024-001"
              data-testid="input-contract-number"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Machine *</label>
            <select
              required
              value={formData.machine_id}
              onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="select-hire-machine"
            >
              <option value="">Select available machine</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.asset_id})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Customer Name *</label>
          <input
            type="text"
            required
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
            placeholder="Customer name"
            data-testid="input-customer-name"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Customer Email</label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              placeholder="email@example.com"
              data-testid="input-customer-email"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Customer Phone</label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              placeholder="Phone number"
              data-testid="input-customer-phone"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Hire Start Date *</label>
            <input
              type="date"
              required
              value={formData.hire_start}
              onChange={(e) => setFormData({ ...formData, hire_start: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-hire-start"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Expected End Date</label>
            <input
              type="date"
              value={formData.hire_end}
              onChange={(e) => setFormData({ ...formData, hire_end: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none"
              data-testid="input-hire-end"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-input focus:border-primary outline-none h-24 resize-none"
            placeholder="Additional notes..."
            data-testid="input-hire-notes"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full btn-industrial bg-primary text-primary-foreground px-6 py-4 font-bold disabled:opacity-50"
          data-testid="submit-hire"
        >
          {saving ? "CREATING..." : "CREATE HIRE CONTRACT"}
        </button>
      </form>
    </div>
  );
};

// Customer Portal - Contract Lookup
const CustomerPortal = () => {
  const [contractNumber, setContractNumber] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!contractNumber.trim()) return;
    
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      const res = await axios.get(`${API}/hire-contracts/lookup/${contractNumber.trim()}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? "Contract not found. Please check the contract number." : "Error looking up contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary" data-testid="customer-portal">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 text-secondary-foreground">
          <div className="w-20 h-20 bg-primary mx-auto flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">CUSTOMER PORTAL</h1>
          <p className="text-muted-foreground mt-2">Enter your contract number to access hire documents</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-card text-card-foreground p-6 mb-6">
          <label className="block text-sm font-semibold uppercase tracking-wider mb-2">Contract Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="flex-1 px-4 py-3 bg-background border border-input focus:border-primary outline-none font-mono"
              placeholder="e.g., HC-2024-001"
              data-testid="input-lookup-contract"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-industrial bg-primary text-primary-foreground px-6 py-3 disabled:opacity-50"
              data-testid="btn-lookup"
            >
              {loading ? "..." : "SEARCH"}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-500/20 border border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-500">{error}</span>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="bg-card text-card-foreground p-6 card-accent">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 flex items-center justify-center ${data.contract.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'} text-white`}>
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-heading text-xl font-bold">{data.contract.contract_number}</p>
                  <p className="text-sm text-muted-foreground uppercase">{data.contract.status}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <p className="font-semibold">{data.contract.customer_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hire Start</span>
                  <p className="font-semibold">{new Date(data.contract.hire_start).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Machine Info */}
            <div className="bg-card text-card-foreground p-6 card-accent">
              <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                MACHINE DETAILS
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Machine</span>
                  <p className="font-semibold">{data.machine.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Asset ID</span>
                  <p className="font-mono">{data.machine.asset_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Make/Model</span>
                  <p className="font-semibold">{data.machine.make} {data.machine.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Serial Number</span>
                  <p className="font-mono text-sm">{data.machine.serial_number}</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            {Object.values(data.documents).some(doc => doc.url) && (
              <div className="bg-card text-card-foreground p-6 card-accent" data-testid="portal-documents">
                <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  DOCUMENTS
                </h3>
                <div className="space-y-2">
                  {data.documents.safety_guide?.url && (
                    <a 
                      href={data.documents.safety_guide.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Shield className="w-5 h-5 text-blue-500" />
                      <span className="flex-1">General Safety Guide</span>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {data.documents.operators_manual?.url && (
                    <a 
                      href={data.documents.operators_manual.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <BookOpen className="w-5 h-5 text-emerald-500" />
                      <span className="flex-1">Operators Manual</span>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {data.documents.risk_assessment?.url && (
                    <a 
                      href={data.documents.risk_assessment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <span className="flex-1">Risk Assessment</span>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {data.documents.service_maintenance?.url && (
                    <a 
                      href={data.documents.service_maintenance.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <FileCheck className="w-5 h-5 text-purple-500" />
                      <span className="flex-1">Service Maintenance</span>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {data.documents.safety_alerts?.url && (
                    <a 
                      href={data.documents.safety_alerts.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="flex-1">Safety Alerts</span>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Pre-start Checklist Link */}
            <Link
              to={`/scan/${data.machine.id}`}
              className="block w-full btn-industrial bg-primary text-primary-foreground px-6 py-5 text-center font-bold text-lg"
              data-testid="portal-checklist-link"
            >
              <ClipboardCheck className="w-6 h-6 inline mr-3" />
              VIEW MACHINE & START PRE-START CHECK
            </Link>

            {/* Recent Checklists */}
            {data.checklists && data.checklists.length > 0 && (
              <div className="bg-card text-card-foreground p-6 card-accent">
                <h3 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  RECENT CHECKLISTS
                </h3>
                <div className="space-y-2">
                  {data.checklists.map((check) => (
                    <div 
                      key={check.id}
                      className="flex items-center justify-between p-3 bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center ${check.overall_status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                          {check.overall_status === 'pass' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{check.operator_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(check.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs uppercase ${check.overall_status === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {check.overall_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/machines" element={<MachinesList />} />
          <Route path="/machines/new" element={<MachineForm />} />
          <Route path="/machines/:id" element={<MachineDetail />} />
          <Route path="/machines/:id/edit" element={<MachineForm />} />
          <Route path="/hires" element={<HiresList />} />
          <Route path="/hires/new" element={<HireForm />} />
          <Route path="/scan/:id" element={<QRScanPage />} />
          <Route path="/checklist/:machineId" element={<ChecklistForm />} />
          <Route path="/checklists" element={<ChecklistsList />} />
          <Route path="/checklists/:id" element={<ChecklistDetail />} />
          <Route path="/maintenance" element={<MaintenanceList />} />
          <Route path="/maintenance/new" element={<MaintenanceForm />} />
          <Route path="/maintenance/:id" element={<MaintenanceDetail />} />
          <Route path="/portal" element={<CustomerPortal />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
