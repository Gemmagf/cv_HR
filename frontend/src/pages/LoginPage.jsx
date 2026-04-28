import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'
import { UserCheck } from 'lucide-react'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

export default function LoginPage() {
  const navigate   = useNavigate()
  const login      = useAuthStore((s) => s.login)
  const { t }      = useTranslation()
  const [loading, setLoading]   = useState(false)
  const [form, setForm]         = useState({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(form.email, form.password)
      login(data.access_token, { nom: data.nom, rol: data.rol }, data.tenant_id)
      navigate('/dashboard')
    } catch {
      toast.error(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleConvidat = () => {
    login('demo-token', { nom: 'Convidat', rol: 'visor' }, 1)
    toast.success(t('login.guestToast'))
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-primary-800 flex items-center justify-center p-4">
      {/* Selector d'idioma — cantonada superior dreta */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher dark />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xl">CV</span>
            </div>
            <div className="text-left">
              <div className="text-white font-bold text-2xl">{t('login.title')}</div>
              <div className="text-primary-300 text-sm">{t('login.subtitle')}</div>
            </div>
          </div>
          <p className="text-primary-200 text-sm">{t('login.tagline')}</p>
        </div>

        {/* Botó convidat — destacat */}
        <button
          onClick={handleConvidat}
          className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold py-3.5 px-4 rounded-xl mb-4 transition-colors shadow-lg"
        >
          <UserCheck size={20} />
          {t('login.guestBtn')}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-primary-300 text-xs">{t('login.orWith')}</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Formulari */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">{t('login.formTitle')}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('login.email')}</label>
              <input
                type="email" className="input"
                placeholder={t('login.emailPlaceholder')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required autoFocus
              />
            </div>
            <div>
              <label className="label">{t('login.password')}</label>
              <input
                type="password" className="input"
                placeholder={t('login.passwordPlaceholder')}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-60">
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('login.noAccount')}{' '}
            <Link to="/registre" className="text-primary-700 font-semibold hover:underline">
              {t('login.trial')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
