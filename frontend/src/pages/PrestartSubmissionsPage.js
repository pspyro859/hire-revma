import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getMachines, getAllPrestartSubmissions, getPrestartSubmission } from "../lib/api";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  Calendar,
  User
} from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE = {
  pass: { label: "Pass", class: "bg-green-100 text-green-700", icon: CheckCircle2 },
  fail: { label: "Fail", class: "bg-red-100 text-red-700", icon: XCircle },
};

const ITEM_STATUS = {
  pass: { icon: CheckCircle2, class: "text-green-500" },
  fail: { icon: XCircle, class: "text-red-500" },
  na: { icon: MinusCircle, class: "text-neutral-400" },
};

export default function PrestartSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMachine, filterStatus, filterStartDate, filterEndDate]);

  useEffect(() => {
    getMachines().then(setMachines).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllPrestartSubmissions({
        machine_id: filterMachine || undefined,
        status: filterStatus || undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined
      });
      setSubmissions(data);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!expandedDetail[id]) {
      setLoadingDetail(id);
      try {
        const detail = await getPrestartSubmission(id);
        setExpandedDetail(prev => ({ ...prev, [id]: detail }));
      } catch {
        toast.error("Failed to load submission detail");
      } finally {
        setLoadingDetail(null);
      }
    }
  };

  const grouped = (expandedDetail[expandedId]?.items || []).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">Pre-Start Submissions</h1>
          <p className="text-neutral-500 mt-1">Review operator pre-start checklist submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mr-1">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>

          <select
            value={filterMachine}
            onChange={e => setFilterMachine(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="">All Machines</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">From:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">To:</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
            />
          </div>

          {(filterMachine || filterStatus || filterStartDate || filterEndDate) && (
            <button
              onClick={() => { setFilterMachine(""); setFilterStatus(""); setFilterStartDate(""); setFilterEndDate(""); }}
              className="text-sm text-neutral-500 hover:text-red-600 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="text-sm text-neutral-500 mb-4">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>

        {/* Submissions List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#E63946]" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p>No submissions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => {
              const badge = STATUS_BADGE[sub.overall_status] || { label: sub.overall_status, class: "bg-neutral-100 text-neutral-600", icon: ClipboardCheck };
              const BadgeIcon = badge.icon;
              const isExpanded = expandedId === sub.id;
              const detail = expandedDetail[sub.id];

              return (
                <div key={sub.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div
                    className="flex items-start gap-4 p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => toggleExpand(sub.id)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      sub.overall_status === "pass" ? "bg-green-100" : "bg-red-100"
                    }`}>
                      <BadgeIcon className={`w-5 h-5 ${sub.overall_status === "pass" ? "text-green-600" : "text-red-600"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.class}`}>
                          {badge.label}
                        </span>
                        <span className="text-sm font-semibold text-neutral-900">{sub.machine_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-neutral-600">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          {sub.operator_name}
                        </span>
                        {sub.operator_company && <span className="text-neutral-400">· {sub.operator_company}</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {sub.submission_date ? new Date(sub.submission_date).toLocaleDateString() : "N/A"}
                        </span>
                        {sub.hours_reading != null && <span>{sub.hours_reading} hrs</span>}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {loadingDetail === sub.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      ) : isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && detail && (
                    <div className="border-t border-neutral-100 bg-neutral-50 p-4">
                      {sub.notes && (
                        <div className="mb-4 p-3 bg-white rounded-lg border border-neutral-100">
                          <p className="text-xs text-neutral-400 mb-0.5">Notes</p>
                          <p className="text-sm text-neutral-700">{sub.notes}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        {Object.entries(grouped).map(([category, items]) => (
                          <div key={category}>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{category}</h3>
                            <div className="bg-white rounded-lg border border-neutral-100 divide-y divide-neutral-50">
                              {items.map(item => {
                                const sc = ITEM_STATUS[item.status] || ITEM_STATUS.na;
                                const StatusIcon = sc.icon;
                                return (
                                  <div key={item.id} className="flex items-start gap-3 px-3 py-2">
                                    <StatusIcon className={`w-4 h-4 shrink-0 mt-0.5 ${sc.class}`} />
                                    <div className="flex-1">
                                      <p className="text-sm text-neutral-800">{item.item_text}</p>
                                      {item.comment && (
                                        <p className="text-xs text-neutral-500 mt-0.5">{item.comment}</p>
                                      )}
                                    </div>
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                      item.status === "pass" ? "bg-green-100 text-green-700" :
                                      item.status === "fail" ? "bg-red-100 text-red-700" :
                                      "bg-neutral-100 text-neutral-500"
                                    }`}>
                                      {item.status.toUpperCase()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
