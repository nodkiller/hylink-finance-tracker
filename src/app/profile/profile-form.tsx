'use client'

import { useActionState } from 'react'
import { useTranslation } from '@/i18n/context'
import { updateDisplayName, updateEmail, updatePassword } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = { error: string } | { success: string } | undefined

// Role labels will use t() at render time
const ROLE_LABEL_KEYS: Record<string, string> = {
  'Super Admin': 'profile.superAdmin',
  'Admin':       'profile.admin',
  'Controller':  'profile.controller',
  'Staff':       'profile.staff',
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700 border-purple-200',
  'Admin':       'bg-blue-100 text-blue-700 border-blue-200',
  'Controller':  'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/20',
  'Staff':       'bg-gray-100 text-gray-600 border-gray-200',
}

function StatusMsg({ state }: { state: ActionState }) {
  const { t } = useTranslation()
  if (!state) return null
  if ('error' in state)
    return <p className="text-sm text-red-600">{t(state.error)}</p>
  if ('success' in state)
    return <p className="text-sm text-green-600">✓ {t(state.success)}</p>
  return null
}

interface Props {
  fullName: string | null
  email: string
  role: string
  createdAt: string
}

function NameForm({ fullName }: { fullName: string | null }) {
  const { t } = useTranslation()
  const [state, action, pending] = useActionState<ActionState, FormData>(updateDisplayName, undefined)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">{t('profile.displayName')}</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName ?? ''}
          placeholder={t('profile.enterName')}
          required
        />
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t('common.saving') : t('profile.saveName')}
      </Button>
    </form>
  )
}

function EmailForm({ email }: { email: string }) {
  const { t } = useTranslation()
  const [state, action, pending] = useActionState<ActionState, FormData>(updateEmail, undefined)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t('profile.newEmail')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={email}
          required
        />
        <p className="text-xs text-gray-400">{t('profile.currentEmail').replace('{email}', email)}</p>
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t('common.updating') : t('profile.updateEmail')}
      </Button>
    </form>
  )
}

function PasswordForm() {
  const { t } = useTranslation()
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePassword, undefined)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('profile.newPassword')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={t('profile.min8Chars')}
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t('profile.confirmPassword')}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder={t('profile.reEnterPassword')}
          minLength={8}
          required
        />
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t('common.updating') : t('profile.updatePassword')}
      </Button>
    </form>
  )
}

export default function ProfileForm({ fullName, email, role, createdAt }: Props) {
  const { t } = useTranslation()
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS['Staff']
  const roleLabel = ROLE_LABEL_KEYS[role] ? t(ROLE_LABEL_KEYS[role]) : role

  return (
    <div className="space-y-4">
      {/* Account info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">{t('profile.accountInfo')}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{t('profile.currentEmailLabel')}</p>
            <p className="font-medium text-gray-900">{email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{t('profile.accountRole')}</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{t('profile.registeredAt')}</p>
            <p className="text-gray-700">{new Date(createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">{t('profile.changeName')}</h2>
        <p className="text-sm text-gray-500 mb-5">{t('profile.changeNameDesc')}</p>
        <NameForm fullName={fullName} />
      </div>

      {/* Email */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">{t('profile.changeEmail')}</h2>
        <p className="text-sm text-gray-500 mb-5">{t('profile.changeEmailDesc')}</p>
        <EmailForm email={email} />
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">{t('profile.changePassword')}</h2>
        <p className="text-sm text-gray-500 mb-5">{t('profile.changePasswordDesc')}</p>
        <PasswordForm />
      </div>
    </div>
  )
}
