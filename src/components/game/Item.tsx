import { Picture } from '@/components/ui/Picture'
import { formatAmount } from '@/lib/guides/display'

import { gameStrings } from './strings'
import type { GameItem } from './types'

/** Objeto en una línea: icono de 24px, nombre y «× 1» (DESIGN.md, Item chip). */
export function ItemChip({ item, quantity }: { item: GameItem; quantity: number }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-raised pr-2.5 pl-1 text-xs font-semibold text-ink">
      {item.icon ? (
        <Picture image={item.icon} alt="" className="size-6" />
      ) : (
        <span className="size-6" />
      )}
      {item.name}
      <span className="font-medium text-ink-2">{gameStrings.quantitySuffix(quantity)}</span>
    </span>
  )
}

/**
 * Casilla de inventario: icono de 48px en un hueco de 72px, la cantidad en la esquina
 * como en el juego y el nombre debajo (DESIGN.md, Item slot). Se lee «1 × Pico de tofu».
 */
export function ItemSlot({
  item,
  quantity,
  as: Tag = 'li',
}: {
  item: GameItem
  quantity: number
  as?: 'li' | 'div'
}) {
  return (
    <Tag className="grid w-[104px] justify-items-center gap-1.5 text-center">
      <span className="relative grid size-[72px] place-items-center rounded-sm border border-line bg-raised">
        {item.icon && <Picture image={item.icon} alt="" className="size-12" />}
        <span
          aria-hidden="true"
          className="absolute right-1 bottom-0.5 font-accent text-[0.9375rem] leading-none text-accent-2"
        >
          {formatAmount(quantity)}
        </span>
      </span>
      <span className="text-xs text-ink-2">
        <span className="sr-only">{gameStrings.quantityPrefix(quantity)}</span>
        {item.name}
      </span>
    </Tag>
  )
}
