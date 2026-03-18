import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { getMachines, seedData } from "../lib/api";
import { 
  Truck, 
  FileText, 
  Shield, 
  Phone, 
  MapPin, 
  Mail, 
  CheckCircle2,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        // Seed data if needed
        await seedData();
        // Fetch machines
        const data = await getMachines();
        setMachines(data.slice(0, 6));
      } catch (error) {
        console.error("Error loading machines:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const features = [
    { icon: FileText, title: "Digital Agreements", desc: "Complete hire forms on any device" },
    { icon: Shield, title: "Fully Insured", desc: "All equipment covered for peace of mind" },
    { icon: CheckCircle2, title: "Pre-Start Checks", desc: "Safety verified before every hire" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0056D2] rounded-sm flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-neutral-900">REVMA HIRE</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/inquiry"
                className="hidden sm:inline-flex text-neutral-600 hover:text-[#0056D2] font-medium transition-colors"
              >
                Hire Enquiry
              </Link>
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="border-[#0056D2] text-[#0056D2]"
                data-testid="login-btn"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/register")}
                className="btn-primary hidden sm:inline-flex"
                data-testid="register-btn"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 hero-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Newcastle & Hunter Valley
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                HEAVY EQUIPMENT<br />
                <span className="text-[#FF6B00]">HIRE & AGREEMENTS</span>
              </h1>
              
              <p className="text-lg text-white/80 max-w-lg">
                Digital hire agreements, pre-start checklists, and equipment management for electrical and pump contracting businesses.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={() => navigate("/inquiry")}
                  size="lg"
                  className="btn-secondary text-lg px-8"
                  data-testid="hire-enquiry-btn"
                >
                  Start Hire Enquiry
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => navigate("/register")}
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#0056D2] text-lg px-8"
                >
                  Customer Portal
                </Button>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1714575600356-6635434699f8?auto=format&fit=crop&q=80&w=600"
                alt="Heavy Equipment"
                className="rounded-xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 card-hover">
                  <div className="w-12 h-12 bg-[#0056D2]/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#0056D2]" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{feature.title}</h3>
                  <p className="text-neutral-600">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Equipment Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 uppercase tracking-tight">
              Our Fleet
            </h2>
            <p className="text-neutral-600 mt-3 max-w-2xl mx-auto">
              Well-maintained, fully insured equipment available for daily, weekly, or monthly hire.
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner border-[#0056D2] border-t-transparent w-8 h-8"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {machines.map((machine) => (
                <div key={machine.id} className="card-machine group">
                  <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                    <img
                      src={machine.image_url}
                      alt={machine.name}
                      className="w-full h-full object-cover machine-image"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#0056D2] uppercase tracking-wider">
                        {machine.category}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        machine.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {machine.is_available ? "Available" : "Hired"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1">{machine.name}</h3>
                    <p className="text-sm text-neutral-500 mb-4">{machine.make} {machine.model}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#FF6B00]">${machine.daily_rate}</span>
                      <span className="text-neutral-500">/day</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Button
              onClick={() => navigate("/inquiry")}
              size="lg"
              className="btn-primary"
            >
              Enquire Now
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">REVMA PTY LTD</h2>
              <p className="text-neutral-400 mb-8 max-w-md">
                Electrical and pump contracting specialists serving Newcastle, Hunter Valley, and the Central Coast since 2006.
              </p>
              
              <div className="space-y-4">
                <a href="tel:0448473862" className="flex items-center gap-3 text-white hover:text-[#FF6B00] transition-colors">
                  <Phone className="w-5 h-5" />
                  0448 473 862
                </a>
                <a href="mailto:office@revma.com.au" className="flex items-center gap-3 text-white hover:text-[#FF6B00] transition-colors">
                  <Mail className="w-5 h-5" />
                  office@revma.com.au
                </a>
                <div className="flex items-start gap-3 text-neutral-400">
                  <MapPin className="w-5 h-5 mt-0.5" />
                  <span>Unit 9/12 Channel Road<br />Mayfield West NSW 2304</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="bg-white/5 rounded-xl p-8 border border-white/10">
                <h3 className="text-xl font-bold mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <Link to="/inquiry" className="flex items-center justify-between text-neutral-300 hover:text-white transition-colors">
                    <span>Hire Enquiry</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/login" className="flex items-center justify-between text-neutral-300 hover:text-white transition-colors">
                    <span>Staff Login</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link to="/register" className="flex items-center justify-between text-neutral-300 hover:text-white transition-colors">
                    <span>Customer Registration</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-neutral-500 text-sm">
            <p>ABN: 37 121 035 710 | © {new Date().getFullYear()} Revma Pty Ltd. All rights reserved.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
