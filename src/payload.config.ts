import { postgresAdapter, type PostgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { Quests } from './collections/Quests'
import { Users } from './collections/Users'
import { healthEndpoint } from './endpoints/health'
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
  collections: [Users, Media, Quests],
  editor: lexicalEditor(),
  // GET /api/health, para los smoke tests tras un despliegue.
  endpoints: [healthEndpoint],
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
