import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicMachine, getMachineQRUrl } from "../lib/api";
import {
  FileText,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  Wrench,
  Bell,
  ChevronRight,
  Gauge,
  Calendar,
  Hash,
  Clock,
  Loader2,
  AlertCircle,
  QrCode
} from "lucide-react";
import { Button } from "../components/ui/button";

const DOC_TYPE_CONFIG = {
  general_safety_guide: { label: "General Safety Guide", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
  operators_manual: { label: "Operator's Manual", icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
  risk_assessment: { label: "Risk Assessment", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  service_maintenance: { label: "Service & Maintenance", icon: Wrench, color: "text-purple-600", bg: "bg-purple-50" },
  safety_alerts: { label: "Safety Alerts", icon: Bell, color: "text-red-600", bg: "bg-red-50" },
};

export default function PublicMachinePage() {
  const { qrCodeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMachine = async () => {
      try {
        const result = await getPublicMachine(qrCodeId);
        setData(result);
      } catch (err) {
        setError("Machine not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchMachine();
  }, [qrCodeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#E63946]" />
          <p>Loading machine info...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Machine Not Found</h2>
          <p className="text-neutral-500">{error || "This QR code doesn't match any machine."}</p>
        </div>
      </div>
    );
  }

  const { machine, documents, prestart_template } = data;
  const specs = machine.specifications || {};

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <img
            src="https://www.revma.com.au/assets/images/revma-logo.jpg"
            alt="Revma Logo"
            className="h-8 w-auto"
          />
          {machine.qr_code_id && (
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <QrCode className="w-3.5 h-3.5" />
              <span>{machine.qr_code_id}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto pb-32">
        {/* Machine Image */}
        {machine.image_url && (
          <div className="aspect-[16/9] overflow-hidden bg-neutral-200">
            <img
              src={machine.image_url}
              alt={machine.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="px-4 py-5 space-y-5">
          {/* Machine Header */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{machine.name}</h1>
              <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                machine.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {machine.is_available ? "Available" : "Hired Out"}
              </span>
            </div>
            <p className="text-neutral-500">{machine.make} {machine.model}</p>
            {machine.category && (
              <span className="inline-block mt-2 text-xs font-medium text-[#E63946] uppercase tracking-wider bg-[#E63946]/10 px-2 py-0.5 rounded">
                {machine.category}
              </span>
            )}
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-3">
            {machine.serial_number && (
              <div className="bg-white rounded-xl p-3 border border-neutral-100">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Hash className="w-4 h-4" />
                  <span className="text-xs">Serial Number</span>
                </div>
                <p className="font-semibold text-neutral-900 text-sm">{machine.serial_number}</p>
              </div>
            )}
            {machine.year && (
              <div className="bg-white rounded-xl p-3 border border-neutral-100">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Year</span>
                </div>
                <p className="font-semibold text-neutral-900 text-sm">{machine.year}</p>
              </div>
            )}
            {machine.hours_reading != null && (
              <div className="bg-white rounded-xl p-3 border border-neutral-100">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Hours</span>
                </div>
                <p className="font-semibold text-neutral-900 text-sm">{machine.hours_reading} hrs</p>
              </div>
            )}
            {machine.registration && (
              <div className="bg-white rounded-xl p-3 border border-neutral-100">
                <div className="flex items-center gap-2 text-neutral-400 mb-1">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs">Registration</span>
                </div>
                <p className="font-semibold text-neutral-900 text-sm">{machine.registration}</p>
              </div>
            )}
          </div>

          {/* Specifications */}
          {Object.keys(specs).length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Specifications</h2>
              </div>
              <div className="divide-y divide-neutral-50">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-sm text-neutral-500 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-medium text-neutral-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {machine.description && (
            <div className="bg-white rounded-xl border border-neutral-100 p-4">
              <h2 className="font-semibold text-neutral-900 mb-2">About This Machine</h2>
              <p className="text-sm text-neutral-600 leading-relaxed">{machine.description}</p>
            </div>
          )}

          {/* Documents */}
          {documents && documents.length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Safety & Reference Documents</h2>
              </div>
              <div className="divide-y divide-neutral-50">
                {documents.map((doc) => {
                  const config = DOC_TYPE_CONFIG[doc.doc_type] || {
                    label: doc.doc_type, icon: FileText, color: "text-neutral-600", bg: "bg-neutral-50"
                  };
                  const Icon = config.icon;
                  return (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                    >
                      <div className={`w-9 h-9 ${config.bg} rounded-lg flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {doc.title || config.label}
                        </p>
                        <p className="text-xs text-neutral-400">{config.label}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pre-start checklist info */}
          {prestart_template && prestart_template.length > 0 && (
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Pre-Start Checklist Required</h3>
                  <p className="text-sm text-blue-700">
                    A pre-start safety checklist must be completed before operating this equipment.
                    It takes approximately 5 minutes to complete.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => navigate(`/m/${qrCodeId}/prestart`)}
            className="w-full h-14 text-base font-semibold rounded-xl"
            style={{ backgroundColor: "#E63946", color: "white" }}
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            Start Pre-Start Checklist
          </Button>
          <p className="text-center text-xs text-neutral-400 mt-2">Required before operating this equipment</p>
        </div>
      </div>
    </div>
  );
}
