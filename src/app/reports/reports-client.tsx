'use client'

import { useState, useMemo } from 'react'
import { exportToExcel, exportToPDF, type SheetRow } from './export-utils'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────

export interface RawRevenue {
  id: string
  amount: number
  status: string
  issue_date: string | null
  invoice_number: string | null
  description: string
  project_id: string
  project_name: string
  project_code: string | null
  brand_name: string
}

export interface RawExpense {
  id: string
  amount: number
  status: string
  created_at: string
  project_id: string
  brand_name: string
}

export interface RawProject {
  id: string
  name: string
  project_code: string | null
  brand_name: string
  status: string
  estimated_revenue: number | null
}

export interface RawBrand {
  id: string
  name: string
}

interface Props {
  revenues: RawRevenue[]
  expenses: RawExpense[]
  projects: RawProject[]
  brands: RawBrand[]
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function fmtPct(n: number | null) {
  if (n === null || !isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

function getRangeStart(range: string): string {
  const now = new Date()
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  if (range === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10)
  if (range === 'year') return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  return '2000-01-01' // all
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-[#2B6CB0] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function ExportBar({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPdf}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span>↓</span> PDF
      </button>
      <button
        onClick={onExcel}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#38A169] border border-[#38A169]/30 rounded-lg hover:bg-[#38A169]/5 transition-colors"
      >
        <span>↓</span> Excel
      </button>
    </div>
  )
}

// ── P&L Report ────────────────────────────────────────────────────────────

function PLReport({ revenues, expenses, brands, range, brandFilter }: {
  revenues: RawRevenue[]
  expenses: RawExpense[]
  brands: RawBrand[]
  range: string
  brandFilter: string
}) {
  const [groupBy, setGroupBy] = useState<'brand' | 'month'>('brand')
  const rangeStart = getRangeStart(range)

  const filteredRevenues = revenues.filter(r =>
    r.status === 'Paid' &&
    r.issue_date && r.issue_date >= rangeStart &&
    (brandFilter === 'all' || r.brand_name === brandFilter)
  )
  const filteredExpenses = expenses.filter(e =>
    ['Approved', 'Paid'].includes(e.status) &&
    e.created_at >= rangeStart &&
    (brandFilter === 'all' || e.brand_name === brandFilter)
  )

  const rows = useMemo(() => {
    if (groupBy === 'brand') {
      const map: Record<string, { revenue: number; expenses: number }> = {}
      for (const r of filteredRevenues) {
        if (!map[r.brand_name]) map[r.brand_name] = { revenue: 0, expenses: 0 }
        map[r.brand_name].revenue += Number(r.amount)
      }
      for (const e of filteredExpenses) {
        const bn = e.brand_name
        if (!map[bn]) map[bn] = { revenue: 0, expenses: 0 }
        map[bn].expenses += Number(e.amount)
      }
      return Object.entries(map)
        .map(([brand, { revenue, expenses }]) => ({
          label: brand,
          revenue,
          expenses,
          profit: revenue - expenses,
          margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : null,
        }))
        .sort((a, b) => b.profit - a.profit)
    } else {
      // Group by month
      const map: Record<string, { revenue: number; expenses: number }> = {}
      for (const r of filteredRevenues) {
        const mo = (r.issue_date ?? '').slice(0, 7)
        if (!map[mo]) map[mo] = { revenue: 0, expenses: 0 }
        map[mo].revenue += Number(r.amount)
      }
      for (const e of filteredExpenses) {
        const mo = e.created_at.slice(0, 7)
        if (!map[mo]) map[mo] = { revenue: 0, expenses: 0 }
        map[mo].expenses += Number(e.amount)
      }
      return Object.entries(map)
        .map(([month, { revenue, expenses }]) => ({
          label: month,
          revenue,
          expenses,
          profit: revenue - expenses,
          margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : null,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
  }, [filteredRevenues, filteredExpenses, groupBy])

  const totals = rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    expenses: acc.expenses + r.expenses,
    profit: acc.profit + r.profit,
  }), { revenue: 0, expenses: 0, profit: 0 })

  async function handleExcel() {
    const headers = [groupBy === 'brand' ? '品牌' : '月份', '收入 (AUD)', '支出 (AUD)', '利润 (AUD)', '毛利率']
    const sheetRows: SheetRow[] = rows.map(r => [r.label, r.revenue, r.expenses, r.profit, r.margin !== null ? `${r.margin.toFixed(1)}%` : '—'])
    sheetRows.push(['合计', totals.revenue, totals.expenses, totals.profit, totals.revenue > 0 ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%` : '—'])
    await exportToExcel([{ name: '损益表', headers, rows: sheetRows }], `PL_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = [groupBy === 'brand' ? '品牌' : '月份', '收入', '支出', '利润', '毛利率']
    const sheetRows: SheetRow[] = rows.map(r => [r.label, fmt(r.revenue), fmt(r.expenses), fmt(r.profit), fmtPct(r.margin)])
    await exportToPDF('项目损益表 (P&L)', headers, sheetRows, `PL_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setGroupBy('brand')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${groupBy === 'brand' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>按品牌</button>
          <button onClick={() => setGroupBy('month')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${groupBy === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>按月份</button>
        </div>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#38A169]/5 border border-[#38A169]/20 rounded-xl px-5 py-4">
          <p className="text-xs text-[#38A169] font-medium mb-1">总收入（已收款）</p>
          <p className="text-xl font-bold text-[#38A169]">{fmt(totals.revenue)}</p>
        </div>
        <div className="bg-[#E53E3E]/5 border border-[#E53E3E]/20 rounded-xl px-5 py-4">
          <p className="text-xs text-[#E53E3E] font-medium mb-1">总支出（已批准）</p>
          <p className="text-xl font-bold text-[#E53E3E]">{fmt(totals.expenses)}</p>
        </div>
        <div className={`rounded-xl px-5 py-4 border ${totals.profit >= 0 ? 'bg-[#2B6CB0]/5 border-[#2B6CB0]/20' : 'bg-[#E53E3E]/5 border-[#E53E3E]/20'}`}>
          <p className="text-xs font-medium mb-1" style={{ color: totals.profit >= 0 ? '#2B6CB0' : '#E53E3E' }}>净利润</p>
          <p className="text-xl font-bold" style={{ color: totals.profit >= 0 ? '#2B6CB0' : '#E53E3E' }}>
            {fmt(totals.profit)}
            {totals.revenue > 0 && <span className="text-sm font-normal ml-2 opacity-70">{fmtPct(totals.profit / totals.revenue * 100)}</span>}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{groupBy === 'brand' ? '品牌' : '月份'}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">收入</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">支出</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">利润</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">毛利率</th>
              <th className="px-4 py-3" style={{ width: '120px' }}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">暂无数据</td></tr>
            ) : rows.map(r => (
              <tr key={r.label} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.label}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#38A169]">{fmt(r.revenue)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#E53E3E]">{fmt(r.expenses)}</td>
                <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${r.profit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>{fmt(r.profit)}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">{fmtPct(r.margin)}</td>
                <td className="px-4 py-3">
                  {r.margin !== null && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, r.margin))}%`,
                          backgroundColor: r.margin >= 0 ? '#38A169' : '#E53E3E',
                        }}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-700 text-sm">合计</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-[#38A169]">{fmt(totals.revenue)}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-[#E53E3E]">{fmt(totals.expenses)}</td>
                <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${totals.profit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>{fmt(totals.profit)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{totals.revenue > 0 ? fmtPct(totals.profit / totals.revenue * 100) : '—'}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ── Aging Report ──────────────────────────────────────────────────────────

function AgingReport({ revenues }: { revenues: RawRevenue[] }) {
  const today = new Date()

  const agingRows = useMemo(() => {
    return revenues
      .filter(r => r.status === 'Unpaid' && r.issue_date)
      .map(r => {
        const days = Math.floor((today.getTime() - new Date(r.issue_date!).getTime()) / (1000 * 60 * 60 * 24))
        const bucket = days <= 30 ? '0–30天' : days <= 60 ? '31–60天' : days <= 90 ? '61–90天' : '90+天'
        const bucketOrder = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3
        return { ...r, days, bucket, bucketOrder }
      })
      .sort((a, b) => b.bucketOrder - a.bucketOrder || b.days - a.days)
  }, [revenues])

  const bucketTotals = useMemo(() => {
    const buckets: Record<string, number> = { '0–30天': 0, '31–60天': 0, '61–90天': 0, '90+天': 0 }
    for (const r of agingRows) buckets[r.bucket] = (buckets[r.bucket] ?? 0) + Number(r.amount)
    return buckets
  }, [agingRows])

  const totalUnpaid = agingRows.reduce((s, r) => s + Number(r.amount), 0)

  const BUCKET_COLORS: Record<string, string> = {
    '0–30天':  'text-[#38A169]',
    '31–60天': 'text-[#DD6B20]',
    '61–90天': 'text-[#E53E3E]',
    '90+天':   'text-[#E53E3E] font-bold',
  }
  const BUCKET_BG: Record<string, string> = {
    '0–30天':  'bg-[#38A169]/10 border-[#38A169]/20',
    '31–60天': 'bg-[#DD6B20]/10 border-[#DD6B20]/20',
    '61–90天': 'bg-[#E53E3E]/10 border-[#E53E3E]/20',
    '90+天':   'bg-[#E53E3E]/15 border-[#E53E3E]/25',
  }

  async function handleExcel() {
    const headers = ['品牌', '项目代码', '项目名称', '发票号', '描述', '金额 (AUD)', '开票日期', '逾期天数', '账期区间']
    const rows: SheetRow[] = agingRows.map(r => [
      r.brand_name, r.project_code ?? '—', r.project_name,
      r.invoice_number ?? '—', r.description,
      Number(r.amount), r.issue_date ?? '—', r.days, r.bucket,
    ])
    await exportToExcel([{ name: '应收账龄', headers, rows }], `Aging_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = ['品牌', '项目', '描述', '金额', '开票日期', '逾期天数', '账期']
    const rows: SheetRow[] = agingRows.map(r => [
      r.brand_name, r.project_code ?? r.project_name,
      r.description, fmt(Number(r.amount)), r.issue_date ?? '—', `${r.days}天`, r.bucket,
    ])
    await exportToPDF('应收账款账龄分析', headers, rows, `Aging_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {agingRows.length} 条未收款记录，合计 <span className="font-semibold text-[#E53E3E]">{fmt(totalUnpaid)}</span></p>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Bucket summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(bucketTotals).map(([bucket, total]) => (
          <div key={bucket} className={`rounded-xl border px-4 py-3 ${BUCKET_BG[bucket]}`}>
            <p className="text-xs font-medium text-gray-600 mb-1">{bucket}</p>
            <p className={`text-lg font-bold ${BUCKET_COLORS[bucket]}`}>{fmt(total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {agingRows.filter(r => r.bucket === bucket).length} 条
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">品牌</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">项目</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">描述</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">发票号</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">金额</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">开票日期</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">逾期天数</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">账期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agingRows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">暂无逾期未收款记录 ✓</td></tr>
            ) : agingRows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-xs text-gray-600">{r.brand_name}</td>
                <td className="px-4 py-3">
                  <Link href={`/projects/${r.project_id}`} className="text-xs font-mono text-[#2B6CB0] hover:underline">
                    {r.project_code ?? r.project_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">{r.description}</td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{r.invoice_number ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-gray-900">{fmt(Number(r.amount))}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">{r.issue_date}</td>
                <td className={`px-4 py-3 text-right text-xs font-semibold ${BUCKET_COLORS[r.bucket]}`}>{r.days}天</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${BUCKET_BG[r.bucket]}`}>
                    {r.bucket}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Margin Ranking ────────────────────────────────────────────────────────

function MarginReport({ revenues, expenses, projects }: {
  revenues: RawRevenue[]
  expenses: RawExpense[]
  projects: RawProject[]
}) {
  const rows = useMemo(() => {
    const revMap: Record<string, number> = {}
    const expMap: Record<string, number> = {}
    for (const r of revenues) {
      if (r.status === 'Paid') revMap[r.project_id] = (revMap[r.project_id] ?? 0) + Number(r.amount)
    }
    for (const e of expenses) {
      if (['Approved', 'Paid'].includes(e.status)) expMap[e.project_id] = (expMap[e.project_id] ?? 0) + Number(e.amount)
    }
    return projects
      .map(p => {
        const rev = revMap[p.id] ?? 0
        const exp = expMap[p.id] ?? 0
        const profit = rev - exp
        const margin = rev > 0 ? (profit / rev) * 100 : null
        return { ...p, revenue: rev, expenses_total: exp, profit, margin }
      })
      .filter(p => p.revenue > 0 || p.expenses_total > 0)
      .sort((a, b) => {
        if (a.margin === null) return 1
        if (b.margin === null) return -1
        return b.margin - a.margin
      })
      .map((p, i) => ({ ...p, rank: i + 1 }))
  }, [revenues, expenses, projects])

  async function handleExcel() {
    const headers = ['排名', '项目代码', '项目名称', '品牌', '状态', '收入 (AUD)', '支出 (AUD)', '利润 (AUD)', '毛利率']
    const sheetRows: SheetRow[] = rows.map(r => [
      r.rank, r.project_code ?? '—', r.name, r.brand_name, r.status,
      r.revenue, r.expenses_total, r.profit,
      r.margin !== null ? `${r.margin.toFixed(1)}%` : '—',
    ])
    await exportToExcel([{ name: '利润率排名', headers, rows: sheetRows }], `Margin_Ranking_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = ['排名', '项目代码', '项目名称', '品牌', '收入', '利润', '毛利率']
    const sheetRows: SheetRow[] = rows.map(r => [
      r.rank, r.project_code ?? '—', r.name, r.brand_name,
      fmt(r.revenue), fmt(r.profit), fmtPct(r.margin),
    ])
    await exportToPDF('项目利润率排名', headers, sheetRows, `Margin_Ranking_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {rows.length} 个有财务数据的项目</p>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs w-12">排名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">项目</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">品牌</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">状态</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">收入</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">支出</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">利润</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">毛利率</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">暂无数据</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    r.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    r.rank === 2 ? 'bg-gray-100 text-gray-600' :
                    r.rank === 3 ? 'bg-orange-100 text-orange-600' :
                    'text-gray-400 font-normal text-sm'
                  }`}>
                    {r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : r.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/projects/${r.id}`} className="font-medium text-gray-900 hover:text-[#2B6CB0] hover:underline text-sm">
                    {r.name}
                  </Link>
                  {r.project_code && <p className="text-xs font-mono text-gray-400">{r.project_code}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.brand_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.status}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#38A169]">{fmt(r.revenue)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#E53E3E]">{fmt(r.expenses_total)}</td>
                <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${r.profit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>{fmt(r.profit)}</td>
                <td className={`px-4 py-3 text-right text-xs font-semibold ${r.margin !== null && r.margin >= 0 ? 'text-[#38A169]' : 'text-[#E53E3E]'}`}>{fmtPct(r.margin)}</td>
                <td className="px-4 py-3">
                  {r.margin !== null && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, r.margin))}%`,
                          backgroundColor: r.margin >= 30 ? '#38A169' : r.margin >= 0 ? '#DD6B20' : '#E53E3E',
                        }}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Budget vs Actual ──────────────────────────────────────────────────────

function BudgetReport({ revenues, projects }: {
  revenues: RawRevenue[]
  projects: RawProject[]
}) {
  const [sortBy, setSortBy] = useState<'variance' | 'pct'>('variance')

  const rows = useMemo(() => {
    const revMap: Record<string, number> = {}
    for (const r of revenues) {
      if (r.status === 'Paid') revMap[r.project_id] = (revMap[r.project_id] ?? 0) + Number(r.amount)
    }
    return projects
      .filter(p => p.estimated_revenue != null && p.estimated_revenue > 0)
      .map(p => {
        const actual = revMap[p.id] ?? 0
        const estimated = p.estimated_revenue!
        const variance = actual - estimated
        const pct = (actual / estimated) * 100
        return { ...p, actual, estimated, variance, pct }
      })
      .sort((a, b) => sortBy === 'variance' ? b.variance - a.variance : b.pct - a.pct)
  }, [revenues, projects, sortBy])

  const totalEstimated = rows.reduce((s, r) => s + r.estimated, 0)
  const totalActual = rows.reduce((s, r) => s + r.actual, 0)
  const totalVariance = totalActual - totalEstimated
  const overallPct = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : null

  async function handleExcel() {
    const headers = ['项目代码', '项目名称', '品牌', '状态', '预计收入 (AUD)', '实际收入 (AUD)', '差异 (AUD)', '完成率']
    const sheetRows: SheetRow[] = rows.map(r => [
      r.project_code ?? '—', r.name, r.brand_name, r.status,
      r.estimated, r.actual, r.variance, `${r.pct.toFixed(1)}%`,
    ])
    sheetRows.push(['合计', '', '', '', totalEstimated, totalActual, totalVariance, overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'])
    await exportToExcel([{ name: '预算vs实际', headers, rows: sheetRows }], `Budget_vs_Actual_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = ['项目代码', '项目名称', '品牌', '预计收入', '实际收入', '差异', '完成率']
    const sheetRows: SheetRow[] = rows.map(r => [
      r.project_code ?? '—', r.name, r.brand_name,
      fmt(r.estimated), fmt(r.actual), fmt(r.variance), `${r.pct.toFixed(1)}%`,
    ])
    await exportToPDF('预算 vs 实际对比', headers, sheetRows, `Budget_vs_Actual_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">共 {rows.length} 个项目</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            排序：
            <button onClick={() => setSortBy('variance')} className={`px-2 py-0.5 rounded ${sortBy === 'variance' ? 'bg-[#2B6CB0]/10 text-[#2B6CB0]' : 'hover:bg-gray-100'}`}>差异金额</button>
            <button onClick={() => setSortBy('pct')} className={`px-2 py-0.5 rounded ${sortBy === 'pct' ? 'bg-[#2B6CB0]/10 text-[#2B6CB0]' : 'hover:bg-gray-100'}`}>完成率</button>
          </div>
        </div>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">预计总收入</p>
          <p className="text-lg font-bold text-gray-700">{fmt(totalEstimated)}</p>
        </div>
        <div className="bg-[#38A169]/5 border border-[#38A169]/20 rounded-xl px-4 py-3">
          <p className="text-xs text-[#38A169] mb-1">实际总收入</p>
          <p className="text-lg font-bold text-[#38A169]">{fmt(totalActual)}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 border ${totalVariance >= 0 ? 'bg-[#38A169]/5 border-[#38A169]/20' : 'bg-[#E53E3E]/5 border-[#E53E3E]/20'}`}>
          <p className="text-xs mb-1" style={{ color: totalVariance >= 0 ? '#38A169' : '#E53E3E' }}>总差异</p>
          <p className="text-lg font-bold" style={{ color: totalVariance >= 0 ? '#38A169' : '#E53E3E' }}>{totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}</p>
        </div>
        <div className="bg-[#2B6CB0]/5 border border-[#2B6CB0]/20 rounded-xl px-4 py-3">
          <p className="text-xs text-[#2B6CB0] mb-1">整体完成率</p>
          <p className="text-lg font-bold text-[#2B6CB0]">{overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">项目</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">品牌</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">状态</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">预计收入</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">实际收入</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">差异</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">完成率</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">暂无数据</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <Link href={`/projects/${r.id}`} className="font-medium text-gray-900 hover:text-[#2B6CB0] hover:underline text-sm">
                    {r.name}
                  </Link>
                  {r.project_code && <p className="text-xs font-mono text-gray-400">{r.project_code}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.brand_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.status}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">{fmt(r.estimated)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#38A169]">{r.actual > 0 ? fmt(r.actual) : <span className="text-gray-300">—</span>}</td>
                <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${r.variance >= 0 ? 'text-[#38A169]' : 'text-[#E53E3E]'}`}>
                  {r.variance >= 0 ? '+' : ''}{fmt(r.variance)}
                </td>
                <td className={`px-4 py-3 text-right text-xs font-semibold ${r.pct >= 100 ? 'text-[#38A169]' : r.pct >= 70 ? 'text-[#DD6B20]' : 'text-[#E53E3E]'}`}>
                  {r.pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, r.pct)}%`,
                        backgroundColor: r.pct >= 100 ? '#38A169' : r.pct >= 70 ? '#DD6B20' : '#E53E3E',
                      }}
                    />
                  </div>
                  {r.pct > 100 && (
                    <div className="w-full bg-[#38A169]/20 rounded-full h-1.5 mt-0.5">
                      <div className="h-1.5 rounded-full bg-[#38A169]/40" style={{ width: `${Math.min(100, r.pct - 100)}%` }} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-700 text-sm" colSpan={3}>合计</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-600">{fmt(totalEstimated)}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-[#38A169]">{fmt(totalActual)}</td>
                <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${totalVariance >= 0 ? 'text-[#38A169]' : 'text-[#E53E3E]'}`}>
                  {totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}
                </td>
                <td className={`px-4 py-3 text-right text-sm font-bold ${overallPct !== null && overallPct >= 100 ? 'text-[#38A169]' : 'text-[#DD6B20]'}`}>
                  {overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ── Main Client Component ─────────────────────────────────────────────────

export default function ReportsClient({ revenues, expenses, projects, brands }: Props) {
  const [activeTab, setActiveTab] = useState<'pl' | 'aging' | 'margin' | 'budget'>('pl')
  const [range, setRange] = useState('year')
  const [brandFilter, setBrandFilter] = useState('all')

  const RANGE_OPTS = [
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '本年' },
    { value: 'all', label: '全部' },
  ]

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
          <TabButton active={activeTab === 'pl'} onClick={() => setActiveTab('pl')}>损益表</TabButton>
          <TabButton active={activeTab === 'aging'} onClick={() => setActiveTab('aging')}>账龄分析</TabButton>
          <TabButton active={activeTab === 'margin'} onClick={() => setActiveTab('margin')}>利润率排名</TabButton>
          <TabButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')}>预算 vs 实际</TabButton>
        </div>

        {/* Filters (only for P&L and Budget tabs) */}
        {(activeTab === 'pl' || activeTab === 'budget') && (
          <div className="flex items-center gap-2">
            {activeTab === 'pl' && (
              <>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                  {RANGE_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRange(opt.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        range === opt.value ? 'bg-[#2B6CB0] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <select
                  value={brandFilter}
                  onChange={e => setBrandFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2B6CB0]/30"
                >
                  <option value="all">所有品牌</option>
                  {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'pl' && (
          <PLReport revenues={revenues} expenses={expenses} brands={brands} range={range} brandFilter={brandFilter} />
        )}
        {activeTab === 'aging' && (
          <AgingReport revenues={revenues} />
        )}
        {activeTab === 'margin' && (
          <MarginReport revenues={revenues} expenses={expenses} projects={projects} />
        )}
        {activeTab === 'budget' && (
          <BudgetReport revenues={revenues} projects={projects} />
        )}
      </div>
    </div>
  )
}
