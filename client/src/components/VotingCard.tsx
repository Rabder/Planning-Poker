interface VotingCardProps {
  value: string
}

export const VotingCard = ({ value }: VotingCardProps) => {
  return <div>{value}</div>
}
