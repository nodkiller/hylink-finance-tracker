'use client'

import { useActionState } from 'react'
import { useTranslation } from '@/i18n/context'
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
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState<State, FormData>(saveSettings, undefined)

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="auto_limit">
            {t('adminSettings.autoLimitLabel')}
            <span className="ml-2 text-xs font-normal text-gray-400">{t('adminSettings.autoLimitDesc')}</span>
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
          <p className="text-xs text-gray-400">{t('adminSettings.autoLimitDefault')}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin_limit">
            {t('adminSettings.adminLimitLabel')}
            <span className="ml-2 text-xs font-normal text-gray-400">{t('adminSettings.adminLimitDesc')}</span>
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
          <p className="text-xs text-gray-400">{t('adminSettings.adminLimitDefault')}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="super_admin_limit">
            {t('adminSettings.superAdminLimitLabel')}
            <span className="ml-2 text-xs font-normal text-gray-400">{t('adminSettings.superAdminLimitDesc')}</span>
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
          <p className="text-xs text-gray-400">{t('adminSettings.superAdminLimitDefault')}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 mb-4 space-y-1">
          <p className="font-medium text-gray-700">{t('adminSettings.currentRules')}</p>
          <p>{t('adminSettings.ruleAutoApprove').replace('${amount}', settings.auto_limit.toLocaleString())}</p>
          <p>{t('adminSettings.ruleAdminApprove').replace('${min}', settings.auto_limit.toLocaleString()).replace('${max}', settings.admin_limit.toLocaleString())}</p>
          <p>{t('adminSettings.ruleSuperApprove').replace('${amount}', settings.admin_limit.toLocaleString())}</p>
        </div>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-600">{t(state.error)}</p>
      )}
      {state && 'success' in state && state.success && (
        <p className="text-sm text-green-600">✓ {t('adminSettings.settingsSaved')}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t('common.saving') : t('adminSettings.saveSettings')}
      </Button>
    </form>
  )
}
