import { postgresAdapter, type PostgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AchievementCategories } from './collections/AchievementCategories'
import { AchievementGroups } from './collections/AchievementGroups'
import { AchievementPages } from './collections/AchievementPages'
import { Achievements } from './collections/Achievements'
import { DofusGuides } from './collections/DofusGuides'
import { Items } from './collections/Items'
import { Media } from './collections/Media'
import { Monsters } from './collections/Monsters'
import { Npcs } from './collections/Npcs'
import { QuestGuides } from './collections/QuestGuides'
import { Quests } from './collections/Quests'
import { Users } from './collections/Users'
import { dofusDbValuesEndpoint } from './endpoints/dofusdb-values'
import { DofusGuidesIndex } from './globals/DofusGuidesIndex'
import { healthEndpoint } from './endpoints/health'
import { searchIndexEndpoint } from './endpoints/search-index'
import { resolveDatabaseUrl, shouldPushSchema } from './lib/db/database-url'
import { mediaStorage } from './lib/media/storage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Quests,
    Items,
    Monsters,
    Npcs,
    AchievementCategories,
    Achievements,
    QuestGuides,
    AchievementPages,
    AchievementGroups,
    DofusGuides,
  ],
  globals: [DofusGuidesIndex],
  editor: lexicalEditor(),
  // GET /api/health, para los smoke tests tras un despliegue; GET /api/search/guides, el
  // índice de la búsqueda de la cabecera.
  // GET /api/dofusdb-values/…, lo que da DofusDB para las notas del panel de logros.
  endpoints: [healthEndpoint, searchIndexEndpoint, dofusDbValuesEndpoint],
  // Panel en español.
  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: { es },
  },
  // Solo español al lanzar; los campos traducibles llevan `localized: true`
  // para que un segundo idioma sea una traducción y no una reescritura.
  localization: {
    locales: [{ code: 'es', label: 'Español' }],
    defaultLocale: 'es',
    fallback: true,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, 'migrations'),
    push: shouldPushSchema(process.env),
    pool: {
      connectionString: resolveDatabaseUrl(process.env),
      // Conseguir una conexión nunca espera sin límite, aunque la base esté colgada
      connectionTimeoutMillis: 5000,
      // pg retira el manejador del pool mientras Drizzle tiene la conexión prestada.
      // El dueño de la transacción propaga el fallo y libera el cliente; pg descarta
      // los clientes no consultables al liberarlos. No reintentamos la transacción.
      onConnect: (client) => {
        client.on('error', (error) => {
          console.error('Conexión de Postgres prestada perdida:', error)
        })
      },
    },
  }),
  // Una conexión inactiva que se cae (Neon las reinicia) se registra y el pool la
  // sustituye; sin este manejador, el error tumbaría el proceso
  onInit: async (payload) => {
    ;(payload.db as unknown as PostgresAdapter).pool.on('error', (error) => {
      payload.logger.error({ err: error }, 'Conexión de Postgres perdida en el pool')
    })
  },
  sharp,
  plugins: [mediaStorage()],
})
