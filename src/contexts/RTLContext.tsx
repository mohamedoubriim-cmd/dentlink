import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface RTLContextType {
  isRTL: boolean
}

const RTLContext = createContext<RTLContextType>({ isRTL: false })

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const [isRTL, setIsRTL] = useState(() => ['ar', 'ma'].includes(i18n.language))

  useEffect(() => {
    const handler = (lng: string) => {
      setIsRTL(['ar', 'ma'].includes(lng))
    }
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [i18n])

  return <RTLContext.Provider value={{ isRTL }}>{children}</RTLContext.Provider>
}

export function useRTL() {
  return useContext(RTLContext)
}
