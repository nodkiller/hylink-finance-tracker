'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

const BRAND_MANAGER_ROLES = ['Controller', 'Admin', 'Super Admin']

function getAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertBrandManager() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const db = getAdminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  return profile && BRAND_MANAGER_ROLES.includes(profile.role) ? user : null
}

export async function addBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertBrandManager()
  if (!user) return { error: '无权限' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: '品牌名称不能为空' }

  const { error } = await getAdminClient().from('brands').insert({ name })
  if (error) {
    if (error.code === '23505') return { error: '该品牌名称已存在' }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  return { success: true }
}

export async function updateBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertBrandManager()
  if (!user) return { error: '无权限' }

  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: '品牌名称不能为空' }

  const { error } = await getAdminClient().from('brands').update({ name }).eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: '该品牌名称已存在' }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  revalidatePath(`/admin/brands/${id}`)
  return { success: true }
}

export async function toggleBrandStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertBrandManager()
  if (!user) return { error: '无权限' }

  const id = formData.get('id') as string
  const currentlyActive = formData.get('is_active') === 'true'

  const { error } = await getAdminClient()
    .from('brands').update({ is_active: !currentlyActive }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/brands')
  revalidatePath(`/admin/brands/${id}`)
  return { success: true }
}

export async function deleteBrand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertBrandManager()
  if (!user) return { error: '无权限' }

  const id = formData.get('id') as string
  const { error } = await getAdminClient().from('brands').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/brands')
  return { success: true }
}
