// Lista, sin escribir nada, cada enlace que el sitio pintaría hacia la web de Squarespace
// (https://www.torrentearcano.com): del código (el menú, el pie), del contenido de Torre (los
// textos y enlaces de lo publicado) y el `legacyHref` de lo En preparación, con dónde sale y
// qué responderá este sitio en esa ruta tras el cambio de dominio (página publicada,
// redirección, 410 o nada). El día del cambio debe salir vacío, salvo lo que decida Torre
// (AGENTS.md, Redirects). Lógica en scripts/legacy-links/.
// Uso: pnpm links:legacy [--remote] [--production]
// Lee la base de DATABASE_URL (vacía: la de pnpm db:dev); una base remota pide --remote, y
// producción --production. Contra dev:
// railway run -s web -e dev -- pnpm links:legacy --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { collectLegacyLinks } from './legacy-links/collect'
import { reportLines } from './legacy-links/report'
import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'leer los enlaces de esa base')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const { entries, relative } = await collectLegacyLinks(payload)
    for (const line of reportLines(entries, { relative })) console.log(line)
  },
  { label: 'El informe de enlaces a Squarespace' },
)
