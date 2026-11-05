type Env = Record<string, string | undefined>

// Entorno de desarrollo (docs/legacy/infra.md, sección 7): público, pero nunca indexado.
// Se activa con APP_ENV=dev o en el entorno `dev` de Railway; allí cada respuesta lleva
// noindex (src/proxy.ts) y robots.txt prohíbe rastrear todo (./robots.ts). En
// producción, en local y en CI no hace nada.

export const NOINDEX_HEADER = 'noindex, nofollow'

export function isDevEnvironment(env: Env): boolean {
  return [env.APP_ENV, env.RAILWAY_ENVIRONMENT_NAME].some(
    (value) => value?.trim().toLowerCase() === 'dev',
  )
}
