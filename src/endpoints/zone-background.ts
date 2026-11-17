import type { Endpoint } from 'payload'

import { isAdminUser } from '../collections/editorial-access'
import { panelStrings } from '../lib/admin/strings'
import { fillZoneBackground, type FillZoneResult } from '../lib/zones/fill'

// POST /api/subareas/:id/zone-background: el botón «Traer fondo de DofusDB» de una subzona.
// Solo un administrador. Con { mapId }, trae el render de ese mapa; sin él, el del mapa del
// fondo guardado o el que elige pickBackgroundMap. Guarda el fondo y responde con él.

const t = panelStrings.zoneBackground

type UserLike = { id: number | string; role?: string | null } | null | undefined

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** El mapa pedido: ausente o vacío es null; un entero positivo, ese; lo demás, inválido. */
function requestedMap(body: unknown): number | null | undefined {
  const value = (body as { mapId?: unknown } | null | undefined)?.mapId
  if (value === undefined || value === null || value === '') return null
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : undefined
}

export async function zoneBackgroundResponse({
  user,
  id,
  body,
  fill,
}: {
  user: unknown
  id: unknown
  body: unknown
  fill: (subAreaId: number, mapId: number | null) => Promise<FillZoneResult>
}): Promise<Response> {
  if (!user) return json({ error: t.signIn }, 401)
  if (!isAdminUser(user as UserLike)) return json({ error: t.forbidden }, 403)
  const subAreaId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : null
  const mapId = requestedMap(body)
  if (subAreaId === null || mapId === undefined) {
    return json({ error: t.invalid }, 400)
  }
  try {
    const result = await fill(subAreaId, mapId)
    if (result.status === 'no-maps') return json({ error: t.noMaps }, 404)
    return json({ mapId: result.mapId, mediaId: result.mediaId }, 200)
  } catch (error) {
    return json({ error: t.error, detail: error instanceof Error ? error.message : '' }, 502)
  }
}

export const zoneBackgroundEndpoint: Endpoint = {
  path: '/:id/zone-background',
  method: 'post',
  handler: async (req) =>
    zoneBackgroundResponse({
      user: req.user,
      id: req.routeParams?.id,
      body: await req.json?.().catch(() => ({})),
      fill: (subAreaId, mapId) => fillZoneBackground(req.payload, subAreaId, { mapId }),
    }),
}
