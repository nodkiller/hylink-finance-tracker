'use client'

import { useState, useRef, useTransition } from 'react'
import { useTranslation } from '@/i18n/context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import EmptyState from '@/components/empty-state'
import { uploadDocument, deleteDocument, createMagicLink, deleteMagicLink } from '@/app/actions/accounting'
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
import {
  FileArchive,
  Upload,
  Trash2,
  Link2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Receipt,
  X,
  FileIcon,
  ImageIcon,
} from 'lucide-react'

export interface DocumentItem {
  id: string
  month: string
  doc_type: string
  description: string | null
  amount: number | null
  file_url: string
  file_name: string
  project_id: string | null
  uploaded_by: string
  created_at: string
  uploader_name: string
  project_name: string | null
}

export interface LinkItem {
  id: string
  token: string
  label: string
  month_from: string
  month_to: string
  created_by: string
  expires_at: string
  created_at: string
}

interface Props {
  documents: DocumentItem[]
  links: LinkItem[]
  isApprover: boolean
  locale: string
  projects: { id: string; name: string; project_code: string | null }[]
  currentUserId: string
}

function fmt(n: number) {
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

const DOC_TYPE_STYLES: Record<string, string> = {
  invoice: 'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  receipt: 'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function AccountingClient({
  documents,
  links,
  isApprover,
  locale,
  projects,
  currentUserId,
}: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState('invoice')
  const [projectId, setProjectId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // Magic link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkPending, startLinkTransition] = useTransition()
  const linkFormRef = useRef<HTMLFormElement>(null)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Filters
  const [monthFilter, setMonthFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Derive unique months for filter
  const availableMonths = [...new Set(documents.map(d => d.month))].sort().reverse()

  // Apply filters
  const filtered = documents.filter(d => {
    if (monthFilter !== 'all' && d.month !== monthFilter) return false
    if (typeFilter !== 'all' && d.doc_type !== typeFilter) return false
    return true
  })

  function fmtDate(d: string | null) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  // File handling for upload
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const validFiles = files.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast(`File ${f.name} exceeds 10MB limit`, 'error')
        return false
      }
      return true
    })
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 10))
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Upload submit handler
  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('doc_type', docType)
    if (projectId && projectId !== '__none__') {
      formData.set('project_id', projectId)
    } else {
      formData.delete('project_id')
    }
    // Replace file entries with selected files
    formData.delete('files')
    for (const file of selectedFiles) {
      formData.append('files', file)
    }

    startTransition(async () => {
      const result = await uploadDocument(undefined, formData)
      if (result && 'error' in result) {
        toast(t(result.error), 'error')
      } else {
        setUploadOpen(false)
        setDocType('invoice')
        setProjectId('')
        setSelectedFiles([])
        formRef.current?.reset()
        toast(t('accounting.uploadDocument') + ' - OK', 'success')
        router.refresh()
      }
    })
  }

  // Delete document handler
  const handleDelete = (docId: string) => {
    if (!confirm(t('common.deleteWarning'))) return
    const formData = new FormData()
    formData.set('document_id', docId)
    startTransition(async () => {
      const result = await deleteDocument(undefined, formData)
      if (result && 'error' in result) {
        toast(t(result.error), 'error')
      } else {
        toast(t('common.delete') + ' - OK', 'success')
        router.refresh()
      }
    })
  }

  // Magic link submit handler
  const handleLinkSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startLinkTransition(async () => {
      const result = await createMagicLink(undefined, formData)
      if (result && 'error' in result) {
        toast(t(result.error), 'error')
      } else if (result && 'token' in result && result.token) {
        setGeneratedToken(result.token)
        linkFormRef.current?.reset()
        toast(t('accounting.generateLink') + ' - OK', 'success')
        router.refresh()
      }
    })
  }

  // Delete magic link handler
  const handleDeleteLink = (linkId: string) => {
    if (!confirm(t('common.deleteWarning'))) return
    const formData = new FormData()
    formData.set('link_id', linkId)
    startLinkTransition(async () => {
      const result = await deleteMagicLink(undefined, formData)
      if (result && 'error' in result) {
        toast(t(result.error), 'error')
      } else {
        toast(t('common.delete') + ' - OK', 'success')
        router.refresh()
      }
    })
  }

  // Copy link to clipboard
  const copyLink = (token: string, id: string) => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${siteUrl}/accounting/view/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      toast(t('accounting.linkCopied'), 'success')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const resetUploadDialog = () => {
    setUploadOpen(false)
    setDocType('invoice')
    setProjectId('')
    setSelectedFiles([])
  }

  const resetLinkDialog = () => {
    setLinkDialogOpen(false)
    setGeneratedToken(null)
  }

  // Get current month as default for the month picker
  const defaultMonth = new Date().toISOString().slice(0, 7)

  return (
    <>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Month filter */}
          <Select value={monthFilter} onValueChange={v => v && setMonthFilter(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder={t('accounting.month')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={v => v && setTypeFilter(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder={t('accounting.docType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="invoice">{t('accounting.invoice')}</SelectItem>
              <SelectItem value="receipt">{t('accounting.receipt')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {isApprover && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLinkDialogOpen(true)}
              className="h-8 text-xs px-3 gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              {t('accounting.generateLink')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="h-8 text-xs px-3 gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {t('accounting.uploadDocument')}
          </Button>
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileArchive className="w-8 h-8" />}
            title={documents.length === 0 ? t('accounting.noDocuments') : t('accounting.noDocuments')}
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(d => (
                <div key={d.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{d.month}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${DOC_TYPE_STYLES[d.doc_type] ?? ''}`}>
                          {d.doc_type === 'invoice' ? t('accounting.invoice') : t('accounting.receipt')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 truncate">
                        {d.description || d.file_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.uploader_name}</p>
                    </div>
                    {d.amount != null && (
                      <p className="text-sm font-mono font-semibold text-gray-800 shrink-0">{fmt(d.amount)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2B6CB0] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {d.file_name}
                    </a>
                    {(d.uploaded_by === currentUserId || isApprover) && (
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                        disabled={isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="border-b border-gray-100" style={{ backgroundColor: '#F7FAFC' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">{t('accounting.month')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-24">{t('accounting.docType')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">{t('accounting.description')}</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#4A5568] w-28">{t('accounting.amount')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568]">{t('accounting.fileName')}</th>
                  {isApprover && (
                    <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">{t('accounting.uploadedBy')}</th>
                  )}
                  <th className="text-left px-4 py-3 font-semibold text-[#4A5568] w-28">{t('accounting.uploadDate')}</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#4A5568] w-16">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`animate-fade-in-up transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white hover:bg-[#EBF8FF]/50'
                        : 'bg-[#F7FAFC]/60 hover:bg-[#EBF8FF]/50'
                    }`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.month}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${DOC_TYPE_STYLES[d.doc_type] ?? ''}`}>
                        {d.doc_type === 'invoice' ? t('accounting.invoice') : t('accounting.receipt')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">
                      {d.description || '-'}
                      {d.project_name && (
                        <span className="ml-2 text-xs text-gray-400">[{d.project_name}]</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-medium">
                      {d.amount != null ? fmt(d.amount) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2B6CB0] hover:underline flex items-center gap-1 max-w-[200px] truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{d.file_name}</span>
                      </a>
                    </td>
                    {isApprover && (
                      <td className="px-4 py-3 text-xs text-gray-500">{d.uploader_name}</td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      {(d.uploaded_by === currentUserId || isApprover) && (
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          disabled={isPending}
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Magic Links Section (Approvers only) */}
      {isApprover && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100" style={{ backgroundColor: '#F7FAFC' }}>
            <h2 className="text-sm font-semibold text-[#4A5568] flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              {t('accounting.magicLinks')}
            </h2>
          </div>

          {links.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              {locale === 'zh' ? '暂无分享链接' : 'No shared links yet'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {links.map(link => {
                const isExpired = new Date(link.expires_at) < new Date()
                return (
                  <div key={link.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{link.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {link.month_from} ~ {link.month_to}
                        <span className="mx-2">|</span>
                        {isExpired ? (
                          <span className="text-red-500">{t('accounting.linkExpired')}</span>
                        ) : (
                          <span className="text-gray-400">
                            {locale === 'zh' ? '有效至' : 'Expires'}: {fmtDate(link.expires_at)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isExpired && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => copyLink(link.token, link.id)}
                        >
                          {copiedId === link.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedId === link.id ? t('accounting.linkCopied') : t('accounting.copyLink')}
                        </Button>
                      )}
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        disabled={linkPending}
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Dialog */}
      <Dialog open={uploadOpen} onOpenChange={resetUploadDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('accounting.uploadDocument')}</DialogTitle>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* Month */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-month">
                {t('accounting.month')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="acc-month"
                name="month"
                type="month"
                required
                defaultValue={defaultMonth}
              />
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <Label>{t('accounting.docType')} <span className="text-red-500">*</span></Label>
              <Select value={docType} onValueChange={v => v && setDocType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">{t('accounting.invoice')}</SelectItem>
                  <SelectItem value="receipt">{t('accounting.receipt')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-desc">{t('accounting.description')}</Label>
              <Input
                id="acc-desc"
                name="description"
                placeholder={locale === 'zh' ? '发票/收据描述...' : 'Invoice/receipt description...'}
              />
            </div>

            {/* Amount + Project in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-amount">{t('accounting.amount')}</Label>
                <Input
                  id="acc-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{locale === 'zh' ? '关联项目' : 'Project'}</Label>
                <Select value={projectId} onValueChange={v => v && setProjectId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.none')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('common.none')}</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code ? `${p.project_code}` : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <Label>{t('accounting.fileName')} <span className="text-red-500">*</span></Label>
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
                {selectedFiles.length < 10 && (
                  <div className="text-center">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFilesChange}
                      className="hidden"
                      id="acc-file-input"
                    />
                    <label
                      htmlFor="acc-file-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2B6CB0] bg-[#2B6CB0]/5 rounded-md cursor-pointer hover:bg-[#2B6CB0]/10 transition-colors"
                    >
                      + {locale === 'zh' ? '添加文件' : 'Add Files'}
                    </label>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {locale === 'zh'
                  ? '支持 PDF、JPG、PNG，单文件最大 10MB，最多 10 个'
                  : 'Supports PDF, JPG, PNG. Max 10MB each, up to 10 files.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={resetUploadDialog}
                disabled={isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending || selectedFiles.length === 0}>
                {isPending ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/>
                    </svg>
                    {t('common.submitting')}
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    {t('common.submit')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Magic Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={resetLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('accounting.generateLink')}</DialogTitle>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-green-800 mb-2">
                  {locale === 'zh' ? '链接已生成!' : 'Link generated!'}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/accounting/view/${generatedToken}`}
                    className="text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/accounting/view/${generatedToken}`
                      navigator.clipboard.writeText(url)
                      toast(t('accounting.linkCopied'), 'success')
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={resetLinkDialog}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          ) : (
            <form ref={linkFormRef} onSubmit={handleLinkSubmit} className="space-y-4 pt-2">
              {/* Label */}
              <div className="space-y-1.5">
                <Label htmlFor="link-label">
                  {t('accounting.linkLabel')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="link-label"
                  name="label"
                  required
                  placeholder={locale === 'zh' ? '例：2026年Q1单据' : 'e.g., Q1 2026 Documents'}
                />
              </div>

              {/* Month range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="link-from">
                    {t('accounting.monthFrom')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="link-from"
                    name="month_from"
                    type="month"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="link-to">
                    {t('accounting.monthTo')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="link-to"
                    name="month_to"
                    type="month"
                    required
                  />
                </div>
              </div>

              {/* Expiry days */}
              <div className="space-y-1.5">
                <Label htmlFor="link-expiry">{t('accounting.expiryDays')}</Label>
                <Input
                  id="link-expiry"
                  name="expires_days"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue="30"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetLinkDialog}
                  disabled={linkPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={linkPending}>
                  {linkPending ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/>
                      </svg>
                      {t('common.processing')}
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 mr-1" />
                      {t('accounting.generateLink')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
