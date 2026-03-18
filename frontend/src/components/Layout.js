import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  Truck, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Plus
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isStaff = user?.role === "staff" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["customer", "staff", "admin"] },
    { path: "/machines", label: "Equipment", icon: Truck, roles: ["customer", "staff", "admin"] },
    { path: "/inquiries", label: "Inquiries", icon: MessageSquare, roles: ["staff", "admin"] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
  ];
  
  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));
  
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E63946] rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-neutral-900 hidden sm:block">
                REVMA HIRE
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link flex items-center gap-2 ${isActive ? "nav-link-active" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            
            {/* Right side */}
            <div className="flex items-center gap-3">
              {isStaff && (
                <Button
                  onClick={() => navigate("/agreements/new")}
                  className="btn-secondary hidden sm:flex items-center gap-2"
                  size="sm"
                  data-testid="new-agreement-btn"
                >
                  <Plus className="w-4 h-4" />
                  New Hire
                </Button>
              )}
              
              {/* User menu */}
              <div className="hidden md:flex items-center gap-3 border-l border-neutral-200 pl-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#E63946]/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-[#E63946]" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900">{user?.full_name}</p>
                    <p className="text-neutral-500 capitalize text-xs">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-neutral-500 hover:text-red-600 transition-colors"
                  title="Logout"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-neutral-600"
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white animate-fade-in">
            <nav className="px-4 py-3 space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      isActive ? "bg-[#0056D2] text-white" : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              
              <div className="border-t border-neutral-200 pt-3 mt-3">
                <div className="px-4 py-2 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E63946]/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#E63946]" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{user?.full_name}</p>
                    <p className="text-neutral-500 capitalize text-sm">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-2 flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav md:hidden">
        {filteredNavItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isStaff && (
          <Link to="/agreements/new" className="mobile-nav-item">
            <div className="w-10 h-10 bg-[#E63946] rounded-full flex items-center justify-center -mt-4 shadow-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}
      </nav>
    </div>
  );
}
