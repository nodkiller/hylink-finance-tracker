import { createClient as createAdmin } from '@supabase/supabase-js'
import AppHeader from '@/components/app-header'
import SettingsForm from './settings-form'

type Settings = {
  auto_limit: number
  admin_limit: number
  super_admin_limit: number
  updated_at: string
}

export default async function SettingsPage() {
  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: settings } = await db
    .from('approval_settings')
    .select('auto_limit, admin_limit, super_admin_limit, updated_at')
    .eq('id', 1)
    .single<Settings>()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9F9F9' }}>
      <AppHeader title="设置" />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-gray-900">审批额度设置</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900">付款审批层级</h2>
            <p className="text-sm text-gray-500 mt-1">
              根据付款金额自动路由到对应审批层级。仅超级管理员和管理员可修改。
            </p>
          </div>

          {settings ? (
            <SettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-gray-400">加载中...</p>
          )}
        </div>

        {/* Role guide */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">角色权限说明</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs">
                <th className="pb-2 font-medium">角色</th>
                <th className="pb-2 font-medium">可操作</th>
                <th className="pb-2 font-medium">审批权限</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-2.5 font-medium text-[#2A4A6B]">Super Admin</td>
                <td className="py-2.5 text-gray-600">全部功能 + 设置</td>
                <td className="py-2.5 text-gray-600">审批所有金额</td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-[#3A7D44]">Admin</td>
                <td className="py-2.5 text-gray-600">全部功能 + 查看设置</td>
                <td className="py-2.5 text-gray-600">审批 ≤ 管理员上限</td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-gray-700">Controller</td>
                <td className="py-2.5 text-gray-600">录入、项目审批、确认付款</td>
                <td className="py-2.5 text-gray-600">仅自动批准（≤ 自动额度）</td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-gray-500">Staff</td>
                <td className="py-2.5 text-gray-600">只读（查看项目和支出）</td>
                <td className="py-2.5 text-gray-600">无</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
