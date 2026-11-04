import { describe, expect, it } from 'vitest'

import { mapWithConcurrency } from '@/lib/concurrency'

/** Una promesa que se resuelve a mano, para decidir en qué orden terminan las tareas. */
function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('mapWithConcurrency', () => {
  it('devuelve los resultados en el orden de entrada aunque terminen en otro orden', async () => {
    const delays = [30, 5, 20, 0, 10]

    const results = await mapWithConcurrency(delays, 3, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return `${index}:${delay}`
    })

    expect(results).toEqual(['0:30', '1:5', '2:20', '3:0', '4:10'])
  })

  it('nunca tiene más de `limit` tareas en marcha', async () => {
    let running = 0
    let peak = 0

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, index) => index),
      4,
      async (index) => {
        running += 1
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, index % 3))
        running -= 1
      },
    )

    expect(peak).toBe(4)
  })

  it('con limit 1 corre las tareas una tras otra, en orden', async () => {
    const events: string[] = []

    await mapWithConcurrency([1, 2, 3], 1, async (value) => {
      events.push(`empieza ${value}`)
      await tick()
      events.push(`termina ${value}`)
    })

    expect(events).toEqual([
      'empieza 1',
      'termina 1',
      'empieza 2',
      'termina 2',
      'empieza 3',
      'termina 3',
    ])
  })

  it('rechaza con el primer error cuando terminan las tareas en marcha, sin empezar más', async () => {
    const slow = deferred()
    const started: number[] = []
    const settled: number[] = []

    const result = mapWithConcurrency([0, 1, 2, 3, 4], 2, async (index) => {
      started.push(index)
      try {
        if (index === 0) await slow.promise
        if (index === 1) throw new Error('falla la 1')
      } finally {
        settled.push(index)
      }
    })
    let outcome: unknown = 'pendiente'
    result.then(
      () => (outcome = 'resuelta'),
      (error: unknown) => (outcome = error),
    )

    await tick()
    // La 1 ya falló, pero la 0 sigue en marcha: todavía no rechaza
    expect(outcome).toBe('pendiente')

    slow.resolve()
    await expect(result).rejects.toThrow('falla la 1')
    expect(settled).toEqual([1, 0])
    expect(started).toEqual([0, 1])
  })

  it('con una entrada vacía devuelve una lista vacía sin llamar a la función', async () => {
    let calls = 0

    const results = await mapWithConcurrency([], 3, async () => {
      calls += 1
    })

    expect(results).toEqual([])
    expect(calls).toBe(0)
  })

  it('rechaza un limit menor que 1 o no entero', async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow(RangeError)
    await expect(mapWithConcurrency([1], 1.5, async (value) => value)).rejects.toThrow(RangeError)
  })
})
