import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
  getMachines,
  getMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog
} from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import {
  Wrench,
  Plus,
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Bell,
  Filter
} from "lucide-react";
import { toast } from "sonner";

const TYPE_CONFIG = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  unscheduled: { label: "Unscheduled", color: "bg-amber-100 text-amber-700" },
  emergency: { label: "Emergency", color: "bg-red-100 text-red-700" },
};

const EMPTY_FORM = {
  machine_id: "",
  maintenance_type: "scheduled",
  description: "",
  parts_replaced: "",
  cost: "",
  technician_name: "",
  service_date: new Date().toISOString().slice(0, 10),
  hours_at_service: "",
  next_service_due: "",
  next_service_hours: "",
  notes: ""
};

export default function MaintenancePage() {
  const [logs, setLogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMachine, filterType, showUpcoming]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, machinesData] = await Promise.all([
        getMaintenanceLogs({
          machine_id: filterMachine || undefined,
          maintenance_type: filterType || undefined,
          upcoming_service: showUpcoming || undefined
        }),
        getMachines()
      ]);
      setLogs(logsData);
      setMachines(machinesData);
    } catch {
      toast.error("Failed to load maintenance logs");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingLog(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setForm({
      machine_id: log.machine_id || "",
      maintenance_type: log.maintenance_type || "scheduled",
      description: log.description || "",
      parts_replaced: log.parts_replaced || "",
      cost: log.cost != null ? String(log.cost) : "",
      technician_name: log.technician_name || "",
      service_date: log.service_date ? log.service_date.slice(0, 10) : "",
      hours_at_service: log.hours_at_service != null ? String(log.hours_at_service) : "",
      next_service_due: log.next_service_due ? log.next_service_due.slice(0, 10) : "",
      next_service_hours: log.next_service_hours != null ? String(log.next_service_hours) : "",
      notes: log.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.machine_id || !form.description || !form.service_date) {
      toast.error("Machine, description, and service date are required.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        cost: form.cost ? parseFloat(form.cost) : null,
        hours_at_service: form.hours_at_service ? parseFloat(form.hours_at_service) : null,
        next_service_hours: form.next_service_hours ? parseFloat(form.next_service_hours) : null,
        next_service_due: form.next_service_due || null,
        parts_replaced: form.parts_replaced || null,
        technician_name: form.technician_name || null,
        notes: form.notes || null
      };
      if (editingLog) {
        await updateMaintenanceLog(editingLog.id, data);
        toast.success("Maintenance log updated");
      } else {
        await createMaintenanceLog(data);
        toast.success("Maintenance log created");
      }
      setDialogOpen(false);
      loadData();
    } catch {
      toast.error("Failed to save maintenance log");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this maintenance log?")) return;
    try {
      await deleteMaintenanceLog(id);
      toast.success("Deleted");
      loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const isUpcomingDue = (dateStr) => {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    const diff = (due - now) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Maintenance Logs</h1>
            <p className="text-neutral-500 mt-1">Track service history and upcoming maintenance</p>
          </div>
          <Button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Log
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterMachine}
            onChange={e => setFilterMachine(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="">All Machines</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Unscheduled</option>
            <option value="emergency">Emergency</option>
          </select>

          <button
            onClick={() => setShowUpcoming(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 transition-colors ${
              showUpcoming ? "bg-amber-100 border-amber-300 text-amber-700" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Bell className="w-4 h-4" />
            Upcoming Service
          </button>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#E63946]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <Wrench className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p>No maintenance logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const typeConfig = TYPE_CONFIG[log.maintenance_type] || { label: log.maintenance_type, color: "bg-neutral-100 text-neutral-600" };
              const expanded = expandedId === log.id;
              const upcomingAlert = isUpcomingDue(log.next_service_due);
              const overdueAlert = isOverdue(log.next_service_due);

              return (
                <div key={log.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div
                    className="flex items-start gap-4 p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                  >
                    <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-neutral-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        {overdueAlert && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />Overdue
                          </span>
                        )}
                        {!overdueAlert && upcomingAlert && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Bell className="w-3 h-3" />Due Soon
                          </span>
                        )}
                        <span className="text-sm font-semibold text-neutral-900 truncate">
                          {log.machine_name}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 line-clamp-1">{log.description}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {log.service_date ? new Date(log.service_date).toLocaleDateString() : "N/A"}
                        </span>
                        {log.technician_name && (
                          <span>{log.technician_name}</span>
                        )}
                        {log.cost != null && (
                          <span>${parseFloat(log.cost).toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(log); }}
                        className="p-1.5 text-neutral-400 hover:text-[#0056D2] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(log.id); }}
                        className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-neutral-100 px-4 py-3 bg-neutral-50 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {log.parts_replaced && (
                        <div>
                          <p className="text-xs text-neutral-400 mb-0.5">Parts Replaced</p>
                          <p className="text-neutral-700">{log.parts_replaced}</p>
                        </div>
                      )}
                      {log.hours_at_service != null && (
                        <div>
                          <p className="text-xs text-neutral-400 mb-0.5">Hours at Service</p>
                          <p className="text-neutral-700">{log.hours_at_service} hrs</p>
                        </div>
                      )}
                      {log.next_service_due && (
                        <div>
                          <p className="text-xs text-neutral-400 mb-0.5">Next Service Due</p>
                          <p className={`font-medium ${overdueAlert ? "text-red-600" : upcomingAlert ? "text-amber-600" : "text-neutral-700"}`}>
                            {new Date(log.next_service_due).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {log.next_service_hours != null && (
                        <div>
                          <p className="text-xs text-neutral-400 mb-0.5">Next Service Hours</p>
                          <p className="text-neutral-700">{log.next_service_hours} hrs</p>
                        </div>
                      )}
                      {log.notes && (
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-xs text-neutral-400 mb-0.5">Notes</p>
                          <p className="text-neutral-700">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLog ? "Edit Maintenance Log" : "Add Maintenance Log"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Machine *</label>
              <select
                value={form.machine_id}
                onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              >
                <option value="">Select machine</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Type *</label>
              <select
                value={form.maintenance_type}
                onChange={e => setForm(f => ({ ...f, maintenance_type: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What was done?"
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Service Date *</label>
                <input
                  type="date"
                  value={form.service_date}
                  onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Hours at Service</label>
                <input
                  type="number"
                  value={form.hours_at_service}
                  onChange={e => setForm(f => ({ ...f, hours_at_service: e.target.value }))}
                  placeholder="e.g. 1250"
                  step="0.1"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Technician</label>
                <input
                  type="text"
                  value={form.technician_name}
                  onChange={e => setForm(f => ({ ...f, technician_name: e.target.value }))}
                  placeholder="Technician name"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Cost ($)</label>
                <input
                  type="number"
                  value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Parts Replaced</label>
              <input
                type="text"
                value={form.parts_replaced}
                onChange={e => setForm(f => ({ ...f, parts_replaced: e.target.value }))}
                placeholder="List parts replaced"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Next Service Date</label>
                <input
                  type="date"
                  value={form.next_service_due}
                  onChange={e => setForm(f => ({ ...f, next_service_due: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Next Service Hours</label>
                <input
                  type="number"
                  value={form.next_service_hours}
                  onChange={e => setForm(f => ({ ...f, next_service_hours: e.target.value }))}
                  placeholder="e.g. 1500"
                  step="0.1"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingLog ? "Save Changes" : "Add Log"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
