import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../i18n'
import { Globe, ChevronUp, ChevronDown } from 'lucide-react'

export default function LanguageSwitcher({ dark = false, dropUp = true }) {
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

  const textColor = dark
    ? 'text-primary-200 hover:text-white'
    : 'text-gray-600 hover:text-gray-900'

  const menuPos = dropUp
    ? 'bottom-full mb-1 bg-primary-900 border-primary-700 text-primary-200'
    : 'top-full mt-1 bg-white border-gray-200 text-gray-700'

  const itemActive = dropUp
    ? 'bg-accent-500/20 text-accent-400 font-semibold'
    : 'bg-primary-50 text-primary-800 font-semibold'

  const itemHover = dropUp
    ? 'hover:bg-white/10 hover:text-white'
    : 'hover:bg-gray-50'

  const checkColor = dropUp ? 'text-accent-400' : 'text-primary-600'

  const ChevronIcon = dropUp
    ? (open ? ChevronUp : ChevronDown)
    : (open ? ChevronUp : ChevronDown)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-sm font-medium transition-colors px-2 py-1.5 rounded-lg w-full ${textColor}`}
        title="Canviar idioma"
      >
        <Globe size={15} />
        <span>{current.lang.name}</span>
        <ChevronIcon
          size={13}
          className={`ml-auto transition-transform duration-200 ${open && dropUp ? 'rotate-0' : open && !dropUp ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 border rounded-xl overflow-hidden z-[200] shadow-2xl ${menuPos}`}>
          {LANGUAGES.map((l) => (
            <button
              key={l.lang.code}
              onClick={() => handleSelect(l.lang.code)}
              className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left transition-colors
                ${l.lang.code === i18n.language ? itemActive : itemHover}`}
            >
              <span>{l.lang.name}</span>
              {l.lang.code === i18n.language && (
                <span className={`ml-auto text-xs ${checkColor}`}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
