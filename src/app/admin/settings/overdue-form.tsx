'use client'

import { useActionState } from 'react'
import { useTranslation } from '@/i18n/context'
import { saveOverdueSettings } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State = { error: string } | { success: boolean } | undefined

export default function OverdueForm({ overdueDays }: { overdueDays: number }) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState<State, FormData>(saveOverdueSettings, undefined)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="overdue_days">
          {t('adminSettings.overdueThresholdLabel')}
          <span className="ml-2 text-xs font-normal text-gray-400">{t('adminSettings.overdueThresholdDesc')}</span>
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
          <span className="text-sm text-gray-500">{t('adminSettings.days')}</span>
        </div>
        <p className="text-xs text-gray-400">{t('adminSettings.overdueDefaultDesc')}</p>
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
