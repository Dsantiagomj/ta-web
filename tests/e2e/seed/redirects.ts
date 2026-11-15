import type { Payload } from 'payload'

import { seedGuide } from './guides'

/**
 * Una dirección que Torre cambió: la vieja de la guía sembrada lleva a la de ahora, como la
 * fila que crea la web al publicar con otro slug (src/collections/slug-redirects.ts).
 */
export const seedRedirect = { from: `${seedGuide.slug}-antes`, to: seedGuide.slug }

export async function seedRedirects(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: 'redirects',
    where: { from: { equals: seedRedirect.from } },
    limit: 1,
  })
  if (docs[0]) {
    await payload.update({ collection: 'redirects', id: docs[0].id, data: seedRedirect })
  } else {
    await payload.create({ collection: 'redirects', data: seedRedirect })
  }
}
