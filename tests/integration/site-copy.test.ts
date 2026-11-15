import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { indexTextDefaults, siteSettingsDefaults } from '@/lib/site-copy/defaults'
import { readIndexTexts, readSiteSettings } from '@/lib/site-copy/queries'
import { seedReport, seedSiteCopy } from '@/lib/site-copy/seed'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// «Ajustes del sitio» y «Portada e índices»: cualquiera los lee, solo el panel los cambia, la
// web pone el texto de siempre donde Torre no escribió nada y pnpm seed:site-copy llena lo
// vacío con ese texto sin tocar lo que escribió.

let payload: Payload
let editor: User

/** Deja los dos globales en blanco, como si nadie los hubiera guardado. */
async function blank() {
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      name: '',
      description: '',
      ogImage: null,
      footer: { bio: '', disclaimer: '' },
      socials: { twitch: { url: '', handle: '' } },
    },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'index-texts',
    data: { home: { title: '', tour: { step1: { title: '' } } }, metalogros: { lead: '' } },
    overrideAccess: true,
  })
}

beforeAll(async () => {
  payload = await startPayload()
  editor = await createPanelUser(payload, 'editor')
})

afterAll(blank)

describe('acceso', () => {
  it('un visitante los lee y no los cambia; una cuenta del panel, sí', async () => {
    for (const slug of ['site-settings', 'index-texts'] as const) {
      await expect(payload.findGlobal({ slug, overrideAccess: false })).resolves.toBeTruthy()
      await expect(
        payload.updateGlobal({ slug, data: {}, overrideAccess: false }),
      ).rejects.toThrow()
    }
    const saved = await payload.updateGlobal({
      slug: 'site-settings',
      data: { name: 'Torre Arcana' },
      user: editor,
      overrideAccess: false,
    })
    expect(saved.name).toBe('Torre Arcana')
  })

  it('un enlace de red que no es una dirección web no se guarda', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'site-settings',
        data: { socials: { kick: { url: 'javascript:alert(1)' } } },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/Enlace/)
  })
})

describe('lo que lee la web', () => {
  beforeAll(blank)

  it('en blanco, los textos de siempre', async () => {
    const settings = await readSiteSettings(payload)
    expect(settings.name).toBe(siteSettingsDefaults.name)
    expect(settings.socials.twitch).toEqual(siteSettingsDefaults.socials.twitch)
    expect(settings.ogImage).toBeNull()
    const texts = await readIndexTexts(payload)
    expect(texts.home.tour.step1.title).toBe(indexTextDefaults.home.tour.step1.title)
    expect(texts.metalogros.lead).toBe(indexTextDefaults.metalogros.lead)
  })

  it('lo que escribe Torre, con la imagen al compartir poblada', async () => {
    const image = await payload.create({
      collection: 'media',
      data: { alt: 'Torre al compartir' },
      file: tinyPng(),
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { footer: { bio: 'Otra frase.' }, ogImage: image.id },
      user: editor,
      overrideAccess: false,
    })
    await payload.updateGlobal({
      slug: 'index-texts',
      data: { metalogros: { lead: 'Elige un logro.' } },
      user: editor,
      overrideAccess: false,
    })
    const settings = await readSiteSettings(payload)
    expect(settings.footer.bio).toBe('Otra frase.')
    expect(settings.ogImage).toMatchObject({ width: 1, height: 1, alt: 'Torre al compartir' })
    expect(settings.ogImage?.url).toMatch(/\.png$/)
    expect((await readIndexTexts(payload)).metalogros.lead).toBe('Elige un logro.')

    // Mientras sale al compartir, la imagen no se borra.
    await expect(
      payload.delete({ collection: 'media', id: image.id, overrideAccess: true }),
    ).rejects.toThrow(/Ajustes del sitio/)
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { ogImage: null },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'media', id: image.id, overrideAccess: true })
  })
})

describe('pnpm seed:site-copy', () => {
  beforeAll(blank)

  it('en seco dice qué llenaría y no escribe nada', async () => {
    await payload.updateGlobal({
      slug: 'index-texts',
      data: { home: { lead: 'La frase de Torre.' } },
      overrideAccess: true,
    })
    const plans = await seedSiteCopy(payload, { apply: false })
    const settings = plans.find((plan) => plan.global === 'site-settings')!
    expect(settings.fills.map((fill) => fill.path)).toEqual(
      expect.arrayContaining(['name', 'description', 'footer.bio', 'socials.twitch.url']),
    )
    const texts = plans.find((plan) => plan.global === 'index-texts')!
    expect(texts.fills.map((fill) => fill.path)).toContain('home.tour.step1.title')
    expect(texts.fills.map((fill) => fill.path)).not.toContain('home.lead')

    const stored = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    expect(stored.name || '').toBe('')
    const report = seedReport(plans, false).join('\n')
    expect(report).toMatch(/En seco/)
    expect(report).toMatch(/Ajustes del sitio: llenaría \d+ campos? vacíos?/)
  })

  it('con --apply llena lo vacío con el texto de siempre y deja lo de Torre', async () => {
    await seedSiteCopy(payload, { apply: true })
    const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
    expect(settings.name).toBe(siteSettingsDefaults.name)
    expect(settings.footer?.bio).toBe(siteSettingsDefaults.footer.bio)
    expect(settings.socials?.twitch?.url).toBe(siteSettingsDefaults.socials.twitch.url)
    const texts = await payload.findGlobal({ slug: 'index-texts', overrideAccess: true })
    expect(texts.home?.lead).toBe('La frase de Torre.')
    expect(texts.home?.tour?.step1?.title).toBe(indexTextDefaults.home.tour.step1.title)

    // Repetirla no cambia nada.
    const again = await seedSiteCopy(payload, { apply: true })
    expect(again.flatMap((plan) => plan.fills)).toEqual([])
    expect(seedReport(again, true).join('\n')).toMatch(/Ajustes del sitio: nada que llenar/)
  })
})
