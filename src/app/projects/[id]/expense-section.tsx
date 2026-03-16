'use client'

import { useRef, useState, useTransition, useActionState } from 'react'
import EditExpenseDialog from './edit-expense-dialog'
import { useRouter } from 'next/navigation'
import { createExpense, confirmPayment } from '@/app/actions/expenses'
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
}

const STATUS_STYLES: Record<string, string> = {
  'Pending Approval':       'bg-[#D48E00]/10 text-[#D48E00] border-[#D48E00]/25',
  'Pending Super Approval': 'bg-purple-50 text-purple-700 border-purple-200',
  'Approved':               'bg-[#2A4A6B]/10 text-[#2A4A6B] border-[#2A4A6B]/25',
  'Rejected':               'bg-[#C0392B]/10 text-[#C0392B] border-[#C0392B]/25',
  'Paid':                   'bg-[#3A7D44]/10 text-[#3A7D44] border-[#3A7D44]/25',
}

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

type PayState = { error: string } | { success: boolean } | undefined

function ConfirmPaymentButton({ expense }: { expense: ExpenseRecord }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const action = async (_prev: PayState, formData: FormData): Promise<PayState> => {
    const result = await confirmPayment(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
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
              <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {pending ? '处理中...' : '确认已付款'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ExpenseSection({ projectId, expenses, canSubmit, canConfirmPayment }: Props) {
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
      } else {
        setOpen(false)
        setAmountValue('')
        formRef.current?.reset()
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
          <p className="text-lg font-semibold text-green-600">{fmt(paidAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">待审批</p>
          <p className="text-lg font-semibold text-yellow-600">{fmt(pendingAmount)}</p>
        </div>
      </div>

      {/* Table */}
      {expenses.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">暂无付款记录</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">收款方</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">用途</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">发票号</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 w-28">金额</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">状态</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">审批人</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50/50">
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
                <td className="px-4 py-3 text-xs text-gray-500">
                  {e.approver_name ?? (e.status === 'Approved' ? '自动' : '—')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
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
              <Label htmlFor="exp-date">预计付款日期</Label>
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
                {isPending ? '提交中...' : '提交申请'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

