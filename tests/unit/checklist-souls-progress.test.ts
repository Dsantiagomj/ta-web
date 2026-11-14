import { describe, expect, it } from 'vitest'

import {
  migrateSouls,
  resetSouls,
  setSoul,
  soulsDone,
  soulsPct,
} from '@/lib/checklists/progress/souls'
import {
  backupFile,
  emptyProgress,
  parseBackup,
  parseProgress,
} from '@/lib/checklists/progress/store'
import type { SoulsIslandData } from '@/lib/checklists/souls'

// El progreso del Ocre: las almas que se tienen, en `souls` de ta-web:progress, por el ID de
// DofusDB de su monstruo. Lo antiguo de silvestre-checklist («cosecha:done», una lista de esos
// IDs) se trae una vez, sumando y sin borrar la clave antigua.

const data: SoulsIslandData = {
  checklistId: 9,
  slug: 'lista-ocre',
  version: '1',
  legacy: { prefix: 'cosecha:' },
  souls: [928, 147, 500, 501],
}
const NOW = 1_700_000_000_000

describe('el progreso guardado lleva las almas', () => {
  it('se leen y se guardan; lo que no se entiende se descarta', () => {
    const parsed = parseProgress(JSON.stringify({ v: 1, souls: { 928: NOW, x: 'no' } }))
    expect(parsed.souls).toEqual({ 928: NOW })
    expect(emptyProgress().souls).toEqual({})
  })

  it('una copia de seguridad las lleva; una de antes, sin ellas, sigue valiendo', () => {
    const p = { ...emptyProgress(), souls: { 928: NOW } }
    expect(parseBackup(JSON.stringify(backupFile(p, new Date(NOW))))?.souls).toEqual({ 928: NOW })
    const { souls: _souls, ...before } = p
    expect(parseBackup(JSON.stringify(backupFile(before as never, new Date(NOW))))?.souls).toEqual(
      {},
    )
  })
})

describe('marcar almas y el porcentaje', () => {
  it('marcar y desmarcar un alma; el porcentaje cuenta las de esta checklist, con un decimal', () => {
    let p = setSoul(emptyProgress(), 928, true, NOW)
    p = setSoul(p, 147, true, NOW)
    p = setSoul({ ...p, souls: { ...p.souls, 9999: NOW } }, 147, false, NOW)
    expect(p.souls).toEqual({ 928: NOW, 9999: NOW })
    expect(soulsDone(p, data)).toBe(1)
    expect(soulsPct(p, data)).toBe(25)
    expect(soulsPct(emptyProgress(), data)).toBe(0)
    expect(soulsPct({ ...emptyProgress(), souls: { 928: 1, 147: 1, 500: 1, 501: 1 } }, data)).toBe(
      100,
    )
    expect(
      soulsPct(setSoul(emptyProgress(), 928, true, NOW), { ...data, souls: [928, 1, 2] }),
    ).toBe(33.3)
  })

  it('reiniciar quita solo las almas de esta checklist', () => {
    const p = { ...emptyProgress(), souls: { 928: NOW, 9999: NOW }, owned: { 1: NOW } }
    expect(resetSouls(p, data)).toEqual({ ...p, souls: { 9999: NOW } })
  })
})

describe('migrateSouls: «cosecha:done» de silvestre-checklist', () => {
  const keys = (done: string) => ({ 'cosecha:done': done, 'cosecha:ui': '{"by":"region"}' })
  const run = (stored: Record<string, string>, progress = emptyProgress()) =>
    migrateSouls(progress, {
      keys: Object.keys(stored),
      read: (key) => stored[key] ?? null,
      data,
      now: NOW,
    })

  it('trae las almas marcadas de esta checklist, una sola vez, sumando', () => {
    const p = run(keys('[928, 500, 7777, "x", 1.5]'), { ...emptyProgress(), souls: { 147: 1 } })
    expect(p.souls).toEqual({ 147: 1, 928: NOW, 500: NOW })
    expect(p.migrated).toEqual({ cosecha: NOW })
    // Otra vez, nada: ya se migró.
    expect(run(keys('[501]'), p)).toBe(p)
  })

  it('sin la clave, o con algo que no se entiende, no toca nada', () => {
    const empty = emptyProgress()
    expect(run({}, empty)).toBe(empty)
    expect(run(keys('{"1":true}')).souls).toEqual({})
  })
})
