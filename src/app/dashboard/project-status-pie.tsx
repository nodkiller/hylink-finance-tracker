'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from '@/i18n/context'

export interface StatusCount {
  status: string
  count: number
}

interface Props {
  data: StatusCount[]
}

const STATUS_COLORS: Record<string, string> = {
  'Active': '#38A169',
  'Pending Approval': '#DD6B20',
  'Completed': '#2B6CB0',
  'Rejected': '#E53E3E',
  'Reconciled': '#9ca3af',
}

export default function ProjectStatusPie({ data }: Props) {
  const { t } = useTranslation()

  const STATUS_LABELS: Record<string, string> = {
    'Active': t('status.active'),
    'Pending Approval': t('status.pendingApproval'),
    'Completed': t('status.completed'),
    'Rejected': t('status.rejected'),
    'Reconciled': t('status.reconciled'),
  }

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const p = payload[0]
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-700">
          {STATUS_LABELS[p.name] ?? p.name}
        </p>
        <p style={{ color: STATUS_COLORS[p.name] ?? '#9ca3af' }}>
          {p.value}
        </p>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
        {t('common.noData')}
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="count"
          nameKey="status"
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] ?? '#e5e7eb'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-gray-500">
              {STATUS_LABELS[value] ?? value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
