'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/context'

export default function LoginForm() {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-white/60 text-xs tracking-widest uppercase">{t('common.email')}</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@hylink.com.au"
          required
          autoComplete="email"
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm outline-none focus:border-white/30 focus:bg-white/[0.1] transition"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-white/60 text-xs tracking-widest uppercase">{t('common.password')}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm outline-none focus:border-white/30 focus:bg-white/[0.1] transition"
        />
      </div>

      {'error' in (state ?? {}) && (
        <p className="text-sm text-red-400">{(state as { error: string }).error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-white text-[#1a3a5c] font-semibold text-sm py-2.5 rounded-lg hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-50 tracking-wide"
      >
        {pending ? t('login.loggingIn') : t('login.loginButton')}
      </button>
    </form>
  )
}
