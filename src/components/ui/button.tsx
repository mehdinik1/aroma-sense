import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-semibold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_1px_0_hsl(var(--accent)/0.6)_inset] hover:bg-accent hover:-translate-y-0.5',
        accent:
          'bg-accent text-accent-foreground hover:bg-accent/90 hover:-translate-y-0.5',
        outline:
          'border border-primary/45 bg-transparent text-primary hover:bg-primary/10 hover:border-primary/70 hover:-translate-y-0.5',
        ghost: 'text-foreground hover:bg-secondary',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-7',
        lg: 'h-12 px-9 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
