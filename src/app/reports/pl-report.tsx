'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/context'
import { exportToExcel, exportToPDF } from './export-utils'
import type { RawRevenue, RawExpense, RawBrand, SheetRow } from './report-helpers'
import { fmt, fmtPct, getRangeStart, ExportBar } from './report-helpers'

export default function PLReport({ revenues, expenses, brands, range, brandFilter }: {
  revenues: RawRevenue[]
  expenses: RawExpense[]
  brands: RawBrand[]
  range: string
  brandFilter: string
}) {
  const { t } = useTranslation()
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
    const headers = [groupBy === 'brand' ? t('reports.byBrand') : t('reports.byMonth'), `${t('reports.totalRevenue')} (AUD)`, `${t('reports.totalExpenses')} (AUD)`, `${t('reports.totalProfit')} (AUD)`, t('reports.grossMargin')]
    const sheetRows: SheetRow[] = rows.map(r => [r.label, r.revenue, r.expenses, r.profit, r.margin !== null ? `${r.margin.toFixed(1)}%` : '—'])
    sheetRows.push([t('reports.total'), totals.revenue, totals.expenses, totals.profit, totals.revenue > 0 ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}%` : '—'])
    await exportToExcel([{ name: t('reports.plReport'), headers, rows: sheetRows }], `PL_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = [groupBy === 'brand' ? t('reports.byBrand') : t('reports.byMonth'), t('reports.totalRevenue'), t('reports.totalExpenses'), t('reports.totalProfit'), t('reports.grossMargin')]
    const sheetRows: SheetRow[] = rows.map(r => [r.label, fmt(r.revenue), fmt(r.expenses), fmt(r.profit), fmtPct(r.margin)])
    await exportToPDF('P&L Report', headers, sheetRows, `PL_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setGroupBy('brand')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${groupBy === 'brand' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t('reports.byBrand')}</button>
          <button onClick={() => setGroupBy('month')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${groupBy === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>{t('reports.byMonth')}</button>
        </div>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#38A169]/5 border border-[#38A169]/20 rounded-xl px-5 py-4">
          <p className="text-xs text-[#38A169] font-medium mb-1">{t('reports.totalRevenueReceived')}</p>
          <p className="text-xl font-bold text-[#38A169]">{fmt(totals.revenue)}</p>
        </div>
        <div className="bg-[#E53E3E]/5 border border-[#E53E3E]/20 rounded-xl px-5 py-4">
          <p className="text-xs text-[#E53E3E] font-medium mb-1">{t('reports.totalExpensesApproved')}</p>
          <p className="text-xl font-bold text-[#E53E3E]">{fmt(totals.expenses)}</p>
        </div>
        <div className={`rounded-xl px-5 py-4 border ${totals.profit >= 0 ? 'bg-[#2B6CB0]/5 border-[#2B6CB0]/20' : 'bg-[#E53E3E]/5 border-[#E53E3E]/20'}`}>
          <p className="text-xs font-medium mb-1" style={{ color: totals.profit >= 0 ? '#2B6CB0' : '#E53E3E' }}>{t('reports.netProfit')}</p>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{groupBy === 'brand' ? t('reports.byBrand') : t('reports.byMonth')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalRevenue')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalExpenses')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalProfit')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.grossMargin')}</th>
              <th className="px-4 py-3" style={{ width: '120px' }}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">{t('reports.noDataYet')}</td></tr>
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
                <td className="px-4 py-3 font-semibold text-gray-700 text-sm">{t('reports.total')}</td>
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
