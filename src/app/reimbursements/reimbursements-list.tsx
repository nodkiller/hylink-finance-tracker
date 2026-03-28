'use client'

import { useState } from 'react'
import { useTranslation } from '@/i18n/context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import EmptyState from '@/components/empty-state'
import NewReimbursementDialog from './new-reimbursement-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReceiptIcon, Mail, FileText } from 'lucide-react'
import Link from 'next/link'

export interface ReimbursementItem {
  id: string
  reimbursement_no: string
  title: string
  category: string
  project_id: string | null
  amount: number
  expense_date: string
  description: string | null
  receipt_urls: string[]
  bank_bsb: string
  bank_account: string
  bank_account_name: string
  status: string
  submitted_by: string
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  approval_comment: string | null
  paid_at: string | null
  paid_by: string | null
  created_at: string
  submitter_name: string
  approver_name: string | null
  paid_by_name: string | null
  project_name: string | null
}

interface Props {
  reimbursements: ReimbursementItem[]
  isApprover: boolean
  locale: string
  projects: { id: string; name: string; project_code: string | null }[]
  userBankDetails: { bsb: string; account: string; accountName: string }
}

const STATUS_STYLES: Record<string, string> = {
  draft:                'bg-gray-100 text-gray-500 border-gray-200',
  pending:              'bg-[#DD6B20]/10 text-[#DD6B20] border-[#DD6B20]/25',
  needs_info:           'bg-purple-50 text-purple-700 border-purple-200',
  controller_approved:  'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/25',
  approved:             'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  paid:                 'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
  rejected:             'bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/25',
}

const CATEGORY_KEYS: Record<string, string> = {
  travel: 'reimbursement.categoryTravel',
  transport: 'reimbursement.categoryTransport',
  dining: 'reimbursement.categoryDining',
  office: 'reimbursement.categoryOffice',
  other: 'reimbursement.categoryOther',
}

type TabKey = 'all' | 'pending' | 'approved' | 'paid' | 'rejected'

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

export default function ReimbursementsList({
  reimbursements,
  isApprover,
  locale,
  projects,
  userBankDetails,
}: Props) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('reimbursement.draft')
      case 'pending': return t('reimbursement.pending')
      case 'needs_info': return t('reimbursement.needsInfo')
      case 'controller_approved': return locale === 'zh' ? '已审核待终审' : 'Controller Approved'
      case 'approved': return t('reimbursement.approvedAwaitingPayment')
      case 'paid': return t('reimbursement.reimbursed')
      case 'rejected': return t('reimbursement.rejected')
      default: return status
    }
  }

  function fmtDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  // Filter by tab
  const tabFiltered = reimbursements.filter(r => {
    switch (activeTab) {
      case 'pending': return r.status === 'pending' || r.status === 'needs_info' || r.status === 'draft' || r.status === 'controller_approved'
      case 'approved': return r.status === 'approved'
      case 'paid': return r.status === 'paid'
      case 'rejected': return r.status === 'rejected'
      default: return true
    }
  })

  // Filter by category and month
  const filtered = tabFiltered.filter(r => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
    if (monthFilter !== 'all') {
      const expMonth = r.expense_date?.slice(0, 7)
      if (expMonth !== monthFilter) return false
    }
    return true
  })

  // Get unique months from reimbursements for filter dropdown
  const availableMonths = [...new Set(
    reimbursements
      .map(r => r.expense_date?.slice(0, 7))
      .filter((m): m is string => !!m)
  )].sort().reverse()

  // Tab counts
  const counts = {
    all: reimbursements.length,
    pending: reimbursements.filter(r => ['pending', 'needs_info', 'draft'].includes(r.status)).length,
    approved: reimbursements.filter(r => r.status === 'approved').length,
    paid: reimbursements.filter(r => r.status === 'paid').length,
    rejected: reimbursements.filter(r => r.status === 'rejected').length,
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('reimbursement.all') },
    { key: 'pending', label: t('reimbursement.pending') },
    { key: 'approved', label: t('reimbursement.approvedAwaitingPayment') },
    { key: 'paid', label: t('reimbursement.reimbursed') },
    { key: 'rejected', label: t('reimbursement.rejected') },
  ]

  // Approved items for batch email
  const approvedItems = filtered.filter(r => r.status === 'approved')
  const selectedTotal = approvedItems
    .filter(r => selectedIds.has(r.id))
    .reduce((s, r) => s + Number(r.amount), 0)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === approvedItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(approvedItems.map(r => r.id)))
    }
  }

  return (
    <>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={v => v && setCategoryFilter(v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {Object.entries(CATEGORY_KEYS).map(([val, key]) => (
                <SelectItem key={val} value={val}>{t(key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month filter */}
          <Select value={monthFilter} onValueChange={v => v && setMonthFilter(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder={locale === 'zh' ? '选择月份' : 'Month'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === 'zh' ? '所有月份' : 'All Months'}</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 text-xs px-3">
          {t('reimbursement.newReimbursement')}
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()) }}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#3182CE] text-[#3182CE]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-[#3182CE]/10' : 'bg-gray-100'
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Batch action bar for approved tab */}
      {activeTab === 'approved' && isApprover && approvedItems.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-blue-50/60 rounded-lg border border-blue-100">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === approvedItems.length && approvedItems.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            {t('payments.selectAll')}
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-gray-500">
                {t('reimbursement.selectedItems')
                  .replace('{count}', String(selectedIds.size))
                  .replace('{amount}', selectedTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 }))}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs ml-auto gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {t('reimbursement.sendEmail')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon className="w-8 h-8" />}
            title={reimbursements.length === 0 ? t('reimbursement.noReimbursements') : t('reimbursement.noMatchingReimbursements')}
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(r => (
                <Link key={r.id} href={`/reimbursements/${r.id}`} className="block">
                  <div className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-mono">{r.reimbursement_no}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.submitter_name}</p>
                      </div>
                      <p className="text-sm font-mono font-semibold text-gray-800 shrink-0">{fmt(r.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status] ?? ''}`}>
                        {statusLabel(r.status)}
                      </span>
                      <span className="text-xs text-gray-400">{t(CATEGORY_KEYS[r.category] ?? 'reimbursement.categoryOther')}</span>
                      <span className="text-xs text-gray-400 ml-auto">{fmtDate(r.expense_date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="border-b border-gray-100" style={{ backgroundColor: '#F7FAFC' }}>
                <tr>
                  {activeTab === 'approved' && isApprover && <th className="w-10 px-3 py-3" />}
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-32">{t('reimbursement.reimbursementNo')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">{t('reimbursement.applicant')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">{t('reimbursement.category')}</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#4A5568] w-28">{t('common.amount')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-32">{t('common.status')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">{t('common.date')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-20">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`animate-fade-in-up transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white hover:bg-[#EBF8FF]/50'
                        : 'bg-[#F7FAFC]/60 hover:bg-[#EBF8FF]/50'
                    }`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {activeTab === 'approved' && isApprover && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      <Link href={`/reimbursements/${r.id}`} className="text-[#2B6CB0] hover:underline">
                        {r.reimbursement_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{r.submitter_name}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">{r.title}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {t(CATEGORY_KEYS[r.category] ?? 'reimbursement.categoryOther')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-medium">{fmt(r.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status] ?? ''}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.expense_date)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/reimbursements/${r.id}`}
                        className="text-xs text-[#2B6CB0] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <NewReimbursementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        userBankDetails={userBankDetails}
      />
    </>
  )
}
