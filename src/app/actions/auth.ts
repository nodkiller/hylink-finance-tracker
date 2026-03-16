'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionState = { error: string } | { success: boolean } | undefined

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: '邮箱或密码错误' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '登录失败，请重试' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'Staff' | 'Controller' }>()

  if (profile?.role === 'Controller') {
    redirect('/dashboard')
  } else {
    redirect('/projects')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未授权' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: 'Staff' | 'Controller' }>()

  if (profile?.role !== 'Controller') return { error: '无权限' }

  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const fullName = formData.get('full_name') as string

  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role }
  })

  if (error) return { error: error.message }

  if (data.user) {
    await adminClient.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      role: role as 'Staff' | 'Controller',
    })
  }

  return { success: true }
}
