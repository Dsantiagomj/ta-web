import { defineRailway, github, preserve, project, service } from 'railway/iac'

// Infraestructura como código de Railway (docs/infra.md). Railway no la lee al
// desplegar: se aplica a mano, una vez por entorno, con `railway config plan` y
// `railway config apply` (README, "Go-live checklist" de docs/infra.md).
//
// Los secretos nunca van aquí: preserve() conserva el valor que ya tiene Railway, así
// que hay que crearlos en el panel antes de aplicar.

const REPO = 'Dsantiagomj/torrente-arcano'
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
    // dev despliega cada push a main en cuanto pasan los checks de GitHub. production
    // no tiene fuente de GitHub: solo despliega el workflow de release con `railway up`,
    // detrás de la aprobación del entorno production de GitHub.
    ...(dev ? { source: github(REPO, { branch: 'main', checkSuites: true }) } : {}),
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
          }),
    },
  })

  return project('torrente-arcano', { resources: [web] })
})
