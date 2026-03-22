'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from '@/i18n/context'

export interface BrandBarData {
  name: string
  revenue: number
}

interface Props {
  data: BrandBarData[]
}

function fmtY(n: number) {
  if (n >= 1000) return `A$${(n / 1000).toFixed(0)}k`
  return `A$${n}`
}

export default function BrandBarChart({ data }: Props) {
  const { t } = useTranslation()

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        <p style={{ color: '#2B6CB0' }}>
          {t('dashboard.revenue')}:{' '}
          <span className="font-medium">
            A${Number(payload[0].value).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </span>
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
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtY}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" fill="#2B6CB0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
