'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/context'
import { exportToExcel, exportToPDF } from './export-utils'
import Link from 'next/link'
import type { RawRevenue, RawProject, SheetRow } from './report-helpers'
import { fmt, ExportBar } from './report-helpers'

export default function BudgetReport({ revenues, projects }: {
  revenues: RawRevenue[]
  projects: RawProject[]
}) {
  const { t } = useTranslation()
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
    const headers = [t('projects.projectCode'), t('projects.projectName'), t('projects.brand'), t('common.status'), `${t('reports.estimatedRevenue')} (AUD)`, `${t('reports.actualRevenue')} (AUD)`, `${t('reports.variance')} (AUD)`, t('reports.completionRate')]
    const sheetRows: SheetRow[] = rows.map(r => [
      r.project_code ?? '—', r.name, r.brand_name, r.status,
      r.estimated, r.actual, r.variance, `${r.pct.toFixed(1)}%`,
    ])
    sheetRows.push([t('reports.total'), '', '', '', totalEstimated, totalActual, totalVariance, overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'])
    await exportToExcel([{ name: t('reports.budgetVsActual'), headers, rows: sheetRows }], `Budget_vs_Actual_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = [t('projects.projectCode'), t('projects.projectName'), t('projects.brand'), t('reports.estimatedRevenue'), t('reports.actualRevenue'), t('reports.variance'), t('reports.completionRate')]
    const sheetRows: SheetRow[] = rows.map(r => [
      r.project_code ?? '—', r.name, r.brand_name,
      fmt(r.estimated), fmt(r.actual), fmt(r.variance), `${r.pct.toFixed(1)}%`,
    ])
    await exportToPDF(t('reports.budgetVsActual'), headers, sheetRows, `Budget_vs_Actual_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{t('reports.projectCount').replace('{count}', String(rows.length))}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {t('reports.sortBy')}
            <button onClick={() => setSortBy('variance')} className={`px-2 py-0.5 rounded ${sortBy === 'variance' ? 'bg-[#2B6CB0]/10 text-[#2B6CB0]' : 'hover:bg-gray-100'}`}>{t('reports.varianceAmount')}</button>
            <button onClick={() => setSortBy('pct')} className={`px-2 py-0.5 rounded ${sortBy === 'pct' ? 'bg-[#2B6CB0]/10 text-[#2B6CB0]' : 'hover:bg-gray-100'}`}>{t('reports.completionRate')}</button>
          </div>
        </div>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">{t('reports.estimatedTotalRevenue')}</p>
          <p className="text-lg font-bold text-gray-700">{fmt(totalEstimated)}</p>
        </div>
        <div className="bg-[#38A169]/5 border border-[#38A169]/20 rounded-xl px-4 py-3">
          <p className="text-xs text-[#38A169] mb-1">{t('reports.actualTotalRevenue')}</p>
          <p className="text-lg font-bold text-[#38A169]">{fmt(totalActual)}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 border ${totalVariance >= 0 ? 'bg-[#38A169]/5 border-[#38A169]/20' : 'bg-[#E53E3E]/5 border-[#E53E3E]/20'}`}>
          <p className="text-xs mb-1" style={{ color: totalVariance >= 0 ? '#38A169' : '#E53E3E' }}>{t('reports.totalVariance')}</p>
          <p className="text-lg font-bold" style={{ color: totalVariance >= 0 ? '#38A169' : '#E53E3E' }}>{totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}</p>
        </div>
        <div className="bg-[#2B6CB0]/5 border border-[#2B6CB0]/20 rounded-xl px-4 py-3">
          <p className="text-xs text-[#2B6CB0] mb-1">{t('reports.overallCompletionRate')}</p>
          <p className="text-lg font-bold text-[#2B6CB0]">{overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.projectName')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.brand')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.status')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.estimatedRevenue')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.actualRevenue')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.variance')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.completionRate')}</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">{t('reports.noDataYet')}</td></tr>
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
                <td className="px-4 py-3 font-semibold text-gray-700 text-sm" colSpan={3}>{t('reports.total')}</td>
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
