import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'
import { CheckCircle } from 'lucide-react'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

export default function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nom_empresa: '',
    nom_usuari: '',
    email: '',
    password: '',
  })

  const beneficis = t('register.benefits', { returnObjects: true })
  const [headline1, headline2] = t('register.headline').split('\n')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.registre(form)
      login(data.access_token, { nom: data.nom, rol: data.rol }, data.tenant_id)
      toast.success(t('register.successToast'))
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || t('register.errorToast'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-800 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher dropUp={false} />
      </div>
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Esquerra — Beneficis */}
        <div className="hidden lg:block text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xl">CV</span>
            </div>
            <div>
              <div className="font-bold text-2xl">CV Hunter</div>
              <div className="text-primary-300 text-sm">{t('register.trialLabel')}</div>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-snug">
            {headline1}{headline2 && <><br />{headline2}</>}
          </h2>
          <p className="text-primary-200 mb-8">{t('register.pitch')}</p>
          <ul className="space-y-3">
            {Array.isArray(beneficis) && beneficis.map((b) => (
              <li key={b} className="flex items-center gap-3 text-primary-100">
                <CheckCircle size={18} className="text-accent-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Dreta — Formulari */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('register.title')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('register.noCard')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('register.company')}</label>
              <input type="text" className="input" placeholder={t('register.companyPlaceholder')}
                value={form.nom_empresa} onChange={(e) => setForm({ ...form, nom_empresa: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('register.yourName')}</label>
              <input type="text" className="input" placeholder={t('register.namePlaceholder')}
                value={form.nom_usuari} onChange={(e) => setForm({ ...form, nom_usuari: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('register.email')}</label>
              <input type="email" className="input" placeholder="anna@empresa.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">{t('register.password')}</label>
              <input type="password" className="input" placeholder={t('register.passwordHint')}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-60">
              {loading ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('register.hasAccount')}{' '}
            <Link to="/login" className="text-primary-700 font-semibold hover:underline">
              {t('register.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
