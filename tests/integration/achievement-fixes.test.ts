import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type AchievementFixes,
  applyAchievementFixes,
} from '../../scripts/import/load-achievement-fixes'
import type { AchievementGroup, Npc } from '@/payload-types'

import { startPayload } from './payload'

// Los arreglos puntuales sobre lo que dejó la importación de los metalogros de Torre: tocan
// solo las entradas de la lista y nada más de lo que Torre haya cambiado en el panel.

let payload: Payload
let mundo: AchievementGroup
let wabbit: AchievementGroup
let amayiro: Npc
let meriana: Npc
const guideIds: number[] = []

async function cleanUp() {
  for (const collection of [
    'achievement-pages',
    'achievement-groups',
    'achievements',
    'achievement-categories',
  ] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'prueba-arreglo' } } })
  await payload.delete({ collection: 'npcs', where: { dofusId: { in: [6309, 2205] } } })
}

const fixes: AchievementFixes = {
  representatives: [
    { group: 'metalogro-alineamiento', npc: 6309 },
    { group: 'metalogro-misiones-de-mundo', npc: 6309 },
  ],
  pages: [
    {
      group: 'metalogro-misiones-de-mundo',
      achievement: 5220,
      position: 2,
      name: 'Ocre de ámbar',
      slug: 'ocre-de-ambar',
      state: 'published',
    },
    { group: 'metalogro-archipielago-wabbit', achievement: 1198, position: 1 },
  ],
  guides: [
    {
      group: 'metalogro-archipielago-wabbit',
      slugs: ['prueba-arreglo-a', 'prueba-arreglo-b', 'prueba-arreglo-falta'],
    },
  ],
}

