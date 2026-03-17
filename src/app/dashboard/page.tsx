import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/app-header'
import ActionItems, { type PendingProject } from './action-items'
import PendingExpenses, { type PendingExpense } from './pending-expenses'
import TrendChart, { type MonthlyDataPoint } from './trend-chart'
import BrandBarChart, { type BrandBarData } from './brand-bar-chart'
import ProjectStatusPie, { type StatusCount } from './project-status-pie'
import ExportButton from './export-button'
import AnimatedNumber from '@/components/animated-number'
import Link from 'next/link'

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

function getLast6Months(): { label: string; year: number; month: number }[] {
  const now = new Date()
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleString('en-AU', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    })
  }
  return result
}

function getRangeStart(range: string): Date {
  const now = new Date()
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (range === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  return new Date(now.getFullYear(), 0, 1) // year
}

function calcMoM(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function MoMBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-300">—</span>
  const up = pct >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-[#38A169]' : 'text-[#E53E3E]'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

const RANGE_LABELS: Record<string, string> = {
  month: '本月',
  quarter: '本季度',
  year: '本年',
}

const ACTION_LABELS: Record<string, string> = {
  approved: '批准',
  rejected: '拒绝',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = 'year' } = await searchParams

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = user
    ? await db.from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
    : { data: null }

  const role = profile?.role ?? ''
  const isSuperAdmin = role === 'Super Admin'
  const isAdmin = ['Admin', 'Super Admin'].includes(role)

  const pendingStatuses = isSuperAdmin
    ? ['Pending Approval', 'Pending Super Approval']
    : isAdmin
    ? ['Pending Approval']
    : []

  const now = new Date()
  const rangeStart = getRangeStart(range)
  const rangeStartStr = rangeStart.toISOString().slice(0, 10)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthStartStr = thisMonthStart.toISOString().slice(0, 10)
  const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10)
  const [
    { data: rawProjects },
    { data: rawExpenses },
    { data: allRevenues },
    { data: allExpenses },
    { data: brandRows },
    { data: allProjects },
    { data: recentActivity },
    { data: approvalSettings },
  ] = await Promise.all([
    // Pending projects for action items
    db
      .from('projects')
      .select('id, name, estimated_revenue, created_at, brands(name), profiles(full_name)')
      .eq('status', 'Pending Approval')
      .order('created_at', { ascending: true }),

    // Pending expenses filtered by role
    pendingStatuses.length > 0
      ? db
          .from('expenses')
          .select('id, payee, description, amount, attachment_url, created_at, status, projects(project_code, name)')
          .in('status', pendingStatuses)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[], error: null }),

    // All revenues with project + brand info
    db
      .from('revenues')
      .select('id, amount, status, issue_date, received_date, description, invoice_number, projects(id, name, project_code, brands(name))'),

    // All expenses with project + brand info
    db
      .from('expenses')
      .select('id, amount, status, created_at, payee, description, projects(id, name, project_code, brands(name))'),

    // Brand list
    db.from('brands').select('id, name').order('name'),

    // All projects for status pie
    db.from('projects').select('id, status'),

    // Recent project approvals for activity log
    db
      .from('project_approvals')
      .select('id, action, comment, created_at, projects(name, project_code), profiles!approved_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),

    // Approval settings for overdue_days
    db.from('approval_settings').select('overdue_days').eq('id', 1).single<{ overdue_days: number }>(),
  ])

  const revenues = allRevenues ?? []
  const expenses = allExpenses ?? []
  const brands = brandRows ?? []
  const projects = allProjects ?? []

  const overdueDays = approvalSettings?.overdue_days ?? 30
  const overdueThresholdDate = new Date(now.getTime() - overdueDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

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

  // ── KPI Calculations (range-filtered) ────────────────────────────────────
  const totalRevenue = revenues
    .filter((r: any) => r.status === 'Paid' && r.issue_date >= rangeStartStr)
    .reduce((s: number, r: any) => s + Number(r.amount), 0)

  const totalExpenses = expenses
    .filter((e: any) => ['Approved', 'Paid'].includes(e.status) && e.created_at >= rangeStartStr)
    .reduce((s: number, e: any) => s + Number(e.amount), 0)

  const totalProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null

  // MoM (this month vs last month, always)
  const thisMonthRevenue = revenues
    .filter((r: any) => r.status === 'Paid' && r.issue_date >= thisMonthStartStr)
    .reduce((s: number, r: any) => s + Number(r.amount), 0)
  const lastMonthRevenue = revenues
    .filter((r: any) => r.status === 'Paid' && r.issue_date >= lastMonthStartStr && r.issue_date < thisMonthStartStr)
    .reduce((s: number, r: any) => s + Number(r.amount), 0)

  const thisMonthExpenses = expenses
    .filter((e: any) => ['Approved', 'Paid'].includes(e.status) && e.created_at >= thisMonthStartStr)
    .reduce((s: number, e: any) => s + Number(e.amount), 0)
  const lastMonthExpenses = expenses
    .filter((e: any) => ['Approved', 'Paid'].includes(e.status) && e.created_at >= lastMonthStartStr && e.created_at < thisMonthStartStr)
    .reduce((s: number, e: any) => s + Number(e.amount), 0)

  const revenueMoM = calcMoM(thisMonthRevenue, lastMonthRevenue)
  const expensesMoM = calcMoM(thisMonthExpenses, lastMonthExpenses)
  const profitMoM = calcMoM(
    thisMonthRevenue - thisMonthExpenses,
    lastMonthRevenue - lastMonthExpenses
  )

  // ── Brand Bar Chart ───────────────────────────────────────────────────────
  const brandRevenueMap: Record<string, number> = {}
  for (const r of revenues) {
    if ((r as any).status !== 'Paid' || (r as any).issue_date < rangeStartStr) continue
    const name = (r as any).projects?.brands?.name ?? '—'
    brandRevenueMap[name] = (brandRevenueMap[name] ?? 0) + Number((r as any).amount)
  }
  const brandBarData: BrandBarData[] = brands
    .filter((b: any) => brandRevenueMap[b.name])
    .map((b: any) => ({ name: b.name, revenue: brandRevenueMap[b.name] ?? 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── Project Status Pie ────────────────────────────────────────────────────
  const statusMap: Record<string, number> = {}
  for (const p of projects) {
    const s = (p as any).status
    statusMap[s] = (statusMap[s] ?? 0) + 1
  }
  const statusData: StatusCount[] = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // ── Overdue Revenues (unpaid beyond overdue threshold) ───────────────────
  const overdueRevenues = revenues
    .filter((r: any) => r.status === 'Unpaid' && r.issue_date && r.issue_date < overdueThresholdDate)
    .map((r: any) => ({
      ...r,
      daysPast: Math.floor((now.getTime() - new Date(r.issue_date).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a: any, b: any) => b.daysPast - a.daysPast)

  // ── Monthly Trend Chart ───────────────────────────────────────────────────
  const months = getLast6Months()
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

    return { month: label, revenue: monthRevenue, expenses: monthExpenses, profit: monthRevenue - monthExpenses }
  })

  // ── Recent Activity ───────────────────────────────────────────────────────
  const activity = (recentActivity ?? []) as any[]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7FAFC' }}>
      <AppHeader title="Dashboard" />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4 md:space-y-5">

        {/* Page title + range filter + date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">仪表盘</h1>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Range filter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
              {(['month', 'quarter', 'year'] as const).map((r) => (
                <Link
                  key={r}
                  href={`?range=${r}`}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    range === r
                      ? 'bg-[#2B6CB0] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </Link>
              ))}
            </div>
            <ExportButton />
            <span className="text-sm text-gray-400">{todayLabel()}</span>
          </div>
        </div>

        {/* ── Row 1: KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Total Revenue */}
          <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute left-0 inset-y-0 w-1 bg-[#38A169] rounded-l-xl" />
            <p className="text-xs text-gray-400 mb-1">总收入（已收款）</p>
            <AnimatedNumber value={totalRevenue} formatter={fmt} className="text-2xl font-bold text-[#38A169]" />
            <div className="flex items-center gap-1.5 mt-1.5">
              <MoMBadge pct={revenueMoM} />
              <span className="text-xs text-gray-300">vs 上月</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute left-0 inset-y-0 w-1 bg-[#E53E3E] rounded-l-xl" />
            <p className="text-xs text-gray-400 mb-1">总支出（已批准）</p>
            <AnimatedNumber value={totalExpenses} formatter={fmt} className="text-2xl font-bold text-[#E53E3E]" />
            <div className="flex items-center gap-1.5 mt-1.5">
              <MoMBadge pct={expensesMoM} />
              <span className="text-xs text-gray-300">vs 上月</span>
            </div>
          </div>

          {/* Total Profit */}
          <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${totalProfit >= 0 ? 'bg-[#2B6CB0]' : 'bg-[#E53E3E]'}`} />
            <p className="text-xs text-gray-400 mb-1">总利润</p>
            <AnimatedNumber value={totalProfit} formatter={fmt}
              className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`} />
            <div className="flex items-center gap-1.5 mt-1.5">
              <MoMBadge pct={profitMoM} />
              {profitMargin !== null && (
                <span className="text-xs text-gray-400">
                  毛利率 {profitMargin.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Pending Items */}
          <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${totalPending > 0 ? 'bg-[#DD6B20]' : 'bg-gray-200'}`} />
            <p className="text-xs text-gray-400 mb-1">待处理事项</p>
            <AnimatedNumber value={totalPending}
              className={`text-2xl font-bold ${totalPending > 0 ? 'text-[#DD6B20]' : 'text-gray-400'}`} />
            <p className="text-xs text-gray-400 mt-1.5">
              {pendingProjects.length} 个项目 · {pendingExpenses.length} 笔付款
            </p>
          </div>
        </div>

        {/* ── Row 2: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Trend */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">月度财务趋势</h2>
              <p className="text-xs text-gray-400 mt-0.5">近6个月 · 收入 / 支出 / 利润</p>
            </div>
            <div className="px-4 py-4">
              <TrendChart data={chartData} />
            </div>
          </div>

          {/* Brand Revenue Bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">品牌收入对比</h2>
              <p className="text-xs text-gray-400 mt-0.5">已收款 · {RANGE_LABELS[range]}</p>
            </div>
            <div className="px-4 py-4">
              <BrandBarChart data={brandBarData} />
            </div>
          </div>
        </div>

        {/* ── Row 3: Alerts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pending Approvals */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">待审批事项</h2>
                <p className="text-xs text-gray-400 mt-0.5">项目申请 + 付款请求</p>
              </div>
              {totalPending > 0 && (
                <span className="text-xs font-semibold text-[#DD6B20] bg-[#DD6B20]/10 px-2.5 py-1 rounded-full border border-[#DD6B20]/25">
                  {totalPending} 项待处理
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-50">
              {/* Pending Projects sub-section */}
              {pendingProjects.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50/60">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      待审批项目 ({pendingProjects.length})
                    </span>
                  </div>
                  <ActionItems projects={pendingProjects} />
                </div>
              )}

              {/* Pending Expenses sub-section */}
              {pendingExpenses.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50/60">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      待审批付款 ({pendingExpenses.length})
                    </span>
                  </div>
                  <PendingExpenses expenses={pendingExpenses} approverRole={role} />
                </div>
              )}

              {totalPending === 0 && (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                  暂无待处理事项 ✓
                </div>
              )}
            </div>
          </div>

          {/* Overdue Revenues */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">逾期未收款</h2>
                <p className="text-xs text-gray-400 mt-0.5">开票超过 {overdueDays} 天未收款</p>
              </div>
              {overdueRevenues.length > 0 && (
                <span className="text-xs font-semibold text-[#E53E3E] bg-[#E53E3E]/10 px-2.5 py-1 rounded-full border border-[#E53E3E]/25">
                  {overdueRevenues.length} 条
                </span>
              )}
            </div>

            {overdueRevenues.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                暂无逾期未收款 ✓
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
                {overdueRevenues.map((r: any) => {
                  const proj = r.projects
                  return (
                    <div key={r.id} className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-gray-400">
                              {proj?.project_code ?? proj?.name ?? '—'}
                            </span>
                            <span className="text-xs font-medium text-[#E53E3E] bg-[#E53E3E]/10 px-1.5 py-0.5 rounded border border-[#E53E3E]/20">
                              逾期 {r.daysPast} 天
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{r.description}</p>
                          {r.invoice_number && (
                            <p className="text-xs text-gray-400 mt-0.5">发票号：{r.invoice_number}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-800">{fmt(Number(r.amount))}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.issue_date}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 4: Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Project Status Pie */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">项目状态分布</h2>
              <p className="text-xs text-gray-400 mt-0.5">共 {projects.length} 个项目</p>
            </div>
            <div className="px-4 py-4">
              <ProjectStatusPie data={statusData} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">最近项目动态</h2>
              <p className="text-xs text-gray-400 mt-0.5">审批记录</p>
            </div>

            {activity.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                暂无操作记录
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
                {activity.map((a: any) => {
                  const isApproved = a.action === 'approved'
                  const proj = a.projects
                  const approver = a.profiles?.full_name ?? '未知'
                  const timeAgo = new Date(a.created_at).toLocaleString('zh-CN', {
                    month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })
                  return (
                    <div key={a.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                            isApproved ? 'bg-[#38A169]' : 'bg-[#E53E3E]'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-gray-700">{approver}</span>
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                isApproved
                                  ? 'bg-[#38A169]/10 text-[#38A169]'
                                  : 'bg-[#E53E3E]/10 text-[#E53E3E]'
                              }`}
                            >
                              {ACTION_LABELS[a.action] ?? a.action}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                              {proj?.project_code ?? proj?.name ?? '未知项目'}
                            </span>
                          </div>
                          {a.comment && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{a.comment}</p>
                          )}
                          <p className="text-xs text-gray-300 mt-0.5">{timeAgo}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
