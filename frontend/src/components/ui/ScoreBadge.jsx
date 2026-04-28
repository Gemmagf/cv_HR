/**
 * Badge gran amb la puntuació global destacada
 */
export default function ScoreBadge({ score, size = 'md' }) {
  const color =
    score >= 80 ? 'bg-green-100 text-green-700 border-green-200' :
    score >= 60 ? 'bg-cyan-100 text-cyan-700 border-cyan-200'    :
    score >= 40 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-red-100 text-red-700 border-red-200'

  const sizes = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-2xl px-4 py-2 font-black',
  }

  return (
    <span className={`inline-flex items-center font-bold rounded-lg border ${color} ${sizes[size]}`}>
      {score?.toFixed(1)}%
    </span>
  )
}
