import { describe, expect, it } from 'vitest'

import { DEFAULT_WRITE_CONCURRENCY, writeConcurrencyFromEnv } from '@/lib/dofusdb/refresh-quests'

describe('DOFUSDB_WRITE_CONCURRENCY', () => {
  it('sin la variable, o vacía, usa el valor por defecto, por debajo del pool de pg (10)', () => {
    expect(writeConcurrencyFromEnv({})).toBe(DEFAULT_WRITE_CONCURRENCY)
    expect(writeConcurrencyFromEnv({ DOFUSDB_WRITE_CONCURRENCY: '' })).toBe(
      DEFAULT_WRITE_CONCURRENCY,
    )
    expect(DEFAULT_WRITE_CONCURRENCY).toBeLessThan(10)
  })

  it('lee un entero positivo', () => {
    expect(writeConcurrencyFromEnv({ DOFUSDB_WRITE_CONCURRENCY: '1' })).toBe(1)
    expect(writeConcurrencyFromEnv({ DOFUSDB_WRITE_CONCURRENCY: ' 4 ' })).toBe(4)
  })

  it('falla con un valor que no es un entero positivo', () => {
    for (const value of ['0', '-2', '1.5', 'ocho']) {
      expect(() => writeConcurrencyFromEnv({ DOFUSDB_WRITE_CONCURRENCY: value })).toThrow(
        /DOFUSDB_WRITE_CONCURRENCY/,
      )
    }
  })
})
