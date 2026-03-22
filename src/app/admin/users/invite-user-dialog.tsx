'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/context'
import { inviteUser } from '@/app/actions/user-management'
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

type State = { error: string } | { success: boolean } | undefined

export default function InviteUserDialog() {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('PM')
  const [toast, setToast] = useState<string | null>(null)

  const wrapped = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('role', role)
    const result = await inviteUser(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      setRole('PM')
      setToast(`✓ ${t('adminUsers.inviteSent')}`)
      setTimeout(() => { setToast(null); router.refresh() }, 3000)
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrapped, undefined)

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#38A169] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <Button onClick={() => setOpen(true)}>{t('adminUsers.inviteNewUser')}</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('adminUsers.inviteNewUser')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">{t('adminUsers.inviteDesc')}</p>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">{t('common.name')}</Label>
              <Input id="inv-name" name="full_name" placeholder={t('adminUsers.namePlaceholder')} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-email">{t('common.email')}</Label>
              <Input id="inv-email" name="email" type="email" placeholder={t('adminUsers.emailPlaceholder')} required />
            </div>

            <div className="space-y-1.5">
              <Label>{t('common.role')}</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'Controller', label: `Controller — ${t('adminUsers.approvalAllProjects')}` },
                    { value: 'PM', label: `PM — ${t('adminUsers.createRevenueExpense')}` },
                    { value: 'Viewer', label: `Viewer — ${t('adminUsers.readOnly')}` },
                  ].map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state && 'error' in state && (
              <p className="text-sm text-red-600">{t(state.error)}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t('adminUsers.inviting') : t('adminUsers.sendInvite')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
