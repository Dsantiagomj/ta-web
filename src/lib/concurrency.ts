/**
 * Aplica `fn` a cada elemento con como mucho `limit` llamadas en marcha a la vez y
 * devuelve los resultados en el orden de entrada. Si una falla, no empieza más y
 * rechaza con el primer error cuando terminan las que estaban en marcha, para que
 * ninguna quede suelta con un rechazo sin manejar.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit debe ser un entero mayor o igual que 1, no ${limit}`)
  }

  const results = new Array<R>(items.length)
  let next = 0
  let failure: { error: unknown } | undefined

  // Cada trabajador toma el siguiente índice libre; JavaScript corre en un solo hilo,
  // así que `next += 1` no se pisa entre trabajadores.
  async function worker() {
    while (!failure && next < items.length) {
      const index = next
      next += 1
      try {
        results[index] = await fn(items[index], index)
      } catch (error) {
        failure ??= { error }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  if (failure) throw failure.error
  return results
}
