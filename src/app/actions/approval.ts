'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notify } from '@/lib/notify'

type ActionState = { error: string } | { success: boolean; projectCode?: string } | undefined

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertApprover() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (!['Controller', 'Super Admin'].includes(profile?.role ?? '')) return null
  return user
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
  const user = await assertApprover()
  if (!user) return { error: '无权限' }

  const projectId = formData.get('project_id') as string
  const brandName = formData.get('brand_name') as string
  const comment = (formData.get('comment') as string)?.trim() || null

  const projectCode = await generateProjectCode(brandName)
  const db = adminClient()

  const { error } = await db
    .from('projects')
    .update({ status: 'Active', project_code: projectCode })
    .eq('id', projectId)

  if (error) return { error: error.message }

  await db.from('project_approvals').insert({
    project_id: projectId,
    action: 'approved',
    comment,
    approved_by: user.id,
  })

  // Notify project creator
  const { data: proj } = await db.from('projects').select('created_by, name').eq('id', projectId).single<{ created_by: string; name: string }>()
  if (proj?.created_by) {
    await notify([{
      user_id: proj.created_by,
      type: 'project_approved',
      title: `项目已批准：${proj.name}`,
      body: `项目代码：${projectCode}`,
      link: `/projects/${projectId}`,
    }])
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true, projectCode }
}

export async function rejectProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertApprover()
  if (!user) return { error: '无权限' }

  const projectId = formData.get('project_id') as string
  const reason = (formData.get('reason') as string)?.trim() || null
  const db = adminClient()

  const { error } = await db
    .from('projects')
    .update({ status: 'Rejected', rejection_reason: reason })
    .eq('id', projectId)

  if (error) return { error: error.message }

  await db.from('project_approvals').insert({
    project_id: projectId,
    action: 'rejected',
    comment: reason,
    approved_by: user.id,
  })

  // Notify project creator
  const { data: proj } = await db.from('projects').select('created_by, name').eq('id', projectId).single<{ created_by: string; name: string }>()
  if (proj?.created_by) {
    await notify([{
      user_id: proj.created_by,
      type: 'project_rejected',
      title: `项目已拒绝：${proj.name}`,
      body: reason ?? undefined,
      link: `/projects/${projectId}`,
    }])
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true }
}
