import { Picture } from '@/components/ui/Picture'

import { gameStrings } from './strings'
import type { Monster } from './types'

/** Monstruo de un combate: arte en un hueco de 56px, «1 × Nombre» y el nivel si se sabe. */
export function MonsterChip({ monster, quantity }: { monster: Monster; quantity: number }) {
  return (
    <span className="flex items-center gap-2.5 rounded-md bg-raised py-1 pr-3.5 pl-1">
      <span className="grid size-14 shrink-0 place-items-center rounded-sm bg-bg">
        {monster.icon && <Picture image={monster.icon} alt="" className="size-12" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">
          {gameStrings.quantity(quantity, monster.name)}
        </span>
        {monster.level != null && (
          <span className="block text-xs text-muted">{gameStrings.levelValue(monster.level)}</span>
        )}
      </span>
    </span>
  )
}

/** Bloque de combate (DESIGN.md, Fight block): la lista de monstruos contra los que se lucha. */
export function FightBlock({ monsters }: { monsters: { monster: Monster; quantity: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {monsters.map(({ monster, quantity }) => (
        <li key={monster.name}>
          <MonsterChip monster={monster} quantity={quantity} />
        </li>
      ))}
    </ul>
  )
}
