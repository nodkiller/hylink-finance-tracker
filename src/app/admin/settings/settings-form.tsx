'use client'

import { useActionState } from 'react'
import { saveSettings } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Settings = {
  auto_limit: number
  admin_limit: number
  super_admin_limit: number
  updated_at: string
}

type State = { error: string } | { success: boolean } | undefined

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<State, FormData>(saveSettings, undefined)

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="auto_limit">
            自动批准额度 (AUD)
            <span className="ml-2 text-xs font-normal text-gray-400">≤ 此金额自动批准</span>
          </Label>
          <Input
            id="auto_limit"
            name="auto_limit"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={settings.auto_limit}
            required
          />
          <p className="text-xs text-gray-400">默认：A$1,000 · Controller 录入后自动批准</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin_limit">
            管理员审批上限 (AUD)
            <span className="ml-2 text-xs font-normal text-gray-400">管理员可审批的最高金额</span>
          </Label>
          <Input
            id="admin_limit"
            name="admin_limit"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={settings.admin_limit}
            required
          />
          <p className="text-xs text-gray-400">默认：A$2,000 · 超出部分需超级管理员审批</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="super_admin_limit">
            超级管理员专属审批起点 (AUD)
            <span className="ml-2 text-xs font-normal text-gray-400">仅作参考阈值</span>
          </Label>
          <Input
            id="super_admin_limit"
            name="super_admin_limit"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={settings.super_admin_limit}
            required
          />
          <p className="text-xs text-gray-400">默认：A$5,000 · 记录层级参考值</p>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 mb-4 space-y-1">
          <p className="font-medium text-gray-700">当前审批规则：</p>
          <p>• ≤ A${settings.auto_limit.toLocaleString()} → 自动批准（无需人工审核）</p>
          <p>• A${settings.auto_limit.toLocaleString()} ~ A${settings.admin_limit.toLocaleString()} → 管理员审批</p>
          <p>• &gt; A${settings.admin_limit.toLocaleString()} → 超级管理员审批</p>
        </div>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && 'success' in state && state.success && (
        <p className="text-sm text-green-600">✓ 设置已保存</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? '保存中...' : '保存设置'}
      </Button>
    </form>
  )
}
