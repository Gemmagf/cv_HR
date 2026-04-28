import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { candidatesApi } from '../utils/api'
import { MapPin, Mail, Phone, Linkedin, ArrowLeft, Briefcase, GraduationCap, Globe } from 'lucide-react'

function Seccio({ titol, icon: Icon, children }) {
  return (
    <div className="card mb-4">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Icon size={18} className="text-primary-600" />
        {titol}
      </h3>
      {children}
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams()
  const [candidat, setCandidatData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    candidatesApi.detall(id).then((r) => setCandidatData(r.data)).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!candidat) return <div className="card text-center py-12 text-gray-500">Candidat no trobat</div>

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/candidats" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 mb-6">
        <ArrowLeft size={16} /> Tornar a candidats
      </Link>

      {/* Perfil principal */}
      <div className="card mb-4">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-800 font-black text-2xl">
              {candidat.nom?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {candidat.nom} {candidat.cognom || ''}
            </h1>
            {candidat.ultima_posicio && (
              <p className="text-gray-500 mt-1">
                {candidat.ultima_posicio}
                {candidat.ultima_empresa && ` · ${candidat.ultima_empresa}`}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
              {candidat.ubicacio && <span className="flex items-center gap-1"><MapPin size={14} />{candidat.ubicacio}</span>}
              {candidat.email && <span className="flex items-center gap-1"><Mail size={14} />{candidat.email}</span>}
              {candidat.telefon && <span className="flex items-center gap-1"><Phone size={14} />{candidat.telefon}</span>}
              {candidat.linkedin && (
                <a href={candidat.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-600 hover:underline">
                  <Linkedin size={14} />LinkedIn
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-primary-800">
              {candidat.anys_exp_total?.toFixed(0) || '—'}
            </div>
            <div className="text-xs text-gray-400">anys exp.</div>
          </div>
        </div>

        {candidat.resum_ia && (
          <div className="mt-4 p-4 bg-primary-50 rounded-xl text-sm text-gray-700 italic">
            {candidat.resum_ia}
          </div>
        )}
      </div>

      {/* Habilitats */}
      {candidat.habilitats_tecniques?.length > 0 && (
        <Seccio titol="Habilitats tècniques" icon={Briefcase}>
          <div className="flex flex-wrap gap-2">
            {candidat.habilitats_tecniques.map((h) => (
              <span key={h} className="badge badge-blue">{h}</span>
            ))}
          </div>
          {candidat.habilitats_soft?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {candidat.habilitats_soft.map((h) => (
                <span key={h} className="badge badge-green">{h}</span>
              ))}
            </div>
          )}
        </Seccio>
      )}

      {/* Experiència */}
      {candidat.experiencies?.length > 0 && (
        <Seccio titol="Experiència professional" icon={Briefcase}>
          <div className="space-y-4">
            {candidat.experiencies.map((e, i) => (
              <div key={i} className="border-l-2 border-primary-200 pl-4">
                <div className="font-semibold text-gray-800">{e.posicio}</div>
                <div className="text-sm text-primary-600">{e.empresa}</div>
                <div className="text-xs text-gray-400">
                  {e.inici} — {e.fi || 'Actual'}
                </div>
                {e.descripcio && <p className="text-sm text-gray-600 mt-1">{e.descripcio}</p>}
              </div>
            ))}
          </div>
        </Seccio>
      )}

      {/* Formació */}
      {candidat.formacions?.length > 0 && (
        <Seccio titol="Formació" icon={GraduationCap}>
          <div className="space-y-3">
            {candidat.formacions.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-800">{f.titol}</div>
                  <div className="text-sm text-gray-500">{f.centre} {f.any && `· ${f.any}`}</div>
                </div>
              </div>
            ))}
          </div>
        </Seccio>
      )}

      {/* Idiomes */}
      {candidat.idiomes?.length > 0 && (
        <Seccio titol="Idiomes" icon={Globe}>
          <div className="flex flex-wrap gap-3">
            {candidat.idiomes.map((id) => (
              <div key={id.idioma} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700">{id.idioma}</span>
                <span className="badge badge-blue">{id.nivell}</span>
              </div>
            ))}
          </div>
        </Seccio>
      )}
    </div>
  )
}
