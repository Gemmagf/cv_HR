import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clientsApi } from '../utils/api'
import { Building2, Plus, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

const FORM_INICIAL = { nom: '', sector: '', contacte: '', email: '', telefon: '' }

export default function ClientsPage() {
  const { t } = useTranslation()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)

  const carregar = () => {
    setLoading(true)
    clientsApi.llista().then((r) => setClients(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const handleCrear = async (e) => {
    e.preventDefault()
    try {
      await clientsApi.crear(form)
      toast.success(t('clients.form.createdOk'))
      setMostrarForm(false)
      setForm(FORM_INICIAL)
      carregar()
    } catch {
      toast.error(t('clients.form.error'))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('clients.title')}</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          {t('clients.newBtn')}
        </button>
      </div>

      {mostrarForm && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t('clients.form.title')}</h2>
          <form onSubmit={handleCrear} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('clients.form.company')} *</label>
              <input className="input" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('clients.form.sector')}</label>
              <input className="input" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('clients.form.contact')}</label>
              <input className="input" value={form.contacte} onChange={(e) => setForm({ ...form, contacte: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('clients.form.email')}</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('clients.form.phone')}</label>
              <input type="tel" className="input" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">{t('clients.form.create')}</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">{t('clients.form.cancel')}</button>
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
          <p className="text-gray-500">{t('clients.empty')}</p>
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
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                {c.telefon && <span className="flex items-center gap-1"><Phone size={12} />{c.telefon}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
