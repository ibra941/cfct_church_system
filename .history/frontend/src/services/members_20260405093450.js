import api from './api'

export const getMembers = async (params) => {
  const response = await api.get('/members/', { params })
  return response.data
}

export const getMember = async (id) => {
  const response = await api.get(`/members/${id}/`)
  return response.data
}

export const createMember = async (data) => {
  const response = await api.post('/members/', data)
  return response.data
}

export const updateMember = async (id, data) => {
  const response = await api.put(`/members/${id}/`, data)
  return response.data
}

export const deleteMember = async (id) => {
  const response = await api.delete(`/members/${id}/`)
  return response.data
}