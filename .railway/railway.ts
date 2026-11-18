import { defineRailway, github, preserve, project, ref, service } from 'railway/iac'

// Infraestructura como código de Railway (docs/legacy/infra.md). Railway no la lee al
// desplegar: se aplica a mano, una vez por entorno, con `railway config plan` y
// `railway config apply`.
//
// Los secretos nunca van aquí: preserve() conserva el valor que ya tiene Railway y no
// crea nada, así que hay que crearlos en el panel. Toda variable de Railway se declara
// aquí antes de crearla: `railway config apply` borra las que no estén (docs/legacy/infra.md,
// sección 9).

const REPO = 'Dsantiagomj/ta-web'
// US East (Virginia), junto a Neon en AWS us-east-1.
const REGION = 'us-east4-eqdc4a'

const ENVIRONMENTS = ['dev', 'production'] as const

export default defineRailway((ctx) => {
  const environment = ctx.environment
  if (!ENVIRONMENTS.includes(environment as (typeof ENVIRONMENTS)[number])) {
    throw new Error(
      `Entorno de Railway desconocido: "${environment}". Solo existen ${ENVIRONMENTS.join(' y ')}.`,
    )
  }
  const dev = environment === 'dev'

  const web = service('web', {
    // dev despliega cada push a main sin esperar a los checks de GitHub: el PR ya pasó
    // el mismo CI antes de entrar. production no tiene fuente de GitHub: solo despliega
    // el workflow de release con `railway up`, detrás de la aprobación del entorno
    // production de GitHub y de Pruebas en el commit.
    ...(dev ? { source: github(REPO, { branch: 'main', checkSuites: false }) } : {}),
    build: { builder: 'RAILPACK', buildCommand: 'pnpm build' },
    start: 'pnpm start',
    // Migraciones por la URL directa de Neon; si fallan, el despliegue se para y la
    // versión anterior sigue sirviendo.
    preDeploy: 'pnpm migrate',
    // /api/health solo dice que el proceso responde; nunca toca la base. Una base caída
    // ya para el despliegue en el pre-deploy: `pnpm migrate` falla si Neon no contesta.
    healthcheck: '/api/health',
    healthcheckTimeout: 120,
    replicas: { [REGION]: 1 },
    deploy: {
      // Un `payload migrate` colgado no deja el despliegue en marcha para siempre.
      preDeployTimeoutSeconds: 600,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 5,
    },
    env: {
      // Node 24, como .nvmrc y engines.
      RAILPACK_NODE_VERSION: '24.22.2',
      DATABASE_URL: preserve(),
      DATABASE_URL_DIRECT: preserve(),
      PAYLOAD_SECRET: preserve(),
      NEXT_PUBLIC_SITE_URL: preserve(),
      S3_ENDPOINT: preserve(),
      S3_BUCKET: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
      MEDIA_BASE_URL: preserve(),
      // Errores del servidor a Sentry (src/instrumentation.ts). Sin ella, Sentry no arranca.
      SENTRY_DSN: preserve(),
      // Sube los source maps a Sentry durante el build (next.config.ts). Sin ella, no se suben.
      SENTRY_AUTH_TOKEN: preserve(),
      ...(dev
        ? {
            // Público pero sin indexar: noindex y robots.txt que prohíbe rastrear.
            APP_ENV: 'dev',
          }
        : {
            // `railway up` no trae RAILWAY_GIT_COMMIT_SHA: el workflow de release fija
            // aquí el commit de la etiqueta antes de desplegar.
            GIT_COMMIT_SHA: preserve(),
            // La versión de la etiqueta, que muestra /api/health. También la fija el
            // workflow de release.
            APP_VERSION: preserve(),
            // La analítica sin cookies (src/lib/analytics/umami.ts): la URL de Umami y el ID
            // de la web en Umami. Sin las dos, no se cuenta nada. En dev nunca se enciende.
            UMAMI_HOST: preserve(),
            UMAMI_WEBSITE_ID: preserve(),
          }),
    },
  })

  // La tarea semanal que trae de DofusDB los datos del juego (pnpm data:refresh, que deja su
  // fila en «Refrescos de datos»). Railway arranca el contenedor a su hora, corre el comando y
  // lo apaga: entre una vez y otra no gasta nada, y Neon puede dormir. dev despliega main desde
  // GitHub, como la web; producción no tiene fuente de GitHub: el workflow de release sube el
  // mismo commit que a la web con `railway up --service game-data`, después de que la web migre.
  // Los secretos son referencias a los de la web (${{web.X}}): no hay ninguno nuevo que crear.
  const gameData = service('game-data', {
    ...(dev ? { source: github(REPO, { branch: 'main', checkSuites: false }) } : {}),
    // payload run transpila los scripts al vuelo: el build de Next no hace falta.
    build: {
      builder: 'RAILPACK',
      buildCommand: 'echo "Sin build de Next: esta tarea solo corre pnpm data:refresh"',
    },
    start: 'pnpm data:refresh --schedule',
    replicas: { [REGION]: 1 },
    deploy: {
      // Los miércoles a las 06:00 UTC (07:00 u 08:00 en Madrid): Ankama suele parchear el
      // martes. Una vez por semana: cada vuelta despierta a Neon unos minutos.
      cronSchedule: '0 6 * * 3',
      // Un fallo no se reintenta solo: queda en «Refrescos de datos» y lo repite la semana
      // siguiente o el botón del panel.
      restartPolicyType: 'NEVER',
    },
    env: {
      RAILPACK_NODE_VERSION: '24.22.2',
      DATABASE_URL: web.env.DATABASE_URL,
      PAYLOAD_SECRET: web.env.PAYLOAD_SECRET,
      NEXT_PUBLIC_SITE_URL: web.env.NEXT_PUBLIC_SITE_URL,
      S3_ENDPOINT: web.env.S3_ENDPOINT,
      S3_BUCKET: web.env.S3_BUCKET,
      S3_ACCESS_KEY_ID: web.env.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: web.env.S3_SECRET_ACCESS_KEY,
      MEDIA_BASE_URL: web.env.MEDIA_BASE_URL,
      SENTRY_DSN: web.env.SENTRY_DSN,
      ...(dev
        ? { APP_ENV: 'dev' }
        : {
            // El release de Sentry de los errores de la tarea: el commit que el workflow de
            // release fija en la web antes de desplegar las dos. ref() porque el tipo de
            // web.env solo conoce las variables que la web declara en los dos entornos.
            GIT_COMMIT_SHA: ref(web, 'GIT_COMMIT_SHA'),
          }),
    },
  })

  return project('ta-web', { resources: [web, gameData] })
})
