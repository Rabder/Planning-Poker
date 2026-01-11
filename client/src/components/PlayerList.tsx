import { Player } from '../types'

interface PlayerListProps {
  players: Player[]
}

export const PlayerList = ({ players }: PlayerListProps) => {
  return (
    <div>
      {players.map((player) => (
        <div key={player.id}>{player.name}</div>
      ))}
    </div>
  )
}
