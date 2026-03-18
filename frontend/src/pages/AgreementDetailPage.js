import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import SignaturePad from "../components/SignaturePad";
import PhotoUploader from "../components/PhotoUploader";
import { useAuth } from "../context/AuthContext";
import { 
  getAgreement, 
  updateChecklist, 
  uploadPhoto, 
  signAgreement,
  getTerms,
  getPhotoUrl,
  getSignatureUrl
} from "../lib/api";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  FileText,
  Camera,
  Edit3,
  CheckCircle,
  Download,
  Truck,
  User,
  Calendar,
  MapPin,
  AlertCircle
} from "lucide-react";

export default function AgreementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agreement, setAgreement] = useState(null);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [checklistNotes, setChecklistNotes] = useState({});
  const [saving, setSaving] = useState(false);

  const isStaff = user?.role === "staff" || user?.role === "admin";

  const fetchAgreement = useCallback(async () => {
    try {
      const [agreementData, termsData] = await Promise.all([
        getAgreement(id),
        getTerms()
      ]);
      setAgreement(agreementData);
      setTerms(termsData);
      
      // Initialize checklist notes
      const notes = {};
      agreementData.checklist?.forEach(item => {
        notes[item.item] = item.notes || "";
      });
      setChecklistNotes(notes);
    } catch (error) {
      console.error("Error fetching agreement:", error);
      toast.error("Failed to load agreement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  const handleChecklistChange = async (itemName, checked) => {
    const updatedChecklist = agreement.checklist.map(item => 
      item.item === itemName 
        ? { ...item, checked, notes: checklistNotes[itemName] || null }
        : item
    );

    setSaving(true);
    try {
      await updateChecklist(id, updatedChecklist);
      setAgreement({ ...agreement, checklist: updatedChecklist });
      toast.success("Checklist updated");
    } catch (error) {
      toast.error("Failed to update checklist");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (position, file) => {
    try {
      await uploadPhoto(id, position, file);
      await fetchAgreement();
      toast.success(`${position} photo uploaded`);
    } catch (error) {
      toast.error("Failed to upload photo");
    }
  };

  const handleSignature = async (signatureData) => {
    const signatureType = isStaff ? "staff" : "customer";
    
    setSaving(true);
    try {
      await signAgreement(id, signatureType, signatureData);
      await fetchAgreement();
      toast.success("Signature saved successfully");
    } catch (error) {
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    
    // Header
    doc.setFillColor(0, 86, 210);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("REVMA PTY LTD", 15, 18);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("EQUIPMENT HIRE AGREEMENT", 15, 28);
    
    // Agreement number
    doc.setTextColor(0, 0, 0);
    y = 50;
    doc.setFontSize(10);
    doc.text(`Agreement #: ${agreement.agreement_number}`, 15, y);
    doc.text(`Date: ${new Date(agreement.created_at).toLocaleDateString()}`, pageWidth - 60, y);
    
    // Customer Details
    y += 15;
    doc.setFillColor(240, 244, 248);
    doc.rect(15, y - 5, pageWidth - 30, 35, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER DETAILS", 20, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${agreement.customer_name}`, 20, y + 15);
    doc.text(`Email: ${agreement.customer_email}`, 20, y + 22);
    doc.text(`Phone: ${agreement.customer_phone}`, 110, y + 15);
    if (agreement.customer_licence) {
      doc.text(`Licence: ${agreement.customer_licence}`, 110, y + 22);
    }
    
    // Equipment Details
    y += 45;
    doc.setFillColor(240, 244, 248);
    doc.rect(15, y - 5, pageWidth - 30, 35, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("EQUIPMENT DETAILS", 20, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Machine: ${agreement.machine_name}`, 20, y + 15);
    doc.text(`Make/Model: ${agreement.machine_make} ${agreement.machine_model}`, 20, y + 22);
    
    // Hire Details
    y += 45;
    doc.setFillColor(240, 244, 248);
    doc.rect(15, y - 5, pageWidth - 30, 45, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("HIRE DETAILS", 20, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Start Date: ${new Date(agreement.hire_start_date).toLocaleDateString()}`, 20, y + 15);
    doc.text(`End Date: ${new Date(agreement.hire_end_date).toLocaleDateString()}`, 110, y + 15);
    doc.text(`Rate: $${agreement.hire_rate} per ${agreement.hire_rate_type}`, 20, y + 22);
    doc.text(`Security Bond: $${agreement.security_bond}`, 110, y + 22);
    doc.text(`Job Site: ${agreement.job_site}`, 20, y + 32);
    doc.text(`Purpose: ${agreement.purpose}`, 20, y + 39);
    
    // Pre-Start Checklist
    y += 55;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PRE-START CHECKLIST", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    agreement.checklist?.forEach(item => {
      const checkmark = item.checked ? "[✓]" : "[ ]";
      doc.text(`${checkmark} ${item.item}`, 25, y);
      y += 6;
    });
    
    // Terms & Conditions (Page 2)
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", 15, y);
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    terms.forEach(term => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(term.section_name, 15, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(term.content, pageWidth - 30);
      doc.text(lines, 15, y);
      y += lines.length * 4 + 8;
    });
    
    // Signatures (Page 3)
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SIGNATURES", 15, y);
    
    y += 20;
    doc.setFontSize(10);
    doc.text("Customer Signature:", 15, y);
    doc.line(15, y + 30, 90, y + 30);
    doc.text(`Name: ${agreement.customer_name}`, 15, y + 40);
    doc.text(`Date: ${agreement.signed_at ? new Date(agreement.signed_at).toLocaleDateString() : "_______________"}`, 15, y + 48);
    
    doc.text("Revma Representative:", 110, y);
    doc.line(110, y + 30, 195, y + 30);
    doc.text("Name: _______________", 110, y + 40);
    doc.text("Date: _______________", 110, y + 48);
    
    // Footer
    y = 280;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Revma Pty Ltd | ABN: 37 121 035 710 | Unit 9/12 Channel Road, Mayfield West NSW 2304", pageWidth / 2, y, { align: "center" });
    doc.text("Phone: 0448 473 862 | Email: office@revma.com.au | www.revma.com.au", pageWidth / 2, y + 5, { align: "center" });
    
    doc.save(`${agreement.agreement_number}.pdf`);
    toast.success("PDF downloaded");
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { class: "status-draft", label: "Draft" },
      pending_checklist: { class: "status-pending", label: "Pre-Start Checklist Required" },
      pending_photos: { class: "status-pending", label: "Photos Required" },
      pending_signature: { class: "status-pending", label: "Awaiting Signature" },
      active: { class: "status-active", label: "Active" },
      completed: { class: "status-completed", label: "Completed" },
      cancelled: { class: "status-cancelled", label: "Cancelled" },
    };
    const badge = badges[status] || { class: "status-draft", label: status };
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  const tabs = [
    { id: "details", label: "Details", icon: FileText },
    { id: "checklist", label: "Checklist", icon: CheckCircle },
    { id: "photos", label: "Photos", icon: Camera },
    { id: "signature", label: "Signature", icon: Edit3 },
  ];

  const allChecklistComplete = agreement?.checklist?.every(item => item.checked);
  const hasAllPhotos = agreement?.photos?.length >= 4;
  const canSign = allChecklistComplete && hasAllPhotos;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner border-[#0056D2] border-t-transparent w-8 h-8"></div>
        </div>
      </Layout>
    );
  }

  if (!agreement) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-neutral-600">Agreement not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#0056D2] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-neutral-900 font-mono">
                {agreement.agreement_number}
              </h1>
              {getStatusBadge(agreement.status)}
            </div>
            <p className="text-neutral-600">{agreement.machine_name}</p>
          </div>
          
          <Button
            onClick={generatePDF}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="download-pdf-btn"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#0056D2] text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {/* Customer */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0056D2]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#0056D2]" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-medium text-neutral-900">{agreement.customer_name}</p>
                  <p className="text-sm text-neutral-600">{agreement.customer_email}</p>
                  <p className="text-sm text-neutral-600">{agreement.customer_phone}</p>
                  {agreement.customer_licence && (
                    <p className="text-sm text-neutral-500 mt-1">
                      Licence: <span className="font-mono">{agreement.customer_licence}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Equipment */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Equipment</p>
                  <p className="font-medium text-neutral-900">{agreement.machine_name}</p>
                  <p className="text-sm text-neutral-600">{agreement.machine_make} {agreement.machine_model}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Hire Period</p>
                  <p className="font-medium text-neutral-900">
                    {new Date(agreement.hire_start_date).toLocaleDateString()} - {new Date(agreement.hire_end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-neutral-600 capitalize">{agreement.hire_rate_type} Rate: ${agreement.hire_rate}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Job Site</p>
                  <p className="font-medium text-neutral-900">{agreement.job_site}</p>
                  <p className="text-sm text-neutral-600 capitalize">{agreement.delivery_method}</p>
                </div>
              </div>

              {/* Purpose */}
              <div className="border-t border-neutral-100 pt-6">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Purpose of Hire</p>
                <p className="text-neutral-700">{agreement.purpose}</p>
              </div>

              {agreement.special_conditions && (
                <div className="border-t border-neutral-100 pt-6">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Special Conditions</p>
                  <p className="text-neutral-700">{agreement.special_conditions}</p>
                </div>
              )}

              {/* Pricing Summary */}
              <div className="border-t border-neutral-100 pt-6">
                <div className="bg-neutral-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Hire Rate</p>
                      <p className="text-2xl font-bold text-[#FF6B00]">
                        ${agreement.hire_rate}
                        <span className="text-sm font-normal text-neutral-500">/{agreement.hire_rate_type}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Security Bond</p>
                      <p className="text-lg font-medium text-neutral-900">${agreement.security_bond}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === "checklist" && (
            <div className="p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Pre-Start Checklist</h3>
                  <p className="text-sm text-neutral-500">Complete all items before signing</p>
                </div>
                {allChecklistComplete && (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {agreement.checklist?.map((item, idx) => (
                  <div key={idx} className="checklist-item">
                    <Checkbox
                      id={`check-${idx}`}
                      checked={item.checked}
                      onCheckedChange={(checked) => handleChecklistChange(item.item, checked)}
                      disabled={saving || agreement.status === "active"}
                      data-testid={`checklist-${idx}`}
                    />
                    <div className="flex-1">
                      <label htmlFor={`check-${idx}`} className="font-medium text-neutral-900 cursor-pointer">
                        {item.item}
                      </label>
                      <Textarea
                        placeholder="Add notes (optional)"
                        value={checklistNotes[item.item] || ""}
                        onChange={(e) => setChecklistNotes({ ...checklistNotes, [item.item]: e.target.value })}
                        className="mt-2 text-sm min-h-[60px]"
                        disabled={agreement.status === "active"}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!allChecklistComplete && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Complete all checklist items to proceed to photo upload
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === "photos" && (
            <div className="p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Equipment Photos</h3>
                  <p className="text-sm text-neutral-500">Capture all 4 views of the equipment</p>
                </div>
                {hasAllPhotos && (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Complete
                  </span>
                )}
              </div>

              <PhotoUploader
                photos={agreement.photos || []}
                onUpload={handlePhotoUpload}
                disabled={agreement.status === "active"}
              />

              {!allChecklistComplete && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Complete the pre-start checklist first
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Signature Tab */}
          {activeTab === "signature" && (
            <div className="p-6 animate-fade-in">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-neutral-900">Digital Signature</h3>
                <p className="text-sm text-neutral-500">
                  {canSign 
                    ? "Sign below to confirm agreement to hire terms"
                    : "Complete checklist and photos before signing"
                  }
                </p>
              </div>

              {!canSign && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {!allChecklistComplete && "Complete the pre-start checklist. "}
                    {!hasAllPhotos && "Upload all 4 equipment photos."}
                  </p>
                </div>
              )}

              {/* Existing Signatures */}
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Customer Signature</p>
                  {agreement.customer_signature ? (
                    <div>
                      <img 
                        src={getSignatureUrl(agreement.customer_signature)} 
                        alt="Customer signature" 
                        className="max-h-24 object-contain"
                      />
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Signed
                      </p>
                    </div>
                  ) : (
                    <p className="text-neutral-400 text-sm">Not yet signed</p>
                  )}
                </div>

                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Staff Signature</p>
                  {agreement.staff_signature ? (
                    <div>
                      <img 
                        src={getSignatureUrl(agreement.staff_signature)} 
                        alt="Staff signature" 
                        className="max-h-24 object-contain"
                      />
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Signed
                      </p>
                    </div>
                  ) : (
                    <p className="text-neutral-400 text-sm">Not yet signed</p>
                  )}
                </div>
              </div>

              {/* Signature Pad */}
              {canSign && (
                <>
                  {(isStaff && !agreement.staff_signature) || (!isStaff && !agreement.customer_signature) ? (
                    <div>
                      <p className="font-medium text-neutral-900 mb-4">
                        {isStaff ? "Staff" : "Customer"} Signature
                      </p>
                      <SignaturePad
                        onSave={handleSignature}
                        disabled={saving || agreement.status === "active"}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-neutral-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>Your signature has been recorded</p>
                    </div>
                  )}
                </>
              )}

              {/* Terms Summary */}
              <div className="mt-8 border-t border-neutral-200 pt-6">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Terms & Conditions</p>
                <div className="space-y-3 max-h-64 overflow-y-auto text-sm">
                  {terms.map((term) => (
                    <div key={term.id}>
                      <p className="font-medium text-neutral-900">{term.section_name}</p>
                      <p className="text-neutral-600 text-xs">{term.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
