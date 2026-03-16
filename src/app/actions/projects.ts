'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const brand_id = formData.get('brand_id') as string
  const name = (formData.get('name') as string).trim()
  const type = formData.get('type') as string
  const estimated_revenue = parseFloat(formData.get('estimated_revenue') as string)
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!brand_id || !name || !type || isNaN(estimated_revenue)) {
    return { error: '请填写所有必填字段' }
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await adminClient.from('projects').insert({
    brand_id,
    name,
    type,
    estimated_revenue,
    notes,
    status: 'Pending Approval',
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function reconcileProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profile?.role !== 'Controller') return { error: '无权限' }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const project_id = formData.get('project_id') as string

  // Verify current status is Completed
  const { data: proj } = await adminClient
    .from('projects')
    .select('status')
    .eq('id', project_id)
    .single<{ status: string }>()

  if (proj?.status !== 'Completed') return { error: '只有已完成的项目才能标记为已对账' }

  const { error } = await adminClient
    .from('projects')
    .update({ status: 'Reconciled' })
    .eq('id', project_id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${project_id}`)
  revalidatePath('/projects')
  return { success: true }
}
