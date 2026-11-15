import type { Endpoint } from 'payload'

import { isAdminUser } from '../collections/editorial-access'
import { REFRESH_ENDPOINT_PATH } from '../lib/game-data/refresh-run-values'
import { startGameDataRefresh, type StartRefreshResult } from '../lib/game-data/refresh-runs'

// POST /api/game-data/refresh: el botón «Traer ahora» de «Refrescos de datos». Solo un
// administrador. Responde en cuanto el refresco está apuntado y lo deja corriendo en este
// proceso: tarda unos minutos y su fila dice cómo acabó. Si ya hay uno en marcha (la tarea
// semanal u otro clic), no empieza otro.

type UserLike = { id: number | string; role?: string | null } | null | undefined

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function gameDataRefreshResponse({
  user,
  start,
}: {
  user: UserLike
  start: (userId: number) => Promise<StartRefreshResult>
}): Promise<Response> {
  if (!user) return json({ error: 'Inicia sesión en el panel.' }, 401)
  if (!isAdminUser(user)) {
    return json({ error: 'Solo una cuenta de administrador puede traer los datos.' }, 403)
  }
  const result = await start(Number(user.id))
  if (result.status === 'busy') {
    return json({ error: 'Ya hay uno en marcha.', startedAt: result.running.startedAt }, 409)
  }
  // `done` nunca rechaza: un fallo queda apuntado en la fila del refresco.
  void result.done
  return json({ id: result.run.id, startedAt: result.run.startedAt }, 202)
}

export const gameDataRefreshEndpoint: Endpoint = {
  path: REFRESH_ENDPOINT_PATH,
  method: 'post',
  handler: (req) =>
    gameDataRefreshResponse({
      user: req.user,
      start: (userId) =>
        startGameDataRefresh(req.payload, {
          trigger: 'panel',
          requestedBy: userId,
          log: (message) => req.payload.logger.info(message),
        }),
    }),
}
