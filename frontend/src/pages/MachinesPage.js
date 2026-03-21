import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
  getMachines,
  getMachineDocuments,
  createMachineDocument,
  updateMachineDocument,
  deleteMachineDocument,
  getMachineQRUrl
} from "../lib/api";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import {
  Truck,
  Search,
  ChevronRight,
  Fuel,
  Gauge,
  ShieldCheck,
  QrCode,
  FileText,
  Plus,
  Wrench,
  Trash2,
  Edit2,
  Loader2,
  BookOpen,
  AlertTriangle,
  Bell
} from "lucide-react";
import { toast } from "sonner";

const DOC_TYPE_OPTIONS = [
  { value: "general_safety_guide", label: "General Safety Guide" },
  { value: "operators_manual", label: "Operator's Manual" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "service_maintenance", label: "Service & Maintenance" },
  { value: "safety_alerts", label: "Safety Alerts" },
];

export default function MachinesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Docs panel
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsMachine, setDocsMachine] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docForm, setDocForm] = useState({ doc_type: "general_safety_guide", title: "", url: "" });
  const [editingDoc, setEditingDoc] = useState(null);
  const [savingDoc, setSavingDoc] = useState(false);

  // QR preview
  const [qrMachineId, setQrMachineId] = useState(null);

  const isStaff = user?.role === "staff" || user?.role === "admin";

  const categories = [
    { id: "all", label: "All Equipment" },
    { id: "excavator", label: "Excavators" },
    { id: "tipper", label: "Tippers" },
    { id: "trailer", label: "Trailers" },
    { id: "vac", label: "Vac Trailers" },
  ];

  useEffect(() => {
    getMachines()
      .then(data => { setMachines(data); setFilteredMachines(data); })
      .catch(() => toast.error("Failed to load machines"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = machines;
    if (activeCategory !== "all") result = result.filter(m => m.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.make || "").toLowerCase().includes(q) ||
        (m.model || "").toLowerCase().includes(q)
      );
    }
    setFilteredMachines(result);
  }, [activeCategory, searchQuery, machines]);

  const handleHireClick = (machine) => {
    if (isStaff) {
      navigate("/agreements/new", { state: { selectedMachine: machine } });
    } else {
      navigate("/inquiry", { state: { selectedMachine: machine } });
    }
  };

  // ─── Document Management ──────────────────────────────────────────────────
  const openDocs = async (machine) => {
    setDocsMachine(machine);
    setDocsOpen(true);
    setEditingDoc(null);
    setDocForm({ doc_type: "general_safety_guide", title: "", url: "" });
    setDocsLoading(true);
    try {
      const d = await getMachineDocuments(machine.id);
      setDocs(d);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  };

  const handleSaveDoc = async () => {
    if (!docForm.url.trim()) { toast.error("URL is required"); return; }
    setSavingDoc(true);
    try {
      if (editingDoc) {
        await updateMachineDocument(docsMachine.id, editingDoc.id, { title: docForm.title, url: docForm.url });
        toast.success("Document updated");
      } else {
        await createMachineDocument(docsMachine.id, docForm);
        toast.success("Document added");
      }
      const d = await getMachineDocuments(docsMachine.id);
      setDocs(d);
      setEditingDoc(null);
      setDocForm({ doc_type: "general_safety_guide", title: "", url: "" });
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await deleteMachineDocument(docsMachine.id, docId);
      toast.success("Document deleted");
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner border-[#E63946] border-t-transparent w-8 h-8"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Equipment Fleet</h1>
          <p className="text-neutral-600">Browse our range of fully insured, well-maintained hire equipment</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-12 border border-neutral-300 rounded-lg focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-tab ${activeCategory === cat.id ? "active" : ""}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-neutral-500 mb-6">
          Showing {filteredMachines.length} of {machines.length} machines
        </p>

        {/* Machine Grid */}
        {filteredMachines.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No equipment found matching your criteria</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMachines.map((machine) => (
              <div key={machine.id} className="card-machine group">
                {/* Image */}
                <div className="aspect-[4/3] bg-neutral-100 overflow-hidden relative">
                  <img
                    src={machine.image_url}
                    alt={machine.name}
                    className="w-full h-full object-cover machine-image"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      machine.is_available ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    }`}>
                      {machine.is_available ? "Available" : "Hired Out"}
                    </span>
                  </div>
                  {machine.qr_code_id && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded bg-black/50 text-white text-xs font-mono">
                        {machine.qr_code_id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#E63946] uppercase tracking-wider bg-[#E63946]/10 px-2 py-0.5 rounded">
                      {machine.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900 mb-1">{machine.name}</h3>
                  <p className="text-sm text-neutral-500 mb-1">{machine.make} {machine.model}</p>
                  {machine.year && <p className="text-xs text-neutral-400 mb-3">{machine.year}</p>}

                  <p className="text-sm text-neutral-600 line-clamp-2 mb-4">{machine.description}</p>

                  {/* Specs */}
                  <div className="flex flex-wrap gap-3 mb-4 text-xs text-neutral-500">
                    {machine.specifications?.gvm && (
                      <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" />{machine.specifications.gvm}</span>
                    )}
                    {machine.specifications?.operating_weight && (
                      <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" />{machine.specifications.operating_weight}</span>
                    )}
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Fully Insured</span>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-neutral-100 pt-4">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-[#E63946]">${machine.daily_rate}</span>
                        <span className="text-neutral-500">/day</span>
                      </div>
                      <div className="text-right text-sm text-neutral-500">
                        <p>${machine.weekly_rate}/week</p>
                        <p>${machine.monthly_rate}/month</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleHireClick(machine)}
                      disabled={!machine.is_available}
                      className={`w-full mb-3 ${machine.is_available ? "btn-primary" : "bg-neutral-300 cursor-not-allowed"}`}
                    >
                      {machine.is_available ? (
                        <>{isStaff ? "Create Agreement" : "Enquire Now"}<ChevronRight className="w-4 h-4 ml-1" /></>
                      ) : (
                        "Currently Unavailable"
                      )}
                    </Button>

                    {/* Staff actions */}
                    {isStaff && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDocs(machine)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                          title="Manage documents"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Docs
                        </button>
                        <a
                          href={getMachineQRUrl(machine.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                          title="View QR code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR
                        </a>
                        <button
                          onClick={() => navigate(`/maintenance?machine=${machine.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                          title="View maintenance logs"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          Service
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Management Dialog */}
      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documents — {docsMachine?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Existing docs */}
            {docsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : docs.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">No documents added yet</p>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => {
                  const typeLabel = DOC_TYPE_OPTIONS.find(o => o.value === doc.doc_type)?.label || doc.doc_type;
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                      <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{doc.title || typeLabel}</p>
                        <p className="text-xs text-neutral-400">{typeLabel}</p>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 truncate block">{doc.url}</a>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingDoc(doc); setDocForm({ doc_type: doc.doc_type, title: doc.title || "", url: doc.url }); }}
                          className="p-1.5 text-neutral-400 hover:text-[#0056D2] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add/Edit form */}
            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                {editingDoc ? "Edit Document" : "Add Document"}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Document Type</label>
                  <select
                    value={docForm.doc_type}
                    onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value }))}
                    disabled={!!editingDoc}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm disabled:bg-neutral-100"
                  >
                    {DOC_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={docForm.title}
                    onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Custom title"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">URL *</label>
                  <input
                    type="url"
                    value={docForm.url}
                    onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  {editingDoc && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setEditingDoc(null); setDocForm({ doc_type: "general_safety_guide", title: "", url: "" }); }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={`${editingDoc ? "flex-1" : "w-full"} btn-primary flex items-center justify-center gap-1.5`}
                    onClick={handleSaveDoc}
                    disabled={savingDoc}
                  >
                    {savingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingDoc ? "Save Changes" : "Add Document"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
