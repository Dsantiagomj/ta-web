import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonLook {
  variant?: ButtonVariant
  /** El primario en 40px, para filas donde 44px no caben (DESIGN.md, Summary ribbon). */
  compact?: boolean
  icon?: ReactNode
}

// DESIGN.md, Components: el primario va relleno de --color-btn con su tinta (diseño de
// color de Torre, opción D), en Lexend 700 con 0,625rem de radio; el secundario y el
// fantasma siguen siendo píldoras, también en Lexend, la letra de la interfaz.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'h-11 px-6 rounded-[0.625rem] bg-btn text-btn-ink font-ui font-bold hover:bg-btn-hi motion-safe:active:scale-97',
  secondary:
    'h-10 px-5 rounded-pill bg-raised text-ink font-ui font-semibold hover:bg-line active:scale-96',
  ghost: 'h-9 px-4 rounded-pill text-ink-2 font-ui font-semibold hover:bg-raised active:scale-96',
}

export function buttonClass({
  variant = 'primary',
  compact = false,
  className,
}: ButtonLook & { className?: string }): string {
  return cx(
    'hit-target relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-sm whitespace-nowrap no-underline',
    'transition-[background-color,transform] duration-(--duration-fast) ease-standard active:duration-(--duration-press)',
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
