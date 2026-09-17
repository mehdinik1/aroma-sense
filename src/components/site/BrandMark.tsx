import { cn } from '@/lib/utils'

/**
 * Aroma Sense mark — a rainfall shower-head faceplate (ring + nozzle grid) with two
 * falling droplets, in champagne gold. Reads as "spa shower head" at a glance while
 * staying a clean, modern, symmetrical emblem at any size (nav, favicon, watermark).
 * To use official art instead see <Logo> / public/brand/README.txt.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn('h-full w-full', className)} aria-hidden="true">
      <defs>
        <linearGradient id="as-ring" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#f0dcae" />
          <stop offset="50%" stopColor="#c9a75e" />
          <stop offset="100%" stopColor="#9b7c3f" />
        </linearGradient>
        <linearGradient id="as-drop" x1="30%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#e7cf9b" />
          <stop offset="100%" stopColor="#b08d47" />
        </linearGradient>
      </defs>

      {/* faceplate */}
      <circle cx="50" cy="38" r="31" fill="none" stroke="url(#as-ring)" strokeWidth="4.5" />
      {/* polished-metal highlight */}
      <path
        d="M26.7 27.8A31 31 0 0 1 61.8 8.1"
        fill="none"
        stroke="#fff6df"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* nozzle grid */}
      <circle cx="50" cy="38" r="2.2" fill="#9b7c3f" />
      <circle cx="50" cy="27" r="1.9" fill="#9b7c3f" />
      <circle cx="59.5" cy="32.5" r="1.9" fill="#9b7c3f" />
      <circle cx="59.5" cy="43.5" r="1.9" fill="#9b7c3f" />
      <circle cx="50" cy="49" r="1.9" fill="#9b7c3f" />
      <circle cx="40.5" cy="43.5" r="1.9" fill="#9b7c3f" />
      <circle cx="40.5" cy="32.5" r="1.9" fill="#9b7c3f" />
      <g opacity="0.85">
        <circle cx="50" cy="15" r="1.6" fill="#9b7c3f" />
        <circle cx="61.5" cy="18.1" r="1.6" fill="#9b7c3f" />
        <circle cx="69.9" cy="26.5" r="1.6" fill="#9b7c3f" />
        <circle cx="73" cy="38" r="1.6" fill="#9b7c3f" />
        <circle cx="69.9" cy="49.5" r="1.6" fill="#9b7c3f" />
        <circle cx="61.5" cy="57.9" r="1.6" fill="#9b7c3f" />
        <circle cx="50" cy="61" r="1.6" fill="#9b7c3f" />
        <circle cx="38.5" cy="57.9" r="1.6" fill="#9b7c3f" />
        <circle cx="30.1" cy="49.5" r="1.6" fill="#9b7c3f" />
        <circle cx="27" cy="38" r="1.6" fill="#9b7c3f" />
        <circle cx="30.1" cy="26.5" r="1.6" fill="#9b7c3f" />
        <circle cx="38.5" cy="18.1" r="1.6" fill="#9b7c3f" />
      </g>

      {/* falling droplets */}
      <path d="M58 62c9 12 9 23 0 23-9 0-9-11 0-23Z" fill="url(#as-drop)" />
      <path d="M38 75c5 7 5 13 0 13-5 0-5-6 0-13Z" fill="url(#as-drop)" opacity="0.65" />
    </svg>
  )
}
