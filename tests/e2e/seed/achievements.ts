// El logro de prueba de las E2E y Lighthouse CI: «La ocasión hace al ladrón» (DofusDB 1671)
// en el metalogro Astrub, con las tres misiones de las guías sembradas (tests/e2e/seed/
// guides.ts): las dos primeras con guía publicada y la tercera con un borrador, que sale sin
// enlace. A su lado, un logro publicado antes y uno En preparación después.
// Se siembra después de las guías; repetirlo no duplica nada.
import path from 'node:path'
import type { Payload } from 'payload'

export const seedAchievement = {
  slug: 'la-ocasion-hace-al-ladron',
  name: 'La ocasión hace al ladrón',
  meta: '3 misiones - Niveles 15 a 25 - 10 puntos',
  icon: 'public/img/sistema/ach-203.webp',
  group: { name: 'Astrub', slug: 'metalogro-astrub' },
  // Un metalogro sin nada publicado: se ve apagado en el índice.
  emptyGroup: { name: 'Misiones de templo', slug: 'metalogro-misiones-de-templo' },
  reward: { xp: '102 128', kamas: '1 105' },
  quests: [
    { title: 'Esto hace aguas', href: '/esto-hace-aguas', kicker: 'Nivel 15' },
    {
      title: 'Seis pies bajo tierra',
      href: '/seis-pies-bajo-tierra',
      kicker: 'Nivel 20',
    },
    { title: 'El cazador cazado', kicker: 'Nivel 25' },
  ],
  previous: { name: 'Un ciudadano modelo', slug: 'un-ciudadano-modelo' },
  next: { name: 'La gran biblioteca', slug: 'la-gran-biblioteca' },
  countsFor: { name: 'Periplo astrubiense', points: 20, achievements: 6 },
}

async function findOne<T extends { id: number }>(
  payload: Payload,
  collection: 'achievements' | 'achievement-groups' | 'achievement-pages' | 'media' | 'quests',
  field: string,
  value: string | number,
): Promise<T | undefined> {
  const { docs } = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
  })
  return docs[0] as unknown as T | undefined
}

/** Siembra el metalogro y sus tres logros; repetirla no duplica nada. */
export async function seedAchievements(payload: Payload): Promise<void> {
  const quests = []
  for (const dofusId of [1975, 1976, 1977]) {
    const quest = await findOne<{ id: number }>(payload, 'quests', 'dofusId', dofusId)
    if (!quest) throw new Error(`Falta la misión ${dofusId}: siembra antes las guías`)
    quests.push(quest)
  }

  const iconKey = 'dofusdb-achievement-image:203:e2e'
  const icon =
    (await findOne(payload, 'media', 'gameAsset', iconKey)) ??
    (await payload.create({
      collection: 'media',
      data: { alt: seedAchievement.name, gameAsset: iconKey },
      filePath: path.resolve(seedAchievement.icon),
    }))

  const group =
    (await findOne(payload, 'achievement-groups', 'slug', seedAchievement.group.slug)) ??
    (await payload.create({
      collection: 'achievement-groups',
      data: {
        ...seedAchievement.group,
        section: 'zones',
        state: 'published',
        _status: 'published',
      },
    }))
  if (!(await findOne(payload, 'achievement-groups', 'slug', seedAchievement.emptyGroup.slug))) {
    await payload.create({
      collection: 'achievement-groups',
      data: {
        ...seedAchievement.emptyGroup,
        section: 'stories',
        state: 'preparing',
        _status: 'published',
      },
    })
  }

  const pages = [
    {
      dofusId: 1678,
      name: seedAchievement.previous.name,
      slug: seedAchievement.previous.slug,
      state: 'published' as const,
      quests: [quests[0]!],
    },
    {
      dofusId: 1671,
      name: seedAchievement.name,
      slug: seedAchievement.slug,
      state: 'published' as const,
      quests,
    },
    {
      dofusId: 1672,
      name: seedAchievement.next.name,
      slug: seedAchievement.next.slug,
      state: 'preparing' as const,
      quests: [quests[2]!],
    },
  ]
  for (const [index, page] of pages.entries()) {
    if (await findOne(payload, 'achievement-pages', 'slug', page.slug)) continue
    const achievement =
      (await findOne<{ id: number }>(payload, 'achievements', 'dofusId', page.dofusId)) ??
      (await payload.create({
        collection: 'achievements',
        data: {
          dofusId: page.dofusId,
          name: page.name,
          icon: icon.id,
          countsFor: [{ dofusId: 1677, ...seedAchievement.countsFor, icon: icon.id }],
        },
      }))
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: page.name,
        slug: page.slug,
        state: page.state,
        group: group.id,
        order: index + 1,
        points: 10,
        quests: page.quests.map((quest) => ({ quests: [quest.id] })),
        rewards: { experience: 102_128, kamas: 1_105 },
        _status: 'published',
      },
    })
  }
}
