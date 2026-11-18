// Pone al día el texto del resumen (Prerrequisitos, Necesitarás y Recompensas) de las guías
// importadas antes de dos arreglos del importador: las sublistas, que salían pegadas y
// repetidas (las recompensas por nivel de Pazcuak), y la etiqueta «Prerequisitos:», que no se
// reconocía y se quedaba en el cuerpo. Lee la página guardada de cada guía en la carpeta del
// inventario (raw/pages/<slug>.html) y sigue la regla de la importación: un campo cambia solo
// mientras tiene lo que escribió la última importación (scripts/import/backfill-summary-text.ts).
// Uso: pnpm guides:summary-text <carpeta de la migración> [--apply] [--remote] [--production]
// Sin --apply solo lista lo que haría (en seco). Una guía cuya última versión está publicada se
// guarda publicada; si es un borrador, como borrador. Escribe en la base de DATABASE_URL (vacía:
// la de pnpm db:dev); contra una base remota pide --remote, y en producción --production.
// Contra dev, en seco:
// railway run -s web -e dev -- pnpm guides:summary-text <carpeta> --remote
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { backfillSummaryText, summaryTextReport } from './import/backfill-summary-text'
import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
const dir = args.find((arg) => !arg.startsWith('--'))
if (!dir) {
  console.error(
    'Uso: pnpm guides:summary-text <carpeta de la migración> [--apply] [--remote] [--production]',
  )
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'poner al día el resumen de sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

async function readPage(slug: string): Promise<string | null> {
  try {
    return await readFile(path.join(dir!, 'raw', 'pages', `${slug}.html`), 'utf8')
  } catch {
    return null
  }
}

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const result = await backfillSummaryText(payload, {
      readPage,
      apply,
      log: (message) => console.log(message),
    })
    for (const line of summaryTextReport(result, apply)) console.log(line)
  },
  { label: 'La puesta al día del resumen de las guías' },
)
