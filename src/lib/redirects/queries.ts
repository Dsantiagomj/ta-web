import type { Payload } from 'payload'

/**
 * Las redirecciones de dirección cambiada como pares [antigua, nueva], leídas como un
 * visitante (overrideAccess: false, sin usuario). Es una tabla pequeña: se lee entera y la
 * página la guarda en caché (src/app/(frontend)/[slug]/redirect-data.ts).
 */
export async function readSlugRedirects(payload: Payload): Promise<[string, string][]> {
  const { docs } = await payload.find({
    collection: 'redirects',
    select: { from: true, to: true },
    depth: 0,
    pagination: false,
    overrideAccess: false,
  })
  return docs.map((doc) => [doc.from, doc.to])
}
