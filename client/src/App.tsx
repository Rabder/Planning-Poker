import { useState, useEffect } from 'react'
import { useSocket } from './hooks/useSocket'
import { Player, GameStage, Story, Room } from './types'


function App() {

  const socket = useSocket(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')

  // state to store list of players in the room
  const [players, setPlayers] = useState<Player[]>([])
  // state to track if votes are hidden or revealed
  const [revealed, setRevealed] = useState(false)

  // form state
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [hasJoined, setHasJoined] = useState(false)

  const [ gameStage, setGameStage ] = useState<GameStage>(GameStage.WAITING)
  const [ modId, setModeratorId ] = useState<string | null>(null)
  const [ currentStory, setCurrentStory ] = useState<Story | null>(null)
  const [ readyPlayers, setReadyPlayers ] = useState<string[]>([])
  const [ countdownRemaining, setCountdown ] = useState<number | null>(null)
  const [ myPlayerId, setPlayerId ] = useState<string | null>(null)
  const [ storyName, setStoryName ] = useState('')
  const [ storyDesc, setStoryDesc ] = useState('')
  const [ selectCard, setSelectCard ] = useState<number | string | null>(null)
  const [ hasVoted, setHasVoted ] = useState<boolean | null>(false) 
  const [ readyToGo, setReadyToGo ] = useState<boolean | null>(false)

  // TODO: when the backend emits the "room-update" event, use the setRoom function to define room

  const cardValues = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕'];

  // Check localStorage on mount and restore session
  useEffect(() => {
    const savedPlayerName = localStorage.getItem('playerName')
    const savedRoomId = localStorage.getItem('roomId')

    if (savedPlayerName && savedRoomId) {
      setPlayerName(savedPlayerName)
      setRoomId(savedRoomId)
      setHasJoined(true)
    }
  }, [])

  // run when socket changes, set up event listeners

  useEffect(() => {

    // dont do anything if the socket is not connected
    if (!socket) return

    // either take the socket.id or null if socket.id === undefined


    socket.on('connect', () => {
      setPlayerId(socket.id ?? null)
      console.log("I am " + socket.id)

      // Auto-rejoin room if we have saved session data
      const savedPlayerName = localStorage.getItem('playerName')
      const savedRoomId = localStorage.getItem('roomId')

      if (savedPlayerName && savedRoomId) {
        console.log('Auto-rejoining room:', savedRoomId)
        socket.emit('join-room', {
          roomId: savedRoomId,
          playerName: savedPlayerName,
        })
      }
    })


    // listen for the room update event from the backend
    // when room update is received, update the local state with the new player list
  socket.on('room-update', (data) => {
    
    console.log('Room update received: ', data)
    console.log('GameStage:', data.gameStage)  // ADD THIS LINE
    setPlayers(data.players)
    setRevealed(data.revealed)
    setGameStage(data.gameStage)
    setModeratorId(data.moderatorId)
    setCurrentStory(data.currentStory)
    setReadyPlayers(data.readyPlayers)
    setCountdown(data.countdownRemaining)

    // Set readyToGo based on whether you're in the readyPlayers array
    if (data.readyPlayers !== undefined){
      const isReady = data.readyPlayers.includes(socket.id)
      setReadyToGo(isReady)
    }
    
    
  })

    // cleanup
    return () => {
      socket.off('room-update')
      socket.off('connect')  // ADD THIS
    }

  }, [socket])

  useEffect(() => {
    console.log("myPlayerId changed to:", myPlayerId)
  }, [myPlayerId])


  const handleJoinRoom = (roomId: String, playerName: String) => {

    // dont do anything if there is no connection, if the player name field is empty or if the room field is empty
    if (!socket || !playerName || !roomId) return

    // Save to localStorage for persistence
    localStorage.setItem('playerName', playerName.toString())
    localStorage.setItem('roomId', roomId.toString())

    setHasJoined(true)
    // send event to backend
    socket.emit('join-room' , {
      roomId,
      playerName,
    })

  }


  const handleVoteStart = () => {
    if (!socket) return
    socket.emit('vote-start', {
      roomId,
    })
  }

  const handleSubmitStory = (name: string, description: string) => {
    if (!socket) return
    socket.emit('submit-story', {
      roomId,
      name, 
      description,
    })
    return
  }


  

  const handleSelectCard = (vote: number | string | null) => {
    if (!socket) return
    if (vote === null) return
    setHasVoted(true)
    socket.emit('select-card', {
      roomId,
      vote
    })
  }


  const handleAfterReveal = () => {
    if (!socket) return
    setHasVoted(false)
    socket.emit('player-ready', {
      roomId
    })
    
  }



  // switched view after player joins (form to enter a room)
  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🃏 Planning Poker</h1>
            <p className="text-gray-600">Agile estimation made simple</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
              <input
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={() => handleJoinRoom(roomId, playerName)}
              disabled={!playerName || !roomId}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
            >
              Join Room
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Socket: {socket ? <span className="text-green-600 font-semibold">Connected ✓</span> : <span className="text-amber-600">Connecting...</span>}
            </p>
          </div>
        </div>
      </div>
    )
  }


  switch (gameStage) {
    case GameStage.WAITING:
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8 flex items-center justify-center">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">⏳ Waiting Room</h1>
                <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                  {readyPlayers.length}/{players.length} Players Ready
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Players in Room:</h2>
                <ul className="space-y-3">
                  {players.map((player, index) => {
                    const isReady = player.readyToStart
                    const isMod = player.id === modId

                    return (
                      <li key={index} className="flex justify-between items-center bg-gray-50 px-5 py-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="font-medium text-gray-800">{player.name}</span>
                          {isMod && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">MOD</span>}
                        </div>
                        <span className={`text-sm font-semibold ${isReady ? 'text-green-600' : 'text-gray-400'}`}>
                          {isReady ? '✓ Ready' : 'Not Ready'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <button
                onClick={handleVoteStart}
                disabled={readyPlayers.includes(myPlayerId ?? '')}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-emerald-600"
              >
                {readyPlayers.includes(myPlayerId ?? '') ? '✓ Ready - Waiting for others' : 'Vote to Start'}
              </button>
            </div>
          </div>
        </div>
      )
      
    case GameStage.STORY_INPUT:
     if (myPlayerId === modId) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8 flex items-center justify-center">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 Story Input</h1>
                  <p className="text-gray-600">You're the moderator - describe the story to estimate</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Story Name</label>
                    <input
                      type="text"
                      id="story-name"
                      name="storyName"
                      placeholder="e.g., User Authentication Feature"
                      onChange={e => setStoryName(e.target.value)}
                      value={storyName}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Story Description</label>
                    <textarea
                      id="story-desc"
                      name="storyDesc"
                      rows={6}
                      placeholder="Describe the story details, acceptance criteria, and any relevant context..."
                      onChange={e => setStoryDesc(e.target.value)}
                      value={storyDesc}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <button
                    onClick={() => handleSubmitStory(storyName, storyDesc)}
                    disabled={!storyName || !storyDesc}
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Story
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
     }
     else {
      const moderatorName = players.find(p => p.id === modId)?.name || 'Moderator'
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-12 max-w-lg text-center">
            <div className="mb-6">
              <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                <svg className="w-12 h-12 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Waiting for Story</h1>
              <p className="text-gray-600">
                <span className="font-semibold text-purple-600">{moderatorName}</span> is preparing the story...
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      )
     }
      
    
    case GameStage.THINKING:
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8 flex items-center justify-center">
          <div className="max-w-5xl mx-auto">
            {/* Story Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-800 mb-3">{currentStory?.name}</h1>
                  <p className="text-gray-600 leading-relaxed">{currentStory?.description}</p>
                </div>
                <div className={`ml-4 px-4 py-2 rounded-full font-bold text-2xl ${countdownRemaining && countdownRemaining < 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                  ⏱️ {countdownRemaining}s
                </div>
              </div>
            </div>

            {/* Card Selection */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                {hasVoted ? '✓ Vote Submitted - Waiting for others...' : 'Select Your Estimate'}
              </h2>

              <div className="flex flex-wrap justify-center gap-3 mb-6 max-w-4xl mx-auto">
                {cardValues.map((value) => (
                  <button
                    key={value}
                    className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center text-xl md:text-2xl font-bold transition-all duration-200 ${
                      selectCard === value
                        ? 'border-blue-600 bg-blue-50 shadow-lg ring-4 ring-blue-200 scale-105'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow-md hover:scale-105'
                    } ${hasVoted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => setSelectCard(value)}
                    disabled={hasVoted? true : false}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleSelectCard(selectCard)}
                disabled={hasVoted || selectCard === null}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600"
              >
                {hasVoted ? '✓ Vote Confirmed' : selectCard === null ? 'Select a Card First' : `Confirm Vote: ${selectCard}`}
              </button>
            </div>
          </div>
        </div>
      )

    case GameStage.REVEAL:
      // Calculate vote statistics
      const votes = players.map(p => p.vote).filter(v => v !== null && v !== undefined)
      const numericVotes = votes.filter(v => typeof v === 'number') as number[]
      const average = numericVotes.length > 0 ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1) : 'N/A'
      const sortedVotes = [...numericVotes].sort((a, b) => a - b)
      const median = sortedVotes.length > 0
        ? sortedVotes.length % 2 === 0
          ? ((sortedVotes[sortedVotes.length / 2 - 1] + sortedVotes[sortedVotes.length / 2]) / 2).toFixed(1)
          : sortedVotes[Math.floor(sortedVotes.length / 2)].toString()
        : 'N/A'

      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8 flex items-center justify-center">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">🎯 Votes Revealed!</h1>
                <p className="text-gray-600">{currentStory?.name}</p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Average</p>
                  <p className="text-4xl font-bold text-blue-600">{average}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center">
                  <p className="text-sm font-semibold text-purple-800 mb-2">Median</p>
                  <p className="text-4xl font-bold text-purple-600">{median}</p>
                </div>
              </div>

              {/* Votes List */}
              <div className="space-y-3 mb-8">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 rounded-lg shadow-sm border border-purple-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">{player.name}</span>
                      {player.id === modId && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">MOD</span>}
                    </div>
                    <div className="text-2xl font-bold text-purple-600 bg-white px-5 py-2 rounded-lg shadow">
                      {player.vote !== null && player.vote !== undefined ? player.vote : '—'}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleAfterReveal()}
                disabled={readyToGo? true : false}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {readyToGo ? '✓ Ready - Waiting for others' : 'Continue to Discussion'}
              </button>
            </div>
          </div>
        </div>
      )

    case GameStage.DISCUSSION:
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8 flex items-center justify-center">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">💬 Discussion Time</h1>
                <p className="text-gray-600">Discuss the estimates and reach consensus</p>
              </div>

              {/* Story Summary */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8 border border-indigo-200">
                <h2 className="font-bold text-gray-800 text-lg mb-2">{currentStory?.name}</h2>
                <p className="text-gray-600 text-sm">{currentStory?.description}</p>
              </div>

              {/* Discussion Prompt */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Discussion Points:</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li>• Were there any outliers in the voting?</li>
                  <li>• Did everyone understand the story the same way?</li>
                  <li>• Are there any risks or unknowns to consider?</li>
                  <li>• Should we re-estimate after discussion?</li>
                </ul>
              </div>

              {/* Previous Votes Summary */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-4">Previous Votes:</h3>
                <div className="flex flex-wrap gap-3">
                  {players.map((player) => (
                    <div key={player.id} className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                      <span className="text-gray-600 text-sm">{player.name}: </span>
                      <span className="font-bold text-indigo-600">{player.vote !== null && player.vote !== undefined ? player.vote : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleAfterReveal()}
                disabled={readyToGo? true : false}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {readyToGo ? '✓ Ready - Waiting for others' : 'Ready for Next Story'}
              </button>
            </div>
          </div>
        </div>
      )

      
  }


    
}

export default App
