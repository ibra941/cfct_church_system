import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import CookieConsentBanner from "./components/common/CookieConsentBanner";
import PrivateRoute from "./components/common/PrivateRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public Components
import HomePage from "./components/public/HomePage";
import Register from "./components/public/Register";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import ManageUsers from "./pages/ManageUsers";
import NotFound from "./pages/NotFound";

// Dashboard Components
import ChurchDashboard from "./components/dashboard/ChurchDashboard";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DistrictDashboard from "./components/dashboard/DistrictDashboard";
import MemberDashboard from "./components/dashboard/MemberDashboard";
import NationalDashboard from "./components/dashboard/NationalDashboard";
import RegionalDashboard from "./components/dashboard/RegionalDashboard";
import ZoneDashboard from "./components/dashboard/ZoneDashboard";

// Pages
import AdminCMS from "./pages/AdminCMS";
import Attendance from "./pages/Attendance";
import AuditLogs from "./pages/AuditLogs";
import ChurchDetails from "./pages/ChurchDetails";
import ChurchDirectory from "./pages/ChurchDirectory";
import Churches from "./pages/Churches";
import DepartmentDetails from "./pages/DepartmentDetails";
import Departments from "./pages/Departments";
import EventDetails from "./pages/EventDetails";
import Events from "./pages/Events";
import FinanceReports from "./pages/FinanceReports";
import FinancialOversight from "./pages/FinancialOversight";
import GivingHistory from "./pages/GivingHistory";
import MemberDetails from "./pages/MemberDetails";
import MembersList from "./pages/MembersList";
import News from "./pages/News";
import Notifications from "./pages/Notifications";
import Offerings from "./pages/Offerings";
import PastoralCare from "./pages/PastoralCare";
import PrayerRequests from "./pages/PrayerRequests";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AddMember from "./pages/AddMember";
import RegisterApproval from "./pages/RegisterApproval";
import Reports from "./pages/Reports";
import ResetPassword from "./pages/ResetPassword";
import SermonArchive from "./pages/SermonArchive";
import ServicesPlanning from "./pages/ServicesPlanning";
import Settings from "./pages/Settings";
import TermsOfService from "./pages/TermsOfService";
import Transfers from "./pages/Transfers";

// Dashboard Redirect Component
const DashboardRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case "national_leader":
      return <Navigate to="/dashboard/national" />;
    case "zone_leader":
      return <Navigate to="/dashboard/zone" />;
    case "regional_leader":
      return <Navigate to="/dashboard/regional" />;
    case "district_leader":
      return <Navigate to="/dashboard/district" />;
    case "local_leader":
      return <Navigate to="/dashboard/church" />;
    case "local_member":
      return <Navigate to="/dashboard/member" />;
    default:
      return <Navigate to="/dashboard/member" />;
  }
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Toaster position="top-right" />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />

                {/* Dashboard Routes - Nested */}
                <Route
                  path="/dashboard/*"
                  element={
                    <PrivateRoute>
                      <DashboardLayout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<DashboardRedirect />} />
                  <Route
                    path="national"
                    element={
                      <PrivateRoute requiredRole="national_leader">
                        <NationalDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="zone"
                    element={
                      <PrivateRoute requiredRole="zone_leader">
                        <ZoneDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="regional"
                    element={
                      <PrivateRoute requiredRole="regional_leader">
                        <RegionalDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="district"
                    element={
                      <PrivateRoute requiredRole="district_leader">
                        <DistrictDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="church"
                    element={
                      <PrivateRoute requiredRole="local_leader">
                        <ChurchDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="member"
                    element={
                      <PrivateRoute requiredRole="local_member">
                        <MemberDashboard />
                      </PrivateRoute>
                    }
                  />
                  {/* Drill-down routes: any authenticated leader can navigate the hierarchy */}
                  <Route
                    path="zone/:id"
                    element={
                      <PrivateRoute>
                        <ZoneDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="region/:id"
                    element={
                      <PrivateRoute>
                        <RegionalDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="district/:id"
                    element={
                      <PrivateRoute>
                        <DistrictDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="church/:id"
                    element={
                      <PrivateRoute>
                        <ChurchDashboard />
                      </PrivateRoute>
                    }
                  />
                  {/* Leader drill-down to a specific member's dashboard */}
                  <Route
                    path="member/:id"
                    element={
                      <PrivateRoute>
                        <MemberDashboard />
                      </PrivateRoute>
                    }
                  />
                </Route>

                {/* Main App Routes - Using DashboardLayout as wrapper */}
                <Route
                  path="/users"
                  element={
                    <PrivateRoute requiredRole="national_leader">
                      <DashboardLayout>
                        <ManageUsers />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/members"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <MembersList />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/members/add"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <AddMember />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/members/:id"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <MemberDetails />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/churches/:id"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <ChurchDetails />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/churches"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Churches />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/offerings/add"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Offerings />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/offerings"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Offerings />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/events/add"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Events />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/events/:id"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <EventDetails />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/events"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Events />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/finance"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <FinanceReports />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/transfers"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Transfers />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <AuditLogs />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/approvals"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <RegisterApproval />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/departments"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Departments />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/departments/:id"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <DepartmentDetails />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/giving-history"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <GivingHistory />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Attendance />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financial-oversight"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <FinancialOversight />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/pastoral-care"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <PastoralCare />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/services-planning"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <ServicesPlanning />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/news"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <News />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Notifications />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/prayers"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <PrayerRequests />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Reports />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cms"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <AdminCMS />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/church-directory"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <ChurchDirectory />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sermon-archive"
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <SermonArchive />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieConsentBanner />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
