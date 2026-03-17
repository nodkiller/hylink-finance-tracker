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

async function assertSuperAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  return profile?.role === 'Super Admin' ? user : null
}

function now() {
  return new Date().toISOString()
}

export async function saveApprovalThresholds(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertSuperAdmin()
  if (!user) return { error: '无权限（仅 Super Admin）' }

  const auto_limit       = parseFloat(formData.get('auto_limit') as string)
  const admin_limit      = parseFloat(formData.get('admin_limit') as string)
  const super_admin_limit = parseFloat(formData.get('super_admin_limit') as string)

  if (isNaN(auto_limit) || isNaN(admin_limit) || isNaN(super_admin_limit)) {
    return { error: '请填写有效金额' }
  }
  if (auto_limit <= 0 || admin_limit <= 0 || super_admin_limit <= 0) {
    return { error: '金额必须大于 0' }
  }
  if (auto_limit >= admin_limit) {
    return { error: '自动审批额度必须小于管理员审批额度' }
  }
  if (admin_limit >= super_admin_limit) {
    return { error: '管理员审批额度必须小于超级管理员审批额度' }
  }

  const { error } = await adminClient()
    .from('approval_settings')
    .update({ auto_limit, admin_limit, super_admin_limit, updated_by: user.id, updated_at: now() })
    .eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/admin/settings')
  return { success: true }
}

// Keep old export name for backward compat
export const saveSettings = saveApprovalThresholds

export async function saveOverdueSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertSuperAdmin()
  if (!user) return { error: '无权限（仅 Super Admin）' }

  const overdue_days = parseInt(formData.get('overdue_days') as string)
  if (isNaN(overdue_days) || overdue_days < 1 || overdue_days > 365) {
    return { error: '逾期天数必须在 1–365 之间' }
  }

  const { error } = await adminClient()
    .from('approval_settings')
    .update({ overdue_days, updated_by: user.id, updated_at: now() })
    .eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/admin/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function saveDefaultApprover(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertSuperAdmin()
  if (!user) return { error: '无权限（仅 Super Admin）' }

  const default_approver_id = (formData.get('default_approver_id') as string) || null

  const { error } = await adminClient()
    .from('approval_settings')
    .update({ default_approver_id, updated_by: user.id, updated_at: now() })
    .eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function saveDelegateSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertSuperAdmin()
  if (!user) return { error: '无权限（仅 Super Admin）' }

  const delegate_approver_id = (formData.get('delegate_approver_id') as string) || null
  const delegate_active = formData.get('delegate_active') === 'true'
  const delegate_until = (formData.get('delegate_until') as string) || null

  const { error } = await adminClient()
    .from('approval_settings')
    .update({ delegate_approver_id, delegate_active, delegate_until, updated_by: user.id, updated_at: now() })
    .eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function saveBrandApprover(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertSuperAdmin()
  if (!user) return { error: '无权限（仅 Super Admin）' }

  const brand_id   = formData.get('brand_id') as string
  const approver_id = (formData.get('approver_id') as string) || null

  if (approver_id) {
    const { error } = await adminClient()
      .from('brand_approver_settings')
      .upsert({ brand_id, approver_id, updated_at: now() })
    if (error) return { error: error.message }
  } else {
    await adminClient().from('brand_approver_settings').delete().eq('brand_id', brand_id)
  }

  revalidatePath('/admin/settings')
  return { success: true }
}
