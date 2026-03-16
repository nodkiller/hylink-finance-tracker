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
  if (!user) return { error: '未登录' }

  const full_name = (formData.get('full_name') as string).trim()
  if (!full_name) return { error: '姓名不能为空' }

  const db = adminClient()
  const { error } = await db.from('profiles').update({ full_name }).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: '姓名已更新' }
}

export async function updateEmail(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser()
  if (!user) return { error: '未登录' }

  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email || !email.includes('@')) return { error: '请输入有效邮箱' }
  if (email === user.email) return { error: '新邮箱与当前邮箱相同' }

  const db = adminClient()
  const { error } = await db.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
  })
  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: '邮箱已更新，请用新邮箱重新登录' }
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser()
  if (!user) return { error: '未登录' }

  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (!password) return { error: '请输入新密码' }
  if (password.length < 8) return { error: '密码至少 8 位' }
  if (password !== confirm) return { error: '两次密码输入不一致' }

  const db = adminClient()
  const { error } = await db.auth.admin.updateUserById(user.id, { password })
  if (error) return { error: error.message }

  return { success: '密码已更新' }
}
