'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

const VALID_ROLES = ['Super Admin', 'Controller', 'PM', 'Viewer']

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertSuperAdmin(): Promise<string | null> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  return profile?.role === 'Super Admin' ? user.id : null
}

export async function inviteUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callerId = await assertSuperAdmin()
  if (!callerId) return { error: 'errors.superAdminOnly' }

  const email = (formData.get('email') as string).trim()
  const full_name = (formData.get('full_name') as string).trim()
  const role = formData.get('role') as string

  if (!email || !full_name) return { error: 'errors.fillNameEmail' }
  if (!VALID_ROLES.includes(role)) return { error: 'errors.invalidRole' }

  const db = adminClient()
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
  })

  if (error) return { error: error.message }

  if (data.user) {
    await db.from('profiles').upsert({
      id: data.user.id,
      full_name,
      role,
    })
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateUserRole(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callerId = await assertSuperAdmin()
  if (!callerId) return { error: 'errors.superAdminOnly' }

  const target_id = formData.get('user_id') as string
  const role = formData.get('role') as string

  if (!VALID_ROLES.includes(role)) return { error: 'errors.invalidRole' }
  if (target_id === callerId) return { error: 'errors.cannotChangeOwnRole' }

  const db = adminClient()
  const { error } = await db.from('profiles').update({ role }).eq('id', target_id)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function suspendUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callerId = await assertSuperAdmin()
  if (!callerId) return { error: 'errors.superAdminOnly' }

  const target_id = formData.get('user_id') as string
  if (target_id === callerId) return { error: 'errors.cannotSuspendOwn' }

  const db = adminClient()
  const { data: targetProfile } = await db
    .from('profiles').select('role').eq('id', target_id).single<{ role: string }>()
  if (targetProfile?.role === 'Super Admin') return { error: 'errors.cannotSuspendSuper' }

  const { error } = await db.auth.admin.updateUserById(target_id, {
    ban_duration: '87600h', // 10 years
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function activateUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callerId = await assertSuperAdmin()
  if (!callerId) return { error: 'errors.superAdminOnly' }

  const target_id = formData.get('user_id') as string
  const db = adminClient()

  const { error } = await db.auth.admin.updateUserById(target_id, {
    ban_duration: 'none',
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function sendPasswordReset(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callerId = await assertSuperAdmin()
  if (!callerId) return { error: 'errors.superAdminOnly' }

  const email = formData.get('email') as string
  if (!email) return { error: 'errors.emailEmpty' }

  // Use anon client — resetPasswordForEmail is a public auth endpoint
  const anonClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await anonClient.auth.resetPasswordForEmail(email)
  if (error) return { error: error.message }

  return { success: true }
}
