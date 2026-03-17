'use client'

import { useActionState } from 'react'
import { saveOverdueSettings } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = { error: string } | { success: boolean } | undefined

export default function OverdueForm({ overdueDays }: { overdueDays: number }) {
  const [state, formAction, pending] = useActionState<State, FormData>(saveOverdueSettings, undefined)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="overdue_days">
          逾期天数阈值
          <span className="ml-2 text-xs font-normal text-gray-400">超过此天数未收款则 Dashboard 预警</span>
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="overdue_days"
            name="overdue_days"
            type="number"
            min="1"
            max="365"
            defaultValue={overdueDays}
            required
            className="w-28"
          />
          <span className="text-sm text-gray-500">天</span>
        </div>
        <p className="text-xs text-gray-400">默认 30 天 · 适用于「未收款收入」逾期提醒</p>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && 'success' in state && state.success && (
        <p className="text-sm text-green-600">✓ 已保存</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? '保存中...' : '保存'}
      </Button>
    </form>
  )
}
