import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

import ActionItems, { type PendingProject } from './action-items'
import PendingExpenses, { type PendingExpense } from './pending-expenses'
import TrendChart, { type MonthlyDataPoint } from './trend-chart'
import BrandBarChart, { type BrandBarData } from './brand-bar-chart'

import ExportButton from './export-button'
import AnimatedNumber from '@/components/animated-number'
import Link from 'next/link'
import { getServerT, getServerLocale } from '@/i18n/use-server-t'

function todayLabel(locale: string) {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-AU'
  return new Date().toLocaleDateString(loc, {
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
    <span className={`text-xs font-medium ${up ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function getRangeLabels(t: (k: string) => string): Record<string, string> {
  return {
    month: t('dashboard.month'),
    quarter: t('dashboard.quarter'),
    year: t('dashboard.year'),
  }
}

function getActionLabels(t: (k: string) => string): Record<string, string> {
  return {
    approved: t('common.approved'),
    rejected: t('common.rejected'),
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = 'year' } = await searchParams

  const t = await getServerT()
  const locale = await getServerLocale()
  const RANGE_LABELS = getRangeLabels(t)
  const ACTION_LABELS = getActionLabels(t)

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

  // MoM (this month vs last month)
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

  // ── Brand This-Month Revenue (for progress bar list) ─────────────────────
  const brandThisMonthMap: Record<string, number> = {}
  for (const r of revenues) {
    if ((r as any).status !== 'Paid' || (r as any).issue_date < thisMonthStartStr) continue
    const name = (r as any).projects?.brands?.name ?? '—'
    brandThisMonthMap[name] = (brandThisMonthMap[name] ?? 0) + Number((r as any).amount)
  }
  const brandThisMonthList = brands
    .map((b: any) => ({ name: b.name, revenue: brandThisMonthMap[b.name] ?? 0 }))
    .filter(b => b.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
  const brandThisMonthMax = brandThisMonthList[0]?.revenue ?? 1

  // ── This-month profit ─────────────────────────────────────────────────────
  const thisMonthProfit = thisMonthRevenue - thisMonthExpenses
  const thisMonthMargin = thisMonthRevenue > 0 ? (thisMonthProfit / thisMonthRevenue) * 100 : null

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
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4 md:space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayLabel(locale)}</p>
        </div>
        <ExportButton />
      </div>

      {/* ── Row 1: KPI Cards (this month) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* 本月收入 */}
        <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute left-0 inset-y-0 w-1 bg-[var(--color-success)] rounded-l-xl" />
          <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{t('dashboard.thisMonthRevenue')}</p>
          <AnimatedNumber value={thisMonthRevenue} format="currency-aud" className="text-2xl font-bold text-[#16a34a]" />
          <div className="flex items-center gap-1.5 mt-1.5">
            <MoMBadge pct={revenueMoM} />
            <span className="text-xs text-gray-300">{t('common.vsLastMonth')}</span>
          </div>
        </div>

        {/* 本月支出 */}
        <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute left-0 inset-y-0 w-1 bg-[var(--color-danger)] rounded-l-xl" />
          <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{t('dashboard.thisMonthExpenses')}</p>
          <AnimatedNumber value={thisMonthExpenses} format="currency-aud" className="text-2xl font-bold text-[#dc2626]" />
          <div className="flex items-center gap-1.5 mt-1.5">
            <MoMBadge pct={expensesMoM} />
            <span className="text-xs text-gray-300">{t('common.vsLastMonth')}</span>
          </div>
        </div>

        {/* 本月利润 */}
        <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
          <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${thisMonthProfit >= 0 ? 'bg-[var(--color-info)]' : 'bg-[var(--color-danger)]'}`} />
          <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{t('dashboard.thisMonthProfit')}</p>
          <AnimatedNumber value={thisMonthProfit} format="currency-aud"
            className={`text-2xl font-bold ${thisMonthProfit >= 0 ? 'text-[#2563eb]' : 'text-[#dc2626]'}`} />
          <div className="flex items-center gap-1.5 mt-1.5">
            <MoMBadge pct={profitMoM} />
            {thisMonthMargin !== null && (
              <span className="text-xs text-gray-400">{t('dashboard.profitMargin')} {thisMonthMargin.toFixed(1)}%</span>
            )}
          </div>
        </div>

        {/* 待处理 */}
        <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 overflow-hidden hover:shadow-md transition-shadow">
          <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${totalPending > 0 ? 'bg-[var(--color-warning)]' : 'bg-gray-200'}`} />
          <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">{t('dashboard.pendingItems')}</p>
          <AnimatedNumber value={totalPending}
            className={`text-2xl font-bold ${totalPending > 0 ? 'text-[#f59e0b]' : 'text-gray-400'}`} />
          <p className="text-xs text-gray-400 mt-1.5">
            {pendingProjects.length} {t('dashboard.pendingApproval')} · {pendingExpenses.length} {t('dashboard.pendingPayment')}
          </p>
        </div>
      </div>

      {/* ── Row 2: Charts (60/40) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Monthly Trend — 60% */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{t('dashboard.monthlyTrend')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.monthlyTrendDesc')}</p>
            </div>
          </div>
          <div className="px-4 py-4">
            <TrendChart data={chartData} />
          </div>
        </div>

        {/* Brand Revenue Bar — 40% */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{t('dashboard.brandRevenueShare')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.receivedRange').replace('{range}', RANGE_LABELS[range])}</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
              {(['month', 'quarter', 'year'] as const).map((r) => (
                <Link key={r} href={`?range=${r}`}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    range === r ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  {RANGE_LABELS[r]}
                </Link>
              ))}
            </div>
          </div>
          <div className="px-4 py-4">
            <BrandBarChart data={brandBarData} />
          </div>
        </div>
      </div>

      {/* ── Row 3: Bottom 3-column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Col 1: 按品牌本月收入 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{t('dashboard.revenueByBrand')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.receivedThisMonth')}</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {brandThisMonthList.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">{t('dashboard.noRevenueThisMonth')}</p>
            ) : (
              brandThisMonthList.map((b) => (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={`/projects?brand=${encodeURIComponent(b.name)}`}
                      className="text-sm font-medium text-gray-700 hover:text-[#2563eb] transition-colors"
                    >
                      {b.name}
                    </Link>
                    <span className="text-sm font-semibold text-gray-900">{fmt(b.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb] rounded-full transition-all"
                      style={{ width: `${Math.round((b.revenue / brandThisMonthMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: 最近项目动态 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{t('dashboard.recentActivity')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.approvalRecords')}</p>
          </div>
          {activity.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">{t('dashboard.noActivity')}</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
              {activity.slice(0, 8).map((a: any) => {
                const isApproved = a.action === 'approved'
                const proj = a.projects
                const approver = a.profiles?.full_name ?? t('projects.unknown')
                const timeStr = new Date(a.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
                  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                })
                return (
                  <div key={a.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-gray-700">{approver}</span>
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${isApproved ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#dc2626]/10 text-[#dc2626]'}`}>
                            {ACTION_LABELS[a.action] ?? a.action}
                          </span>
                          <span className="text-xs text-gray-500 truncate">{proj?.project_code ?? proj?.name ?? '—'}</span>
                        </div>
                        {a.comment && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.comment}</p>}
                        <p className="text-[11px] text-gray-300 mt-0.5">{timeStr}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Col 3: 待处理事项 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{t('dashboard.pendingTasks')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.approvalOverdue')}</p>
            </div>
            {totalPending > 0 && (
              <span className="text-xs font-semibold text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full border border-[#f59e0b]/25">
                {totalPending}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
            {/* Pending Projects */}
            {pendingProjects.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50/60">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {t('dashboard.pendingProjects')} ({pendingProjects.length})
                  </span>
                </div>
                <ActionItems projects={pendingProjects} />
              </div>
            )}
            {/* Pending Expenses */}
            {pendingExpenses.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50/60">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {t('dashboard.pendingPayments')} ({pendingExpenses.length})
                  </span>
                </div>
                <PendingExpenses expenses={pendingExpenses} approverRole={role} />
              </div>
            )}
            {/* Overdue Revenues */}
            {overdueRevenues.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50/60">
                  <span className="text-[10px] font-semibold text-[#dc2626] uppercase tracking-wider">
                    {t('dashboard.overdueUnpaid')} ({overdueRevenues.length})
                  </span>
                </div>
                {overdueRevenues.slice(0, 4).map((r: any) => {
                  const proj = r.projects
                  return (
                    <div key={r.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400">{proj?.project_code ?? '—'}</span>
                            <span className="text-[11px] font-medium text-[#dc2626] bg-[#dc2626]/10 px-1.5 py-0.5 rounded">
                              {t('dashboard.overdueDays').replace('{days}', String(r.daysPast))}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-800 shrink-0">{fmt(Number(r.amount))}</span>
                      </div>
                    </div>
                  )
                })}
                {overdueRevenues.length > 4 && (
                  <div className="px-4 py-2 text-center">
                    <span className="text-xs text-gray-400">{t('dashboard.moreItems').replace('{count}', String(overdueRevenues.length - 4))}</span>
                  </div>
                )}
              </div>
            )}
            {totalPending === 0 && overdueRevenues.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">{t('dashboard.noPendingTasks')}</div>
            )}
          </div>
        </div>

      </div>

    </main>
  )
}
