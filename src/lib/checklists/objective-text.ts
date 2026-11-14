// El texto de un objetivo de DofusDB tal como se lee: sin sus marcas y con el nombre de lo que
// nombra. Sin dependencias pesadas: lo usan la página de una checklist y el panel (el objetivo
// donde para un «detente aquí»).
import { checklistPageStrings as s } from './strings'

/** Por ID de DofusDB: los PNJ, objetos y monstruos que los objetivos nombran como {npc,123}. */
export interface ObjectiveNames {
  npc: Record<number, string>
  item: Record<number, string>
  monster: Record<number, string>
}

export const OBJECTIVE_REFERENCE = /\{(npc|item|monster),(\d+)\}/g

/**
 * El texto de un objetivo de DofusDB sin sus marcas: «{map,1::Banco real}» es «Banco real»
 * y «{npc,2351}» el nombre de ese PNJ; si no lo tenemos, «un PNJ».
 */
export function objectiveText(
  text: string | null | undefined,
  names: ObjectiveNames = { npc: {}, item: {}, monster: {} },
): string {
  return (text ?? '')
    .replace(/\{[a-zA-Z]+,[^{}]*?::([^{}]*)\}/g, '$1')
    .replace(
      OBJECTIVE_REFERENCE,
      (_, kind: keyof ObjectiveNames, id: string) => names[kind][Number(id)] ?? s.unnamed[kind],
    )
    .trim()
}
