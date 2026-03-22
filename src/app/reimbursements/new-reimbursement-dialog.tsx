'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslation } from '@/i18n/context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import { createReimbursement } from '@/app/actions/reimbursements'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, FileIcon, ImageIcon } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: { id: string; name: string; project_code: string | null }[]
  userBankDetails: {
    bsb: string
    account: string
    accountName: string
  }
}

const CATEGORIES = [
  { value: 'travel', labelKey: 'reimbursement.categoryTravel' },
  { value: 'transport', labelKey: 'reimbursement.categoryTransport' },
  { value: 'dining', labelKey: 'reimbursement.categoryDining' },
  { value: 'office', labelKey: 'reimbursement.categoryOffice' },
  { value: 'other', labelKey: 'reimbursement.categoryOther' },
]

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function NewReimbursementDialog({ open, onOpenChange, projects, userBankDetails }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [projectId, setProjectId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const validFiles = files.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast(`File ${f.name} exceeds 10MB limit`, 'error')
        return false
      }
      return true
    })
    setSelectedFiles(prev => {
      const combined = [...prev, ...validFiles].slice(0, MAX_FILES)
      return combined
    })
    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (saveAsDraft: boolean) => {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(null)

      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('category', category)
      if (projectId) formData.set('project_id', projectId)
      formData.set('save_as_draft', saveAsDraft ? 'true' : 'false')

      // Clear existing file entries and add selected files
      formData.delete('receipts')
      for (const file of selectedFiles) {
        formData.append('receipts', file)
      }

      startTransition(async () => {
        const result = await createReimbursement(undefined, formData)
        if (result && 'error' in result) {
          setError(result.error)
          toast(result.error, 'error')
        } else {
          onOpenChange(false)
          setCategory('')
          setProjectId('')
          setSelectedFiles([])
          formRef.current?.reset()
          toast(
            saveAsDraft ? t('reimbursement.draftSaved') : t('reimbursement.reimbursementSubmitted'),
            'success'
          )
          router.refresh()
        }
      })
    }
  }

  const resetAndClose = () => {
    setError(null)
    setCategory('')
    setProjectId('')
    setSelectedFiles([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('reimbursement.newReimbursement').replace('+ ', '')}</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit(false)} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="rb-title">
              {t('reimbursement.reimbursementNo').replace('#', '')} Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rb-title"
              name="title"
              placeholder="e.g., Melbourne Trip Expenses"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>{t('reimbursement.category')} <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={v => v && setCategory(v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('reimbursement.category')} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Related Project */}
          <div className="space-y-1.5">
            <Label>{t('reimbursement.relatedProject')}</Label>
            <Select value={projectId} onValueChange={v => v && setProjectId(v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('reimbursement.relatedProject')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('common.none')}</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_code ? `${p.project_code} - ${p.name}` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Expense Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rb-amount">
                {t('reimbursement.amount')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rb-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rb-date">
                {t('reimbursement.expenseDate')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rb-date"
                name="expense_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="rb-desc">{t('reimbursement.description')}</Label>
            <Textarea
              id="rb-desc"
              name="description"
              placeholder="Describe what this expense was for..."
              rows={2}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-1.5">
            <Label>{t('reimbursement.receipts')}</Label>
            <div className="border border-dashed border-gray-300 rounded-lg p-3">
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5 text-sm">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileIcon className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="truncate flex-1 text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedFiles.length < MAX_FILES && (
                <div className="text-center">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleFilesChange}
                    className="hidden"
                    id="rb-file-input"
                  />
                  <label
                    htmlFor="rb-file-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2B6CB0] bg-[#2B6CB0]/5 rounded-md cursor-pointer hover:bg-[#2B6CB0]/10 transition-colors"
                  >
                    + Add Files
                  </label>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">{t('reimbursement.receiptsHelp')}</p>
          </div>

          {/* Bank Account Details */}
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <Label className="text-sm font-semibold text-gray-700">{t('reimbursement.bankAccount')}</Label>
            {userBankDetails.bsb && (
              <p className="text-xs text-gray-400">{t('reimbursement.bankAutoFill')}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rb-bsb" className="text-xs">{t('reimbursement.bsb')} <span className="text-red-500">*</span></Label>
                <Input
                  id="rb-bsb"
                  name="bank_bsb"
                  placeholder="000-000"
                  required
                  defaultValue={userBankDetails.bsb}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rb-accnum" className="text-xs">{t('reimbursement.accountNumber')} <span className="text-red-500">*</span></Label>
                <Input
                  id="rb-accnum"
                  name="bank_account"
                  placeholder="12345678"
                  required
                  defaultValue={userBankDetails.account}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rb-accname" className="text-xs">{t('reimbursement.accountName')} <span className="text-red-500">*</span></Label>
              <Input
                id="rb-accname"
                name="bank_account_name"
                placeholder="John Doe"
                required
                defaultValue={userBankDetails.accountName}
              />
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={(e) => {
                const form = formRef.current
                if (!form) return
                // Trigger form submit with draft flag
                const formData = new FormData(form)
                formData.set('category', category)
                if (projectId && projectId !== '__none__') formData.set('project_id', projectId)
                formData.set('save_as_draft', 'true')
                formData.delete('receipts')
                for (const file of selectedFiles) {
                  formData.append('receipts', file)
                }
                setError(null)
                startTransition(async () => {
                  const result = await createReimbursement(undefined, formData)
                  if (result && 'error' in result) {
                    setError(result.error)
                    toast(result.error, 'error')
                  } else {
                    onOpenChange(false)
                    setCategory('')
                    setProjectId('')
                    setSelectedFiles([])
                    formRef.current?.reset()
                    toast(t('reimbursement.draftSaved'), 'success')
                    router.refresh()
                  }
                })
              }}
            >
              {t('reimbursement.saveDraft')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/>
                  </svg>
                  {t('common.submitting')}
                </>
              ) : t('reimbursement.submitReimbursement')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
