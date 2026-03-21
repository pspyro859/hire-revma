import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getMachines, downloadQRBulk, getMachineQRUrl } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  QrCode,
  Loader2,
  Download,
  CheckSquare,
  Square,
  Eye
} from "lucide-react";
import { toast } from "sonner";

const SIZES = [
  { value: "small", label: "Small (25×25mm)", desc: "Compact label for small equipment tags" },
  { value: "medium", label: "Medium (50×50mm)", desc: "Standard size for most applications" },
  { value: "large", label: "Large (100×100mm)", desc: "High visibility for larger equipment" },
];

export default function QRLabelsPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [size, setSize] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [previewMachineId, setPreviewMachineId] = useState(null);

  useEffect(() => {
    getMachines()
      .then(setMachines)
      .catch(() => toast.error("Failed to load machines"))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === machines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(machines.map(m => m.id));
    }
  };

  const handleDownload = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one machine");
      return;
    }
    setGenerating(true);
    try {
      const blob = await downloadQRBulk(selectedIds, size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-labels-${size}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("QR labels downloaded");
    } catch {
      toast.error("Failed to generate QR labels");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">QR Label Printing</h1>
          <p className="text-neutral-500 mt-1">Generate printable QR code labels for your equipment</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Machine Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900">Select Machines</h2>
                <button
                  onClick={selectAll}
                  className="text-sm text-[#0056D2] hover:underline flex items-center gap-1"
                >
                  {selectedIds.length === machines.length && machines.length > 0 ? (
                    <><CheckSquare className="w-4 h-4" /> Deselect All</>
                  ) : (
                    <><Square className="w-4 h-4" /> Select All</>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#E63946]" />
                </div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {machines.map(machine => {
                    const selected = selectedIds.includes(machine.id);
                    return (
                      <div
                        key={machine.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selected ? "bg-blue-50" : "hover:bg-neutral-50"
                        }`}
                        onClick={() => toggleSelect(machine.id)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          selected ? "bg-[#0056D2] border-[#0056D2]" : "border-neutral-300"
                        }`}>
                          {selected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 10"><path d="M1 5l3 4L11 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>

                        {machine.image_url && (
                          <img src={machine.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{machine.name}</p>
                          <p className="text-xs text-neutral-400">{machine.make} {machine.model}</p>
                          {machine.qr_code_id && (
                            <p className="text-xs text-[#0056D2] font-mono">{machine.qr_code_id}</p>
                          )}
                        </div>

                        <button
                          onClick={e => { e.stopPropagation(); setPreviewMachineId(previewMachineId === machine.id ? null : machine.id); }}
                          className="p-1.5 text-neutral-400 hover:text-[#0056D2] transition-colors"
                          title="Preview QR"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Options & Preview */}
          <div className="space-y-4">
            {/* Label Size */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-900">Label Size</h2>
              </div>
              <div className="p-3 space-y-2">
                {SIZES.map(s => (
                  <label
                    key={s.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      size === s.value ? "border-[#0056D2] bg-blue-50" : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={s.value}
                      checked={size === s.value}
                      onChange={() => setSize(s.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{s.label}</p>
                      <p className="text-xs text-neutral-500">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* QR Preview */}
            {previewMachineId && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <h2 className="font-semibold text-neutral-900 text-sm">QR Preview</h2>
                </div>
                <div className="p-4 flex justify-center">
                  <img
                    src={getMachineQRUrl(previewMachineId)}
                    alt="QR Code"
                    className="w-40 h-40 border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="text-sm text-neutral-600 mb-3">
                {selectedIds.length === 0
                  ? "No machines selected"
                  : `${selectedIds.length} machine${selectedIds.length !== 1 ? "s" : ""} selected`}
              </p>
              <Button
                onClick={handleDownload}
                disabled={selectedIds.length === 0 || generating}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Download PDF</>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4">
              <div className="flex items-start gap-2">
                <QrCode className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-500">
                  QR codes link to the public machine page at <span className="font-mono">hire.revma.com.au/m/[ID]</span>. 
                  Operators can scan to view machine info and complete pre-start checklists.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
