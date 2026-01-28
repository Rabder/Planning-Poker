
// imports
import 'dotenv/config' // load environment variables first
import express from 'express' // web framework - HTTP request handling
import { createServer } from 'http' // Node's built in HTTP server
import { Server } from 'socket.io' // for real time communication
import cors from 'cors' // enables front (3000) and backend (3001) comms
import { Room, GameStage } from './types'


// create express application and set the port to 3001

const app = express()
const PORT = process.env.PORT || 3001


// enable client and server connection
app.use(cors());

const httpServer = createServer(app)  // wraps Express app in HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',  // allow connections from frontend
    methods: ['GET', 'POST'],         // only GET and POST allowed
    credentials: true,
  },
})

// in memory storage for all rooms: 
// key: roomID  --->   value: Room object with all of its data
const rooms = new Map<string, Room>()

// send/broadcast room state to all players in the room
function broadcastRoomUpdate(room: Room, io: Server) {
  io.to(room.id).emit('room-update', {
    // 
    players: Array.from(room.players.values()),
    currentStory: room.currentStory,           // what story are players estimating?
    gameStage: room.gameStage,                 // what stage of the game are we in?
    moderatorId: room.moderatorId,          // who is the current moderator (socket id)? null when game is in waiting stage
    readyPlayers: Array.from(room.readyPlayers),
    

    // if countdown is active, make sure it never exceeds 5 seconds 
    // if countdown is not active, return undefined
    countdownRemaining: room.countdownStartTime ? 
                         Math.max(0, 5 - Math.floor((Date.now() - room.countdownStartTime) / 1000)) :
                         undefined,
  })
}

function selectRandomMod(room: Room): string {
  const playerIds = Array.from(room.players.keys())
  const randomIdx = Math.floor(Math.random() * playerIds.length)
  return playerIds[randomIdx]
}

function allPlayersVoted(room: Room): boolean {
  const playerList = Array.from(room.players.values())
  return playerList.every(player => player.vote !== undefined)
}

function allPlayersReady(room: Room): boolean {
  return room.readyPlayers.size === room.players.size
}

function rotateToNextModerator(room: Room) {

  // keys of map are the player ids
  const playerIds = Array.from(room.players.keys())
  // find moderatorId from array
  const moderatorIdx = playerIds.findIndex(playerId => playerId === room.moderatorId)
  // compute next moderator in the round, circular flow
  const newModIdx = (moderatorIdx + 1) % playerIds.length
  // get id from the player at the newModIx
  room.moderatorId = playerIds[newModIdx]

}

// state machine that handles the different stages in the game
function transitionGameStage(room: Room, newStage: GameStage, io: Server) {
  room.gameStage = newStage
  const players = Array.from(room.players.values())
  switch(newStage) {
    case GameStage.WAITING:
      players.forEach(player => player.readyToStart = false)
      break
    case GameStage.STORY_INPUT:           // clear 
      room.readyPlayers.clear()
      room.currentStory = null
      room.revealed = false
      players.forEach(player => {
        player.vote = undefined
        player.ready = false
      })
      break
    case GameStage.THINKING:
      players.forEach(player => player.vote = undefined)
      break
    case GameStage.REVEAL:
      room.revealed = true
      room.readyPlayers.clear()
      break
    case GameStage.DISCUSSION:
      room.readyPlayers.clear()
      break
  }
  broadcastRoomUpdate(room, io)
}

function startCountdownTimer(room: Room, io: Server) {
    if (room.countdownTimer !== null) {
      clearTimeout(room.countdownTimer)
    }
    room.countdownStartTime = Date.now()

    // broadcast every 1 seconds (1000 ms)
    const interval = setInterval(() => broadcastRoomUpdate(room, io), 1000)
    const timeout = setTimeout(()=>{
      transitionGameStage(room, GameStage.REVEAL, io);
      clearInterval(interval);
      room.countdownTimer = null;
      room.countdownStartTime = null}, 5000)
    room.countdownTimer = timeout

}


