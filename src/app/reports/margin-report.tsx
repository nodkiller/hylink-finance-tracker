'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/i18n/context'
import { exportToExcel, exportToPDF } from './export-utils'
import Link from 'next/link'
import type { RawRevenue, RawExpense, RawProject, SheetRow } from './report-helpers'
import { fmt, fmtPct, ExportBar } from './report-helpers'

export default function MarginReport({ revenues, expenses, projects }: {
  revenues: RawRevenue[]
  expenses: RawExpense[]
  projects: RawProject[]
}) {
  const { t } = useTranslation()
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
    const headers = [t('reports.rank'), t('projects.projectCode'), t('projects.projectName'), t('projects.brand'), t('common.status'), `${t('reports.totalRevenue')} (AUD)`, `${t('reports.totalExpenses')} (AUD)`, `${t('reports.totalProfit')} (AUD)`, t('reports.grossMargin')]
    const sheetRows: SheetRow[] = rows.map(r => [
      r.rank, r.project_code ?? '—', r.name, r.brand_name, r.status,
      r.revenue, r.expenses_total, r.profit,
      r.margin !== null ? `${r.margin.toFixed(1)}%` : '—',
    ])
    await exportToExcel([{ name: t('reports.marginRanking'), headers, rows: sheetRows }], `Margin_Ranking_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = [t('reports.rank'), t('projects.projectCode'), t('projects.projectName'), t('projects.brand'), t('reports.totalRevenue'), t('reports.totalProfit'), t('reports.grossMargin')]
    const sheetRows: SheetRow[] = rows.map(r => [
      r.rank, r.project_code ?? '—', r.name, r.brand_name,
      fmt(r.revenue), fmt(r.profit), fmtPct(r.margin),
    ])
    await exportToPDF(t('reports.marginRanking'), headers, sheetRows, `Margin_Ranking_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('reports.projectsWithData').replace('{count}', String(rows.length))}</p>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs w-12">{t('reports.rank')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.projectName')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.brand')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.status')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalRevenue')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalExpenses')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalProfit')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.grossMargin')}</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">{t('reports.noDataYet')}</td></tr>
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
