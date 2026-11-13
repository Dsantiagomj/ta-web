// Si el navegador guarda progreso de silvestre-checklist sin migrar. Va con la isla y es lo
// único que va: la migración (./legacy.ts) se carga con import() solo cuando esto dice que sí.
//
// Lo que cuenta: las claves con progreso de cada checklist antigua («nebuloso:done»…), el
// checklist clásico de esta checklist («dofus_nebuloso_clean_v1») y lo compartido entre ellas
// («dofus-checklists:shared»). El tema, la pestaña abierta o «cosecha:done» (para el Ocre) no.

const PREFIXED = /^([a-z][\w-]*):(done|questPos|questObjective|prereqs|owned)$/
/** Las checklists antiguas que guardan progreso en este navegador, además de la de la página. */
const KNOWN = ['silvestre', 'hielos', 'global', 'nebuloso']
const CLASSIC = /^dofus_(\w+?)_clean_v\d+$/
export const SHARED_KEY = 'dofus-checklists:shared'
/** Lo que se trae de las checklists antiguas que no son esta: sus misiones y sus objetos. */
export const QUESTS_ONLY = ['questObjective', 'owned']

/** Lo antiguo de donde sale cada clave: la checklist entera, solo sus misiones o lo compartido. */
export function legacySource(key: string, own: string | null): string | null {
  if (key === SHARED_KEY) return 'shared'
  const prefixed = PREFIXED.exec(key)
  if (prefixed && (prefixed[1] === own || KNOWN.includes(prefixed[1]))) {
    if (prefixed[1] === own) return own
    return QUESTS_ONLY.includes(prefixed[2]) ? `${prefixed[1]}:quests` : null
  }
  const classic = CLASSIC.exec(key)
  return classic && classic[1] === own ? own : null
}

/** Si alguna clave antigua es de algo que aún no se ha migrado. */
export function pendingLegacy(
  keys: string[],
  own: string | null,
  migrated: Record<string, number>,
): boolean {
  return keys.some((key) => {
    const source = legacySource(key, own)
    return source !== null && !migrated[source]
  })
}
