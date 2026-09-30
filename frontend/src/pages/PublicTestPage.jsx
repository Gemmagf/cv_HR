import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Clock, ListChecks, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react'
import { skillTestsApi } from '../utils/api'
import { pickText } from '../utils/skillsEngine'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

/**
 * Pàgina pública (sense login) on el candidat fa una mini-prova d'habilitats.
 * Ruta: /#/prova/:token
 */
export default function PublicTestPage() {
  const { token } = useParams()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [info, setInfo] = useState(null)          // { test, candidat_nom, estat, pass_score }
  const [error, setError] = useState(null)        // 'invalid' | 'already'
  const [fase, setFase] = useState('intro')       // intro | prova | resultat
  const [idx, setIdx] = useState(0)
  const [respostes, setRespostes] = useState([])
  const [segons, setSegons] = useState(0)
  const [enviant, setEnviant] = useState(false)
  const [resultat, setResultat] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    skillTestsApi.obtenirProva(token)
      .then(({ data }) => {
        setInfo(data)
        if (data.estat === 'completat') setError('already')
        setRespostes(Array(data.test.questions.length).fill(null))
      })
      .catch((e) => setError(e?.response?.status === 409 ? 'already' : 'invalid'))
  }, [token])

  const test = info?.test
  const total = test?.questions.length || 0
  const pregunta = test?.questions[idx]
  const senseResposta = useMemo(() => respostes.filter((r) => r == null).length, [respostes])

  const enviar = async (force = false) => {
    if (enviant) return
    if (!force && senseResposta > 0 && !window.confirm(t('skills.public.unanswered', { n: senseResposta }))) return
    clearInterval(timerRef.current)
    setEnviant(true)
    try {
      const { data } = await skillTestsApi.respondre(token, respostes)
      setResultat(data)
      setFase('resultat')
    } catch (e) {
      setError(e?.response?.status === 409 ? 'already' : 'invalid')
    } finally {
      setEnviant(false)
    }
  }

  const comencar = () => {
    setFase('prova')
    setSegons((test.duration_min || 8) * 60)
  }

  // Temporitzador
  useEffect(() => {
    if (fase !== 'prova') return undefined
    timerRef.current = setInterval(() => setSegons((s) => s - 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [fase])

  useEffect(() => {
    if (fase === 'prova' && segons <= 0) {
      clearInterval(timerRef.current)
      enviar(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segons, fase])

  const mmss = `${String(Math.max(0, Math.floor(segons / 60))).padStart(2, '0')}:${String(Math.max(0, segons % 60)).padStart(2, '0')}`

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-primary-800 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl flex items-center justify-between py-3">
        <div className="flex items-center gap-2 text-white">
          <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center font-black">CV</div>
          <div>
            <div className="font-bold leading-tight">CV Hunter</div>
            <div className="text-primary-300 text-xs">{t('skills.public.title')}</div>
          </div>
        </div>
        <LanguageSwitcher dropUp={false} />
      </div>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mt-2">{children}</div>
      <p className="text-primary-300 text-xs mt-6 flex items-center gap-1"><ShieldCheck size={12} /> {t('skills.public.poweredBy')}</p>
    </div>
  )

  if (error) {
    return (
      <Shell>
        <div className="text-center py-8">
          <XCircle size={44} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-xl font-bold text-gray-900">{t(error === 'already' ? 'skills.public.already' : 'skills.public.invalid')}</h1>
          <p className="text-gray-500 mt-2">{t('skills.public.close')}</p>
          <Link to="/login" className="btn-secondary inline-block mt-6">{t('skills.public.backToApp')}</Link>
        </div>
      </Shell>
    )
  }

  if (!info) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
        </div>
      </Shell>
    )
  }

  if (fase === 'intro') {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">{pickText(test.title, lang)}</h1>
        <p className="text-gray-600 mt-3">
          {t('skills.public.hello', { name: info.candidat_nom ? `, ${info.candidat_nom}` : '' })}{' '}
          {t('skills.public.intro', { skill: test.skill })}
        </p>
        <p className="text-sm text-gray-500 mt-2">{pickText(test.description, lang)}</p>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            [ListChecks, t('skills.questions', { n: total })],
            [Clock, t('skills.minutes', { n: test.duration_min })],
            [BadgeCheck, t('skills.passScore', { n: info.pass_score })],
          ].map(([Icon, label], i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
              <Icon size={18} className="mx-auto text-primary-600 mb-1" />
              <div className="text-sm font-medium text-gray-700">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">{t('skills.public.rules2')}</p>
        <button onClick={comencar} className="btn-primary w-full mt-6 py-3">{t('skills.public.start')}</button>
      </Shell>
    )
  }

  if (fase === 'prova' && pregunta) {
    const opcions = pickText(pregunta.options, lang) || pregunta.options.ca
    return (
      <Shell>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">{t('skills.public.question', { i: idx + 1, n: total })}</span>
          <span className={`text-sm font-mono font-semibold flex items-center gap-1 ${segons < 60 ? 'text-red-600' : 'text-gray-700'}`}>
            <Clock size={14} /> {mmss}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
          <div className="h-1.5 bg-accent-500 rounded-full transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-4">{pickText(pregunta.text, lang)}</h2>
        <div className="space-y-2">
          {opcions.map((op, i) => {
            const triada = respostes[idx] === i
            return (
              <button
                key={i}
                onClick={() => setRespostes((r) => r.map((v, j) => (j === idx ? i : v)))}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm
                  ${triada ? 'border-primary-600 bg-primary-50 text-primary-900 font-medium' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 text-gray-700'}`}
              >
                <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-3 ${triada ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {op}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="btn-secondary flex items-center gap-1 disabled:opacity-40">
            <ChevronLeft size={16} /> {t('skills.public.prev')}
          </button>
          {idx < total - 1 ? (
            <button onClick={() => setIdx((i) => i + 1)} className="btn-primary flex items-center gap-1">
              {t('skills.public.next')} <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => enviar(false)} disabled={enviant} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {enviant ? <><Loader2 size={16} className="animate-spin" /> {t('skills.public.submitting')}</> : t('skills.public.submit')}
            </button>
          )}
        </div>
        <div className="flex justify-center gap-1.5 mt-5">
          {respostes.map((r, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full ${i === idx ? 'bg-primary-800' : r != null ? 'bg-accent-500' : 'bg-gray-300'}`} />
          ))}
        </div>
      </Shell>
    )
  }

  if (fase === 'resultat' && resultat) {
    const ok = resultat.passed
    return (
      <Shell>
        <div className="text-center py-4">
          {ok ? <CheckCircle2 size={56} className="mx-auto text-emerald-500 mb-3" /> : <XCircle size={56} className="mx-auto text-orange-400 mb-3" />}
          <h1 className="text-2xl font-bold text-gray-900">{t(ok ? 'skills.public.resultPassed' : 'skills.public.resultFailed')}</h1>
          <div className={`text-5xl font-black mt-4 ${ok ? 'text-emerald-600' : 'text-orange-500'}`}>{Math.round(resultat.score)}%</div>
          <p className="text-gray-500 mt-1">{t('skills.public.score', { c: resultat.correct, t: resultat.total })}</p>
          <div className="inline-flex items-center gap-2 mt-4 bg-gray-50 rounded-full px-4 py-1.5 text-sm">
            <span className="text-gray-500">{t('skills.public.level')}:</span>
            <span className="font-semibold text-gray-800">{t(`skills.levels.${resultat.level}`)}</span>
          </div>
          <p className="text-gray-600 mt-6 max-w-md mx-auto">
            {ok ? t('skills.public.passedMsg', { skill: test.skill }) : t('skills.public.failedMsg')}
          </p>
          {ok && (
            <div className="inline-flex items-center gap-2 mt-5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 font-semibold">
              <BadgeCheck size={18} /> {test.skill} · {t('skills.noTechnicalTest')}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-8">{t('skills.public.close')}</p>
        </div>
      </Shell>
    )
  }

  return null
}
