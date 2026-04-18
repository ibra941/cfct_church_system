import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('access_token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else { setLoading(false) }
  }, [token])

  const fetchUser = async () => {
    try { const response = await axios.get('/api/auth/me/'); setUser(response.data) } catch (error) { logout() } finally { setLoading(false) }
  }

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/token/', { username, password })
      const { access, refresh } = response.data
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`
      setToken(access)
      await fetchUser()
      toast.success('Login successful!')
      return true
    } catch (error) { toast.error('Invalid credentials'); return false }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
    toast.success('Logged out successfully')
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>{children}</AuthContext.Provider>
}