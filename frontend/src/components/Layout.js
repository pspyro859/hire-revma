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
  Plus,
  Receipt,
  Wrench,
  ClipboardCheck,
  QrCode,
  ChevronDown
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  
  const isStaff = user?.role === "staff" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Primary nav items (always visible)
  const primaryNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["customer", "staff", "admin"] },
    { path: "/machines", label: "Equipment", icon: Truck, roles: ["customer", "staff", "admin"] },
    { path: "/inquiries", label: "Inquiries", icon: MessageSquare, roles: ["staff", "admin"] },
    { path: "/quotes", label: "Quotes", icon: Receipt, roles: ["staff", "admin"] },
  ];

  // Tools dropdown items (staff/admin only)
  const toolsNavItems = [
    { path: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["staff", "admin"] },
    { path: "/prestart", label: "Pre-Start Logs", icon: ClipboardCheck, roles: ["staff", "admin"] },
    { path: "/qr-labels", label: "QR Labels", icon: QrCode, roles: ["staff", "admin"] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
  ];

  // All items for mobile menu
  const allNavItems = [...primaryNavItems, ...toolsNavItems];
  
  const filteredPrimaryItems = primaryNavItems.filter(item => item.roles.includes(user?.role));
  const filteredToolsItems = toolsNavItems.filter(item => item.roles.includes(user?.role));
  const filteredAllItems = allNavItems.filter(item => item.roles.includes(user?.role));
  
  // Mobile bottom nav — first 4 items
  const mobileNavItems = filteredPrimaryItems.slice(0, 4);

  // Is any tools page active?
  const isToolsActive = filteredToolsItems.some(
    item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );

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
            <Link to="/dashboard" className="flex items-center gap-3 shrink-0">
              <img 
                src="https://www.revma.com.au/assets/images/revma-logo.jpg" 
                alt="Revma Logo" 
                className="h-10 w-auto"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredPrimaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
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

              {/* Tools dropdown */}
              {filteredToolsItems.length > 0 && (
                <div className="relative" ref={toolsRef}>
                  <button
                    onClick={() => setToolsOpen(!toolsOpen)}
                    className={`nav-link flex items-center gap-1.5 ${isToolsActive ? "nav-link-active" : ""}`}
                  >
                    <Wrench className="w-4 h-4" />
                    Tools
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
                  </button>
                  {toolsOpen && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50">
                      {filteredToolsItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setToolsOpen(false)}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              isActive
                                ? "bg-[#0056D2]/5 text-[#0056D2] font-medium"
                                : "text-neutral-700 hover:bg-neutral-50"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
              {filteredAllItems.map((item) => {
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
        {mobileNavItems.map((item) => {
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
