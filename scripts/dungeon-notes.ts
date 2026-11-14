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

const payload = await getPayload({ config })
try {
  for (const line of dungeonReportLines(await dungeonNoteReport(payload))) console.log(line)
  await payload.destroy()
} catch (error) {
  console.error('El informe de las notas de mazmorra falló:', error)
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
