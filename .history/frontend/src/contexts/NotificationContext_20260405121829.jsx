import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const NotificationContext = createContext()
export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  useEffect(() => { if (user) fetchNotifications() }, [user])

  const fetchNotifications = async () => {
    try { const response = await api.get('/notifications/'); setNotifications(response.data); setUnreadCount(response.data.filter(n => !n.is_read).length) } catch (error) { console.error(error) }
  }

  const markAsRead = async (id) => {
    try { await api.post(`/notifications/${id}/read/`); fetchNotifications() } catch (error) { console.error(error) }
  }

  const markAllAsRead = async () => {
    try { await api.post('/notifications/read-all/'); fetchNotifications() } catch (error) { console.error(error) }
  }

  const addNotification = (notification) => { setNotifications(prev => [notification, ...prev]); setUnreadCount(prev => prev + 1); toast(notification.message) }

  return <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification, fetchNotifications }}>{children}</NotificationContext.Provider>
}