import type { QuantityByDofusId } from './types'

/** Suma la cantidad a la entrada de ese ID, o la añade al final si no existe. */
export function addQuantity(list: QuantityByDofusId[], dofusId: number, quantity: number) {
  const existing = list.find((entry) => entry.dofusId === dofusId)
  if (existing) existing.quantity += quantity
  else list.push({ dofusId, quantity })
}
