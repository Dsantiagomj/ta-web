import config from '@payload-config'
import { readFileSync } from 'node:fs'
import type {
  ArrayField,
  CollapsibleField,
  CollectionConfig,
  Field,
  GlobalConfig,
  GroupField,
  SanitizedConfig,
} from 'payload'
import { toWords } from 'payload/shared'
import { beforeAll, describe, expect, it } from 'vitest'

import { layoutFields } from './helpers/fields'

import { AchievementGroups } from '@/collections/AchievementGroups'
import { AchievementPages } from '@/collections/AchievementPages'
import { Checklists } from '@/collections/Checklists'
import { DofusGuides } from '@/collections/DofusGuides'
import { Media } from '@/collections/Media'
import { QuestGuides } from '@/collections/QuestGuides'
import { Users } from '@/collections/Users'
import { DofusGuidesIndex } from '@/globals/DofusGuidesIndex'
import { panelStrings } from '@/lib/admin/strings'

// El panel para Torre, ola 1 (docs/research/backlog.md, A-01 a A-12): textos, orden y
// ajustes del panel, sin cambiar quién puede hacer qué.

let sanitized: SanitizedConfig
beforeAll(async () => {
  sanitized = await config
})

type Admin = Record<string, unknown> & { components?: Record<string, unknown> }
const adminOf = (target: { admin?: unknown }) => (target.admin ?? {}) as Admin

