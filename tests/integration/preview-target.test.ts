import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { findPreviewSlug } from '@/lib/guides/preview-target'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// /vista-previa solo lleva a una página que existe para el usuario del panel: una guía, un
// logro, una guía de Dofus o una checklist, borradores incluidos.

let payload: Payload
let editor: User

const PREFIX = 'prueba-vp'

async function cleanUp() {
  await payload.delete({
    collection: 'checklists',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)
  await payload.create({
    collection: 'checklists',
    data: {
      name: 'Checklist borrador',
      slug: `${PREFIX}-checklist`,
      order: 95,
      state: 'preparing',
    },
    draft: true,
  })
})

afterAll(async () => {
  await cleanUp()
})

describe('findPreviewSlug', () => {
  it('encuentra una checklist que solo es borrador, En preparación incluida', async () => {
    expect(await findPreviewSlug(payload, `${PREFIX}-checklist`, editor)).toBe(
      `${PREFIX}-checklist`,
    )
  })

  it('sin página con ese slug, nada', async () => {
    expect(await findPreviewSlug(payload, `${PREFIX}-no-existe`, editor)).toBeNull()
  })
})
