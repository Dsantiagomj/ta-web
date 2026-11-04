import { Forbidden, NotFound, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Media, Quest, QuestGuide, User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

/** Un párrafo en el formato de Lexical, para los campos de texto enriquecido. */
function paragraph(text: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          textFormat: 0,
          textStyle: '',
          children: [
            { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
          ],
        },
      ],
    },
  }
}

// Permisos reales de `quest-guides` a través de la API local, con overrideAccess: false
// como cuando se renderiza para un visitante. Sin `user`, la petición es anónima.
describe('permisos de quest-guides', () => {
  let payload: Payload
  let editor: User
  let published: QuestGuide
  let draft: QuestGuide

  beforeAll(async () => {
    payload = await startPayload()
    editor = await createPanelUser(payload)
    published = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Aprendizaje: Escudero', slug: 'aprendizaje-escudero', _status: 'published' },
    })
    draft = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Aprendizaje: Caballero', slug: 'aprendizaje-caballero', _status: 'draft' },
      draft: true,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'quest-guides', where: { id: { exists: true } } })
    await payload.delete({ collection: 'quests', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.destroy()
  })

  describe('un visitante anónimo', () => {
    it('lee las guías publicadas pero no los borradores', async () => {
      const found = await payload.find({ collection: 'quest-guides', overrideAccess: false })
      const ids = found.docs.map((doc) => doc.id)
      expect(ids).toContain(published.id)
      expect(ids).not.toContain(draft.id)

      const byId = await payload.findByID({
        collection: 'quest-guides',
        id: published.id,
        overrideAccess: false,
      })
      expect(byId.title).toBe('Aprendizaje: Escudero')

      await expect(
        payload.findByID({ collection: 'quest-guides', id: draft.id, overrideAccess: false }),
      ).rejects.toThrow(NotFound)
    })

    it('no crea guías', async () => {
      await expect(
        payload.create({
          collection: 'quest-guides',
          data: { title: 'Creada por un anónimo', slug: 'creada-por-un-anonimo' },
          overrideAccess: false,
        }),
      ).rejects.toThrow(Forbidden)
    })

    it('no edita guías', async () => {
      await expect(
        payload.update({
          collection: 'quest-guides',
          id: published.id,
          data: { title: 'Cambiada por un anónimo' },
          overrideAccess: false,
        }),
      ).rejects.toThrow(Forbidden)

      const unchanged = await payload.findByID({ collection: 'quest-guides', id: published.id })
      expect(unchanged.title).toBe('Aprendizaje: Escudero')
    })

    it('no borra guías', async () => {
      await expect(
        payload.delete({ collection: 'quest-guides', id: published.id, overrideAccess: false }),
      ).rejects.toThrow(Forbidden)

      const stillThere = await payload.findByID({ collection: 'quest-guides', id: published.id })
      expect(stillThere.id).toBe(published.id)
    })
  })

  describe('un usuario del panel', () => {
    it('lee las guías publicadas y los borradores', async () => {
      const found = await payload.find({
        collection: 'quest-guides',
        overrideAccess: false,
        user: editor,
      })
      const ids = found.docs.map((doc) => doc.id)
      expect(ids).toContain(published.id)
      expect(ids).toContain(draft.id)

      const byId = await payload.findByID({
        collection: 'quest-guides',
        id: draft.id,
        overrideAccess: false,
        user: editor,
      })
      expect(byId._status).toBe('draft')
    })

    it('crea un borrador, lo publica y queda una versión', async () => {
      const created = await payload.create({
        collection: 'quest-guides',
        data: { title: 'La sombra de Incarnam', slug: 'la-sombra-de-incarnam', _status: 'draft' },
        draft: true,
        overrideAccess: false,
        user: editor,
      })
      expect(created._status).toBe('draft')

      const publishedNow = await payload.update({
        collection: 'quest-guides',
        id: created.id,
        data: { _status: 'published' },
        overrideAccess: false,
        user: editor,
      })
      expect(publishedNow._status).toBe('published')

      const versions = await payload.findVersions({
        collection: 'quest-guides',
        where: { parent: { equals: created.id } },
        overrideAccess: false,
        user: editor,
      })
      expect(versions.docs.map((version) => version.version._status)).toContain('published')

      const visible = await payload.findByID({
        collection: 'quest-guides',
        id: created.id,
        overrideAccess: false,
      })
      expect(visible.title).toBe('La sombra de Incarnam')
    })

    it('guarda una guía con los cuatro bloques, misiones e imagen', async () => {
      const image: Media = await payload.create({
        collection: 'media',
        data: { alt: 'Mapa de Astrub' },
        file: tinyPng(),
      })
      const quest: Quest = await payload.create({
        collection: 'quests',
        data: { dofusId: 2001, name: 'Aprendizaje: Escudero' },
      })

      const created = await payload.create({
        collection: 'quest-guides',
        data: {
          title: 'Guía completa',
          slug: 'guia-completa',
          _status: 'published',
          quests: [quest.id],
          summary: {
            prerequisites: 'Ninguno',
            needs: { notes: '10 Alas de Tofu' },
            rewards: '1000 PX',
            startNpc: 'Maestro de armas',
            startX: 5,
            startY: -18,
          },
          body: [
            { blockType: 'richText', content: paragraph('Habla con el maestro de armas.') },
            { blockType: 'image', image: image.id, caption: 'El maestro' },
            {
              blockType: 'video',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'Vídeo de la misión',
            },
            { blockType: 'callout', variant: 'warning', content: paragraph('Ojo con el jefe.') },
          ],
          seo: { metaTitle: 'Guía completa', metaDescription: 'Cómo hacer la misión.' },
          originalUrl: 'https://www.torrentearcano.com/aprendizaje-escudero',
        },
        overrideAccess: false,
        user: editor,
      })

      const readBack = await payload.findByID({
        collection: 'quest-guides',
        id: created.id,
        depth: 1,
        overrideAccess: false,
      })
      expect(readBack.quests).toEqual([expect.objectContaining({ id: quest.id })])
      expect(readBack.summary).toMatchObject({
        needs: { notes: '10 Alas de Tofu' },
        startX: 5,
        startY: -18,
      })
      expect(readBack.body?.map((block) => block.blockType)).toEqual([
        'richText',
        'image',
        'video',
        'callout',
      ])
      expect(readBack.body?.[1]).toMatchObject({
        image: expect.objectContaining({ id: image.id, alt: 'Mapa de Astrub' }),
        caption: 'El maestro',
      })
      expect(readBack.body?.[2]).toMatchObject({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      expect(readBack.body?.[3]).toMatchObject({ variant: 'warning' })
      expect(readBack.seo?.metaDescription).toBe('Cómo hacer la misión.')
    })
  })
})