function field(fields: Field[], name: string): Field {
  const found = layoutFields(fields).find(
    (candidate) => 'name' in candidate && candidate.name === name,
  )
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

/** Cada campo, a cualquier profundidad, con su ruta: arrays, grupos, bloques, pestañas. */
function walk(fields: Field[], trail: string): { path: string; field: Field }[] {
  return fields.flatMap((candidate) => {
    const path = 'name' in candidate ? `${trail}.${candidate.name}` : trail
    const here = [{ path, field: candidate }]
    if ('fields' in candidate && Array.isArray(candidate.fields)) {
      return [...here, ...walk(candidate.fields, path)]
    }
    if (candidate.type === 'blocks') {
      const blocks = candidate.blocks ?? []
      return [...here, ...blocks.flatMap((block) => walk(block.fields, `${path}.${block.slug}`))]
    }
    if (candidate.type === 'tabs') {
      return [...here, ...candidate.tabs.flatMap((tab) => walk(tab.fields, path))]
    }
    return here
  })
}

const EDITORIAL = ['quest-guides', 'achievement-pages', 'achievement-groups', 'dofus-guides']
const GAME_DATA = [
  'quests',
  'items',
  'monsters',
  'dungeons',
  'npcs',
  'subareas',
  'achievement-categories',
  'achievements',
]

describe('A-03: el orden del menú', () => {
  /** Los grupos del menú como los arma Payload: en el orden en que aparecen. */
  function navGroups(): { label: string; slugs: string[] }[] {
    const entities: (CollectionConfig | GlobalConfig)[] = [
      ...sanitized.collections,
      ...sanitized.globals,
    ]
    const groups: { label: string; slugs: string[] }[] = []
    for (const entity of entities) {
      const label = adminOf(entity).group as string | undefined
      if (!label) continue
      let group = groups.find((candidate) => candidate.label === label)
      if (!group) groups.push((group = { label, slugs: [] }))
      group.slugs.push(entity.slug)
    }
    return groups
  }

  it('primero el contenido de Torre, luego las imágenes, los datos del juego y los ajustes', () => {
    expect(navGroups().map((group) => group.label)).toEqual([
      'Contenido',
      'Imágenes',
      'Datos del juego (solo lectura)',
      'Ajustes',
    ])
  })

  it('el contenido va en el orden de trabajo de Torre, con el índice de Dofus al final', () => {
    expect(navGroups()[0]?.slugs).toEqual([...EDITORIAL, 'checklists', 'dofus-guides-index'])
  })

  it('los datos del juego, de solo lectura, van juntos', () => {
    expect(navGroups()[2]?.slugs.sort()).toEqual([...GAME_DATA].sort())
  })

  it('ninguna colección se queda sin grupo («Colecciones» no dice nada)', () => {
    const loose = sanitized.collections.filter(
      (collection) => !collection.slug.startsWith('payload-') && !adminOf(collection).group,
    )
    expect(loose.map((collection) => collection.slug)).toEqual([])
  })

  it('las cuentas del panel van en Ajustes, con su nombre y sus permisos', () => {
    expect(adminOf(Users).group).toBe('Ajustes')
    expect(field(Users.fields, 'name')).toMatchObject({ type: 'text', label: 'Nombre' })
    // A-15: administrador o editor; una cuenta nueva es editora.
    expect(field(Users.fields, 'role')).toMatchObject({
      type: 'select',
      label: 'Permisos',
      defaultValue: 'editor',
      options: [
        { value: 'admin', label: 'Administrador' },
        { value: 'editor', label: 'Editor' },
      ],
    })
    expect(adminOf(Users).defaultColumns).toEqual(['name', 'email', 'role', 'updatedAt'])
  })
})

describe('A-04: sin la pestaña API', () => {
  it('ninguna colección ni global enseña la pestaña API', () => {
    const entities = [...sanitized.collections, ...sanitized.globals].filter(
      (entity) => !entity.slug.startsWith('payload-'),
    )
    const withApi = entities.filter((entity) => adminOf(entity).hideAPIURL !== true)
    expect(withApi.map((entity) => entity.slug)).toEqual([])
  })
})

describe('A-04: el selector de idioma, oculto solo con un idioma', () => {
  it('la regla de custom.scss que lo oculta no sobrevive a un segundo idioma', () => {
    const scss = readFileSync('src/app/(payload)/custom.scss', 'utf8')
    const hidesLocale = /\.localizer\b[^{]*\{[^}]*display:\s*none/.test(scss)
    const locales = sanitized.localization ? sanitized.localization.locales.length : 1
    // Si falla: con un segundo idioma, quita de custom.scss la regla de .localizer y de
    // .field-label .localized, o Torre no podrá cambiar de idioma.
    expect(hidesLocale && locales > 1).toBe(false)
    expect(hidesLocale).toBe(locales === 1)
  })
})

describe('A-02: fechas, editor y listas', () => {
  it('las fechas se leen en español y con reloj de 24 horas', () => {
    expect(sanitized.admin.dateFormat).toBe("d 'de' MMMM 'de' yyyy, HH:mm")
  })

  it('el editor vacío habla de tú y sin jerga', () => {
    const editor = sanitized.editor as unknown as {
      FieldComponent?: { clientProps?: { admin?: { placeholder?: string } } }
    }
    expect(JSON.stringify(editor.FieldComponent)).toContain(panelStrings.editorPlaceholder)
    expect(panelStrings.editorPlaceholder).not.toMatch(/comandos|presione|comience/i)
  })

  it('el editor de la prosa de los logros, el del vídeo, también habla de tú', () => {
    // Al sanear la configuración, Payload cambia el editor del campo por el ya construido.
    for (const name of ['intro', 'outro']) {
      const prose = field(AchievementPages.fields, name) as {
        editor?: { FieldComponent?: unknown; features?: unknown }
      }
      expect(JSON.stringify(prose.editor?.FieldComponent), name).toContain(
        panelStrings.editorPlaceholder,
      )
    }
  })

  it('cada lista y cada grupo de bloques dice qué añade («Añadir Paso», no «Añadir Item»)', () => {
    const missing = sanitized.collections
      .filter((collection) => !collection.slug.startsWith('payload-'))
      .flatMap((collection) => walk(collection.fields, collection.slug))
      .filter(({ field: candidate }) => candidate.type === 'array' || candidate.type === 'blocks')
      // Las sesiones de las cuentas son de Payload y no salen en el panel.
      .filter(({ field: candidate }) => !adminOf(candidate).hidden && !adminOf(candidate).disabled)
      .filter(({ field: candidate }) => {
        const labels = (candidate as { labels?: { singular?: unknown } }).labels
        // Payload pone «Item» si falta; con labels propios, el singular es nuestro.
        return !labels?.singular || labels.singular === 'Item'
      })
      .map(({ path }) => path)
    expect(missing).toEqual([])
  })
})

describe('A-01: un solo «Estado»', () => {
  it('Payload dice si lo guardado está en la web, con palabras claras', () => {
    const es = sanitized.i18n.translations.es as unknown as {
      version: Record<string, string>
    }
    expect(es.version.status).toBe('Estado')
    expect(es.version.published).toBe('Publicado en la web')
    expect(es.version.draft).toBe('Borrador, sin publicar')
    expect(es.version.changed).toBe('Con cambios sin publicar')
  })

  it('el campo de Torre ya no se llama «Estado», y recuerda publicar los cambios', () => {
    for (const collection of [AchievementPages, AchievementGroups, DofusGuides, Checklists]) {
      const state = field(collection.fields, 'state')
      expect(state, collection.slug).toMatchObject({ label: 'Visible en la web' })
      expect(adminOf(state).description, collection.slug).toContain('Publicar cambios')
    }
  })

  it('las palabras de Payload hablan de tú', () => {
    const es = sanitized.i18n.translations.es as unknown as {
      version: Record<string, string>
    }
    const words = Object.values(panelStrings.translations.version).join(' ')
    expect(words).not.toMatch(/\b(desea|está a punto)\b/i)
    expect(es.version.aboutToUnpublish).toBe(panelStrings.translations.version.aboutToUnpublish)
  })
})

describe('A-05: el formulario de subir imágenes', () => {
  it('el texto alternativo explica qué escribir, con un ejemplo', () => {
    expect(adminOf(field(Media.fields, 'alt')).description).toMatch(/Describe lo que se ve/)
  })

  it('el arte del juego y la dirección en Squarespace solo salen si tienen valor', () => {
    for (const name of ['gameAsset', 'originalUrl']) {
      const condition = adminOf(field(Media.fields, name)).condition as (data: unknown) => boolean
      expect(condition({}), name).toBe(false)
      expect(condition({ [name]: 'algo' }), name).toBe(true)
      expect(adminOf(field(Media.fields, name)).readOnly, name).toBe(true)
    }
  })

  it('la lista busca por texto alternativo y nombre de archivo, y va en Imágenes', () => {
    expect(adminOf(Media)).toMatchObject({
      group: 'Imágenes',
      listSearchableFields: ['alt', 'filename'],
      defaultColumns: ['filename', 'alt', 'updatedAt'],
    })
  })
})

describe('A-06: buscar en las listas y sus columnas', () => {
  it('cada lista busca también por la dirección y, en los Dofus, por sus otros nombres', () => {
    expect(adminOf(QuestGuides).listSearchableFields).toEqual(['title', 'slug'])
    expect(adminOf(DofusGuides).listSearchableFields).toEqual(['name', 'slug', 'aliases'])
    for (const collection of [AchievementPages, AchievementGroups, Checklists]) {
      expect(adminOf(collection).listSearchableFields, collection.slug).toEqual(['name', 'slug'])
    }
  })

  it('ninguna lista enseña la columna de la dirección, y todas el estado de Payload', () => {
    for (const collection of [
      QuestGuides,
      AchievementPages,
      AchievementGroups,
      DofusGuides,
      Checklists,
    ]) {
      const columns = adminOf(collection).defaultColumns as string[]
      expect(columns, collection.slug).not.toContain('slug')
      expect(columns, collection.slug).toContain('_status')
    }
  })
})

describe('A-07: «Dirección en la web»', () => {
  it('el campo slug se llama «Dirección en la web» y enseña la dirección completa', () => {
    for (const collection of [
      QuestGuides,
      AchievementPages,
      AchievementGroups,
      DofusGuides,
      Checklists,
    ]) {
      const slug = field(collection.fields, 'slug')
      expect(slug, collection.slug).toMatchObject({ label: 'Dirección en la web' })
      expect(adminOf(slug).components?.Description, collection.slug).toMatchObject({
        path: '/components/admin/SlugDescription#SlugDescription',
        clientProps: { help: expect.any(String) },
      })
    }
  })

  it('la ayuda de un logro dice lo mismo que su validador: vacía solo con el logro de DofusDB', () => {
    const slug = field(AchievementPages.fields, 'slug')
    const validate = (slug as { validate: (value: string, options: unknown) => true | string })
      .validate
    // Lo que hace el validador.
    expect(validate('', { data: {} })).toBe(panelStrings.slug.required)
    expect(validate('', { data: { achievement: 7 } })).toBe(true)
    // Lo que dice la ayuda: la condición, no un «sale del nombre» sin más.
    const help = (adminOf(slug).components?.Description as { clientProps: { help: string } })
      .clientProps.help
    expect(help).toMatch(/vacía/)
    expect(help).toMatch(/logro de DofusDB/)
  })

  it('la de un metalogro se enseña como su panel del índice, que es donde se abre', () => {
    const slug = field(AchievementGroups.fields, 'slug')
    expect(adminOf(slug).components?.Description).toMatchObject({
      clientProps: { address: 'metalogro' },
    })
  })
})

describe('A-07: ningún campo se llama «Slug»', () => {
  it('ni en los datos del juego, que también salen en el panel', () => {
    const slugs = sanitized.collections
      .flatMap((collection) => walk(collection.fields, collection.slug))
      .filter(({ field: candidate }) => (candidate as { label?: unknown }).label === 'Slug')
      .map(({ path }) => path)
    expect(slugs).toEqual([])
  })
})

describe('cada campo que Torre ve tiene etiqueta propia', () => {
  /** Campos cuya etiqueta española coincide con el nombre en palabras: X, Kamas, Banner… */
  const SAME_IN_SPANISH = new Set(['x', 'y', 'kamas', 'color', 'checklist', 'banner'])

  /** Los campos visibles, a cualquier profundidad: un grupo oculto oculta lo de dentro. */
  function visibleFields(fields: Field[], trail: string): { path: string; field: Field }[] {
    return fields.flatMap((candidate) => {
      const admin = adminOf(candidate)
      // Los campos de la autenticación de Payload van ocultos en el propio campo.
      if (admin.hidden || admin.disabled || (candidate as { hidden?: boolean }).hidden) return []
      const path = 'name' in candidate ? `${trail}.${candidate.name}` : trail
      const nested =
        'fields' in candidate && Array.isArray(candidate.fields)
          ? visibleFields(candidate.fields, path)
          : candidate.type === 'blocks'
            ? (candidate.blocks ?? []).flatMap((block) =>
                visibleFields(block.fields, `${path}.${block.slug}`),
              )
            : []
      return [{ path, field: candidate }, ...nested]
    })
  }

  it('en el contenido de Torre, ninguno sale con el nombre técnico que pondría Payload', () => {
    const content = sanitized.collections.filter((collection) =>
      [...EDITORIAL, 'checklists', 'media', 'users'].includes(collection.slug),
    )
    const unlabelled = content
      .flatMap((collection) => visibleFields(collection.fields, collection.slug))
      .filter(({ field: candidate }) => 'name' in candidate && !candidate.name.startsWith('_'))
      .filter(
        ({ field: candidate }) =>
          !['id', 'createdAt', 'updatedAt'].includes((candidate as { name: string }).name),
      )
      // Sin etiqueta, Payload pone el nombre en palabras («Owned Moves»): eso cuenta como sin.
      // Salvo las palabras que en español se escriben igual que el campo.
      .filter(({ field: candidate }) => {
        const label = (candidate as { label?: unknown }).label
        const name = (candidate as { name: string }).name
        return !label || (label === toWords(name) && !SAME_IN_SPANISH.has(name))
      })
      .map(({ path }) => path)
    expect(unlabelled).toEqual([])
  })

  it('los datos de la migración del progreso antiguo, ownedMoves incluido, no salen', () => {
    const legacy = field(Checklists.fields, 'legacy') as GroupField
    expect(adminOf(legacy).hidden).toBe(true)
    expect(
      layoutFields(legacy.fields).map((candidate) => ('name' in candidate ? candidate.name : null)),
    ).toContain('ownedMoves')
  })
})

describe('A-08: el identificador del paso, apartado', () => {
  const steps = field(Checklists.fields, 'steps') as ArrayField
  // Payload añade a cada fila su `id`, oculto: el último campo que Torre ve es el que cuenta.
  const visible = steps.fields.filter((candidate) => !adminOf(candidate).hidden)
  const last = visible.at(-1) as CollapsibleField

  it('va al final del paso, en «Datos técnicos», cerrado', () => {
    expect(last).toMatchObject({
      type: 'collapsible',
      label: 'Datos técnicos',
      admin: { initCollapsed: true },
    })
    expect(
      layoutFields(last.fields).map((candidate) => ('name' in candidate ? candidate.name : null)),
    ).toContain('stepId')
    expect(visible.slice(0, -1).some((f) => 'name' in f && f.name === 'stepId')).toBe(false)
  })

  it('se puede copiar de un clic, y sigue sin poder escribirse', () => {
    const stepId = field(last.fields, 'stepId')
    expect(adminOf(stepId).readOnly).toBe(true)
    expect(adminOf(stepId).components?.Description).toMatchObject({
      path: '/components/admin/CopyValueDescription#CopyValueDescription',
    })
  })
})

describe('A-09: filas con nombre', () => {
  const steps = field(Checklists.fields, 'steps') as ArrayField
  const rowLabel = (target: Field) => adminOf(target).components?.RowLabel

  it('los pasos, sus tramos y lo que se necesita se llaman por su texto y empiezan cerrados', () => {
    expect(rowLabel(steps)).toMatchObject({ path: expect.stringContaining('#ChecklistStepLabel') })
    expect(adminOf(steps).initCollapsed).toBe(true)
    const segments = field(steps.fields, 'segments')
    expect(rowLabel(segments)).toMatchObject({ path: expect.stringContaining('#SegmentLabel') })
    expect(adminOf(segments).initCollapsed).toBe(true)
    const needs = field(steps.fields, 'needs')
    expect(rowLabel(needs)).toMatchObject({ path: expect.stringContaining('#RelationRowLabel') })
    expect(adminOf(needs).initCollapsed).toBe(true)
    expect(rowLabel(field(steps.fields, 'achievements'))).toMatchObject({
      clientProps: { relationField: 'achievement', relationTo: 'achievements' },
    })
    expect(rowLabel(field(steps.fields, 'quests'))).toMatchObject({
      path: expect.stringContaining('#RelationRowLabel'),
      clientProps: { relationField: 'quest', relationTo: 'quests' },
    })
  })

  it('las misiones de un logro se llaman por su nombre o su misión de DofusDB', () => {
    expect(rowLabel(field(AchievementPages.fields, 'quests'))).toMatchObject({
      path: expect.stringContaining('#RelationRowLabel'),
      clientProps: { textField: 'name', relationField: 'quests', relationTo: 'quests' },
    })
  })

  it('las mazmorras elegidas de una guía se llaman por su nota o su mazmorra', () => {
    const summary = field(QuestGuides.fields, 'summary') as { fields: Field[] }
    const needs = field(summary.fields, 'needs') as { fields: Field[] }
    expect(rowLabel(field(needs.fields, 'dungeons'))).toMatchObject({
      path: expect.stringContaining('#RelationRowLabel'),
      clientProps: { textField: 'note', relationField: 'dungeon', relationTo: 'dungeons' },
    })
  })

  it('los grupos de Necesitarás de una guía de Dofus se llaman por su nombre', () => {
    const needs = field(DofusGuides.fields, 'needs') as { fields: Field[] }
    expect(rowLabel(field(needs.fields, 'groups'))).toMatchObject({
      path: expect.stringContaining('#TextRowLabel'),
      clientProps: { field: 'name' },
    })
  })

  it('las partes de una guía de Dofus empiezan cerradas', () => {
    expect(adminOf(field(DofusGuides.fields, 'parts')).initCollapsed).toBe(true)
  })
})

describe('A-10: la marca en el panel', () => {
  it('el logo, el icono, el título y el icono de la pestaña son los de Torrente Arcano', () => {
    expect(sanitized.admin.meta?.titleSuffix).toBe(' · Torrente Arcano')
    expect(sanitized.admin.meta?.icons).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: '/icon2.svg' })]),
    )
    expect(sanitized.admin.components?.graphics?.Logo).toBe(
      '/components/admin/PanelBrand#PanelLogo',
    )
    expect(sanitized.admin.components?.graphics?.Icon).toBe(
      '/components/admin/PanelBrand#PanelIcon',
    )
    expect(sanitized.admin.components?.beforeLogin).toEqual([
      '/components/admin/PanelBrand#LoginWelcome',
    ])
  })
})

describe('A-12: la dirección antigua, bloqueada', () => {
  it('la dirección en Squarespace no se edita y solo sale si existe', () => {
    for (const collection of [QuestGuides, DofusGuides]) {
      const originalUrl = field(collection.fields, 'originalUrl')
      expect(adminOf(originalUrl).readOnly, collection.slug).toBe(true)
      const condition = adminOf(originalUrl).condition as (data: unknown) => boolean
      expect(condition({}), collection.slug).toBe(false)
      expect(condition({ originalUrl: 'https://www.torrentearcano.com/x' })).toBe(true)
    }
  })
})

describe('el índice de guías de Dofus', () => {
  it('va con el contenido de Torre', () => {
    expect(adminOf(DofusGuidesIndex).group).toBe('Contenido')
  })
})
