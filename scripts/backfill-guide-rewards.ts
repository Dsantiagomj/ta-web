// Llena los campos de recompensa de las guías que existían antes de tenerlos: las cifras que
// Torre escribió en su texto de recompensas y, donde no hay, las de DofusDB. Solo llena lo
// vacío, así que repetirla no cambia nada (src/lib/guides/backfill-rewards.ts).
// Uso: pnpm guides:rewards [--apply] [--remote] [--production]
// Sin --apply solo lista lo que haría (en seco). Una guía cuya última versión está publicada
// se guarda publicada; si es un borrador, como borrador. Escribe en la base de DATABASE_URL
// (vacía: la de pnpm db:dev); contra una base remota pide --remote, y en producción
// --production. Va después de la migración quest_guide_rewards. Contra dev, en seco:
// railway run --service web --environment dev pnpm guides:rewards --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { backfillGuideRewards, rewardsReport } from '@/lib/guides/backfill-rewards'

import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'llenar las recompensas de sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const result = await backfillGuideRewards(payload, { apply })
    for (const line of rewardsReport(result, apply)) console.log(line)
  },
  { label: 'La carga de las recompensas de las guías' },
)
