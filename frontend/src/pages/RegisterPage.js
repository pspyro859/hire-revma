import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Truck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    company_name: "",
    abn: "",
    drivers_licence: "",
    address: "",
  });
  const [isBusiness, setIsBusiness] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        ...formData,
        role: "customer",
        company_name: isBusiness ? formData.company_name : null,
        abn: isBusiness ? formData.abn : null,
      };
      
      await register(userData);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Left Panel - Image (hidden on mobile) */}
      <div className="hidden lg:block lg:w-2/5 relative">
        <div className="absolute inset-0 hero-gradient opacity-90"></div>
        <img
          src="https://images.unsplash.com/photo-1768666197979-f8f0777ef04c?auto=format&fit=crop&q=80"
          alt="Excavator"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-3xl font-bold mb-3">Join Revma Hire</h2>
            <p className="text-white/80 max-w-sm">
              Create an account to view your hire agreements, track equipment, and manage your rentals online.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-16 xl:px-20 py-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#0056D2] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0056D2] rounded-sm flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-neutral-900">REVMA HIRE</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">Create Account</h2>
            <p className="text-neutral-600 text-sm">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="input-field"
                  required
                  data-testid="fullname-input"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0400 000 000"
                  className="input-field"
                  required
                  data-testid="phone-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="input-field"
                required
                data-testid="email-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className="input-field pr-10"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drivers_licence">Driver's Licence Number</Label>
              <Input
                id="drivers_licence"
                name="drivers_licence"
                value={formData.drivers_licence}
                onChange={handleChange}
                placeholder="Licence number"
                className="input-field"
                data-testid="licence-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Your address"
                className="input-field"
                data-testid="address-input"
              />
            </div>

            {/* Business checkbox */}
            <div className="flex items-center gap-3 py-2">
              <Checkbox
                id="is_business"
                checked={isBusiness}
                onCheckedChange={setIsBusiness}
                data-testid="business-checkbox"
              />
              <Label htmlFor="is_business" className="text-sm cursor-pointer">
                I'm registering as a business
              </Label>
            </div>

            {isBusiness && (
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Company Pty Ltd"
                    className="input-field"
                    data-testid="company-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="abn">ABN</Label>
                  <Input
                    id="abn"
                    name="abn"
                    value={formData.abn}
                    onChange={handleChange}
                    placeholder="00 000 000 000"
                    className="input-field"
                    data-testid="abn-input"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full btn-primary h-12 text-base mt-6"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? <span className="spinner"></span> : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-neutral-600 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-[#0056D2] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
