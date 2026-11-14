// Las checklists de prueba del índice /checklists y del menú, además de las de la página
// (tests/e2e/seed/checklists.ts): el «Dofus Nebuloso» Publicado (su página existe) y el
// «Silvestre» En preparación vienen de allí. Aquí se añaden una En preparación con
// legacyHref y el huevo de su Dofus, una En preparación sin él (apagada) y un borrador que no
// sale. Se siembra después de las checklists de la página; repetirlo no duplica nada.
import type { Payload } from 'payload'

import { seedChecklists } from './checklists'
import { seedDofus } from './dofus-guides'

export const indexChecklists = {
  /** Publicada, con su página: la siembra tests/e2e/seed/checklists.ts. */
  published: {
    slug: seedChecklists.nebuloso.slug,
    name: seedChecklists.nebuloso.name,
    description: seedChecklists.nebuloso.description,
    /** El h1 de su página. */
    title: seedChecklists.nebuloso.title,
  },
  legacy: {
    slug: 'lista-ocre',
    name: 'Almas del Ocre',
    description: 'Las almas de la eterna cosecha, una a una.',
    legacyHref: 'https://www.torrentearcano.com/lista-ocre',
  },
  preparing: { slug: 'checklist-jyfus', name: 'Checklist del Jyfus' },
  /**
   * El borrador de almas sobre la ficha del Ocre, como lo deja la importación: la vista previa
   * del panel lo enseña; un visitante sigue yendo a Squarespace. Tres almas en dos etapas: un
   * jefe en su mazmorra y dos archimonstruos, en dos regiones.
   */
  souls: {
    intro: 'Empieza por los jefes: sus mazmorras dan también archimonstruos.',
    quest: { dofusId: 991_439, name: 'La eterna cosecha de prueba' },
    subareas: [
      { dofusId: 991_401, name: 'Playa de Arena', areaName: 'Astrub' },
      { dofusId: 991_402, name: 'Bosque de Amakna', areaName: 'Amakna' },
    ],
    monsters: [
      { dofusId: 991_601, name: 'Mob Lasponja', levels: [20, 30], boss: true, subAreaId: 991_401 },
      { dofusId: 991_602, name: 'Pikopi', levels: [55], archmonster: true, subAreaId: 991_402 },
      {
        dofusId: 991_603,
        name: 'Arakna Maja',
        levels: [12, 13],
        archmonster: true,
        subAreaId: 991_401,
      },
    ],
    dungeon: { dofusId: 991_701, name: 'Castillo de Arena', level: 25 },
  },
  draft: { slug: 'checklist-borrador', name: 'Checklist en borrador' },
}

const findId = async (payload: Payload, collection: 'checklists' | 'dofus-guides', slug: string) =>
  (await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 }))
    .docs[0]?.id

export async function seedChecklistIndex(payload: Payload) {
  const { legacy, preparing, draft } = indexChecklists
  const checklists = [
    {
      ...legacy,
      order: 2,
      state: 'preparing',
      dofusGuide: await findId(payload, 'dofus-guides', seedDofus.ocre.slug),
      _status: 'published',
    },
    { ...preparing, order: 4, state: 'preparing', _status: 'published' },
    { ...draft, order: 0, state: 'preparing', _status: 'draft' },
  ]
  for (const data of checklists) {
    if (await findId(payload, 'checklists', data.slug)) continue
    const created = await payload.create({
      collection: 'checklists',
      data: data as never,
      draft: data._status === 'draft',
    })
    if (data.slug === legacy.slug) await seedOcreSouls(payload, created.id)
  }
}

/** Las almas del Ocre de prueba y su borrador de almas sobre la ficha publicada. */
async function seedOcreSouls(payload: Payload, checklistId: number) {
  const { souls } = indexChecklists
  for (const subarea of souls.subareas) {
    await payload.create({ collection: 'subareas', data: subarea })
  }
  const monsters = []
  for (const monster of souls.monsters) {
    monsters.push(await payload.create({ collection: 'monsters', data: monster }))
  }
  await payload.create({
    collection: 'dungeons',
    data: { ...souls.dungeon, bosses: [monsters[0].id] },
  })
  const bring = (monster: (typeof souls.monsters)[number], index: number) => ({
    dofusId: index + 1,
    kind: 'bring' as const,
    monsterId: monster.dofusId,
    text: `Lleva 1 alma(s) de {monster,${monster.dofusId}} a {npc,1}`,
  })
  const [boss, ...archis] = souls.monsters
  const quest = await payload.create({
    collection: 'quests',
    data: {
      ...souls.quest,
      stages: [
        { dofusId: 1, objectives: [bring(boss, 0)] },
        { dofusId: 2, objectives: archis.map((monster, index) => bring(monster, index + 1)) },
      ],
    },
  })
  await payload.update({
    collection: 'checklists',
    id: checklistId,
    draft: true,
    data: {
      kind: 'souls',
      soulsQuest: quest.id,
      prerequisites: { intro: souls.intro },
      legacy: { prefix: 'cosecha:' },
    },
  })
}
