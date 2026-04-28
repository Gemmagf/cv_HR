import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../i18n'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher({ dark = false }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGUAGES.find((l) => l.lang.code === i18n.language)
    || LANGUAGES.find((l) => l.lang.code === 'ca')

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  const textColor = dark ? 'text-primary-200 hover:text-white' : 'text-gray-600 hover:text-gray-900'
  const menuBg    = 'bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-2 py-1.5 rounded-lg ${textColor}`}
        title="Canviar idioma / Change language"
      >
        <Globe size={16} />
        <span>{current.lang.flag}</span>
        <span className="hidden sm:inline">{current.lang.name}</span>
      </button>

      {open && (
        <div className={`absolute right-0 mt-1 w-48 ${menuBg}`} style={{ bottom: 'auto', top: '100%' }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.lang.code}
              onClick={() => handleSelect(l.lang.code)}
              className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors
                ${l.lang.code === i18n.language
                  ? 'bg-primary-50 text-primary-800 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="text-base">{l.lang.flag}</span>
              <span>{l.lang.name}</span>
              {l.lang.code === i18n.language && (
                <span className="ml-auto text-primary-600 text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
