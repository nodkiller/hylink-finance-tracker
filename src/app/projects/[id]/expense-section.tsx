'use client'

import { useRef, useState, useTransition, useActionState } from 'react'
import EmptyState from '@/components/empty-state'
import { ReceiptIcon } from 'lucide-react'
import EditExpenseDialog from './edit-expense-dialog'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import { createExpense, confirmPayment } from '@/app/actions/expenses'
import { approveExpense, rejectExpense } from '@/app/actions/expense-approval'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ExpenseRecord {
  id: string
  payee: string
  description: string
  invoice_number: string
  amount: number
  status: string
  attachment_url: string
  approver_name: string | null
  rejection_reason: string | null
  payment_date: string | null
}

interface Props {
  projectId: string
  expenses: ExpenseRecord[]
  canSubmit: boolean
  canConfirmPayment: boolean
  canApprove?: boolean
}

const STATUS_STYLES: Record<string, string> = {
  'Pending Approval':       'bg-[#DD6B20]/10 text-[#DD6B20] border-[#DD6B20]/25',
  'Pending Super Approval': 'bg-purple-50 text-purple-700 border-purple-200',
  'Approved':               'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  'Rejected':               'bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/25',
  'Paid':                   'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
}

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

type PayState = { error: string } | { success: boolean } | undefined

