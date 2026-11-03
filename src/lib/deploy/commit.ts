type Env = Record<string, string | undefined>

// El commit desplegado: Railway inyecta RAILWAY_GIT_COMMIT_SHA en dev; en producción lo
// fija el workflow de release en GIT_COMMIT_SHA. Sin ninguno de los dos, undefined.
export function deployedCommit(env: Env): string | undefined {
  for (const name of ['RAILWAY_GIT_COMMIT_SHA', 'GIT_COMMIT_SHA']) {
    const value = env[name]?.trim()
    if (value) return value
  }
  return undefined
}
