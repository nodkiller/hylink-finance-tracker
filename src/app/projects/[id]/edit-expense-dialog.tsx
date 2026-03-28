'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslation } from '@/i18n/context'
import { useRouter } from 'next/navigation'
import { updateExpense, deleteExpense } from '@/app/actions/expenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ExpenseEditData {
  id: string
  payee: string
  description: string
  invoice_number: string
  amount: number
  status: string
  attachment_url: string
  payment_date: string | null
}

interface Props {
  expense: ExpenseEditData
}

export default function EditExpenseDialog({ expense }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isPaid = expense.status === 'Paid'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('expense_id', expense.id)
    const file = fileRef.current?.files?.[0]
    if (file) formData.set('attachment', file)

    startTransition(async () => {
      const result = await updateExpense(undefined, formData)
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const formData = new FormData()
      formData.set('expense_id', expense.id)
      const result = await deleteExpense(undefined, formData)
      if (result && 'error' in result) {
        setError(result.error)
        setShowDeleteConfirm(false)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setShowDeleteConfirm(false) }}
        className="text-xs text-[#2B6CB0] hover:text-[#1a3555] hover:underline"
      >
        {t('common.edit')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('expenses.editExpenseRecord')}</DialogTitle>
          </DialogHeader>

          {!showDeleteConfirm ? (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="ee-payee">
                  {t('expenses.payee')} <span className="text-red-500">*</span>
                </Label>
                <Input id="ee-payee" name="payee" defaultValue={expense.payee} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ee-inv">
                  {t('expenses.vendorInvoice')} <span className="text-red-500">*</span>
                </Label>
                <Input id="ee-inv" name="invoice_number" defaultValue={expense.invoice_number} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ee-desc">
                  {t('expenses.expensePurpose')} <span className="text-red-500">*</span>
                </Label>
                <Textarea id="ee-desc" name="description" defaultValue={expense.description} rows={2} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ee-amt">
                  {t('expenses.amountAUD')} <span className="text-red-500">*</span>
                  {isPaid && <span className="ml-2 text-xs font-normal text-gray-400">{t('expenses.paidAmountNote')}</span>}
                </Label>
                <Input
                  id="ee-amt"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={expense.amount}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ee-date">{t('expenses.paymentDueDate')}</Label>
                <Input
                  id="ee-date"
                  name="payment_date"
                  type="date"
                  defaultValue={expense.payment_date ?? ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ee-file">{t('expenses.replaceAttachment')}</Label>
                <Input
                  id="ee-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                <a
                  href={expense.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  {t('expenses.viewCurrentAttachment')}
                </a>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  {t('expenses.deleteRecord')}
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? t('common.saving') : t('common.saveChanges')}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-sm text-red-700">
                {t('expenses.deleteExpenseConfirm')}
                <p className="font-medium mt-1">{expense.payee} &middot; A${Number(expense.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs mt-1 text-red-500">{t('expenses.cannotUndo')}</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                  {t('common.back')}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? t('common.deleting') : t('common.confirmDelete')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
