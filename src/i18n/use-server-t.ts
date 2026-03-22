import { getLocale } from './get-locale'
import { getDictionary, createT } from './dictionary'

export async function getServerT() {
  const locale = await getLocale()
  const dictionary = await getDictionary(locale)
  return createT(dictionary)
}

export async function getServerLocale() {
  return getLocale()
}
