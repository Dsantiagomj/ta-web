import type { Endpoint } from 'payload'

import packageJson from '../../package.json'
import { deployedCommit } from '../lib/deploy/commit'

// Comprobación de vida: solo dice que el proceso responde, con la versión y el commit
// desplegados. Nunca toca la base. Los monitores de disponibilidad la llaman cada pocos
// minutos, y una consulta en cada llamada impedía que Neon escalara a cero: el
// 2026-11-13 agotó la cuota y tumbó dev y producción. La comprobación de la base está en
// /api/ready (ready.ts). Pública: no lleva autenticación, así que nunca devuelve
// secretos, mensajes de error ni trazas.

type LivenessInfo = { version: string; commit: string }

export function checkLiveness({ version, commit }: LivenessInfo): Response {
  return Response.json(
    { status: 'ok', version, commit },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  )
}

// El commit desplegado; "dev" si no se conoce (en local).
export function resolveCommit(env: Record<string, string | undefined>): string {
  return deployedCommit(env) ?? 'dev'
}

// La versión desplegada: el workflow de release fija APP_VERSION con la versión de la
// etiqueta; sin ella (dev, local), la de package.json.
export function resolveVersion(
  env: Record<string, string | undefined>,
  packageVersion: string,
): string {
  return env.APP_VERSION?.trim() || packageVersion
}

// Montado por Payload en /api/health, dentro de su ruta catch-all de /api. No recibe la
// petición a propósito: así no hay forma de llegar a req.payload.db desde aquí.
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: () =>
    checkLiveness({
      version: resolveVersion(process.env, packageJson.version),
      commit: resolveCommit(process.env),
    }),
}
