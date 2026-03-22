'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

type ActionState = { error: string } | { success: boolean; count?: number } | undefined

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const PAYMENT_ROLES = ['Controller', 'Admin', 'Super Admin']

export async function batchMarkAsPaid(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!profile || !PAYMENT_ROLES.includes(profile.role)) {
    return { error: 'errors.noPermission' }
  }

  const idsJson = formData.get('expense_ids') as string
  if (!idsJson) return { error: 'errors.fillRequired' }

  let ids: string[]
  try {
    ids = JSON.parse(idsJson)
  } catch {
    return { error: 'errors.fillRequired' }
  }

  if (ids.length === 0) return { error: 'errors.fillRequired' }

  const today = new Date().toISOString().slice(0, 10)
  const batchId = randomUUID()

  // Update only expenses that are currently 'Approved' — prevents double-payment
  const { data: updated, error: updateError } = await db
    .from('expenses')
    .update({ status: 'Paid', payment_date: today })
    .in('id', ids)
    .eq('status', 'Approved')
    .select('id')

  if (updateError) return { error: updateError.message }

  const updatedIds = (updated || []).map((e: { id: string }) => e.id)

  // Write audit log
  if (updatedIds.length > 0) {
    const auditRows = updatedIds.map((expenseId: string) => ({
      batch_id: batchId,
      expense_id: expenseId,
      paid_by: user.id,
    }))
    await db.from('payment_audit_log').insert(auditRows)
  }

  revalidatePath('/payments')
  revalidatePath('/dashboard')

  return { success: true, count: updatedIds.length }
}

export async function updatePaymentDueDate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!profile || !PAYMENT_ROLES.includes(profile.role)) {
    return { error: 'errors.noPermission' }
  }

  const expenseId = formData.get('expense_id') as string
  const paymentDueDate = formData.get('payment_due_date') as string

  if (!expenseId || !paymentDueDate) return { error: 'errors.fillRequired' }

  const { error } = await db
    .from('expenses')
    .update({ payment_due_date: paymentDueDate })
    .eq('id', expenseId)

  if (error) return { error: error.message }

  revalidatePath('/payments')
  return { success: true }
}
