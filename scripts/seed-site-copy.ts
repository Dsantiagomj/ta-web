// Escribe el texto de siempre en los campos vacíos de «Ajustes del sitio» y «Portada e
// índices», para que Torre lo vea en el panel (src/lib/site-copy/seed.ts). Solo llena lo
// vacío, así que repetirla no cambia nada. Va después de la migración site_copy.
// Uso: pnpm seed:site-copy [--apply] [--remote] [--production]
// Sin --apply solo lista lo que haría (en seco). Escribe en la base de DATABASE_URL (vacía:
// la de pnpm db:dev); contra una base remota pide --remote, y en producción --production.
// Contra dev, en seco:
// railway run -s web -e dev -- pnpm exec payload run scripts/seed-site-copy.ts -- --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { seedReport, seedSiteCopy } from '@/lib/site-copy/seed'

import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'llenar los textos del sitio')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    for (const line of seedReport(await seedSiteCopy(payload, { apply }), apply)) {
      console.log(line)
    }
  },
  { label: 'La carga de los textos del sitio' },
)
