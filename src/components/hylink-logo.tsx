import Link from 'next/link'

interface Props {
  variant?: 'light' | 'dark'
  href?: string
}

export default function HylinkLogo({ variant = 'light', href = '/projects' }: Props) {
  const isDark = variant === 'dark'

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 shrink-0 select-none group"
      aria-label="Hylink Finance"
    >
      {/* Icon mark — ascending bar chart */}
      <svg
        width="24"
        height="20"
        viewBox="0 0 24 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-105"
      >
        {isDark ? (
          <>
            {/* Short bar */}
            <rect x="0" y="12" width="6" height="8" rx="2" fill="white" opacity="0.35" />
            {/* Mid bar */}
            <rect x="9" y="6" width="6" height="14" rx="2" fill="white" opacity="0.6" />
            {/* Tall bar */}
            <rect x="18" y="0" width="6" height="20" rx="2" fill="white" opacity="0.9" />
            {/* Trend line */}
            <path
              d="M3 12 L12 6 L21 0"
              stroke="white"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
              strokeDasharray="2 2"
            />
            {/* Top dots */}
            <circle cx="3" cy="12" r="1.5" fill="white" opacity="0.55" />
            <circle cx="12" cy="6" r="1.5" fill="white" opacity="0.7" />
            <circle cx="21" cy="0" r="1.5" fill="white" opacity="0.9" />
          </>
        ) : (
          <>
            {/* Short bar */}
            <rect x="0" y="12" width="6" height="8" rx="2" fill="#3182CE" opacity="0.35" />
            {/* Mid bar */}
            <rect x="9" y="6" width="6" height="14" rx="2" fill="#2B6CB0" opacity="0.65" />
            {/* Tall bar */}
            <rect x="18" y="0" width="6" height="20" rx="2" fill="#1A365D" />
            {/* Trend line */}
            <path
              d="M3 12 L12 6 L21 0"
              stroke="#3182CE"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
              strokeDasharray="2 2"
            />
            {/* Top dots */}
            <circle cx="3" cy="12" r="1.5" fill="#3182CE" opacity="0.5" />
            <circle cx="12" cy="6" r="1.5" fill="#2B6CB0" opacity="0.7" />
            <circle cx="21" cy="0" r="1.5" fill="#1A365D" />
          </>
        )}
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col leading-none gap-[3px]">
        <span
          className={`text-[13.5px] font-bold tracking-[0.1em] uppercase transition-colors ${
            isDark ? 'text-white/90' : 'text-[#1A365D] group-hover:text-[#2B6CB0]'
          }`}
          style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
        >
          Hylink
        </span>
        <span
          className={`text-[8.5px] font-semibold tracking-[0.25em] uppercase ${
            isDark ? 'text-white/35' : 'text-[#3182CE]/60'
          }`}
        >
          Finance
        </span>
      </div>
    </Link>
  )
}
