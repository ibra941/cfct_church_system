import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/common/PrivateRoute'
import HomePage from './components/public/HomePage'
import Login from './pages/Login'
import MembersList from './pages/MembersList'
import Offerings from './pages/Offerings'
import Events from './pages/Events'
import FinanceReports from './pages/FinanceReports'
import Settings from './pages/Settings'
import PrayerRequests from './pages/PrayerRequests'
import NotFound from './pages/NotFound'

function App() {
  useEffect(() => {
    // Check for saved theme preference
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
                
                {/* Protected Routes */}
                <Route path="/members" element={
                  <PrivateRoute>
                    <MembersList />
                  </PrivateRoute>
                } />
                <Route path="/offerings" element={
                  <PrivateRoute>
                    <Offerings />
                  </PrivateRoute>
                } />
                <Route path="/events" element={
                  <PrivateRoute>
                    <Events />
                  </PrivateRoute>
                } />
                <Route path="/finance" element={
                  <PrivateRoute>
                    <FinanceReports />
                  </PrivateRoute>
                } />
                <Route path="/prayers" element={
                  <PrivateRoute>
                    <PrayerRequests />
                  </PrivateRoute>
                } />
                <Route path="/settings" element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                } />
                
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