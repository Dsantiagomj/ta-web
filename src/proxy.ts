import { NextResponse, type NextRequest } from 'next/server'

import { NOINDEX_HEADER, decideDevGate, devGateResponse } from '@/lib/dev-gate/dev-gate'

// Proxy de Next (antes middleware), en el runtime de Node: lee el entorno en cada
// petición, no al compilar. Solo actúa en el entorno dev: basic auth en todo, salvo
// /api/health, y noindex en cada respuesta. Sin matcher, para cubrir también los
// estáticos y el panel.
export function proxy(request: NextRequest) {
  const decision = decideDevGate({
    env: process.env,
    pathname: request.nextUrl.pathname,
    authorization: request.headers.get('authorization'),
  })

  if (decision.kind === 'open') return NextResponse.next()
  if (decision.kind === 'allow') {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', NOINDEX_HEADER)
    return response
  }
  return devGateResponse(decision)
}
