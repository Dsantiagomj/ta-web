// pnpm test:lhci: Lighthouse CI con los presupuestos de DESIGN.md (lighthouserc.cjs) sobre
// la app por el camino de producción, como las pruebas E2E: pnpm build, pnpm migrate
// sobre una base vacía, las guías de prueba (pnpm seed:e2e) y pnpm start. E2E_SKIP_BUILD=1 (del entorno o de .env, como en
// las E2E) reutiliza el último build. Mide con el Chromium de Playwright salvo que
// CHROME_PATH, del entorno del proceso, diga otro.
import { chromium } from '@playwright/test'
import { execFileSync, spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'

import { DEV_DATABASE } from '../src/lib/db/dev-database.ts'
import { loadE2eEnvFromFile } from '../tests/e2e/app-server.ts'
import { clearDataCache } from './clear-data-cache.ts'
import { ensureDevDatabase, portIsOpen, stopProcess } from './dev-database-process.ts'
import { lhciEnv } from './lhci-env.ts'
import { resetDevDatabase } from './reset-dev-database.ts'

loadE2eEnvFromFile()

const config = createRequire(import.meta.url)('../lighthouserc.cjs')
const baseUrl = new URL(config.ci.collect.url[0])
const port = baseUrl.port

const usesEmbeddedDatabase = !process.env.DATABASE_URL?.trim()
const env = { ...process.env, ...lhciEnv(process.env) }

let database: ChildProcess | undefined
let app: ChildProcess | undefined

async function cleanUp() {
  // pnpm start lanza next como hijo: se para el grupo de procesos entero.
  if (app?.pid && app.exitCode === null) {
    const exited = new Promise((resolve) => app?.once('exit', resolve))
    process.kill(-app.pid, 'SIGTERM')
    await exited
  }
  if (database) await stopProcess(database)
}

async function waitForApp(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (app && app.exitCode !== null) throw new Error('pnpm start terminó antes de responder')
    try {
      if ((await fetch(baseUrl)).ok) return
    } catch {
      // Todavía no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`La app no respondió en ${baseUrl.href} tras ${timeoutMs / 1000} s`)
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { env, stdio: 'inherit' })
}

process.once('SIGINT', () => {
  void cleanUp().then(() => process.exit(130))
})

let status = 1
try {
  const chromePath = process.env.CHROME_PATH || chromium.executablePath()
  if (!existsSync(chromePath)) {
    throw new Error(
      `No está el navegador en ${chromePath}. Instálalo con pnpm exec playwright install chromium o pasa CHROME_PATH.`,
    )
  }
  if (await portIsOpen(Number(port), baseUrl.hostname)) {
    throw new Error(`El puerto ${port} ya está ocupado; Lighthouse mediría otra app.`)
  }

  if (usesEmbeddedDatabase) {
    database = await ensureDevDatabase()
    await resetDevDatabase(DEV_DATABASE.lhciDatabase)
  }
  if (process.env.E2E_SKIP_BUILD !== '1') run('pnpm', ['build'])
  run('pnpm', ['migrate'])
  // La guía que mide lighthouserc.cjs; en CI la base ya la tiene de las E2E y no se duplica.
  run('pnpm', ['seed:e2e'])
  // Sin guías en caché de una ejecución anterior: se mide lo que acaba de sembrarse.
  clearDataCache()

  // Sin informes de ejecuciones anteriores: el directorio solo guarda los de esta.
  rmSync('.lighthouseci', { recursive: true, force: true })
  app = spawn('pnpm', ['start', '--port', port], { env, stdio: 'inherit', detached: true })
  await waitForApp(120_000)

  status =
    spawnSync('pnpm', ['exec', 'lhci', 'autorun'], {
      env: { ...env, CHROME_PATH: chromePath },
      stdio: 'inherit',
    }).status ?? 1
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
} finally {
  await cleanUp()
}
process.exit(status)