io.on('connection', (socket) =>{
  console.log('User connected: ', socket.id)

  socket.on('join-room', (data) => {
    const {roomId, playerName} = data

    // get the roomId, create a new room if it doesnt exist
    let room = rooms.get(roomId)
    console.log(`Room ID is ${room}`)
    if (!room) {
      room = {
        id: roomId,
        players: new Map(),
        revealed: false,
        gameStage: GameStage.WAITING,
        currentStory: null,
        moderatorId: null,
        readyPlayers: new Set(),
        countdownTimer: null,
        countdownStartTime: null

      }
      rooms.set(roomId, room)
      console.log(`Created new room: ${roomId}`)
      console.log(`Room gameStage: }`)  
    }

    // create a player object
    const player = {
      id: socket.id,
      name: playerName,
      socketId: socket.id,
      readyToStart: false,
      ready: false
    }

    // add players to the room
    room.players.set(socket.id, player)

    socket.join(roomId)

    // send update to everyone in the room
    broadcastRoomUpdate(room, io)

    console.log(`${playerName} joined room ${roomId}`)
  })

  // event listener for the start of the voting section
  socket.on('vote-start', (data) => {
    const { roomId } = data
    let room = rooms.get(roomId)
    if (!room) return
    room.readyPlayers.add(socket.id)
    
    if (room !== undefined) {
        let player = room.players.get(socket.id)
        if (!player) return
        player.readyToStart = true
        const players = Array.from(room.players.values())
        const allReady = players.every(p => p.readyToStart === true)
        if (allReady) {
          room.moderatorId = selectRandomMod(room)
          console.log(`Moderator in room ${roomId} is ${room.moderatorId}`)
          transitionGameStage(room, GameStage.STORY_INPUT, io)
        }
        else {
          broadcastRoomUpdate(room, io)
        }
    }
  })

  // event listener for votes from client, extract room Id and vote from client
  

  socket.on('reveal-vote', (data) => {

    const {roomId} = data
    const room = rooms.get(roomId)
    if (!room) return

    // set revealed field to true
    room.revealed = true

    // broadcast reveal to entire room
    io.to(roomId).emit('room-update', {
      players: Array.from(room.players.values()),
      revealed: room.revealed,
    })

    console.log(`Votes revealed in room ${roomId}`)
  })

  // switch from STORY INPUT to THINKING state
  socket.on('submit-story', (data) => {
    const { roomId, name, description } = data
    let room = rooms.get(roomId)
    if (!room) return
    if (socket.id === room.moderatorId) {               // if the player submiting the story is the mod...
      room.currentStory = { name, description }
      transitionGameStage(room, GameStage.THINKING, io)  // changes game state and clears the player votes
      console.log(`Story submitted in room ${roomId}`)
    }
    else {
      console.log(`Could not validate moderator in ${roomId}`) 
    }
  })


  // LEGACY FUNCTION
  // socket.on('submit-vote', (data) => {

  //   const { roomId, vote } = data
  //   const room = rooms.get(roomId)

  //   // safety check
  //   if (!room) return

  //   // find the player in the room (extract their socket id)
  //   const player = room.players.get(socket.id)
  //   if (!player) return

  //   // update player's vote (remember the optional field in the Player object)
  //   player.vote = vote

  //   // broadcast update to everyone in the room
  //   io.to(roomId).emit('room-update', {
  //     players: Array.from(room.players.values()),
  //     revealed: room.revealed,
  //   })
  //   console.log(`${player.name} voted ${vote}`)
  // })

  socket.on('select-card', (data) => {
    const { roomId, vote } = data
    let room = rooms.get(roomId)
    if (!room) return
    if (room.gameStage !== GameStage.THINKING) return
    let player = room.players.get(socket.id)
    if (!player) return
    player.vote = vote

    if (!allPlayersVoted(room)) {
      broadcastRoomUpdate(room, io)
      return
    }

    startCountdownTimer(room, io)       // everyone is ready, start 5sec timer
    return
  })
  

  socket.on('player-ready', (data) => {
    const { roomId } = data
    const room = rooms.get(roomId)
    if (!room) return
    room.readyPlayers.add(socket.id)
    if (allPlayersReady(room) && room.gameStage === GameStage.REVEAL) {
      transitionGameStage(room, GameStage.DISCUSSION, io)
      console.log(`Moving to DISCUSSION state in room ${roomId}`)
    }
    else if (allPlayersReady(room) && room.gameStage === GameStage.DISCUSSION) {
      rotateToNextModerator(room)
      transitionGameStage(room, GameStage.STORY_INPUT, io)
      console.log(`New moderator in room ${roomId}`)
      console.log(`Moving to STORY_INPUT state in room ${roomId}`)
    }
    else if (!allPlayersReady(room)) {
      broadcastRoomUpdate(room, io)
      console.log(`Waiting for players to be ready in room ${roomId}`)
    }
    broadcastRoomUpdate(room, io)
  })


  // TODO: fix double rotation issue when game is in the DISCUSSION stage
  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id)

    // find the room where the player was in
    rooms.forEach((room, roomId) => {

      // remove player from the room, need to think about the implications 
      // depending on the game stage at the moment
      room.players.delete(socket.id)
      room.readyPlayers.delete(socket.id)



      // if moderator leaves during story input, restart the game and choose new mod
      if (socket.id === room.moderatorId) {
        if (room.gameStage === GameStage.STORY_INPUT) {
          console.log(`Mod disconnected, restarting game in room ${roomId}`)
          room.moderatorId = null
          transitionGameStage(room, GameStage.WAITING, io)
        }
        else {
          rotateToNextModerator(room)
        }
      }


      if (allPlayersReady(room) && room.gameStage === GameStage.REVEAL) {
        transitionGameStage(room, GameStage.DISCUSSION, io)
        console.log(`Moving to DISCUSSION state in room ${roomId}`)
      }
      else if (allPlayersReady(room) && room.gameStage === GameStage.DISCUSSION) {
        rotateToNextModerator(room)
        transitionGameStage(room, GameStage.STORY_INPUT, io)
        console.log(`New moderator in room ${roomId}`)
        console.log(`Moving to STORY_INPUT state in room ${roomId}`)
      }
      else if (allPlayersVoted(room) && room.gameStage === GameStage.THINKING) {
        startCountdownTimer(room, io)
      }
      else if (!allPlayersReady(room)) {
        broadcastRoomUpdate(room, io)
        console.log(`Waiting for players to be ready in room ${roomId}`)
      }


      // broadcast updated player list to anyone in the room
      broadcastRoomUpdate(room, io)

      console.log(`Player ${socket.id} removed from room ${roomId}`)

      // if there are no players left, delete the room
      if (room.players.size == 0) {
        if (room.countdownTimer !== null) {
          room.countdownTimer = null
        }
        rooms.delete(roomId)
        console.log(`Room ${roomId} deleted (empty)`)
      }
    })
  })
})


httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
