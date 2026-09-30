import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, BadgeCheck, Clock, ListChecks, ExternalLink, Search, TrendingUp, Users } from 'lucide-react'
import { skillTestsApi } from '../utils/api'
import { SKILL_TESTS, PASS_SCORE, pickText, encodeInviteToken } from '../utils/skillsEngine'

function Stat({ icon: Icon, label, value, color = 'text-primary-700' }) {
  return (
    <div className="card py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-2xl font-black ${color}`}>{value ?? '—'}</p>
        </div>
        <Icon size={22} className={color} />
      </div>
    </div>
  )
}

/**
 * Secció "Proves": catàleg de mini-proves i verificacions recents del tenant.
 */
export default function SkillTestsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language
  const [resultats, setResultats] = useState([])
  const [loading, setLoading] = useState(true)
  const [cerca, setCerca] = useState('')
  const [categoria, setCategoria] = useState('')

  useEffect(() => {
    skillTestsApi.resultatsTots().then((r) => setResultats(r.data)).finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => Array.from(new Set(SKILL_TESTS.map((x) => x.category))), [])

  const testsFiltrats = SKILL_TESTS.filter((x) => {
    if (categoria && x.category !== categoria) return false
    if (!cerca) return true
    const q = cerca.toLowerCase()
    return pickText(x.title, lang).toLowerCase().includes(q) || x.skill.toLowerCase().includes(q)
      || (x.aliases || []).some((a) => a.toLowerCase().includes(q))
  })

  const completades = resultats.length
  const superades = resultats.filter((r) => r.passed).length
  const taxa = completades ? Math.round((superades / completades) * 100) : null
  const perProva = resultats.reduce((acc, r) => { acc[r.test_id] = (acc[r.test_id] || 0) + (r.passed ? 1 : 0); return acc }, {})

  const previsualitzar = (testId) => {
    navigate(`/prova/${encodeInviteToken({ candidateId: null, testId })}`, { state: { preview: true } })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck size={24} className="text-accent-500" /> {t('skills.title')}
        </h1>
        <p className="text-gray-500 mt-1 max-w-3xl">{t('skills.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={ListChecks} label={t('skills.stats.tests')} value={SKILL_TESTS.length} />
        <Stat icon={Users} label={t('skills.stats.completed')} value={loading ? null : completades} color="text-accent-600" />
        <Stat icon={BadgeCheck} label={t('skills.stats.verified')} value={loading ? null : superades} color="text-emerald-600" />
        <Stat icon={TrendingUp} label={t('skills.stats.passRate')} value={loading ? null : taxa != null ? `${taxa}%` : '—'} color="text-green-700" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Catàleg */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder={t('skills.searchPlaceholder')} value={cerca} onChange={(e) => setCerca(e.target.value)} />
            </div>
            <select className="input sm:w-56" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">{t('skills.allCategories')}</option>
              {categories.map((c) => <option key={c} value={c}>{t(`skills.categories.${c}`)}</option>)}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {testsFiltrats.map((x) => (
              <div key={x.id} className="card hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pickText(x.title, lang)}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="badge badge-blue">{x.skill}</span>
                      <span className="badge badge-gray">{t(`skills.categories.${x.category}`)}</span>
                      <span className="badge badge-yellow">{t(`skills.levels.${x.level}`)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 flex-1">{pickText(x.description, lang)}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><ListChecks size={12} /> {t('skills.questions', { n: x.questions.length })}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {t('skills.minutes', { n: x.duration_min })}</span>
                  <span className="flex items-center gap-1"><BadgeCheck size={12} /> {t('skills.passScore', { n: PASS_SCORE })}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-emerald-700 font-medium">
                    {t('skills.verifiedCandidates', { n: perProva[x.id] || 0 })}
                  </span>
                  <button onClick={() => previsualitzar(x.id)} className="text-sm text-primary-700 font-medium hover:underline flex items-center gap-1">
                    <ExternalLink size={14} /> {t('skills.preview')}
                  </button>
                </div>
              </div>
            ))}
            {testsFiltrats.length === 0 && (
              <div className="card text-center text-gray-400 py-10 sm:col-span-2">{t('skills.noTestsFound')}</div>
            )}
          </div>
        </div>

        {/* Verificacions recents */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">{t('skills.recent')}</h2>
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-4 border-primary-800 border-t-transparent rounded-full" />
              </div>
            ) : resultats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">{t('skills.noRecent')}</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                {resultats.slice(0, 30).map((r, i) => (
                  <li key={`${r.candidate_id}-${r.test_id}-${i}`} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>
                      {Math.round(r.score)}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/candidats/${r.candidate_id}`} className="text-sm font-medium text-gray-900 hover:text-primary-700 truncate block">
                        {r.candidat_nom}
                      </Link>
                      <div className="text-xs text-gray-500 truncate">
                        {r.skill} · {t(`skills.levels.${r.level}`)}
                        {r.data && <> · {new Date(r.data).toLocaleDateString(lang)}</>}
                      </div>
                    </div>
                    {r.passed && <BadgeCheck size={16} className="text-emerald-600 flex-shrink-0" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
