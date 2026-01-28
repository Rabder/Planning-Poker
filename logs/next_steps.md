# Planning Poker - 4-Stage Game Flow Implementation Plan

## Overview
Transform the current basic Planning Poker app into a full 4-stage game with:
- Stage 0: WAITING - Players vote to start
- Stage 1: STORY_INPUT - Moderator inputs story (name + description)
- Stage 2: THINKING - Players select cards, 5-second countdown, auto-reveal
- Stage 3: REVEAL - Cards revealed, players click Ready
- Stage 4: DISCUSSION - Discuss, click Ready, rotate moderator, loop back

## User Requirements
- All 13 cards: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, "?", "☕"
- Story form with Name + Description fields
- Initial vote-to-start stage before game begins
- 5-second countdown after all players vote (not manual Ready button in THINKING)
- Moderator rotates each round
- Ready buttons in REVEAL and DISCUSSION stages

## Implementation Steps

### Phase 1: Type Definitions & Data Model

**File: `server/src/types/index.ts`**
- Add `GameStage` enum (WAITING, STORY_INPUT, THINKING, REVEAL, DISCUSSION)
- Add `Story` interface with `name` and `description` fields
- Remove duplicate Player interface (currently defined twice)
- Update `Room` interface:
  - Add `gameStage: GameStage`
  - Add `moderatorId: string | null`
  - Add `currentStory: Story | null`
  - Add `readyPlayers: Set<string>`
  - Add `countdownTimer: NodeJS.Timeout | null`
  - Add `countdownStartTime: number | null`
- Update `Player` interface:
  - Add `readyToStart?: boolean` (for WAITING stage)
  - Add `ready?: boolean` (for REVEAL/DISCUSSION stages)

**File: `client/src/types/index.ts`**
- Mirror all server types (GameStage enum, Story interface)
- Update Room and Player interfaces to match server
- Add `countdownRemaining?: number` to Room for client-side display

### Phase 2: Backend State Machine

**File: `server/src/server.ts`**

**Helper Functions to Add:**
1. `selectRandomModerator(room: Room): string` - Randomly select from players
2. `rotateToNextModerator(room: Room)` - Cycle to next player
3. `allPlayersVoted(room: Room): boolean` - Check if all have votes
4. `allPlayersReady(room: Room): boolean` - Check readyPlayers.size === players.size
5. `broadcastRoomUpdate(room: Room, io: Server)` - Emit room-update with all state
6. `transitionGameStage(room: Room, newStage: GameStage, io: Server)` - State machine transition logic
7. `startCountdownTimer(room: Room, io: Server)` - 5-second countdown with interval updates

**Socket Event Handlers to Add/Modify:**

1. **Update `join-room` handler:**
   - Initialize new rooms with `gameStage: GameStage.WAITING`
   - Set all new Room properties (moderatorId: null, readyPlayers: new Set(), etc.)
   - Initialize Player with readyToStart: false, ready: false

2. **New: `vote-start` event (WAITING → STORY_INPUT):**
   - Toggle player's `readyToStart` status
   - If all players ready:
     - Select random moderator: `room.moderatorId = selectRandomModerator(room)`
     - Transition to STORY_INPUT: `transitionGameStage(room, GameStage.STORY_INPUT, io)`

3. **New: `submit-story` event (STORY_INPUT → THINKING):**
   - Validate sender is moderator
   - Store story: `room.currentStory = { name, description }`
   - Clear all player votes
   - Transition to THINKING: `transitionGameStage(room, GameStage.THINKING, io)`

4. **Rename/Update: `submit-vote` → `select-card` event (THINKING stage):**
   - Validate gameStage === THINKING
   - Store player's vote
   - If `allPlayersVoted(room)`:
     - Start countdown: `startCountdownTimer(room, io)`
     - After 5 seconds, auto-transition to REVEAL

5. **Remove: `reveal-vote` event (replaced by countdown)**

6. **New: `player-ready` event (REVEAL/DISCUSSION stages):**
   - Add player to readyPlayers: `room.readyPlayers.add(socket.id)`
   - If gameStage === REVEAL and all ready:
     - Transition to DISCUSSION
   - If gameStage === DISCUSSION and all ready:
     - Rotate moderator: `rotateToNextModerator(room)`
     - Transition to STORY_INPUT (new round)

