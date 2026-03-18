import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getAgreements, getInquiries, getMachines } from "../lib/api";
import { Button } from "../components/ui/button";
import { 
  FileText, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  ChevronRight,
  MessageSquare
} from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  const isStaff = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agreementsData, machinesData] = await Promise.all([
          getAgreements(),
          getMachines()
        ]);
        setAgreements(agreementsData);
        setMachines(machinesData);

        if (isStaff) {
          const inquiriesData = await getInquiries();
          setInquiries(inquiriesData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isStaff]);

  // Stats calculations
  const stats = {
    total: agreements.length,
    active: agreements.filter(a => a.status === "active").length,
    pending: agreements.filter(a => ["draft", "pending_checklist", "pending_photos", "pending_signature"].includes(a.status)).length,
    completed: agreements.filter(a => a.status === "completed").length,
    newInquiries: inquiries.filter(i => i.status === "new").length,
    availableMachines: machines.filter(m => m.is_available).length,
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { class: "status-draft", label: "Draft" },
      pending_checklist: { class: "status-pending", label: "Checklist" },
      pending_photos: { class: "status-pending", label: "Photos" },
      pending_signature: { class: "status-pending", label: "Signing" },
      active: { class: "status-active", label: "Active" },
      completed: { class: "status-completed", label: "Completed" },
      cancelled: { class: "status-cancelled", label: "Cancelled" },
    };
    const badge = badges[status] || { class: "status-draft", label: status };
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            {isStaff ? "Dashboard" : `Welcome, ${user?.full_name?.split(" ")[0]}`}
          </h1>
          <p className="text-neutral-600">
            {isStaff 
              ? "Manage equipment hire agreements and inquiries"
              : "View and manage your equipment hire agreements"
            }
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-5 h-5 text-[#E63946]" />
              <span className="text-xs text-neutral-500 uppercase">Total</span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">{stats.total}</p>
            <p className="text-sm text-neutral-500">Agreements</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs text-neutral-500 uppercase">Active</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-neutral-500">In Progress</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-neutral-500 uppercase">Pending</span>
            </div>
            <p className="text-3xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-sm text-neutral-500">Awaiting Action</p>
          </div>

          {isStaff ? (
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <MessageSquare className="w-5 h-5 text-[#E63946]" />
                <span className="text-xs text-neutral-500 uppercase">New</span>
              </div>
              <p className="text-3xl font-bold text-[#E63946]">{stats.newInquiries}</p>
              <p className="text-sm text-neutral-500">Inquiries</p>
            </div>
          ) : (
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <Truck className="w-5 h-5 text-[#E63946]" />
                <span className="text-xs text-neutral-500 uppercase">Fleet</span>
              </div>
              <p className="text-3xl font-bold text-[#E63946]">{stats.availableMachines}</p>
              <p className="text-sm text-neutral-500">Available</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {isStaff && (
          <div className="flex flex-wrap gap-3 mb-8">
            <Button
              onClick={() => navigate("/agreements/new")}
              className="btn-secondary"
              data-testid="new-agreement-btn-main"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Hire Agreement
            </Button>
            <Button
              onClick={() => navigate("/inquiries")}
              variant="outline"
              className="border-neutral-300"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              View Inquiries
              {stats.newInquiries > 0 && (
                <span className="ml-2 w-5 h-5 bg-[#E63946] text-white text-xs rounded-full flex items-center justify-center">
                  {stats.newInquiries}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Recent Agreements */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">
              {isStaff ? "Recent Agreements" : "Your Agreements"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/machines")}
              className="text-[#E63946]"
            >
              View Equipment
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {agreements.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 mb-4">No agreements yet</p>
              {isStaff && (
                <Button
                  onClick={() => navigate("/agreements/new")}
                  className="btn-primary"
                >
                  Create First Agreement
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {agreements.slice(0, 5).map((agreement) => (
                <div
                  key={agreement.id}
                  onClick={() => navigate(`/agreements/${agreement.id}`)}
                  className="p-4 sm:p-6 hover:bg-neutral-50 cursor-pointer transition-colors"
                  data-testid={`agreement-row-${agreement.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm text-[#E63946] font-medium">
                          {agreement.agreement_number}
                        </span>
                        {getStatusBadge(agreement.status)}
                      </div>
                      <p className="font-medium text-neutral-900 truncate">
                        {agreement.machine_name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {isStaff && `${agreement.customer_name} • `}
                        {new Date(agreement.hire_start_date).toLocaleDateString()} - {new Date(agreement.hire_end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-lg font-bold text-neutral-900">
                        ${agreement.hire_rate}
                        <span className="text-sm font-normal text-neutral-500">/{agreement.hire_rate_type}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 ml-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
