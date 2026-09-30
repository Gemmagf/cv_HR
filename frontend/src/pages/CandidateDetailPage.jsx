import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { candidatesApi, skillTestsApi } from '../utils/api'
import { recommendTestsForCandidate } from '../utils/skillsEngine'
import VerifiedSkillBadges from '../components/modules/VerifiedSkillBadges'
import SkillTestRecommendations from '../components/modules/SkillTestRecommendations'
import { MapPin, Mail, Phone, Linkedin, ArrowLeft, Briefcase, GraduationCap, Globe, BadgeCheck } from 'lucide-react'

function Seccio({ titol, icon: Icon, children }) {
  return (
    <div className="card mb-4">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Icon size={18} className="text-primary-600" />
        {titol}
      </h3>
      {children}
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const [candidat, setCandidatData] = useState(null)
  const [resultats, setResultats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([candidatesApi.detall(id), skillTestsApi.resultatsCandidat(id)])
      .then(([c, r]) => { setCandidatData(c.data); setResultats(r.data || []) })
      .finally(() => setLoading(false))
  }, [id])

  // Proactiu: proves que el candidat pot fer per acreditar el seu CV
  const recomanacions = useMemo(() => recommendTestsForCandidate(candidat, resultats), [candidat, resultats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!candidat) return <div className="card text-center py-12 text-gray-500">{t('candidateDetail.notFound')}</div>

  const dateFmt = (d) => (d ? new Date(d).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short' }) : '')

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/candidats" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 mb-6">
        <ArrowLeft size={16} /> {t('candidateDetail.back')}
      </Link>

      {/* Perfil principal */}
      <div className="card mb-4">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-800 font-black text-2xl">
              {candidat.nom?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {candidat.nom} {candidat.cognom || ''}
            </h1>
            {candidat.ultima_posicio && (
              <p className="text-gray-500 mt-1">
                {candidat.ultima_posicio}
                {candidat.ultima_empresa && ` · ${candidat.ultima_empresa}`}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
              {candidat.ubicacio && <span className="flex items-center gap-1"><MapPin size={14} />{candidat.ubicacio}</span>}
              {candidat.email && <span className="flex items-center gap-1"><Mail size={14} />{candidat.email}</span>}
              {candidat.telefon && <span className="flex items-center gap-1"><Phone size={14} />{candidat.telefon}</span>}
              {candidat.linkedin && (
                <a href={candidat.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-600 hover:underline">
                  <Linkedin size={14} />LinkedIn
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-primary-800">
              {candidat.anys_exp_total?.toFixed(0) || '—'}
            </div>
            <div className="text-xs text-gray-400">{t('candidateDetail.yrsExp')}</div>
          </div>
        </div>

        {candidat.resum_ia && (
          <div className="mt-4 p-4 bg-primary-50 rounded-xl text-sm text-gray-700 italic">
            {candidat.resum_ia}
          </div>
        )}
      </div>

      {/* Habilitats verificades amb mini-proves */}
      <Seccio titol={t('skills.verified')} icon={BadgeCheck}>
        {resultats.some((r) => r.passed) ? (
          <VerifiedSkillBadges resultats={resultats} />
        ) : (
          <p className="text-sm text-gray-400">{t('skills.noVerified')}</p>
        )}
      </Seccio>

      {/* Proactiu: proves recomanades a partir del CV */}
      <div className="mb-4">
        <SkillTestRecommendations
          recommendations={recomanacions}
          candidateId={candidat.id}
          candidateName={candidat.nom}
        />
      </div>

      {/* Habilitats */}
      {candidat.habilitats_tecniques?.length > 0 && (
        <Seccio titol={t('candidateDetail.skills')} icon={Briefcase}>
          <div className="flex flex-wrap gap-2">
            {candidat.habilitats_tecniques.map((h) => (
              <span key={h} className="badge badge-blue">{h}</span>
            ))}
          </div>
          {candidat.habilitats_soft?.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mt-4 mb-2">{t('candidateDetail.softSkills')}</p>
              <div className="flex flex-wrap gap-2">
                {candidat.habilitats_soft.map((h) => (
                  <span key={h} className="badge badge-green">{h}</span>
                ))}
              </div>
            </>
          )}
        </Seccio>
      )}

      {/* Experiència */}
      {candidat.experiencies?.length > 0 && (
        <Seccio titol={t('candidateDetail.experience')} icon={Briefcase}>
          <div className="space-y-4">
            {candidat.experiencies.map((e, i) => (
              <div key={i} className="border-l-2 border-primary-200 pl-4">
                <div className="font-semibold text-gray-800">{e.posicio}</div>
                <div className="text-sm text-primary-600">{e.empresa}</div>
                <div className="text-xs text-gray-400">
                  {dateFmt(e.inici)} — {e.fi ? dateFmt(e.fi) : t('candidateDetail.current')}
                </div>
                {e.descripcio && <p className="text-sm text-gray-600 mt-1">{e.descripcio}</p>}
              </div>
            ))}
          </div>
        </Seccio>
      )}

      {/* Formació */}
      {candidat.formacions?.length > 0 && (
        <Seccio titol={t('candidateDetail.education')} icon={GraduationCap}>
          <div className="space-y-3">
            {candidat.formacions.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-800">{f.titol}</div>
                  <div className="text-sm text-gray-500">{f.centre} {f.any && `· ${f.any}`}</div>
                </div>
              </div>
            ))}
          </div>
        </Seccio>
      )}

      {/* Idiomes */}
      {candidat.idiomes?.length > 0 && (
        <Seccio titol={t('candidateDetail.languages')} icon={Globe}>
          <div className="flex flex-wrap gap-3">
            {candidat.idiomes.map((idm) => (
              <div key={idm.idioma} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700">{idm.idioma}</span>
                <span className="badge badge-blue">{idm.nivell}</span>
              </div>
            ))}
          </div>
        </Seccio>
      )}
    </div>
  )
}
