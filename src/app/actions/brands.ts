'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

function getAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertController() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  return profile?.role === 'Controller' ? user : null
}

export async function addBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertController()
  if (!user) return { error: '无权限' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: '品牌名称不能为空' }

  const { error } = await getAdminClient()
    .from('brands')
    .insert({ name })

  if (error) {
    if (error.code === '23505') return { error: '该品牌名称已存在' }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  return { success: true }
}

export async function deleteBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertController()
  if (!user) return { error: '无权限' }

  const id = formData.get('id') as string

  const { error } = await getAdminClient()
    .from('brands')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/brands')
  return { success: true }
}
