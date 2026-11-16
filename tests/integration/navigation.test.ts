import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DOFUS_FEATURED, SECTIONS } from '@/components/site/nav'
import { navigationDefaults } from '@/lib/site-copy/defaults'
import { readNavigation } from '@/lib/site-copy/queries'
import { seedSiteCopy } from '@/lib/site-copy/seed'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// «Navegación»: cualquiera la lee, solo el panel la cambia, la web pinta el menú de siempre
// donde Torre no tocó nada y pnpm seed:site-copy la llena sin tocar lo suyo.

let payload: Payload
let editor: User

const PREFIX = 'navegacion-'
/** Un objeto Dofus por guía: cada guía enlaza el suyo. */
const ITEMS = [948001, 948002, 948003, 948004]
let guides: { id: number; egg: string }[] = []

/** El archivo de cada huevo, sin su extensión: la web pinta su variante WebP. */
const eggNames = (featured: { src: string }[]) =>
  featured.map(({ src }) => guides.find((g) => src.includes(g.egg.replace(/\.png$/, '')))?.egg)

/** Las cinco secciones de siempre, cambiadas con `changes` por su clave. */
const rows = (changes: Record<string, Record<string, unknown>> = {}) =>
  navigationDefaults.sections.map((row) => ({ ...row, ...changes[row.key] }))

async function reset() {
  await payload.updateGlobal({
    slug: 'navigation',
    data: { sections: rows(), featuredDofus: [] },
    overrideAccess: true,
  })
}

async function cleanUp() {
  await payload.delete({ collection: 'dofus-guides', where: { slug: { like: PREFIX } } })
  await payload.delete({ collection: 'items', where: { dofusId: { in: ITEMS } } })
}

beforeAll(async () => {
  payload = await startPayload()
  editor = await createPanelUser(payload, 'editor')
  await cleanUp()
  const itemEgg = await payload.create({
    collection: 'media',
    data: { alt: 'Huevo de DofusDB' },
    file: tinyPng(),
  })
  guides = []
  for (const [i, status] of (['published', 'published', 'published', 'draft'] as const).entries()) {
    const item = await payload.create({
      collection: 'items',
      data: { dofusId: ITEMS[i]!, name: `Dofus de la navegación ${i}`, image: itemEgg.id },
    })
    const own = await payload.create({
      collection: 'media',
      data: { alt: `Huevo ${i}` },
      file: tinyPng(),
    })
    const guide = await payload.create({
      collection: 'dofus-guides',
      data: {
        slug: `${PREFIX}${i}`,
        name: `Dofus ${i}`,
        order: 900 + i,
        state: 'published',
        dofus: item.id,
        // La primera usa el huevo del objeto; las demás, el que subió Torre.
        ...(i > 0 && { egg: own.id }),
        _status: status,
      } as never,
    })
    guides.push({ id: guide.id, egg: (i > 0 ? own : itemEgg).filename! })
  }
})

afterAll(async () => {
  await reset()
  await cleanUp()
})

describe('acceso', () => {
  it('un visitante la lee y no la cambia; una cuenta del panel, sí', async () => {
    await expect(
      payload.findGlobal({ slug: 'navigation', overrideAccess: false }),
    ).resolves.toBeTruthy()
    await expect(
      payload.updateGlobal({ slug: 'navigation', data: {}, overrideAccess: false }),
    ).rejects.toThrow()
    const saved = await payload.updateGlobal({
      slug: 'navigation',
      data: { sections: rows({ misiones: { label: 'Guías' } }) },
      user: editor,
      overrideAccess: false,
    })
    expect(saved.sections?.[0]?.label).toBe('Guías')
  })

  it('no guarda una sección de menos, ni uno o dos Dofus destacados', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'navigation',
        data: { sections: rows().slice(1) },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({
        slug: 'navigation',
        data: { sections: rows(), featuredDofus: [guides[0]!.id] },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('lo que lee la web', () => {
  beforeAll(reset)

  it('sin cambios, el menú de siempre', async () => {
    expect(await readNavigation(payload)).toEqual({
      sections: SECTIONS,
      featured: DOFUS_FEATURED,
    })
  })

  it('el orden, los nombres y las casillas de Torre', async () => {
    const sections = rows({ clases: { visible: false }, mazmorras: { soon: false } })
    await payload.updateGlobal({
      slug: 'navigation',
      data: {
        sections: [sections[1]!, { ...sections[0]!, title: 'Las guías' }, ...sections.slice(2)],
      },
      user: editor,
      overrideAccess: false,
    })
    const nav = await readNavigation(payload)
    expect(nav.sections.map((s) => s.key)).toEqual(['dofus', 'misiones', 'checklists', 'mazmorras'])
    expect(nav.sections[1]!.title).toBe('Las guías')
    expect(nav.sections.at(-1)!.soon).toBeUndefined()
  })

  it('los Dofus destacados son los huevos de sus guías publicadas, en el orden elegido', async () => {
    await payload.updateGlobal({
      slug: 'navigation',
      data: { featuredDofus: [guides[2]!.id, guides[0]!.id, guides[1]!.id] },
      user: editor,
      overrideAccess: false,
    })
    const { featured } = await readNavigation(payload)
    expect(eggNames(featured)).toEqual([guides[2]!.egg, guides[0]!.egg, guides[1]!.egg])
  })

  it('una guía sin publicar no sale', async () => {
    await payload.updateGlobal({
      slug: 'navigation',
      data: { featuredDofus: [guides[3]!.id, guides[0]!.id, guides[1]!.id] },
      user: editor,
      overrideAccess: false,
    })
    const { featured } = await readNavigation(payload)
    expect(eggNames(featured)).toEqual([guides[0]!.egg, guides[1]!.egg])
  })
})

describe('pnpm seed:site-copy', () => {
  it('llena lo vacío y deja lo de Torre; repetirla no cambia nada', async () => {
    await payload.updateGlobal({
      slug: 'navigation',
      data: {
        sections: rows({ misiones: { label: 'Guías', title: '' }, clases: { visible: false } }),
        featuredDofus: [guides[0]!.id, guides[1]!.id, guides[2]!.id],
      },
      overrideAccess: true,
    })
    const plans = await seedSiteCopy(payload, { apply: true })
    expect(plans.find((plan) => plan.global === 'navigation')!.fills).toEqual([
      { path: 'sections.misiones.title', value: 'Misiones y logros' },
    ])
    const stored = await payload.findGlobal({ slug: 'navigation', depth: 0 })
    expect(stored.sections?.[0]).toMatchObject({ label: 'Guías', title: 'Misiones y logros' })
    expect(stored.sections?.find((row) => row.key === 'clases')?.visible).toBe(false)
    expect(stored.featuredDofus).toEqual([guides[0]!.id, guides[1]!.id, guides[2]!.id])

    const again = await seedSiteCopy(payload, { apply: true })
    expect(again.find((plan) => plan.global === 'navigation')!.fills).toEqual([])
  })
})
