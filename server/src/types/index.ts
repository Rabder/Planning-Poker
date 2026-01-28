
export interface Room {
  id: string
  players: Map<string, Player>         // key: player ID/socket ID  -->   value: Player object
  revealed: boolean                    // true if votes have been revealed, false otherwise
  
  // explicitly initialize story to be either a Story object or null
  currentStory: Story | null           // what story are players estimating?
  gameStage: GameStage                 // what stage of the game are we in?
  moderatorId: string | null           // who is the current moderator (socket id)? null when game is in waiting stage
  readyPlayers: Set<string>
  countdownTimer: NodeJS.Timeout | null
  countdownStartTime: number | null
}

export interface Player {
  id: string
  name: string
  vote?: string                   // optional field since players haven't voted when they first join
  socketId: string                // each player has their own socket connection
  readyToStart?: boolean          // for waiting stage
  ready?: boolean                 // for the rest of the stages
  
}

// defining the game stages
export enum GameStage {
    WAITING = 'WAITING',           // stage 0: Players vote to start the game
    STORY_INPUT = 'STORY_INPUT',   // stage 1: Moderator inputs the user story
    THINKING = 'THINKING',         // stage 2: Players select cards
    REVEAL = 'REVEAL',             // stage 3: Cards are revealed
    DISCUSSION = 'DISCUSSION'      // stage 4: Team discusses estimates
  }

export interface Story {
  name: string          // short title
  description: string   // 2-3 line description of the user story
}
