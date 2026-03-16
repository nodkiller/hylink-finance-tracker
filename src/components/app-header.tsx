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

export default async function AppHeader({ title }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single<{ full_name: string | null; role: string }>()

  const isController = profile?.role === 'Controller'

  // Fetch brands for the new project dialog
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: brands } = await adminClient
    .from('brands')
    .select('id, name')
    .order('name')

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <span className="text-base font-bold text-[#2A4A6B] tracking-tight">Hylink Finance</span>
        <nav className="flex items-center gap-1">
          {isController && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-sm">Dashboard</Button>
            </Link>
          )}
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-sm">项目</Button>
          </Link>
          {isController && (
            <>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="text-sm">用户管理</Button>
              </Link>
              <Link href="/admin/brands">
                <Button variant="ghost" size="sm" className="text-sm">品牌管理</Button>
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <NewProjectDialog brands={brands ?? []} />

        <div className="flex items-center gap-2 text-sm text-gray-500 pl-3 border-l">
          <span>{profile?.full_name ?? user?.email}</span>
          <Badge variant={isController ? 'default' : 'secondary'} className="text-xs">
            {profile?.role}
          </Badge>
        </div>

        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">退出</Button>
        </form>
      </div>
    </header>
  )
}

