import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getQuotes, sendQuote } from "../lib/api";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import {
  Plus,
  Send,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  Phone,
  Calendar,
  DollarSign
} from "lucide-react";

const statusConfig = {
  draft: { label: "Draft", color: "bg-neutral-500", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-500", icon: Send },
  accepted: { label: "Accepted", color: "bg-green-500", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-red-500", icon: XCircle },
  expired: { label: "Expired", color: "bg-orange-500", icon: Clock },
};

export default function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState({});

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load quotes");
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (quoteId, e) => {
    e.stopPropagation();
    setSending(prev => ({ ...prev, [quoteId]: true }));
    
    try {
      await sendQuote(quoteId);
      toast.success("Quote sent to customer!");
      fetchQuotes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send quote");
    } finally {
      setSending(prev => ({ ...prev, [quoteId]: false }));
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    if (filter === "all") return true;
    return quote.status === filter;
  });

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Quotes</h1>
            <p className="text-neutral-600">Manage customer quotes and hire agreements</p>
          </div>
          <Button
            onClick={() => navigate("/quotes/new")}
            className="btn-primary"
            data-testid="create-quote-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Quote
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500">Total Quotes</p>
            <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500">Draft</p>
            <p className="text-2xl font-bold text-neutral-500">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500">Sent</p>
            <p className="text-2xl font-bold text-blue-500">{stats.sent}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
            <p className="text-sm text-neutral-500">Accepted</p>
            <p className="text-2xl font-bold text-green-500">{stats.accepted}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["all", "draft", "sent", "accepted", "declined"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? "bg-[#E63946] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Quotes List */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No quotes found</h3>
            <p className="text-neutral-500 mb-6">
              {filter === "all" 
                ? "Create your first quote to get started"
                : `No ${filter} quotes at the moment`
              }
            </p>
            {filter === "all" && (
              <Button onClick={() => navigate("/quotes/new")} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Quote
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((quote) => {
              const config = statusConfig[quote.status] || statusConfig.draft;
              const StatusIcon = config.icon;

              return (
                <div
                  key={quote.id}
                  className="bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                  data-testid={`quote-card-${quote.id}`}
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Quote Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                          <span className="text-sm text-neutral-500">#{quote.quote_number}</span>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">
                          {quote.customer_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {quote.customer_email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {quote.customer_phone}
                          </span>
                        </div>
                      </div>

                      {/* Equipment & Pricing */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="text-sm">
                          <p className="text-neutral-500">Equipment</p>
                          <p className="font-medium text-neutral-900">
                            {quote.line_items?.map(i => i.machine_name).join(", ") || "-"}
                          </p>
                        </div>
                        <div className="text-sm">
                          <p className="text-neutral-500">Hire Period</p>
                          <p className="font-medium text-neutral-900 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {quote.hire_start_date} → {quote.hire_end_date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-neutral-500 text-sm">Total</p>
                          <p className="text-xl font-bold text-[#E63946] flex items-center">
                            <DollarSign className="w-5 h-5" />
                            {quote.total?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ID Status */}
                    {quote.status === "sent" && (
                      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`flex items-center gap-1 ${quote.id_verified ? 'text-green-500' : 'text-orange-500'}`}>
                            {quote.id_verified ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            {quote.id_verified ? "ID Verified" : "Awaiting ID"}
                          </span>
                          <span className={`flex items-center gap-1 ${quote.customer_signature ? 'text-green-500' : 'text-orange-500'}`}>
                            {quote.customer_signature ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            {quote.customer_signature ? "Signed" : "Awaiting Signature"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions for Draft */}
                    {quote.status === "draft" && (
                      <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/quotes/${quote.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#E63946] hover:bg-[#c62836] text-white"
                          onClick={(e) => handleSendQuote(quote.id, e)}
                          disabled={sending[quote.id]}
                        >
                          {sending[quote.id] ? (
                            <span className="spinner w-4 h-4"></span>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              Send to Customer
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
