import { useEffect, useRef, useState } from 'react'

export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    wsRef.current = new WebSocket(url)
    wsRef.current.onopen = () => setIsConnected(true)
    wsRef.current.onclose = () => setIsConnected(false)
    wsRef.current.onmessage = (event) => setLastMessage(JSON.parse(event.data))
    return () => wsRef.current.close()
  }, [url])

  const sendMessage = (data) => { if (wsRef.current && isConnected) wsRef.current.send(JSON.stringify(data)) }
  return { isConnected, lastMessage, sendMessage }
}