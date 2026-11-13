import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'outline' | 'ghost' | 'accent'
type Size = 'sm' | 'md'

const base =
  'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--color-ink)] text-[var(--color-void)] hover:bg-[var(--color-flame)]',
  accent: 'bg-[var(--color-flame)] text-[var(--color-void)] shadow-[0_0_30px_-6px_var(--color-flame)] hover:brightness-110',
  outline: 'border border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-flame)] hover:text-[var(--color-flame)]',
  ghost: 'text-[var(--color-ink-dim)] hover:bg-white/5 hover:text-[var(--color-ink)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
}

type Common = { variant?: Variant; size?: Size; icon?: ReactNode; iconLeft?: ReactNode }

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Common>(
  ({ variant = 'outline', size = 'md', icon, iconLeft, className, children, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {iconLeft}
      {children}
      {icon}
    </button>
  ),
)
Button.displayName = 'Button'

export function ButtonLink({ variant = 'outline', size = 'md', icon, iconLeft, className, children, ...rest }: LinkProps & Common) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {iconLeft}
      {children}
      {icon}
    </Link>
  )
}
