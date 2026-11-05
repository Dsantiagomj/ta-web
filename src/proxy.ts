import { NextResponse } from 'next/server'

import { NOINDEX_HEADER, isDevEnvironment } from '@/lib/dev-gate/dev-gate'

// Proxy de Next (antes middleware), en el runtime de Node: lee el entorno en cada
// petición, no al compilar. Solo actúa en el entorno dev, que es público pero no se
// indexa: noindex en cada respuesta. Sin matcher, para cubrir también los estáticos, la
// API y el panel.
export function proxy() {
  const response = NextResponse.next()
  if (isDevEnvironment(process.env)) response.headers.set('X-Robots-Tag', NOINDEX_HEADER)
  return response
}
