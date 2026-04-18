import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

const Logout = () => {
  const { logout, user } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()

  useEffect(() => {
    // Automatically logout when component mounts
    const performLogout = async () => {
      await logout()
      // Redirect to login after a short delay to show the logout message
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    }

    performLogout()
  }, [logout, navigate])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex justify-center items-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {language === 'sw' ? 'Umetoka Kwenye Mfumo' : 'Logged Out Successfully'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {language === 'sw'
                  ? `Asante ${user?.full_name || user?.username || 'Mtumiaji'} kwa kutumia mfumo wetu.`
                  : `Thank you ${user?.full_name || user?.username || 'User'} for using our system.`
                }
              </p>
            </div>

            <div className="space-y-4">
              <LoadingSpinner />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'sw' ? 'Unaelekezwa kwenye ukurasa wa kuingia...' : 'Redirecting to login page...'}
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full"
              >
                {language === 'sw' ? 'Rudi Kuingia' : 'Back to Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Logout
