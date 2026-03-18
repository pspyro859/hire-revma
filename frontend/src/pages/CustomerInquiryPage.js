import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { getMachines, createInquiry } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Truck,
  ArrowLeft,
  CalendarIcon,
  CheckCircle,
  Send
} from "lucide-react";

export default function CustomerInquiryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    is_business: false,
    company_name: "",
    abn: "",
    equipment: location.state?.selectedMachine ? [location.state.selectedMachine.name] : [],
    hire_start_date: null,
    hire_end_date: null,
    hire_rate_preference: "daily",
    delivery_method: "pickup",
    delivery_address: "",
    job_description: "",
    additional_notes: "",
  });

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const data = await getMachines();
        setMachines(data);
      } catch (error) {
        console.error("Error fetching machines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  const handleEquipmentToggle = (machineName) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(machineName)
        ? prev.equipment.filter(e => e !== machineName)
        : [...prev.equipment, machineName]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.equipment.length === 0) {
      toast.error("Please select at least one piece of equipment");
      return;
    }

    setSubmitting(true);
    try {
      await createInquiry({
        ...formData,
        hire_start_date: format(formData.hire_start_date, "yyyy-MM-dd"),
        hire_end_date: format(formData.hire_end_date, "yyyy-MM-dd"),
      });
      setSubmitted(true);
      toast.success("Inquiry submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">Enquiry Received!</h1>
          <p className="text-neutral-600 mb-6">
            Thanks for your enquiry. We'll review your request and get back to you with a quote within one business day.
          </p>
          <p className="text-sm text-neutral-500 mb-8">
            If it's urgent, call us on <a href="tel:0448473862" className="text-[#E63946] font-medium">0448 473 862</a>
          </p>
          <Button onClick={() => navigate("/")} className="btn-primary w-full">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E63946] rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-neutral-900">REVMA HIRE</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#E63946] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Equipment Hire Enquiry</h1>
          <p className="text-neutral-600">
            Fill in the form below and we'll get back to you with a quote within one business day.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {["Fill in form", "We send quote", "Approve & sign", "Collect"].map((step, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                idx === 0 ? "bg-[#E63946] text-white" : "bg-neutral-200 text-neutral-500"
              }`}>
                {idx + 1}
              </div>
              <span className="ml-2 text-sm whitespace-nowrap text-neutral-600">{step}</span>
              {idx < 3 && <div className="w-8 h-0.5 bg-neutral-200 mx-2"></div>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Details */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Your Details</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="input-field"
                  required
                  data-testid="first-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="input-field"
                  required
                  data-testid="last-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  required
                  data-testid="email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  required
                  data-testid="phone-input"
                />
              </div>
            </div>

            {/* Business checkbox */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-100">
              <Checkbox
                id="is_business"
                checked={formData.is_business}
                onCheckedChange={(checked) => setFormData({ ...formData, is_business: checked })}
                data-testid="business-checkbox"
              />
              <Label htmlFor="is_business" className="cursor-pointer">
                I'm enquiring as a business/company
              </Label>
            </div>

            {formData.is_business && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="input-field"
                    data-testid="company-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN</Label>
                  <Input
                    id="abn"
                    value={formData.abn}
                    onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                    className="input-field"
                    data-testid="abn-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Equipment Selection */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Equipment Required *</h2>
            <p className="text-sm text-neutral-500 mb-4">Select all that apply</p>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="spinner border-[#E63946] border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {machines.map((machine) => (
                  <button
                    key={machine.id}
                    type="button"
                    onClick={() => handleEquipmentToggle(machine.name)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.equipment.includes(machine.name)
                        ? "border-[#E63946] bg-[#E63946]/5"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                    data-testid={`equipment-${machine.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        formData.equipment.includes(machine.name)
                          ? "bg-[#E63946] border-[#E63946]"
                          : "border-neutral-300"
                      }`}>
                        {formData.equipment.includes(machine.name) && (
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{machine.name}</p>
                        <p className="text-xs text-neutral-500">${machine.daily_rate}/day</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hire Details */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Hire Details</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="input-field w-full justify-start text-left font-normal" data-testid="start-date-btn">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.hire_start_date ? format(formData.hire_start_date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.hire_start_date}
                      onSelect={(date) => setFormData({ ...formData, hire_start_date: date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="input-field w-full justify-start text-left font-normal" data-testid="end-date-btn">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.hire_end_date ? format(formData.hire_end_date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.hire_end_date}
                      onSelect={(date) => setFormData({ ...formData, hire_end_date: date })}
                      disabled={(date) => date < (formData.hire_start_date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Preferred Hire Rate</Label>
                <Select
                  value={formData.hire_rate_preference}
                  onValueChange={(value) => setFormData({ ...formData, hire_rate_preference: value })}
                >
                  <SelectTrigger className="input-field" data-testid="rate-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>How will you get the equipment?</Label>
                <Select
                  value={formData.delivery_method}
                  onValueChange={(value) => setFormData({ ...formData, delivery_method: value })}
                >
                  <SelectTrigger className="input-field" data-testid="delivery-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup from Mayfield West</SelectItem>
                    <SelectItem value="delivery">Delivery to my site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.delivery_method === "delivery" && (
              <div className="mt-4 space-y-2 animate-fade-in">
                <Label htmlFor="delivery_address">Delivery Address *</Label>
                <Input
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  placeholder="Enter delivery address"
                  className="input-field"
                  required={formData.delivery_method === "delivery"}
                  data-testid="delivery-address-input"
                />
              </div>
            )}
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Job Details</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job_description">What will you be using the equipment for? *</Label>
                <Textarea
                  id="job_description"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  placeholder="Describe your project or job..."
                  className="min-h-[100px]"
                  required
                  data-testid="job-description-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_notes">Anything else we should know? (optional)</Label>
                <Textarea
                  id="additional_notes"
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  placeholder="Any special requirements or questions..."
                  className="min-h-[80px]"
                  data-testid="notes-input"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <p className="text-sm text-neutral-500">
              We'll respond within 1 business day. No obligation.
            </p>
            <Button
              type="submit"
              disabled={submitting || !formData.hire_start_date || !formData.hire_end_date}
              className="btn-secondary w-full sm:w-auto"
              data-testid="submit-inquiry-btn"
            >
              {submitting ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Hire Enquiry
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
