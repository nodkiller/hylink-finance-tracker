import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import SidebarNav from '@/components/sidebar-nav'
import NewProjectDialog from '@/components/new-project-dialog'
import NotificationBell from '@/components/notification-bell'
import type { NotificationItem } from '@/app/actions/notifications'

export default async function AppSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: profile }, { data: brands }, { data: rawNotifs }] = await Promise.all([
    db.from('profiles').select('full_name, role').eq('id', user.id).single<{ full_name: string | null; role: string }>(),
    db.from('brands').select('id, name').order('name'),
    db.from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const notifList = (rawNotifs ?? []) as NotificationItem[]
  const unread = notifList.filter(n => !n.is_read).length

  const role = profile?.role ?? 'Viewer'
  const isSuperAdmin = role === 'Super Admin'
  const isAdmin = role === 'Admin'
  const isController = role === 'Controller'
  const isPM = role === 'PM'
  const hasDashboard = isController || isAdmin || isSuperAdmin
  const hasAdminMenu = isController || isAdmin || isSuperAdmin
  const hasUserAdmin = isSuperAdmin
  const hasSettings = isSuperAdmin
  const canCreateProject = isController || isAdmin || isSuperAdmin || isPM

  return (
    <SidebarNav
      userName={profile?.full_name ?? user.email}
      userRole={role}
      hasDashboard={hasDashboard}
      hasReports={hasDashboard}
      hasAdminMenu={hasAdminMenu}
      hasUserAdmin={hasUserAdmin}
      hasSettings={hasSettings}
      canCreateProject={canCreateProject}
      brands={brands ?? []}
      unread={unread}
      notifList={notifList}
    />
  )
}
