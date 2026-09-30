import { useTranslation } from 'react-i18next'
import { BadgeCheck } from 'lucide-react'
import { verifiedSkills } from '../../utils/skillsEngine'

/**
 * Insígnies de les habilitats acreditades amb una mini-prova.
 * resultats: [{ test_id, skill, score, passed, level, data }]
 */
export default function VerifiedSkillBadges({ resultats = [], compact = false, max }) {
  const { t, i18n } = useTranslation()
  const verificades = verifiedSkills(resultats)
  if (verificades.length === 0) return null

  const mostrar = max ? verificades.slice(0, max) : verificades
  const restants = verificades.length - mostrar.length

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
        title={verificades.map((v) => `${v.skill} · ${v.score}%`).join(', ')}>
        <BadgeCheck size={12} />
        {t('skills.verifiedShort', { n: verificades.length })}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {mostrar.map((v) => (
        <span
          key={v.test_id}
          className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs font-medium"
          title={v.data ? t('skills.verifiedOn', { date: new Date(v.data).toLocaleDateString(i18n.language) }) : undefined}
        >
          <BadgeCheck size={14} className="text-emerald-600" />
          {v.skill}
          <span className="font-bold">{Math.round(v.score)}%</span>
          <span className="text-emerald-600/80">· {t(`skills.levels.${v.level}`)}</span>
        </span>
      ))}
      {restants > 0 && <span className="badge badge-gray">+{restants}</span>}
    </div>
  )
}
