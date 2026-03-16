'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

const ALLOWED_ROLES = ['Admin', 'Super Admin']

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertAdminRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  return profile && ALLOWED_ROLES.includes(profile.role) ? user : null
}

export async function saveSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await assertAdminRole()
  if (!user) return { error: '无权限' }

  const auto_limit = parseFloat(formData.get('auto_limit') as string)
  const admin_limit = parseFloat(formData.get('admin_limit') as string)
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
    .update({ auto_limit, admin_limit, super_admin_limit, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}
