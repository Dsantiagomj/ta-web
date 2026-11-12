import { Picture } from '@/components/ui/Picture'

import './game.css'
import { gameStrings } from './strings'
import type { Monster, Quantity } from './types'

/**
 * Un combate de la guía (DESIGN.md, Monster chip and fight block): una fila por monstruo,
 * con su imagen en un hueco de 52px (a 42px, nunca ampliada) y «1 × Nombre». Sin imagen
 * importada, el hueco queda vacío.
 */
export function FightBlock({ monsters }: { monsters: Quantity<Monster>[] }) {
  return (
    <ul role="list" className="mobs">
      {monsters.map(({ item, quantity }) => (
        <li key={item.name} className="row">
          <span className="well well--mob" aria-hidden="true">
            {item.icon && <Picture image={item.icon} alt="" className="size-10.5" />}
          </span>
          <span>
            <b>{gameStrings.header.quantity(quantity)}</b> {item.name}
          </span>
        </li>
      ))}
    </ul>
  )
}
