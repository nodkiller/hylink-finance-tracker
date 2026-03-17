'use client'

import { useActionState } from 'react'
import { saveDefaultApprover, saveBrandApprover } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

type State = { error: string } | { success: boolean } | undefined

export interface ApproverOption {
  id: string
  full_name: string | null
}

export interface BrandApproverRow {
  brand_id: string
  brand_name: string
  approver_id: string | null
}

function DefaultApproverForm({
  approvers,
  defaultApproverId,
}: {
  approvers: ApproverOption[]
  defaultApproverId: string | null
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(saveDefaultApprover, undefined)
  const [value, setValue] = useState(defaultApproverId ?? '__none__')

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="default_approver_id" value={value === '__none__' ? '' : value} />
      <div className="space-y-1.5 max-w-xs">
        <Label>默认项目审批人</Label>
        <Select value={value} onValueChange={v => v && setValue(v)}>
          <SelectTrigger>
            <SelectValue placeholder="不指定（任意 Controller 均可审批）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">不指定</SelectItem>
            {approvers.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name ?? a.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">若不指定，所有 Controller 及以上均可审批项目</p>
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

function BrandApproverRow({
  row,
  approvers,
}: {
  row: BrandApproverRow
  approvers: ApproverOption[]
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(saveBrandApprover, undefined)
  const [value, setValue] = useState(row.approver_id ?? '__none__')

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2.5 px-4 text-sm font-medium text-gray-800">{row.brand_name}</td>
      <td className="py-2.5 px-4">
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="brand_id" value={row.brand_id} />
          <input type="hidden" name="approver_id" value={value === '__none__' ? '' : value} />
          <Select value={value} onValueChange={v => v && setValue(v)}>
            <SelectTrigger className="h-8 text-sm w-48">
              <SelectValue placeholder="沿用默认" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">沿用默认</SelectItem>
              {approvers.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name ?? a.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" variant="outline" disabled={pending} className="h-8 text-xs">
            {pending ? '...' : '保存'}
          </Button>
          {state && 'success' in state && state.success && (
            <span className="text-xs text-green-600">✓</span>
          )}
          {state && 'error' in state && (
            <span className="text-xs text-red-600">{state.error}</span>
          )}
        </form>
      </td>
    </tr>
  )
}

export default function ApproverForm({
  approvers,
  defaultApproverId,
  brandRows,
}: {
  approvers: ApproverOption[]
  defaultApproverId: string | null
  brandRows: BrandApproverRow[]
}) {
  return (
    <div className="space-y-8">
      <DefaultApproverForm approvers={approvers} defaultApproverId={defaultApproverId} />

      {brandRows.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">按品牌指定审批人</p>
          <p className="text-xs text-gray-400 mb-3">
            未指定时沿用默认审批人配置。仅对该品牌的项目和付款审批生效。
          </p>
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">品牌</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">指定审批人</th>
                </tr>
              </thead>
              <tbody>
                {brandRows.map(row => (
                  <BrandApproverRow key={row.brand_id} row={row} approvers={approvers} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
