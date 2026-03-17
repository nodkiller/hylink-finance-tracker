'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function addRevenue(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await adminClient()
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) return { error: '无权限' }

  const project_id = formData.get('project_id') as string
  const description = (formData.get('description') as string).trim()
  const invoice_number = (formData.get('invoice_number') as string)?.trim() || null
  const amount = parseFloat(formData.get('amount') as string)
  const issue_date = formData.get('issue_date') as string
  const status = (formData.get('status') as string) || 'Unpaid'
  const received_date = (formData.get('received_date') as string) || null

  if (!description || !issue_date || isNaN(amount) || amount <= 0) {
    return { error: '请填写所有必填字段' }
  }
  if (status === 'Paid' && !received_date) {
    return { error: '状态为已收款时，请填写收款日期' }
  }

  const { error } = await adminClient().from('revenues').insert({
    project_id,
    description,
    invoice_number,
    amount,
    issue_date,
    status,
    received_date,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${project_id}`)
  return { success: true }
}

export async function updateRevenue(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await adminClient()
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) return { error: '无权限' }

  const revenue_id = formData.get('revenue_id') as string
  const description = (formData.get('description') as string).trim()
  const invoice_number = (formData.get('invoice_number') as string)?.trim() || null
  const amount = parseFloat(formData.get('amount') as string)
  const issue_date = formData.get('issue_date') as string
  const status = (formData.get('status') as string) || 'Unpaid'
  const received_date = (formData.get('received_date') as string) || null

  if (!description || !issue_date || isNaN(amount) || amount <= 0) {
    return { error: '请填写所有必填字段' }
  }
  if (status === 'Paid' && !received_date) {
    return { error: '状态为已收款时，请填写收款日期' }
  }

  const db = adminClient()
  const { data: existing } = await db
    .from('revenues').select('project_id').eq('id', revenue_id)
    .single<{ project_id: string }>()
  if (!existing) return { error: '收入记录不存在' }

  const { error } = await db.from('revenues').update({
    description, invoice_number, amount, issue_date, status, received_date,
  }).eq('id', revenue_id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${existing.project_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function markRevenuePaid(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const revenue_id = formData.get('revenue_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('revenues').select('project_id, status').eq('id', revenue_id)
    .single<{ project_id: string; status: string }>()
  if (!existing) return { error: '收入记录不存在' }
  if (existing.status === 'Paid') return { error: '已收款' }

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await db.from('revenues').update({
    status: 'Paid',
    received_date: today,
  }).eq('id', revenue_id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${existing.project_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteRevenue(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await adminClient()
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) return { error: '无权限' }

  const revenue_id = formData.get('revenue_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('revenues').select('project_id').eq('id', revenue_id)
    .single<{ project_id: string }>()
  if (!existing) return { error: '收入记录不存在' }

  const { error } = await db.from('revenues').delete().eq('id', revenue_id)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${existing.project_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}
