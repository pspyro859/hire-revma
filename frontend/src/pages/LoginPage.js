import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Truck, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="max-w-sm w-full mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-neutral-600 hover:text-[#0056D2] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#E63946] rounded-full flex items-center justify-center">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">REVMA HIRE</h1>
              <p className="text-neutral-500 text-sm">Equipment Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Welcome back</h2>
            <p className="text-neutral-600">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="input-field"
                required
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  required
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

            <Button
              type="submit"
              className="w-full btn-primary h-12 text-base"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? <span className="spinner"></span> : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-neutral-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#E63946] font-medium hover:underline">
              Sign up
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-neutral-100 rounded-lg border border-neutral-200">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-medium">Demo Accounts</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Admin:</span>
                <span className="font-mono text-neutral-900">admin@revma.com.au / admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Staff:</span>
                <span className="font-mono text-neutral-900">staff@revma.com.au / staff123</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 hero-gradient opacity-90"></div>
        <img
          src="https://images.unsplash.com/photo-1714575600356-6635434699f8?auto=format&fit=crop&q=80"
          alt="Heavy Equipment"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h2 className="text-4xl font-bold mb-4">Manage Your Equipment Hire</h2>
            <p className="text-white/80 text-lg max-w-md">
              Digital agreements, pre-start checklists, and equipment tracking - all in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
