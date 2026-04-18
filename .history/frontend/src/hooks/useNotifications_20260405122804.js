import { useEffect, useState } from 'react'
import { useNotifications } from '../contexts/NotificationContext'

export const useNotificationsWebSocket = () => {
  const { addNotification } = useNotifications()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/notifications/`)
    ws.onmessage = (event) => { const data = JSON.parse(event.data); addNotification(data) }
    setSocket(ws)
    return () => ws.close()
  }, [addNotification])

  return socket
}