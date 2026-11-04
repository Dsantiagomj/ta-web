import { defineRailway, github, preserve, project, service } from 'railway/iac'

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
    // /api/health responde ok solo con la base arriba: margen para un Neon que despierta.
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
            APP_ENV: 'dev',
            DEV_BASIC_AUTH_USER: preserve(),
            DEV_BASIC_AUTH_PASSWORD: preserve(),
          }
        : {
            // `railway up` no trae RAILWAY_GIT_COMMIT_SHA: el workflow de release fija
            // aquí el commit de la etiqueta antes de desplegar.
            GIT_COMMIT_SHA: preserve(),
            // La versión de la etiqueta, que muestra /api/health. También la fija el
            // workflow de release.
            APP_VERSION: preserve(),
          }),
    },
  })

  return project('ta-web', { resources: [web] })
})
