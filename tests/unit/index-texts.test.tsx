import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MetalogrosIndex } from '@/components/achievement/MetalogrosIndex'
import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import { DofusIndex } from '@/components/dofus/DofusIndex'
import { indexMetadata, siteMetadata } from '@/lib/site-copy/metadata'
import { resolveIndexTexts, resolveSiteSettings } from '@/lib/site-copy/resolve'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const view = { stats: '', sections: [], search: { zones: [], achievements: [], quests: [] } }

// Los índices con los textos de «Portada e índices» (src/globals/IndexTexts.ts).
describe('los índices con los textos de Torre', () => {
  const texts = resolveIndexTexts({
    metalogros: { title: 'Los logros', lead: 'Elige uno.' },
    dofusGuides: { eyebrow: 'Huevos', title: 'Los Dofus' },
    checklists: { eyebrow: 'Paso a paso', title: 'Listas', lead: 'Marca.', empty: 'Nada aún.' },
  })

  it('/metalogros', () => {
    const markup = html(<MetalogrosIndex view={view as never} texts={texts.metalogros} />)
    expect(markup).toContain('<h1 class="idx__t">Los logros</h1>')
    expect(markup).toContain('<p class="idx__lead">Elige uno.</p>')
  })

  it('/guias-dofus', () => {
    const markup = html(
      <DofusIndex view={{ cards: [], filters: [] }} intro={null} texts={texts.dofusGuides} />,
    )
    expect(markup).toContain('<p class="dg-eyebrow">Huevos</p>')
    expect(markup).toContain('<h1 class="dg-h1">Los Dofus</h1>')
  })

  it('/checklists, también el aviso sin checklists', () => {
    const markup = html(<ChecklistsIndex entries={[]} teaser={null} texts={texts.checklists} />)
    expect(markup).toContain('<p class="ck-eyebrow">Paso a paso</p>')
    expect(markup).toContain('<h1 class="ck-h1">Listas</h1>')
    expect(markup).toContain('<p class="ck-lead">Marca.</p>')
    expect(markup).toContain('<p class="ck-empty">Nada aún.</p>')
  })

  it('sin textos guardados, los de siempre', () => {
    const plain = resolveIndexTexts(null)
    expect(html(<MetalogrosIndex view={view as never} texts={plain.metalogros} />)).toBe(
      html(<MetalogrosIndex view={view as never} />),
    )
    expect(html(<ChecklistsIndex entries={[]} teaser={null} texts={plain.checklists} />)).toBe(
      html(<ChecklistsIndex entries={[]} teaser={null} />),
    )
  })
})

describe('los metadatos', () => {
  const plain = resolveSiteSettings(null)
  const withImage = resolveSiteSettings({
    name: 'Torre Arcana',
    description: 'Otra descripción.',
    ogImage: { url: '/api/media/file/compartir.png', width: 1200, height: 630, alt: 'Torre' },
  })

  const brandCard = {
    url: '/og',
    width: 1200,
    height: 630,
    alt: 'Torrente Arcano',
    type: 'image/png',
  }
  const torreImage = {
    url: '/api/media/file/compartir.png',
    width: 1200,
    height: 630,
    alt: 'Torre',
  }

  it('los del sitio: el nombre, la descripción y la imagen de Torre o la tarjeta de la marca', () => {
    expect(siteMetadata(plain)).toMatchObject({
      title: 'Torrente Arcano',
      description: 'Guías de misiones, logros, clases y checklists de Dofus.',
      openGraph: { siteName: 'Torrente Arcano', locale: 'es_ES', images: [brandCard] },
      twitter: { card: 'summary_large_image', images: [brandCard] },
    })
    expect(siteMetadata(withImage)).toMatchObject({
      title: 'Torre Arcana',
      description: 'Otra descripción.',
      openGraph: { siteName: 'Torre Arcana', images: [torreImage] },
      twitter: { card: 'summary_large_image', images: [torreImage] },
    })
  })

  it('los de un índice: su título y su descripción, con el nombre del sitio y su imagen', () => {
    const seo = resolveIndexTexts(null).metalogros.seo
    expect(indexMetadata('/metalogros', seo, withImage)).toEqual({
      title: 'Todos los metalogros de Dofus',
      description: seo.description,
      alternates: { canonical: '/metalogros' },
      openGraph: {
        type: 'website',
        title: 'Todos los metalogros de Dofus',
        description: seo.description,
        url: '/metalogros',
        siteName: 'Torre Arcana',
        locale: 'es_ES',
        images: [torreImage],
      },
      twitter: { card: 'summary_large_image', images: [torreImage] },
    })
  })
})
