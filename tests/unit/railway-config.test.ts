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
    ]) {
      expect(web.variables[name], name).toEqual({ type: 'preserve' })
    }
  })
})

describe('dev', () => {
  it('despliega cada push a main cuando pasa CI', async () => {
    const web = await webService('dev')

    expect(web.source).toMatchObject({
      type: 'github',
      repo: 'Dsantiagomj/ta-web',
      branch: 'main',
      checkSuites: true,
    })
  })

  it('activa la puerta de dev y conserva sus credenciales', async () => {
    const web = await webService('dev')

    expect(web.variables.APP_ENV).toEqual({ type: 'literal', value: 'dev' })
    expect(web.variables.DEV_BASIC_AUTH_USER).toEqual({ type: 'preserve' })
    expect(web.variables.DEV_BASIC_AUTH_PASSWORD).toEqual({ type: 'preserve' })
  })
})

describe('production', () => {
  it('no se conecta a GitHub: solo despliega el workflow de release', async () => {
    const web = await webService('production')

    expect(web.source).toBeUndefined()
  })

  it('no lleva la puerta de dev y conserva el commit que fija el release', async () => {
    const web = await webService('production')

    expect(web.variables.APP_ENV).toBeUndefined()
    expect(web.variables.DEV_BASIC_AUTH_USER).toBeUndefined()
    expect(web.variables.GIT_COMMIT_SHA).toEqual({ type: 'preserve' })
  })
})

it('cualquier otro entorno falla en vez de adivinar', async () => {
  const ctx = createRailwayContext({ environment: 'staging' } as RailwayContextInput)
  await expect(async () => railway(ctx, project)).rejects.toThrow(/staging/)
})
