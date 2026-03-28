'use client'

import { useMemo } from 'react'
import { useTranslation } from '@/i18n/context'
import { exportToExcel, exportToPDF } from './export-utils'
import Link from 'next/link'
import type { RawRevenue, SheetRow } from './report-helpers'
import { fmt, ExportBar } from './report-helpers'

export default function AgingReport({ revenues }: { revenues: RawRevenue[] }) {
  const { t } = useTranslation()
  const today = new Date()

  const agingRows = useMemo(() => {
    return revenues
      .filter(r => r.status === 'Unpaid' && r.issue_date)
      .map(r => {
        const days = Math.floor((today.getTime() - new Date(r.issue_date!).getTime()) / (1000 * 60 * 60 * 24))
        const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'
        const bucketOrder = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3
        return { ...r, days, bucket, bucketOrder }
      })
      .sort((a, b) => b.bucketOrder - a.bucketOrder || b.days - a.days)
  }, [revenues])

  const bucketTotals = useMemo(() => {
    const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    for (const r of agingRows) buckets[r.bucket] = (buckets[r.bucket] ?? 0) + Number(r.amount)
    return buckets
  }, [agingRows])

  const totalUnpaid = agingRows.reduce((s, r) => s + Number(r.amount), 0)

  const BUCKET_LABELS: Record<string, string> = {
    '0-30': t('reports.agingBucket030'),
    '31-60': t('reports.agingBucket3160'),
    '61-90': t('reports.agingBucket6190'),
    '90+': t('reports.agingBucket90plus'),
  }
  const BUCKET_COLORS: Record<string, string> = {
    '0-30':  'text-[#38A169]',
    '31-60': 'text-[#DD6B20]',
    '61-90': 'text-[#E53E3E]',
    '90+':   'text-[#E53E3E] font-bold',
  }
  const BUCKET_BG: Record<string, string> = {
    '0-30':  'bg-[#38A169]/10 border-[#38A169]/20',
    '31-60': 'bg-[#DD6B20]/10 border-[#DD6B20]/20',
    '61-90': 'bg-[#E53E3E]/10 border-[#E53E3E]/20',
    '90+':   'bg-[#E53E3E]/15 border-[#E53E3E]/25',
  }

  async function handleExcel() {
    const headers = [t('projects.brand'), t('projects.projectCode'), t('projects.projectName'), t('revenue.invoiceNumber'), t('common.description'), `${t('common.amount')} (AUD)`, t('revenue.issueDate'), t('reports.overdueDays'), t('reports.agingBucket')]
    const rows: SheetRow[] = agingRows.map(r => [
      r.brand_name, r.project_code ?? '—', r.project_name,
      r.invoice_number ?? '—', r.description,
      Number(r.amount), r.issue_date ?? '—', r.days, BUCKET_LABELS[r.bucket] ?? r.bucket,
    ])
    await exportToExcel([{ name: t('reports.agingReport'), headers, rows }], `Aging_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  async function handlePdf() {
    const headers = [t('projects.brand'), t('projects.projectName'), t('common.description'), t('common.amount'), t('revenue.issueDate'), t('reports.overdueDays'), t('reports.agingBucket')]
    const rows: SheetRow[] = agingRows.map(r => [
      r.brand_name, r.project_code ?? r.project_name,
      r.description, fmt(Number(r.amount)), r.issue_date ?? '—', `${r.days}`, BUCKET_LABELS[r.bucket] ?? r.bucket,
    ])
    await exportToPDF(t('reports.agingReport'), headers, rows, `Aging_Report_${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('reports.unpaidRecords').replace('{count}', String(agingRows.length))} <span className="font-semibold text-[#E53E3E]">{fmt(totalUnpaid)}</span></p>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Bucket summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(bucketTotals).map(([bucket, total]) => (
          <div key={bucket} className={`rounded-xl border px-4 py-3 ${BUCKET_BG[bucket]}`}>
            <p className="text-xs font-medium text-gray-600 mb-1">{BUCKET_LABELS[bucket] ?? bucket}</p>
            <p className={`text-lg font-bold ${BUCKET_COLORS[bucket]}`}>{fmt(total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {agingRows.filter(r => r.bucket === bucket).length} {t('reports.items')}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.brand')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.projectName')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.description')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('revenue.invoiceNumber')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('common.amount')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('revenue.issueDate')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.overdueDays')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.agingBucket')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agingRows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">{t('reports.noOverdueRecords')} ✓</td></tr>
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
                <td className={`px-4 py-3 text-right text-xs font-semibold ${BUCKET_COLORS[r.bucket]}`}>{r.days}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${BUCKET_BG[r.bucket]}`}>
                    {BUCKET_LABELS[r.bucket] ?? r.bucket}
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
