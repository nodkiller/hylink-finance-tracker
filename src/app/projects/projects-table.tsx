'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ProjectRow {
  id: string
  project_code: string | null
  brand_name: string
  name: string
  type: string
  status: string
  estimated_revenue: number | null
  total_revenue: number
  total_expenses: number
}

interface Props {
  projects: ProjectRow[]
  brands: string[]
}

const STATUS_COLORS: Record<string, string> = {
  'Active':           'bg-[#3A7D44]/10 text-[#3A7D44] border-[#3A7D44]/25',
  'Pending Approval': 'bg-[#D48E00]/10 text-[#D48E00] border-[#D48E00]/25',
  'Completed':        'bg-[#2A4A6B]/10 text-[#2A4A6B] border-[#2A4A6B]/25',
  'Reconciled':       'bg-gray-100 text-gray-500 border-gray-200',
  'Rejected':         'bg-[#C0392B]/10 text-[#C0392B] border-[#C0392B]/25',
}

function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}


function exportCSV(rows: ProjectRow[]) {
  const headers = ['项目代码', '品牌', '项目名称', '类型', '预估收入', '实际总收入', '实际总支出', '利润', '状态']
  const csvRows = rows.map(p => {
    const profit = p.total_revenue - p.total_expenses
    return [
      p.project_code ?? '',
      p.brand_name,
      p.name,
      p.type,
      p.estimated_revenue ?? '',
      p.total_revenue,
      p.total_expenses,
      profit,
      p.status,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = '\ufeff' + [headers.join(','), ...csvRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `hylink-report-${date}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ProjectsTable({ projects, brands }: Props) {
  const router = useRouter()
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const allStatuses = useMemo(() => {
    const s = new Set(projects.map(p => p.status))
    return Array.from(s).sort()
  }, [projects])

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (brandFilter !== 'all' && p.brand_name !== brandFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
  }, [projects, brandFilter, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={brandFilter} onValueChange={(v) => v && setBrandFilter(v)}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="品牌" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部品牌</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-sm text-gray-400">共 {filtered.length} 个项目</span>
          <button
            onClick={() => exportCSV(filtered)}
            className="text-xs text-[#2A4A6B] border border-[#2A4A6B]/30 rounded-md px-3 py-1.5 hover:bg-[#2A4A6B]/5 transition-colors font-medium"
          >
            导出 CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">项目代码</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">品牌</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">项目名称</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">类型</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">状态</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 w-28">预估收入</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 w-28">实际收入</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 w-28">实际支出</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 w-28">利润</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => {
              const profit = p.total_revenue - p.total_expenses
              return (
                <tr
                  key={p.id}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => router.push(`/projects/${p.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.project_code ?? <span className="text-gray-300 italic">待分配</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">{p.brand_name}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{p.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 font-mono text-xs">
                    {p.estimated_revenue != null ? fmt(p.estimated_revenue) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-900">
                    {p.total_revenue > 0 ? fmt(p.total_revenue) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-900">
                    {p.total_expenses > 0 ? fmt(p.total_expenses) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-medium ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {p.total_revenue > 0 || p.total_expenses > 0 ? fmt(profit) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                  暂无符合条件的项目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

