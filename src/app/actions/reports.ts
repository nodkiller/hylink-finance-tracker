'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: boolean } | undefined

export interface ReportSchedule {
  id: string
  report_type: string
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  hour: number
  locale: string
  recipients: string[]
  enabled: boolean
  last_sent_at: string | null
  last_error: string | null
  created_by: string
  created_at: string
}

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createSchedule(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const approver = await assertApprover()
  if (!approver) return { error: 'errors.noPermission' }

  const report_type = formData.get('report_type') as string
  const frequency = formData.get('frequency') as string
  const day_of_week = formData.get('day_of_week') ? parseInt(formData.get('day_of_week') as string) : null
  const day_of_month = formData.get('day_of_month') ? parseInt(formData.get('day_of_month') as string) : null
  const hour = parseInt(formData.get('hour') as string) || 9
  const locale = (formData.get('locale') as string) || 'en'
  const recipientsRaw = (formData.get('recipients') as string)?.trim()

  // Validate report type
  if (!['brand_pl', 'payment_aging', 'project_profitability'].includes(report_type)) {
    return { error: 'errors.fillRequired' }
  }

  // Validate frequency
  if (!['weekly', 'monthly'].includes(frequency)) {
    return { error: 'errors.fillRequired' }
  }

  // Validate day fields
  if (frequency === 'weekly' && (day_of_week === null || day_of_week < 0 || day_of_week > 6)) {
    return { error: 'errors.fillRequired' }
  }
  if (frequency === 'monthly' && (day_of_month === null || day_of_month < 1 || day_of_month > 28)) {
    return { error: 'errors.fillRequired' }
  }

  // Validate recipients
  if (!recipientsRaw) {
    return { error: 'errors.fillRequired' }
  }
  const recipients = recipientsRaw.split(',').map(e => e.trim()).filter(Boolean)
  if (recipients.length === 0) {
    return { error: 'errors.fillRequired' }
  }
  for (const email of recipients) {
    if (!EMAIL_REGEX.test(email)) {
      return { error: 'reports.schedule.invalidEmail' }
    }
  }

  const db = adminClient()

  // Check max 5 enabled schedules per user
  const { count } = await db
    .from('report_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', approver.user.id)
    .eq('enabled', true)

  if ((count ?? 0) >= 5) {
    return { error: 'reports.schedule.maxSchedules' }
  }

  const { error: insertError } = await db
    .from('report_schedules')
    .insert({
      report_type,
      frequency,
      day_of_week: frequency === 'weekly' ? day_of_week : null,
      day_of_month: frequency === 'monthly' ? day_of_month : null,
      hour,
      locale,
      recipients,
      created_by: approver.user.id,
      enabled: true,
    })

  if (insertError) return { error: insertError.message }

  revalidatePath('/reports')
  return { success: true }
}

export async function deleteSchedule(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.notLoggedIn' }

  const schedule_id = formData.get('schedule_id') as string
  if (!schedule_id) return { error: 'errors.fillRequired' }

  const db = adminClient()

  // Verify ownership or Super Admin
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  const { data: schedule } = await db
    .from('report_schedules')
    .select('id, created_by')
    .eq('id', schedule_id)
    .single<{ id: string; created_by: string }>()

  if (!schedule) return { error: 'errors.recordNotFound' }

  // Must own the schedule or be Super Admin
  if (schedule.created_by !== user.id && profile?.role !== 'Super Admin') {
    return { error: 'errors.noPermission' }
  }

  const { error } = await db
    .from('report_schedules')
    .delete()
    .eq('id', schedule_id)

  if (error) return { error: error.message }

  revalidatePath('/reports')
  return { success: true }
}

export async function getSchedules(): Promise<ReportSchedule[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const db = adminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  const role = profile?.role
  if (role !== 'Controller' && role !== 'Admin' && role !== 'Super Admin') {
    return []
  }

  const { data: schedules } = await db
    .from('report_schedules')
    .select('id, report_type, frequency, day_of_week, day_of_month, hour, locale, recipients, enabled, last_sent_at, last_error, created_by, created_at')
    .eq('enabled', true)
    .order('created_at', { ascending: false })

  return (schedules ?? []) as ReportSchedule[]
}
