import type { ReactNode } from 'react'

import { formatAmount } from '@/lib/guides/display'

import { cx } from './cx'

/**
 * Cifra destacada con su etiqueta. XP y kamas no tienen icono del juego que podamos usar,
 * así que su ficha es solo tipográfica (DESIGN.md, Stat tile).
 */
export function StatTile({
  value,
  label,
  icon,
  as: Tag = 'div',
  className,
}: {
  value: number | string
  label: string
  icon?: ReactNode
  as?: 'div' | 'li'
  className?: string
}) {
  return (
    <Tag
      className={cx(
        'grid min-h-18 content-center gap-2 rounded-[0.875rem] bg-raised px-4 py-3',
        icon != null && 'grid-cols-[auto_1fr] items-center gap-x-3',
        className,
      )}
    >
      {icon && <span className="row-span-2">{icon}</span>}
      <span className="font-accent text-figure whitespace-nowrap text-accent-2 tabular-nums">
        {typeof value === 'number' ? formatAmount(value) : value}
      </span>
      <span className="font-display text-micro text-ink-2 uppercase">{label}</span>
    </Tag>
  )
}
