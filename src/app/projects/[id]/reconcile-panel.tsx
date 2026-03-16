'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { reconcileProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'

interface Props {
  projectId: string
  projectStatus: string
  estimatedRevenue: number | null
  totalRevenue: number
  totalExpenses: number
}

type State = { error: string } | { success: boolean } | undefined

function fmt(n: number | null) {
  if (n == null) return '—'
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

export default function ReconcilePanel({
  projectId,
  projectStatus,
  estimatedRevenue,
  totalRevenue,
  totalExpenses,
}: Props) {
  const router = useRouter()
  const profit = totalRevenue - totalExpenses
  const isReconciled = projectStatus === 'Reconciled'
  const canReconcile = projectStatus === 'Completed'

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await reconcileProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">对账面板</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            SOP：项目关闭后 1 个月内由 Controller 完成对账，确保财务闭环
          </p>
        </div>
        {isReconciled && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
            已对账
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-0">
        {/* Row 1: Estimated Revenue */}
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-500">预估收入</span>
          <span className="text-sm font-medium text-gray-700 font-mono">{fmt(estimatedRevenue)}</span>
        </div>

        {/* Row 2: Actual Revenue */}
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-500">实际总收入</span>
          <span className="text-sm font-medium text-gray-900 font-mono">{fmt(totalRevenue)}</span>
        </div>

        {/* Row 3: Actual Expenses */}
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-500">实际总支出</span>
          <span className="text-sm font-medium text-gray-900 font-mono">{fmt(totalExpenses)}</span>
        </div>

        {/* Profit */}
        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-semibold text-gray-700">利润</span>
          <span className={`text-lg font-bold font-mono ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(profit)}
          </span>
        </div>
      </div>

      {/* Reconcile button */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          {!canReconcile && !isReconciled && (
            <p className="text-xs text-gray-400">项目状态为 Completed 后才可对账</p>
          )}
          {state && 'error' in state && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}
        </div>
        <form action={formAction}>
          <input type="hidden" name="project_id" value={projectId} />
          <Button
            type="submit"
            size="sm"
            disabled={!canReconcile || pending || isReconciled}
            className={
              isReconciled
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : canReconcile
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }
            variant="ghost"
          >
            {isReconciled ? '已对账' : pending ? '处理中...' : '标记为已对账'}
          </Button>
        </form>
      </div>
    </div>
  )
}
