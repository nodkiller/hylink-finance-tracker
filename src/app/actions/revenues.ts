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
