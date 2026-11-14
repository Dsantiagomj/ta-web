// Las checklists de prueba de las E2E y Lighthouse CI: el «Dofus Nebuloso» con tres pasos de
// verdad recortados (un logro con su página y una misión con guía; un «detente aquí» con los
// objetivos de su misión; un «aquí se resuelve» que cierra el anterior), sus prerrequisitos y
// su Necesitarás con filas de texto («Kama», «Captura de almas») y una con la alternativa en la
// nota («o 30 000 kamas»); «Dofus de los Hielos»
// publicada, con la misión del primer paso del Nebuloso (lo hecho en una sale hecho en la
// otra); y «Silvestre» En preparación, que lleva a Squarespace. La misión del «detente aquí»
// pide terminada la del primer paso. Se siembra después de las guías, el logro y las guías de
// Dofus; repetirlo no duplica nada.
import path from 'node:path'
import type { Payload } from 'payload'

import { seedAchievement } from './achievements'
import { seedDofus } from './dofus-guides'
import { seedGuide } from './guides'

export const seedChecklists = {
  nebuloso: {
    slug: 'checklist-nebuloso',
    name: 'Dofus Nebuloso',
    title: 'Checklist del Dofus Nebuloso',
    description: 'Anutropía, Sramvil y Xelorium, con el Dofus de los Vigilantes por el camino.',
    guide: { slug: seedDofus.ocre.slug, name: seedDofus.ocre.name },
    banner: 'public/img/inicio/astrub-480.webp',
    zone: 'Anutropía',
    intro: 'Esta checklist incluye también las misiones para conseguir el Dofus de los Vigilantes.',
    prerequisites: [
      { title: 'Logros previos', rows: [{ key: 'l1', text: 'Más de 3 000 puntos de logro' }] },
      { title: 'Hechizos', rows: [{ key: 'h1', text: 'Captura de almas (obligatorio)' }] },
    ],
    steps: {
      first: `Logro "${seedAchievement.name}". Completo.`,
      stopPlain: 'Logro "El alegre retirado", misión 2.',
      stop: 'Avanza hasta que te pida entregar muestras de sangre.',
      resolvePlain: 'Logro "El rey y yo".',
      resolve: 'Se termina pasivamente la etapa 2.',
    },
    stopQuest: {
      dofusId: 991_190,
      name: 'Sangre fría',
      level: 190,
      npc: 'Wello',
      start: { x: -5, y: -5 },
      objectives: [
        { kind: 'npc' as const, text: 'Ve a ver a Wello', x: -5, y: -5, subAreaId: 991_301 },
        {
          kind: 'bring' as const,
          text: 'Entrégale a Wello: 3 x Muestra de sangre',
          x: -8,
          y: -4,
          subAreaId: 991_301,
        },
        {
          kind: 'fight' as const,
          text: 'Vence a 1 x Rey Nidas en un solo combate',
          x: -9,
          y: -5,
          subAreaId: 991_302,
        },
      ],
      // Las subzonas de sus objetivos: la ruta dice el nombre cuando cambia.
      subareas: [
        { dofusId: 991_301, name: 'Pueblo de Anutropía' },
        { dofusId: 991_302, name: 'Palacio del Rey Nidas' },
      ],
      // El objetivo donde para el paso 2: el segundo.
      stopObjective: 1,
    },
    // Una fila con su alternativa en la nota, como la importa el Nebuloso de dev (paso 4):
    // un nombre largo y «o 30 000 kamas» debajo, nunca en una columna estrecha.
    noteRow: {
      dofusId: 991_801,
      name: 'Insignia de maligilante',
      icon: 'public/img/sistema/item-388.webp',
      note: 'o 30 000 kamas',
    },
    labels: {
      kama: 'Kama',
      spell: 'Captura de almas',
      spellNote: 'Hechizo: requisito, no consumible',
    },
  },
  hielos: {
    slug: 'checklist-dofus-de-los-hielos',
    name: 'Dofus de los Hielos',
    text: 'Logro "Seis pies bajo tierra". Completo.',
    // El paso 2: una fila genérica (vale con la misión del paso 1 o con «Sangre fría») y
    // «Sangre fría», que el juego termina sola al terminar la del paso 1 (COMPLETED_BY).
    second: 'Logro "Bienvenido a Frigost". Completo.',
    generic: 'Misión de clase',
  },
  silvestre: {
    slug: 'checklist-silvestre',
    name: 'Dofus Silvestre',
    legacyHref: 'https://www.torrentearcano.com/checklist-silvestre',
    // El borrador con lo que trae el Silvestre (lo ve la vista previa del panel): avisos, una
    // parada con «más paradas» y su parte del verde, una fila con alternativas y otra con
    // apartado, un logro «hasta la misión», un paso que avanza otro y los avisos y objetos de
    // los prerrequisitos.
    draft: {
      firstPlain: 'Logro "Escapadas y emboscadas", misión 3.',
      tip: '(Se pueden encadenar las misiones)',
      stopPlain: 'Logro "El alegre retirado", misión 4.',
      stop: '(Hasta tener que luchar contra los monstruos de la zona)',
      resumeLine: 'Se hacen las peleas correspondientes.',
      laterLine: 'Hasta vencer al Rey Nidas: lo termina un paso posterior.',
      resolve: 'Se pasa la mazmorra y se actualiza la misión del inciso 1.',
      must: 'En este punto se debe tomar la misión Sangre fría.',
      group: 'Misión opcional',
      prerequisite: { key: 'o1', text: 'Campesino nivel 100' },
      note: {
        title: 'Empieza el Dofus Ocre cuanto antes',
        text: 'Es una misión larga e independiente de la mayoría de las etapas.',
      },
    },
  },
}

