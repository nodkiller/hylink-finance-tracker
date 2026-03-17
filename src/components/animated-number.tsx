'use client'

import { useEffect, useRef, useState } from 'react'

type Format = 'currency-aud' | 'number'

function applyFormat(n: number, format: Format): string {
  if (format === 'currency-aud') {
    return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
  }
  return String(Math.round(n))
}

interface Props {
  value: number
  format?: Format
  duration?: number
  className?: string
}

/** Animates a number from its previous value to `value` using easeOutCubic */
export default function AnimatedNumber({
  value,
  format = 'number',
  duration = 900,
  className,
}: Props) {
  const [displayed, setDisplayed] = useState(value)
  const prevValueRef = useRef(value)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = prevValueRef.current
    const to = value
    if (from === to) return

    let startTime: number | null = null

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplayed(to)
        prevValueRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const text = applyFormat(displayed, format)

  return <span className={className}>{text}</span>
}
