'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setLocale(locale: string) {
  const cookieStore = await cookies()
  cookieStore.set('locale', locale === 'zh' ? 'zh' : 'en', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}
