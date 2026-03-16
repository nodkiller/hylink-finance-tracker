'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addRevenue } from '@/app/actions/revenues'
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
}

type State = { error: string } | { success: boolean } | undefined

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700 border-green-200',
  Unpaid: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Overdue: 'bg-red-100 text-red-600 border-red-200',
}

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function RevenueSection({ projectId, revenues }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('Unpaid')

  const wrappedAdd = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('project_id', projectId)
    formData.set('status', status)
    const result = await addRevenue(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      setStatus('Unpaid')
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrappedAdd, undefined)

  // Summary
  const totalAmount = revenues.reduce((s, r) => s + Number(r.amount), 0)
  const paidAmount = revenues.filter(r => r.status === 'Paid').reduce((s, r) => s + Number(r.amount), 0)
  const unpaidAmount = totalAmount - paidAmount

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">收入</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="h-7 text-xs px-3">
          + 新增收入
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">总金额</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(totalAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">已收款</p>
          <p className="text-lg font-semibold text-green-600">{fmt(paidAmount)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 mb-0.5">待收款</p>
          <p className="text-lg font-semibold text-yellow-600">{fmt(unpaidAmount)}</p>
        </div>
      </div>

      {/* Table */}
      {revenues.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">暂无收入记录</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">描述</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">发票号</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 w-28">金额</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">开票日期</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">收款日期</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {revenues.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-900">{r.description ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.invoice_number ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-medium">{fmt(r.amount)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.issue_date)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.received_date)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <Input id="rev-date" name="issue_date" type="date" required />
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
              <Button type="submit" disabled={pending}>{pending ? '保存中...' : '保存'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
