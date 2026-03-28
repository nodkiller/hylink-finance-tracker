'use client'

import { useState, useActionState } from 'react'
import { useTranslation } from '@/i18n/context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
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
  approveReimbursement,
  rejectReimbursement,
  requestInfoReimbursement,
  markReimbursementPaid,
  submitReimbursement,
  deleteReimbursement,
} from '@/app/actions/reimbursements'
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  ImageIcon,
  Send,
  Trash2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'

interface ReimbursementData {
  id: string
  reimbursement_no: string
  title: string
  category: string
  project_id: string | null
  amount: number
  expense_date: string
  description: string | null
  receipt_urls: string[]
  bank_bsb: string
  bank_account: string
  bank_account_name: string
  status: string
  submitted_by: string
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  approval_comment: string | null
  paid_at: string | null
  paid_by: string | null
  created_at: string
  updated_at: string
  submitter_name: string
  approver_name: string | null
  paid_by_name: string | null
  project_name: string | null
}

interface Props {
  reimbursement: ReimbursementData
  isApprover: boolean
  isOwner: boolean
  locale: string
  userRole?: string
}

type ActionState = { error: string } | { success: boolean } | undefined

const STATUS_STYLES: Record<string, string> = {
  draft:                'bg-gray-100 text-gray-500 border-gray-200',
  pending:              'bg-[#DD6B20]/10 text-[#DD6B20] border-[#DD6B20]/25',
  needs_info:           'bg-purple-50 text-purple-700 border-purple-200',
  controller_approved:  'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/25',
  approved:             'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  paid:                 'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
  rejected:             'bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/25',
}

const CATEGORY_KEYS: Record<string, string> = {
  travel: 'reimbursement.categoryTravel',
  transport: 'reimbursement.categoryTransport',
  dining: 'reimbursement.categoryDining',
  office: 'reimbursement.categoryOffice',
  other: 'reimbursement.categoryOther',
}

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function maskAccount(acc: string) {
  if (acc.length <= 4) return acc
  return '*'.repeat(acc.length - 4) + acc.slice(-4)
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)/i.test(url)
}

