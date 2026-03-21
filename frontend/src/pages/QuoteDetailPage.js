import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  MapPin,
  Shield,
  ExternalLink,
  Copy
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

const statusConfig = {
  draft: { label: "Draft", color: "bg-neutral-500", textColor: "text-neutral-700", bgColor: "bg-neutral-100" },
  sent: { label: "Sent", color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
  accepted: { label: "Accepted", color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
  declined: { label: "Declined", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
  expired: { label: "Expired", color: "bg-orange-500", textColor: "text-orange-700", bgColor: "bg-orange-50" },
};

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const fetchQuote = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/quotes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch quote");
      const data = await response.json();
      setQuote(data);
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast.error("Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async () => {
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/quotes/${id}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to send");
      toast.success("Quote sent to customer!");
      fetchQuote();
    } catch (error) {
      toast.error("Failed to send quote");
    } finally {
      setSending(false);
    }
  };

  const copyCustomerLink = () => {
    if (!quote?.access_token) return;
    const url = `${window.location.origin}/quote/${quote.id}?token=${quote.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Customer link copied!");
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

  if (!quote) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Quote not found</h2>
          <Button onClick={() => navigate("/quotes")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        </div>
      </Layout>
    );
  }

  const config = statusConfig[quote.status] || statusConfig.draft;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/quotes")}
          className="mb-6 text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
        </Button>

        {/* Header */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-neutral-900">
                  Quote #{quote.quote_number}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-neutral-500 text-sm">
                Created: {new Date(quote.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                {quote.valid_until && ` • Valid until: ${new Date(quote.valid_until).toLocaleDateString("en-AU")}`}
              </p>
            </div>

            <div className="flex gap-2">
              {quote.status === "draft" && (
                <Button
                  className="bg-[#E63946] hover:bg-[#c62836] text-white"
                  onClick={handleSendQuote}
                  disabled={sending}
                >
                  {sending ? (
                    <span className="spinner w-4 h-4"></span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send to Customer
                    </>
                  )}
                </Button>
              )}
              {quote.access_token && (
                <Button variant="outline" onClick={copyCustomerLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Customer</h2>
              <div className="space-y-3">
                <p className="text-neutral-900 font-medium text-lg">{quote.customer_name}</p>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                  <a href={`mailto:${quote.customer_email}`} className="flex items-center gap-2 hover:text-[#E63946] transition-colors">
                    <Mail className="w-4 h-4" />
                    {quote.customer_email}
                  </a>
                  <a href={`tel:${quote.customer_phone}`} className="flex items-center gap-2 hover:text-[#E63946] transition-colors">
                    <Phone className="w-4 h-4" />
                    {quote.customer_phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Equipment & Pricing</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-2 text-neutral-500 font-medium">Equipment</th>
                      <th className="text-center py-3 px-2 text-neutral-500 font-medium">Rate</th>
                      <th className="text-center py-3 px-2 text-neutral-500 font-medium">Qty</th>
                      <th className="text-right py-3 px-2 text-neutral-500 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quote.line_items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-neutral-100">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#E63946]" />
                            <span className="font-medium text-neutral-900">{item.machine_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-neutral-600">
                          ${parseFloat(item.rate || 0).toFixed(2)}/{item.rate_type}
                        </td>
                        <td className="py-3 px-2 text-center text-neutral-600">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-neutral-900">
                          ${parseFloat(item.subtotal || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-200">
                      <td colSpan="3" className="py-2 px-2 text-right text-neutral-500">Subtotal</td>
                      <td className="py-2 px-2 text-right font-medium">${parseFloat(quote.subtotal || 0).toFixed(2)}</td>
                    </tr>
                    {parseFloat(quote.delivery_fee || 0) > 0 && (
                      <tr>
                        <td colSpan="3" className="py-2 px-2 text-right text-neutral-500">Delivery Fee</td>
                        <td className="py-2 px-2 text-right font-medium">${parseFloat(quote.delivery_fee).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="3" className="py-2 px-2 text-right text-neutral-500">Security Bond (refundable)</td>
                      <td className="py-2 px-2 text-right font-medium">${parseFloat(quote.security_bond || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="border-t-2 border-neutral-300">
                      <td colSpan="3" className="py-3 px-2 text-right font-bold text-neutral-900 text-base">TOTAL</td>
                      <td className="py-3 px-2 text-right font-bold text-[#E63946] text-lg">${parseFloat(quote.total || 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {quote.notes && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-sm text-neutral-500 mb-1">Notes</p>
                  <p className="text-neutral-700">{quote.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hire Details */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h3 className="font-bold text-neutral-900 mb-4">Hire Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-neutral-500">Hire Period</p>
                    <p className="text-neutral-900 font-medium">
                      {quote.hire_start_date ? new Date(quote.hire_start_date).toLocaleDateString("en-AU") : "-"}
                      {" → "}
                      {quote.hire_end_date ? new Date(quote.hire_end_date).toLocaleDateString("en-AU") : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-neutral-500">Delivery</p>
                    <p className="text-neutral-900 font-medium capitalize">{quote.delivery_method || "-"}</p>
                    {quote.delivery_address && (
                      <p className="text-neutral-600">{quote.delivery_address}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ID Verification Status */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h3 className="font-bold text-neutral-900 mb-4">Verification</h3>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 text-sm ${quote.id_verified ? "text-green-600" : "text-orange-500"}`}>
                  {quote.id_verified ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  <span className="font-medium">{quote.id_verified ? "ID Verified (100+ pts)" : "Awaiting ID Documents"}</span>
                </div>
                {(quote.id_documents || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    {quote.id_documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-neutral-50 rounded-lg px-3 py-2">
                        <span className="capitalize text-neutral-700">{doc.doc_type?.replace(/_/g, " ")}</span>
                        <span className="text-neutral-500">{doc.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`flex items-center gap-2 text-sm ${quote.customer_signature ? "text-green-600" : "text-orange-500"}`}>
                  {quote.customer_signature ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  <span className="font-medium">{quote.customer_signature ? "Signed" : "Awaiting Signature"}</span>
                </div>
                {quote.signed_at && (
                  <p className="text-xs text-neutral-500">
                    Signed: {new Date(quote.signed_at).toLocaleString("en-AU")}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h3 className="font-bold text-neutral-900 mb-4">Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.location.href = `mailto:${quote.customer_email}`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Customer
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.location.href = `tel:${quote.customer_phone}`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Customer
                </Button>
                {quote.access_token && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`/quote/${quote.id}?token=${quote.access_token}`, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Customer View
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
