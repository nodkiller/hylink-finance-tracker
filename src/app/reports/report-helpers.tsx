'use client'

import { useTranslation } from '@/i18n/context'
import type { SheetRow } from './export-utils'

// ── Shared Types ─────────────────────────────────────────────────────────

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
  payment_due_date?: string | null
  payee?: string
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

export type { SheetRow }

// ── Shared Helpers ───────────────────────────────────────────────────────

export function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

export function fmtPct(n: number | null) {
  if (n === null || !isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

export function getRangeStart(range: string): string {
  const now = new Date()
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  if (range === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10)
  if (range === 'year') return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  return '2000-01-01' // all
}

// ── Shared UI Components ─────────────────────────────────────────────────

export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

export function ExportBar({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void }) {
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
