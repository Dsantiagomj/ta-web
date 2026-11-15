import {
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type PayloadRequest,
} from 'payload'

import { panelStrings } from '../lib/admin/strings'
import {
  chainEnd,
  redirectProblem,
  SLUG_REDIRECT_COLLECTIONS,
} from '../lib/redirects/slug-redirects'
import { slugRedirectStrings } from '../lib/redirects/strings'
import { isPanelUser } from './editorial-access'
import { revalidateRedirects } from './revalidate-guides'

const s = slugRedirectStrings.admin

/** Todas las filas como from → to, menos la que se está guardando. */
async function otherRows(req: PayloadRequest, ownId?: number | string) {
  const { docs } = await req.payload.find({
    collection: 'redirects',
    where: ownId ? { id: { not_equals: ownId } } : {},
    select: { from: true, to: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return new Map(docs.map((doc) => [doc.from, doc.to]))
}

/** Si algo publicado ya tiene esa dirección: la página gana y la fila no serviría nunca. */
async function livePageWith(req: PayloadRequest, slug: string): Promise<boolean> {
  for (const collection of SLUG_REDIRECT_COLLECTIONS) {
    const { totalDocs } = await req.payload.count({
      collection,
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      overrideAccess: true,
      req,
    })
    if (totalDocs > 0) return true
  }
  return false
}

const fail = (req: PayloadRequest, path: 'from' | 'to', message: string): never => {
  throw new ValidationError({ collection: 'redirects', errors: [{ path, message }], req })
}

/**
 * Valida la fila y acorta su destino: si lleva a una dirección que ya redirige, se guarda
 * con el destino final (A → B y B → C dan A → C). Un bucle se rechaza.
 */
const validateRow: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const from = (data?.from ?? originalDoc?.from)?.trim().toLowerCase()
  const to = (data?.to ?? originalDoc?.to)?.trim().toLowerCase()
  if (!from || !to) return data
  const problem = redirectProblem(from, to)
  if (problem) fail(req, problem.path, problem.message)
  const end = chainEnd(await otherRows(req, originalDoc?.id), from, to)
  if ('loop' in end) fail(req, 'to', s.loop(from, to))
  if (await livePageWith(req, from)) fail(req, 'from', s.livePage(from))
  return { ...data, from, to: 'to' in end ? end.to : to }
}

/** Las filas que llevaban al origen de esta pasan a llevar a su destino: sin cadenas. */
const collapseChains: CollectionAfterChangeHook = async ({ doc, req }) => {
  const { docs } = await req.payload.find({
    collection: 'redirects',
    where: { and: [{ to: { equals: doc.from } }, { id: { not_equals: doc.id } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  for (const row of docs) {
    await req.payload.update({
      collection: 'redirects',
      id: row.id,
      data: { to: doc.to },
      overrideAccess: true,
      req,
    })
  }
  revalidateRedirects()
  return doc
}

// Las direcciones viejas que llevan a la nueva (AGENTS.md, Redirects). Las crea la web al
// publicar una página con otro slug (src/collections/slug-redirects.ts); Torre las ve y las
// cambia aquí. /<origen> responde un 308 a /<destino> solo si no hay nada publicado en
// /<origen>, así que una fila vieja nunca tapa una página.
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Redirección', plural: 'Redirecciones' },
  admin: {
    useAsTitle: 'from',
    group: panelStrings.groups.settings,
    hideAPIURL: true,
    defaultColumns: ['from', 'to', 'auto', 'updatedAt'],
    listSearchableFields: ['from', 'to'],
  },
  access: {
    // Público: es lo que la web hace con una dirección, y la página la lee como visitante.
    read: () => true,
    create: isPanelUser,
    update: isPanelUser,
    delete: isPanelUser,
  },
  hooks: {
    beforeValidate: [validateRow],
    afterChange: [collapseChains],
    afterDelete: [() => revalidateRedirects()],
  },
  fields: [
    {
      name: 'from',
      label: s.fromLabel,
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: s.fromDescription },
    },
    {
      name: 'to',
      label: s.toLabel,
      type: 'text',
      required: true,
      index: true,
      admin: { description: s.toDescription },
    },
    {
      name: 'auto',
      label: s.autoLabel,
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true, description: s.autoDescription },
    },
  ],
}
