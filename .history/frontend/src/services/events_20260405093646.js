import api from './api'

export const getEvents = async (params) => {
  const response = await api.get('/events/', { params })
  return response.data
}

export const createEvent = async (data) => {
  const response = await api.post('/events/', data)
  return response.data
}