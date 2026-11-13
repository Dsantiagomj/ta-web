import { Forbidden, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Checklist, User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Las checklists de Torre: el visitante solo lee lo publicado, Torre lo edita todo desde el
// panel, su slug comparte la raíz con las guías y cada paso conserva su stepId.

let payload: Payload
let editor: User

const PREFIX = 'prueba-checklist'

async function cleanUp() {
  await payload.delete({
    collection: 'checklists',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'quest-guides',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'quests',
    where: { dofusId: { equals: QUEST_DOFUS_ID } },
    overrideAccess: true,
  })
}

const QUEST_DOFUS_ID = 990_101

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)
})

afterAll(async () => {
  await cleanUp()
})

const checklist = (slug: string, order: number) => ({
  name: `Checklist de prueba ${order}`,
  slug,
  order,
  state: 'published' as const,
})

const plain = (text: string) => ({ segments: [{ kind: 'plain' as const, text }] })
const texts = (doc: Checklist) => (doc.steps ?? []).map((step) => step.segments?.[0]?.text)
const stepIds = (doc: Checklist) => (doc.steps ?? []).map((step) => step.stepId)

describe('acceso a las checklists', () => {
  it('un visitante solo lee las publicadas; Torre ve también los borradores', async () => {
    await payload.create({
      collection: 'checklists',
      data: { ...checklist(`${PREFIX}-publicada`, 1), _status: 'published' },
      user: editor,
      overrideAccess: false,
    })
    await payload.create({
      collection: 'checklists',
      data: { ...checklist(`${PREFIX}-borrador`, 2), _status: 'draft' },
      draft: true,
      user: editor,
      overrideAccess: false,
    })

    const where = { slug: { like: PREFIX } }
    const visitor = await payload.find({ collection: 'checklists', where, overrideAccess: false })
    expect(visitor.docs.map((doc) => doc.slug)).toEqual([`${PREFIX}-publicada`])

    // Ni pidiendo el borrador: sin sesión no se ve.
    const visitorDraft = await payload.find({
      collection: 'checklists',
      where,
      draft: true,
      overrideAccess: false,
    })
    expect(visitorDraft.docs.map((doc) => doc.slug)).toEqual([`${PREFIX}-publicada`])

    const panel = await payload.find({
      collection: 'checklists',
      where,
      draft: true,
      user: editor,
      overrideAccess: false,
    })
    expect(panel.docs.map((doc) => doc.slug).sort()).toEqual([
      `${PREFIX}-borrador`,
      `${PREFIX}-publicada`,
    ])
  })

  it('un visitante no puede crear, cambiar ni borrar una checklist', async () => {
    await expect(
      payload.create({
        collection: 'checklists',
        data: checklist(`${PREFIX}-anonima`, 3),
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
    const [published] = (
      await payload.find({
        collection: 'checklists',
        where: { slug: { equals: `${PREFIX}-publicada` } },
      })
    ).docs
    await expect(
      payload.update({
        collection: 'checklists',
        id: published!.id,
        data: { name: 'Otra' },
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
    await expect(
      payload.delete({ collection: 'checklists', id: published!.id, overrideAccess: false }),
    ).rejects.toBeInstanceOf(Forbidden)
  })
})

describe('el stepId de cada paso', () => {
  it('se crea al guardar y sobrevive a reordenar y editar los pasos', async () => {
    const created = await payload.create({
      collection: 'checklists',
      data: {
        ...checklist(`${PREFIX}-pasos`, 4),
        steps: [plain('Uno'), plain('Dos'), plain('Tres')],
      },
      user: editor,
      overrideAccess: false,
    })
    const [one, two, three] = stepIds(created)
    expect(one).toMatch(/^[0-9a-f-]{36}$/)
    expect(new Set([one, two, three]).size).toBe(3)

    // Como el panel: las filas llegan con su id, en otro orden y con el texto cambiado.
    const rows = created.steps!
    const reordered = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: {
        steps: [
          { ...rows[2]!, segments: [{ kind: 'plain', text: 'Tres, cambiado' }] },
          rows[0]!,
          { ...rows[1]!, stepId: null },
        ],
      },
      user: editor,
      overrideAccess: false,
    })
    expect(texts(reordered)).toEqual(['Tres, cambiado', 'Uno', 'Dos'])
    expect(stepIds(reordered)).toEqual([three, one, two])
  })

  it('un paso nuevo recibe uno propio y uno duplicado no se queda con el del original', async () => {
    const created = await payload.create({
      collection: 'checklists',
      data: { ...checklist(`${PREFIX}-duplicado`, 5), steps: [plain('Uno')] },
      user: editor,
      overrideAccess: false,
    })
    const [original] = created.steps!
    // Como «Duplicar» en el panel: filas nuevas, con los mismos valores.
    const { id: _row, segments, ...rest } = original!
    const copy = { ...rest, segments: segments?.map(({ id: _segment, ...segment }) => segment) }
    const updated = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: { steps: [original!, copy, plain('Nuevo')] },
      user: editor,
      overrideAccess: false,
    })
    const [kept, copied, added] = stepIds(updated)
    expect(kept).toBe(original!.stepId)
    expect(new Set([kept, copied, added]).size).toBe(3)
  })

  it('un borrador guardado tampoco lo cambia', async () => {
    const created = await payload.create({
      collection: 'checklists',
      data: { ...checklist(`${PREFIX}-borrador-pasos`, 6), steps: [plain('Uno')] },
      user: editor,
      overrideAccess: false,
    })
    const draft = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: { steps: [{ ...created.steps![0]!, stepId: 'otro' }, plain('Dos')] },
      draft: true,
      user: editor,
      overrideAccess: false,
    })
    expect(stepIds(draft)[0]).toBe(created.steps![0]!.stepId)
  })
})

