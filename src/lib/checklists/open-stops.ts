// Lo que un paso deja a medias, por misión (openOf de silvestre-checklist): el objetivo donde
// se queda y si la termina un paso posterior. Sin Payload ni React: lo usan la página (lo que
// recibe la isla) y las pruebas del progreso.
import { relationId } from './relations'

interface StopPoint {
  quest?: unknown
  stopObjective?: number | null
  later?: boolean | null
}

type SegmentLike = { kind: string } & StopPoint & { more?: StopPoint[] | null }

export interface OpenStop {
  /** El objetivo donde se queda la misión. */
  at: number
  /** La termina un paso posterior que la lleva, no el que cierra este. */
  later: boolean
}

/**
 * Sin verde, todas sus paradas. Con verde, el rojo es dónde se retoma: queda la parada que deja
 * el verde (un «detente aquí» detrás del «aquí se resuelve») o, si otro paso lo cierra y el
 * verde no deja ninguna, todas. La que termina un paso posterior (`later`) queda siempre. Una
 * misión con varias se queda en la primera; con una `later`, en la de esta.
 */
export function openStops(segments: SegmentLike[], closed: boolean): Map<number, OpenStop> {
  const resolveAt = segments.findIndex((segment) => segment.kind === 'resolve')
  const points = segments.flatMap((segment, index) =>
    segment.kind === 'stop'
      ? [segment, ...(segment.more ?? [])].map((point) => ({
          point,
          follow: resolveAt >= 0 && index > resolveAt,
        }))
      : [],
  )
  const follows = points.some((entry) => entry.follow)
  const own = points.filter(({ point, follow }) =>
    resolveAt < 0 ? true : follows ? follow || point.later : closed || point.later,
  )
  const out = new Map<number, OpenStop>()
  for (const { point } of own) {
    const quest = relationId(point.quest ?? null)
    if (quest === null || point.stopObjective == null) continue
    const later = Boolean(point.later)
    const was = out.get(quest)
    if (!was || (later && !was.later) || (later === was.later && point.stopObjective < was.at)) {
      out.set(quest, { at: point.stopObjective, later })
    }
  }
  return out
}
