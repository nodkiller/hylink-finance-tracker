import { getDocumentsByToken } from '@/app/actions/accounting'
import { getServerT, getServerLocale } from '@/i18n/use-server-t'
import { FileArchive, ExternalLink, FileText, Receipt, Download } from 'lucide-react'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function AccountingViewPage({ params }: PageProps) {
  const { token } = await params
  const t = await getServerT()
  const locale = await getServerLocale()
  const result = await getDocumentsByToken(token)

  if (!result) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
          <div className="mb-4 text-gray-300">
            <FileArchive className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">
            {t('accounting.linkExpired')}
          </h1>
          <p className="text-sm text-gray-500">
            {locale === 'zh'
              ? '此链接已过期或无效，请联系管理员获取新链接。'
              : 'This link has expired or is invalid. Please contact your administrator for a new link.'}
          </p>
        </div>
      </div>
    )
  }

  const { documents, link } = result

  // Group documents by month
  const grouped = new Map<string, typeof documents>()
  for (const doc of documents) {
    const existing = grouped.get(doc.month) ?? []
    existing.push(doc)
    grouped.set(doc.month, existing)
  }
  const sortedMonths = [...grouped.keys()].sort().reverse()

  function fmt(n: number) {
    return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  const totalAmount = documents.reduce((sum, d) => sum + (d.amount ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <FileArchive className="w-5 h-5 text-[#2B6CB0]" />
            <h1 className="text-lg font-semibold text-[#1A202C]">
              {t('accounting.viewTitle')}
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            {link.label}
            <span className="mx-2 text-gray-300">|</span>
            {link.month_from} ~ {link.month_to}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {locale === 'zh' ? '总单据数' : 'Total Documents'}
            </p>
            <p className="text-xl font-bold text-[#1A202C] tabular-nums">{documents.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {locale === 'zh' ? '总金额' : 'Total Amount'}
            </p>
            <p className="text-xl font-bold text-[#1A202C] tabular-nums">{fmt(totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hidden sm:block">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {locale === 'zh' ? '月份范围' : 'Date Range'}
            </p>
            <p className="text-sm font-semibold text-[#1A202C]">{link.month_from} ~ {link.month_to}</p>
          </div>
        </div>

        {/* Documents by month */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <FileArchive className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t('accounting.noDocuments')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMonths.map(month => {
              const docs = grouped.get(month)!
              const monthTotal = docs.reduce((sum, d) => sum + (d.amount ?? 0), 0)
              return (
                <div key={month} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Month header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#F7FAFC' }}>
                    <h3 className="text-sm font-semibold text-[#4A5568]">{month}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {docs.length} {locale === 'zh' ? '个文件' : 'files'}
                      </span>
                      {monthTotal > 0 && (
                        <span className="text-xs font-mono font-medium text-gray-600">{fmt(monthTotal)}</span>
                      )}
                    </div>
                  </div>

                  {/* Document list */}
                  <div className="divide-y divide-gray-50">
                    {docs.map(doc => (
                      <div key={doc.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                        {/* Type icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          doc.doc_type === 'invoice'
                            ? 'bg-[#2B6CB0]/10 text-[#2B6CB0]'
                            : 'bg-[#38A169]/10 text-[#38A169]'
                        }`}>
                          {doc.doc_type === 'invoice' ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Receipt className="w-4 h-4" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
                              doc.doc_type === 'invoice'
                                ? 'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25'
                                : 'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25'
                            }`}>
                              {doc.doc_type === 'invoice'
                                ? (locale === 'zh' ? '发票' : 'Invoice')
                                : (locale === 'zh' ? '收据' : 'Receipt')
                              }
                            </span>
                            {doc.description && (
                              <span className="text-sm text-gray-700 truncate">{doc.description}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {doc.file_name}
                            <span className="mx-1.5">|</span>
                            {fmtDate(doc.created_at)}
                          </p>
                        </div>

                        {/* Amount */}
                        {doc.amount != null && (
                          <span className="text-sm font-mono font-medium text-gray-800 shrink-0">
                            {fmt(doc.amount)}
                          </span>
                        )}

                        {/* Download link */}
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-[#2B6CB0] transition-colors"
                          title={locale === 'zh' ? '下载' : 'Download'}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Hylink Finance Tracker
            <span className="mx-2">|</span>
            {locale === 'zh' ? '此链接将于' : 'This link expires on'}{' '}
            {new Date(link.expires_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
            {locale === 'zh' ? '过期' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
