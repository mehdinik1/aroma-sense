import { Heart } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAccount } from '@/lib/account'
import { useWishlist } from '@/lib/wishlist'
import { cn } from '@/lib/utils'

export function WishlistButton({
  handle,
  className,
  variant = 'overlay',
}: {
  handle: string
  className?: string
  /** 'overlay' — round icon button for use on top of a product image; 'inline' — pill with label */
  variant?: 'overlay' | 'inline'
}) {
  const { customer } = useAccount()
  const { has, toggle } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = customer && has(handle)

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!customer) {
      navigate(`/account/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    toggle(handle)
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition',
          saved
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:bg-secondary',
          className,
        )}
      >
        <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
        {saved ? 'Saved' : 'Save for later'}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1712]/70 text-[#e7cf9b] backdrop-blur transition hover:bg-[#1a1712]/90',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
    </button>
  )
}
