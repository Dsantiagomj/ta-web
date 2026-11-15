// Los valores de «Refrescos de datos» (src/collections/GameDataRefreshes.ts), aparte para que
// el panel los use sin cargar Payload.

/** Quién lanzó el refresco: la tarea semanal de Railway, el botón del panel o un script. */
export const REFRESH_TRIGGERS = ['schedule', 'panel', 'script'] as const
export type RefreshTrigger = (typeof REFRESH_TRIGGERS)[number]

/** En marcha; hecho; hecho con filas que no se guardaron; o falló entero. */
export const REFRESH_STATUSES = ['running', 'ok', 'partial', 'failed'] as const
export type RefreshStatus = (typeof REFRESH_STATUSES)[number]

/** El valor de `lock` mientras un refresco corre. Es único en la base. */
export const REFRESH_LOCK = 'running'

/** POST: lanza un refresco desde el panel (src/endpoints/game-data-refresh.ts). */
export const REFRESH_ENDPOINT_PATH = '/game-data/refresh'

/** Quién lanza `pnpm data:refresh`: la tarea semanal pasa --schedule; sin nada, un script. */
export function triggerFromArgs(args: string[]): RefreshTrigger {
  // `payload run` puede dejar el `--` que separa sus opciones de las del script.
  const unknown = args.filter((arg) => arg !== '--schedule' && arg !== '--')
  if (unknown.length > 0) {
    throw new Error(`Opción desconocida: ${unknown.join(' ')}. Solo existe --schedule.`)
  }
  return args.includes('--schedule') ? 'schedule' : 'script'
}
