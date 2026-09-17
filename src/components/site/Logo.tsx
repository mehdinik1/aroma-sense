import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'

/**
 * To use the official logo art: save it as `public/brand/logo.png` (transparent,
 * ~80px tall) and flip `USE_LOGO_IMAGE` to true. Until then this renders a
 * faithful SVG interpretation of the leaf + water-drop "A" plus the wordmark.
 */
const USE_LOGO_IMAGE = false

export function Logo({
  className,
  showTagline = false,
}: {
  className?: string
  showTagline?: boolean
}) {
  const [useImage, setUseImage] = useState(USE_LOGO_IMAGE)

  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="Aroma Sense home">
      {useImage ? (
        <img
          src="/brand/logo.png"
          alt="Aroma Sense"
          className="h-9 w-auto"
          onError={() => setUseImage(false)}
        />
      ) : (
        <>
          <span className="h-9 w-9 shrink-0">
            <BrandMark />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold uppercase tracking-[0.16em] text-foreground">
              Aroma<span className="text-primary">&nbsp;Sense</span>
            </span>
            {showTagline && (
              <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                A refreshing way to wellness
              </span>
            )}
          </span>
        </>
      )}
    </Link>
  )
}
