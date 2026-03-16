'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveExpense, rejectExpense } from '@/app/actions/expense-approval'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface PendingExpense {
  id: string
  project_code: string | null
  project_name: string
  payee: string
  description: string
  amount: number
  attachment_url: string
}

type State = { error: string } | { success: boolean } | undefined

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function ApproveExpenseButton({
  expense,
  onDone,
}: {
  expense: PendingExpense
  onDone: () => void
}) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await approveExpense(_prev, formData)
    if (result && 'success' in result && result.success) {
      setToast('已批准')
      setTimeout(() => { setToast(null); onDone(); router.refresh() }, 1800)
    }
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div className="relative">
      {toast && (
        <div className="absolute -top-9 right-0 bg-green-600 text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-10">
          {toast}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="expense_id" value={expense.id} />
        {state && 'error' in state && (
          <p className="text-xs text-red-500 mb-1">{state.error}</p>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="bg-[#3A7D44] hover:bg-[#2d6336] text-white h-7 px-3 text-xs"
        >
          {pending ? '...' : '批准'}
        </Button>
      </form>
    </div>
  )
}

function RejectExpenseButton({
  expense,
  onDone,
}: {
  expense: PendingExpense
  onDone: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await rejectExpense(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      onDone()
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-3 text-xs"
      >
        拒绝
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>拒绝付款请求</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            收款方：<span className="font-medium text-gray-900">{expense.payee}</span>
            <span className="mx-1">·</span>
            <span className="font-medium text-gray-900">{fmt(expense.amount)}</span>
          </p>
          <form action={formAction} className="space-y-4 pt-1">
            <input type="hidden" name="expense_id" value={expense.id} />
            <div className="space-y-1.5">
              <Label htmlFor="exp-reason">拒绝原因（选填）</Label>
              <Textarea
                id="exp-reason"
                name="reason"
                placeholder="请说明拒绝原因..."
                rows={3}
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
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? '处理中...' : '确认拒绝'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface Props {
  expenses: PendingExpense[]
}

export default function PendingExpenses({ expenses: initial }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = initial.filter(e => !dismissed.has(e.id))
  const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]))

  return (
    <div className="flex flex-col gap-0">
      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-400 text-sm">
          暂无待审批付款 ✓
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {visible.map(e => (
            <div key={e.id} className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
              {/* Project + amount row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-400">
                      {e.project_code ?? e.project_name}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-gray-900 truncate">{e.payee}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{e.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-semibold text-gray-800">{fmt(e.amount)}</span>
                    <a
                      href={e.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      查看附件 ↗
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <ApproveExpenseButton expense={e} onDone={() => dismiss(e.id)} />
                  <RejectExpenseButton expense={e} onDone={() => dismiss(e.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

