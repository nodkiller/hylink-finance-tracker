'use client'

import { createContext, useContext } from 'react'
import type { Dictionary } from './dictionary'
import { createT } from './dictionary'

type TFunction = (key: string) => string

interface I18nContextValue {
  t: TFunction
  locale: string
}

const I18nContext = createContext<I18nContextValue>({
  t: (key) => key,
  locale: 'en',
})

export function LocaleProvider({
  dictionary,
  locale,
  children,
}: {
  dictionary: Dictionary
  locale: string
  children: React.ReactNode
}) {
  const t = createT(dictionary)
  return (
    <I18nContext.Provider value={{ t, locale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}
