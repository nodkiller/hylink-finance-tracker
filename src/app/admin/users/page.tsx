import { createClient as createAdmin } from '@supabase/supabase-js'
import AppHeader from '@/components/app-header'
import { Badge } from '@/components/ui/badge'
import InviteUserDialog from './invite-user-dialog'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: 'Staff' | 'Controller'
}

export default async function AdminUsersPage() {
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    adminClient.from('profiles').select('id, full_name, role').order('full_name'),
    adminClient.auth.admin.listUsers(),
  ])

  const emailMap = new Map(
    authUsers?.users.map(u => [u.id, u.email ?? '']) ?? []
  )

  const users: UserRow[] = (profiles ?? []).map(p => ({
    id: p.id,
    email: emailMap.get(p.id) ?? '',
    full_name: p.full_name,
    role: p.role,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="用户管理" />

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">用户列表</h2>
            <p className="text-sm text-gray-500 mt-0.5">共 {users.length} 名用户</p>
          </div>
          <InviteUserDialog />
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">姓名</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">邮箱</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">角色</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.full_name ?? <span className="text-gray-400 italic">未设置</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'Controller' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">暂无用户</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
