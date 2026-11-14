import { APIError, type CollectionBeforeDeleteHook, type CollectionSlug, type Where } from 'payload'

import { referencedMessage, type ReferencedCollection } from '../lib/admin/references'

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

/**
 * Quién apunta a qué. En la entrada y el cierre de las páginas de logro, las capturas son
 * nodos de imagen de Lexical (`value`) y las portadas, el campo `poster` del bloque de vídeo.
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
    {
      collection: 'achievement-pages',
      title: 'name',
      paths: ['intro', 'outro'].flatMap((field) => [
        `${field}.root.children.value`,
        `${field}.root.children.fields.poster`,
      ]),
    },
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

/**
 * Se niega a borrar si alguna guía lo usa, en lo publicado o en su último borrador: un
 * borrador que se publique después también dejaría el hueco.
 */
export function refuseReferencedDelete(target: ReferencedCollection): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const names = new Map<string, string>()
    for (const { collection, title, paths } of REFERRERS[target]) {
      const where: Where = { or: paths.map((path) => ({ [path]: { equals: id } })) }
      for (const draft of [false, true]) {
        const { docs } = await req.payload.find({
          collection,
          where,
          draft,
          depth: 0,
          pagination: false,
          select: { [title]: true },
          overrideAccess: true,
          req,
        })
        for (const doc of docs as unknown as Record<string, unknown>[]) {
          names.set(`${collection}:${String(doc.id)}`, String(doc[title] ?? doc.id))
        }
      }
    }
    if (names.size === 0) return
    const sorted = [...names.values()].sort((a, b) => a.localeCompare(b, 'es'))
    throw new APIError(referencedMessage(target, sorted), 409, null, true)
  }
}
