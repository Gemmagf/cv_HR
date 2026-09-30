import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { BadgeCheck, Clock, ListChecks, Link2, ExternalLink, Sparkles, Send } from 'lucide-react'
import { skillTestsApi } from '../../utils/api'
import { pickText, encodeInviteToken, inviteUrl } from '../../utils/skillsEngine'

/**
 * Panell de proves recomanades.
 *
 * Mode candidat (candidateId): cada prova té accions "Copiar enllaç" (invitació) i "Previsualitzar".
 * Mode selecció (onToggle + selected): checkbox per associar la prova a un encàrrec.
 *
 * recommendations: [{ test, reason, matched, verified }]
 */
export default function SkillTestRecommendations({
  recommendations = [],
  candidateId = null,
  candidateName = null,
  assignmentId = null,
  selected = null,
  onToggle = null,
  title,
  hint,
  emptyText,
  showInviteAll = true,
}) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(null)
  const selectable = typeof onToggle === 'function'

  const copiar = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('skills.linkCopied'))
    } catch {
      window.prompt(t('skills.copyLink'), text)
    }
  }

  const convidar = async (testId) => {
    setBusy(testId)
    try {
      const { data } = await skillTestsApi.crearInvitacio({ candidate_id: candidateId, test_id: testId, assignment_id: assignmentId })
      await copiar(data.url)
    } catch {
      toast.error(t('skills.inviteError'))
    } finally {
      setBusy(null)
    }
  }

  const convidarTotes = async () => {
    const pendents = recommendations.filter((r) => !r.verified)
    if (pendents.length === 0) return
    setBusy('all')
    try {
      const urls = []
      for (const r of pendents) {
        const { data } = await skillTestsApi.crearInvitacio({ candidate_id: candidateId, test_id: r.test.id, assignment_id: assignmentId })
        urls.push(`${pickText(r.test.title, i18n.language)}: ${data.url}`)
      }
      await copiar(urls.join('\n'))
      toast.success(t('skills.invitesCreated', { n: urls.length }))
    } catch {
      toast.error(t('skills.inviteError'))
    } finally {
      setBusy(null)
    }
  }

  const previsualitzar = (testId) => {
    const token = encodeInviteToken({ candidateId: null, testId, assignmentId, candidateName })
    window.open(inviteUrl(token), '_blank', 'noopener')
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles size={18} className="text-accent-500" />
            {title || t('skills.recommended')}
          </h3>
          {hint !== null && <p className="text-xs text-gray-500 mt-1">{hint || t('skills.recommendedHint')}</p>}
        </div>
        {candidateId != null && showInviteAll && recommendations.some((r) => !r.verified) && (
          <button onClick={convidarTotes} disabled={busy === 'all'} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0 disabled:opacity-60">
            <Send size={13} /> {t('skills.inviteAll')}
          </button>
        )}
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{emptyText || t('skills.noRecommended')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {recommendations.map(({ test, reason, matched, verified }) => {
            const isSelected = selectable && selected?.includes(test.id)
            return (
              <li key={test.id} className="py-3 flex items-start gap-3">
                {selectable && (
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-primary-800 flex-shrink-0"
                    checked={!!isSelected}
                    onChange={() => onToggle(test.id)}
                    aria-label={pickText(test.title, i18n.language)}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{pickText(test.title, i18n.language)}</span>
                    <span className="badge badge-gray">{t(`skills.categories.${test.category}`)}</span>
                    {verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <BadgeCheck size={13} /> {t('skills.alreadyVerified')} · {Math.round(verified.score)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{pickText(test.description, i18n.language)}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><ListChecks size={12} /> {t('skills.questions', { n: test.questions.length })}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {t('skills.minutes', { n: test.duration_min })}</span>
                    {reason && matched && (
                      <span className="text-primary-600">{t(`skills.reasons.${reason}`, { v: matched })}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
                  {candidateId != null && !verified && (
                    <button onClick={() => convidar(test.id)} disabled={busy === test.id}
                      className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 disabled:opacity-60" title={t('skills.copyLink')}>
                      <Link2 size={13} /> {t('skills.invite')}
                    </button>
                  )}
                  <button onClick={() => previsualitzar(test.id)} className="text-xs text-gray-500 hover:text-primary-700 flex items-center gap-1 px-2 py-1" title={t('skills.preview')}>
                    <ExternalLink size={13} /> {t('skills.preview')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
