import { APIError, type CollectionBeforeDeleteHook, type CollectionSlug, type Where } from 'payload'

import {
  MAX_NAMED_REFERENCES,
  referencedMessage,
  type ReferencedCollection,
} from '../lib/admin/references'
import { panelStrings } from '../lib/admin/strings'

// Borrar algo que sale en una guía deja un hueco sin aviso (docs/research/backlog.md, A-17).
// Antes de borrar, se buscan las guías que lo usan y, si hay alguna, el panel se niega y las
// nombra. Solo se consultan los campos que guardan la referencia, con el título de cada guía.

interface Referrer {
  collection: CollectionSlug
  /** El campo que da nombre a la guía en el mensaje. */
  title: string
  /** Los caminos de Payload que guardan la referencia: campos, bloques y filas. */
  paths: string[]
}

/**
 * Los bloques de imagen del cuerpo de una guía. Payload guarda los de dentro de un paso en la
 * misma tabla, así que este camino también los encuentra (`body.body.image` no se puede
 * consultar).
 */
const bodyImages = ['body.image']

/** Cuántos niveles de nodos se miran bajo la raíz de un texto de Lexical. */
export const PROSE_DEPTH = 6

/**
 * En un texto de Lexical, las capturas son nodos de imagen (`value`) y las portadas, el campo
 * `poster` de un bloque de vídeo, a cualquier nivel: sueltos, o dentro de una lista o una cita.
 * Payload no consulta un árbol entero, así que se pregunta por cada nivel hasta PROSE_DEPTH
 * (una lista dentro de otra lista ya son cuatro).
 */
function prosePaths(fields: string[]): string[] {
  return fields.flatMap((field) =>
    Array.from({ length: PROSE_DEPTH }, (_, depth) => {
      const node = `${field}.root${'.children'.repeat(depth + 1)}`
      return [`${node}.value`, `${node}.fields.poster`]
    }).flat(),
  )
}

/**
 * Quién apunta a qué. El arte del juego que usan sus datos va aparte (refuseGameAssetDelete).
 */
export const REFERRERS: Record<ReferencedCollection, Referrer[]> = {
  media: [
    { collection: 'quest-guides', title: 'title', paths: bodyImages },
    { collection: 'dofus-guides', title: 'name', paths: ['videoPoster', ...bodyImages] },
    {
      collection: 'checklists',
      title: 'name',
      paths: ['steps.figure.image', 'steps.icon', 'steps.banner'],
    },
    { collection: 'achievement-pages', title: 'name', paths: prosePaths(['intro', 'outro']) },
  ],
  'achievement-pages': [
    {
      collection: 'dofus-guides',
      title: 'name',
      paths: ['parts.achievement', 'parts.achievements.achievement'],
    },
  ],
  'quest-guides': [
    { collection: 'dofus-guides', title: 'name', paths: ['parts.guide', 'parts.quests.guide'] },
    { collection: 'achievement-groups', title: 'name', paths: ['guides'] },
  ],
  'achievement-groups': [{ collection: 'achievement-pages', title: 'name', paths: ['group'] }],
  'dofus-guides': [{ collection: 'checklists', title: 'name', paths: ['dofusGuide'] }],
}

/** Las guías que se nombran de cada colección; del resto solo se cuenta cuántas son. */
const NAMED_PER_REFERRER = MAX_NAMED_REFERENCES

/**
 * Se niega a borrar si alguna guía lo usa, en lo publicado o en su último borrador: un
 * borrador que se publique después también dejaría el hueco. Todas las consultas van a la
 * vez, cada una con diez guías como mucho y el total. Una guía puede salir en las dos
 * consultas: se cuenta una vez si llegó en las dos listas, y si alguna se cortó, el total es
 * el mayor de los dos.
 */
export function refuseReferencedDelete(target: ReferencedCollection): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const results = await Promise.all(
      REFERRERS[target].map(async ({ collection, title, paths }) => {
        const where: Where = { or: paths.map((path) => ({ [path]: { equals: id } })) }
        const [published, latest] = await Promise.all(
          [false, true].map((draft) =>
            req.payload.find({
              collection,
              where,
              draft,
              depth: 0,
              limit: NAMED_PER_REFERRER,
              select: { [title]: true },
              overrideAccess: true,
              req,
            }),
          ),
        )
        const names = new Map<string, string>()
        for (const doc of [...published!.docs, ...latest!.docs] as unknown as Record<
          string,
          unknown
        >[]) {
          names.set(String(doc.id), String(doc[title] ?? doc.id))
        }
        const complete =
          published!.docs.length === published!.totalDocs &&
          latest!.docs.length === latest!.totalDocs
        const total = complete ? names.size : Math.max(published!.totalDocs, latest!.totalDocs)
        return { names: [...names.values()], total }
      }),
    )
    const total = results.reduce((sum, result) => sum + result.total, 0)
    if (total === 0) return
    const names = results
      .flatMap((result) => result.names)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .slice(0, MAX_NAMED_REFERENCES)
    throw new APIError(referencedMessage(target, names, total), 409, null, true)
  }
}

/**
 * El arte del juego (media con `gameAsset`) solo lo trae el refresco de DofusDB, y lo enlazan
 * sus datos: iconos de objetos y logros, imágenes de monstruos, renders de PNJ. Desde el panel
 * o la API, con una cuenta, no se borra. Un trabajo de confianza sin cuenta sí puede.
 */
export const refuseGameAssetDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (!req.user) return
  const media = await req.payload.findByID({
    collection: 'media',
    id,
    depth: 0,
    select: { gameAsset: true },
    overrideAccess: true,
    req,
  })
  if (media.gameAsset) throw new APIError(panelStrings.gameAssetDelete, 409, null, true)
}
