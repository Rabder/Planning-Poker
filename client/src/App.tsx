import { useState, useEffect } from 'react'
import { useSocket } from './hooks/useSocket'
import { Player } from './types'


function App() {

  const socket = useSocket('http://localhost:3001')

  // state to store list of players in the room
  const [players, setPlayers] = useState<Player[]>([])
  // state to track if votes are hidden or revealed
  const [revealed, setRevealed] = useState(false)

  // form state
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [hasJoined, setHasJoined] = useState(false)


  // run when socket changes, set up event listeners
  useEffect(() => {

    // dont do anything if the socket is not connected
    if (!socket) return

    // listen for the room update event from the backend
    // when room update is received, update the local state with the new player list
    socket.on('room-update', (data) => {
      console.log('Room update received: ', data)
      setPlayers(data.players)
      setRevealed(data.revealed)
    })

    // cleanup
    return () => {
      socket.off('room-update')
    }

  }, [socket])


  const handleJoinRoom = () => {

    // dont do anything if there is no connection, if the player name field is empty or if the room field is empty
    if (!socket || !playerName || !roomId) return

    // send event to backend
    socket.emit('join-room' , {
      playerName,
      roomId,
    })
    setHasJoined(true)
  }

  // switched view after player joins (form to enter a room)
  if (!hasJoined) {
    return (
      <div>
          <h1>Planning Poker</h1>
          <div>
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>
          <p>Socket status: {socket ? 'Connected ✓' : 'Connecting...'}</p>
        </div>
    )
  }



    return (
      <div>
        <h1>Planning Poker</h1>
        <p>Socket status: {socket ? 'Connected ✓' : 'Connecting...'}</p>
        <p>Players in room: {players.length}</p>
      </div>
    )
}

export default App
