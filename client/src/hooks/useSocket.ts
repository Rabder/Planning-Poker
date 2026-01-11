import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export const useSocket = (serverUrl: string) => {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketInstance = io(serverUrl)
    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [serverUrl])

  return socket
}
