import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import NewProjectDialog from '@/components/new-project-dialog'
import NotificationBell from '@/components/notification-bell'
import NavBar from '@/components/nav-bar'
import Link from 'next/link'
import type { NotificationItem } from '@/app/actions/notifications'

interface Props {
  title: string
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Admin':       'bg-blue-100 text-blue-700 border border-blue-200',
  'Controller':  'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/20',
  'PM':          'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/20',
  'Viewer':      'bg-gray-100 text-gray-500 border-gray-200',
  'Staff':       'bg-gray-100 text-gray-600 border-gray-200',
}

export default async function AppHeader({ title }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: profile }, { data: brands }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('full_name, role')
      .eq('id', user!.id)
      .single<{ full_name: string | null; role: string }>(),
    adminClient
      .from('brands')
      .select('id, name')
      .order('name'),
  ])

  // Fetch notifications for current user
  const { data: rawNotifs } = await adminClient
    .from('notifications')
    .select('id, type, title, body, link, is_read, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

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
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 md:gap-5">
        <span className="text-base font-bold text-[#1A365D] tracking-tight shrink-0">Hylink Finance</span>
        <NavBar
          hasDashboard={hasDashboard}
          hasReports={hasDashboard}
          hasUserAdmin={hasUserAdmin}
          hasAdminMenu={hasAdminMenu}
          hasSettings={hasSettings}
          userName={profile?.full_name ?? user?.email ?? undefined}
          userRole={role}
        />
      </div>

      <div className="flex items-center gap-2">
        {canCreateProject && (
          <span className="hidden md:block">
            <NewProjectDialog brands={brands ?? []} />
          </span>
        )}
        <NotificationBell initialUnread={unread} initialNotifications={notifList} />

        <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />

        <Link href="/profile" className="hidden md:flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <span className="max-w-[120px] truncate">{profile?.full_name ?? user?.email}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${ROLE_COLORS[role] ?? ROLE_COLORS['Staff']}`}>
            {role}
          </span>
        </Link>

        <form action={logout} className="hidden md:block">
          <Button variant="outline" size="sm" type="submit" className="text-xs">退出</Button>
        </form>
      </div>
    </header>
  )
}
