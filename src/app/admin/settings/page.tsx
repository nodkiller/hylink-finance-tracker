import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/app-header'
import SettingsForm from './settings-form'
import OverdueForm from './overdue-form'
import ApproverForm, { type BrandApproverRow } from './approver-form'
import DelegateForm from './delegate-form'

type FullSettings = {
  auto_limit: number
  admin_limit: number
  super_admin_limit: number
  overdue_days: number
  default_approver_id: string | null
  delegate_approver_id: string | null
  delegate_active: boolean
  delegate_until: string | null
  updated_at: string
}

export default async function SettingsPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Super Admin check
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (profile?.role !== 'Super Admin') redirect('/projects')

  const [
    { data: settings },
    { data: approverProfiles },
    { data: brands },
    { data: brandApprovers },
  ] = await Promise.all([
    db.from('approval_settings')
      .select('auto_limit, admin_limit, super_admin_limit, overdue_days, default_approver_id, delegate_approver_id, delegate_active, delegate_until, updated_at')
      .eq('id', 1)
      .single<FullSettings>(),
    db.from('profiles')
      .select('id, full_name, role')
      .in('role', ['Super Admin', 'Admin', 'Controller'])
      .order('full_name'),
    db.from('brands').select('id, name').eq('is_active', true).order('name'),
    db.from('brand_approver_settings').select('brand_id, approver_id'),
  ])

  const approverMap: Record<string, string | null> = {}
  for (const ba of brandApprovers ?? []) {
    approverMap[(ba as any).brand_id] = (ba as any).approver_id
  }

  const brandRows: BrandApproverRow[] = (brands ?? []).map((b: any) => ({
    brand_id: b.id,
    brand_name: b.name,
    approver_id: approverMap[b.id] ?? null,
  }))

  const approvers = (approverProfiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
  }))

  return (
    <div className="min-h-screen">
      <AppHeader title="审批设置" />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">审批设置</h1>

        {/* Section 1: Approval Thresholds */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">付款自动审批阈值</h2>
            <p className="text-sm text-gray-500 mt-1">
              根据付款金额自动路由到对应审批层级。
            </p>
          </div>
          {settings ? (
            <SettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-gray-400">加载失败</p>
          )}
        </section>

        {/* Section 2: Overdue Days */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">收款逾期预警</h2>
            <p className="text-sm text-gray-500 mt-1">
              未收款收入超过此天数后，Dashboard 将显示逾期预警。
            </p>
          </div>
          {settings ? (
            <OverdueForm overdueDays={settings.overdue_days ?? 30} />
          ) : (
            <p className="text-sm text-gray-400">加载失败</p>
          )}
        </section>

        {/* Section 3: Default + Per-brand Approver */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">项目审批人设置</h2>
            <p className="text-sm text-gray-500 mt-1">
              指定默认审批人，或按品牌单独设置审批人。
            </p>
          </div>
          <ApproverForm
            approvers={approvers}
            defaultApproverId={settings?.default_approver_id ?? null}
            brandRows={brandRows}
          />
        </section>

        {/* Section 4: Delegate Approver */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-gray-900">审批代理</h2>
            <p className="text-sm text-gray-500 mt-1">
              审批人休假时，可指定代理人临时接管审批职责。
            </p>
          </div>
          {settings ? (
            <DelegateForm
              approvers={approvers}
              data={{
                delegate_approver_id: settings.delegate_approver_id,
                delegate_active: settings.delegate_active ?? false,
                delegate_until: settings.delegate_until,
              }}
            />
          ) : (
            <p className="text-sm text-gray-400">加载失败</p>
          )}
        </section>
      </main>
    </div>
  )
}
