import { cookies } from 'next/headers'

export type Locale = 'en' | 'zh'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get('locale')?.value
  return value === 'zh' ? 'zh' : 'en'
}
