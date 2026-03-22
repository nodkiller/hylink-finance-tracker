'use client'

import { useActionState } from 'react'
import { useTranslation } from '@/i18n/context'
import { saveDelegateSettings } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import type { ApproverOption } from './approver-form'

type State = { error: string } | { success: boolean } | undefined

interface DelegateData {
  delegate_approver_id: string | null
  delegate_active: boolean
  delegate_until: string | null
}

export default function DelegateForm({
  approvers,
  data,
}: {
  approvers: ApproverOption[]
  data: DelegateData
}) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState<State, FormData>(saveDelegateSettings, undefined)
  const [approverId, setApproverId] = useState(data.delegate_approver_id ?? '__none__')
  const [active, setActive] = useState(data.delegate_active)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="delegate_approver_id" value={approverId === '__none__' ? '' : approverId} />
      <input type="hidden" name="delegate_active" value={active ? 'true' : 'false'} />

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => setActive(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            active ? 'bg-[#2B6CB0]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">
          {active ? t('adminSettings.delegateEnabled') : t('adminSettings.delegateDisabled')}
        </span>
      </div>

      <div className={`space-y-4 transition-opacity ${active ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="space-y-1.5 max-w-xs">
          <Label>{t('adminSettings.delegateApprover')}</Label>
          <Select value={approverId} onValueChange={v => v && setApproverId(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('adminSettings.selectDelegate')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('adminSettings.noApprover')}</SelectItem>
              {approvers.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name ?? a.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">{t('adminSettings.delegateNotifyDesc')}</p>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="delegate_until">{t('adminSettings.delegateExpiry')}</Label>
          <Input
            id="delegate_until"
            name="delegate_until"
            type="date"
            defaultValue={data.delegate_until ?? ''}
          />
          <p className="text-xs text-gray-400">{t('adminSettings.delegateNoExpiry')}</p>
        </div>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-600">{t(state.error)}</p>
      )}
      {state && 'success' in state && state.success && (
        <p className="text-sm text-green-600">✓ {t('adminSettings.saved')}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t('common.saving') : t('common.save')}
      </Button>
    </form>
  )
}
