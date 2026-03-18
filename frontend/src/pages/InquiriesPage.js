import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getInquiries, updateInquiryStatus, getMachines } from "../lib/api";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Truck,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock
} from "lucide-react";

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inquiriesData, machinesData] = await Promise.all([
          getInquiries(),
          getMachines()
        ]);
        setInquiries(inquiriesData);
        setMachines(machinesData);
      } catch (error) {
        console.error("Error fetching inquiries:", error);
        toast.error("Failed to load inquiries");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      await updateInquiryStatus(inquiryId, newStatus);
      setInquiries(inquiries.map(i => 
        i.id === inquiryId ? { ...i, status: newStatus } : i
      ));
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredInquiries = filter === "all" 
    ? inquiries 
    : inquiries.filter(i => i.status === filter);

  const getStatusBadge = (status) => {
    const badges = {
      new: { class: "bg-blue-100 text-blue-800", label: "New", icon: Clock },
      contacted: { class: "bg-amber-100 text-amber-800", label: "Contacted", icon: Phone },
      converted: { class: "bg-green-100 text-green-800", label: "Converted", icon: Check },
      declined: { class: "bg-red-100 text-red-800", label: "Declined", icon: X },
    };
    const badge = badges[status] || badges.new;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getMachineNames = (equipment) => {
    return equipment.map(eq => {
      const machine = machines.find(m => m.name.toLowerCase().includes(eq.toLowerCase()));
      return machine?.name || eq;
    });
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Hire Inquiries</h1>
            <p className="text-neutral-600">
              Manage incoming equipment hire requests
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">Filter:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" data-testid="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inquiries</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "New", count: inquiries.filter(i => i.status === "new").length, color: "text-blue-600" },
            { label: "Contacted", count: inquiries.filter(i => i.status === "contacted").length, color: "text-amber-600" },
            { label: "Converted", count: inquiries.filter(i => i.status === "converted").length, color: "text-green-600" },
            { label: "Total", count: inquiries.length, color: "text-neutral-900" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Inquiries List */}
        {filteredInquiries.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No inquiries found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
                data-testid={`inquiry-${inquiry.id}`}
              >
                {/* Header */}
                <div
                  className="p-4 sm:p-6 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === inquiry.id ? null : inquiry.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-neutral-900">
                          {inquiry.first_name} {inquiry.last_name}
                        </p>
                        {getStatusBadge(inquiry.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {inquiry.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {inquiry.phone}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {inquiry.equipment.map((eq, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#E63946]/10 text-[#E63946] rounded text-xs font-medium">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500 hidden sm:block">
                        {new Date(inquiry.created_at).toLocaleDateString()}
                      </span>
                      {expandedId === inquiry.id ? (
                        <ChevronUp className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === inquiry.id && (
                  <div className="px-4 sm:px-6 pb-6 border-t border-neutral-100 pt-4 animate-fade-in">
                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Details */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Hire Period</p>
                          <p className="text-neutral-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-neutral-400" />
                            {new Date(inquiry.hire_start_date).toLocaleDateString()} - {new Date(inquiry.hire_end_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-neutral-600 capitalize mt-1">
                            Preferred Rate: {inquiry.hire_rate_preference}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Delivery</p>
                          <p className="text-neutral-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-neutral-400" />
                            <span className="capitalize">{inquiry.delivery_method}</span>
                          </p>
                          {inquiry.delivery_address && (
                            <p className="text-sm text-neutral-600 mt-1">{inquiry.delivery_address}</p>
                          )}
                        </div>

                        {inquiry.is_business && (
                          <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Business</p>
                            <p className="text-neutral-900">{inquiry.company_name}</p>
                            <p className="text-sm text-neutral-600">ABN: {inquiry.abn}</p>
                          </div>
                        )}
                      </div>

                      {/* Job Description */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Job Description</p>
                          <p className="text-neutral-700 text-sm">{inquiry.job_description}</p>
                        </div>

                        {inquiry.additional_notes && (
                          <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Additional Notes</p>
                            <p className="text-neutral-700 text-sm">{inquiry.additional_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-neutral-100">
                      <span className="text-sm text-neutral-500">Update Status:</span>
                      <div className="flex flex-wrap gap-2">
                        {["new", "contacted", "converted", "declined"].map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={inquiry.status === status ? "default" : "outline"}
                            onClick={() => handleStatusChange(inquiry.id, status)}
                            className={inquiry.status === status ? "bg-[#E63946]" : ""}
                            data-testid={`status-btn-${status}`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        ))}
                      </div>

                      <div className="ml-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `mailto:${inquiry.email}`}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `tel:${inquiry.phone}`}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
