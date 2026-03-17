'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, ChevronRight } from 'lucide-react'

export interface ProjectRow {
  id: string
  project_code: string | null
  brand_name: string
  name: string
  type: string
  status: string
  estimated_revenue: number | null
  total_revenue: number
  total_expenses: number
  created_at: string
}

interface Props {
  projects: ProjectRow[]
  brands: string[]
}

const PAGE_SIZE = 20

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  'Active':           'bg-[#38A169]',
  'Pending Approval': 'bg-[#DD6B20]',
  'Completed':        'bg-[#2B6CB0]',
  'Reconciled':       'bg-gray-400',
  'Rejected':         'bg-[#E53E3E]',
}

const STATUS_TEXT: Record<string, string> = {
  'Active':           'text-[#38A169]',
  'Pending Approval': 'text-[#DD6B20]',
  'Completed':        'text-[#2B6CB0]',
  'Reconciled':       'text-gray-500',
  'Rejected':         'text-[#E53E3E]',
}

const STATUS_LABELS: Record<string, string> = {
  'Active':           '进行中',
  'Pending Approval': '待审批',
  'Completed':        '已完成',
  'Reconciled':       '已对账',
  'Rejected':         '已拒绝',
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function exportCSV(rows: ProjectRow[]) {
  const headers = ['项目代码', '品牌', '项目名称', '类型', '预估收入', '实际总收入', '实际总支出', '利润', '状态', '创建时间']
  const csvRows = rows.map(p => {
    const profit = p.total_revenue - p.total_expenses
    return [
      p.project_code ?? '',
      p.brand_name,
      p.name,
      p.type,
      p.estimated_revenue ?? '',
      p.total_revenue,
      p.total_expenses,
      profit,
      p.status,
      p.created_at.slice(0, 10),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = '\ufeff' + [headers.join(','), ...csvRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hylink-projects-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Sort header component ─────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

function SortTh({
  col,
  activeCol,
  dir,
  onSort,
  align = 'left',
  children,
  className = '',
}: {
  col: string
  activeCol: string
  dir: SortDir
  onSort: (col: string) => void
  align?: 'left' | 'right'
  children: React.ReactNode
  className?: string
}) {
  const isActive = activeCol === col
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3 font-semibold text-[#4A5568] text-xs cursor-pointer select-none hover:text-[#1A365D] transition-colors ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (
          dir === 'asc'
            ? <ChevronUp size={12} className="text-[#2B6CB0]" />
            : <ChevronDown size={12} className="text-[#2B6CB0]" />
        ) : (
          <ChevronsUpDown size={11} className="text-gray-300" />
        )}
      </span>
    </th>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function ProjectsTable({ projects, brands }: Props) {
  const router = useRouter()

  // Filters
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  // Sort
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Mobile filter visibility
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Pagination
  const [page, setPage] = useState(0)

  function resetPage() { setPage(0) }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
    resetPage()
  }

  // Derived filter options
  const allStatuses = useMemo(() => Array.from(new Set(projects.map(p => p.status))).sort(), [projects])
  const allTypes = useMemo(() => Array.from(new Set(projects.map(p => p.type))).sort(), [projects])
  const allMonths = useMemo(() =>
    Array.from(new Set(projects.map(p => p.created_at.slice(0, 7)))).sort().reverse(),
    [projects]
  )

  // Filtered rows
  const filtered = useMemo(() => {
    const minAmt = amountMin !== '' ? parseFloat(amountMin) : null
    const maxAmt = amountMax !== '' ? parseFloat(amountMax) : null
    return projects.filter(p => {
      if (brandFilter !== 'all' && p.brand_name !== brandFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (monthFilter !== 'all' && p.created_at.slice(0, 7) !== monthFilter) return false
      if (dateFrom && p.created_at.slice(0, 10) < dateFrom) return false
      if (dateTo && p.created_at.slice(0, 10) > dateTo) return false
      if (minAmt !== null && (p.estimated_revenue ?? 0) < minAmt) return false
      if (maxAmt !== null && (p.estimated_revenue ?? 0) > maxAmt) return false
      return true
    })
  }, [projects, brandFilter, statusFilter, typeFilter, monthFilter, dateFrom, dateTo, amountMin, amountMax])

  // Sorted rows
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortCol) {
        case 'project_code': av = a.project_code ?? ''; bv = b.project_code ?? ''; break
        case 'brand_name':   av = a.brand_name;         bv = b.brand_name;         break
        case 'name':         av = a.name;                bv = b.name;                break
        case 'type':         av = a.type;                bv = b.type;                break
        case 'status':       av = a.status;              bv = b.status;              break
        case 'estimated_revenue': av = a.estimated_revenue ?? -1; bv = b.estimated_revenue ?? -1; break
        case 'total_revenue': av = a.total_revenue;    bv = b.total_revenue;    break
        case 'total_expenses': av = a.total_expenses;  bv = b.total_expenses;   break
        case 'profit':       av = a.total_revenue - a.total_expenses; bv = b.total_revenue - b.total_expenses; break
        default:             av = a.created_at;          bv = b.created_at
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // Summary totals (from all filtered rows, not just current page)
  const summary = useMemo(() => {
    let estRev = 0, actRev = 0, actExp = 0
    for (const p of filtered) {
      if (p.estimated_revenue != null) estRev += p.estimated_revenue
      actRev += p.total_revenue
      actExp += p.total_expenses
    }
    return { estRev, actRev, actExp, profit: actRev - actExp }
  }, [filtered])

  const hasFilters = brandFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' ||
    monthFilter !== 'all' || dateFrom || dateTo || amountMin || amountMax

  function clearFilters() {
    setBrandFilter('all'); setStatusFilter('all'); setTypeFilter('all')
    setMonthFilter('all'); setDateFrom(''); setDateTo('')
    setAmountMin(''); setAmountMax('')
    resetPage()
  }

  return (
    <div className="space-y-4">
      {/* ── Filter panel ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Mobile: collapsible header */}
        <button
          className="md:hidden w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700"
          onClick={() => setFiltersOpen(v => !v)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-gray-400" />
            筛选条件
            {hasFilters && (
              <span className="bg-[#2B6CB0] text-white text-xs px-1.5 py-0.5 rounded-full">已筛选</span>
            )}
          </span>
          <span className="flex items-center gap-2 text-xs text-gray-400">
            {filtered.length} 个项目
            <ChevronDown size={14} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {/* Filter body — always visible on md+, collapsible on mobile */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:block px-4 py-3 space-y-3 border-t border-gray-100 md:border-0`}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Brand */}
            <Select value={brandFilter} onValueChange={v => { if (v) { setBrandFilter(v); resetPage() } }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="全部品牌" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部品牌</SelectItem>
                {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={v => { if (v) { setStatusFilter(v); resetPage() } }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {allStatuses.map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s] ?? 'bg-gray-400'}`} />
                      {STATUS_LABELS[s] ?? s}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={typeFilter} onValueChange={v => { if (v) { setTypeFilter(v); resetPage() } }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Month */}
            <Select value={monthFilter} onValueChange={v => { if (v) { setMonthFilter(v); setDateFrom(''); setDateTo(''); resetPage() } }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="全部月份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部月份</SelectItem>
                {allMonths.map(m => (
                  <SelectItem key={m} value={m}>{m.replace('-', ' 年 ') + ' 月'}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setMonthFilter('all'); resetPage() }}
                className="h-8 text-xs border border-gray-200 rounded-lg px-2.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2B6CB0]/40"
              />
              <span className="text-gray-300 text-xs">—</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={e => { setDateTo(e.target.value); setMonthFilter('all'); resetPage() }}
                className="h-8 text-xs border border-gray-200 rounded-lg px-2.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2B6CB0]/40"
              />
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                清除筛选
              </button>
            )}

            <div className="ml-auto hidden md:flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {filtered.length} 个项目{filtered.length < projects.length ? `（共 ${projects.length}）` : ''}
              </span>
              <button
                onClick={() => exportCSV(filtered)}
                className="text-xs text-[#2B6CB0] border border-[#2B6CB0]/30 rounded-lg px-3 py-1.5 hover:bg-[#2B6CB0]/5 transition-colors font-medium"
              >
                导出 CSV
              </button>
            </div>
          </div>

          {/* Estimated revenue range — hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">预估收入范围：</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="最小金额"
                value={amountMin}
                min={0}
                onChange={e => { setAmountMin(e.target.value); resetPage() }}
                className="h-7 w-28 text-xs border border-gray-200 rounded-lg px-2.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2B6CB0]/40"
              />
              <span className="text-gray-300 text-xs">—</span>
              <input
                type="number"
                placeholder="最大金额"
                value={amountMax}
                min={0}
                onChange={e => { setAmountMax(e.target.value); resetPage() }}
                className="h-7 w-28 text-xs border border-gray-200 rounded-lg px-2.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2B6CB0]/40"
              />
              <span className="text-xs text-gray-400">AUD</span>
            </div>
          </div>

          {/* Mobile: CSV export */}
          <div className="flex md:hidden justify-between items-center pt-1">
            <button
              onClick={() => exportCSV(filtered)}
              className="text-xs text-[#2B6CB0] border border-[#2B6CB0]/30 rounded-lg px-3 py-1.5 hover:bg-[#2B6CB0]/5 transition-colors font-medium"
            >
              导出 CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">预估总收入</p>
            <p className="text-lg font-bold text-gray-600">{fmt(summary.estRev)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">实际总收入</p>
            <p className="text-lg font-bold text-[#38A169]">{fmt(summary.actRev)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">实际总支出</p>
            <p className="text-lg font-bold text-[#E53E3E]">{fmt(summary.actExp)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">总利润</p>
            <p className={`text-lg font-bold ${summary.profit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>
              {fmt(summary.profit)}
            </p>
            {summary.actRev > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                毛利率 {((summary.profit / summary.actRev) * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-2">
        {pageRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
            暂无符合条件的项目
          </div>
        ) : pageRows.map(p => {
          const profit = p.total_revenue - p.total_expenses
          const hasFinancials = p.total_revenue > 0 || p.total_expenses > 0
          return (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 cursor-pointer active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{p.brand_name}</span>
                    {p.project_code && (
                      <span className="font-mono text-xs text-gray-400">{p.project_code}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${STATUS_TEXT[p.status] ?? 'text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status] ?? 'bg-gray-400'}`} />
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
              {hasFinancials && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">收入</p>
                    <p className="text-xs font-mono font-semibold text-[#38A169]">{fmt(p.total_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">支出</p>
                    <p className="text-xs font-mono font-semibold text-[#E53E3E]">{fmt(p.total_expenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">利润</p>
                    <p className={`text-xs font-mono font-semibold ${profit >= 0 ? 'text-[#38A169]' : 'text-[#E53E3E]'}`}>{fmt(profit)}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              ← 上一页
            </button>
            <span className="text-xs text-gray-400">{safePage + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100" style={{ backgroundColor: '#F7FAFC' }}>
            <tr>
              <SortTh col="project_code" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-36 text-xs">
                项目代码
              </SortTh>
              <SortTh col="brand_name" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-20 text-xs">
                品牌
              </SortTh>
              <SortTh col="name" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="text-xs">
                项目名称
              </SortTh>
              <SortTh col="type" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-24 text-xs">
                类型
              </SortTh>
              <SortTh col="status" activeCol={sortCol} dir={sortDir} onSort={handleSort} className="w-28 text-xs">
                状态
              </SortTh>
              <SortTh col="estimated_revenue" activeCol={sortCol} dir={sortDir} onSort={handleSort} align="right" className="w-28 text-xs">
                预估收入
              </SortTh>
              <SortTh col="total_revenue" activeCol={sortCol} dir={sortDir} onSort={handleSort} align="right" className="w-28 text-xs">
                实际收入
              </SortTh>
              <SortTh col="total_expenses" activeCol={sortCol} dir={sortDir} onSort={handleSort} align="right" className="w-28 text-xs">
                实际支出
              </SortTh>
              <SortTh col="profit" activeCol={sortCol} dir={sortDir} onSort={handleSort} align="right" className="w-28 text-xs">
                利润
              </SortTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((p, idx) => {
              const profit = p.total_revenue - p.total_expenses
              const hasFinancials = p.total_revenue > 0 || p.total_expenses > 0
              return (
                <tr
                  key={p.id}
                  className={`animate-fade-in-up cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-[#EBF8FF]/50' : 'bg-[#F7FAFC]/60 hover:bg-[#EBF8FF]/50'}`}
                  style={{ animationDelay: `${idx * 35}ms` }}
                  onClick={() => router.push(`/projects/${p.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.project_code ?? <span className="text-gray-300 italic text-xs">待分配</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{p.brand_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_TEXT[p.status] ?? 'text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status] ?? 'bg-gray-400'}`} />
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                    {p.estimated_revenue != null ? fmt(p.estimated_revenue) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#38A169]">
                    {p.total_revenue > 0 ? fmt(p.total_revenue) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#E53E3E]">
                    {p.total_expenses > 0 ? fmt(p.total_expenses) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                    !hasFinancials ? 'text-gray-300' :
                    profit > 0 ? 'text-[#38A169]' :
                    profit < 0 ? 'text-[#E53E3E]' : 'text-gray-400'
                  }`}>
                    {hasFinancials ? fmt(profit) : '—'}
                  </td>
                </tr>
              )
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                  暂无符合条件的项目
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-400">
              第 {safePage + 1} 页，共 {totalPages} 页（{filtered.length} 条）
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={safePage === 0}
                className="px-2 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="px-2.5 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const offset = Math.max(0, Math.min(totalPages - 5, safePage - 2))
                const p = offset + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs rounded-md font-medium transition-colors ${
                      p === safePage
                        ? 'bg-[#2B6CB0] text-white'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="px-2.5 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={safePage >= totalPages - 1}
                className="px-2 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
