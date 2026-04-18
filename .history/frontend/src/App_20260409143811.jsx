import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import PrivateRoute from "./components/common/PrivateRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public Components
import HomePage from "./components/public/HomePage";
import Register from "./components/public/Register";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";

// Dashboard Components
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DistrictDashboard from "./components/dashboard/DistrictDashboard";
import LocalDashboard from "./components/dashboard/LocalDashboard";
import NationalDashboard from "./components/dashboard/NationalDashboard";
import RegionalDashboard from "./components/dashboard/RegionalDashboard";
import ZoneDashboard from "./components/dashboard/ZoneDashboard";

// Pages
import AdminCMS from "./pages/AdminCMS";
import AuditLogs from "./pages/AuditLogs";
import Churches from "./pages/Churches";
import Departments from "./pages/Departments";
import Events from "./pages/Events";
import FinanceReports from "./pages/FinanceReports";
import MemberDetails from "./pages/MemberDetails";
import MembersList from "./pages/MembersList";
import News from "./pages/News";
import Notifications from "./pages/Notifications";
import Offerings from "./pages/Offerings";
import PrayerRequests from "./pages/PrayerRequests";
import RegisterApproval from "./pages/RegisterApproval";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
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
    default:
      return <Navigate to="/members" />;
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
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Toaster position="top-right" />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/register" element={<Register />} />

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
                  <Route path="national" element={<NationalDashboard />} />
                  <Route path="zone" element={<ZoneDashboard />} />
                  <Route path="regional" element={<RegionalDashboard />} />
                  <Route path="district" element={<DistrictDashboard />} />
                </Route>

                {/* Main App Routes - Using DashboardLayout as wrapper */}
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

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
