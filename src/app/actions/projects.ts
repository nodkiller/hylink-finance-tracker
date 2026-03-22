'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notifyRoles } from '@/lib/notify'

type ActionState = { error: string } | { success: boolean } | undefined

const MANAGE_ROLES = ['Controller', 'Admin', 'Super Admin']
const RECONCILE_ROLES = ['Controller', 'Super Admin']

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertManageRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient()
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  return profile && MANAGE_ROLES.includes(profile.role) ? profile.role : null
}

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const brand_id = formData.get('brand_id') as string
  const name = (formData.get('name') as string).trim()
  const type = formData.get('type') as string
  const estimated_revenue = parseFloat(formData.get('estimated_revenue') as string)
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!brand_id || !name || !type || isNaN(estimated_revenue)) {
    return { error: 'errors.fillRequired' }
  }

  const { error } = await adminClient().from('projects').insert({
    brand_id, name, type, estimated_revenue, notes,
    status: 'Pending Approval',
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/projects')
  revalidatePath('/dashboard')

  // Notify approvers (Controllers, Admins, Super Admins)
  const { data: brand } = await adminClient().from('brands').select('name').eq('id', brand_id).single<{ name: string }>()
  await notifyRoles(
    ['Controller', 'Admin', 'Super Admin'],
    user.id,
    {
      type: 'project_submitted',
      title: `New project pending approval: ${name}`,
      body: `Brand: ${brand?.name ?? '—'} · Est. revenue A$${estimated_revenue.toLocaleString()}`,
      link: '/dashboard',
    }
  )

  return { success: true }
}

export async function completeProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!profile || !MANAGE_ROLES.includes(profile.role)) return { error: 'errors.noPermission' }

  const project_id = formData.get('project_id') as string

  const { data: proj } = await db
    .from('projects').select('status').eq('id', project_id).single<{ status: string }>()
  if (proj?.status !== 'Active') return { error: 'errors.onlyActiveCanComplete' }

  const { error } = await db.from('projects').update({ status: 'Completed' }).eq('id', project_id)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${project_id}`)
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const role = await assertManageRole()
  if (!role) return { error: 'errors.noPermission' }

  const project_id = formData.get('project_id') as string
  const name = (formData.get('name') as string).trim()
  const type = formData.get('type') as string
  const brand_id = formData.get('brand_id') as string
  const estimated_revenue = parseFloat(formData.get('estimated_revenue') as string)
  const project_code = (formData.get('project_code') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!name || !type || !brand_id || isNaN(estimated_revenue)) {
    return { error: 'errors.fillRequired' }
  }

  const db = adminClient()
  const { error } = await db
    .from('projects')
    .update({ name, type, brand_id, estimated_revenue, project_code, notes })
    .eq('id', project_id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${project_id}`)
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProject(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const role = await assertManageRole()
  if (!role) return { error: 'errors.noPermission' }

  const project_id = formData.get('project_id') as string
  const db = adminClient()

  await db.from('revenues').delete().eq('project_id', project_id)
  await db.from('expenses').delete().eq('project_id', project_id)

  const { error } = await db.from('projects').delete().eq('id', project_id)
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
  if (!user) return { error: 'errors.notLoggedIn' }

  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!profile || !RECONCILE_ROLES.includes(profile.role)) return { error: 'errors.controllerSuperAdminOnly' }

  const project_id = formData.get('project_id') as string

  const { data: proj } = await db
    .from('projects').select('status').eq('id', project_id).single<{ status: string }>()
  if (proj?.status !== 'Completed') return { error: 'errors.onlyCompletedCanReconcile' }

  // All revenues must be Paid
  const { data: revenues } = await db
    .from('revenues').select('status').eq('project_id', project_id)
  const unpaidCount = (revenues ?? []).filter(r => r.status !== 'Paid').length
  if (unpaidCount > 0) {
    return { error: `errors.unpaidRevenuesPreventReconcile:${unpaidCount}` }
  }

  // All expenses must be Paid or Rejected
  const { data: expenses } = await db
    .from('expenses').select('status').eq('project_id', project_id)
  const pendingCount = (expenses ?? []).filter(e => !['Paid', 'Rejected'].includes(e.status)).length
  if (pendingCount > 0) {
    return { error: `errors.pendingExpensesPreventReconcile:${pendingCount}` }
  }

  const { error } = await db.from('projects').update({ status: 'Reconciled' }).eq('id', project_id)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${project_id}`)
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  return { success: true }
}
