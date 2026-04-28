import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { matchingApi, assignmentsApi } from '../utils/api'
import CandidateCard from '../components/modules/CandidateCard'
import RadarChart from '../components/ui/RadarChart'
import toast from 'react-hot-toast'
import { Download, Users, SlidersHorizontal, BarChart3 } from 'lucide-react'

export default function MatchingPage() {
  const { id } = useParams()
  const [encarrec, setEncarrec] = useState(null)
  const [candidats, setCandidats] = useState([])
  const [loading, setLoading] = useState(true)
  const [seleccionats, setSeleccionats] = useState(new Set())
  const [vistaComparativa, setVistaComparativa] = useState(false)
  const [puntuacioMin, setPuntuacioMin] = useState(0)
  const [exportant, setExportant] = useState(false)

  useEffect(() => {
    Promise.all([
      assignmentsApi.detall(id),
      matchingApi.cercar(id, { limit: 50 }),
    ]).then(([encRes, matchRes]) => {
      setEncarrec(encRes.data)
      setCandidats(matchRes.data.candidats || [])
    }).finally(() => setLoading(false))
  }, [id])

  const toggleSeleccio = (cid) => {
    setSeleccionats((prev) => {
      const next = new Set(prev)
      if (next.has(cid)) {
        next.delete(cid)
      } else {
        if (next.size >= 5) {
          toast('Màxim 5 candidats per a la vista comparativa', { icon: 'ℹ️' })
          return prev
        }
        next.add(cid)
      }
      return next
    })
  }

  const handleProposar = async () => {
    if (seleccionats.size === 0) {
      toast.error('Selecciona almenys un candidat')
      return
    }
    try {
      const { data } = await matchingApi.proposar(id, Array.from(seleccionats))
      toast.success(data.missatge)
      setSeleccionats(new Set())
    } catch {
      toast.error('Error en proposar candidats')
    }
  }

  const handleExportarPdf = async () => {
    if (seleccionats.size === 0) {
      toast.error('Selecciona candidats per exportar')
      return
    }
    setExportant(true)
    try {
      const ids = Array.from(seleccionats).join(',')
      const res = await matchingApi.exportarPdf(id, {
        candidate_ids: ids,
        nom_client: encarrec?.titol || 'Client',
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `proposta_${encarrec?.titol?.slice(0, 30).replace(/\s/g, '_') || 'candidats'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('PDF generat correctament')
    } catch {
      toast.error('Error generant el PDF')
    } finally {
      setExportant(false)
    }
  }

  const candidatsFiltrats = candidats.filter((c) => c.puntuacio_global >= puntuacioMin)
  const candidatsComparativa = candidats.filter((c) => seleccionats.has(c.candidate_id)).slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      {/* Capçalera */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{encarrec?.titol}</h1>
          <p className="text-gray-500 mt-1">
            {candidatsFiltrats.length} candidats trobats a la base de dades
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {seleccionats.size > 0 && (
            <>
              <button onClick={handleProposar} className="btn-primary">
                <Users size={16} className="inline mr-2" />
                Proposar ({seleccionats.size})
              </button>
              <button
                onClick={handleExportarPdf}
                disabled={exportant}
                className="btn-secondary disabled:opacity-60"
              >
                <Download size={16} className="inline mr-2" />
                {exportant ? 'Generant...' : 'Exportar PDF'}
              </button>
            </>
          )}
          <button
            onClick={() => setVistaComparativa(!vistaComparativa)}
            className={`btn-secondary ${vistaComparativa ? 'bg-primary-50 border-primary-500' : ''}`}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Comparar
          </button>
        </div>
      </div>

      {/* Filtre puntuació */}
      <div className="card mb-6 flex items-center gap-4">
        <SlidersHorizontal size={18} className="text-gray-400 flex-shrink-0" />
        <label className="text-sm text-gray-600 flex-shrink-0">
          Puntuació mínima: <strong>{puntuacioMin}%</strong>
        </label>
        <input
          type="range"
          min="0" max="100" step="5"
          value={puntuacioMin}
          onChange={(e) => setPuntuacioMin(Number(e.target.value))}
          className="flex-1 accent-primary-800"
        />
        <span className="text-sm text-gray-400 flex-shrink-0">
          {candidatsFiltrats.length} resultats
        </span>
      </div>

      {/* Vista comparativa — gràfica radar */}
      {vistaComparativa && seleccionats.size >= 2 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Comparativa de candidats seleccionats
          </h3>
          <RadarChart candidats={candidatsComparativa} />
        </div>
      )}
      {vistaComparativa && seleccionats.size < 2 && (
        <div className="card mb-6 text-center text-gray-500 py-8">
          Selecciona almenys 2 candidats per veure la comparativa radar
        </div>
      )}

      {/* Llista candidats */}
      {candidatsFiltrats.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Cap candidat supera la puntuació mínima establerta</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {candidatsFiltrats.map((c) => (
            <CandidateCard
              key={c.candidate_id}
              candidat={c}
              showScore
              selected={seleccionats.has(c.candidate_id)}
              onSelect={() => toggleSeleccio(c.candidate_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
