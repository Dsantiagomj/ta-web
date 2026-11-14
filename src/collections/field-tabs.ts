import type { Field, TabsField } from 'payload'

/**
 * Coloca campos en pestañas sin nombre (no cambian lo guardado). Cada campo con nombre tiene que
 * ir en una pestaña y solo en una: uno que faltara saldría del esquema sin avisar, y la próxima
 * migración borraría su columna. Para con un error si falta, sobra o se repite alguno.
 */
export function placeInTabs(
  fields: Field[],
  tabs: { label: string; names: string[] }[],
): TabsField {
  const byName = new Map(
    fields.flatMap((field) => ('name' in field ? [[field.name, field] as const] : [])),
  )
  const placed = tabs.flatMap((tab) => tab.names)
  const twice = placed.find((name, index) => placed.indexOf(name) !== index)
  if (twice) throw new Error(`El campo ${twice} está en dos pestañas`)
  const unknown = placed.find((name) => !byName.has(name))
  if (unknown) throw new Error(`El campo ${unknown} no existe`)
  const missing = [...byName.keys()].find((name) => !placed.includes(name))
  if (missing) throw new Error(`El campo ${missing} no está en ninguna pestaña`)
  return {
    type: 'tabs',
    tabs: tabs.map((tab) => ({
      label: tab.label,
      fields: tab.names.map((name) => byName.get(name)!),
    })),
  }
}
