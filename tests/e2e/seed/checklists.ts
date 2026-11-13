// Las checklists de prueba de las E2E y Lighthouse CI: el «Dofus Nebuloso» con tres pasos de
// verdad recortados (un logro con su página y una misión con guía; un «detente aquí» con los
// objetivos de su misión; un «aquí se resuelve» que cierra el anterior), sus prerrequisitos y
// su Necesitarás con filas de texto («Kama», «Captura de almas»); y «Silvestre» En
// preparación, que lleva a Squarespace. Se siembra después de las guías, el logro y las
// guías de Dofus; repetirlo no duplica nada.
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
        { kind: 'npc' as const, text: 'Ve a ver a Wello', x: -5, y: -5 },
        { kind: 'bring' as const, text: 'Entrégale a Wello: 3 x Muestra de sangre', x: -8, y: -4 },
        { kind: 'fight' as const, text: 'Vence a 1 x Rey Nidas en un solo combate', x: -9, y: -5 },
      ],
      // El objetivo donde para el paso 2: el segundo.
      stopObjective: 1,
    },
    labels: {
      kama: 'Kama',
      spell: 'Captura de almas',
      spellNote: 'Hechizo: requisito, no consumible',
    },
  },
  silvestre: {
    slug: 'checklist-silvestre',
    name: 'Dofus Silvestre',
    legacyHref: 'https://www.torrentearcano.com/checklist-silvestre',
  },
}

type Collection =
  'items' | 'achievements' | 'quests' | 'npcs' | 'media' | 'dofus-guides' | 'checklists'

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
  if (await findOne(payload, 'checklists', 'slug', neb.slug)) return

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
  const stop =
    (await findOne(payload, 'quests', 'dofusId', stopQuest.dofusId)) ??
    (await payload.create({
      collection: 'quests',
      data: {
        dofusId: stopQuest.dofusId,
        name: stopQuest.name,
        levelMin: stopQuest.level,
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
      },
    }))
  const banner = await media(payload, 'e2e-checklist-banner', neb.banner, 'Astrub')

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
          needs: [{ item: pico.id, quantity: 2, category: 'resources', countsInTotal: true }],
        },
      ],
      legacy: { prefix: 'nebuloso:', guideVersion: 1 },
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

  const silvestre = seedChecklists.silvestre
  if (!(await findOne(payload, 'checklists', 'slug', silvestre.slug))) {
    await payload.create({
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
  }
}
