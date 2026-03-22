'use client'

import { useTransition } from 'react'
import { useTranslation } from '@/i18n/context'
import { setLocale } from '@/app/actions/locale'

export default function LocaleToggle() {
  const { locale } = useTranslation()
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      await setLocale(locale === 'en' ? 'zh' : 'en')
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-label="Switch language"
      className="flex items-center gap-0 rounded-full border border-white/20 text-xs overflow-hidden transition-opacity disabled:opacity-50"
    >
      <span
        className={`px-2.5 py-1 transition-colors ${
          locale === 'en'
            ? 'bg-white text-[#1e40af] font-medium'
            : 'text-white/50 hover:text-white/70'
        }`}
      >
        EN
      </span>
      <span
        className={`px-2.5 py-1 transition-colors ${
          locale === 'zh'
            ? 'bg-white text-[#1e40af] font-medium'
            : 'text-white/50 hover:text-white/70'
        }`}
      >
        中文
      </span>
    </button>
  )
}