type Collection =
  | 'items'
  | 'achievements'
  | 'quests'
  | 'npcs'
  | 'media'
  | 'dofus-guides'
  | 'checklists'
  | 'subareas'

async function findOne(payload: Payload, collection: Collection, field: string, value: unknown) {
  const { docs } = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  return docs[0] as { id: number } | undefined
}

async function media(payload: Payload, gameAsset: string, file: string, alt: string) {
  return (
    (await findOne(payload, 'media', 'gameAsset', gameAsset)) ??
    (await payload.create({
      collection: 'media',
      data: { alt, gameAsset },
      filePath: path.resolve(file),
    }))
  )
}

/** Siembra el Nebuloso, su guía de Dofus y Silvestre En preparación; repetirla no duplica nada. */
export async function seedChecklistPages(payload: Payload): Promise<void> {
  const neb = seedChecklists.nebuloso
  const giverQuest = await findOne(payload, 'quests', 'dofusId', 1976)
  const achievement = await findOne(payload, 'achievements', 'dofusId', 1671)
  const npc = await findOne(payload, 'npcs', 'dofusId', seedGuide.giver.npcId)
  const [pico, ojo] = await Promise.all(
    seedDofus.ocre.needsItems.map(({ name }) => findOne(payload, 'items', 'name', name)),
  )
  if (!giverQuest || !achievement || !npc || !pico || !ojo) {
    throw new Error('Faltan la misión, el logro, el PNJ o los objetos: siembra antes las guías')
  }

  // La guía de Dofus de la checklist, de la que salen el huevo, el color y las migas: la del
  // Ocre ya sembrada. Una guía más cambiaría el índice y el menú que prueban otras specs.
  const guide = await findOne(payload, 'dofus-guides', 'slug', neb.guide.slug)
  if (!guide) throw new Error('Falta la guía de Dofus de prueba: siembra antes las guías de Dofus')

  const { stopQuest } = neb
  for (const subarea of stopQuest.subareas) {
    if (!(await findOne(payload, 'subareas', 'dofusId', subarea.dofusId))) {
      await payload.create({ collection: 'subareas', data: subarea })
    }
  }
  const stopData = {
    dofusId: stopQuest.dofusId,
    name: stopQuest.name,
    levelMin: stopQuest.level,
    prerequisites: [giverQuest.id],
    startPositions: [{ npcId: 1, npcName: stopQuest.npc, ...stopQuest.start }],
    stages: [
      {
        dofusId: 1,
        objectives: stopQuest.objectives.map((objective, index) => ({
          dofusId: index + 1,
          ...objective,
        })),
      },
    ],
  }
  // Una base de una ejecución anterior puede tener la misión sin las subzonas: se pone al día.
  const existing = await findOne(payload, 'quests', 'dofusId', stopQuest.dofusId)
  const stop = existing
    ? await payload.update({ collection: 'quests', id: existing.id, data: stopData })
    : await payload.create({ collection: 'quests', data: stopData })
  // Lo demás ya está si la checklist ya está.
  if (await findOne(payload, 'checklists', 'slug', neb.slug)) return

  const banner = await media(payload, 'e2e-checklist-banner', neb.banner, 'Astrub')
  const { noteRow } = neb
  const insignia =
    (await findOne(payload, 'items', 'dofusId', noteRow.dofusId)) ??
    (await payload.create({
      collection: 'items',
      data: {
        dofusId: noteRow.dofusId,
        name: noteRow.name,
        superTypeId: 9,
        image: (await media(payload, 'e2e-checklist-insignia', noteRow.icon, noteRow.name)).id,
      },
    }))

  const created = await payload.create({
    collection: 'checklists',
    data: {
      name: neb.name,
      slug: neb.slug,
      order: 3,
      state: 'published',
      description: neb.description,
      dofusGuide: guide.id,
      prerequisites: { intro: neb.intro, groups: neb.prerequisites },
      steps: [
        {
          legacyNumber: 1,
          zone: neb.zone,
          segments: [{ kind: 'plain', text: neb.steps.first }],
          achievements: [{ achievement: achievement.id, mode: 'all' }],
          quests: [{ quest: giverQuest.id, kind: 'mandatory' }],
          needs: [
            { item: pico.id, quantity: 3, category: 'resources', countsInTotal: true },
            { label: neb.labels.kama, quantity: 1, category: 'resources', countsInTotal: true },
            {
              label: neb.labels.spell,
              quantity: 1,
              category: 'resources',
              countsInTotal: false,
              note: neb.labels.spellNote,
            },
          ],
          figure: { npc: npc.id, role: 'Inicia el paso' },
          banner: banner.id,
        },
        {
          legacyNumber: 2,
          segments: [
            { kind: 'plain', text: neb.steps.stopPlain },
            {
              kind: 'stop',
              text: neb.steps.stop,
              quest: stop.id,
              stopObjective: stopQuest.stopObjective,
            },
          ],
          quests: [{ quest: stop.id, kind: 'mandatory' }],
          needs: [{ item: ojo.id, quantity: 1, category: 'souls', countsInTotal: true }],
        },
        {
          legacyNumber: 3,
          segments: [{ kind: 'plain', text: neb.steps.resolvePlain }],
          needs: [
            {
              item: insignia.id,
              quantity: 1,
              note: noteRow.note,
              category: 'resources',
              countsInTotal: true,
            },
            { item: pico.id, quantity: 2, category: 'resources', countsInTotal: true },
          ],
        },
      ],
      legacy: {
        prefix: 'nebuloso:',
        classicKeys: { v4: 'dofus_nebuloso_clean_v1', v3: null },
        guideVersion: 1,
      },
      _status: 'published',
    },
  })
  // El «aquí se resuelve» del paso 3 cierra el paso 2 por su stepId, que da el hook al guardar.
  const steps = created.steps ?? []
  await payload.update({
    collection: 'checklists',
    id: created.id,
    data: {
      steps: steps.map((step, index) =>
        index === 2
          ? {
              ...step,
              segments: [
                ...(step.segments ?? []),
                { kind: 'resolve' as const, text: neb.steps.resolve, closes: [steps[1].stepId!] },
              ],
            }
          : step,
      ),
      _status: 'published',
    },
  })

  const hielos = seedChecklists.hielos
  if (!(await findOne(payload, 'checklists', 'slug', hielos.slug))) {
    await payload.create({
      collection: 'checklists',
      data: {
        name: hielos.name,
        slug: hielos.slug,
        order: 2,
        state: 'published',
        steps: [
          {
            legacyNumber: 1,
            segments: [{ kind: 'plain', text: hielos.text }],
            quests: [{ quest: giverQuest.id, kind: 'mandatory' }],
          },
          {
            legacyNumber: 2,
            segments: [{ kind: 'plain', text: hielos.second }],
            quests: [
              {
                quest: giverQuest.id,
                kind: 'mandatory',
                label: hielos.generic,
                alternatives: [stop.id],
              },
              { quest: stop.id, kind: 'mandatory' },
            ],
          },
        ],
        completedBy: [{ quest: stop.id, by: [giverQuest.id] }],
        legacy: { prefix: 'hielos:', guideVersion: 1 },
        _status: 'published',
      },
    })
  }

  const silvestre = seedChecklists.silvestre
  if (!(await findOne(payload, 'checklists', 'slug', silvestre.slug))) {
    const ficha = await payload.create({
      collection: 'checklists',
      data: {
        name: silvestre.name,
        slug: silvestre.slug,
        order: 1,
        state: 'preparing',
        legacyHref: silvestre.legacyHref,
        _status: 'published',
      },
    })
    await seedSilvestreDraft(payload, ficha.id, { achievement, stop, pico, ojo })
  }
}

