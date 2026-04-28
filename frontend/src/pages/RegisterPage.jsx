import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'
import { CheckCircle } from 'lucide-react'

const BENEFICIS = [
  'Processa fins a 50 CV durant 30 dies',
  'Matching intel·ligent per IA (Claude)',
  'Exportació PDF professional',
  'Sense targeta de crèdit',
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nom_empresa: '',
    nom_usuari: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.registre(form)
      login(data.access_token, { nom: data.nom, rol: data.rol }, data.tenant_id)
      toast.success('Benvingut/da a CV Hunter!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error en el registre')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Esquerra — Beneficis */}
        <div className="hidden lg:block text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xl">CV</span>
            </div>
            <div>
              <div className="font-bold text-2xl">CV Hunter</div>
              <div className="text-primary-300 text-sm">Free Trial — 30 dies</div>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-snug">
            Troba el talent perfecte<br />en segons, no en dies.
          </h2>
          <p className="text-primary-200 mb-8">
            Puja els teus CV, defineix l'encàrrec i la IA identifica, puntua
            i presenta visualment els millors candidats de la teva base de dades.
          </p>
          <ul className="space-y-3">
            {BENEFICIS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-primary-100">
                <CheckCircle size={18} className="text-accent-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Dreta — Formulari */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Crea el teu compte gratuït</h1>
          <p className="text-sm text-gray-500 mb-6">Cap targeta de crèdit requerida</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom de l'empresa</label>
              <input
                type="text"
                className="input"
                placeholder="Exemple RRHH SL"
                value={form.nom_empresa}
                onChange={(e) => setForm({ ...form, nom_empresa: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">El teu nom</label>
              <input
                type="text"
                className="input"
                placeholder="Anna García"
                value={form.nom_usuari}
                onChange={(e) => setForm({ ...form, nom_usuari: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Correu electrònic</label>
              <input
                type="email"
                className="input"
                placeholder="anna@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Contrasenya</label>
              <input
                type="password"
                className="input"
                placeholder="Mínim 8 caràcters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60"
            >
              {loading ? 'Creant compte...' : 'Començar prova gratuïta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Ja tens compte?{' '}
            <Link to="/login" className="text-primary-700 font-semibold hover:underline">
              Accedeix aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