describe('el slug de una checklist en la raíz', () => {
  it('no puede ser el de una guía de misión, ni al revés', async () => {
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía de prueba', slug: `${PREFIX}-compartido` },
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection: 'checklists',
        data: checklist(`${PREFIX}-compartido`, 7),
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)

    await payload.create({
      collection: 'checklists',
      data: checklist(`${PREFIX}-solo-checklist`, 8),
      user: editor,
      overrideAccess: false,
    })
    await expect(
      payload.create({
        collection: 'quest-guides',
        data: { title: 'Otra guía', slug: `${PREFIX}-solo-checklist` },
        overrideAccess: true,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('no puede ser una ruta del sitio', async () => {
    await expect(
      payload.create({
        collection: 'checklists',
        data: checklist('sistema', 9),
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('los tramos de un paso', () => {
  /** Una misión con dos etapas: tres objetivos, del 0 al 2. */
  async function questWithObjectives() {
    const objective = (dofusId: number) => ({ dofusId, kind: 'npc' as const })
    return payload.create({
      collection: 'quests',
      data: {
        dofusId: QUEST_DOFUS_ID,
        name: 'Muestreo de prueba',
        stages: [
          { dofusId: 1, objectives: [objective(11), objective(12)] },
          { dofusId: 2, objectives: [objective(21)] },
        ],
      },
      overrideAccess: true,
    })
  }

  const stop = (quest: number, stopObjective: number) => ({
    segments: [{ kind: 'stop' as const, text: 'Avanza hasta…', quest, stopObjective }],
  })

  it('un «detente aquí» apunta a un objetivo que su misión tiene', async () => {
    const quest = await questWithObjectives()
    const created = await payload.create({
      collection: 'checklists',
      data: { ...checklist(`${PREFIX}-detente`, 10), steps: [stop(quest.id, 2)] },
      user: editor,
      overrideAccess: false,
    })
    expect(created.steps?.[0]?.segments?.[0]?.stopObjective).toBe(2)

    await expect(
      payload.create({
        collection: 'checklists',
        data: { ...checklist(`${PREFIX}-detente-fuera`, 11), steps: [stop(quest.id, 3)] },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('un «aquí se resuelve» cierra pasos de la misma checklist', async () => {
    const created = await payload.create({
      collection: 'checklists',
      data: { ...checklist(`${PREFIX}-resuelve`, 12), steps: [plain('Uno')] },
      user: editor,
      overrideAccess: false,
    })
    const [first] = created.steps!
    const resolve = (closes: string[]) => ({
      segments: [{ kind: 'resolve' as const, text: 'Termina la misión.', closes }],
    })

    const updated = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: { steps: [first!, resolve([first!.stepId!])] },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.steps?.[1]?.segments?.[0]?.closes).toEqual([first!.stepId])

    await expect(
      payload.update({
        collection: 'checklists',
        id: created.id,
        data: { steps: [first!, resolve(['paso-de-otra-checklist'])] },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
