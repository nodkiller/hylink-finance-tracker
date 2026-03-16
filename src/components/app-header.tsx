import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import NewProjectDialog from '@/components/new-project-dialog'
import Link from 'next/link'

interface Props {
  title: string
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Admin':       'bg-blue-100 text-blue-700 border border-blue-200',
  'Controller':  'bg-[#2A4A6B]/10 text-[#2A4A6B] border-[#2A4A6B]/20',
  'Staff':       'bg-gray-100 text-gray-600 border border-gray-200',
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

  const role = profile?.role ?? 'Staff'
  const isStaff = role === 'Staff'
  const isController = role === 'Controller'
  const isAdmin = role === 'Admin'
  const isSuperAdmin = role === 'Super Admin'
  const hasDashboard = isController || isAdmin || isSuperAdmin
  const hasAdminMenu = isController || isAdmin || isSuperAdmin
  const hasSettings = isAdmin || isSuperAdmin
  const canCreateProject = !isStaff

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <span className="text-base font-bold text-[#2A4A6B] tracking-tight">Hylink Finance</span>
        <nav className="flex items-center gap-1">
          {hasDashboard && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-sm">Dashboard</Button>
            </Link>
          )}
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-sm">项目</Button>
          </Link>
          {hasAdminMenu && (
            <>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="text-sm">用户管理</Button>
              </Link>
              <Link href="/admin/brands">
                <Button variant="ghost" size="sm" className="text-sm">品牌管理</Button>
              </Link>
            </>
          )}
          {hasSettings && (
            <Link href="/admin/settings">
              <Button variant="ghost" size="sm" className="text-sm">审批设置</Button>
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {canCreateProject && <NewProjectDialog brands={brands ?? []} />}

        <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-500 pl-3 border-l hover:text-gray-800 transition-colors">
          <span>{profile?.full_name ?? user?.email}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ROLE_COLORS[role] ?? ROLE_COLORS['Staff']}`}>
            {role}
          </span>
        </Link>

        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">退出</Button>
        </form>
      </div>
    </header>
  )
}
