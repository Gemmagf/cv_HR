import { Link } from 'react-router-dom'
import { MapPin, Briefcase, Clock, Star } from 'lucide-react'
import ScoreBadge from '../ui/ScoreBadge'
import ScoreBar from '../ui/ScoreBar'

export default function CandidateCard({ candidat, showScore = false, onSelect, selected = false }) {
  return (
    <div
      className={`card hover:shadow-md transition-shadow cursor-pointer relative
        ${selected ? 'ring-2 ring-primary-500' : ''}`}
      onClick={onSelect}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-primary-800 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          {candidat.foto_url ? (
            <img src={candidat.foto_url} alt={candidat.nom} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <span className="text-primary-800 font-bold text-lg">
              {candidat.nom?.[0]?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                to={`/candidats/${candidat.id || candidat.candidate_id}`}
                className="font-semibold text-gray-900 hover:text-primary-800 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {candidat.nom}
              </Link>
              {candidat.ultima_posicio && (
                <p className="text-sm text-gray-500 truncate">
                  {candidat.ultima_posicio}
                  {candidat.ultima_empresa && ` · ${candidat.ultima_empresa}`}
                </p>
              )}
            </div>
            {showScore && candidat.puntuacio_global != null && (
              <ScoreBadge score={candidat.puntuacio_global} size="sm" />
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            {candidat.ubicacio && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {candidat.ubicacio}
              </span>
            )}
            {candidat.anys_exp_total != null && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {candidat.anys_exp_total.toFixed(0)} anys exp.
              </span>
            )}
          </div>

          {/* Habilitats */}
          {candidat.habilitats_tecniques?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {candidat.habilitats_tecniques.slice(0, 5).map((h) => (
                <span key={h} className="badge badge-blue">{h}</span>
              ))}
              {candidat.habilitats_tecniques.length > 5 && (
                <span className="badge badge-gray">+{candidat.habilitats_tecniques.length - 5}</span>
              )}
            </div>
          )}

          {/* Barres de scoring si s'han calculat */}
          {showScore && candidat.puntuacio_habilitats != null && (
            <div className="mt-3 space-y-1.5">
              <ScoreBar score={candidat.puntuacio_habilitats}  label="Habilitats" />
              <ScoreBar score={candidat.puntuacio_experiencia} label="Experiència" />
              <ScoreBar score={candidat.puntuacio_formacio}    label="Formació" />
              <ScoreBar score={candidat.puntuacio_idiomes}     label="Idiomes" />
            </div>
          )}

          {/* Top fortaleses */}
          {showScore && candidat.fortaleses_top3?.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <Star size={12} />
              {candidat.fortaleses_top3.join(' · ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