const pagesOf = async (group: AchievementGroup) =>
  (
    await payload.find({
      collection: 'achievement-pages',
      where: { group: { equals: group.id } },
      sort: 'order',
      depth: 0,
    })
  ).docs.map((doc) => [doc.name, doc.slug, doc.order, doc.state])

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  amayiro = await payload.create({ collection: 'npcs', data: { dofusId: 6309, name: 'Amayiro' } })
  meriana = await payload.create({ collection: 'npcs', data: { dofusId: 2205, name: 'Meriana' } })
  const group = (name: string, slug: string, extra: Record<string, unknown> = {}) =>
    payload.create({
      collection: 'achievement-groups',
      data: { name, slug, state: 'published', _status: 'published', ...extra } as never,
    })
  await group('Alineamiento', 'metalogro-alineamiento')
  // Torre ya eligió a Meriana para Misiones de Mundo: no se cambia.
  mundo = await group('Misiones de Mundo', 'metalogro-misiones-de-mundo', {
    representative: { relationTo: 'npcs', value: meriana.id },
  })
  for (const slug of ['prueba-arreglo-a', 'prueba-arreglo-b', 'prueba-arreglo-ya']) {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: slug, slug, _status: 'published' },
    })
    guideIds.push(guide.id)
  }
  // Su guía suelta de siempre se queda, delante de las nuevas.
  wabbit = await group('Archipiélago Wabbit', 'metalogro-archipielago-wabbit', {
    guides: [guideIds[2]],
  })
  const page = async (
    dofusId: number,
    name: string,
    slug: string,
    order: number,
    state: 'published' | 'preparing',
    parent: AchievementGroup,
  ) => {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId, name },
    })
    return payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name,
        slug,
        order,
        state,
        group: parent.id,
        _status: 'published',
      } as never,
    })
  }
  await page(4001, 'Verde esmeralda', 'verde-esmeralda', 1, 'published', mundo)
  await page(4002, 'Azul turquesa', 'azul-turquesa', 2, 'published', mundo)
  await page(4003, 'Negro ébano', 'negro-ebano', 4, 'published', mundo)
  // La que quedó «sin casar»: en preparación y al final, con el nombre del juego.
  await page(5220, 'Ocre ámbar del juego', 'ocre-del-juego', 9, 'preparing', mundo)
  await page(1198, 'Dimensión carcelaria', 'dimension-carcelaria', 5, 'preparing', wabbit)
  await page(1071, 'Picadillo de wabbit', 'picadillo-de-wabbit', 2, 'published', wabbit)
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('arreglos puntuales de los metalogros', () => {
  it('sin --apply no importa el PNJ que falta: solo dice que lo traería de DofusDB', async () => {
    let imports = 0
    const report = await applyAchievementFixes(payload, {
      fixes: {
        representatives: [{ group: 'metalogro-alineamiento', npc: 777001 }],
        pages: [],
        guides: [],
      },
      apply: false,
      ensureNpc: async () => {
        imports += 1
        return amayiro.id
      },
    })
    expect(imports).toBe(0)
    expect(report.changes).toEqual([
      'Alineamiento: representante PNJ 777001 de DofusDB (se importará al aplicar)',
    ])
  })

  it('sin --apply dice lo que cambiaría y no escribe nada', async () => {
    const report = await applyAchievementFixes(payload, {
      fixes,
      apply: false,
      ensureNpc: async () => amayiro.id,
    })
    expect(report.changes).toEqual([
      'Alineamiento: representante Amayiro (DofusDB 6309)',
      'Ocre de ámbar: estado En preparación → Publicada; nombre «Ocre ámbar del juego» → ' +
        '«Ocre de ámbar»; slug ocre-del-juego → ocre-de-ambar; posición 4 → 2 en Misiones de ' +
        'Mundo',
      'Dimensión carcelaria: posición 2 → 1 en Archipiélago Wabbit',
      'Archipiélago Wabbit: guías sueltas + prueba-arreglo-a, prueba-arreglo-b',
    ])
    expect(report.skipped).toEqual([
      'Misiones de Mundo: ya tiene representante; no se cambia',
      'Archipiélago Wabbit: no hay guía publicada con el slug prueba-arreglo-falta',
    ])
    expect(await pagesOf(mundo)).toContainEqual([
      'Ocre ámbar del juego',
      'ocre-del-juego',
      9,
      'preparing',
    ])
  })

  it('con --apply cambia solo esas entradas y corre las demás sin cambiar su orden', async () => {
    await applyAchievementFixes(payload, {
      fixes,
      apply: true,
      ensureNpc: async () => amayiro.id,
    })
    expect(await pagesOf(mundo)).toEqual([
      ['Verde esmeralda', 'verde-esmeralda', 1, 'published'],
      ['Ocre de ámbar', 'ocre-de-ambar', 2, 'published'],
      ['Azul turquesa', 'azul-turquesa', 3, 'published'],
      ['Negro ébano', 'negro-ebano', 4, 'published'],
    ])
    // Dimensión carcelaria sigue En preparación: el arreglo solo la pone en su sitio.
    expect(await pagesOf(wabbit)).toEqual([
      ['Dimensión carcelaria', 'dimension-carcelaria', 1, 'preparing'],
      ['Picadillo de wabbit', 'picadillo-de-wabbit', 2, 'published'],
    ])
    const groups = await payload.find({ collection: 'achievement-groups', depth: 0 })
    const bySlug = new Map(groups.docs.map((doc) => [doc.slug, doc]))
    expect(bySlug.get('metalogro-alineamiento')?.representative).toEqual({
      relationTo: 'npcs',
      value: amayiro.id,
    })
    expect(bySlug.get('metalogro-misiones-de-mundo')?.representative).toEqual({
      relationTo: 'npcs',
      value: meriana.id,
    })
    expect(bySlug.get('metalogro-archipielago-wabbit')?.guides).toEqual([
      guideIds[2],
      guideIds[0],
      guideIds[1],
    ])
  })

  it('una segunda pasada no cambia nada', async () => {
    const before = await payload.find({ collection: 'achievement-pages', depth: 0 })
    const report = await applyAchievementFixes(payload, {
      fixes,
      apply: true,
      ensureNpc: async () => amayiro.id,
    })
    expect(report.changes).toEqual([])
    const after = await payload.find({ collection: 'achievement-pages', depth: 0 })
    expect(after.docs.map((doc) => doc.updatedAt)).toEqual(before.docs.map((doc) => doc.updatedAt))
  })

  it('tampoco corre una página vecina que Torre tiene a medio editar', async () => {
    const picadillo = (
      await payload.find({
        collection: 'achievement-pages',
        where: { slug: { equals: 'picadillo-de-wabbit' } },
        depth: 0,
      })
    ).docs[0]!
    await payload.update({
      collection: 'achievement-pages',
      id: picadillo.id,
      data: { name: 'Picadillo a medias' },
      draft: true,
    })
    const report = await applyAchievementFixes(payload, {
      fixes: { ...fixes, pages: [{ ...fixes.pages[1]!, position: 2 }] },
      apply: true,
      ensureNpc: async () => amayiro.id,
    })
    expect(report.changes).toEqual([])
    expect(report.skipped).toContain(
      'Dimensión carcelaria: Picadillo de wabbit tiene un borrador sin publicar en el panel; ' +
        'no se toca',
    )
    expect(await pagesOf(wabbit)).toEqual([
      ['Dimensión carcelaria', 'dimension-carcelaria', 1, 'preparing'],
      ['Picadillo de wabbit', 'picadillo-de-wabbit', 2, 'published'],
    ])
    const draft = await payload.findByID({
      collection: 'achievement-pages',
      id: picadillo.id,
      draft: true,
    })
    expect(draft.name).toBe('Picadillo a medias')
  })

  it('no pisa un borrador sin publicar de Torre: lo salta y lo dice', async () => {
    const ocre = (
      await payload.find({
        collection: 'achievement-pages',
        where: { slug: { equals: 'ocre-de-ambar' } },
        depth: 0,
      })
    ).docs[0]!
    await payload.update({
      collection: 'achievement-pages',
      id: ocre.id,
      data: { state: 'preparing' },
      draft: true,
    })
    const report = await applyAchievementFixes(payload, {
      fixes,
      apply: true,
      ensureNpc: async () => amayiro.id,
    })
    expect(report.changes).toEqual([])
    expect(report.skipped).toContain(
      'Ocre de ámbar: tiene un borrador sin publicar en el panel; no se toca',
    )
    const draft = await payload.findByID({
      collection: 'achievement-pages',
      id: ocre.id,
      draft: true,
    })
    expect(draft.state).toBe('preparing')
  })
})
