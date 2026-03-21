import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPrestartTemplate, submitPrestartChecklist } from "../lib/api";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  AlertCircle,
  ClipboardCheck
} from "lucide-react";
import { Button } from "../components/ui/button";

const STATUS_CONFIG = {
  pass: { label: "Pass", icon: CheckCircle2, bg: "bg-green-500", text: "text-white", border: "border-green-500" },
  fail: { label: "Fail", icon: XCircle, bg: "bg-red-500", text: "text-white", border: "border-red-500" },
  na: { label: "N/A", icon: MinusCircle, bg: "bg-neutral-400", text: "text-white", border: "border-neutral-400" },
};

const CATEGORY_COLORS = {
  "Safety": "text-red-700 bg-red-50 border-red-200",
  "Fluids": "text-blue-700 bg-blue-50 border-blue-200",
  "Visual Inspection": "text-amber-700 bg-amber-50 border-amber-200",
  "Operational Check": "text-green-700 bg-green-50 border-green-200",
};

export default function PrestartChecklistPage() {
  const { qrCodeId } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [operatorName, setOperatorName] = useState("");
  const [operatorCompany, setOperatorCompany] = useState("");
  const [operatorPhone, setOperatorPhone] = useState("");
  const [hoursReading, setHoursReading] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState({});
  const [comments, setComments] = useState({});

  // Machine id from qr code (we'll get it from the template items or use qrCodeId as machineId)
  const [machineId, setMachineId] = useState(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        // qrCodeId could be a UUID or short id — use the public endpoint to get machine id
        const { getPublicMachine } = await import("../lib/api");
        const data = await getPublicMachine(qrCodeId);
        setMachineId(data.machine.id);

        const templateData = await getPrestartTemplate(data.machine.id);
        setTemplate(templateData);

        // Initialise all items as unchecked (undefined)
        const initItems = {};
        templateData.forEach(item => { initItems[item.id] = null; });
        setItems(initItems);
      } catch (err) {
        setError("Failed to load checklist template.");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [qrCodeId]);

  // Group template items by category
  const grouped = template.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const setItemStatus = (id, status) => {
    setItems(prev => ({ ...prev, [id]: status }));
  };

  const setItemComment = (id, comment) => {
    setComments(prev => ({ ...prev, [id]: comment }));
  };

  const allAnswered = template.length > 0 && template.every(item => items[item.id] !== null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!operatorName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!allAnswered) {
      alert("Please answer all checklist items.");
      return;
    }

    setSubmitting(true);
    try {
      const submissionItems = template.map(item => ({
        template_item_id: item.id,
        category: item.category,
        item_text: item.item_text,
        status: items[item.id],
        comment: comments[item.id] || null
      }));

      await submitPrestartChecklist(machineId, {
        operator_name: operatorName.trim(),
        operator_company: operatorCompany.trim() || null,
        operator_phone: operatorPhone.trim() || null,
        submission_date: new Date().toISOString().slice(0, 10),
        hours_reading: hoursReading ? parseFloat(hoursReading) : null,
        notes: notes.trim() || null,
        items: submissionItems
      });

      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit checklist. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#E63946]" />
          <p>Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Error</h2>
          <p className="text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const hasAnyFail = template.some(item => items[item.id] === 'fail');
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          {hasAnyFail ? (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Checklist Failed</h2>
              <p className="text-neutral-600 mb-6">
                One or more items failed the pre-start check. Do not operate this equipment until issues are resolved. Please contact your supervisor.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Checklist Passed!</h2>
              <p className="text-neutral-600 mb-6">
                All pre-start checks passed. You are cleared to operate this equipment safely.
              </p>
            </>
          )}
          <Button
            onClick={() => navigate(`/m/${qrCodeId}`)}
            className="w-full"
            style={{ backgroundColor: "#0056D2", color: "white" }}
          >
            Back to Machine Info
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/m/${qrCodeId}`)}
            className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-neutral-900 text-base">Pre-Start Checklist</h1>
            <p className="text-xs text-neutral-500">Complete all items before operating</p>
          </div>
          <ClipboardCheck className="w-5 h-5 text-[#E63946]" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-32">
        {/* Operator Details */}
        <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
            <h2 className="font-semibold text-neutral-900">Operator Details</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={e => setOperatorName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Company</label>
              <input
                type="text"
                value={operatorCompany}
                onChange={e => setOperatorCompany(e.target.value)}
                placeholder="Your company (optional)"
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
              <input
                type="tel"
                value={operatorPhone}
                onChange={e => setOperatorPhone(e.target.value)}
                placeholder="Your phone number (optional)"
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hours Reading</label>
              <input
                type="number"
                value={hoursReading}
                onChange={e => setHoursReading(e.target.value)}
                placeholder="Current hours on machine"
                step="0.1"
                min="0"
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Checklist Categories */}
        {Object.entries(grouped).map(([category, categoryItems]) => {
          const colorClass = CATEGORY_COLORS[category] || "text-neutral-700 bg-neutral-50 border-neutral-200";
          return (
            <div key={category} className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
              <div className={`px-4 py-3 border-b border-neutral-100 ${colorClass.split(' ')[1]} ${colorClass.split(' ')[2]}`}>
                <h2 className={`font-semibold ${colorClass.split(' ')[0]}`}>{category}</h2>
              </div>
              <div className="divide-y divide-neutral-50">
                {categoryItems.map((item) => {
                  const currentStatus = items[item.id];
                  return (
                    <div key={item.id} className="p-4">
                      <p className="text-sm font-medium text-neutral-900 mb-3">{item.item_text}</p>
                      
                      {/* Pass/Fail/N/A buttons */}
                      <div className="flex gap-2 mb-2">
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                          const isSelected = currentStatus === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setItemStatus(item.id, status)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                                isSelected
                                  ? `${config.bg} ${config.text} ${config.border}`
                                  : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
                              }`}
                            >
                              <config.icon className="w-4 h-4" />
                              {config.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Comment field — show if fail or if has comment */}
                      {(currentStatus === 'fail' || comments[item.id]) && (
                        <input
                          type="text"
                          value={comments[item.id] || ""}
                          onChange={e => setItemComment(item.id, e.target.value)}
                          placeholder="Add a comment (optional)"
                          className="w-full mt-2 px-3 py-2 border border-neutral-200 rounded-lg text-xs text-neutral-700 focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/20 outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
            <h2 className="font-semibold text-neutral-900">Additional Notes</h2>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional observations or comments..."
              rows={3}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm resize-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="text-center text-sm text-neutral-500">
          {template.filter(i => items[i.id] !== null).length} / {template.length} items completed
        </div>
      </form>

      {/* Sticky submit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || !allAnswered || !operatorName.trim()}
            className="w-full h-14 text-base font-semibold rounded-xl disabled:opacity-50"
            style={{ backgroundColor: allAnswered && operatorName.trim() ? "#E63946" : undefined, color: "white" }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit Checklist
              </>
            )}
          </Button>
          {!allAnswered && (
            <p className="text-center text-xs text-neutral-400 mt-1">Answer all items to submit</p>
          )}
        </div>
      </div>
    </div>
  );
}
