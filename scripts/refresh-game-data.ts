// Refresca todos los datos del juego desde DofusDB (src/lib/dofusdb/refresh-game-data.ts):
// misiones, objetos, monstruos, mazmorras, subzonas, logros y PNJ, con sus imágenes, y crea
// los metalogros y páginas de logro que falten. Solo escribe lo que cambia y nunca toca la
// «Corrección de Torre» ni lo que Torre escribió. Deja su fila en «Refrescos de datos»
// (src/lib/game-data/refresh-runs.ts) y no empieza si ya hay otro en marcha, también si lo
// lanzó el panel. Al final imprime una línea por colección y qué filas de mazmorra de lo
// publicado llevan el icono genérico (`pnpm data:dungeon-notes` imprime solo eso).
// Uso: pnpm data:refresh [--schedule] (o su nombre de antes, pnpm data:quests). La tarea
// semanal de Railway pasa --schedule (.railway/railway.ts). Escribe en la base de
// DATABASE_URL (vacía: la de pnpm db:dev). DOFUSDB_WRITE_CONCURRENCY fija cuántas
// escrituras van a la vez (por defecto 8). Sale con 1 si el refresco falla o alguna fila no
// se pudo guardar; con 0 si ya había otro en marcha.
// Corre con `payload run`, que carga .env y transpila TypeScript; el script arranca
// Payload por su cuenta.
import { getPayload } from 'payload'

import config from '@payload-config'
import { dungeonNoteReport } from '@/lib/achievements/dungeon-report'
import { dungeonReportLines } from '@/lib/achievements/dungeon-report-lines'
import { refreshGameData } from '@/lib/dofusdb/refresh-game-data'
import { writeConcurrencyFromEnv } from '@/lib/dofusdb/refresh-quests'
import { triggerFromArgs } from '@/lib/game-data/refresh-run-values'
import { startGameDataRefresh } from '@/lib/game-data/refresh-runs'

import { runPayloadScript } from './payload-script'

// Antes de arrancar Payload: un valor mal escrito falla en el acto.
const concurrency = writeConcurrencyFromEnv(process.env)
const trigger = triggerFromArgs(process.argv.slice(2))
const started = Date.now()
const log = (message: string) => console.log(message)

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const start = await startGameDataRefresh(payload, {
      trigger,
      log,
      refresh: (write) => refreshGameData(payload, { concurrency, log: write }),
    })
    if (start.status === 'busy') {
      console.log(`Ya hay un refresco en marcha desde ${start.running.startedAt}; no empiezo otro.`)
      return
    }

    const run = await start.done
    console.log(`Acabó en ${((Date.now() - started) / 1000).toFixed(1)} s.`)
    if (run.report) console.log(run.report)
    if (run.status === 'failed') throw new Error(run.error ?? 'el refresco falló')

    // Las filas de mazmorra de las páginas de logro, guías de Dofus y guías de misión
    // publicadas, clasificadas como las pinta cada página. Las demás llevan el icono
    // genérico hasta que Torre escriba la mazmorra con su nombre o el de su jefe, o la
    // elija a mano en la guía («Mazmorras de las notas», en Necesitarás).
    for (const line of dungeonReportLines(await dungeonNoteReport(payload))) console.log(line)

    if (run.status === 'partial') {
      throw new Error('Algunas filas no se pudieron guardar; mira el registro.')
    }
  },
  { label: 'El refresco de los datos del juego' },
)
