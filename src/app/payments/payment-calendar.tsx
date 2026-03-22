'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/context'
import type { PaymentGroup } from '@/lib/payments'
import BatchActions from './batch-actions'
import { CheckSquare, Square, ChevronLeft, ChevronRight, Download, Mail } from 'lucide-react'

interface Props {
  groups: PaymentGroup[]
  brands: { id: string; name: string }[]
  locale: string
  error: string | null
  currentFilters: { brandId?: string; status?: string; month?: string }
}

const STATUS_COLORS: Record<string, string> = {
  Approved: 'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  'Pending Approval': 'bg-[#DD6B20]/10 text-[#DD6B20] border-[#DD6B20]/25',
  'Pending Super Approval': 'bg-purple-50 text-purple-700 border-purple-200',
  Paid: 'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
  Rejected: 'bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/25',
}

function getGroupUrgency(dueDate: string): 'overdue' | 'today' | 'upcoming' | 'paid' {
  const today = new Date().toISOString().slice(0, 10)
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  return 'upcoming'
}

const URGENCY_DOT: Record<string, string> = {
  overdue: 'bg-[#E53E3E]',
  today: 'bg-[#DD6B20]',
  upcoming: 'bg-[#2B6CB0]',
  paid: 'bg-[#38A169]',
}

export default function PaymentCalendar({ groups, brands, locale, error, currentFilters }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedPaid, setCollapsedPaid] = useState<Set<string>>(new Set(
    groups.filter(g => g.paid_count === g.expense_count).map(g => g.payment_due_date)
  ))

  // Current month for navigation
  const now = new Date()
  const currentMonth = currentFilters.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = currentMonth.split('-').map(Number)

  const navigateMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const params = new URLSearchParams()
    params.set('month', newMonth)
    if (currentFilters.brandId) params.set('brand', currentFilters.brandId)
    if (currentFilters.status) params.set('status', currentFilters.status)
    startTransition(() => router.push(`/payments?${params.toString()}`))
  }

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams()
    if (key === 'brand' && value) params.set('brand', value)
    else if (currentFilters.brandId) params.set('brand', currentFilters.brandId)
    if (key === 'status' && value) params.set('status', value)
    else if (currentFilters.status) params.set('status', currentFilters.status)
    if (currentFilters.month) params.set('month', currentFilters.month)
    startTransition(() => router.push(`/payments?${params.toString()}`))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGroup = (group: PaymentGroup) => {
    const approvedIds = group.expenses.filter(e => e.status === 'Approved').map(e => e.id)
    const allSelected = approvedIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      approvedIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  // Summary stats
  const totalDue = groups.reduce((s, g) => s + g.approved_amount, 0)
  const totalOverdue = groups
    .filter(g => getGroupUrgency(g.payment_due_date) === 'overdue')
    .reduce((s, g) => s + g.approved_amount, 0)
  const dueSoonDays = 7
  const dueSoonDate = new Date(Date.now() + dueSoonDays * 86400000).toISOString().slice(0, 10)
  const totalDueSoon = groups
    .filter(g => g.payment_due_date <= dueSoonDate && g.payment_due_date >= new Date().toISOString().slice(0, 10))
    .reduce((s, g) => s + g.approved_amount, 0)
  const totalPaid = groups.reduce((s, g) => s + g.paid_amount, 0)

  const fmtAmount = (n: number) => `A$${n.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU', { minimumFractionDigits: 0 })}`
  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', { year: 'numeric', month: 'short', day: 'numeric' })

  const monthLabel = new Date(year, month - 1).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', { year: 'numeric', month: 'long' })

  // Sort groups by urgency
  const urgencyOrder = { overdue: 0, today: 1, upcoming: 2, paid: 3 }
  const sortedGroups = [...groups].sort((a, b) => {
    const ua = getGroupUrgency(a.payment_due_date)
    const ub = getGroupUrgency(b.payment_due_date)
    if (ua === ub) return a.payment_due_date.localeCompare(b.payment_due_date)
    return urgencyOrder[ua] - urgencyOrder[ub]
  })

  const selectedExpenses = groups.flatMap(g => g.expenses).filter(e => selectedIds.has(e.id))
  const selectedTotal = selectedExpenses.reduce((s, e) => s + e.amount, 0)

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-[#E53E3E] mb-4">{t('payments.failedToLoad')}</p>
        <button onClick={() => router.refresh()} className="px-4 py-2 bg-[var(--brand-mid)] text-white rounded-lg text-sm">
          {t('payments.retry')}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('payments.totalDue'), value: fmtAmount(totalDue), color: 'var(--brand-mid)' },
          { label: t('payments.dueSoon'), value: fmtAmount(totalDueSoon), color: 'var(--color-warning)' },
          { label: t('payments.overdue'), value: fmtAmount(totalOverdue), color: 'var(--color-danger)' },
          { label: t('payments.paidThisMonth'), value: fmtAmount(totalPaid), color: 'var(--color-success)' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[var(--color-border)] rounded-[10px] p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[10px]" style={{ background: card.color }} />
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{card.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: card.color, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Month navigator + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={currentFilters.brandId || ''}
            onChange={e => updateFilter('brand', e.target.value)}
            className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">{t('projects.allBrands')}</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select
            value={currentFilters.status || ''}
            onChange={e => updateFilter('status', e.target.value)}
            className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">{t('common.all')}</option>
            <option value="pending">{t('status.pendingApproval')}</option>
            <option value="paid">{t('status.paid')}</option>
          </select>

          <a
            href={`/api/export-payments?month=${currentMonth}${currentFilters.brandId ? `&brand=${currentFilters.brandId}` : ''}`}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <Download size={14} />
            {t('common.exportCSV')}
          </a>
        </div>
      </div>

      {/* Empty state */}
      {sortedGroups.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-3">{currentFilters.brandId || currentFilters.status
            ? t('payments.noMatchingPayments')
            : t('payments.noPayments')
          }</p>
          {(currentFilters.brandId || currentFilters.status) && (
            <button onClick={() => router.push('/payments')} className="text-sm text-[var(--brand-mid)] hover:underline">
              {t('common.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Date groups */}
      {sortedGroups.map(group => {
        const urgency = getGroupUrgency(group.payment_due_date)
        const isAllPaid = group.paid_count === group.expense_count
        const isPaidCollapsed = collapsedPaid.has(group.payment_due_date)
        const approvedIds = group.expenses.filter(e => e.status === 'Approved').map(e => e.id)
        const allGroupSelected = approvedIds.length > 0 && approvedIds.every(id => selectedIds.has(id))

        return (
          <div key={group.payment_due_date} className="mb-4">
            {/* Group header */}
            <div className="flex items-center justify-between bg-white border border-[var(--color-border)] rounded-t-[10px] px-4 py-3">
              <div className="flex items-center gap-3">
                {approvedIds.length > 0 && (
                  <button onClick={() => toggleGroup(group)} className="text-gray-400 hover:text-gray-600">
                    {allGroupSelected ? <CheckSquare size={18} className="text-[var(--brand-mid)]" /> : <Square size={18} />}
                  </button>
                )}
                <div className={`w-2.5 h-2.5 rounded-full ${URGENCY_DOT[isAllPaid ? 'paid' : urgency]}`} />
                <span className="font-medium text-sm">{fmtDate(group.payment_due_date)}</span>
                <span className="text-xs text-gray-400">
                  {group.expense_count} {t('payments.selected').replace('selected', 'payments')} · {fmtAmount(group.total_amount)}
                  {group.approved_count > 0 && ` · ${group.approved_count} ${t('common.approved').toLowerCase()}`}
                  {group.pending_count > 0 && ` · ${group.pending_count} pending`}
                </span>
              </div>
              {isAllPaid && (
                <button
                  onClick={() => setCollapsedPaid(prev => {
                    const next = new Set(prev)
                    next.has(group.payment_due_date) ? next.delete(group.payment_due_date) : next.add(group.payment_due_date)
                    return next
                  })}
                  className="text-xs text-[#38A169] font-medium flex items-center gap-1"
                >
                  ✓ {t('payments.cycleComplete')} — {fmtAmount(group.paid_amount)}
                </button>
              )}
            </div>

            {/* Expense rows */}
            {!(isAllPaid && isPaidCollapsed) && (
              <div className="border border-t-0 border-[var(--color-border)] rounded-b-[10px] overflow-hidden divide-y divide-[var(--color-border)]">
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="w-10 px-3 py-2" />
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">{t('expenses.payee')}</th>
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">{t('expenses.purpose')}</th>
                        <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">{t('projects.brand')}</th>
                        <th className="text-right px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">{t('common.amount')}</th>
                        <th className="text-center px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.expenses.map(expense => {
                        const isSelectable = expense.status === 'Approved'
                        const isSelected = selectedIds.has(expense.id)
                        const isPaid = expense.status === 'Paid'

                        return (
                          <tr
                            key={expense.id}
                            className={`hover:bg-blue-50/30 transition-colors ${isPaid ? 'opacity-60' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
                          >
                            <td className="px-3 py-3">
                              {isSelectable ? (
                                <button onClick={() => toggleSelect(expense.id)} className="text-gray-400 hover:text-gray-600">
                                  {isSelected ? <CheckSquare size={16} className="text-[var(--brand-mid)]" /> : <Square size={16} />}
                                </button>
                              ) : isPaid ? (
                                <span className="text-[#38A169]">✓</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 font-medium">{expense.payee}</td>
                            <td className="px-3 py-3 text-gray-500 truncate max-w-[200px]">{expense.description}</td>
                            <td className="px-3 py-3 text-gray-500">{expense.brand_name || '—'}</td>
                            <td className="px-3 py-3 text-right font-medium tabular-nums">{fmtAmount(expense.amount)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[expense.status] || ''}`}>
                                {t(`status.${expense.status === 'Pending Approval' ? 'pendingApproval' : expense.status === 'Pending Super Approval' ? 'pendingSuperApproval' : expense.status.toLowerCase()}`)}
                              </span>
                              {expense.last_email_sent_at && (
                                <div className="flex items-center justify-center gap-0.5 mt-1 text-[10px] text-gray-400" title={t('paymentEmail.alreadySent').replace('{date}', new Date(expense.last_email_sent_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', { month: 'short', day: 'numeric' }))}>
                                  <Mail size={10} />
                                  <span>{new Date(expense.last_email_sent_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', { month: 'short', day: 'numeric' })}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[var(--color-border)]">
                  {group.expenses.map(expense => {
                    const isSelectable = expense.status === 'Approved'
                    const isSelected = selectedIds.has(expense.id)
                    const isPaid = expense.status === 'Paid'

                    return (
                      <div key={expense.id} className={`p-4 ${isPaid ? 'opacity-60' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {isSelectable ? (
                              <button onClick={() => toggleSelect(expense.id)} className="mt-0.5 text-gray-400">
                                {isSelected ? <CheckSquare size={18} className="text-[var(--brand-mid)]" /> : <Square size={18} />}
                              </button>
                            ) : isPaid ? (
                              <span className="mt-0.5 text-[#38A169]">✓</span>
                            ) : <div className="w-[18px]" />}
                            <div>
                              <div className="font-medium text-sm">{expense.payee}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{expense.brand_name} · {expense.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm tabular-nums">{fmtAmount(expense.amount)}</div>
                            <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[expense.status] || ''}`}>
                              {t(`status.${expense.status === 'Pending Approval' ? 'pendingApproval' : expense.status.toLowerCase()}`)}
                            </span>
                            {expense.last_email_sent_at && (
                              <div className="flex items-center gap-0.5 mt-1 text-[10px] text-gray-400">
                                <Mail size={9} />
                                <span>{new Date(expense.last_email_sent_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Sticky batch action bar */}
      {selectedIds.size > 0 && (
        <BatchActions
          selectedCount={selectedIds.size}
          selectedTotal={selectedTotal}
          selectedIds={Array.from(selectedIds)}
          locale={locale}
          onComplete={() => {
            setSelectedIds(new Set())
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
