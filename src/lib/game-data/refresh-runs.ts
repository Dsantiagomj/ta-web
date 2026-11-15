// Un refresco de los datos del juego con su fila en «Refrescos de datos»
// (src/collections/GameDataRefreshes.ts): la apunta en marcha, corre el refresco y apunta
// cómo acabó. La fila en marcha lleva `lock`, único en la base, así que un segundo refresco
// no puede empezar mientras otro sigue, aunque lo lance otro proceso: la tarea semanal de
// Railway corre en su propio contenedor y el botón del panel en el de la web.
import type { Payload } from 'payload'

import type { GameDataRefresh } from '../../payload-types'
import { panelStrings } from '../admin/strings'
import {
  refreshGameData,
  rowFailures,
  summaryLines,
  type GameDataSummary,
} from '../dofusdb/refresh-game-data'
import { REFRESH_LOCK, type RefreshTrigger } from './refresh-run-values'

/**
 * Pasado este tiempo, un refresco que sigue «en marcha» se dio por cortado: su proceso murió
 * (un despliegue, un reinicio) sin apuntar cómo acabó. Uno normal tarda unos minutos; el
 * primero con muchos PNJ nuevos, hasta una hora.
 */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000

const COLLECTION = 'game-data-refreshes'

export interface StartRefreshOptions {
  trigger: RefreshTrigger
  /** La cuenta del panel que lo lanzó. El refresco escribe sin cuenta igualmente. */
  requestedBy?: number
  /** El refresco en sí; por defecto, el de verdad contra DofusDB. */
  refresh?: (log: (message: string) => void) => Promise<GameDataSummary>
  log?: (message: string) => void
  now?: () => Date
}

export type StartRefreshResult =
  | { status: 'busy'; running: GameDataRefresh }
  | { status: 'started'; run: GameDataRefresh; done: Promise<GameDataRefresh> }

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function runningRefresh(payload: Payload): Promise<GameDataRefresh | undefined> {
  const { docs } = await payload.find({
    collection: COLLECTION,
    where: { lock: { equals: REFRESH_LOCK } },
    limit: 1,
    depth: 0,
  })
  return docs[0]
}

/**
 * Empieza un refresco si no hay otro en marcha. Devuelve en cuanto lo apunta: `done` acaba
 * con la fila ya cerrada y nunca rechaza; un fallo queda apuntado en ella.
 */
export async function startGameDataRefresh(
  payload: Payload,
  options: StartRefreshOptions,
): Promise<StartRefreshResult> {
  const now = options.now ?? (() => new Date())
  const log = options.log ?? (() => {})
  const refresh =
    options.refresh ??
    ((write: (message: string) => void) => refreshGameData(payload, { log: write }))

  // Uno que lleva horas «en marcha» se cortó: se cierra para que no bloquee para siempre.
  await payload.update({
    collection: COLLECTION,
    where: {
      lock: { equals: REFRESH_LOCK },
      startedAt: { less_than: new Date(now().getTime() - STALE_AFTER_MS).toISOString() },
    },
    data: {
      status: 'failed',
      lock: null,
      finishedAt: now().toISOString(),
      error: panelStrings.gameDataRefresh.stale,
    },
    depth: 0,
  })

  let run: GameDataRefresh
  try {
    run = await payload.create({
      collection: COLLECTION,
      data: {
        trigger: options.trigger,
        status: 'running',
        lock: REFRESH_LOCK,
        startedAt: now().toISOString(),
        requestedBy: options.requestedBy ?? null,
      },
      depth: 0,
    })
  } catch (error) {
    // `lock` es único: si otro lo tiene, la base rechaza esta fila.
    const running = await runningRefresh(payload)
    if (running) return { status: 'busy', running }
    throw error
  }

  const finish = (data: Partial<GameDataRefresh>) =>
    payload.update({
      collection: COLLECTION,
      id: run.id,
      data: { ...data, lock: null, finishedAt: now().toISOString() },
      depth: 0,
    })

  const done = (async () => {
    try {
      const summary = await refresh(log)
      return await finish({
        status: rowFailures(summary) > 0 ? 'partial' : 'ok',
        report: summaryLines(summary).join('\n'),
        summary: summary as unknown as GameDataRefresh['summary'],
      })
    } catch (error) {
      log(`El refresco de los datos del juego falló: ${errorText(error)}`)
      try {
        return await finish({ status: 'failed', error: errorText(error) })
      } catch (finishError) {
        // Sin base para apuntarlo: la fila se queda en marcha y se da por cortada en
        // STALE_AFTER_MS.
        log(`No se pudo apuntar el fallo: ${errorText(finishError)}`)
        return { ...run, status: 'failed' as const, error: errorText(error) }
      }
    }
  })()

  return { status: 'started', run, done }
}

/** El último refresco que empezó, o null si nunca hubo uno. */
export async function lastGameDataRefresh(payload: Payload): Promise<GameDataRefresh | null> {
  const { docs } = await payload.find({
    collection: COLLECTION,
    sort: '-startedAt',
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}
