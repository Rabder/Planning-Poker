export interface Room {
  id: string
  players: Map<string, Player>    // key: player ID  -->   value: Player object
  revealed: boolean               // true if votes have been revealed, false otherwise
  currentStory?: string           // what story are players estimating?
}


export interface Player {
  id: string
  name: string
  vote?: string                   // optional field since players haven't voted when they first join
  socketId: string                // each player has their own socket connection
}
