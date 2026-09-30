import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { assignmentsApi, skillTestsApi } from '../utils/api'
import { recommendTestsForAssignment, getTest, pickText, verifiedSkills } from '../utils/skillsEngine'
import SkillTestRecommendations from '../components/modules/SkillTestRecommendations'
import { ArrowLeft, Search, BadgeCheck, Clock, ClipboardCheck, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const ESTAT_CLS = { proposat: 'badge-blue', entrevista: 'badge-yellow', oferta: 'badge-blue', contractat: 'badge-green', descartat: 'badge-gray' }
const ESTATS = ['proposat', 'entrevista', 'oferta', 'contractat', 'descartat']

export default function AssignmentDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const [encarrec, setEncarrec] = useState(null)
  const [resultats, setResultats] = useState({})     // { candidateId: [resultats] }
  const [proves, setProves] = useState([])           // proves_requerides editables
  const [loading, setLoading] = useState(true)
  const [desant, setDesant] = useState(false)

  const carregar = () => {
    setLoading(true)
    assignmentsApi.detall(id)
      .then(async (r) => {
        setEncarrec(r.data)
        setProves(r.data.proves_requerides || [])
        // Resultats de proves de cada candidat del pipeline (per mostrar qui ja no necessita prova tècnica)
        const ids = (r.data.pipeline || []).map((p) => p.candidate_id)
        const entrades = await Promise.all(ids.map(async (cid) => [cid, (await skillTestsApi.resultatsCandidat(cid)).data || []]))
        setResultats(Object.fromEntries(entrades))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recomanacions per a la posició + les ja associades (encara que no surtin com a recomanades)
  const recomanacions = useMemo(() => {
    if (!encarrec) return []
    const recs = recommendTestsForAssignment(encarrec)
    const ids = new Set(recs.map((r) => r.test.id))
    for (const tid of proves) {
      if (!ids.has(tid)) { const test = getTest(tid); if (test) recs.push({ test, reason: null, matched: null }) }
    }
    return recs
  }, [encarrec, proves])

  const provesCanviades = encarrec && JSON.stringify([...proves].sort()) !== JSON.stringify([...(encarrec.proves_requerides || [])].sort())

  const toggleProva = (tid) => setProves((p) => (p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]))

  const desarProves = async () => {
    setDesant(true)
    try {
      await assignmentsApi.actualitzarProves(id, proves)
      setEncarrec((e) => ({ ...e, proves_requerides: proves }))
      toast.success(t('skills.forAssignment.saved'))
    } catch {
      toast.error(t('assignmentDetail.updateErr'))
    } finally {
      setDesant(false)
    }
  }

  const actualitzarEstat = async (candidateId, estat) => {
    try {
      await assignmentsApi.actualitzarEstatCandidatPipeline(id, candidateId, { estat })
      toast.success(t('assignmentDetail.updatedOk'))
      carregar()
    } catch {
      toast.error(t('assignmentDetail.updateErr'))
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
    </div>
  )

  if (!encarrec) return <div className="card text-center py-12 text-gray-500">{t('assignmentDetail.notFound')}</div>

  const provesActuals = encarrec.proves_requerides || []

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/encarrecs" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 mb-6">
        <ArrowLeft size={16} /> {t('assignmentDetail.back')}
      </Link>

      <div className="card mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{encarrec.titol}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {t('assignmentDetail.created', { date: new Date(encarrec.creat_el).toLocaleDateString(i18n.language) })}
            </p>
          </div>
          <Link to={`/encarrecs/${id}/matching`} className="btn-primary flex items-center gap-2 flex-shrink-0">
            <Search size={16} />
            {t('assignmentDetail.searchBtn')}
          </Link>
        </div>

        {encarrec.requisits_habilitats?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {encarrec.requisits_habilitats.map((h) => (
              <span key={h} className="badge badge-blue">{h}</span>
            ))}
          </div>
        )}

        {provesActuals.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <ClipboardCheck size={14} className="text-emerald-600" />
            {provesActuals.map((tid) => {
              const test = getTest(tid)
              return test ? <span key={tid} className="badge bg-emerald-50 text-emerald-800 border border-emerald-200">{pickText(test.title, i18n.language)}</span> : null
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Pipeline */}
        <div className="card lg:col-span-3">
          <h2 className="font-semibold text-gray-800 mb-4">
            {t('assignmentDetail.pipeline', { n: encarrec.pipeline?.length || 0 })}
          </h2>

          {!encarrec.pipeline || encarrec.pipeline.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>{t('assignmentDetail.emptyPipeline')}</p>
              <Link to={`/encarrecs/${id}/matching`} className="text-primary-700 font-medium text-sm mt-2 block hover:underline">
                {t('assignmentDetail.searchLink')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {encarrec.pipeline.map((p) => {
                const verif = verifiedSkills(resultats[p.candidate_id] || [])
                const superades = provesActuals.filter((tid) => verif.some((v) => v.test_id === tid))
                const totes = provesActuals.length > 0 && superades.length === provesActuals.length
                return (
                  <div key={p.candidate_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link to={`/candidats/${p.candidate_id}`} className="text-primary-700 font-medium hover:underline text-sm">
                          {p.nom || t('assignmentDetail.candidate', { id: p.candidate_id })}
                        </Link>
                        <span className={`badge ${ESTAT_CLS[p.estat] || 'badge-gray'}`}>{t(`assignmentDetail.pipelineStatus.${p.estat}`, p.estat)}</span>
                        {p.puntuacio_global != null && (
                          <span className="text-xs text-gray-500">{p.puntuacio_global.toFixed(1)}%</span>
                        )}
                      </div>
                      <select value={p.estat} onChange={(e) => actualitzarEstat(p.candidate_id, e.target.value)} className="input text-xs w-36">
                        {ESTATS.map((k) => <option key={k} value={k}>{t(`assignmentDetail.pipelineStatus.${k}`)}</option>)}
                      </select>
                    </div>

                    {/* Estat de les proves tècniques d'aquest candidat per a la posició */}
                    {provesActuals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {totes ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <BadgeCheck size={12} /> {t('skills.forAssignment.allPassed')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 mr-1">{t('skills.forAssignment.passedCount', { done: superades.length, total: provesActuals.length })}</span>
                        )}
                        {!totes && provesActuals.map((tid) => {
                          const ok = superades.includes(tid)
                          const test = getTest(tid)
                          return (
                            <span key={tid} className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border
                              ${ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-white border-gray-200'}`}>
                              {ok ? <BadgeCheck size={11} /> : <Clock size={11} />}
                              {test?.skill || tid}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Proves tècniques de la posició */}
        <div className="lg:col-span-2 space-y-3">
          <SkillTestRecommendations
            recommendations={recomanacions}
            selected={proves}
            onToggle={toggleProva}
            title={t('skills.forAssignment.title')}
            hint={provesActuals.length === 0 ? t('skills.forAssignment.noneRequired') : t('skills.forAssignment.hint')}
            emptyText={t('skills.forAssignment.none')}
          />
          {provesCanviades && (
            <button onClick={desarProves} disabled={desant} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
              <Save size={16} /> {t('skills.forAssignment.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
