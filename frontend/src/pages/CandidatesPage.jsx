import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { candidatesApi } from '../utils/api'
import CandidateCard from '../components/modules/CandidateCard'
import { Users, Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CandidatesPage() {
  const [candidats, setCandidats] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [cerca, setCerca] = useState('')

  useEffect(() => {
    setLoading(true)
    candidatesApi
      .llista({ pagina, mida_pagina: 20 })
      .then((r) => setCandidats(r.data))
      .finally(() => setLoading(false))
  }, [pagina])

  const candidatsFiltrats = cerca
    ? candidats.filter(
        (c) =>
          c.nom?.toLowerCase().includes(cerca.toLowerCase()) ||
          c.ultima_posicio?.toLowerCase().includes(cerca.toLowerCase()) ||
          c.habilitats_tecniques?.some((h) => h.toLowerCase().includes(cerca.toLowerCase()))
      )
    : candidats

  return (
    <div>
      {/* Capçalera */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Candidats</h1>
        <Link to="/candidats/upload" className="btn-primary flex items-center gap-2">
          <Upload size={16} />
          Pujar CV
        </Link>
      </div>

      {/* Cerca */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca per nom, posició o habilitat..."
          className="input pl-10"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      </div>

      {/* Llista */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
        </div>
      ) : candidatsFiltrats.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">
            {cerca ? 'Cap candidat coincideix amb la cerca' : 'Encara no tens candidats'}
          </p>
          <Link to="/candidats/upload" className="btn-primary">
            Pujar primer CV
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">{candidatsFiltrats.length} candidat(s)</p>
          <div className="grid lg:grid-cols-2 gap-4">
            {candidatsFiltrats.map((c) => (
              <CandidateCard key={c.id} candidat={c} />
            ))}
          </div>

          {/* Paginació */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="btn-secondary disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">Pàgina {pagina}</span>
            <button
              onClick={() => setPagina((p) => p + 1)}
              disabled={candidats.length < 20}
              className="btn-secondary disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
