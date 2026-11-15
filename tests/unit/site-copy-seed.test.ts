import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { indexTextDefaults, siteSettingsDefaults } from '@/lib/site-copy/defaults'
import { seedReport, seedSiteCopy } from '@/lib/site-copy/seed'

// Un global que nadie guardó todavía no tiene fila: Payload lo lee con el valor de partida de
// cada campo y sin createdAt. La carga lo guarda entero, para que el texto quede en la base.
function fakePayload(docs: Record<string, Record<string, unknown>>) {
  const updateGlobal = vi.fn(async ({ slug, data }: { slug: string; data: object }) => ({
    slug,
    ...data,
  }))
  const payload = {
    findGlobal: async ({ slug }: { slug: string }) => docs[slug],
    updateGlobal,
  } as unknown as Payload
  return { payload, updateGlobal }
}

describe('seedSiteCopy con globales sin guardar', () => {
  const unsaved = {
    'site-settings': { ...siteSettingsDefaults },
    'index-texts': { ...indexTextDefaults },
  }

  it('en seco cuenta todos sus campos y no escribe', async () => {
    const { payload, updateGlobal } = fakePayload(unsaved)
    const plans = await seedSiteCopy(payload, { apply: false })
    expect(plans.every((plan) => plan.unsaved)).toBe(true)
    expect(plans[0]!.fills.map((fill) => fill.path)).toContain('footer.disclaimer')
    expect(updateGlobal).not.toHaveBeenCalled()
    expect(seedReport(plans, false).join('\n')).toMatch(
      /Ajustes del sitio: sin guardar todavía; guardaría el texto de siempre en \d+ campos/,
    )
  })

  it('con --apply guarda el texto de siempre', async () => {
    const { payload, updateGlobal } = fakePayload(unsaved)
    await seedSiteCopy(payload, { apply: true })
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'site-settings', data: siteSettingsDefaults }),
    )
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'index-texts', data: indexTextDefaults }),
    )
  })

  it('uno guardado y completo no se toca', async () => {
    const saved = { ...siteSettingsDefaults, createdAt: '2026-11-15T00:00:00.000Z' }
    const { payload, updateGlobal } = fakePayload({
      'site-settings': saved,
      'index-texts': { ...indexTextDefaults, createdAt: '2026-11-15T00:00:00.000Z' },
    })
    const plans = await seedSiteCopy(payload, { apply: true })
    expect(plans.flatMap((plan) => plan.fills)).toEqual([])
    expect(updateGlobal).not.toHaveBeenCalled()
  })
})
