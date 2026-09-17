import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Fades + lifts its children into view on scroll. Respects reduced-motion. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className,
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  )
}
