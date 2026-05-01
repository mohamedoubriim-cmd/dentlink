import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import fr from '../locales/fr.json'
import ar from '../locales/ar.json'
import ma from '../locales/ma.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
      ma: { translation: ma },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'ar', 'ma'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'dentlink_lang',
      caches: ['localStorage'],
    },
  })

i18n.on('languageChanged', (lng) => {
  const isRTL = ['ar', 'ma'].includes(lng)
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  document.documentElement.lang = lng === 'fr' ? 'fr' : 'ar'
})

// Apply direction on initial load
const initialLang = i18n.language
if (['ar', 'ma'].includes(initialLang)) {
  document.documentElement.dir = 'rtl'
  document.documentElement.lang = 'ar'
}

export default i18n
