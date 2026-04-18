import api from './api'

export const login = async (username, password) => {
  const response = await api.post('/token/', { username, password })
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me/')
  return response.data
}

export const register = async (userData) => {
  const response = await api.post('/members/register/', userData)
  return response.data
}