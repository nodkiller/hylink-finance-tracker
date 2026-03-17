'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notifyRoles } from '@/lib/notify'

type ActionState = { error: string } | { success: boolean } | undefined

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const project_id  = formData.get('project_id') as string
  const payee       = (formData.get('payee') as string).trim()
  const invoice_number = (formData.get('invoice_number') as string).trim()
  const description = (formData.get('description') as string).trim()
  const amount      = parseFloat(formData.get('amount') as string)
  const payment_date = (formData.get('payment_date') as string) || null
  const file        = formData.get('attachment') as File | null

  // Validate required fields
  if (!payee || !invoice_number || !description || isNaN(amount) || amount <= 0) {
    return { error: '请填写所有必填字段' }
  }
  if (!file || file.size === 0) {
    return { error: '请上传发票附件' }
  }

  const db = adminClient()

  // Upload file to Supabase Storage
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'

  // Get project code for the filename prefix
  const { data: proj } = await db
    .from('projects')
    .select('project_code')
    .eq('id', project_id)
    .single<{ project_code: string | null }>()

  const prefix = proj?.project_code ?? project_id
  const uuid = crypto.randomUUID()
  const storagePath = `${prefix}_${uuid}.${ext}`

  const fileBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadError } = await db.storage
    .from('invoices')
    .upload(storagePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) return { error: `文件上传失败：${uploadError.message}` }

  const { data: { publicUrl } } = db.storage
    .from('invoices')
    .getPublicUrl(uploadData.path)

  // Fetch approval thresholds from settings
  const { data: settings } = await db
    .from('approval_settings')
    .select('auto_limit, admin_limit')
    .eq('id', 1)
    .single<{ auto_limit: number; admin_limit: number }>()
  const autoLimit = settings?.auto_limit ?? 1000
  const adminLimit = settings?.admin_limit ?? 2000

  // Route to correct approval tier
  const status = amount <= autoLimit
    ? 'Approved'
    : amount <= adminLimit
    ? 'Pending Approval'
    : 'Pending Super Approval'

  const { error } = await db.from('expenses').insert({
    project_id,
    payee,
    invoice_number,
    description,
    amount,
    status,
    attachment_url: publicUrl,
    payment_date,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  // Notify approvers if expense requires approval
  if (status === 'Pending Approval') {
    await notifyRoles(
      ['Controller', 'Admin', 'Super Admin'],
      user.id,
      {
        type: 'expense_submitted',
        title: `付款请求待审批：${payee}`,
        body: `A$${amount.toLocaleString()} · ${description}`,
        link: `/projects/${project_id}`,
      }
    )
  } else if (status === 'Pending Super Approval') {
    await notifyRoles(
      ['Super Admin'],
      user.id,
      {
        type: 'expense_submitted',
        title: `大额付款待审批：${payee}`,
        body: `A$${amount.toLocaleString()} · ${description}`,
        link: `/projects/${project_id}`,
      }
    )
  }

  revalidatePath(`/projects/${project_id}`)
  return { success: true }
}


export async function updateExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) return { error: '无权限' }

  const expense_id     = formData.get('expense_id') as string
  const payee          = (formData.get('payee') as string).trim()
  const invoice_number = (formData.get('invoice_number') as string).trim()
  const description    = (formData.get('description') as string).trim()
  const amount         = parseFloat(formData.get('amount') as string)
  const payment_date   = (formData.get('payment_date') as string) || null
  const file           = formData.get('attachment') as File | null

  if (!payee || !invoice_number || !description || isNaN(amount) || amount <= 0) {
    return { error: '请填写所有必填字段' }
  }

  const db = adminClient()

  const { data: existing } = await db
    .from('expenses')
    .select('project_id, status, attachment_url')
    .eq('id', expense_id)
    .single<{ project_id: string; status: string; attachment_url: string }>()
  if (!existing) return { error: '支出记录不存在' }

  let attachment_url = existing.attachment_url

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const { data: proj } = await db
      .from('projects').select('project_code').eq('id', existing.project_id)
      .single<{ project_code: string | null }>()
    const storagePath = `${proj?.project_code ?? existing.project_id}_${crypto.randomUUID()}.${ext}`
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await db.storage
      .from('invoices').upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadError) return { error: `文件上传失败：${uploadError.message}` }
    attachment_url = db.storage.from('invoices').getPublicUrl(uploadData.path).data.publicUrl
  }

  // Preserve status for terminal states; only recalculate for pending/unapproved states
  let newStatus = existing.status
  if (!['Paid', 'Approved'].includes(existing.status)) {
    const { data: settings } = await db
      .from('approval_settings').select('auto_limit, admin_limit').eq('id', 1)
      .single<{ auto_limit: number; admin_limit: number }>()
    const autoLimit  = settings?.auto_limit  ?? 1000
    const adminLimit = settings?.admin_limit ?? 2000
    newStatus = amount <= autoLimit ? 'Approved'
      : amount <= adminLimit ? 'Pending Approval'
      : 'Pending Super Approval'
  }

  const { error } = await db.from('expenses').update({
    payee, invoice_number, description, amount, payment_date, attachment_url, status: newStatus,
  }).eq('id', expense_id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${existing.project_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) return { error: '无权限' }

  const expense_id = formData.get('expense_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('expenses').select('project_id').eq('id', expense_id)
    .single<{ project_id: string }>()
  if (!existing) return { error: '支出记录不存在' }

  const { error } = await db.from('expenses').delete().eq('id', expense_id)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${existing.project_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function confirmPayment(
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

  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) return { error: '无权限' }

  const expense_id = formData.get('expense_id') as string
  const payment_date = (formData.get('payment_date') as string) || null

  if (!payment_date) return { error: '请选择付款日期' }

  const db = adminClient()

  const { data: expense } = await db
    .from('expenses')
    .select('project_id, status')
    .eq('id', expense_id)
    .single<{ project_id: string; status: string }>()

  if (!expense) return { error: '支出记录不存在' }
  if (expense.status !== 'Approved') return { error: '只有已批准的支出才能确认付款' }

  const { error } = await db
    .from('expenses')
    .update({ status: 'Paid', payment_date })
    .eq('id', expense_id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${expense.project_id}`)
  return { success: true }
}
