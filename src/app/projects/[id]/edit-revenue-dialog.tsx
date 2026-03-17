'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateRevenue, deleteRevenue } from '@/app/actions/revenues'
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

export interface RevenueEditData {
  id: string
  description: string | null
  invoice_number: string | null
  amount: number
  status: string
  issue_date: string
  received_date: string | null
}

interface Props {
  revenue: RevenueEditData
}

type State = { error: string } | { success: boolean } | undefined

export default function EditRevenueDialog({ revenue }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [status, setStatus] = useState(revenue.status)

  const wrapped = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('revenue_id', revenue.id)
    formData.set('status', status)
    const result = await updateRevenue(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrapped, undefined)

  const [deleteState, deleteFormAction, deleting] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result = await deleteRevenue(_prev, formData)
      if (result && 'success' in result && result.success) {
        setOpen(false)
        router.refresh()
      }
      return result
    },
    undefined
  )

  return (
    <>
      <button
        onClick={() => { setOpen(true); setShowDeleteConfirm(false) }}
        className="text-xs text-[#2B6CB0] hover:text-[#1a3555] hover:underline"
      >
        编辑
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑收入记录</DialogTitle>
          </DialogHeader>

          {!showDeleteConfirm ? (
            <form action={formAction} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="er-desc">收入描述 <span className="text-red-500">*</span></Label>
                <Input id="er-desc" name="description" defaultValue={revenue.description ?? ''} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="er-inv">客户发票号</Label>
                <Input id="er-inv" name="invoice_number" defaultValue={revenue.invoice_number ?? ''} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="er-amt">金额 (AUD) <span className="text-red-500">*</span></Label>
                <Input id="er-amt" name="amount" type="number" min="0.01" step="0.01" defaultValue={revenue.amount} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="er-date">开票日期 <span className="text-red-500">*</span></Label>
                <Input id="er-date" name="issue_date" type="date" defaultValue={revenue.issue_date} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="er-received">收款日期</Label>
                <Input id="er-received" name="received_date" type="date" defaultValue={revenue.received_date ?? ''} />
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

              {state && 'error' in state && <p className="text-sm text-red-600">{state.error}</p>}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  删除此记录
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                    取消
                  </Button>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? '保存中...' : '保存修改'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-sm text-red-700">
                确定删除这条收入记录吗？
                <p className="font-medium mt-1">
                  {revenue.description} · A${Number(revenue.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs mt-1 text-red-500">此操作不可恢复。</p>
              </div>
              {deleteState && 'error' in deleteState && <p className="text-sm text-red-600">{deleteState.error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  返回
                </Button>
                <form action={deleteFormAction}>
                  <input type="hidden" name="revenue_id" value={revenue.id} />
                  <Button variant="destructive" size="sm" type="submit" disabled={deleting}>
                    {deleting ? '删除中...' : '确认删除'}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
