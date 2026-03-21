import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import MachinesPage from "./pages/MachinesPage";
import NewAgreementPage from "./pages/NewAgreementPage";
import AgreementDetailPage from "./pages/AgreementDetailPage";
import InquiriesPage from "./pages/InquiriesPage";
import SettingsPage from "./pages/SettingsPage";
import CustomerInquiryPage from "./pages/CustomerInquiryPage";
import QuotesPage from "./pages/QuotesPage";
import CreateQuotePage from "./pages/CreateQuotePage";
import QuoteDetailPage from "./pages/QuoteDetailPage";
import CustomerQuotePage from "./pages/CustomerQuotePage";

// New pages
import PublicMachinePage from "./pages/PublicMachinePage";
import PrestartChecklistPage from "./pages/PrestartChecklistPage";
import MaintenancePage from "./pages/MaintenancePage";
import PrestartSubmissionsPage from "./pages/PrestartSubmissionsPage";
import QRLabelsPage from "./pages/QRLabelsPage";

import "@/App.css";

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner border-[#0056D2] border-t-transparent"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="spinner border-[#0056D2] border-t-transparent"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/inquiry" element={<CustomerInquiryPage />} />
      <Route path="/quote/:quoteId" element={<CustomerQuotePage />} />

      {/* Public Machine Pages (QR Code targets — no auth required) */}
      <Route path="/m/:qrCodeId" element={<PublicMachinePage />} />
      <Route path="/m/:qrCodeId/prestart" element={<PrestartChecklistPage />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/machines" element={<ProtectedRoute><MachinesPage /></ProtectedRoute>} />
      <Route path="/agreements/new" element={<ProtectedRoute><NewAgreementPage /></ProtectedRoute>} />
      <Route path="/agreements/:id" element={<ProtectedRoute><AgreementDetailPage /></ProtectedRoute>} />
      
      {/* Staff/Admin Only Routes */}
      <Route path="/inquiries" element={<ProtectedRoute roles={["staff", "admin"]}><InquiriesPage /></ProtectedRoute>} />
      <Route path="/quotes" element={<ProtectedRoute roles={["staff", "admin"]}><QuotesPage /></ProtectedRoute>} />
      <Route path="/quotes/new" element={<ProtectedRoute roles={["staff", "admin"]}><CreateQuotePage /></ProtectedRoute>} />
      <Route path="/quotes/:id" element={<ProtectedRoute roles={["staff", "admin"]}><QuoteDetailPage /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute roles={["staff", "admin"]}><MaintenancePage /></ProtectedRoute>} />
      <Route path="/prestart" element={<ProtectedRoute roles={["staff", "admin"]}><PrestartSubmissionsPage /></ProtectedRoute>} />
      <Route path="/qr-labels" element={<ProtectedRoute roles={["staff", "admin"]}><QRLabelsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={["admin"]}><SettingsPage /></ProtectedRoute>} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
