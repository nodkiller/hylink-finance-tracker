'use client'

import { useTranslation } from '@/i18n/context'

export interface ApprovalRecord {
  id: string
  action: 'approved' | 'rejected'
  comment: string | null
  approver_name: string
  created_at: string
}

interface Props {
  approvals: ApprovalRecord[]
}

export default function ApprovalHistory({ approvals }: Props) {
  const { t, locale } = useTranslation()

  if (approvals.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{t('projects.approvalHistory')}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {approvals.map(a => (
          <div key={a.id} className="px-5 py-4 flex items-start gap-3">
            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
              a.action === 'approved' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${
                  a.action === 'approved' ? 'text-[#38A169]' : 'text-[#E53E3E]'
                }`}>
                  {a.action === 'approved' ? t('common.approved') : t('common.rejected')}
                </span>
                <span className="text-xs text-gray-400">{a.approver_name}</span>
                <span className="text-xs text-gray-300">&middot;</span>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              {a.comment && (
                <p className="text-sm text-gray-600 mt-1">{a.comment}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
