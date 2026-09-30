import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { assignmentsApi, clientsApi } from '../utils/api'
import { recommendTestsForAssignment } from '../utils/skillsEngine'
import SkillTestRecommendations from '../components/modules/SkillTestRecommendations'
import { Briefcase, Plus, ArrowRight, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const ESTAT_CLS = { obert: 'badge-yellow', en_curs: 'badge-blue', cobert: 'badge-green', descartat: 'badge-gray' }
const PRIORITAT_CLS = { 1: 'text-red-500', 2: 'text-gray-500', 3: 'text-green-600' }

const FORM_INICIAL = {
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
  proves_requerides: [],
}

export default function AssignmentsPage() {
  const { t, i18n } = useTranslation()
  const [encarrecs, setEncarrecs] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)

  useEffect(() => {
    Promise.all([assignmentsApi.llista(), clientsApi.llista()])
      .then(([encRes, cliRes]) => {
        setEncarrecs(encRes.data)
        setClients(cliRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Per a l'empresa: quines proves tècniques són rellevants per a la posició que s'està definint
  const recomanacions = useMemo(
    () => recommendTestsForAssignment({ titol: form.titol, descripcio: form.descripcio, requisits_habilitats: form.requisits_habilitats }),
    [form.titol, form.descripcio, form.requisits_habilitats]
  )

  // Quan canvien les recomanacions, preseleccionem les que vénen d'un requisit explícit
  useEffect(() => {
    setForm((f) => {
      const ids = new Set(recomanacions.map((r) => r.test.id))
      const mantingudes = f.proves_requerides.filter((id) => ids.has(id))
      const requerides = recomanacions.filter((r) => r.reason === 'required').map((r) => r.test.id)
      const noves = Array.from(new Set([...mantingudes, ...requerides]))
      return noves.length === f.proves_requerides.length && noves.every((id, i) => id === f.proves_requerides[i]) ? f : { ...f, proves_requerides: noves }
    })
  }, [recomanacions])

  const toggleProva = (testId) => {
    setForm((f) => ({
      ...f,
      proves_requerides: f.proves_requerides.includes(testId)
        ? f.proves_requerides.filter((x) => x !== testId)
        : [...f.proves_requerides, testId],
    }))
  }

  const sumaPesos = form.pes_habilitats + form.pes_experiencia + form.pes_formacio + form.pes_idiomes + form.pes_ubicacio

  const handleCrear = async (e) => {
    e.preventDefault()
    if (Math.abs(sumaPesos - 1) > 0.05) { toast.error(t('assignments.form.weightsError')); return }
    try {
      const data = {
        ...form,
        client_id: parseInt(form.client_id),
        requisits_habilitats: form.requisits_habilitats.split(',').map((h) => h.trim()).filter(Boolean),
      }
      await assignmentsApi.crear(data)
      toast.success(t('assignments.form.createdOk'))
      setMostrarForm(false)
      setForm(FORM_INICIAL)
      const { data: updated } = await assignmentsApi.llista()
      setEncarrecs(updated)
    } catch (err) {
      toast.error(err.response?.data?.detail || t('assignments.form.error'))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('assignments.title')}</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          {t('assignments.newBtn')}
        </button>
      </div>

      {/* Formulari nou encàrrec */}
      {mostrarForm && (
        <div className="grid lg:grid-cols-5 gap-6 mb-6">
          <form onSubmit={handleCrear} className="card lg:col-span-3 space-y-4">
            <h2 className="font-semibold text-gray-800">{t('assignments.form.title')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('assignments.form.client')} *</label>
                <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
                  <option value="">{t('assignments.form.clientPlaceholder')}</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('assignments.form.position')} *</label>
                <input className="input" placeholder={t('assignments.form.positionPlaceholder')}
                  value={form.titol} onChange={(e) => setForm({ ...form, titol: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">{t('assignments.form.skills')}</label>
              <input className="input" placeholder={t('assignments.form.skillsPlaceholder')}
                value={form.requisits_habilitats} onChange={(e) => setForm({ ...form, requisits_habilitats: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">{t('assignments.form.minExp')}</label>
                <input type="number" min="0" className="input" value={form.anys_exp_min}
                  onChange={(e) => setForm({ ...form, anys_exp_min: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">{t('assignments.form.priority')}</label>
                <select className="input" value={form.prioritat} onChange={(e) => setForm({ ...form, prioritat: parseInt(e.target.value) })}>
                  <option value={1}>{t('assignments.form.priority1')}</option>
                  <option value={2}>{t('assignments.form.priority2')}</option>
                  <option value={3}>{t('assignments.form.priority3')}</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input type="checkbox" id="teletreball" checked={form.teletreball_ok}
                  onChange={(e) => setForm({ ...form, teletreball_ok: e.target.checked })} className="w-4 h-4 accent-primary-800" />
                <label htmlFor="teletreball" className="text-sm text-gray-700">{t('assignments.form.telework')}</label>
              </div>
            </div>

            {/* Pesos matching */}
            <details className="mt-2">
              <summary className="text-sm text-primary-700 cursor-pointer font-medium">{t('assignments.form.weightsTitle')}</summary>
              <div className="grid sm:grid-cols-5 gap-3 mt-3">
                {[
                  ['pes_habilitats', t('matching.dims.habilitats')],
                  ['pes_experiencia', t('matching.dims.experiencia')],
                  ['pes_formacio', t('matching.dims.formacio')],
                  ['pes_idiomes', t('matching.dims.idiomes')],
                  ['pes_ubicacio', t('matching.dims.ubicacio')],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="label text-xs">{label}</label>
                    <input type="number" step="0.05" min="0" max="1" className="input text-sm" value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-1 ${Math.abs(sumaPesos - 1) > 0.05 ? 'text-red-500' : 'text-gray-400'}`}>
                {t('assignments.form.weightsSum', { val: sumaPesos.toFixed(2) })}
              </p>
            </details>

            {form.proves_requerides.length > 0 && (
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <ClipboardCheck size={13} /> {t('skills.forAssignment.selected', { n: form.proves_requerides.length })}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">{t('assignments.form.create')}</button>
              <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">{t('assignments.form.cancel')}</button>
            </div>
          </form>

          {/* Per a l'empresa: proves tècniques rellevants per a aquesta posició */}
          <div className="lg:col-span-2">
            <SkillTestRecommendations
              recommendations={recomanacions}
              selected={form.proves_requerides}
              onToggle={toggleProva}
              title={t('skills.forAssignment.title')}
              hint={t('skills.forAssignment.hint')}
              emptyText={t('skills.forAssignment.none')}
            />
          </div>
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
          <p className="text-gray-500">{t('assignments.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {encarrecs.map((e) => (
            <div key={e.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-gray-900">{e.titol}</span>
                    <span className={`badge ${ESTAT_CLS[e.estat] || 'badge-gray'}`}>{t(`assignments.status.${e.estat}`, e.estat)}</span>
                    <span className={`text-xs font-medium ${PRIORITAT_CLS[e.prioritat] || ''}`}>{t(`assignments.priority.${e.prioritat}`, '')}</span>
                  </div>
                  {e.data_limit && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('assignments.deadline', { date: new Date(e.data_limit).toLocaleDateString(i18n.language) })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/encarrecs/${e.id}/matching`} className="btn-primary text-sm py-1.5 px-3">
                    {t('assignments.searchCandidates')}
                  </Link>
                  <Link to={`/encarrecs/${e.id}`} className="btn-secondary text-sm py-1.5 px-3" title={t('assignments.detail')}>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
