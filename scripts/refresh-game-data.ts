// Refresca todos los datos del juego desde DofusDB (src/lib/dofusdb/refresh-game-data.ts):
// misiones, objetos, monstruos, mazmorras, subzonas, logros y PNJ, con sus imágenes, y crea
// los metalogros y páginas de logro que falten. Solo escribe lo que cambia y nunca toca la
// «Corrección de Torre» ni lo que Torre escribió. Al final imprime una línea por colección
// y qué filas de mazmorra de lo publicado llevan el icono genérico (`pnpm data:dungeon-notes`
// imprime solo eso, sin escribir nada).
// Uso: pnpm data:refresh (o su nombre de antes, pnpm data:quests). Escribe en la base de
// DATABASE_URL (vacía: la de pnpm db:dev). DOFUSDB_WRITE_CONCURRENCY fija cuántas
// escrituras van a la vez (por defecto 8). Sale con 1 si el refresco falla o alguna fila no
// se pudo guardar.
// Corre con `payload run`, que carga .env y transpila TypeScript; el script arranca
// Payload por su cuenta.
import { getPayload } from 'payload'

import config from '@payload-config'
import { dungeonNoteReport } from '@/lib/achievements/dungeon-report'
import { dungeonReportLines } from '@/lib/achievements/dungeon-report-lines'
import { refreshGameData, rowFailures, summaryLines } from '@/lib/dofusdb/refresh-game-data'
import { writeConcurrencyFromEnv } from '@/lib/dofusdb/refresh-quests'

import { runPayloadScript } from './payload-script'

// Antes de arrancar Payload: un valor mal escrito falla en el acto.
const concurrency = writeConcurrencyFromEnv(process.env)
const started = Date.now()
const log = (message: string) => console.log(message)

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const summary = await refreshGameData(payload, { concurrency, log })
    console.log(`Listo en ${((Date.now() - started) / 1000).toFixed(1)} s.`)
    for (const line of summaryLines(summary)) console.log(line)

    // Las filas de mazmorra de las páginas de logro, guías de Dofus y guías de misión
    // publicadas, clasificadas como las pinta cada página. Las demás llevan el icono
    // genérico hasta que Torre escriba la mazmorra con su nombre o el de su jefe, o la
    // elija a mano en la guía («Mazmorras de las notas», en Necesitarás).
    for (const line of dungeonReportLines(await dungeonNoteReport(payload))) console.log(line)

    const failed = rowFailures(summary)
    if (failed > 0) throw new Error(`${failed} filas no se pudieron guardar; mira el registro.`)
  },
  { label: 'El refresco de los datos del juego' },
)
