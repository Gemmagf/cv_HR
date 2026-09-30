import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ca from './locales/ca'
import es from './locales/es'
import en from './locales/en'
import fr from './locales/fr'
import de from './locales/de'
import it from './locales/it'
import pt from './locales/pt'
import pl from './locales/pl'
import ro from './locales/ro'

// Claus del mòdul de mini-proves d'habilitats, separades per mantenir els locales base llegibles
import skillsCa from './locales/skills/ca'
import skillsEs from './locales/skills/es'
import skillsEn from './locales/skills/en'
import skillsFr from './locales/skills/fr'
import skillsDe from './locales/skills/de'
import skillsIt from './locales/skills/it'
import skillsPt from './locales/skills/pt'
import skillsPl from './locales/skills/pl'
import skillsRo from './locales/skills/ro'

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

/** Fusió profunda: les claus del segon objecte s'afegeixen (o sobreescriuen) al primer. */
export function deepMerge(base, extra) {
  const out = { ...base }
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v
  }
  return out
}

export const LANGUAGES = [
  deepMerge(ca, skillsCa),
  deepMerge(es, skillsEs),
  deepMerge(en, skillsEn),
  deepMerge(fr, skillsFr),
  deepMerge(de, skillsDe),
  deepMerge(it, skillsIt),
  deepMerge(pt, skillsPt),
  deepMerge(pl, skillsPl),
  deepMerge(ro, skillsRo),
]

const resources = Object.fromEntries(
  LANGUAGES.map((l) => [l.lang.code, { translation: l }])
)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ca',
    supportedLngs: LANGUAGES.map((l) => l.lang.code),
    nonExplicitSupportedLngs: true,   // 'es-ES' → 'es'
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'cvhunter-lang',
    },
    interpolation: { escapeValue: false },
  })

export default i18n
