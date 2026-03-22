'use client'

import { useActionState } from 'react'
import { useTranslation } from '@/i18n/context'
import { saveBankAccount } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = { error: string } | { success: string } | undefined

function StatusMsg({ state }: { state: ActionState }) {
  const { t } = useTranslation()
  if (!state) return null
  if ('error' in state)
    return <p className="text-sm text-red-600">{t(state.error)}</p>
  if ('success' in state)
    return <p className="text-sm text-green-600">{t(state.success)}</p>
  return null
}

interface Props {
  bankBsb: string | null
  bankAccount: string | null
  bankAccountName: string | null
}

export default function BankAccountForm({ bankBsb, bankAccount, bankAccountName }: Props) {
  const { t } = useTranslation()
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBankAccount, undefined)

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bank_bsb">{t('reimbursement.bsb')}</Label>
          <Input
            id="bank_bsb"
            name="bank_bsb"
            defaultValue={bankBsb ?? ''}
            placeholder="000-000"
            maxLength={7}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank_account">{t('reimbursement.accountNumber')}</Label>
          <Input
            id="bank_account"
            name="bank_account"
            defaultValue={bankAccount ?? ''}
            placeholder="12345678"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bank_account_name">{t('reimbursement.accountName')}</Label>
        <Input
          id="bank_account_name"
          name="bank_account_name"
          defaultValue={bankAccountName ?? ''}
          placeholder={t('profile.enterName')}
        />
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t('common.saving') : t('common.saveChanges')}
      </Button>
    </form>
  )
}
