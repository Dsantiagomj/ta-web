import { readFileSync } from 'node:fs'
import path from 'node:path'

import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

// El workflow de release (.github/workflows/release.yml) es la única vía a producción:
// Railway production no tiene fuente de GitHub. La web y la tarea semanal de los datos del
// juego (.railway/railway.ts, servicio game-data) tienen que salir del mismo commit.

type Step = {
  name?: string
  uses?: string
  with?: Record<string, string>
  env?: Record<string, string>
  run?: string
  'timeout-minutes'?: number
}
type Job = {
  environment?: { name: string }
  steps: Step[]
}
type Workflow = {
  env: Record<string, string>
  jobs: Record<string, Job>
}

const workflow = load(
  readFileSync(path.join(process.cwd(), '.github/workflows/release.yml'), 'utf8'),
) as Workflow
const deploy = workflow.jobs.deploy
const steps = deploy.steps

function stepIndex(match: (step: Step) => boolean, what: string): number {
  const index = steps.findIndex(match)
  expect(index, `falta el paso: ${what}`).toBeGreaterThanOrEqual(0)
  return index
}

const runs = (pattern: RegExp) => (step: Step) => pattern.test(step.run ?? '')

const webDeploy = () =>
  stepIndex(runs(/railway up --service "\$RAILWAY_SERVICE"/), 'railway up de la web')
const gameDataDeploy = () =>
  stepIndex(runs(/railway up --service "\$RAILWAY_GAME_DATA_SERVICE"/), 'railway up de game-data')

describe('release.yml despliega la tarea semanal con la web', () => {
  it('apunta a los servicios web y game-data del entorno production', () => {
    expect(workflow.env.RAILWAY_SERVICE).toBe('web')
    expect(workflow.env.RAILWAY_GAME_DATA_SERVICE).toBe('game-data')
    expect(workflow.env.RAILWAY_ENVIRONMENT).toBe('production')
  })

  it('sube game-data al entorno de producción desde la misma etiqueta que la web', () => {
    const checkouts = steps.filter((step) => step.uses?.startsWith('actions/checkout@'))
    // Un solo checkout, el de la etiqueta: los dos railway up suben el mismo árbol.
    expect(checkouts).toHaveLength(1)
    expect(checkouts[0].with?.ref).toBe('refs/tags/${{ needs.release.outputs.tag }}')
    const checkout = steps.indexOf(checkouts[0])

    const step = steps[gameDataDeploy()]
    expect(step.run).toMatch(/--environment "\$RAILWAY_ENVIRONMENT"/)
    expect(step.run).toMatch(/--message "\$TAG \(\$GITHUB_SHA\)"/)
    expect(step.run).not.toMatch(/--detach|--ci\b/)
    expect(step.env?.RAILWAY_TOKEN).toBe('${{ secrets.RAILWAY_TOKEN }}')
    expect(step['timeout-minutes']).toBeGreaterThan(0)
    expect(gameDataDeploy()).toBeGreaterThan(checkout)
  })

  it('despliega game-data solo cuando producción ya sirve el commit, migraciones incluidas', () => {
    const served = stepIndex(runs(/\/api\/health/), 'comprobar que producción sirve el commit')

    expect(served).toBeGreaterThan(webDeploy())
    expect(gameDataDeploy()).toBeGreaterThan(served)
  })

  it('comprueba que game-data existe en producción antes de tocar la web', () => {
    const preflight = stepIndex(
      runs(/railway service list --environment "\$RAILWAY_ENVIRONMENT" --json/),
      'comprobar que existe game-data en producción',
    )
    expect(steps[preflight].run).toMatch(/RAILWAY_GAME_DATA_SERVICE/)

    const setVariables = stepIndex(runs(/railway variable set/), 'fijar commit y versión')
    expect(preflight).toBeLessThan(setVariables)
    expect(preflight).toBeLessThan(webDeploy())
  })

  it('sigue detrás del entorno production y de la comprobación del dueño', () => {
    expect(deploy.environment?.name).toBe('production')
    expect(steps[0].run).toMatch(/github\.repository_owner|\$OWNER/)
    expect(steps[0].env?.TRIGGERING_ACTOR).toBe('${{ github.triggering_actor }}')
  })
})
