import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'

import { REDIRECTS_REVALIDATE, REDIRECTS_TAG } from '@/lib/redirects/cache'
import { readSlugRedirects } from '@/lib/redirects/queries'
import { redirectTarget } from '@/lib/redirects/slug-redirects'

// La tabla de redirecciones de dirección cambiada, en caché con su etiqueta
// (src/lib/redirects/cache.ts), que caducan los hooks de la colección redirects.
const readRedirects = unstable_cache(
  async () => readSlugRedirects(await getPayload({ config })),
  ['slug-redirects'],
  { tags: [REDIRECTS_TAG], revalidate: REDIRECTS_REVALIDATE },
)

/**
 * Lo que responde /<slug> cuando no hay nada publicado con ese slug: un 308 a su dirección
 * nueva si Torre la cambió (siguiendo la cadena hasta el final), o 404. Se mira al final,
 * así que una página que publica una dirección vieja siempre gana a su fila.
 */
export async function redirectOrNotFound(slug: string): Promise<never> {
  const target = redirectTarget(new Map(await readRedirects()), slug)
  if (target) permanentRedirect(`/${target}`)
  notFound()
}
