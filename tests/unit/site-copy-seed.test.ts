import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  indexTextDefaults,
  navigationDefaults,
  siteSettingsDefaults,
} from '@/lib/site-copy/defaults'
import { seedReport, seedSiteCopy } from '@/lib/site-copy/seed'

// Un global que nadie guardó todavía no tiene fila: Payload lo lee con el valor de partida de
// cada campo y sin createdAt. La carga lo guarda entero, para que el texto quede en la base.
/** Las guías de Dofus de la base, por su slug: los destacados de siempre se buscan así. */
const GUIDES = [
  { id: 11, slug: 'dofus-turquesa', name: 'Dofus Turquesa' },
  { id: 12, slug: 'dofus-esmeralda', name: 'Dofus Esmeralda' },
  { id: 13, slug: 'dofus-ocre', name: 'Dofus Ocre' },
]

function fakePayload(
  docs: Record<string, Record<string, unknown>>,
  guides: { id: number; slug: string; name: string }[] = GUIDES,
) {
  const all = { navigation: { ...navigationDefaults }, ...docs }
  const updateGlobal = vi.fn(async ({ slug, data }: { slug: string; data: object }) => ({
    slug,
    ...data,
  }))
  const payload = {
    findGlobal: async ({ slug }: { slug: string }) => all[slug as keyof typeof all],
    find: async () => ({ docs: guides }),
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
      navigation: {
        createdAt: '2026-11-15T00:00:00.000Z',
        sections: navigationDefaults.sections.map((row, i) => ({ ...row, id: `r${i}` })),
        featuredDofus: [11, 12, 13],
      },
    })
    const plans = await seedSiteCopy(payload, { apply: true })
    expect(plans.flatMap((plan) => plan.fills)).toEqual([])
    expect(updateGlobal).not.toHaveBeenCalled()
  })
})

describe('seedSiteCopy con la navegación', () => {
  const saved = '2026-11-16T00:00:00.000Z'
  const complete = {
    'site-settings': { ...siteSettingsDefaults, createdAt: saved },
    'index-texts': { ...indexTextDefaults, createdAt: saved },
  }
  const nav = (plans: Awaited<ReturnType<typeof seedSiteCopy>>) =>
    plans.find((plan) => plan.global === 'navigation')!

  it('sin guardar: guarda el menú de siempre y los tres destacados, buscados por su slug', async () => {
    const { payload, updateGlobal } = fakePayload(complete)
    const plan = nav(await seedSiteCopy(payload, { apply: true }))
    expect(plan.unsaved).toBe(true)
    expect(plan.fills.map((fill) => fill.path)).toContain('sections.misiones.title')
    expect(plan.fills).toContainEqual({
      path: 'featuredDofus',
      value: 'Dofus Turquesa, Dofus Esmeralda, Dofus Ocre',
    })
    expect(updateGlobal).toHaveBeenCalledTimes(1)
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'navigation',
        data: {
          sections: navigationDefaults.sections,
          featuredDofus: [11, 12, 13],
        },
      }),
    )
  })

  it('guardada: llena solo lo vacío y deja lo de Torre, su orden y sus casillas', async () => {
    const stored = {
      createdAt: saved,
      sections: [
        {
          id: 'a',
          key: 'dofus',
          label: 'Huevos',
          title: '',
          description: '',
          visible: false,
          soon: false,
        },
        ...navigationDefaults.sections
          .filter((row) => row.key !== 'dofus')
          .map((row, i) => ({ ...row, id: `r${i}` })),
      ],
      featuredDofus: [12],
    }
    const { payload, updateGlobal } = fakePayload({ ...complete, navigation: stored })
    const plan = nav(await seedSiteCopy(payload, { apply: true }))
    expect(plan.unsaved).toBe(false)
    expect(plan.fills).toEqual([
      { path: 'sections.dofus.title', value: 'Dofus' },
      {
        path: 'sections.dofus.description',
        value: 'Las guías de Dofus y los checklists para conseguirlos.',
      },
    ])
    const data = updateGlobal.mock.calls[0]![0].data as {
      sections: Record<string, unknown>[]
      featuredDofus: number[]
    }
    expect(data.sections[0]).toEqual({
      id: 'a',
      key: 'dofus',
      label: 'Huevos',
      title: 'Dofus',
      description: 'Las guías de Dofus y los checklists para conseguirlos.',
      visible: false,
      soon: false,
    })
    expect(data.sections.map((row) => row.key)).toEqual(stored.sections.map((row) => row.key))
    expect(data.featuredDofus).toEqual([12])
  })

  it('una guía destacada que no existe se avisa y no se elige ninguna', async () => {
    const { payload } = fakePayload(complete, GUIDES.slice(0, 2))
    const plan = nav(await seedSiteCopy(payload, { apply: false }))
    expect(plan.fills.map((fill) => fill.path)).not.toContain('featuredDofus')
    expect(seedReport([plan], false).join('\n')).toContain('dofus-ocre')
  })

  it('repetirla no cambia nada', async () => {
    const stored = {
      createdAt: saved,
      sections: navigationDefaults.sections.map((row, i) => ({ ...row, id: `r${i}` })),
      featuredDofus: [11, 12, 13],
    }
    const { payload, updateGlobal } = fakePayload({ ...complete, navigation: stored })
    const plans = await seedSiteCopy(payload, { apply: true })
    expect(plans.flatMap((plan) => plan.fills)).toEqual([])
    expect(updateGlobal).not.toHaveBeenCalled()
    expect(seedReport(plans, true)).toContain('Navegación: nada que llenar.')
  })
})
