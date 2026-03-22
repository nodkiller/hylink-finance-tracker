'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notify } from '@/lib/notify'

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
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  const role = profile?.role
  if (role === 'Admin' || role === 'Super Admin' || role === 'Controller') {
    return { user, role }
  }
  return null
}

export async function approveExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertApprover()
  if (!approver) return { error: 'errors.noPermission' }

  const expense_id = formData.get('expense_id') as string

  const { data: expense } = await adminClient()
    .from('expenses')
    .select('status, project_id')
    .eq('id', expense_id)
    .single<{ status: string; project_id: string }>()

  if (!expense) return { error: 'errors.recordNotFound' }

  if (expense.status === 'Pending Super Approval' && approver.role !== 'Super Admin') {
    return { error: 'errors.needsSuperAdminApproval' }
  }
  if (!['Pending Approval', 'Pending Super Approval'].includes(expense.status)) {
    return { error: 'errors.expenseNotPending' }
  }

  const { error } = await adminClient()
    .from('expenses')
    .update({
      status: 'Approved',
      approver_id: approver.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', expense_id)

  if (error) return { error: error.message }

  // Notify expense creator
  const { data: fullExpense } = await adminClient()
    .from('expenses')
    .select('created_by, payee, amount, project_id')
    .eq('id', expense_id)
    .single<{ created_by: string | null; payee: string; amount: number; project_id: string }>()
  if (fullExpense?.created_by) {
    await notify([{
      user_id: fullExpense.created_by,
      type: 'expense_approved',
      title: `Payment approved: ${fullExpense.payee}`,
      body: `A$${Number(fullExpense.amount).toLocaleString()}`,
      link: `/projects/${fullExpense.project_id}`,
    }])
  }

  revalidatePath('/dashboard')
  revalidatePath(`/projects/${expense.project_id}`)
  return { success: true }
}

export async function rejectExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertApprover()
  if (!approver) return { error: 'errors.noPermission' }

  const expense_id = formData.get('expense_id') as string
  const reason = (formData.get('reason') as string)?.trim() || null

  const { data: expense } = await adminClient()
    .from('expenses')
    .select('status, project_id')
    .eq('id', expense_id)
    .single<{ status: string; project_id: string }>()

  if (!expense) return { error: 'errors.recordNotFound' }

  if (expense.status === 'Pending Super Approval' && approver.role !== 'Super Admin') {
    return { error: 'errors.needsSuperAdminApproval' }
  }
  if (!['Pending Approval', 'Pending Super Approval'].includes(expense.status)) {
    return { error: 'errors.expenseNotPending' }
  }

  const { error } = await adminClient()
    .from('expenses')
    .update({
      status: 'Rejected',
      approver_id: approver.user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', expense_id)

  if (error) return { error: error.message }

  // Notify expense creator
  const { data: fullExpense } = await adminClient()
    .from('expenses')
    .select('created_by, payee, amount, project_id')
    .eq('id', expense_id)
    .single<{ created_by: string | null; payee: string; amount: number; project_id: string }>()
  if (fullExpense?.created_by) {
    await notify([{
      user_id: fullExpense.created_by,
      type: 'expense_rejected',
      title: `Payment rejected: ${fullExpense.payee}`,
      body: reason ?? undefined,
      link: `/projects/${fullExpense.project_id}`,
    }])
  }

  revalidatePath('/dashboard')
  revalidatePath(`/projects/${expense.project_id}`)
  return { success: true }
}