/**
 * El borrador del Silvestre sobre su ficha publicada, como lo deja la importación: lo publicado
 * sigue siendo la ficha En preparación y la vista previa del panel enseña los pasos.
 */
async function seedSilvestreDraft(
  payload: Payload,
  id: number,
  refs: Record<'achievement' | 'stop' | 'pico' | 'ojo', { id: number }>,
) {
  const d = seedChecklists.silvestre.draft
  const { achievement, stop, pico, ojo } = refs
  const first = await payload.update({
    collection: 'checklists',
    id,
    draft: true,
    data: {
      // Sin previousSteps: lo guardado va numerado como ahora (legacyNumber).
      legacy: { prefix: 'silvestre:', guideVersion: 4 },
      prerequisites: {
        groups: [{ title: 'Oficios', rows: [d.prerequisite] }],
        notes: [d.note],
        needs: [
          {
            item: pico.id,
            quantity: 50,
            category: 'resources',
            countsInTotal: true,
            prerequisite: d.prerequisite.key,
          },
        ],
      },
      steps: [
        {
          legacyNumber: 1,
          segments: [
            { kind: 'plain', text: d.firstPlain },
            { kind: 'tip', text: d.tip },
          ],
          achievements: [{ achievement: achievement.id, mode: 'upto', on: [1, 2] }],
          needs: [
            {
              item: pico.id,
              quantity: 1,
              alternatives: [{ item: ojo.id, quantity: 1 }],
              category: 'consumables',
              countsInTotal: true,
            },
            {
              item: pico.id,
              quantity: 5,
              group: d.group,
              category: 'resources',
              countsInTotal: true,
            },
          ],
        },
        {
          legacyNumber: 2,
          segments: [
            { kind: 'plain', text: d.stopPlain },
            {
              kind: 'stop',
              text: d.stop,
              quest: stop.id,
              stopObjective: 0,
              resumeLine: d.resumeLine,
              more: [{ quest: stop.id, stopObjective: 2, later: true, line: d.laterLine }],
            },
            { kind: 'resolve', text: d.resolve, closes: [] },
            { kind: 'must', text: d.must },
          ],
          quests: [{ quest: stop.id, kind: 'mandatory' }],
        },
      ],
    },
  })
  // El paso 2 avanza el 1 por su stepId, que da el hook al guardar.
  const steps = first.steps ?? []
  await payload.update({
    collection: 'checklists',
    id,
    draft: true,
    data: {
      steps: steps.map((step, index) =>
        index === 1 ? { ...step, updates: [steps[0].stepId!] } : step,
      ),
    },
  })
}
