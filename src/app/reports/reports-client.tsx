'use client'

import { useState } from 'react'
import { useTranslation } from '@/i18n/context'
import type { RawRevenue, RawExpense, RawProject, RawBrand } from './report-helpers'
import { TabButton } from './report-helpers'
import PLReport from './pl-report'
import AgingReport from './aging-report'
import PaymentAgingReport from './payment-aging-report'
import MarginReport from './margin-report'
import BudgetReport from './budget-report'
import ScheduleDialog from './schedule-dialog'
import type { ReportSchedule } from '@/app/actions/reports'
import { CalendarClock } from 'lucide-react'

interface Props {
  revenues: RawRevenue[]
  expenses: RawExpense[]
  projects: RawProject[]
  brands: RawBrand[]
  schedules?: ReportSchedule[]
  userRole?: string
}

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ── Main Client Component ─────────────────────────────────────────────────

export default function ReportsClient({ revenues, expenses, projects, brands, schedules = [], userRole }: Props) {
  const { t, locale } = useTranslation()
  const [activeTab, setActiveTab] = useState<'pl' | 'aging' | 'payment_aging' | 'margin' | 'budget'>('pl')
  const [range, setRange] = useState('year')
  const [brandFilter, setBrandFilter] = useState('all')

  const isPrivileged = userRole === 'Controller' || userRole === 'Admin' || userRole === 'Super Admin'

  const RANGE_OPTS = [
    { value: 'month', label: t('reports.thisMonth') },
    { value: 'quarter', label: t('reports.thisQuarter') },
    { value: 'year', label: t('reports.thisYear') },
    { value: 'all', label: t('reports.allTime') },
  ]

  // Build schedule info banner text
  function getScheduleBannerText(): string | null {
    if (schedules.length === 0) return null
    const s = schedules[0] // show most recent
    const freqText = s.frequency === 'weekly'
      ? (locale === 'zh' ? '每周' : 'Weekly')
      : (locale === 'zh' ? '每月' : 'Monthly')
    let dayText = ''
    if (s.frequency === 'weekly' && s.day_of_week !== null) {
      dayText = locale === 'zh' ? DAYS_ZH[s.day_of_week] : DAYS_EN[s.day_of_week]
    } else if (s.frequency === 'monthly' && s.day_of_month !== null) {
      dayText = locale === 'zh' ? `${s.day_of_month}日` : `${s.day_of_month}${getOrdinal(s.day_of_month)}`
    }
    const timeText = `${String(s.hour).padStart(2, '0')}:00`
    const extra = schedules.length > 1
      ? (locale === 'zh' ? ` (+${schedules.length - 1}个其他)` : ` (+${schedules.length - 1} more)`)
      : ''
    return locale === 'zh'
      ? `${freqText}报表已设定。下次：${dayText} ${timeText}${extra}`
      : `${freqText} report scheduled. Next: ${dayText} ${timeText}${extra}`
  }

  function getOrdinal(n: number) {
    if (n > 3 && n < 21) return 'th'
    switch (n % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  const bannerText = getScheduleBannerText()

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
          <TabButton active={activeTab === 'pl'} onClick={() => setActiveTab('pl')}>{t('reports.plReport')}</TabButton>
          <TabButton active={activeTab === 'aging'} onClick={() => setActiveTab('aging')}>{t('reports.agingReport')}</TabButton>
          <TabButton active={activeTab === 'payment_aging'} onClick={() => setActiveTab('payment_aging')}>{t('reports.paymentAgingReport')}</TabButton>
          <TabButton active={activeTab === 'margin'} onClick={() => setActiveTab('margin')}>{t('reports.marginRanking')}</TabButton>
          <TabButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')}>{t('reports.budgetVsActual')}</TabButton>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters (only for P&L and Budget tabs) */}
          {(activeTab === 'pl' || activeTab === 'budget') && (
            <>
              {activeTab === 'pl' && (
                <>
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                    {RANGE_OPTS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRange(opt.value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          range === opt.value ? 'bg-[#2B6CB0] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={brandFilter}
                    onChange={e => setBrandFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2B6CB0]/30"
                  >
                    <option value="all">{t('reports.allBrands')}</option>
                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </>
              )}
            </>
          )}

          {/* Schedule Delivery button */}
          {isPrivileged && (
            <ScheduleDialog schedules={schedules} userRole={userRole} />
          )}
        </div>
      </div>

      {/* Schedule info banner */}
      {isPrivileged && bannerText && (
        <div className="flex items-center gap-2 rounded-lg bg-[#2B6CB0]/[0.06] border border-[#2B6CB0]/15 px-4 py-2.5">
          <CalendarClock size={15} className="text-[#2B6CB0] shrink-0" />
          <p className="text-sm text-[#2B6CB0]">{bannerText}</p>
        </div>
      )}

      {/* Tab content */}
      <div>
        {activeTab === 'pl' && (
          <PLReport revenues={revenues} expenses={expenses} brands={brands} range={range} brandFilter={brandFilter} />
        )}
        {activeTab === 'aging' && (
          <AgingReport revenues={revenues} />
        )}
        {activeTab === 'payment_aging' && (
          <PaymentAgingReport expenses={expenses} />
        )}
        {activeTab === 'margin' && (
          <MarginReport revenues={revenues} expenses={expenses} projects={projects} />
        )}
        {activeTab === 'budget' && (
          <BudgetReport revenues={revenues} projects={projects} />
        )}
      </div>
    </div>
  )
}
