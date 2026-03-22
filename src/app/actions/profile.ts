'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: string } | undefined

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function updateDisplayName(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const full_name = (formData.get('full_name') as string).trim()
  if (!full_name) return { error: 'errors.nameEmpty' }

  const db = adminClient()
  const { error } = await db.from('profiles').update({ full_name }).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: 'profile.nameUpdated' }
}

export async function updateEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email || !email.includes('@')) return { error: 'errors.invalidEmail' }
  if (email === user.email) return { error: 'errors.emailSame' }

  const db = adminClient()
  const { error } = await db.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
  })
  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: 'profile.emailUpdated' }
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (!password) return { error: 'errors.enterPassword' }
  if (password.length < 8) return { error: 'errors.passwordMin8' }
  if (password !== confirm) return { error: 'errors.passwordsNotMatch' }

  const db = adminClient()
  const { error } = await db.auth.admin.updateUserById(user.id, { password })
  if (error) return { error: error.message }

  return { success: 'profile.passwordUpdated' }
}