function ExpenseApprovalActions({ expense }: { expense: ExpenseRecord }) {
  const router = useRouter()
  const { toast } = useToast()
  const [rejectOpen, setRejectOpen] = useState(false)

  const approveAction = async (_prev: PayState, formData: FormData): Promise<PayState> => {
    const result = await approveExpense(_prev, formData)
    if (result && 'success' in result && result.success) {
      toast(`付款请求已批准：${expense.payee}`, 'success')
      router.refresh()
    }
    return result
  }

  const rejectAction = async (_prev: PayState, formData: FormData): Promise<PayState> => {
    const result = await rejectExpense(_prev, formData)
    if (result && 'success' in result && result.success) {
      setRejectOpen(false)
      toast(`付款请求已驳回：${expense.payee}`, 'error')
      router.refresh()
    }
    return result
  }

  const [approveState, approveFormAction, approvePending] = useActionState(approveAction, undefined)
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, undefined)

  return (
    <>
      {/* Approve — inline form, no dialog needed */}
      <form action={approveFormAction}>
        <input type="hidden" name="expense_id" value={expense.id} />
        <button
          type="submit"
          disabled={approvePending}
          className="text-xs text-[#38A169] hover:text-[#2d6235] hover:underline disabled:opacity-50"
        >
          {approvePending ? '处理中...' : '批准'}
        </button>
      </form>
      {approveState && 'error' in approveState && (
        <p className="text-xs text-red-500">{approveState.error}</p>
      )}

      {/* Reject — opens a dialog for reason */}
      <button
        onClick={() => setRejectOpen(true)}
        className="text-xs text-[#E53E3E] hover:text-[#a93226] hover:underline"
      >
        驳回
      </button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>驳回付款请求</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            收款方：<span className="font-medium text-gray-900">{expense.payee}</span>
            <span className="mx-1">·</span>
            <span className="font-medium text-gray-900">{fmt(expense.amount)}</span>
          </p>
          <form action={rejectFormAction} className="space-y-4 pt-1">
            <input type="hidden" name="expense_id" value={expense.id} />
            <div className="space-y-1.5">
              <Label htmlFor={`reject-reason-${expense.id}`}>
                驳回原因 <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`reject-reason-${expense.id}`}
                name="reason"
                placeholder="请填写驳回原因..."
                required
                autoFocus
              />
            </div>
            {rejectState && 'error' in rejectState && (
              <p className="text-sm text-red-600">{rejectState.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectOpen(false)} disabled={rejectPending}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={rejectPending}
                className="bg-[#E53E3E] hover:bg-[#a93226] text-white border-0">
                {rejectPending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/></svg>处理中</>
                ) : '确认驳回'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ConfirmPaymentButton({ expense }: { expense: ExpenseRecord }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const action = async (_prev: PayState, formData: FormData): Promise<PayState> => {
    const result = await confirmPayment(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      toast(`已确认付款：${expense.payee} ${fmt(expense.amount)}`, 'success')
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-emerald-600 hover:text-emerald-800 hover:underline"
      >
        确认付款
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认付款</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            收款方：<span className="font-medium text-gray-900">{expense.payee}</span>
            <span className="mx-1">·</span>
            <span className="font-medium text-gray-900">{fmt(expense.amount)}</span>
          </p>
          <form action={formAction} className="space-y-4 pt-1">
            <input type="hidden" name="expense_id" value={expense.id} />
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">
                实际付款日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pay-date"
                name="payment_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                autoFocus
              />
            </div>
            {state && 'error' in state && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                取消
              </Button>
              <Button type="submit" disabled={pending} className="bg-[#38A169] hover:bg-[#2d6235] text-white border-0">
                {pending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/></svg>处理中</>
                ) : '确认已付款'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ExpenseSection({ projectId, expenses, canSubmit, canConfirmPayment, canApprove }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [amountValue, setAmountValue] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const parsedAmount = parseFloat(amountValue)
  const showAmountWarning = parsedAmount > 1000

  // Summary
  const totalAmount   = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const paidAmount    = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + Number(e.amount), 0)
  const pendingAmount = expenses.filter(e => e.status === 'Pending Approval').reduce((s, e) => s + Number(e.amount), 0)

  function isDueSoon(paymentDate: string | null, status: string): boolean {
    if (!paymentDate || status === 'Paid' || status === 'Rejected') return false
    const due = new Date(paymentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  }

  function fmtDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('project_id', projectId)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError('请上传发票附件'); return }
    formData.set('attachment', file)

    startTransition(async () => {
      const result = await createExpense(undefined, formData)
      if (result && 'error' in result) {
        setError(result.error)
        toast(result.error, 'error')
      } else {
        setOpen(false)
        setAmountValue('')
        formRef.current?.reset()
        toast('付款请求已提交', 'success')
        router.refresh()
      }
    })
  }

  const handleOpen = () => {
    setOpen(true)
    setError(null)
    setAmountValue('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">支出（付款请求）</h2>
        {canSubmit && (
          <Button size="sm" onClick={handleOpen} className="h-7 text-xs px-3">
            + 发起付款请求
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">总支出</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(totalAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">已付款</p>
          <p className="text-lg font-semibold text-[#38A169]">{fmt(paidAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">待审批</p>
          <p className="text-lg font-semibold text-[#DD6B20]">{fmt(pendingAmount)}</p>
        </div>
      </div>

      {/* Payment progress bar */}
      {totalAmount > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/40">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>付款进度</span>
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

      {/* Mobile card list */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon className="w-8 h-8" />}
          title="暂无付款记录"
          description="发起付款请求后将在此显示"
        />
      ) : (
        <>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {expenses.map(e => (
            <div key={e.id} className={`px-4 py-3.5 ${isDueSoon(e.payment_date, e.status) ? 'bg-amber-50/60' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{e.payee}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{e.description}</p>
                </div>
                <p className="text-sm font-mono font-semibold text-gray-800 shrink-0">{fmt(e.amount)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[e.status] ?? ''}`}>
                  {e.status === 'Rejected' ? '已拒绝' : e.status}
                </span>
                {e.payment_date && e.status !== 'Paid' && (
                  <span className={`text-xs ${isDueSoon(e.payment_date, e.status) ? 'text-[#DD6B20] font-semibold' : 'text-gray-400'}`}>
                    到期 {fmtDate(e.payment_date)}{isDueSoon(e.payment_date, e.status) && ' ⚠'}
                  </span>
                )}
                <a href={e.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#2B6CB0] hover:underline ml-auto">附件</a>
                {canConfirmPayment && e.status === 'Approved' && (
                  <ConfirmPaymentButton expense={e} />
                )}
                {canApprove && (e.status === 'Pending Approval' || e.status === 'Pending Super Approval') && (
                  <ExpenseApprovalActions expense={e} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <table className="hidden md:table w-full text-sm">
          <thead className="border-b border-gray-100" style={{ backgroundColor: '#F7FAFC' }}>
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">收款方</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">用途</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">发票号</th>
              <th className="text-right px-4 py-3 font-semibold text-[#4A5568] w-28">金额</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-32">状态</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">到期日期</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-24">审批人</th>
              <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-32">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((e, idx) => (
              <tr key={e.id} className={`animate-fade-in-up transition-colors ${isDueSoon(e.payment_date, e.status) ? 'bg-amber-50/70 hover:bg-amber-50' : idx % 2 === 0 ? 'bg-white hover:bg-[#EBF8FF]/50' : 'bg-[#F7FAFC]/60 hover:bg-[#EBF8FF]/50'}`} style={{ animationDelay: `${idx * 40}ms` }}>
                <td className="px-4 py-3 font-medium text-gray-900">{e.payee}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{e.description}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.invoice_number}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-medium">{fmt(e.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[e.status] ?? ''}`}>
                    {e.status === 'Rejected' ? '已拒绝' : e.status}
                  </span>
                  {e.status === 'Rejected' && e.rejection_reason && (
                    <p className="text-xs text-red-500 mt-0.5 max-w-[120px] leading-tight">
                      {e.rejection_reason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {e.status === 'Paid' ? (
                    <span className="text-xs text-gray-300">—</span>
                  ) : e.payment_date ? (
                    <span className={`text-xs ${isDueSoon(e.payment_date, e.status) ? 'text-[#DD6B20] font-semibold' : 'text-gray-500'}`}>
                      {fmtDate(e.payment_date)}
                      {isDueSoon(e.payment_date, e.status) && (
                        <span className="ml-1 text-[#DD6B20]">⚠</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">未设置</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {e.approver_name ?? (e.status === 'Approved' ? '自动' : '—')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {canApprove && (e.status === 'Pending Approval' || e.status === 'Pending Super Approval') && (
                      <ExpenseApprovalActions expense={e} />
                    )}
                    {canSubmit && (
                      <EditExpenseDialog expense={{
                        id: e.id,
                        payee: e.payee,
                        description: e.description,
                        invoice_number: e.invoice_number,
                        amount: e.amount,
                        status: e.status,
                        attachment_url: e.attachment_url,
                        payment_date: e.payment_date,
                      }} />
                    )}
                    <a
                      href={e.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      查看附件
                    </a>
                    {canConfirmPayment && e.status === 'Approved' && (
                      <ConfirmPaymentButton expense={e} />
                    )}
                    {e.status === 'Paid' && e.payment_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(e.payment_date).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发起付款请求</DialogTitle>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-payee">
                收款方 / 供应商 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exp-payee"
                name="payee"
                placeholder="例：KOL @XXX 或供应商公司名"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-inv">
                供应商发票号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exp-inv"
                name="invoice_number"
                placeholder="例：INV-2026-001"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">
                支出用途 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="exp-desc"
                name="description"
                placeholder="说明这笔款项的用途..."
                rows={2}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-amt">
                金额 (AUD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exp-amt"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
                value={amountValue}
                onChange={e => setAmountValue(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-file">
                发票 / 收据附件 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exp-file"
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                className="cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              <p className="text-xs text-gray-400">支持 PDF、JPG、PNG，最大 10MB</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-date">付款到期日</Label>
              <Input id="exp-date" name="payment_date" type="date" />
            </div>

            {/* Amount warning */}
            {showAmountWarning && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {parsedAmount > 2000
                    ? '此笔付款金额超过审批上限，提交后需超级管理员审批后方可付款。'
                    : '此笔付款金额超过自动审批额度，提交后需管理员审批后方可付款。'}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/></svg>提交中</>
                ) : '提交申请'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

