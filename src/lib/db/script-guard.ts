type Env = Record<string, string | undefined>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/**
 * Por qué un script que escribe en la base no debe correr en este entorno, o null si puede.
 * Producción (APP_ENV, Railway o NODE_ENV) pide --production; una base que no está en esta
 * máquina pide --remote, porque desde fuera no se distingue la de dev de la de producción.
 * `action` completa el mensaje: «… si de verdad quieres {action}.»
 */
export function databaseScriptRefusal(
  env: Env,
  args: readonly string[],
  action: string,
): string | null {
  const production = [env.APP_ENV, env.RAILWAY_ENVIRONMENT_NAME, env.NODE_ENV].some(
    (value) => value?.trim().toLowerCase() === 'production',
  )
  if (production) {
    return args.includes('--production')
      ? null
      : `Esto es producción: repite con --production si de verdad quieres ${action}.`
  }

  const url = env.DATABASE_URL?.trim()
  if (!url || args.includes('--remote') || args.includes('--production')) return null
  let host: string | null = null
  try {
    host = new URL(url).hostname
  } catch {
    // Sin host legible no se puede saber dónde está: cuenta como remota.
  }
  if (host && LOCAL_HOSTS.has(host)) return null
  return `DATABASE_URL apunta a una base remota (${host ?? 'sin host legible'}): repite con --remote si es la que quieres.`
}
