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

export async function approveExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertController()
  if (!user) return { error: '无权限' }

  const expense_id = formData.get('expense_id') as string

  const { error } = await adminClient()
    .from('expenses')
    .update({
      status: 'Approved',
      approver_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', expense_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function rejectExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertController()
  if (!user) return { error: '无权限' }

  const expense_id = formData.get('expense_id') as string
  const reason = (formData.get('reason') as string)?.trim() || null

  const { error } = await adminClient()
    .from('expenses')
    .update({
      status: 'Rejected',
      approver_id: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', expense_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
