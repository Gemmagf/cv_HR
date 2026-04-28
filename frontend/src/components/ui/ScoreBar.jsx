/**
 * Barra de progrés per a puntuació de matching
 * Colors: verd ≥80, cian ≥60, taronja ≥40, vermell <40
 */
export default function ScoreBar({ score, label, showLabel = true, height = 'h-2' }) {
  const color =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-cyan-500'  :
    score >= 40 ? 'bg-orange-400' :
                  'bg-red-500'

  const textColor =
    score >= 80 ? 'text-green-700' :
    score >= 60 ? 'text-cyan-700'  :
    score >= 40 ? 'text-orange-600' :
                  'text-red-600'

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">{label}</span>
          <span className={`text-xs font-semibold ${textColor}`}>{score?.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(score || 0, 100)}%` }}
        />
      </div>
    </div>
  )
}
