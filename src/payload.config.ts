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
import { Checklists } from './collections/Checklists'
import { Achievements } from './collections/Achievements'
import { DofusGuides } from './collections/DofusGuides'
import { Dungeons } from './collections/Dungeons'
import { Items } from './collections/Items'
import { Media } from './collections/Media'
import { Monsters } from './collections/Monsters'
import { Npcs } from './collections/Npcs'
import { SubAreas } from './collections/SubAreas'
import { QuestGuides } from './collections/QuestGuides'
import { Quests } from './collections/Quests'
import { Users } from './collections/Users'
import { dofusDbValuesEndpoint } from './endpoints/dofusdb-values'
import { DofusGuidesIndex } from './globals/DofusGuidesIndex'
import { healthEndpoint } from './endpoints/health'
import { readyEndpoint } from './endpoints/ready'
import { searchIndexEndpoint } from './endpoints/search-index'
import { withPanelDescriptions } from './lib/admin/panel-guide'
import { panelStrings } from './lib/admin/strings'
import { resolveDatabaseUrl, shouldPushSchema } from './lib/db/database-url'
import { SITE_LOCALE } from './lib/site/locale'
import { mediaStorage } from './lib/media/storage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: panelStrings.dateFormat,
    // La marca de Torrente Arcano en lugar de la de Payload (src/components/admin/PanelBrand.tsx).
    meta: {
      titleSuffix: panelStrings.titleSuffix,
      icons: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/icon1.png' },
        { rel: 'icon', type: 'image/svg+xml', url: '/icon2.svg' },
        { rel: 'apple-touch-icon', url: '/apple-icon.png' },
      ],
    },
    components: {
      graphics: {
        Logo: '/components/admin/PanelBrand#PanelLogo',
        Icon: '/components/admin/PanelBrand#PanelIcon',
      },
      beforeLogin: ['/components/admin/PanelBrand#LoginWelcome'],
      // «Pendiente»: lo que Torre tiene a medias, en lugar de la cuadrícula de colecciones.
      views: {
        dashboard: { Component: '/components/admin/Dashboard#Dashboard' },
        // La «Guía del panel» (A-14), en /admin/guia, enlazada al final del menú.
        panelGuide: { Component: '/components/admin/PanelGuide#PanelGuide', path: '/guia' },
      },
      afterNavLinks: ['/components/admin/PanelGuideNavLink#PanelGuideNavLink'],
    },
  },
  // El orden es el del menú: primero el contenido de Torre, luego las imágenes, los datos
  // del juego (solo lectura) y las cuentas del panel. Cada grupo sale de `admin.group`.
  // Cada colección lleva arriba de su lista la línea de src/lib/admin/panel-guide.ts.
  collections: withPanelDescriptions([
    QuestGuides,
    AchievementPages,
    AchievementGroups,
    DofusGuides,
    Checklists,
    Media,
    Quests,
    Items,
    Monsters,
    Dungeons,
    Npcs,
    SubAreas,
    AchievementCategories,
    Achievements,
    Users,
  ]),
  globals: [DofusGuidesIndex],
  editor: lexicalEditor({ admin: { placeholder: panelStrings.editorPlaceholder } }),
  // GET /api/health, la comprobación de vida que llaman los monitores (nunca toca la base);
  // GET /api/ready, la de la base, para los smoke tests tras un despliegue;
  // GET /api/search/guides, el índice de la búsqueda de la cabecera.
  // GET /api/dofusdb-values/…, lo que da DofusDB para las notas del panel de logros.
  endpoints: [healthEndpoint, readyEndpoint, searchIndexEndpoint, dofusDbValuesEndpoint],
  // Panel en español.
  // Algunas palabras de Payload cambian: el estado de la cabecera dice si lo guardado ya está
  // en la web, de tú (src/lib/admin/strings.ts).
  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: { es },
    translations: { es: panelStrings.translations },
  },
  // Solo español al lanzar; los campos traducibles llevan `localized: true`
  // para que un segundo idioma sea una traducción y no una reescritura.
  localization: {
    locales: [{ code: SITE_LOCALE, label: 'Español' }],
    defaultLocale: SITE_LOCALE,
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
