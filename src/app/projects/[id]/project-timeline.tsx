export interface TimelineEvent {
  id: string
  date: string
  type: string
  title: string
  subtitle?: string
  color: 'green' | 'blue' | 'red' | 'amber' | 'gray'
}

const DOT_COLORS: Record<string, string> = {
  green: 'bg-[#38A169]',
  blue:  'bg-[#2B6CB0]',
  red:   'bg-[#E53E3E]',
  amber: 'bg-[#DD6B20]',
  gray:  'bg-gray-400',
}

const TEXT_COLORS: Record<string, string> = {
  green: 'text-[#38A169]',
  blue:  'text-[#2B6CB0]',
  red:   'text-[#E53E3E]',
  amber: 'text-[#DD6B20]',
  gray:  'text-gray-600',
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  events: TimelineEvent[]
}

export default function ProjectTimeline({ events }: Props) {
  if (events.length === 0) return null

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">项目时间线</h2>
      </div>

      <div className="px-5 py-5">
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-100" />

          <div className="space-y-5">
            {sorted.map(event => (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Dot */}
                <div className={`relative z-10 mt-0.5 w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center ${DOT_COLORS[event.color]}`}>
                  <div className="w-2 h-2 rounded-full bg-white opacity-90" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${TEXT_COLORS[event.color]}`}>
                    {event.title}
                  </p>
                  {event.subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{event.subtitle}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-0.5">{fmtDateTime(event.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