7. **Update `disconnect` handler:**
   - Remove player from readyPlayers
   - If moderator disconnects and players remain, assign new moderator
   - Clear countdown timer if room deleted
   - Check if stage can auto-advance after disconnect

**Countdown Timer Implementation:**
```typescript
function startCountdownTimer(room: Room, io: Server) {
  if (room.countdownTimer) clearTimeout(room.countdownTimer)

  room.countdownStartTime = Date.now()

  // Update every second
  const interval = setInterval(() => {
    broadcastRoomUpdate(room, io)
  }, 1000)

  // Transition after 5 seconds
  room.countdownTimer = setTimeout(() => {
    clearInterval(interval)
    room.countdownTimer = null
    room.countdownStartTime = null
    transitionGameStage(room, GameStage.REVEAL, io)
  }, 5000)
}
```

**State Transition Function:**
```typescript
function transitionGameStage(room: Room, newStage: GameStage, io: Server) {
  room.gameStage = newStage

  switch(newStage) {
    case GameStage.WAITING:
      room.players.forEach(p => p.readyToStart = false)
      break
    case GameStage.STORY_INPUT:
      room.readyPlayers.clear()
      room.players.forEach(p => { p.vote = undefined; p.ready = false })
      room.currentStory = null
      room.revealed = false
      break
    case GameStage.THINKING:
      room.players.forEach(p => p.vote = undefined)
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
```

**broadcastRoomUpdate Updates:**
```typescript
function broadcastRoomUpdate(room: Room, io: Server) {
  io.to(room.id).emit('room-update', {
    players: Array.from(room.players.values()),
    gameStage: room.gameStage,
    moderatorId: room.moderatorId,
    currentStory: room.currentStory,
    revealed: room.revealed,
    readyPlayers: Array.from(room.readyPlayers),
    countdownRemaining: room.countdownStartTime
      ? Math.max(0, 5 - Math.floor((Date.now() - room.countdownStartTime) / 1000))
      : undefined
  })
}
```

### Phase 3: Frontend State & Components

**File: `client/src/App.tsx`**

**State Updates:**
- Add: `const [gameStage, setGameStage] = useState<GameStage>(GameStage.WAITING)`
- Add: `const [moderatorId, setModeratorId] = useState<string | null>(null)`
- Add: `const [currentStory, setCurrentStory] = useState<Story | null>(null)`
- Add: `const [readyPlayers, setReadyPlayers] = useState<string[]>([])`
- Add: `const [countdownRemaining, setCountdownRemaining] = useState<number | undefined>()`
- Add: `const [myPlayerId, setMyPlayerId] = useState<string | null>(null)`

**Socket Listener Updates:**
```typescript
useEffect(() => {
  if (!socket) return

  socket.on('room-update', (data) => {
    setPlayers(data.players)
    setGameStage(data.gameStage)
    setModeratorId(data.moderatorId)
    setCurrentStory(data.currentStory)
    setRevealed(data.revealed)
    setReadyPlayers(data.readyPlayers || [])
    setCountdownRemaining(data.countdownRemaining)
  })

  setMyPlayerId(socket.id)

  return () => socket.off('room-update')
}, [socket])
```

**Render Logic - Replace voting view with stage-based rendering:**
```typescript
const isModerator = myPlayerId === moderatorId

// After hasJoined, render based on gameStage:
switch(gameStage) {
  case GameStage.WAITING:
    return <WaitingStage ... />
  case GameStage.STORY_INPUT:
    return <StoryInputStage ... />
  case GameStage.THINKING:
    return <ThinkingStage ... />
  case GameStage.REVEAL:
    return <RevealStage ... />
  case GameStage.DISCUSSION:
    return <DiscussionStage ... />
}
```

**Component Creation (inline in App.tsx or separate files):**

**1. WaitingStage:**
- Display: "Waiting for players to ready up..."
- Player list with ready status
- Button: "Ready to Start" (emits `vote-start`)
- Show count: "X/Y players ready"

**2. StoryInputStage:**
- If `isModerator`:
  - Form with inputs: Story Name, Story Description
  - Button: "Submit Story" (emits `submit-story`)
