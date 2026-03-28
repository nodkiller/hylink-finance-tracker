'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notify, notifyRoles } from '@/lib/notify'

type ActionState = { error: string } | { success: boolean } | undefined

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
    .select('role, full_name')
    .eq('id', user.id)
    .single<{ role: string; full_name: string | null }>()
  const role = profile?.role
  if (role === 'Admin' || role === 'Super Admin' || role === 'Controller') {
    return { user, role, full_name: profile?.full_name }
  }
  return null
}

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient()
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single<{ role: string; full_name: string | null }>()
  if (profile?.role === 'Super Admin') {
    return { user, role: profile.role, full_name: profile?.full_name }
  }
  return null
}

export async function createReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const title = (formData.get('title') as string)?.trim()
  const category = formData.get('category') as string
  const project_id = (formData.get('project_id') as string) || null
  const amount = parseFloat(formData.get('amount') as string)
  const expense_date = formData.get('expense_date') as string
  const description = (formData.get('description') as string)?.trim() || null
  const bank_bsb = (formData.get('bank_bsb') as string)?.trim()
  const bank_account = (formData.get('bank_account') as string)?.trim()
  const bank_account_name = (formData.get('bank_account_name') as string)?.trim()
  const saveAsDraft = formData.get('save_as_draft') === 'true'

  // Validate required fields
  if (!title || !category || !expense_date || isNaN(amount) || amount <= 0) {
    return { error: 'errors.fillRequired' }
  }
  if (!bank_bsb || !bank_account || !bank_account_name) {
    return { error: 'errors.fillRequired' }
  }

  const validCategories = ['travel', 'transport', 'dining', 'office', 'other']
  if (!validCategories.includes(category)) {
    return { error: 'errors.fillRequired' }
  }

  const db = adminClient()

  // Upload receipt files
  const receiptUrls: string[] = []
  const files = formData.getAll('receipts') as File[]
  const validFiles = files.filter(f => f && f.size > 0)

  // We need the reimbursement ID for storage path, so create the record first with empty receipts
  const status = saveAsDraft ? 'draft' : 'pending'

  const insertData: Record<string, unknown> = {
    title,
    category,
    project_id: project_id || null,
    amount,
    expense_date,
    description,
    bank_bsb,
    bank_account,
    bank_account_name,
    status,
    submitted_by: user.id,
    submitted_at: saveAsDraft ? null : new Date().toISOString(),
    receipt_urls: [],
  }

  const { data: inserted, error: insertError } = await db
    .from('reimbursements')
    .insert(insertData)
    .select('id, reimbursement_no')
    .single<{ id: string; reimbursement_no: string }>()

  if (insertError) return { error: insertError.message }

  // Upload files now that we have the ID
  for (const file of validFiles) {
    if (receiptUrls.length >= 5) break
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `receipts/${user.id}/${inserted.id}/${Date.now()}_${safeName}`

    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await db.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = db.storage
        .from('receipts')
        .getPublicUrl(uploadData.path)
      receiptUrls.push(publicUrl)
    }
  }

  // Update with receipt URLs if any were uploaded
  if (receiptUrls.length > 0) {
    await db
      .from('reimbursements')
      .update({ receipt_urls: receiptUrls })
      .eq('id', inserted.id)
  }

  // Notify approvers if submitted (not draft)
  if (!saveAsDraft) {
    await notifyRoles(
      ['Controller', 'Admin', 'Super Admin'],
      user.id,
      {
        type: 'reimbursement_submitted',
        title: `Reimbursement pending approval: ${title}`,
        body: `A$${amount.toLocaleString()} - ${inserted.reimbursement_no}`,
        link: `/reimbursements/${inserted.id}`,
      }
    )
  }

  revalidatePath('/reimbursements')
  return { success: true }
}

