'use client'

import { useState, useTransition, useCallback } from 'react'
import { useTranslation } from '@/i18n/context'
import { X, Mail, Loader2 } from 'lucide-react'

interface Props {
  expenseIds: string[]
  totalAmount: number
  onComplete: () => void
  onClose: () => void
}

export default function SendEmailDialog({ expenseIds, totalAmount, onComplete, onClose }: Props) {
  const { t, locale } = useTranslation()
  const [toEmails, setToEmails] = useState<string[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fmtAmount = (n: number) =>
    `A$${n.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU', { minimumFractionDigits: 2 })}`

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const addEmail = useCallback((type: 'to' | 'cc') => {
    const input = type === 'to' ? toInput : ccInput
    const setEmails = type === 'to' ? setToEmails : setCcEmails
    const setInput = type === 'to' ? setToInput : setCcInput
    const trimmed = input.trim().toLowerCase()

    if (trimmed && isValidEmail(trimmed)) {
      setEmails(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
      setInput('')
    }
  }, [toInput, ccInput])

  const removeEmail = (type: 'to' | 'cc', email: string) => {
    const setEmails = type === 'to' ? setToEmails : setCcEmails
    setEmails(prev => prev.filter(e => e !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: 'to' | 'cc') => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail(type)
    }
  }

  const handleSend = () => {
    if (toEmails.length === 0) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/send-payment-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expense_ids: expenseIds,
            type: 'payment',
            to_emails: toEmails,
            cc_emails: ccEmails.length > 0 ? ccEmails : undefined,
            note: note.trim() || undefined,
          }),
        })

        const data = await res.json()

        if (res.ok && data.success) {
          setResult({ type: 'success', message: t('paymentEmail.emailSent') })
          setTimeout(() => {
            onComplete()
            onClose()
          }, 1500)
        } else {
          setResult({ type: 'error', message: data.error || t('paymentEmail.emailFailed') })
        }
      } catch {
        setResult({ type: 'error', message: t('paymentEmail.emailFailed') })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-[var(--brand-mid)]" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('paymentEmail.sendEmailTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {/* Summary */}
          <div className="bg-blue-50/60 rounded-lg p-3 text-sm text-[var(--brand-primary)]">
            {t('paymentEmail.selectedCount')
              .replace('{count}', String(expenseIds.length))
              .replace('{amount}', totalAmount.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU', { minimumFractionDigits: 2 }))}
          </div>

          {/* To field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('paymentEmail.recipients')} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[42px] focus-within:border-[var(--brand-mid)] focus-within:ring-1 focus-within:ring-[var(--brand-mid)]/20 transition-colors">
              {toEmails.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[var(--brand-mid)] rounded-md text-xs font-medium"
                >
                  {email}
                  <button onClick={() => removeEmail('to', email)} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, 'to')}
                onBlur={() => addEmail('to')}
                placeholder={toEmails.length === 0 ? t('paymentEmail.addEmail') : ''}
                className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          {/* CC field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('paymentEmail.cc')}
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[42px] focus-within:border-[var(--brand-mid)] focus-within:ring-1 focus-within:ring-[var(--brand-mid)]/20 transition-colors">
              {ccEmails.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium"
                >
                  {email}
                  <button onClick={() => removeEmail('cc', email)} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={ccInput}
                onChange={e => setCcInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, 'cc')}
                onBlur={() => addEmail('cc')}
                placeholder={ccEmails.length === 0 ? t('paymentEmail.addEmail') : ''}
                className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('paymentEmail.note')}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('paymentEmail.notePlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[var(--brand-mid)] focus:ring-1 focus:ring-[var(--brand-mid)]/20 outline-none resize-none transition-colors"
            />
          </div>

          {/* Result message */}
          {result && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                result.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={isPending || toEmails.length === 0}
            className="px-5 py-2 bg-[var(--brand-mid)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary)] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t('paymentEmail.sending')}
              </>
            ) : (
              <>
                <Mail size={14} />
                {t('paymentEmail.confirmSend').replace('{count}', String(expenseIds.length))}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
