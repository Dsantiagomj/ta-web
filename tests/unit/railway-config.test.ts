import { createRailwayContext, project, type RailwayContextInput } from 'railway/iac'
import { describe, expect, it } from 'vitest'

import railway from '../../.railway/railway'

// La configuración de Railway (.railway/railway.ts) evaluada como la evalúa
// `railway config plan` para cada entorno, sin cuenta ni red.
async function webService(environment: string) {
  const ctx = createRailwayContext({ environment } as RailwayContextInput)
  const definition = await railway(ctx, project)
  expect(definition.name).toBe('ta-web')
  const web = (definition.resources ?? []).find(
    (resource) => 'address' in resource && resource.address === 'service.web',
  )
  expect(web, 'falta el servicio web').toBeDefined()
  return web as unknown as {
    source?: { type: string; repo?: string; branch?: string; checkSuites?: boolean }
    build: Record<string, unknown>
    deploy: Record<string, unknown>
    variables: Record<string, { type: string; value?: string }>
  }
}

describe.each(['dev', 'production'])('servicio web en %s', (environment) => {
  it('compila con Railpack y pnpm build y arranca con pnpm start', async () => {
    const web = await webService(environment)

    expect(web.build).toMatchObject({ builder: 'RAILPACK', buildCommand: 'pnpm build' })
    expect(web.deploy.startCommand).toBe('pnpm start')
    // Node 24, el de .nvmrc y engines; explícito para que Railpack no elija otro.
    expect(web.variables.RAILPACK_NODE_VERSION).toEqual({ type: 'literal', value: '24.22.2' })
  })

  it('migra antes de cada despliegue, con plazo', async () => {
    const web = await webService(environment)

    expect(web.deploy.preDeployCommand).toEqual(['pnpm migrate'])
    expect(web.deploy.preDeployTimeoutSeconds).toBeGreaterThan(0)
  })

  it('espera a /api/health y reinicia si el proceso cae', async () => {
    const web = await webService(environment)

    expect(web.deploy.healthcheckPath).toBe('/api/health')
    expect(web.deploy.healthcheckTimeout).toBeGreaterThanOrEqual(30)
    expect(web.deploy.healthcheckTimeout).toBeLessThanOrEqual(300)
    expect(web.deploy.restartPolicyType).toBe('ON_FAILURE')
    expect(web.deploy.restartPolicyMaxRetries).toBeGreaterThan(0)
  })

  it('corre en US East, junto a Neon us-east-1', async () => {
    const web = await webService(environment)

    expect(web.deploy.multiRegionConfig).toEqual({ 'us-east4-eqdc4a': { numReplicas: 1 } })
  })

  it('los secretos nunca están en el archivo: se conservan los de Railway', async () => {
    const web = await webService(environment)

    for (const name of [
      'DATABASE_URL',
      'DATABASE_URL_DIRECT',
      'PAYLOAD_SECRET',
      'NEXT_PUBLIC_SITE_URL',
      'S3_ENDPOINT',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'MEDIA_BASE_URL',
      // `railway config apply` borra las variables que no están aquí.
      'SENTRY_DSN',
      'SENTRY_AUTH_TOKEN',
    ]) {
      expect(web.variables[name], name).toEqual({ type: 'preserve' })
    }
  })
})

describe('dev', () => {
  // Los PR ya pasan el mismo CI antes de entrar (rebase, historia lineal). Esperar otra
  // vez a los checks de GitHub sobre main solo retrasaba el despliegue.
  it('despliega cada push a main sin esperar al CI de main', async () => {
    const web = await webService('dev')

    expect(web.source).toMatchObject({
      type: 'github',
      repo: 'Dsantiagomj/ta-web',
      branch: 'main',
      checkSuites: false,
    })
  })

  it('marca el entorno como dev y ya no declara credenciales de basic auth', async () => {
    const web = await webService('dev')

    expect(web.variables.APP_ENV).toEqual({ type: 'literal', value: 'dev' })
    expect(web.variables.DEV_BASIC_AUTH_USER).toBeUndefined()
    expect(web.variables.DEV_BASIC_AUTH_PASSWORD).toBeUndefined()
  })
})

