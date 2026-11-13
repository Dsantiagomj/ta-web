import { NextResponse, type NextRequest } from 'next/server'

import { NOINDEX_HEADER, isDevEnvironment } from '@/lib/dev-gate/dev-gate'
import { gonePage } from '@/lib/redirects/gone-page'
import { lookupLegacyUrl } from '@/lib/redirects/table'
import { MODE_COOKIE, resolveMode } from '@/lib/theme/theme'

// Proxy de Next (antes middleware), en el runtime de Node: lee el entorno en cada
// petición, no al compilar. Sin matcher, para cubrir también los estáticos, la API y el
// panel. Dos cosas:
// - Las URL antiguas de Squarespace (src/lib/redirects/table.ts): 301 directo a la página
//   nueva o 410. La tabla es un Map en memoria: una búsqueda por petición, sin base.
// - En el entorno dev, que es público pero no se indexa: noindex en cada respuesta.
export function proxy(request: NextRequest) {
  const response = legacyResponse(request) ?? NextResponse.next()
  if (isDevEnvironment(process.env)) response.headers.set('X-Robots-Tag', NOINDEX_HEADER)
  return response
}

function legacyResponse(request: NextRequest): NextResponse | null {
  const rule = lookupLegacyUrl(request.nextUrl.pathname)
  if (!rule) return null
  if (rule.status === 301) {
    // Sin la query de la URL vieja: el destino es una página del sitio, con su ancla.
    return NextResponse.redirect(new URL(rule.to, request.nextUrl.origin), 301)
  }
  const mode = resolveMode(request.cookies.get(MODE_COOKIE)?.value)
  return new NextResponse(gonePage(mode), {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
