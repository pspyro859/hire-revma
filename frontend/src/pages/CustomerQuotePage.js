import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getCustomerQuote, uploadIdDocument, signQuote } from "../lib/api";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Shield,
  Loader2,
  Camera,
  Trash2,
  PenTool,
  Check,
  X
} from "lucide-react";

// ID Document types with their point values
const ID_DOCUMENT_TYPES = [
  { type: "drivers_licence", name: "Driver's Licence (Front & Back)", points: 40, icon: CreditCard },
  { type: "passport", name: "Passport", points: 70, icon: FileText },
  { type: "medicare", name: "Medicare Card", points: 25, icon: Shield },
  { type: "birth_certificate", name: "Birth Certificate", points: 70, icon: FileText },
  { type: "utility_bill", name: "Utility Bill (last 3 months)", points: 25, icon: FileText },
  { type: "bank_statement", name: "Bank Statement", points: 25, icon: FileText },
];

export default function CustomerQuotePage() {
  const { quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);
  const [terms, setTerms] = useState([]);
  const [idPointsTotal, setIdPointsTotal] = useState(0);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploading, setUploading] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  
  // Signature canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!token) {
        setError("Invalid or missing access token");
        setLoading(false);
        return;
      }

      try {
        const data = await getCustomerQuote(quoteId, token);
        setQuote(data.quote);
        setTerms(data.terms || []);
        setIdPointsTotal(data.id_points_total || 0);
        
        // Build uploaded docs map
        const docs = {};
        (data.quote.id_documents || []).forEach(doc => {
          docs[doc.doc_type] = doc;
        });
        setUploadedDocs(docs);
        
        if (data.quote.customer_signature) {
          setSigned(true);
        }
      } catch (err) {
        console.error("Error fetching quote:", err);
        setError(err.response?.data?.detail || "Failed to load quote. Please check your link.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId, token]);

  // Signature canvas handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1A1D23";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [quote]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleFileUpload = async (docType, file) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [docType]: true }));
    
    try {
      const result = await uploadIdDocument(quoteId, token, docType, file);
      
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: {
          doc_type: docType,
          points: result.points,
          filename: result.filename
        }
      }));
      
      setIdPointsTotal(result.total_points);
      toast.success(`Document uploaded! ${result.points} points added.`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload document");
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleSign = async () => {
    if (!hasSignature) {
      toast.error("Please sign in the box above");
      return;
    }

    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if (idPointsTotal < 100) {
      toast.error("Please upload 100 points of ID before signing");
      return;
    }

    setSigning(true);
    
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL("image/png");
      
      await signQuote(quoteId, token, signatureData, true);
      
      toast.success("Agreement signed successfully!");
      setSigned(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to sign agreement");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-600">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Quote Not Found</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <p className="text-sm text-neutral-500">
            If you believe this is an error, please contact us at{" "}
            <a href="tel:0448473862" className="text-[#E63946] font-medium">0448 473 862</a>
          </p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Agreement Signed!</h1>
          <p className="text-neutral-600 mb-6">
            Thank you for signing your hire agreement. We'll be in touch shortly to arrange your equipment hire.
          </p>
          <div className="bg-neutral-100 rounded-lg p-4 text-left">
            <p className="text-sm text-neutral-600"><strong>Quote:</strong> #{quote?.quote_number}</p>
            <p className="text-sm text-neutral-600"><strong>Equipment:</strong> {quote?.line_items?.map(i => i.machine_name).join(", ")}</p>
            <p className="text-sm text-neutral-600"><strong>Hire Period:</strong> {quote?.hire_start_date} to {quote?.hire_end_date}</p>
          </div>
          <p className="text-sm text-neutral-500 mt-6">
            Questions? Call us at{" "}
            <a href="tel:0448473862" className="text-[#E63946] font-medium">0448 473 862</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-[#1A1D23] text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://www.revma.com.au/assets/images/revma-logo.jpg"
              alt="Revma"
              className="h-10 rounded"
            />
            <div>
              <h1 className="font-bold">REVMA HIRE</h1>
              <p className="text-xs text-neutral-400">Equipment Hire Quote</p>
            </div>
          </div>
          <a href="tel:0448473862" className="text-sm text-[#E63946]">
            0448 473 862
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quote Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[#E63946] to-[#c62836] text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Quote Number</p>
                <p className="text-2xl font-bold">#{quote.quote_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Valid Until</p>
                <p className="font-bold">{quote.valid_until}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="font-bold text-lg text-neutral-900 mb-4">Quote Details</h2>
            
            {/* Equipment List */}
            <div className="space-y-3 mb-6">
              {quote.line_items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-neutral-100">
                  <div>
                    <p className="font-medium text-neutral-900">{item.machine_name}</p>
                    <p className="text-sm text-neutral-500">{item.rate_type} rate</p>
                  </div>
                  <p className="font-bold text-[#E63946]">${parseFloat(item.subtotal || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">${parseFloat(quote.subtotal || 0).toFixed(2)}</span>
              </div>
              {quote.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Delivery Fee</span>
                  <span className="font-medium">${parseFloat(quote.delivery_fee || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Security Bond (refundable)</span>
                <span className="font-medium">${parseFloat(quote.security_bond || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200">
                <span className="font-bold text-neutral-900">Total</span>
                <span className="font-bold text-xl text-[#E63946]">${parseFloat(quote.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Hire Details */}
            <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-500">Hire Period</p>
                <p className="font-medium">{quote.hire_start_date} → {quote.hire_end_date}</p>
              </div>
              <div>
                <p className="text-neutral-500">Collection</p>
                <p className="font-medium capitalize">{quote.delivery_method}</p>
              </div>
              {quote.delivery_address && (
                <div className="sm:col-span-2">
                  <p className="text-neutral-500">Delivery Address</p>
                  <p className="font-medium">{quote.delivery_address}</p>
                </div>
              )}
            </div>

            {quote.notes && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                <p className="text-sm text-yellow-800">{quote.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 1: ID Verification */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idPointsTotal >= 100 ? 'bg-green-500' : 'bg-[#E63946]'} text-white font-bold`}>
                {idPointsTotal >= 100 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <div>
                <h2 className="font-bold text-lg text-neutral-900">Identity Verification</h2>
                <p className="text-sm text-neutral-500">Upload 100 points of ID to proceed</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* ID Points Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-600">Points Collected</span>
                <span className={`font-bold ${idPointsTotal >= 100 ? 'text-green-500' : 'text-[#E63946]'}`}>
                  {idPointsTotal} / 100 points
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${idPointsTotal >= 100 ? 'bg-green-500' : 'bg-[#E63946]'}`}
                  style={{ width: `${Math.min(100, idPointsTotal)}%` }}
                ></div>
              </div>
            </div>

            {/* Document Upload Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {ID_DOCUMENT_TYPES.map(({ type, name, points, icon: Icon }) => {
                const isUploaded = !!uploadedDocs[type];
                const isUploading = uploading[type];

                return (
                  <label
                    key={type}
                    className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      isUploaded
                        ? 'border-green-500 bg-green-50'
                        : 'border-dashed border-neutral-300 hover:border-[#E63946] hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => handleFileUpload(type, e.target.files[0])}
                      disabled={isUploading}
                    />
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isUploaded ? 'bg-green-500 text-white' : 'bg-neutral-100'}`}>
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isUploaded ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{name}</p>
                        <p className="text-sm text-neutral-500">{points} points</p>
                      </div>
                      {!isUploaded && (
                        <Camera className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Terms & Conditions */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${agreedToTerms ? 'bg-green-500' : 'bg-neutral-300'} text-white font-bold`}>
                {agreedToTerms ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <div>
                <h2 className="font-bold text-lg text-neutral-900">Terms & Conditions</h2>
                <p className="text-sm text-neutral-500">Review and accept the hire agreement terms</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-h-60 overflow-y-auto bg-neutral-50 rounded-lg p-4 mb-4 text-sm">
              {terms.length > 0 ? (
                terms.map((term, index) => (
                  <div key={term.id || index} className="mb-4 last:mb-0">
                    <h3 className="font-bold text-neutral-900 mb-1">{term.section_name}</h3>
                    <p className="text-neutral-600">{term.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500">Terms and conditions will be provided by Revma Pty Ltd.</p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={setAgreedToTerms}
                className="mt-1"
                data-testid="agree-terms-checkbox"
              />
              <span className="text-sm text-neutral-700">
                I have read and agree to the terms and conditions of this equipment hire agreement.
                I understand my responsibilities regarding the care and use of the equipment.
              </span>
            </label>
          </div>
        </div>

        {/* Step 3: Signature */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasSignature ? 'bg-green-500' : 'bg-neutral-300'} text-white font-bold`}>
                {hasSignature ? <Check className="w-5 h-5" /> : '3'}
              </div>
              <div>
                <h2 className="font-bold text-lg text-neutral-900">Digital Signature</h2>
                <p className="text-sm text-neutral-500">Sign below to complete the agreement</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="border-2 border-dashed border-neutral-300 rounded-xl overflow-hidden mb-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full touch-none bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                data-testid="signature-canvas"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                <PenTool className="w-4 h-4 inline mr-1" />
                Draw your signature above
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={!hasSignature}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSign}
          disabled={signing || idPointsTotal < 100 || !agreedToTerms || !hasSignature}
          className="w-full h-14 text-lg bg-[#E63946] hover:bg-[#c62836] text-white rounded-xl"
          data-testid="sign-agreement-btn"
        >
          {signing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing Agreement...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Accept Quote & Sign Agreement
            </>
          )}
        </Button>

        {(idPointsTotal < 100 || !agreedToTerms || !hasSignature) && (
          <p className="text-center text-sm text-neutral-500 mt-4">
            {idPointsTotal < 100 && "Upload 100 points of ID • "}
            {!agreedToTerms && "Accept terms • "}
            {!hasSignature && "Add your signature"}
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1D23] text-white py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          <p className="font-bold mb-1">Revma Pty Ltd</p>
          <p className="text-neutral-400">ABN: 37 121 035 710</p>
          <p className="text-neutral-400">Unit 9/12 Channel Road, Mayfield West NSW 2304</p>
          <p className="text-neutral-400">Phone: 0448 473 862 | Email: office@revma.com.au</p>
        </div>
      </footer>
    </div>
  );
}
