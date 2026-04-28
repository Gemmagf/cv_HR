import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { assignmentsApi } from '../utils/api'
import { ArrowLeft, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const ESTAT_CANDIDAT = {
  proposat:   { label: 'Proposat',   cls: 'badge-blue' },
  entrevista: { label: 'Entrevista', cls: 'badge-yellow' },
  oferta:     { label: 'Oferta',     cls: 'badge-blue' },
  contractat: { label: 'Contractat', cls: 'badge-green' },
  descartat:  { label: 'Descartat',  cls: 'badge-gray' },
}

export default function AssignmentDetailPage() {
  const { id } = useParams()
  const [encarrec, setEncarrec] = useState(null)
  const [loading, setLoading] = useState(true)

  const carregar = () => {
    setLoading(true)
    assignmentsApi.detall(id).then((r) => setEncarrec(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [id])

  const actualitzarEstat = async (candidateId, estat) => {
    try {
      await assignmentsApi.actualitzarEstatCandidatPipeline(id, candidateId, { estat })
      toast.success('Estat actualitzat')
      carregar()
    } catch {
      toast.error('Error en actualitzar l\'estat')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
    </div>
  )

  if (!encarrec) return <div className="card text-center py-12 text-gray-500">Encàrrec no trobat</div>

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/encarrecs" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 mb-6">
        <ArrowLeft size={16} /> Tornar a encàrrecs
      </Link>

      <div className="card mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{encarrec.titol}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Creat: {new Date(encarrec.creat_el).toLocaleDateString('ca-ES')}
            </p>
          </div>
          <Link to={`/encarrecs/${id}/matching`} className="btn-primary flex items-center gap-2">
            <Search size={16} />
            Cercar candidats
          </Link>
        </div>

        {encarrec.requisits_habilitats?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {encarrec.requisits_habilitats.map((h) => (
              <span key={h} className="badge badge-blue">{h}</span>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">
          Pipeline de candidats ({encarrec.pipeline?.length || 0})
        </h2>

        {encarrec.pipeline?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Cap candidat proposat encara</p>
            <Link to={`/encarrecs/${id}/matching`} className="text-primary-700 font-medium text-sm mt-2 block hover:underline">
              Cercar candidats amb IA →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {encarrec.pipeline?.map((p) => {
              const estat = ESTAT_CANDIDAT[p.estat] || { label: p.estat, cls: 'badge-gray' }
              return (
                <div key={p.candidate_id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Link to={`/candidats/${p.candidate_id}`} className="text-primary-700 font-medium hover:underline text-sm">
                      Candidat #{p.candidate_id}
                    </Link>
                    <span className={`badge ${estat.cls}`}>{estat.label}</span>
                    {p.puntuacio_global && (
                      <span className="text-xs text-gray-500">{p.puntuacio_global.toFixed(1)}%</span>
                    )}
                  </div>
                  <select
                    value={p.estat}
                    onChange={(e) => actualitzarEstat(p.candidate_id, e.target.value)}
                    className="input text-xs w-36"
                  >
                    {Object.entries(ESTAT_CANDIDAT).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
