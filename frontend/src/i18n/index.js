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
import nl from './locales/nl'

export const LANGUAGES = [ca, es, en, fr, de, it, pt, pl, ro, nl]

const resources = Object.fromEntries(
  LANGUAGES.map((l) => [l.lang.code, { translation: l }])
)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ca',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'cvhunter-lang',
    },
    interpolation: { escapeValue: false },
  })

export default i18n
