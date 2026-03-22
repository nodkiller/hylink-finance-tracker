import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getServerT } from '@/i18n/use-server-t'
import AppHeader from '@/components/app-header'
import Link from 'next/link'

function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

// STATUS_LABELS will use t() from server translation
const STATUS_KEYS: Record<string, string> = {
  'Pending Approval': 'status.pendingApproval',
  'Active': 'status.active',
  'Completed': 'status.completed',
  'Reconciled': 'status.reconciled',
  'Rejected': 'status.rejected',
}

const STATUS_COLORS: Record<string, string> = {
  'Active':           'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
  'Pending Approval': 'bg-[#DD6B20]/10 text-[#DD6B20] border-[#DD6B20]/25',
  'Completed':        'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  'Rejected':         'bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/25',
  'Reconciled':       'bg-gray-100 text-gray-500 border-gray-200',
}

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getServerT()

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) {
    redirect('/projects')
  }

  const [
    { data: brand },
    { data: projects },
  ] = await Promise.all([
    db.from('brands').select('id, name, is_active, created_at').eq('id', id).single<{
      id: string; name: string; is_active: boolean; created_at: string
    }>(),
    db.from('projects')
      .select('id, name, type, status, project_code, estimated_revenue, created_at')
      .eq('brand_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!brand) notFound()

  const projectIds = (projects ?? []).map((p: any) => p.id)

  const [{ data: revenues }, { data: expenses }] = await Promise.all([
    projectIds.length > 0
      ? db.from('revenues').select('amount, status, project_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    projectIds.length > 0
      ? db.from('expenses').select('amount, status, project_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  // Per-project financials
  const projRevMap: Record<string, number> = {}
  const projExpMap: Record<string, number> = {}
  for (const r of revenues ?? []) {
    if ((r as any).status === 'Paid') {
      projRevMap[(r as any).project_id] = (projRevMap[(r as any).project_id] ?? 0) + Number((r as any).amount)
    }
  }
  for (const e of expenses ?? []) {
    if (['Approved', 'Paid'].includes((e as any).status)) {
      projExpMap[(e as any).project_id] = (projExpMap[(e as any).project_id] ?? 0) + Number((e as any).amount)
    }
  }

  const totalRevenue = Object.values(projRevMap).reduce((s, v) => s + v, 0)
  const totalExpenses = Object.values(projExpMap).reduce((s, v) => s + v, 0)
  const totalProfit = totalRevenue - totalExpenses

  return (
    <div className="min-h-screen">
      <AppHeader title={t('adminBrands.brandDetail')} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Back + header */}
        <div>
          <Link href="/admin/brands" className="text-sm text-gray-400 hover:text-[#2B6CB0] transition-colors">
            ← {t('adminBrands.backToBrands')}
          </Link>
          <div className="flex items-center gap-3 mt-3">
            <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
            {brand.is_active ? (
              <span className="text-xs font-medium text-[#38A169] bg-[#38A169]/10 px-2 py-0.5 rounded border border-[#38A169]/25">
                {t('adminBrands.activate')}
              </span>
            ) : (
              <span className="text-xs font-medium text-[#E53E3E] bg-[#E53E3E]/10 px-2 py-0.5 rounded border border-[#E53E3E]/25">
                {t('adminBrands.deactivate')}
              </span>
            )}
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{t('adminBrands.totalProjects')}</p>
            <p className="text-2xl font-bold text-gray-900">{(projects ?? []).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{t('adminBrands.totalRevenueReceived')}</p>
            <p className="text-xl font-bold text-[#38A169]">{fmt(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{t('adminBrands.totalExpensesApproved')}</p>
            <p className="text-xl font-bold text-[#E53E3E]">{fmt(totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">{t('adminBrands.totalProfit')}</p>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>
              {fmt(totalProfit)}
            </p>
            {totalRevenue > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t('reports.grossMargin')} {((totalProfit / totalRevenue) * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        {/* Projects table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{t('adminBrands.projectList')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('reports.projectCount').replace('{count}', String((projects ?? []).length))}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.projectCode')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.projectName')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.type')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.status')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.estimatedRevenue')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('adminBrands.received')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalExpenses')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.profit')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.createdAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(projects ?? []).map((p: any) => {
                const rev = projRevMap[p.id] ?? 0
                const exp = projExpMap[p.id] ?? 0
                const profit = rev - exp
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">
                        {p.project_code ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-medium text-gray-900 hover:text-[#2B6CB0] hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[p.status] ?? ''}`}>
                        {STATUS_KEYS[p.status] ? t(STATUS_KEYS[p.status]) : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                      {p.estimated_revenue != null ? fmt(p.estimated_revenue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#38A169]">
                      {rev > 0 ? fmt(rev) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#E53E3E]">
                      {exp > 0 ? fmt(exp) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${profit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>
                      {rev > 0 || exp > 0 ? fmt(profit) : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                )
              })}
              {(projects ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                    {t('adminBrands.noBrandProjects')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