export async function updateReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by, receipt_urls')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string; receipt_urls: string[] }>()

  if (!existing) return { error: 'errors.recordNotFound' }
  if (!['draft', 'needs_info'].includes(existing.status)) return { error: 'errors.noPermission' }
  if (existing.submitted_by !== user.id) return { error: 'errors.noPermission' }

  const title = (formData.get('title') as string)?.trim()
  const category = formData.get('category') as string
  const project_id = (formData.get('project_id') as string) || null
  const amount = parseFloat(formData.get('amount') as string)
  const expense_date = formData.get('expense_date') as string
  const description = (formData.get('description') as string)?.trim() || null
  const bank_bsb = (formData.get('bank_bsb') as string)?.trim()
  const bank_account = (formData.get('bank_account') as string)?.trim()
  const bank_account_name = (formData.get('bank_account_name') as string)?.trim()

  if (!title || !category || !expense_date || isNaN(amount) || amount <= 0) {
    return { error: 'errors.fillRequired' }
  }
  if (!bank_bsb || !bank_account || !bank_account_name) {
    return { error: 'errors.fillRequired' }
  }

  // Handle new file uploads
  let receiptUrls = existing.receipt_urls || []
  const files = formData.getAll('receipts') as File[]
  const validFiles = files.filter(f => f && f.size > 0)

  for (const file of validFiles) {
    if (receiptUrls.length >= 5) break
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `receipts/${user.id}/${existing.id}/${Date.now()}_${safeName}`
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await db.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = db.storage
        .from('receipts')
        .getPublicUrl(uploadData.path)
      receiptUrls.push(publicUrl)
    }
  }

  const { error } = await db
    .from('reimbursements')
    .update({
      title,
      category,
      project_id: project_id || null,
      amount,
      expense_date,
      description,
      bank_bsb,
      bank_account,
      bank_account_name,
      receipt_urls: receiptUrls,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  revalidatePath('/reimbursements')
  revalidatePath(`/reimbursements/${reimbursement_id}`)
  return { success: true }
}

export async function submitReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by, title, amount, reimbursement_no')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string; title: string; amount: number; reimbursement_no: string }>()

  if (!existing) return { error: 'errors.recordNotFound' }
  if (existing.status !== 'draft') return { error: 'errors.noPermission' }
  if (existing.submitted_by !== user.id) return { error: 'errors.noPermission' }

  const { error } = await db
    .from('reimbursements')
    .update({
      status: 'pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  // Notify approvers
  await notifyRoles(
    ['Controller', 'Admin', 'Super Admin'],
    user.id,
    {
      type: 'reimbursement_submitted',
      title: `Reimbursement pending approval: ${existing.title}`,
      body: `A$${Number(existing.amount).toLocaleString()} - ${existing.reimbursement_no}`,
      link: `/reimbursements/${existing.id}`,
    }
  )

  revalidatePath('/reimbursements')
  revalidatePath(`/reimbursements/${reimbursement_id}`)
  return { success: true }
}

export async function approveReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertApprover()
  if (!approver) return { error: 'errors.noPermission' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const comment = (formData.get('comment') as string)?.trim() || null
  const db = adminClient()

  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by, title, amount, reimbursement_no')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string; title: string; amount: number; reimbursement_no: string }>()

  if (!existing) return { error: 'errors.recordNotFound' }

  // Two-level approval:
  // Controller/Admin on 'pending'/'needs_info' → 'controller_approved'
  // Super Admin on 'pending'/'needs_info'/'controller_approved' → 'approved'
  const isSuperAdmin = approver.role === 'Super Admin'
  const validStatuses = isSuperAdmin
    ? ['pending', 'needs_info', 'controller_approved']
    : ['pending', 'needs_info']

  if (!validStatuses.includes(existing.status)) return { error: 'errors.expenseNotPending' }

  const newStatus = isSuperAdmin ? 'approved' : 'controller_approved'

  const { error } = await db
    .from('reimbursements')
    .update({
      status: newStatus,
      approved_by: approver.user.id,
      approved_at: new Date().toISOString(),
      approval_comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  if (isSuperAdmin) {
    // Notify submitter that it's fully approved
    await notify([{
      user_id: existing.submitted_by,
      type: 'reimbursement_approved',
      title: `Reimbursement approved: ${existing.title}`,
      body: `A$${Number(existing.amount).toLocaleString()} - ${existing.reimbursement_no}`,
      link: `/reimbursements/${existing.id}`,
    }])
  } else {
    // Controller approved → notify Super Admin for final review
    await notifyRoles(
      ['Super Admin'],
      approver.user.id,
      {
        type: 'reimbursement_controller_approved',
        title: `Reimbursement awaiting final approval: ${existing.title}`,
        body: `A$${Number(existing.amount).toLocaleString()} - ${existing.reimbursement_no} (reviewed by ${approver.full_name || 'Controller'})`,
        link: `/reimbursements/${existing.id}`,
      }
    )
  }

  revalidatePath('/reimbursements')
  revalidatePath(`/reimbursements/${reimbursement_id}`)
  return { success: true }
}

export async function rejectReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertApprover()
  if (!approver) return { error: 'errors.noPermission' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const comment = (formData.get('comment') as string)?.trim()

  if (!comment) return { error: 'errors.fillRequired' }

  const db = adminClient()
  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by, title, amount, reimbursement_no')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string; title: string; amount: number; reimbursement_no: string }>()

  if (!existing) return { error: 'errors.recordNotFound' }
  if (!['pending', 'needs_info', 'controller_approved'].includes(existing.status)) return { error: 'errors.expenseNotPending' }

  const { error } = await db
    .from('reimbursements')
    .update({
      status: 'rejected',
      approved_by: approver.user.id,
      approved_at: new Date().toISOString(),
      approval_comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  await notify([{
    user_id: existing.submitted_by,
    type: 'reimbursement_rejected',
    title: `Reimbursement rejected: ${existing.title}`,
    body: comment,
    link: `/reimbursements/${existing.id}`,
  }])

  revalidatePath('/reimbursements')
  revalidatePath(`/reimbursements/${reimbursement_id}`)
  return { success: true }
}

export async function requestInfoReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertApprover()
  if (!approver) return { error: 'errors.noPermission' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const comment = (formData.get('comment') as string)?.trim()

  if (!comment) return { error: 'errors.fillRequired' }

  const db = adminClient()
  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by, title, amount, reimbursement_no')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string; title: string; amount: number; reimbursement_no: string }>()

  if (!existing) return { error: 'errors.recordNotFound' }
  if (existing.status !== 'pending') return { error: 'errors.expenseNotPending' }

  const { error } = await db
    .from('reimbursements')
    .update({
      status: 'needs_info',
      approval_comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  await notify([{
    user_id: existing.submitted_by,
    type: 'reimbursement_needs_info',
    title: `More info requested: ${existing.title}`,
    body: comment,
    link: `/reimbursements/${existing.id}`,
  }])

  revalidatePath('/reimbursements')
  revalidatePath(`/reimbursements/${reimbursement_id}`)
  return { success: true }
}

export async function markReimbursementPaid(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertSuperAdmin()
  if (!approver) return { error: 'errors.noPermission' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by, title, amount, reimbursement_no')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string; title: string; amount: number; reimbursement_no: string }>()

  if (!existing) return { error: 'errors.recordNotFound' }
  if (existing.status !== 'approved') return { error: 'errors.onlyApprovedCanPay' }

  const { error } = await db
    .from('reimbursements')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: approver.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  await notify([{
    user_id: existing.submitted_by,
    type: 'reimbursement_paid',
    title: `Reimbursement paid: ${existing.title}`,
    body: `A$${Number(existing.amount).toLocaleString()} has been transferred - ${existing.reimbursement_no}`,
    link: `/reimbursements/${existing.id}`,
  }])

  revalidatePath('/reimbursements')
  revalidatePath(`/reimbursements/${reimbursement_id}`)
  return { success: true }
}

export async function deleteReimbursement(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const reimbursement_id = formData.get('reimbursement_id') as string
  const db = adminClient()

  const { data: existing } = await db
    .from('reimbursements')
    .select('id, status, submitted_by')
    .eq('id', reimbursement_id)
    .single<{ id: string; status: string; submitted_by: string }>()

  if (!existing) return { error: 'errors.recordNotFound' }
  if (existing.status !== 'draft') return { error: 'errors.noPermission' }
  if (existing.submitted_by !== user.id) return { error: 'errors.noPermission' }

  const { error } = await db
    .from('reimbursements')
    .delete()
    .eq('id', reimbursement_id)

  if (error) return { error: error.message }

  revalidatePath('/reimbursements')
  return { success: true }
}