export default function ReimbursementDetail({ reimbursement: r, isApprover, isOwner, locale, userRole }: Props) {
  const isSuperAdmin = userRole === 'Super Admin'
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  function fmtDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  function fmtDateTime(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('reimbursement.draft')
      case 'pending': return t('reimbursement.pending')
      case 'needs_info': return t('reimbursement.needsInfo')
      case 'approved': return t('reimbursement.approvedAwaitingPayment')
      case 'paid': return t('reimbursement.reimbursed')
      case 'rejected': return t('reimbursement.rejected')
      default: return status
    }
  }

  // Approve action
  const approveAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await approveReimbursement(_prev, formData)
    if (result && 'success' in result && result.success) {
      toast(t('reimbursement.reimbursementApproved'), 'success')
      router.refresh()
    }
    return result
  }
  const [approveState, approveFormAction, approvePending] = useActionState(approveAction, undefined)

  // Reject action
  const rejectAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await rejectReimbursement(_prev, formData)
    if (result && 'success' in result && result.success) {
      setRejectDialogOpen(false)
      toast(t('reimbursement.reimbursementRejected'), 'error')
      router.refresh()
    }
    return result
  }
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, undefined)

  // Request info action
  const infoAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await requestInfoReimbursement(_prev, formData)
    if (result && 'success' in result && result.success) {
      setInfoDialogOpen(false)
      toast(t('reimbursement.infoRequested'), 'info')
      router.refresh()
    }
    return result
  }
  const [infoState, infoFormAction, infoPending] = useActionState(infoAction, undefined)

  // Mark paid action
  const paidAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await markReimbursementPaid(_prev, formData)
    if (result && 'success' in result && result.success) {
      setPaidDialogOpen(false)
      toast(t('reimbursement.reimbursementPaid'), 'success')
      router.refresh()
    }
    return result
  }
  const [paidState, paidFormAction, paidPending] = useActionState(paidAction, undefined)

  // Submit draft action
  const submitAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await submitReimbursement(_prev, formData)
    if (result && 'success' in result && result.success) {
      toast(t('reimbursement.reimbursementSubmitted'), 'success')
      router.refresh()
    }
    return result
  }
  const [submitState, submitFormAction, submitPending] = useActionState(submitAction, undefined)

  // Delete action
  const deleteAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await deleteReimbursement(_prev, formData)
    if (result && 'success' in result && result.success) {
      setDeleteDialogOpen(false)
      toast('Reimbursement deleted', 'success')
      router.push('/reimbursements')
    }
    return result
  }
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, undefined)

  // Build timeline
  const timeline: { date: string; icon: React.ReactNode; label: string; detail?: string; color: string }[] = []

  timeline.push({
    date: r.created_at,
    icon: <FileText className="w-4 h-4" />,
    label: 'Created',
    detail: `by ${r.submitter_name}`,
    color: 'text-gray-500',
  })

  if (r.submitted_at) {
    timeline.push({
      date: r.submitted_at,
      icon: <Send className="w-4 h-4" />,
      label: 'Submitted for approval',
      color: 'text-[#DD6B20]',
    })
  }

  if (r.status === 'needs_info' && r.approval_comment) {
    timeline.push({
      date: r.updated_at,
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'More info requested',
      detail: r.approval_comment,
      color: 'text-purple-600',
    })
  }

  if (r.approved_at && r.status === 'controller_approved') {
    timeline.push({
      date: r.approved_at,
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Reviewed by Controller',
      detail: r.approver_name ? `by ${r.approver_name}${r.approval_comment ? ` - ${r.approval_comment}` : ''} — awaiting Super Admin approval` : 'Awaiting Super Admin approval',
      color: 'text-[#2563eb]',
    })
  }

  if (r.approved_at && (r.status === 'approved' || r.status === 'paid')) {
    timeline.push({
      date: r.approved_at,
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Approved',
      detail: r.approver_name ? `by ${r.approver_name}${r.approval_comment ? ` - ${r.approval_comment}` : ''}` : undefined,
      color: 'text-[#2B6CB0]',
    })
  }

  if (r.approved_at && r.status === 'rejected') {
    timeline.push({
      date: r.approved_at,
      icon: <XCircle className="w-4 h-4" />,
      label: 'Rejected',
      detail: r.approver_name ? `by ${r.approver_name}${r.approval_comment ? ` - ${r.approval_comment}` : ''}` : undefined,
      color: 'text-[#E53E3E]',
    })
  }

  if (r.paid_at) {
    timeline.push({
      date: r.paid_at,
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Reimbursed',
      detail: r.paid_by_name ? `by ${r.paid_by_name}` : undefined,
      color: 'text-[#38A169]',
    })
  }

  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Left: Main Info */}
        <div className="md:col-span-2 space-y-4">
          {/* Reimbursement Info Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">{t('reimbursement.reimbursementNo')}</p>
                <p className="text-2xl font-bold font-mono text-gray-900 tracking-wide">
                  {r.reimbursement_no}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[r.status] ?? ''}`}>
                {statusLabel(r.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Title</p>
                <p className="text-sm font-medium text-gray-900">{r.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t('reimbursement.category')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {t(CATEGORY_KEYS[r.category] ?? 'reimbursement.categoryOther')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t('common.amount')}</p>
                <p className="text-lg font-semibold text-gray-900">{fmt(r.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{t('reimbursement.expenseDate')}</p>
                <p className="text-sm font-medium text-gray-900">{fmtDate(r.expense_date)}</p>
              </div>
              {r.project_name && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">{t('reimbursement.relatedProject')}</p>
                  <p className="text-sm font-medium text-gray-900">{r.project_name}</p>
                </div>
              )}
              {r.description && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">{t('reimbursement.description')}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Receipt Attachments */}
          {r.receipt_urls.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('reimbursement.receipts')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {r.receipt_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-lg border border-gray-200 overflow-hidden hover:border-[#2B6CB0] hover:shadow-md transition-all"
                  >
                    {isImageUrl(url) ? (
                      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Receipt ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gray-50 flex flex-col items-center justify-center gap-2">
                        <FileText className="w-8 h-8 text-red-400" />
                        <span className="text-xs text-gray-500">PDF</span>
                      </div>
                    )}
                    <div className="px-2 py-1.5 text-xs text-gray-500 truncate">
                      Receipt {idx + 1}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Approval Actions — Controller: pending/needs_info → controller_approved; Super Admin: pending/needs_info/controller_approved → approved */}
          {isApprover && (
            r.status === 'pending' || r.status === 'needs_info' ||
            (isSuperAdmin && r.status === 'controller_approved')
          ) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Approval Actions</h3>

              {/* Approve with optional comment */}
              <form action={approveFormAction} className="mb-3">
                <input type="hidden" name="reimbursement_id" value={r.id} />
                <div className="space-y-2">
                  <Textarea
                    name="comment"
                    placeholder={t('reimbursement.commentPlaceholder')}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={approvePending}
                      className="bg-[#38A169] hover:bg-[#2d6235] text-white border-0 gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {approvePending ? t('common.processing') : t('reimbursement.approveReimbursement')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRejectDialogOpen(true)}
                      className="text-[#E53E3E] border-[#E53E3E]/30 hover:bg-[#E53E3E]/5 gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {t('reimbursement.rejectReimbursement')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInfoDialogOpen(true)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t('reimbursement.requestInfo')}
                    </Button>
                  </div>
                </div>
                {approveState && 'error' in approveState && (
                  <p className="text-sm text-red-600 mt-2">{approveState.error}</p>
                )}
              </form>
            </div>
          )}

          {/* Mark as Paid — Super Admin only, after final approval */}
          {isSuperAdmin && r.status === 'approved' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <Button
                onClick={() => setPaidDialogOpen(true)}
                className="bg-[#38A169] hover:bg-[#2d6235] text-white border-0 gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                {t('reimbursement.markAsPaid')}
              </Button>
            </div>
          )}

          {/* Draft actions for owner */}
          {isOwner && r.status === 'draft' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex gap-2">
              <form action={submitFormAction}>
                <input type="hidden" name="reimbursement_id" value={r.id} />
                <Button type="submit" disabled={submitPending} className="gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  {submitPending ? t('common.submitting') : t('reimbursement.submitReimbursement')}
                </Button>
              </form>
              {submitState && 'error' in submitState && (
                <p className="text-sm text-red-600 self-center">{submitState.error}</p>
              )}
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-[#E53E3E] border-[#E53E3E]/30 hover:bg-[#E53E3E]/5 gap-1.5 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('common.delete')}
              </Button>
            </div>
          )}
        </div>

        {/* Right: Meta Info */}
        <div className="space-y-4">
          {/* Meta Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('reimbursement.applicant')}</p>
              <p className="text-sm font-medium text-gray-900">{r.submitter_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('common.amount')}</p>
              <p className="text-lg font-bold text-gray-900">{fmt(r.amount)}</p>
            </div>
            <div className="border-t border-gray-50 pt-3">
              <p className="text-xs text-gray-400 mb-2">{t('reimbursement.bankAccount')}</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('reimbursement.bsb')}</span>
                  <span className="font-mono text-gray-900">{r.bank_bsb}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('reimbursement.accountNumber')}</span>
                  <span className="font-mono text-gray-900">{maskAccount(r.bank_account)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('reimbursement.accountName')}</span>
                  <span className="text-gray-900">{r.bank_account_name}</span>
                </div>
              </div>
            </div>
            {r.approver_name && (
              <div className="border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400 mb-0.5">Approver</p>
                <p className="text-sm font-medium text-gray-900">{r.approver_name}</p>
                {r.approved_at && <p className="text-xs text-gray-400">{fmtDateTime(r.approved_at)}</p>}
              </div>
            )}
            {r.approval_comment && (
              <div className="border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400 mb-0.5">{t('reimbursement.approvalComment')}</p>
                <p className="text-sm text-gray-600">{r.approval_comment}</p>
              </div>
            )}
            {r.paid_by_name && (
              <div className="border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400 mb-0.5">Paid By</p>
                <p className="text-sm font-medium text-gray-900">{r.paid_by_name}</p>
                {r.paid_at && <p className="text-xs text-gray-400">{fmtDateTime(r.paid_at)}</p>}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-0">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`${event.color} shrink-0`}>{event.icon}</div>
                    {idx < timeline.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <p className="text-sm font-medium text-gray-900">{event.label}</p>
                    {event.detail && (
                      <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('reimbursement.rejectReimbursement')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {r.reimbursement_no} - {fmt(r.amount)}
          </p>
          <form action={rejectFormAction} className="space-y-4 pt-1">
            <input type="hidden" name="reimbursement_id" value={r.id} />
            <div className="space-y-1.5">
              <Label>
                {t('reimbursement.approvalComment')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                name="comment"
                placeholder={t('reimbursement.commentPlaceholder')}
                required
                rows={3}
                autoFocus
              />
            </div>
            {rejectState && 'error' in rejectState && (
              <p className="text-sm text-red-600">{rejectState.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={rejectPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={rejectPending}
                className="bg-[#E53E3E] hover:bg-[#a93226] text-white border-0">
                {rejectPending ? t('common.processing') : t('reimbursement.rejectReimbursement')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('reimbursement.requestInfo')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {r.reimbursement_no} - {fmt(r.amount)}
          </p>
          <form action={infoFormAction} className="space-y-4 pt-1">
            <input type="hidden" name="reimbursement_id" value={r.id} />
            <div className="space-y-1.5">
              <Label>
                {t('reimbursement.approvalComment')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                name="comment"
                placeholder="What additional information is needed?"
                required
                rows={3}
                autoFocus
              />
            </div>
            {infoState && 'error' in infoState && (
              <p className="text-sm text-red-600">{infoState.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setInfoDialogOpen(false)} disabled={infoPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={infoPending}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                {infoPending ? t('common.processing') : t('reimbursement.requestInfo')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('reimbursement.confirmPaid')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            {t('reimbursement.confirmPaidDesc')
              .replace('{amount}', Number(r.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 }))
              .replace('{name}', r.bank_account_name)
              .replace('{bsb}', r.bank_bsb)}
          </p>
          <form action={paidFormAction} className="space-y-4 pt-1">
            <input type="hidden" name="reimbursement_id" value={r.id} />
            {paidState && 'error' in paidState && (
              <p className="text-sm text-red-600">{paidState.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setPaidDialogOpen(false)} disabled={paidPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={paidPending}
                className="bg-[#38A169] hover:bg-[#2d6235] text-white border-0">
                {paidPending ? t('common.processing') : t('reimbursement.markAsPaid')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">{t('common.deleteWarning')}</p>
          <form action={deleteFormAction} className="space-y-4 pt-1">
            <input type="hidden" name="reimbursement_id" value={r.id} />
            {deleteState && 'error' in deleteState && (
              <p className="text-sm text-red-600">{deleteState.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deletePending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={deletePending}
                className="bg-[#E53E3E] hover:bg-[#a93226] text-white border-0">
                {deletePending ? t('common.processing') : t('common.delete')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
