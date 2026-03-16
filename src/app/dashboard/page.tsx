import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/app-header'
import ActionItems, { type PendingProject } from './action-items'
import PendingExpenses, { type PendingExpense } from './pending-expenses'
import TrendChart, { type MonthlyDataPoint } from './trend-chart'
import ExportButton from './export-button'
import { Badge } from '@/components/ui/badge'

function todayLabel() {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

// Build last-6-months labels and date range
function getLast6Months(): { label: string; year: number; month: number }[] {
  const now = new Date()
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleString('en-AU', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 1-indexed
    })
  }
  return result
}

export default async function DashboardPage() {
  // Get current user role to determine which pending expenses to show
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const { data: profile } = user
    ? await authClient.from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
    : { data: null }
  const role = profile?.role ?? ''
  const isSuperAdmin = role === 'Super Admin'
  const isAdmin = role === 'Admin'

  // Expense statuses to surface based on role
  const pendingStatuses = isSuperAdmin
    ? ['Pending Approval', 'Pending Super Approval']
    : isAdmin
    ? ['Pending Approval']
    : []

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [
    { data: rawProjects },
    { data: rawExpenses },
    { data: allRevenues },
    { data: allExpenses },
    { data: brandRows },
  ] = await Promise.all([
    // Pending projects for action items
    db
      .from('projects')
      .select('id, name, estimated_revenue, created_at, brands(name), profiles(full_name)')
      .eq('status', 'Pending Approval')
      .order('created_at', { ascending: true }),

    // Pending expenses — filtered by role
    pendingStatuses.length > 0
      ? db
          .from('expenses')
          .select('id, payee, description, amount, attachment_url, created_at, status, projects(project_code, name)')
          .in('status', pendingStatuses)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[], error: null }),

    // All revenues for KPI + chart
    db
      .from('revenues')
      .select('amount, status, issue_date'),

    // All expenses for KPI + chart
    db
      .from('expenses')
      .select('amount, status, created_at, projects(brands(name))'),

    // Brand list for profitability table
    db.from('brands').select('id, name').order('name'),
  ])

  // ── Action Items ─────────────────────────────────────────────────────────
  const pendingProjects: PendingProject[] = (rawProjects ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    brand_name: r.brands?.name ?? '—',
    estimated_revenue: r.estimated_revenue,
    applicant_name: r.profiles?.full_name ?? null,
    created_at: r.created_at,
  }))

  const pendingExpenses: PendingExpense[] = (rawExpenses ?? []).map((e: any) => ({
    id: e.id,
    project_code: e.projects?.project_code ?? null,
    project_name: e.projects?.name ?? '—',
    payee: e.payee,
    description: e.description,
    amount: e.amount,
    status: e.status,
    attachment_url: e.attachment_url,
  }))

  const totalPending = pendingProjects.length + pendingExpenses.length

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  const revenues = allRevenues ?? []
  const expenses = allExpenses ?? []

  const totalRevenue = revenues
    .filter((r: any) => r.status === 'Paid')
    .reduce((s: number, r: any) => s + Number(r.amount), 0)

  const totalExpenses = expenses
    .filter((e: any) => e.status === 'Approved' || e.status === 'Paid')
    .reduce((s: number, e: any) => s + Number(e.amount), 0)

  const totalProfit = totalRevenue - totalExpenses

  // ── Brand Profitability Table ─────────────────────────────────────────────
  const brands = brandRows ?? []

  type BrandStat = { name: string; revenue: number; expenses: number; profit: number; margin: number | null }

  // Fetch revenues with brand info (via projects)
  const { data: revenuesWithBrand } = await db
    .from('revenues')
    .select('amount, status, projects(brands(name))')
    .eq('status', 'Paid')

  const brandRevenueMap: Record<string, number> = {}
  for (const r of revenuesWithBrand ?? []) {
    const name = (r as any).projects?.brands?.name ?? '—'
    brandRevenueMap[name] = (brandRevenueMap[name] ?? 0) + Number((r as any).amount)
  }

  const finalBrandStats: BrandStat[] = brands.map((b: any) => {
    const revenue = brandRevenueMap[b.name] ?? 0
    const bExpenses = expenses
      .filter((e: any) => e.projects?.brands?.name === b.name && (e.status === 'Approved' || e.status === 'Paid'))
      .reduce((s: number, e: any) => s + Number(e.amount), 0)
    const profit = revenue - bExpenses
    const margin = revenue > 0 ? (profit / revenue) * 100 : null
    return { name: b.name, revenue, expenses: bExpenses, profit, margin }
  }).filter((b: BrandStat) => b.revenue > 0 || b.expenses > 0)

  // ── Monthly Trend Chart ───────────────────────────────────────────────────
  const months = getLast6Months()

  // revenues: use issue_date; expenses: use created_at
  const chartData: MonthlyDataPoint[] = months.map(({ label, year, month }) => {
    const monthRevenue = revenues
      .filter((r: any) => {
        if (r.status !== 'Paid' || !r.issue_date) return false
        const d = new Date(r.issue_date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })
      .reduce((s: number, r: any) => s + Number(r.amount), 0)

    const monthExpenses = expenses
      .filter((e: any) => {
        if (!['Approved', 'Paid'].includes(e.status) || !e.created_at) return false
        const d = new Date(e.created_at)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })
      .reduce((s: number, e: any) => s + Number(e.amount), 0)

    return { month: label, revenue: monthRevenue, expenses: monthExpenses }
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9F9F9' }}>
      <AppHeader title="Dashboard" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Page title + date */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <div className="flex items-center gap-3">
            <ExportButton />
            <span className="text-sm text-gray-400">{todayLabel()}</span>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Revenue */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">总收入（已收款）</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">Paid revenues</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">总支出（已批准）</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(totalExpenses)}</p>
            <p className="text-xs text-gray-400 mt-1">Approved + Paid</p>
          </div>

          {/* Total Profit */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">总利润</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(totalProfit)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {totalRevenue > 0
                ? `毛利率 ${((totalProfit / totalRevenue) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>
        </div>

        {/* ── Brand Profitability Table + Trend Chart side by side ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Brand Profitability */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">品牌盈利概览</h2>
            </div>
            {finalBrandStats.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">暂无数据</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">品牌</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">收入</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">支出</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">利润</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">毛利率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {finalBrandStats.map((b) => (
                    <tr
                      key={b.name}
                      className={b.profit < 0 ? 'bg-red-50/60' : 'hover:bg-gray-50/50'}
                    >
                      <td className={`px-4 py-2.5 font-medium text-xs ${b.profit < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                        {b.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-700">
                        {fmt(b.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-700">
                        {fmt(b.expenses)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${b.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(b.profit)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${b.profit >= 0 ? 'text-gray-500' : 'text-red-500'}`}>
                        {b.margin != null ? `${b.margin.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary row */}
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-4 py-2.5 font-bold text-xs text-gray-700">合计</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-gray-700">
                      {fmt(finalBrandStats.reduce((s, b) => s + b.revenue, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-gray-700">
                      {fmt(finalBrandStats.reduce((s, b) => s + b.expenses, 0))}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(totalProfit)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-500">
                      {totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">月度收支趋势</h2>
              <p className="text-xs text-gray-400 mt-0.5">近6个月</p>
            </div>
            <div className="px-4 py-4">
              <TrendChart data={chartData} />
            </div>
          </div>
        </div>

        {/* ── Action Items ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">待办事项</h2>
              <span className="text-xs font-medium text-gray-400">Action Items</span>
            </div>
            {totalPending > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalPending} 项待处理
              </Badge>
            )}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {/* Left: Pending Projects */}
            <div>
              <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  待审批项目号
                </span>
                {pendingProjects.length > 0 && (
                  <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                    {pendingProjects.length}
                  </span>
                )}
              </div>
              <ActionItems projects={pendingProjects} />
            </div>

            {/* Right: Pending Expenses */}
            <div>
              <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  待审批付款
                </span>
                {pendingExpenses.length > 0 && (
                  <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                    {pendingExpenses.length}
                  </span>
                )}
              </div>
              <PendingExpenses expenses={pendingExpenses} approverRole={role} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
