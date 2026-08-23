/* eslint-disable react-refresh/only-export-components -- Provider and its hook are one small unit. */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Language } from '../types/timesheet'
import { translations, type TranslationKey } from './translations'

const LANGUAGE_STORAGE_KEY = 'synctime-language'

type Replacements = Record<string, string | number>

interface I18nValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, replacements?: Replacements) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored === 'en' || stored === 'es') return stored
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = useCallback((nextLanguage: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    document.documentElement.lang = nextLanguage
    setLanguageState(nextLanguage)
  }, [])

  const t = useCallback(
    (key: TranslationKey, replacements: Replacements = {}) => {
      let value: string = translations[language][key]
      for (const [placeholder, replacement] of Object.entries(replacements)) {
        value = value.replaceAll(`{${placeholder}}`, String(replacement))
      }
      return value
    },
    [language],
  )

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within I18nProvider')
  return value
}