describe('production', () => {
  it('no se conecta a GitHub: solo despliega el workflow de release', async () => {
    const web = await webService('production')

    expect(web.source).toBeUndefined()
  })

  it('no se marca como dev y conserva el commit y la versión que fija el release', async () => {
    const web = await webService('production')

    expect(web.variables.APP_ENV).toBeUndefined()
    expect(web.variables.DEV_BASIC_AUTH_USER).toBeUndefined()
    expect(web.variables.GIT_COMMIT_SHA).toEqual({ type: 'preserve' })
    expect(web.variables.APP_VERSION).toEqual({ type: 'preserve' })
  })
})

it('cualquier otro entorno falla en vez de adivinar', async () => {
  const ctx = createRailwayContext({ environment: 'staging' } as RailwayContextInput)
  await expect(async () => railway(ctx, project)).rejects.toThrow(/staging/)
})

// La tarea semanal que trae de DofusDB los datos del juego (pnpm data:refresh): un servicio
// cron aparte, solo en dev por ahora. Producción no tiene fuente de GitHub; su tarea llegará
// con el workflow de release.
async function gameDataService(environment: string) {
  const ctx = createRailwayContext({ environment } as RailwayContextInput)
  const definition = await railway(ctx, project)
  return (definition.resources ?? []).find(
    (resource) => 'address' in resource && resource.address === 'service.game-data',
  ) as unknown as
    | {
        source?: { type: string; repo?: string; branch?: string; checkSuites?: boolean }
        build: Record<string, unknown>
        deploy: Record<string, unknown>
        variables: Record<
          string,
          { type: string; value?: string; resource?: string; output?: string }
        >
      }
    | undefined
}

describe('tarea semanal de los datos del juego en dev', () => {
  it('corre pnpm data:refresh --schedule una vez por semana, el miércoles a las 06:00 UTC', async () => {
    const job = await gameDataService('dev')
    expect(job, 'falta el servicio game-data').toBeDefined()

    expect(job!.deploy.startCommand).toBe('pnpm data:refresh --schedule')
    expect(job!.deploy.cronSchedule).toBe('0 6 * * 3')
  })

  it('no reintenta un fallo ni se queda encendida: la siguiente semana o el panel lo repiten', async () => {
    const job = await gameDataService('dev')

    expect(job!.deploy.restartPolicyType).toBe('NEVER')
    expect(job!.deploy.healthcheckPath).toBeUndefined()
    // Las migraciones las corre la web antes de desplegar; la tarea no migra.
    expect(job!.deploy.preDeployCommand).toBeUndefined()
  })

  it('despliega main como la web, sin el build de Next, que no usa', async () => {
    const job = await gameDataService('dev')

    expect(job!.source).toMatchObject({
      type: 'github',
      repo: 'Dsantiagomj/ta-web',
      branch: 'main',
    })
    expect(job!.build.builder).toBe('RAILPACK')
    expect(job!.build.buildCommand).not.toMatch(/pnpm build/)
    expect(job!.variables.RAILPACK_NODE_VERSION).toEqual({ type: 'literal', value: '24.22.2' })
    expect(job!.deploy.multiRegionConfig).toEqual({ 'us-east4-eqdc4a': { numReplicas: 1 } })
  })

  it('usa los secretos de la web por referencia: ninguno nuevo que crear a mano', async () => {
    const job = await gameDataService('dev')

    for (const name of [
      'DATABASE_URL',
      'PAYLOAD_SECRET',
      'NEXT_PUBLIC_SITE_URL',
      'S3_ENDPOINT',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'MEDIA_BASE_URL',
      'SENTRY_DSN',
    ]) {
      expect(job!.variables[name], name).toEqual({
        type: 'reference',
        resource: 'service.web',
        output: name,
      })
    }
    expect(job!.variables.APP_ENV).toEqual({ type: 'literal', value: 'dev' })
  })
})

it('producción no tiene tarea semanal todavía', async () => {
  expect(await gameDataService('production')).toBeUndefined()
})
