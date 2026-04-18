import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(username, password)
    setLoading(false)
    if (success) navigate('/dashboard/national')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex justify-center items-center py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div><h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">{language === 'sw' ? 'Ingia kwenye Mfumo' : 'Sign in to System'}</h2></div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <input id="username" type="text" required className="input" placeholder={language === 'sw' ? 'Jina la Mtumiaji' : 'Username'} value={username} onChange={(e) => setUsername(e.target.value)} />
              <input id="password" type="password" required className="input" placeholder={language === 'sw' ? 'Nenosiri' : 'Password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? (language === 'sw' ? 'Inaingiza...' : 'Logging in...') : (language === 'sw' ? 'Ingia' : 'Sign in')}</button>
            <p className="text-center text-sm"><Link to="/register" className="text-primary-600 hover:text-primary-500">{language === 'sw' ? 'Huna akaunti? Jiunge nasi' : "Don't have an account? Join us"}</Link></p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login