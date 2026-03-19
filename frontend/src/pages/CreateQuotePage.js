import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { getInquiries, getMachines, createQuote, sendQuote } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarIcon,
  Plus,
  Trash2,
  Send,
  FileText,
  Calculator
} from "lucide-react";

export default function CreateQuotePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [machines, setMachines] = useState([]);
  const [inquiry, setInquiry] = useState(location.state?.inquiry || null);
  
  const [formData, setFormData] = useState({
    customer_name: inquiry ? `${inquiry.first_name} ${inquiry.last_name}` : "",
    customer_email: inquiry?.email || "",
    customer_phone: inquiry?.phone || "",
    hire_start_date: inquiry?.hire_start_date ? new Date(inquiry.hire_start_date) : null,
    hire_end_date: inquiry?.hire_end_date ? new Date(inquiry.hire_end_date) : null,
    delivery_method: inquiry?.delivery_method || "pickup",
    delivery_address: inquiry?.delivery_address || "",
    delivery_fee: 0,
    notes: "",
    valid_until: addDays(new Date(), 7),
  });
  
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const machinesData = await getMachines();
        setMachines(machinesData);
        
        // Pre-populate line items from inquiry equipment
        if (inquiry?.equipment) {
          const items = inquiry.equipment.map(eqName => {
            const machine = machinesData.find(m => m.name === eqName);
            if (machine) {
              return {
                machine_id: machine.id,
                machine_name: machine.name,
                rate_type: inquiry.hire_rate_preference || "daily",
                rate: machine[`${inquiry.hire_rate_preference || "daily"}_rate`],
                quantity: 1,
                subtotal: machine[`${inquiry.hire_rate_preference || "daily"}_rate`]
              };
            }
            return null;
          }).filter(Boolean);
          setLineItems(items);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [inquiry]);

  const addLineItem = () => {
    setLineItems([...lineItems, {
      machine_id: "",
      machine_name: "",
      rate_type: "daily",
      rate: 0,
      quantity: 1,
      subtotal: 0
    }]);
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    // If machine changed, update name and rate
    if (field === "machine_id") {
      const machine = machines.find(m => m.id === value);
      if (machine) {
        updated[index].machine_name = machine.name;
        updated[index].rate = machine[`${updated[index].rate_type}_rate`];
        updated[index].subtotal = machine[`${updated[index].rate_type}_rate`] * updated[index].quantity;
      }
    }
    
    // If rate type changed, update rate
    if (field === "rate_type") {
      const machine = machines.find(m => m.id === updated[index].machine_id);
      if (machine) {
        updated[index].rate = machine[`${value}_rate`];
        updated[index].subtotal = machine[`${value}_rate`] * updated[index].quantity;
      }
    }
    
    // Recalculate subtotal
    if (field === "rate" || field === "quantity") {
      updated[index].subtotal = updated[index].rate * updated[index].quantity;
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const securityBond = lineItems.reduce((sum, item) => {
      const machine = machines.find(m => m.id === item.machine_id);
      return sum + (machine?.security_bond || 0);
    }, 0);
    const total = subtotal + formData.delivery_fee + securityBond;
    return { subtotal, securityBond, total };
  };

  const handleSubmit = async (sendToCustomer = false) => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one equipment item");
      return;
    }
    
    setSubmitting(true);
    try {
      const quoteData = {
        inquiry_id: inquiry?.id || "",
        customer_email: formData.customer_email,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        line_items: lineItems,
        hire_start_date: format(formData.hire_start_date, "yyyy-MM-dd"),
        hire_end_date: format(formData.hire_end_date, "yyyy-MM-dd"),
        delivery_method: formData.delivery_method,
        delivery_address: formData.delivery_address,
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        notes: formData.notes,
        valid_until: format(formData.valid_until, "yyyy-MM-dd"),
      };
      
      const quote = await createQuote(quoteData);
      
      if (sendToCustomer) {
        await sendQuote(quote.id);
        toast.success("Quote created and sent to customer!");
      } else {
        toast.success("Quote saved as draft");
      }
      
      navigate("/quotes");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create quote");
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#E63946] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Create Quote</h1>
            <p className="text-neutral-600">Generate a hire quote for the customer</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Customer Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="input-field"
                    data-testid="customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="input-field"
                    data-testid="customer-email"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="input-field"
                    data-testid="customer-phone"
                  />
                </div>
              </div>
            </div>

            {/* Hire Period */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Hire Period</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="input-field w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.hire_start_date ? format(formData.hire_start_date, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.hire_start_date}
                        onSelect={(date) => setFormData({ ...formData, hire_start_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="input-field w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.hire_end_date ? format(formData.hire_end_date, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.hire_end_date}
                        onSelect={(date) => setFormData({ ...formData, hire_end_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Equipment Line Items */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-neutral-900">Equipment</h2>
                <Button onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No equipment added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={index} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="grid sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Equipment</Label>
                          <Select
                            value={item.machine_id}
                            onValueChange={(value) => updateLineItem(index, "machine_id", value)}
                          >
                            <SelectTrigger className="input-field">
                              <SelectValue placeholder="Select equipment" />
                            </SelectTrigger>
                            <SelectContent>
                              {machines.map((machine) => (
                                <SelectItem key={machine.id} value={machine.id}>
                                  {machine.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Rate Type</Label>
                          <Select
                            value={item.rate_type}
                            onValueChange={(value) => updateLineItem(index, "rate_type", value)}
                          >
                            <SelectTrigger className="input-field">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Rate</Label>
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateLineItem(index, "rate", parseFloat(e.target.value) || 0)}
                              className="input-field"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-200">
                        <span className="text-sm text-neutral-600">Subtotal:</span>
                        <span className="font-bold text-[#E63946]">${item.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Delivery</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Method</Label>
                  <Select
                    value={formData.delivery_method}
                    onValueChange={(value) => setFormData({ ...formData, delivery_method: value })}
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup from Mayfield West</SelectItem>
                      <SelectItem value="delivery">Delivery to Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Fee</Label>
                  <Input
                    type="number"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                {formData.delivery_method === "delivery" && (
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Delivery Address</Label>
                    <Input
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      className="input-field"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Notes</h2>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes for the customer..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quote Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal:</span>
                  <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                </div>
                {formData.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Delivery Fee:</span>
                    <span className="font-medium">${formData.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Security Bond:</span>
                  <span className="font-medium">${totals.securityBond.toFixed(2)}</span>
                </div>
                <div className="border-t border-neutral-200 pt-3 flex justify-between">
                  <span className="font-bold text-neutral-900">Total:</span>
                  <span className="font-bold text-xl text-[#E63946]">${totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <Label>Quote Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="input-field w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.valid_until ? format(formData.valid_until, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.valid_until}
                      onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || lineItems.length === 0}
                  className="w-full btn-primary"
                  data-testid="send-quote-btn"
                >
                  {submitting ? (
                    <span className="spinner"></span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Quote to Customer
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || lineItems.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  Save as Draft
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