- Else:
  - "Waiting for {moderatorName} to input the story..."

**3. ThinkingStage:**
- Display current story (name + description)
- Voting cards: `['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕']`
- On card click: emit `select-card` with value
- Player list showing voted/waiting status
- If countdown active: show "Revealing in {countdownRemaining}..."

**4. RevealStage:**
- Display story
- Player list with actual votes revealed
- Optional: Show statistics (average, consensus)
- Button: "Ready" (emits `player-ready`)
- Show ready count: "X/Y ready"

**5. DiscussionStage:**
- Display story + votes
- Text: "Discuss the estimates with your team"
- Button: "Ready" (emits `player-ready`)
- Show ready count: "X/Y ready"

**Socket Event Emitters:**
- `handleVoteStart`: `socket.emit('vote-start', { roomId })`
- `handleSubmitStory`: `socket.emit('submit-story', { roomId, name, description })`
- `handleSelectCard`: `socket.emit('select-card', { roomId, vote })`
- `handlePlayerReady`: `socket.emit('player-ready', { roomId })`

### Phase 4: UI Enhancements

**PlayerList Component Updates:**
- Show moderator badge (⭐ or "MOD") next to moderator
- Stage-aware rendering:
  - WAITING: Show readyToStart status
  - THINKING: Show ✓ Voted or ⏳ Waiting
  - REVEAL/DISCUSSION: Show actual vote value
- Show ready status in REVEAL/DISCUSSION

**Styling Considerations:**
- Highlight current stage
- Disable voted cards after selection
- Animate countdown timer
- Clear visual distinction for moderator
- Responsive layout for 13 cards

## Edge Cases to Handle

1. **Player disconnects during countdown:** Let countdown continue, exclude disconnected player from vote checks
2. **Moderator disconnects:** Auto-assign new moderator (first player in list)
3. **Single player in room:** Disable "Ready to Start" (need at least 2 players)
4. **Late joiners:** Allow joining mid-game, they see current stage
5. **Countdown interruption:** If player changes vote during countdown, restart countdown
6. **Empty room:** Delete room and clear timers (already handled, add timer cleanup)

## Verification Steps

1. **Backend:** Start server, verify compilation
2. **Frontend:** Start client, verify compilation
3. **Join Flow:**
   - Open 3 browser tabs
   - Join same room with different names
   - Verify WAITING stage shows all players
4. **Vote to Start:**
   - Each player clicks "Ready to Start"
   - Verify advancement to STORY_INPUT when all ready
   - Verify random moderator assigned
5. **Story Input:**
   - Moderator fills story form (name + description)
   - Non-moderators see waiting message
   - Submit story → verify advancement to THINKING
6. **Thinking & Countdown:**
   - All players select cards
   - Verify countdown starts (5...4...3...2...1)
   - Verify auto-advancement to REVEAL after countdown
7. **Reveal:**
   - All votes shown correctly
   - Each player clicks "Ready"
   - Verify advancement to DISCUSSION when all ready
8. **Discussion:**
   - Each player clicks "Ready"
   - Verify moderator rotates to next player
   - Verify loop back to STORY_INPUT
9. **Full Round:**
   - Complete 2-3 full rounds to verify rotation works
10. **Disconnection:**
    - Disconnect non-moderator during THINKING → verify game continues
    - Disconnect moderator during STORY_INPUT → verify new moderator assigned
11. **Edge Cases:**
    - Try single player room → verify can't start
    - Join mid-game → verify correct stage display

## Files to Modify

1. `server/src/types/index.ts` - Type definitions
2. `server/src/server.ts` - State machine and event handlers
3. `client/src/types/index.ts` - Client type definitions
4. `client/src/App.tsx` - Frontend state and stage rendering

## Success Criteria

- ✅ Game progresses through all 5 stages correctly
- ✅ All 13 cards available for voting
- ✅ Story form has name + description fields
- ✅ 5-second countdown triggers automatically after all players vote
- ✅ Moderator rotates each round
- ✅ Ready buttons work in REVEAL and DISCUSSION
- ✅ Disconnections handled gracefully
- ✅ Multiple players can play simultaneously
