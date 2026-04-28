import { useEffect, useState } from 'react'
import { clientsApi } from '../utils/api'
import { Building2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nom: '', sector: '', contacte: '', email: '', telefon: '' })

  const carregar = () => {
    setLoading(true)
    clientsApi.llista().then((r) => setClients(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const handleCrear = async (e) => {
    e.preventDefault()
    try {
      await clientsApi.crear(form)
      toast.success('Client creat correctament')
      setMostrarForm(false)
      setForm({ nom: '', sector: '', contacte: '', email: '', telefon: '' })
      carregar()
    } catch {
      toast.error('Error en crear el client')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nou client
        </button>
      </div>

      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Nou client</h2>
          <form onSubmit={handleCrear} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom de l'empresa *</label>
              <input className="input" required value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <label className="label">Sector</label>
              <input className="input" value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>
            <div>
              <label className="label">Persona de contacte</label>
              <input className="input" value={form.contacte}
                onChange={(e) => setForm({ ...form, contacte: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Crear client</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">Cancel·lar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
        </div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Encara no hi ha clients</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-primary-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{c.nom}</div>
                  {c.sector && <div className="text-xs text-gray-400">{c.sector}</div>}
                </div>
              </div>
              {c.contacte && <p className="text-sm text-gray-500">{c.contacte}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
