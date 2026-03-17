'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function fetchNotifications(): Promise<{
  notifications: NotificationItem[]
  unread: number
} | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data } = await db()
    .from('notifications')
    .select('id, type, title, body, link, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  const notifications = (data ?? []) as NotificationItem[]
  const unread = notifications.filter(n => !n.is_read).length
  return { notifications, unread }
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return
  await db().from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId)
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return
  await db().from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}
