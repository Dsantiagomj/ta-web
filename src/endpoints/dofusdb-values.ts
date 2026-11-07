import type { Endpoint } from 'payload'

import { achievementValues, groupValues } from '../lib/achievements/dofusdb-source'
import type { ValuesSource } from '../lib/achievements/dofusdb-values'

// Lo que DofusDB da para una página de logro (por el ID de su logro) o un metalogro (por el
// de su categoría), en GET /api/dofusdb-values/:source/:id. Lo pide la nota del panel bajo
// cada campo; es lo mismo que usa el hook de relleno al guardar. Solo para el panel.

const SOURCES: ValuesSource[] = ['achievement', 'group']

type Load = (source: ValuesSource, id: number) => Promise<unknown | null>

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function dofusDbValuesResponse({
  user,
  source,
  id,
  load,
}: {
  user: unknown
  source: unknown
  id: unknown
  load: Load
}): Promise<Response> {
  if (!user) return json({ error: 'Inicia sesión en el panel.' }, 401)
  const numeric = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : null
  if (!SOURCES.includes(source as ValuesSource) || !numeric) {
    return json({ error: 'Origen o ID no válidos.' }, 400)
  }
  const values = await load(source as ValuesSource, numeric)
  return values ? json(values, 200) : json({ error: 'No existe.' }, 404)
}

export const dofusDbValuesEndpoint: Endpoint = {
  path: '/dofusdb-values/:source/:id',
  method: 'get',
  handler: (req) =>
    dofusDbValuesResponse({
      user: req.user,
      source: req.routeParams?.source,
      id: req.routeParams?.id,
      load: (source, id) =>
        source === 'achievement'
          ? achievementValues(req.payload, id, req)
          : groupValues(req.payload, id, req),
    }),
}
