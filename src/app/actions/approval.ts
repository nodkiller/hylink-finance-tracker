'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean; projectCode?: string } | undefined

function adminClient() {
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

/** Generate project code: BrandName-YYYY-MM, with suffix if already taken */
async function generateProjectCode(brandName: string): Promise<string> {
  const db = adminClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const base = `${brandName}-${year}-${month}`

  // Check existing codes with this base
  const { data } = await db
    .from('projects')
    .select('project_code')
    .like('project_code', `${base}%`)

  const existing = new Set((data ?? []).map(r => r.project_code))
  if (!existing.has(base)) return base

  // Append incrementing suffix
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export async function approveProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertController()
  if (!user) return { error: '无权限' }

  const projectId = formData.get('project_id') as string
  const brandName = formData.get('brand_name') as string

  const projectCode = await generateProjectCode(brandName)

  const { error } = await adminClient()
    .from('projects')
    .update({
      status: 'Active',
      project_code: projectCode,
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true, projectCode }
}

export async function rejectProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertController()
  if (!user) return { error: '无权限' }

  const projectId = formData.get('project_id') as string
  const reason = (formData.get('reason') as string)?.trim() || null

  const { error } = await adminClient()
    .from('projects')
    .update({
      status: 'Rejected',
      rejection_reason: reason,
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true }
}
