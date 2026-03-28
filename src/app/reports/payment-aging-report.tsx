'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/context'
import { exportToExcel, exportToPDF } from './export-utils'
import type { RawExpense, SheetRow } from './report-helpers'
import { fmt, ExportBar } from './report-helpers'

type Bucket = 'current' | '1-30' | '31-60' | '61-90' | '90+' | 'no_due_date'

const BUCKET_ORDER: Record<Bucket, number> = {
  '90+': 0,
  '61-90': 1,
  '31-60': 2,
  '1-30': 3,
  'current': 4,
  'no_due_date': 5,
}

const BUCKET_COLORS: Record<Bucket, string> = {
  'current':     'text-[#16a34a]',
  '1-30':        'text-[#f59e0b]',
  '31-60':       'text-[#ea580c]',
  '61-90':       'text-[#dc2626]',
  '90+':         'text-[#991b1b] font-bold',
  'no_due_date': 'text-[#94a3b8]',
}

const BUCKET_BG: Record<Bucket, string> = {
  'current':     'bg-[#16a34a]/10 border-[#16a34a]/20',
  '1-30':        'bg-[#f59e0b]/10 border-[#f59e0b]/20',
  '31-60':       'bg-[#ea580c]/10 border-[#ea580c]/20',
  '61-90':       'bg-[#dc2626]/10 border-[#dc2626]/20',
  '90+':         'bg-[#991b1b]/15 border-[#991b1b]/25',
  'no_due_date': 'bg-[#94a3b8]/10 border-[#94a3b8]/20',
}

export default function PaymentAgingReport({ expenses }: { expenses: RawExpense[] }) {
  const { t } = useTranslation()
  const today = new Date()

  const BUCKET_LABELS: Record<Bucket, string> = {
    'current':     t('reports.paymentAgingCurrent'),
    '1-30':        t('reports.paymentAgingBucket130'),
    '31-60':       t('reports.paymentAgingBucket3160'),
    '61-90':       t('reports.paymentAgingBucket6190'),
    '90+':         t('reports.paymentAgingBucket90plus'),
    'no_due_date': t('reports.paymentAgingNoDueDate'),
  }

  const agingRows = useMemo(() => {
    return expenses
      .filter(e => e.status !== 'Paid' && e.status !== 'Rejected')
      .map(e => {
        if (!e.payment_due_date) {
          return { ...e, days: null, bucket: 'no_due_date' as Bucket, bucketOrder: BUCKET_ORDER['no_due_date'] }
        }
        const dueDate = new Date(e.payment_due_date)
        const days = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        let bucket: Bucket
        if (days <= 0) bucket = 'current'
        else if (days <= 30) bucket = '1-30'
        else if (days <= 60) bucket = '31-60'
        else if (days <= 90) bucket = '61-90'
        else bucket = '90+'
        return { ...e, days, bucket, bucketOrder: BUCKET_ORDER[bucket] }
      })
      .sort((a, b) => {
        if (a.bucketOrder !== b.bucketOrder) return a.bucketOrder - b.bucketOrder
        // Within same bucket, most overdue first (highest days first); nulls last
        const da = a.days ?? -Infinity
        const db = b.days ?? -Infinity
        return db - da
      })
  }, [expenses])

  const bucketTotals = useMemo(() => {
    const buckets: Record<Bucket, number> = {
      'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, 'no_due_date': 0,
    }
    for (const r of agingRows) buckets[r.bucket] = (buckets[r.bucket] ?? 0) + Number(r.amount)
    return buckets
  }, [agingRows])

  const totalOutstanding = agingRows.reduce((s, r) => s + Number(r.amount), 0)

  // Display buckets in a logical order for the summary cards
  const DISPLAY_BUCKETS: Bucket[] = ['current', '1-30', '31-60', '61-90', '90+', 'no_due_date']

  async function handleExcel() {
    const headers = [
      t('expenses.payee'), t('projects.brand'), `${t('common.amount')} (AUD)`,
      t('expenses.dueDate'), t('reports.daysOutstanding'), t('common.status'), t('reports.agingBucket'),
    ]
    const rows: SheetRow[] = agingRows.map(r => [
      r.payee ?? '—', r.brand_name, Number(r.amount),
      r.payment_due_date ?? '—', r.days ?? '—', r.status, BUCKET_LABELS[r.bucket] ?? r.bucket,
    ])
    await exportToExcel(
      [{ name: t('reports.paymentAgingReport'), headers, rows }],
      `Payment_Aging_${new Date().toISOString().slice(0, 10)}`,
    )
  }

  async function handlePdf() {
    const headers = [
      t('expenses.payee'), t('projects.brand'), t('common.amount'),
      t('expenses.dueDate'), t('reports.daysOutstanding'), t('common.status'), t('reports.agingBucket'),
    ]
    const rows: SheetRow[] = agingRows.map(r => [
      r.payee ?? '—', r.brand_name, fmt(Number(r.amount)),
      r.payment_due_date ?? '—', r.days !== null ? `${r.days}` : '—', r.status,
      BUCKET_LABELS[r.bucket] ?? r.bucket,
    ])
    await exportToPDF(
      t('reports.paymentAgingReport'), headers, rows,
      `Payment_Aging_${new Date().toISOString().slice(0, 10)}`,
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {t('reports.outstandingRecords').replace('{count}', String(agingRows.length))}{' '}
          <span className="font-semibold text-[#E53E3E]">{fmt(totalOutstanding)}</span>
        </p>
        <ExportBar onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {/* Bucket summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {DISPLAY_BUCKETS.map(bucket => (
          <div key={bucket} className={`rounded-xl border px-4 py-3 ${BUCKET_BG[bucket]}`}>
            <p className="text-xs font-medium text-gray-600 mb-1">{BUCKET_LABELS[bucket]}</p>
            <p className={`text-lg font-bold ${BUCKET_COLORS[bucket]}`}>{fmt(bucketTotals[bucket])}</p>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('expenses.payee')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('projects.brand')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('common.amount')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('expenses.dueDate')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.daysOutstanding')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">{t('common.status')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.agingBucket')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agingRows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">{t('reports.noOutstandingRecords')}</td></tr>
            ) : agingRows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-xs text-gray-700 font-medium">{r.payee ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{r.brand_name}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-gray-900">{fmt(Number(r.amount))}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">{r.payment_due_date ?? '—'}</td>
                <td className={`px-4 py-3 text-right text-xs font-semibold ${BUCKET_COLORS[r.bucket]}`}>
                  {r.days !== null ? r.days : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{r.status}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${BUCKET_BG[r.bucket]}`}>
                    {BUCKET_LABELS[r.bucket]}
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
