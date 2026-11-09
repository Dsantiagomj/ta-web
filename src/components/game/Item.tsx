import { Picture } from '@/components/ui/Picture'
import { formatAmount } from '@/lib/guides/display'

import './game.css'
import { CheckIcon, CopyIcon } from './icons'
import { gameStrings } from './strings'
import type { GameItem } from './types'

const s = gameStrings.items

/**
 * El nombre de un objeto, que copia el nombre sin la cantidad para pegarlo en el buscador
 * del juego (DESIGN.md, Item chip and item slot, Copy). La isla de la página
 * (PageEnhancements) lo convierte en botón con el nombre «Copiar …»; sin JavaScript es
 * texto. Su ::after cubre el objeto que lo contiene (`copyhost`), así que su icono también
 * copia. En reposo se ve como siempre: el icono de copiar y el de hecho solo aparecen con
 * el ratón encima o con el foco.
 */
export function CopyName({ name }: { name: string }) {
  return (
    <span
      className="copyname"
      data-copy={name}
      data-copy-label={s.copyLabel(name)}
      data-copy-failed={s.copyFailed(name)}
    >
      {/* Lo que se encoge al pulsar: el botón no, para que su ::after siga cubriendo el objeto. */}
      <span className="copyname__t">
        {name}
        <CopyIcon className="copyname__i" />
        <CheckIcon className="copyname__i copyname__ok" />
      </span>
    </span>
  )
}

/** Objeto en una línea: icono de 24px, nombre y «× 1» (DESIGN.md, Item chip). */
export function ItemChip({ item, quantity }: { item: GameItem; quantity: number }) {
  return (
    <span className="copyhost inline-flex h-8 items-center gap-1.5 rounded-pill bg-raised pr-2.5 pl-1 text-xs font-semibold text-ink">
      {item.icon ? (
        <Picture image={item.icon} alt="" className="size-6" />
      ) : (
        <span className="size-6" />
      )}
      <CopyName name={item.name} />
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
    <Tag className="copyhost grid w-[104px] justify-items-center gap-1.5 text-center">
      <span className="copywell relative grid size-[72px] place-items-center rounded-sm border border-line bg-raised">
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
        <CopyName name={item.name} />
      </span>
    </Tag>
  )
}
