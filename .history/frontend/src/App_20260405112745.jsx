import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/common/PrivateRoute'

// Public Components
import HomePage from './components/public/HomePage'
import Login from './pages/Login'
import Register from './components/public/Register'
import NotFound from './pages/NotFound'

// Dashboard Components
import NationalDashboard from './components/dashboard/NationalDashboard'
import ZoneDashboard from './components/dashboard/ZoneDashboard'
import RegionalDashboard from './components/dashboard/RegionalDashboard'
import DistrictDashboard from './components/dashboard/DistrictDashboard'

// Pages
import MembersList from './pages/MembersList'
import MemberDetails from './pages/MemberDetails'
import Offerings from './pages/Offerings'
import Events from './pages/Events'
import FinanceReports from './pages/FinanceReports'
import Settings from './pages/Settings'
import PrayerRequests from './pages/PrayerRequests'
import Transfers from './pages/Transfers'
import AuditLogs from './pages/AuditLogs'
import RegisterApproval from './pages/RegisterApproval'

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  }, [])

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
                <Route path="/register" element={<Register />} />
                
                {/* Dashboard Routes */}
                <Route path="/dashboard/national" element={<PrivateRoute><NationalDashboard /></PrivateRoute>} />
                <Route path="/dashboard/zone" element={<PrivateRoute><ZoneDashboard /></PrivateRoute>} />
                <Route path="/dashboard/regional" element={<PrivateRoute><RegionalDashboard /></PrivateRoute>} />
                <Route path="/dashboard/district" element={<PrivateRoute><DistrictDashboard /></PrivateRoute>} />
                
                {/* Protected Routes */}
                <Route path="/members" element={<PrivateRoute><MembersList /></PrivateRoute>} />
                <Route path="/members/:id" element={<PrivateRoute><MemberDetails /></PrivateRoute>} />
                <Route path="/offerings" element={<PrivateRoute><Offerings /></PrivateRoute>} />
                <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
                <Route path="/finance" element={<PrivateRoute><FinanceReports /></PrivateRoute>} />
                <Route path="/prayers" element={<PrivateRoute><PrayerRequests /></PrivateRoute>} />
                <Route path="/transfers" element={<PrivateRoute><Transfers /></PrivateRoute>} />
                <Route path="/audit-logs" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
                <Route path="/approvals" element={<PrivateRoute><RegisterApproval /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App