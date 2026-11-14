// Dice, sin escribir nada, a qué mazmorra va cada nota de mazmorra de las páginas de logro
// publicadas y cómo casó: por nombre, por jefe, a mano en el panel o nada (el mismo informe
// que imprime `pnpm data:quests` al final, sin traer nada de DofusDB).
// Uso: pnpm data:dungeon-notes. Lee la base de DATABASE_URL. Contra dev:
// railway run --service web --environment dev pnpm data:dungeon-notes
// Corre con `payload run`, que carga .env y transpila TypeScript.
import { getPayload } from 'payload'

import config from '@payload-config'
import { dungeonNoteReport } from '@/lib/achievements/dungeon-report'
import { dungeonReportLines } from '@/lib/achievements/dungeon-report-lines'

import { runPayloadScript } from './payload-script'

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    for (const line of dungeonReportLines(await dungeonNoteReport(payload))) console.log(line)
  },
  { label: 'El informe de las notas de mazmorra' },
)
