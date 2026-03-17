import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'
import UsersTable, { type UserRow } from './users-table'
import InviteUserDialog from './invite-user-dialog'

function isSuspended(bannedUntil?: string | null): boolean {
  if (!bannedUntil) return false
  return new Date(bannedUntil) > new Date()
}

export default async function AdminUsersPage() {
  const authClient = await createClient()
  const { data: { user: me } } = await authClient.auth.getUser()
  if (!me) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify current user is Super Admin
  const { data: myProfile } = await db
    .from('profiles').select('role').eq('id', me.id).single<{ role: string }>()
  if (myProfile?.role !== 'Super Admin') redirect('/projects')

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    db.from('profiles').select('id, full_name, role').order('full_name'),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const authMap = new Map(
    (authUsers?.users ?? []).map(u => [u.id, u])
  )

  const users: UserRow[] = (profiles ?? []).map(p => {
    const authUser = authMap.get(p.id)
    return {
      id: p.id,
      email: authUser?.email ?? '',
      full_name: p.full_name,
      role: p.role,
      is_suspended: isSuspended(authUser?.banned_until),
      created_at: authUser?.created_at ?? '',
      is_self: p.id === me.id,
    }
  })

  // Sort: active first, then suspended; within each group by name
  users.sort((a, b) => {
    if (a.is_suspended !== b.is_suspended) return a.is_suspended ? 1 : -1
    return (a.full_name ?? '').localeCompare(b.full_name ?? '')
  })

  const activeCount = users.filter(u => !u.is_suspended).length
  const suspendedCount = users.filter(u => u.is_suspended).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7FAFC' }}>
      <AppHeader title="用户管理" />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            <p className="text-sm text-gray-400 mt-1">
              共 {users.length} 名用户 · {activeCount} 启用
              {suspendedCount > 0 && ` · ${suspendedCount} 停用`}
            </p>
          </div>
          <InviteUserDialog />
        </div>

        {/* Role legend */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="font-medium text-gray-500">角色说明：</span>
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-medium">Super Admin</span>
          <span className="text-gray-300">全部权限</span>
          <span className="px-2 py-0.5 rounded bg-[#2B6CB0]/10 text-[#2B6CB0] border border-[#2B6CB0]/20 font-medium">Controller</span>
          <span className="text-gray-300">审批 + 全项目</span>
          <span className="px-2 py-0.5 rounded bg-[#38A169]/10 text-[#38A169] border border-[#38A169]/20 font-medium">PM</span>
          <span className="text-gray-300">创建 + 收支</span>
          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 font-medium">Viewer</span>
          <span className="text-gray-300">只读</span>
        </div>

        <UsersTable users={users} />
      </main>
    </div>
  )
}
