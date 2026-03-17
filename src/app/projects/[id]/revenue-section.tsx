'use client'

import { useActionState, useState } from 'react'
import EmptyState from '@/components/empty-state'
import { TrendingUpIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import { addRevenue, markRevenuePaid } from '@/app/actions/revenues'
import EditRevenueDialog from './edit-revenue-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface RevenueRecord {
  id: string
  description: string | null
  invoice_number: string | null
  amount: number
  status: string
  issue_date: string
  received_date: string | null
}

interface Props {
  projectId: string
  revenues: RevenueRecord[]
  canEdit?: boolean
  isSuperAdmin?: boolean
}

type State = { error: string } | { success: boolean } | undefined

const STATUS_STYLES: Record<string, string> = {
  Paid:    'bg-green-100 text-green-700 border-green-200',
  Unpaid:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  Overdue: 'bg-red-100 text-red-600 border-red-200',
}

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** Clickable status badge for Unpaid/Overdue — one click marks as Paid with today's date */
function MarkPaidBadge({ revenue }: { revenue: RevenueRecord }) {
  const router = useRouter()

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await markRevenuePaid(_prev, formData)
    if (result && 'success' in result && result.success) router.refresh()
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="revenue_id" value={revenue.id} />
        <button
          type="submit"
          disabled={pending}
          title="点击标记已收款（收款日期设为今天）"
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-40 ${STATUS_STYLES[revenue.status] ?? ''}`}
        >
          {pending ? '...' : revenue.status}
        </button>
      </form>
      {state && 'error' in state && (
        <p className="text-xs text-red-500 mt-0.5">{state.error}</p>
      )}
    </div>
  )
}

export default function RevenueSection({ projectId, revenues, canEdit, isSuperAdmin }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Unpaid')
  const [issueDate, setIssueDate] = useState('')

  const wrappedAdd = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('project_id', projectId)
    formData.set('status', status)
    const result = await addRevenue(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      setStatus('Unpaid')
      toast('收入记录已添加', 'success')
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrappedAdd, undefined)

  // Summary
  const totalAmount  = revenues.reduce((s, r) => s + Number(r.amount), 0)
  const paidAmount   = revenues.filter(r => r.status === 'Paid').reduce((s, r) => s + Number(r.amount), 0)
  const unpaidAmount = totalAmount - paidAmount

  // Whether to show the operations column at all
  const showOpsCol = canEdit

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">收入</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)} className="h-7 text-xs px-3">
            + 新增收入
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">总金额</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(totalAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">已收款</p>
          <p className="text-lg font-semibold text-[#38A169]">{fmt(paidAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">待收款</p>
          <p className="text-lg font-semibold text-[#DD6B20]">{fmt(unpaidAmount)}</p>
        </div>
      </div>

      {/* Collection progress bar */}
      {totalAmount > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/40">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>收款进度</span>
            <span className="font-medium text-[#38A169]">
              {Math.round((paidAmount / totalAmount) * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#38A169] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (paidAmount / totalAmount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {revenues.length === 0 ? (
        <EmptyState
          icon={<TrendingUpIcon className="w-8 h-8" />}
          title="暂无收入记录"
          description="新增收入后将在此显示"
        />
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {revenues.map(r => (
            <div key={r.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.description ?? '—'}</p>
                  {r.invoice_number && (
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{r.invoice_number}</p>
                  )}
                </div>
                <p className="text-sm font-mono font-semibold text-[#38A169] shrink-0">{fmt(r.amount)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && r.status !== 'Paid' ? (
                  <MarkPaidBadge revenue={r} />
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{fmtDate(r.issue_date)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <table className="hidden md:table w-full text-sm">
          <thead className="border-b border-gray-100" style={{ backgroundColor: '#F7FAFC' }}>
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">描述</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-32">发票号</th>
              <th className="text-right px-4 py-3 font-semibold text-[#4A5568] w-28">金额</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">开票日期</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">收款日期</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">状态</th>
              {showOpsCol && <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-16">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {revenues.map((r, idx) => {
              const canEditRow = canEdit && (r.status !== 'Paid' || isSuperAdmin)
              return (
                <tr key={r.id} className={`animate-fade-in-up transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-[#EBF8FF]/50' : 'bg-[#F7FAFC]/60 hover:bg-[#EBF8FF]/50'}`} style={{ animationDelay: `${idx * 40}ms` }}>
                  <td className="px-4 py-3 text-gray-900">{r.description ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-medium">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.issue_date)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.received_date)}</td>
                  <td className="px-4 py-3">
                    {canEdit && r.status !== 'Paid' ? (
                      <MarkPaidBadge revenue={r} />
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status] ?? ''}`}>
                        {r.status}
                      </span>
                    )}
                  </td>
                  {showOpsCol && (
                    <td className="px-4 py-3">
                      {canEditRow && (
                        <EditRevenueDialog revenue={{
                          id: r.id,
                          description: r.description,
                          invoice_number: r.invoice_number,
                          amount: r.amount,
                          status: r.status,
                          issue_date: r.issue_date,
                          received_date: r.received_date,
                        }} />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        </>
      )}

      {/* Add Revenue Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新增收入</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rev-desc">收入描述 <span className="text-red-500">*</span></Label>
              <Input id="rev-desc" name="description" placeholder="例：Zeekr 八月月费" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rev-inv">客户发票号</Label>
              <Input id="rev-inv" name="invoice_number" placeholder="INV-2026-001" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rev-amt">金额 (AUD) <span className="text-red-500">*</span></Label>
              <Input id="rev-amt" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rev-date">开票日期 <span className="text-red-500">*</span></Label>
              <Input id="rev-date" name="issue_date" type="date" required onChange={e => setIssueDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rev-received">收款日期</Label>
              <Input id="rev-received" name="received_date" type="date" min={issueDate || undefined} />
            </div>

            <div className="space-y-1.5">
              <Label>收款状态</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {state && 'error' in state && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>取消</Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/></svg>保存中</>
                ) : '保存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
