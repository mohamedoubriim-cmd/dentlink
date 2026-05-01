import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check } from 'lucide-react'
import { useRTL } from '../contexts/RTLContext'

const languages = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦' },
  { code: 'ma', label: 'الدارجة', flag: '🇲🇦' },
]

interface Props {
  variant?: 'light' | 'dark'
}

export default function LanguageSwitcher({ variant = 'light' }: Props) {
  const { i18n } = useTranslation()
  const { isRTL } = useRTL()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = languages.find((l) => l.code === i18n.language) ?? languages[0]

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const btnClass = variant === 'dark'
    ? 'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-sm font-medium text-white transition-colors'
    : 'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={btnClass}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 ${
            isRTL ? 'left-0' : 'right-0'
          }`}
        >
          {languages.map((lang) => {
            const active = lang.code === i18n.language
            return (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  active ? 'text-primary-600 font-medium' : 'text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
                {active && <Check size={14} className="text-primary-600" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
