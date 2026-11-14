// Arranca Payload, corre la tarea de un script de `payload run` y lo cierra. `payload run` sale
// con 0 cuando el script termina sin lanzar, así que el fallo se marca con exit(1), también si
// Payload no arranca o no se cierra.

interface Closable {
  destroy(): Promise<void>
}

interface Options {
  /** Qué hace el script, para el mensaje de error: «El informe de las notas de mazmorra». */
  label: string
  exit?: (code: number) => void
  log?: (...values: unknown[]) => void
}

export async function runPayloadScript<P extends Closable>(
  start: () => Promise<P>,
  task: (payload: P) => Promise<void>,
  { label, exit = (code) => process.exit(code), log = console.error }: Options,
): Promise<void> {
  let payload: P | undefined
  let failed = false
  try {
    payload = await start()
    await task(payload)
  } catch (error) {
    failed = true
    log(`${label} falló:`, error)
  }
  try {
    await payload?.destroy()
  } catch (error) {
    failed = true
    log('No se pudo cerrar Payload:', error)
  }
  if (failed) exit(1)
}
