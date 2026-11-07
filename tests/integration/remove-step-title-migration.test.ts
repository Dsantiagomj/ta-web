import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '@/migrations/20261107_143215_remove_step_title'
import type { QuestGuide } from '@/payload-types'

import { createHtmlToLexical } from '../../scripts/import/rich-text'
import { stepTitleBlock } from '../../scripts/import/squarespace/to-quest-guide'
import { startPayload } from './payload'

const SLUG = 'safari-almas-migracion'

const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: null,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: null,
        textFormat: 0,
        textStyle: '',
        children: [
          { type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 },
        ],
      },
    ],
  },
})

type Body = NonNullable<QuestGuide['body']>
type Step = Extract<Body[number], { blockType: 'step' }>

const stepsOf = (body: Body | null | undefined) =>
  (body ?? []).filter((block): block is Step => block.blockType === 'step')

// La migración que quita el título del bloque Paso no lo pierde: cada título no vacío pasa
// a ser el primer bloque de texto del paso, en negrita, como lo deja hoy el importador, en
// la guía y en sus versiones, y los bloques que ya tenía el paso bajan un puesto. Se llaman
// down y up de esta migración sobre la base de pruebas, ya migrada del todo.
describe('migración que quita el título del paso', () => {
  let payload: Payload

  async function cleanUp() {
    await payload.delete({ collection: 'quest-guides', where: { slug: { equals: SLUG } } })
  }

  beforeAll(async () => {
    payload = await startPayload()
    await cleanUp()
  })

  afterAll(async () => {
    await cleanUp()
    await payload.destroy()
  })

  it('cada título pasa al principio de su paso en negrita y los bloques del paso bajan un puesto', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'El safari de las almas',
        slug: SLUG,
        body: [
          { blockType: 'richText', content: richText('La misión la agarras de Nevark.') },
          {
            blockType: 'step',
            x: -47,
            y: 42,
            body: [
              { blockType: 'richText', content: richText('Captura las almas.') },
              { blockType: 'callout', variant: 'tip', content: richText('Lleva piedras.') },
              { blockType: 'video', url: 'https://www.youtube.com/watch?v=VaY3tyYTq4A' },
            ],
          },
          { blockType: 'step', body: [] },
          {
            blockType: 'step',
            body: [{ blockType: 'richText', content: richText('Sin título.') }],
          },
        ],
      },
      draft: true,
    })
    const db = (payload.db as unknown as PostgresAdapter).drizzle
    const args = { db, payload, req: {} as PayloadRequest }
    const versionIds = sql`select id from _quest_guides_v where parent_id = ${guide.id}`
    // Los títulos de antes, por paso en orden: el segundo tiene caracteres de HTML y el
    // tercero solo espacios, que no son un título.
    const titles = ['El safari de las almas ancebas', 'Almas <raras> & jaras', '   ']

    let reverted = false
    try {
      await down(args)
      reverted = true
      await db.execute(
        sql`insert into quest_guides_blocks_step_locales (title, _locale, _parent_id)
            select (${JSON.stringify(titles)}::jsonb ->> (_order - 2)), 'es', id
            from quest_guides_blocks_step where _parent_id = ${guide.id} and _order <= 4`,
      )
      await db.execute(
        sql`insert into _quest_guides_v_blocks_step_locales (title, _locale, _parent_id)
            select (${JSON.stringify(titles)}::jsonb ->> (_order - 2)), 'es', id
            from _quest_guides_v_blocks_step where _parent_id in (${versionIds})`,
      )
    } finally {
      if (reverted) await up(args)
    }

    const toLexical = await createHtmlToLexical(payload.config)
    const bold = (title: string) => {
      const block = stepTitleBlock(title)
      if (block.blockType !== 'richText') throw new Error('el título no es texto')
      return toLexical(block.html)
    }
    const expectMoved = (body: Body | null | undefined) => {
      const [first, second, third] = stepsOf(body)
      expect(first?.body?.map((block) => block.blockType)).toEqual([
        'richText',
        'richText',
        'callout',
        'video',
      ])
      // El mismo Lexical que da el importador con una marca «ETAPA n:».
      expect(first?.body?.[0]).toMatchObject({ content: bold('El safari de las almas ancebas') })
      expect(first?.body?.[1]).toMatchObject({ content: richText('Captura las almas.') })
      expect(first).toMatchObject({ x: -47, y: 42 })
      expect(second?.body).toEqual([
        expect.objectContaining({ blockType: 'richText', content: bold('Almas <raras> & jaras') }),
      ])
      expect(third?.body).toEqual([
        expect.objectContaining({ blockType: 'richText', content: richText('Sin título.') }),
      ])
      for (const step of stepsOf(body)) expect(step).not.toHaveProperty('title')
      expect(body?.[0]).toMatchObject({ blockType: 'richText' })
    }

    const migrated = await payload.findByID({
      collection: 'quest-guides',
      id: guide.id,
      depth: 0,
      draft: true,
    })
    expectMoved(migrated.body)
    const versions = await payload.findVersions({
      collection: 'quest-guides',
      where: { parent: { equals: guide.id } },
      depth: 0,
    })
    expect(versions.docs).not.toHaveLength(0)
    for (const version of versions.docs) expectMoved(version.version.body)
    // El bloque nuevo tiene el mismo ID en la guía y en su versión, como uno guardado
    const newId = stepsOf(migrated.body)[0]?.body?.[0]?.id
    expect(newId).toMatch(/^[0-9a-f]{24}$/)
    expect(stepsOf(versions.docs[0]!.version.body)[0]?.body?.[0]?.id).toBe(newId)

    // Los órdenes del primer paso en las tablas de cada tipo de bloque: el título es el 1
    const orders = async (table: string, parent: ReturnType<typeof sql>, path: string) => {
      const { rows } = await db.execute(
        sql`select _order from ${sql.identifier(table)}
            where _parent_id in (${parent}) and _path = ${path} order by _order`,
      )
      return rows.map((row) => row._order)
    }
    expect(await orders('quest_guides_blocks_rich_text', sql`${guide.id}`, 'body.1.body')).toEqual([
      1, 2,
    ])
    expect(await orders('quest_guides_blocks_callout', sql`${guide.id}`, 'body.1.body')).toEqual([
      3,
    ])
    expect(await orders('quest_guides_blocks_video', sql`${guide.id}`, 'body.1.body')).toEqual([4])
    expect(
      await orders('_quest_guides_v_blocks_callout', versionIds, 'version.body.1.body'),
    ).toEqual(versions.docs.map(() => 3))

    // El paso se sigue guardando desde el panel con su contenido nuevo
    const saved = await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { body: migrated.body },
      depth: 0,
      draft: true,
    })
    expectMoved(saved.body)
  })
})
