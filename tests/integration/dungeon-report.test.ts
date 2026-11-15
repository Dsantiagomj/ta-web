import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { dungeonNoteReport, type DungeonRow } from '@/lib/achievements/dungeon-report'
import { readDungeonBosses } from '@/lib/guides/dungeon-bosses'

import { startPayload, tinyPng } from './payload'

// Lo que imprime `pnpm data:quests` de las filas de mazmorra de «Necesitarás en total»: las
// mismas que pinta cada página publicada, con el jefe solo si su imagen está en Media.

const QUESTS = [990_801, 990_802, 990_803]
const ACHIEVEMENTS = [990_901, 990_902]

let payload: Payload

async function cleanUp() {
  await payload.delete({ collection: 'achievement-pages', where: { slug: { like: 'informe-' } } })
  await payload.delete({ collection: 'dofus-guides', where: { slug: { like: 'informe-' } } })
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENTS } } })
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'informe-' } } })
  await payload.delete({ collection: 'quests', where: { dofusId: { in: QUESTS } } })
  await payload.delete({
    collection: 'dungeons',
    where: { dofusId: { in: [990_131, 990_138, 990_139, 990_141] } },
  })
  await payload.delete({
    collection: 'monsters',
    where: { dofusId: { in: [990_394, 990_903, 990_904, 990_905] } },
  })
  await payload.delete({ collection: 'items', where: { dofusId: { equals: 990_777 } } })
  await payload.delete({ collection: 'media', where: { alt: { like: '(informe)' } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  const image = await payload.create({
    collection: 'media',
    data: { alt: 'Kumijo (informe)' },
    file: tinyPng(),
  })
  const kumijo = await payload.create({
    collection: 'monsters',
    data: { dofusId: 990_394, name: 'Kumijo', image: image.id },
  })
  // Un jefe sin imagen importada: su mazmorra se casa, pero la fila lleva el icono genérico.
  const grunob = await payload.create({
    collection: 'monsters',
    data: { dofusId: 990_903, name: 'Director Grunob' },
  })
  const casa = await payload.create({
    collection: 'dungeons',
    data: { dofusId: 990_131, name: 'Casa de los Espíritus', bosses: [kumijo.id] },
  })
  await payload.create({
    collection: 'dungeons',
    data: { dofusId: 990_138, name: 'Akademia de los Goblins', bosses: [grunob.id] },
  })
  // Una nota que es el nombre exacto de un objeto va con los objetos, no con las mazmorras.
  await payload.create({
    collection: 'items',
    data: { dofusId: 990_777, name: 'Llave de la mazmorra Kumijo' },
  })
  const [uno, dos, tres] = await Promise.all(
    QUESTS.map((dofusId) =>
      payload.create({ collection: 'quests', data: { dofusId, name: `Misión ${dofusId}` } }),
    ),
  )
  const guide = (
    slug: string,
    quest: number,
    notes: string,
    published = true,
    dungeons: { note: string; dungeon: number }[] = [],
  ) =>
    payload.create({
      collection: 'quest-guides',
      data: {
        title: slug,
        slug,
        quest,
        summary: { needs: { notes, dungeons } },
        _status: published ? 'published' : 'draft',
      },
      draft: !published,
    })
  // Dos guías del mismo logro con la misma nota en otra capitalización: una sola fila.
  await guide('informe-uno', uno!.id, '1 x Mazmorra Kumijo\nLlave de la mazmorra Kumijo')
  // Una nota que no casa sola, con su mazmorra elegida a mano en el panel.
  await guide(
    'informe-dos',
    dos!.id,
    '1 x MAZMORRA KUMIJO\n1 x Mazmorra de Grunob\n1 x Mazmorra Ben Ripata.',
    true,
    [{ note: '1 x Mazmorra Ben Ripata.', dungeon: casa.id }],
  )
  // Un borrador no cuenta: la página solo lee lo publicado.
  await guide('informe-tres', tres!.id, 'Mazmorras nivel 200', false)
  const page = async (dofusId: number, slug: string, quests: number[]) => {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId, name: slug },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: slug,
        slug,
        state: 'published',
        quests: quests.map((quest) => ({ quests: [quest] })),
        _status: 'published',
      },
    })
  }
  await page(990_901, 'informe-logro', [uno!.id, dos!.id, tres!.id])
  // Una guía de Dofus: sus notas del grupo Mazmorras y las de Combates que dicen «mazmorra».
  const note = (text: string) => ({
    blockType: 'needNote' as const,
    text: {
      root: {
        type: 'root',
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
        children: [
          {
            type: 'paragraph',
            direction: null,
            format: '',
            indent: 0,
            version: 1,
            children: [{ type: 'text', text, version: 1 }],
          },
        ],
      },
    },
  })
  const dofus = (slug: string, order: number, published: boolean) =>
    payload.create({
      collection: 'dofus-guides',
      data: {
        name: slug,
        slug,
        order,
        state: 'published',
        level: 180,
        needs: {
          groups: [
            { name: 'mazmorras', rows: [note('1 x Mazmorra Kumijo'), note('Mazmorras nivel 200')] },
            { name: 'combates', rows: [note('1 x Combate solitario')] },
          ],
        },
        _status: published ? 'published' : 'draft',
      },
      draft: !published,
    })
  await dofus('informe-dofus', 990_801, true)
  // Un borrador no cuenta.
  await dofus('informe-dofus-borrador', 990_802, false)
  // Una misión con alternativas no suma: la página no pinta su Necesitarás.
  await page(990_902, 'informe-alternativas', [])
  await payload.update({
    collection: 'achievement-pages',
    where: { slug: { equals: 'informe-alternativas' } },
    data: { quests: [{ quests: [uno!.id, dos!.id] }] },
  })
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('dungeonNoteReport', () => {
  it('las filas de mazmorra de cada página publicada, con jefe solo si tiene imagen', async () => {
    const report = await dungeonNoteReport(payload)
    const ours = (rows: DungeonRow[]) => rows.filter((row) => row.page.startsWith('informe-'))
    // Cada fila dice cómo casó su nota: por nombre, por jefe, a mano o nada.
    const kumijo = {
      source: 'achievement',
      page: 'informe-logro',
      label: 'Mazmorra Kumijo',
      match: { how: 'boss', dungeon: 'Casa de los Espíritus', boss: 'Kumijo', approximate: false },
    }
    const ripata = {
      source: 'achievement',
      page: 'informe-logro',
      label: 'Mazmorra Ben Ripata',
      match: { how: 'manual', dungeon: 'Casa de los Espíritus' },
    }
    expect(ours(report.withBoss).filter((row) => row.source === 'achievement')).toEqual([
      kumijo,
      ripata,
    ])
    // Casa, pero su jefe no tiene imagen: icono genérico.
    expect(ours(report.generic).filter((row) => row.source === 'achievement')).toEqual([
      {
        source: 'achievement',
        page: 'informe-logro',
        label: 'Mazmorra de Grunob',
        match: {
          how: 'boss',
          dungeon: 'Akademia de los Goblins',
          boss: 'Director Grunob',
          approximate: false,
        },
      },
    ])
  })

  it('también las guías de Dofus y de misión publicadas, cada una con su casado', async () => {
    const report = await dungeonNoteReport(payload)
    const rows = (list: DungeonRow[], source: DungeonRow['source']) =>
      list
        .filter((row) => row.source === source && row.page.startsWith('informe-'))
        .map((row) => `${row.page}: ${row.label} (${row.match.how})`)
    // La guía de Dofus casa por nombre o jefe, sin elegidas a mano; un combate no cuenta.
    expect(rows(report.withBoss, 'dofus')).toEqual(['informe-dofus: Mazmorra Kumijo (boss)'])
    expect(rows(report.generic, 'dofus')).toEqual(['informe-dofus: Mazmorras nivel 200 (none)'])
    // Cada guía de misión con lo que pinta su cabecera, por slug: su elegida a mano gana al
    // nombre.
    expect(rows(report.withBoss, 'quest')).toEqual([
      'informe-dos: MAZMORRA KUMIJO (boss)',
      'informe-dos: Mazmorra Ben Ripata (manual)',
      'informe-uno: Mazmorra Kumijo (boss)',
      'informe-uno: Llave de la mazmorra Kumijo (boss)',
    ])
    expect(rows(report.generic, 'quest')).toEqual(['informe-dos: Mazmorra de Grunob (boss)'])
  })

  it('una mazmorra elegida que se borra no impide publicar la guía: su fila se quita', async () => {
    const dungeon = await payload.create({
      collection: 'dungeons',
      data: { dofusId: 990_139, name: 'Mazmorra que se borra' },
    })
    const guide = (
      await payload.find({ collection: 'quest-guides', where: { slug: { equals: 'informe-uno' } } })
    ).docs[0]!
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: {
        summary: { needs: { dungeons: [{ note: '1 x Mazmorra Kumijo', dungeon: dungeon.id }] } },
      },
    })
    await payload.delete({ collection: 'dungeons', id: dungeon.id })

    // Torre publica otra cosa de la guía: no tocó la fila, y no debe bloquearle.
    const saved = await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { title: 'informe-uno (editada)', _status: 'published' },
    })
    expect(saved.summary?.needs?.dungeons).toEqual([])
  })

  it('una nota que casa por un jefe concreto pinta la imagen de ese jefe', async () => {
    const [first, second] = await Promise.all(
      ['Primer Gemelo (informe)', 'Segundo Gemelo (informe)'].map((alt) =>
        payload.create({ collection: 'media', data: { alt }, file: tinyPng() }),
      ),
    )
    const [uno, dos] = await Promise.all([
      payload.create({
        collection: 'monsters',
        data: { dofusId: 990_904, name: 'Gemelo Primero', image: first!.id },
      }),
      payload.create({
        collection: 'monsters',
        data: { dofusId: 990_905, name: 'Gemelo Segundo', image: second!.id },
      }),
    ])
    await payload.create({
      collection: 'dungeons',
      data: { dofusId: 990_141, name: 'Cripta de los Gemelos', bosses: [uno.id, dos.id] },
    })

    const bosses = await readDungeonBosses(
      payload,
      ['Mazmorra Gemelo Segundo', 'Mazmorra Cripta de los Gemelos'],
      { overrideAccess: true },
    )
    // Por su jefe: el segundo. Por el nombre de la mazmorra: su primer jefe con imagen.
    expect(bosses.get('mazmorra gemelo segundo')?.id).toBe(second!.id)
    expect(bosses.get('mazmorra cripta de los gemelos')?.id).toBe(first!.id)
  })
})
