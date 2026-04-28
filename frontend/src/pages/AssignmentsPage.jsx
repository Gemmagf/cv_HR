import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { assignmentsApi, clientsApi } from '../utils/api'
import { Briefcase, Plus, ArrowRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const ESTAT_CONFIG = {
  obert:     { label: 'Obert',     cls: 'badge-yellow' },
  en_curs:   { label: 'En curs',   cls: 'badge-blue' },
  cobert:    { label: 'Cobert',    cls: 'badge-green' },
  descartat: { label: 'Descartat', cls: 'badge-gray' },
}

const PRIORITAT_CONFIG = {
  1: { label: '↑ Alta',   cls: 'text-red-500' },
  2: { label: '→ Normal', cls: 'text-gray-500' },
  3: { label: '↓ Baixa',  cls: 'text-green-600' },
}

export default function AssignmentsPage() {
  const [encarrecs, setEncarrecs] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    titol: '',
    descripcio: '',
    requisits_habilitats: '',
    anys_exp_min: 0,
    teletreball_ok: true,
    pes_habilitats: 0.40,
    pes_experiencia: 0.25,
    pes_formacio: 0.15,
    pes_idiomes: 0.10,
    pes_ubicacio: 0.10,
    prioritat: 2,
  })

  useEffect(() => {
    Promise.all([assignmentsApi.llista(), clientsApi.llista()])
      .then(([encRes, cliRes]) => {
        setEncarrecs(encRes.data)
        setClients(cliRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCrear = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...form,
        client_id: parseInt(form.client_id),
        requisits_habilitats: form.requisits_habilitats.split(',').map((h) => h.trim()).filter(Boolean),
      }
      await assignmentsApi.crear(data)
      toast.success('Encàrrec creat correctament')
      setMostrarForm(false)
      const { data: updated } = await assignmentsApi.llista()
      setEncarrecs(updated)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error en crear l\'encàrrec')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Encàrrecs</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nou encàrrec
        </button>
      </div>

      {/* Formulari nou encàrrec */}
      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Nou encàrrec de selecció</h2>
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Client *</label>
                <select
                  className="input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona client...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Títol del lloc *</label>
                <input
                  className="input"
                  placeholder="p.ex. Responsable de compres"
                  value={form.titol}
                  onChange={(e) => setForm({ ...form, titol: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Habilitats requerides (separades per comes)</label>
              <input
                className="input"
                placeholder="Python, SQL, Excel..."
                value={form.requisits_habilitats}
                onChange={(e) => setForm({ ...form, requisits_habilitats: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Anys exp. mínims</label>
                <input
                  type="number" min="0" className="input"
                  value={form.anys_exp_min}
                  onChange={(e) => setForm({ ...form, anys_exp_min: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Prioritat</label>
                <select className="input" value={form.prioritat}
                  onChange={(e) => setForm({ ...form, prioritat: parseInt(e.target.value) })}>
                  <option value={1}>Alta</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Baixa</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input
                  type="checkbox" id="teletreball"
                  checked={form.teletreball_ok}
                  onChange={(e) => setForm({ ...form, teletreball_ok: e.target.checked })}
                  className="w-4 h-4 accent-primary-800"
                />
                <label htmlFor="teletreball" className="text-sm text-gray-700">Teletreball OK</label>
              </div>
            </div>

            {/* Pesos matching */}
            <details className="mt-2">
              <summary className="text-sm text-primary-700 cursor-pointer font-medium">
                Configurar pesos de matching
              </summary>
              <div className="grid sm:grid-cols-5 gap-3 mt-3">
                {[
                  ['pes_habilitats', 'Habilitats'],
                  ['pes_experiencia', 'Experiència'],
                  ['pes_formacio', 'Formació'],
                  ['pes_idiomes', 'Idiomes'],
                  ['pes_ubicacio', 'Ubicació'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="label text-xs">{label}</label>
                    <input
                      type="number" step="0.05" min="0" max="1"
                      className="input text-sm"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Suma actual: {(form.pes_habilitats + form.pes_experiencia + form.pes_formacio + form.pes_idiomes + form.pes_ubicacio).toFixed(2)} (ha de ser 1.0)
              </p>
            </details>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">Crear encàrrec</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">Cancel·lar</button>
            </div>
          </form>
        </div>
      )}

      {/* Llista */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
        </div>
      ) : encarrecs.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Encara no hi ha encàrrecs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {encarrecs.map((e) => {
            const estat = ESTAT_CONFIG[e.estat] || { label: e.estat, cls: 'badge-gray' }
            const prioritat = PRIORITAT_CONFIG[e.prioritat] || { label: '', cls: '' }
            return (
              <div key={e.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{e.titol}</span>
                      <span className={`badge ${estat.cls}`}>{estat.label}</span>
                      <span className={`text-xs font-medium ${prioritat.cls}`}>{prioritat.label}</span>
                    </div>
                    {e.data_limit && (
                      <p className="text-xs text-gray-400 mt-1">
                        Límit: {new Date(e.data_limit).toLocaleDateString('ca-ES')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/encarrecs/${e.id}/matching`}
                      className="btn-primary text-sm py-1.5 px-3"
                    >
                      Cercar candidats
                    </Link>
                    <Link
                      to={`/encarrecs/${e.id}`}
                      className="btn-secondary text-sm py-1.5 px-3"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
