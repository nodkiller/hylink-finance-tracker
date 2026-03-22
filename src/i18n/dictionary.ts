import type { Locale } from './get-locale'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dictionary = Record<string, any>

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./locales/en.json').then(m => m.default),
  zh: () => import('./locales/zh.json').then(m => m.default),
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]()
}

export function createT(dictionary: Dictionary) {
  return function t(key: string): string {
    const result = key.split('.').reduce(
      (obj: Dictionary | string | undefined, k: string) => {
        if (obj && typeof obj === 'object') return obj[k]
        return undefined
      },
      dictionary
    )
    return typeof result === 'string' ? result : key
  }
}
