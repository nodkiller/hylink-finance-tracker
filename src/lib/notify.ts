import { createClient as createAdmin } from '@supabase/supabase-js'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface NotifyPayload {
  user_id: string
  type: string
  title: string
  body?: string
  link?: string
  reference_id?: string
}

// Insert notifications (silently ignore errors — don't fail the primary action)
export async function notify(payloads: NotifyPayload[]): Promise<void> {
  if (payloads.length === 0) return
  try {
    await db().from('notifications').insert(
      payloads.map(p => ({
        user_id: p.user_id,
        type: p.type,
        title: p.title,
        body: p.body ?? null,
        link: p.link ?? null,
        reference_id: p.reference_id ?? null,
      }))
    )
  } catch {
    // Notifications are best-effort; do not throw
  }
}

// Notify all users with given roles (optionally excluding one user)
export async function notifyRoles(
  roles: string[],
  excludeUserId: string | null,
  payload: Omit<NotifyPayload, 'user_id'>
): Promise<void> {
  const { data: users } = await db().from('profiles').select('id').in('role', roles)
  const targets = (users ?? [])
    .filter((u: any) => u.id !== excludeUserId)
    .map((u: any) => ({ ...payload, user_id: u.id }))
  await notify(targets)
}
