import type { ReactNode } from 'react'

import { cx } from './cx'

/** Píldora de 26px en --color-raised para datos cortos: «Diaria», «Sufokia». */
export function Chip({
  icon,
  className,
  children,
}: {
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex h-[26px] items-center gap-1.5 rounded-pill bg-raised px-2.5 text-xs font-semibold whitespace-nowrap text-ink-2 [&_img]:size-4',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
