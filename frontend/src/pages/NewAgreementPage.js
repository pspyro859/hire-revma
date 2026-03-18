import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getMachines, getUsers, createAgreement, getTerms } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  Truck,
  User,
  FileText,
  CheckCircle,
} from "lucide-react";

export default function NewAgreementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [machines, setMachines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [terms, setTerms] = useState([]);
  
  const [formData, setFormData] = useState({
    customer_id: "",
    machine_id: location.state?.selectedMachine?.id || "",
    hire_start_date: null,
    hire_end_date: null,
    hire_rate_type: "daily",
    delivery_method: "pickup",
    delivery_address: "",
    job_site: "",
    purpose: "",
    special_conditions: "",
  });

  const isStaff = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machinesData, termsData] = await Promise.all([
          getMachines(null, true),
          getTerms()
        ]);
        setMachines(machinesData);
        setTerms(termsData);

        if (isStaff) {
          const usersData = await getUsers("customer");
          setCustomers(usersData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [isStaff]);

  const selectedMachine = machines.find(m => m.id === formData.machine_id);
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const agreementData = {
        ...formData,
        customer_id: isStaff ? formData.customer_id : user.id,
        hire_start_date: format(formData.hire_start_date, "yyyy-MM-dd"),
        hire_end_date: format(formData.hire_end_date, "yyyy-MM-dd"),
      };

      const agreement = await createAgreement(agreementData);
      toast.success("Agreement created successfully!");
      navigate(`/agreements/${agreement.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create agreement");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return isStaff ? formData.customer_id : true;
      case 2:
        return formData.machine_id;
      case 3:
        return formData.hire_start_date && formData.hire_end_date && formData.job_site && formData.purpose;
      default:
        return true;
    }
  };

  if (dataLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner border-[#0056D2] border-t-transparent w-8 h-8"></div>
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">New Hire Agreement</h1>
          <p className="text-neutral-600">Create a new equipment hire agreement</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { num: 1, label: "Customer", icon: User },
            { num: 2, label: "Equipment", icon: Truck },
            { num: 3, label: "Details", icon: FileText },
            { num: 4, label: "Review", icon: CheckCircle },
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center">
                <div
                  className={`step-dot ${
                    step > s.num ? "completed" : step === s.num ? "active" : "pending"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`ml-2 text-sm whitespace-nowrap ${
                  step >= s.num ? "text-neutral-900 font-medium" : "text-neutral-400"
                }`}>
                  {s.label}
                </span>
                {idx < 3 && <div className={`step-line mx-3 w-12 ${step > s.num ? "completed" : ""}`}></div>}
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-8">
          {/* Step 1: Customer Selection */}
          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Customer Information</h2>
              
              {isStaff ? (
                <div className="space-y-4">
                  <Label>Select Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger className="input-field" data-testid="customer-select">
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <span>{customer.full_name}</span>
                            <span className="text-neutral-500 text-sm">({customer.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedCustomer && (
                    <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <p className="font-medium text-neutral-900">{selectedCustomer.full_name}</p>
                      <p className="text-sm text-neutral-600">{selectedCustomer.email}</p>
                      <p className="text-sm text-neutral-600">{selectedCustomer.phone}</p>
                      {selectedCustomer.drivers_licence && (
                        <p className="text-sm text-neutral-500 mt-1">
                          Licence: <span className="font-mono">{selectedCustomer.drivers_licence}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="font-medium text-neutral-900">{user.full_name}</p>
                  <p className="text-sm text-neutral-600">{user.email}</p>
                  <p className="text-sm text-neutral-600">{user.phone}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Machine Selection */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Select Equipment</h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {machines.map((machine) => (
                  <div
                    key={machine.id}
                    onClick={() => setFormData({ ...formData, machine_id: machine.id })}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.machine_id === machine.id
                        ? "border-[#0056D2] bg-[#0056D2]/5"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                    data-testid={`select-machine-${machine.id}`}
                  >
                    <div className="flex gap-4">
                      <img
                        src={machine.image_url}
                        alt={machine.name}
                        className="w-20 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{machine.name}</p>
                        <p className="text-sm text-neutral-500">{machine.make} {machine.model}</p>
                        <p className="text-lg font-bold text-[#FF6B00] mt-1">
                          ${machine.daily_rate}<span className="text-sm font-normal text-neutral-500">/day</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Hire Details */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Hire Details</h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Start Date */}
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

                {/* End Date */}
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

                {/* Hire Rate Type */}
                <div className="space-y-2">
                  <Label>Hire Rate</Label>
                  <Select
                    value={formData.hire_rate_type}
                    onValueChange={(value) => setFormData({ ...formData, hire_rate_type: value })}
                  >
                    <SelectTrigger className="input-field" data-testid="rate-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (${selectedMachine?.daily_rate}/day)</SelectItem>
                      <SelectItem value="weekly">Weekly (${selectedMachine?.weekly_rate}/week)</SelectItem>
                      <SelectItem value="monthly">Monthly (${selectedMachine?.monthly_rate}/month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Method */}
                <div className="space-y-2">
                  <Label>Collection Method</Label>
                  <Select
                    value={formData.delivery_method}
                    onValueChange={(value) => setFormData({ ...formData, delivery_method: value })}
                  >
                    <SelectTrigger className="input-field" data-testid="delivery-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup from Mayfield West</SelectItem>
                      <SelectItem value="delivery">Delivery to Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.delivery_method === "delivery" && (
                <div className="space-y-2">
                  <Label>Delivery Address *</Label>
                  <Input
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    placeholder="Enter delivery address"
                    className="input-field"
                    data-testid="delivery-address-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Job Site Location *</Label>
                <Input
                  value={formData.job_site}
                  onChange={(e) => setFormData({ ...formData, job_site: e.target.value })}
                  placeholder="Where will the equipment be used?"
                  className="input-field"
                  required
                  data-testid="job-site-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Purpose of Hire *</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Describe what the equipment will be used for"
                  className="min-h-[100px]"
                  required
                  data-testid="purpose-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Special Conditions (Optional)</Label>
                <Textarea
                  value={formData.special_conditions}
                  onChange={(e) => setFormData({ ...formData, special_conditions: e.target.value })}
                  placeholder="Any additional terms or conditions"
                  className="min-h-[80px]"
                  data-testid="conditions-input"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Review Agreement</h2>
              
              {/* Summary Card */}
              <div className="bg-neutral-50 rounded-lg border border-neutral-200 divide-y divide-neutral-200">
                {/* Customer */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-medium text-neutral-900">
                    {isStaff ? selectedCustomer?.full_name : user.full_name}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {isStaff ? selectedCustomer?.email : user.email}
                  </p>
                </div>

                {/* Equipment */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Equipment</p>
                  <p className="font-medium text-neutral-900">{selectedMachine?.name}</p>
                  <p className="text-sm text-neutral-600">{selectedMachine?.make} {selectedMachine?.model}</p>
                </div>

                {/* Dates & Rate */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Hire Period</p>
                  <p className="font-medium text-neutral-900">
                    {formData.hire_start_date && format(formData.hire_start_date, "PPP")} - {formData.hire_end_date && format(formData.hire_end_date, "PPP")}
                  </p>
                  <p className="text-sm text-neutral-600 capitalize">{formData.hire_rate_type} Rate</p>
                </div>

                {/* Location */}
                <div className="p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Job Site</p>
                  <p className="font-medium text-neutral-900">{formData.job_site}</p>
                  <p className="text-sm text-neutral-600 capitalize">{formData.delivery_method}</p>
                </div>

                {/* Pricing */}
                <div className="p-4 bg-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Hire Rate</p>
                      <p className="text-2xl font-bold text-[#FF6B00]">
                        ${formData.hire_rate_type === "daily" ? selectedMachine?.daily_rate : formData.hire_rate_type === "weekly" ? selectedMachine?.weekly_rate : selectedMachine?.monthly_rate}
                        <span className="text-sm font-normal text-neutral-500">/{formData.hire_rate_type}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Security Bond</p>
                      <p className="text-lg font-medium text-neutral-900">${selectedMachine?.security_bond}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Preview */}
              <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Terms & Conditions Summary</p>
                <div className="space-y-2 text-sm text-neutral-600 max-h-48 overflow-y-auto">
                  {terms.slice(0, 3).map((term) => (
                    <div key={term.id}>
                      <p className="font-medium text-neutral-900">{term.section_name}</p>
                      <p className="text-xs line-clamp-2">{term.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-neutral-200">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-primary flex items-center gap-2"
                data-testid="next-step-btn"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-secondary flex items-center gap-2"
                data-testid="create-agreement-btn"
              >
                {loading ? <span className="spinner"></span> : "Create Agreement"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
