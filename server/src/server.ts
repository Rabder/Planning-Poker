
// imports 
import express from 'express' // web framework - HTTP request handling
import { createServer } from 'http' // Node's built in HTTP server
import { Server } from 'socket.io' // for real time communication
import cors from 'cors' // enables front (3000) and backend (3001) comms
import { Room } from './types'


// create express application and set the port to 3001

const app = express()
const PORT = process.env.PORT || 3001


// enable client and server connection
app.use(cors());

const httpServer = createServer(app)  // wraps Express app in HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',  // only allow connections from port 3000
    methods: ['GET', 'POST'],         // only GET and POST allowed
  },
})

// in memory storage for all rooms: 
// key: roomID  --->   value: Room object with all of its data
const rooms = new Map<string, Room>()

io.on('connection', (socket) =>{
  console.log('User connected: ', socket.id)

  socket.on('join-room', (data) => {
    const {roomId, playerName} = data

    // get the roomId, create a new room if it doesnt exist
    let room = rooms.get(roomId)
    if (!room) {
      room = {
        id: roomId,
        players: new Map(),
        revealed: false,
      }
      rooms.set(roomId, room)
      console.log('Created new room: ${roomId}')
    }

    // create a player object
    const player = {
      id: socket.id,
      name: playerName,
      socketId: socket.id,
    }

    // add players to the room
    room.players.set(socket.id, player)

    socket.join(roomId)

    // send update to everyone in the room
    io.to(roomId).emit('room-update', {
      players: Array.from(room.players.values()),
      revealed: room.revealed,
    })

    console.log('$(playerName) joined room $(roomId)')
  })


  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id)

    // find the room where the player was in
    rooms.forEach((room, roomId) => {

      // remove player from the room
      room.players.delete(socket.id)

      // broadcast updated player list to anyone in the room
      io.to(roomId).emit('room-update', {
        players: Array.from(room.players.values()),
        revealed: room.revealed,
      })

      console.log('Player ${socket.id} removed from room ${roomId}')

      // if there are no players left, delete the room
      if (room.players.size == 0) {
        rooms.delete(roomId)
        console.log('Room ${roomId} deleted (empty)')
      }
    })
  })
})


httpServer.listen(PORT, () => {
  console.log('Server running on port ${PORT}')
})
