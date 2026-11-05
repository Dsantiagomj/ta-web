import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonLook {
  variant?: ButtonVariant
  /** El primario en 40px, para filas donde 44px no caben (DESIGN.md, Summary ribbon). */
  compact?: boolean
  icon?: ReactNode
}

// DESIGN.md, Components: ningún color rellena un botón. El primario es el contorno en
// --color-accent; al pasar el ratón se rellena con --color-raised detrás del mismo texto.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'h-11 px-6 border-[1.5px] border-accent text-accent hover:bg-raised focus-visible:outline-accent',
  secondary: 'h-10 px-5 bg-raised text-ink hover:bg-line',
  ghost: 'h-9 px-4 text-ink-2 hover:bg-raised',
}

export function buttonClass({
  variant = 'primary',
  compact = false,
  className,
}: ButtonLook & { className?: string }): string {
  return cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-display text-sm font-bold tracking-[0.04em] whitespace-nowrap uppercase no-underline',
    'transition-[background-color,transform] duration-(--duration-fast) ease-standard active:scale-96 active:duration-(--duration-press)',
    'disabled:pointer-events-none disabled:opacity-40 [&>svg]:size-4',
    VARIANTS[variant],
    compact && variant === 'primary' && 'h-10 px-5',
    className,
  )
}

export function Button({
  variant = 'primary',
  compact,
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonLook & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={buttonClass({ variant, compact, className })}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  compact,
  icon,
  className,
  children,
  ...props
}: ButtonLook & ComponentPropsWithoutRef<'a'> & { href: string }) {
  return (
    <a data-variant={variant} className={buttonClass({ variant, compact, className })} {...props}>
      {icon}
      {children}
    </a>
  )
}
