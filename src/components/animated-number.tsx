'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  formatter?: (n: number) => string
  duration?: number
  className?: string
}

/** Animates a number from its previous value to `value` using easeOutCubic */
export default function AnimatedNumber({
  value,
  formatter,
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

  const text = formatter ? formatter(displayed) : String(Math.round(displayed))

  return <span className={className}>{text}</span>
}
