'use client'

import { useState, useTransition } from 'react'
import { useTranslation } from '@/i18n/context'
import { batchMarkAsPaid } from '@/app/actions/payments'
import { Mail } from 'lucide-react'
import SendEmailDialog from './send-email-dialog'

interface Props {
  selectedCount: number
  selectedTotal: number
  selectedIds: string[]
  locale: string
  onComplete: () => void
}

export default function BatchActions({ selectedCount, selectedTotal, selectedIds, locale, onComplete }: Props) {
  const { t } = useTranslation()
  const [showDialog, setShowDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const fmtAmount = (n: number) => `A$${n.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU')}`

  const handleConfirm = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('expense_ids', JSON.stringify(selectedIds))
      const result = await batchMarkAsPaid(undefined, formData)

      if (result && 'success' in result && result.success) {
        setShowDialog(false)
        onComplete()
      }
    })
  }

  return (
    <>
      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--color-border)] shadow-lg animate-fade-in-up lg:pl-[220px]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{selectedCount} {t('payments.selected')}</span>
            <span className="text-gray-400 mx-2">&middot;</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--brand-mid)' }}>{fmtAmount(selectedTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmailDialog(true)}
              className="px-4 py-2 border border-[var(--brand-mid)] text-[var(--brand-mid)] text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              <Mail size={14} />
              {t('paymentEmail.sendPaymentEmail')}
            </button>
            <button
              onClick={() => setShowDialog(true)}
              className="px-5 py-2 bg-[var(--brand-mid)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary)] transition-colors"
            >
              {t('payments.markAsPaid')}
            </button>
          </div>
        </div>
      </div>

      {/* Send Email dialog */}
      {showEmailDialog && (
        <SendEmailDialog
          expenseIds={selectedIds}
          totalAmount={selectedTotal}
          onComplete={onComplete}
          onClose={() => setShowEmailDialog(false)}
        />
      )}

      {/* Mark as Paid confirmation dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold mb-2">{t('payments.confirmBatchPay')}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('payments.confirmBatchPayDesc')
                .replace('{count}', String(selectedCount))
                .replace('{amount}', fmtAmount(selectedTotal))}
            </p>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-5 py-2 bg-[var(--brand-mid)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary)] disabled:opacity-50 transition-colors"
              >
                {isPending ? t('common.processing') : t('payments.markAsPaid')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
