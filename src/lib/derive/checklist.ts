// Lo que una checklist saca de las misiones guardadas en vez de escribirlo a mano, como hacía
// silvestre-checklist en .build/build_quests_js.py. Sin dependencias: lo usa la página de la
// checklist en el servidor y lo prueba tests/unit.

type Kind = 'mandatory' | 'optional' | 'take'

export interface QuestStart {
  /** El criterio de inicio de DofusDB tal cual («Qa=1609&Qo>9469»). */
  startCriterion?: string | null
  /** El ID de DofusDB de cada objetivo, en el orden aplanado de sus etapas. */
  objectives: number[]
}

const QA = /^Qa=(\d+)$/
const QO = /^Qo([=>])(\d+)$/

/**
 * Las misiones que empiezan dentro de otra del mismo paso y cumplen sus objetivos: madre →
 * [[objetivo donde empiezan, hijas]], por ID de DofusDB. Lo dice el criterio de la hija:
 * «Qa=1609&Qo>9469» empieza en la 1609 tras su objetivo 9469; «Qo=X», en X; solo «Qa», en el 0;
 * sin Qa, la madre es la que tiene el objetivo X. Una condición con «|» no hace hija, y una de
 * solo tomarla no es madre en ese paso.
 */
export function questParents(
  steps: readonly { quests: readonly (readonly [number, Kind])[] }[],
  quests: Readonly<Record<number, QuestStart>>,
): Record<number, [number, number[]][]> {
  const found = new Map<number, Map<number, number[]>>()
  for (const step of steps) {
    const listed = step.quests.map(([id]) => id)
    const taken = new Set(step.quests.flatMap(([id, kind]) => (kind === 'take' ? [id] : [])))
    for (const child of listed) {
      const criterion = quests[child]?.startCriterion ?? ''
      if (criterion.includes('|')) continue
      const parts = criterion.split('&').map((part) => part.replace(/[()]/g, ''))
      const qa = parts.map((part) => QA.exec(part)).find(Boolean)
      const qo = parts.map((part) => QO.exec(part)).find(Boolean)
      for (const parent of listed) {
        if (parent === child || taken.has(parent) || (qa && parent !== Number(qa[1]))) continue
        let at: number
        if (qo) {
          const index = quests[parent]?.objectives.indexOf(Number(qo[2])) ?? -1
          if (index < 0) continue
          at = index + (qo[1] === '>' ? 1 : 0)
        } else if (qa) at = 0
        else continue
        const byIndex = found.get(parent) ?? new Map<number, number[]>()
        found.set(parent, byIndex)
        const kids = byIndex.get(at) ?? []
        byIndex.set(at, kids)
        if (!kids.includes(child)) kids.push(child)
      }
    }
  }
  return Object.fromEntries(
    [...found].map(([parent, byIndex]) => [
      parent,
      [...byIndex].sort(([a], [b]) => a - b) as [number, number[]][],
    ]),
  )
}

/**
 * Lo que cada misión de la ruta pide terminado antes de empezar, también a través de otras de
 * dentro o de fuera de la ruta, quedándose solo con las de la ruta: misión → [misiones], por ID
 * de DofusDB. `direct` da lo que pide cada misión directamente (quests.prerequisites).
 */
export function routePrerequisites(
  route: readonly number[],
  direct: Readonly<Record<number, readonly number[]>>,
): Record<number, number[]> {
  // Las misiones de un bucle se piden todas entre sí: se agrupan en componentes fuertemente
  // conexas (Tarjan) y cada componente pide lo mismo, empiece el recorrido por donde empiece.
  const index = new Map<number, number>()
  const low = new Map<number, number>()
  const stack: number[] = []
  const onStack = new Set<number>()
  const component = new Map<number, number[]>()
  let counter = 0
  const visit = (id: number) => {
    index.set(id, counter)
    low.set(id, counter++)
    stack.push(id)
    onStack.add(id)
    for (const need of direct[id] ?? []) {
      if (!index.has(need)) {
        visit(need)
        low.set(id, Math.min(low.get(id)!, low.get(need)!))
      } else if (onStack.has(need)) low.set(id, Math.min(low.get(id)!, index.get(need)!))
    }
    if (low.get(id) !== index.get(id)) return
    const members: number[] = []
    for (let member = stack.pop()!; ; member = stack.pop()!) {
      onStack.delete(member)
      members.push(member)
      component.set(member, members)
      if (member === id) break
    }
  }
  // Lo que pide cada componente: lo de sus miembros y lo de las componentes que piden, sin ella.
  const memo = new Map<number[], Set<number>>()
  const closureOf = (members: number[]): Set<number> => {
    const known = memo.get(members)
    if (known) return known
    const out = new Set<number>(members.length > 1 ? members : [])
    memo.set(members, out)
    for (const member of members) {
      for (const need of direct[member] ?? []) {
        const other = component.get(need)!
        if (other === members) continue
        out.add(need)
        for (const further of closureOf(other)) out.add(further)
      }
    }
    return out
  }
  const closure = (id: number) => {
    if (!index.has(id)) visit(id)
    const all = new Set(closureOf(component.get(id)!))
    all.delete(id)
    return all
  }
  const onRoute = new Set(route)
  const out: Record<number, number[]> = {}
  for (const id of [...onRoute].sort((a, b) => a - b)) {
    const needs = [...closure(id)].filter((need) => onRoute.has(need)).sort((a, b) => a - b)
    if (needs.length) out[id] = needs
  }
  return out
}
