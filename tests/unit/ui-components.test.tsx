import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Button, ButtonLink } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { Figure } from '@/components/ui/Figure'
import { IconButton } from '@/components/ui/IconButton'
import { IMAGE_SIZES } from '@/components/ui/image-sizes'
import { Picture } from '@/components/ui/Picture'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatTile } from '@/components/ui/StatTile'
import { TagPill } from '@/components/ui/TagPill'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const image = { src: '/img/a.webp', avif: '/img/a.avif', width: 96, height: 64 }
const responsive = {
  src: '/img/b-800.webp',
  avif: '/img/b-800.avif',
  width: 800,
  height: 400,
  srcSet: [
    { src: '/img/b-480.webp', width: 480 },
    { src: '/img/b-800.webp', width: 800 },
  ],
  avifSrcSet: [
    { src: '/img/b-480.avif', width: 480 },
    { src: '/img/b-800.avif', width: 800 },
  ],
}

describe('Button', () => {
  it('es un <button type="button"> con la variante en un atributo', () => {
    const markup = html(<Button>Entrar</Button>)
    expect(markup).toMatch(/^<button type="button"[^>]*data-variant="primary"/)
    expect(markup).toContain('>Entrar</')
  })

  it('apagado lleva disabled y no se puede pulsar', () => {
    expect(html(<Button disabled>Entrar</Button>)).toContain('disabled=""')
  })

  it('como enlace es un <a> con la misma pinta', () => {
    const markup = html(
      <ButtonLink href="/entrar" variant="secondary">
        Entrar
      </ButtonLink>,
    )
    expect(markup).toMatch(/^<a [^>]*href="\/entrar"/)
    expect(markup).toContain('data-variant="secondary"')
  })
})

describe('IconButton', () => {
  it('lleva el nombre accesible que se le da', () => {
    const markup = html(<IconButton label="Buscar" icon={<svg />} />)
    expect(markup).toContain('aria-label="Buscar"')
    expect(markup).toContain('type="button"')
  })
})

describe('Callout', () => {
  it('es una nota con el título por defecto de su tipo', () => {
    expect(html(<Callout variant="tip">Texto</Callout>)).toMatch(/role="note".*Consejo/)
    expect(html(<Callout variant="warning">Texto</Callout>)).toContain('Importante')
    expect(html(<Callout variant="stop">Texto</Callout>)).toContain('Alto')
  })

  it('acepta un título propio', () => {
    const markup = html(
      <Callout variant="warning" title="Ojo">
        Las anutrof no deben morir.
      </Callout>,
    )
    expect(markup).toContain('Ojo')
    expect(markup).not.toContain('Importante')
    expect(markup).toContain('Las anutrof no deben morir.')
  })
})

describe('StatTile', () => {
  it('pinta la cifra con los miles sin partir y su etiqueta', () => {
    const markup = html(<StatTile value={16380} label="XP" />)
    expect(markup).toContain('16 380')
    expect(markup).toContain('XP')
  })
})

describe('ProgressBar', () => {
  it('expone el progreso a los lectores de pantalla y el porcentaje al lado', () => {
    const markup = html(<ProgressBar value={3} max={8} label="Etapas hechas" />)
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="3"')
    expect(markup).toContain('aria-valuemax="8"')
    expect(markup).toContain('aria-label="Etapas hechas"')
    expect(markup).toContain('38%')
    // La barra se llena con transform en el CSS, nunca con width: el componente solo
    // le pasa la proporción.
    expect(markup).toContain('style="--ratio:0.375"')
    expect(markup).not.toContain('transform:')
  })

  it('no pasa del 100 % ni baja de 0', () => {
    expect(html(<ProgressBar value={12} max={8} label="x" />)).toContain('100%')
    expect(html(<ProgressBar value={-1} max={8} label="x" />)).toContain('0%')
  })
})

describe('Checkbox', () => {
  it('es una casilla nativa dentro de su etiqueta', () => {
    const markup = html(<Checkbox label="Ocultar hechas" defaultChecked />)
    expect(markup).toMatch(/^<label[^>]*><input type="checkbox"[^>]*checked=""/)
    expect(markup).toContain('Ocultar hechas')
  })
})

describe('Card', () => {
  it('es un panel, o un único enlace si tiene href', () => {
    expect(html(<Card>Hola</Card>)).toMatch(/^<div /)
    const link = html(<Card href="/el-cazador-cazado">Hola</Card>)
    expect(link).toMatch(/^<a [^>]*href="\/el-cazador-cazado"/)
    expect(link.match(/<a /g)).toHaveLength(1)
  })
})

describe('Chip y TagPill', () => {
  it('el chip es texto; la etiqueta puede ser un enlace', () => {
    expect(html(<Chip>Diaria</Chip>)).toMatch(/^<span [^>]*>Diaria<\/span>$/)
    expect(html(<TagPill>Astrub</TagPill>)).toMatch(/^<span /)
    expect(html(<TagPill href="/astrub">Astrub</TagPill>)).toMatch(/^<a [^>]*href="\/astrub"/)
  })
})

describe('Picture', () => {
  it('ofrece AVIF y WebP con tamaño explícito y carga diferida por defecto', () => {
    const markup = html(<Picture image={image} alt="" />)
    expect(markup).toContain('<source type="image/avif" srcSet="/img/a.avif"/>')
    expect(markup).toMatch(/<img [^>]*src="\/img\/a.webp"/)
    expect(markup).toContain('width="96"')
    expect(markup).toContain('height="64"')
    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain('decoding="async"')
  })

  it('la imagen principal se pide antes y sin carga diferida', () => {
    const markup = html(<Picture image={image} alt="" priority />)
    expect(markup).toContain('fetchPriority="high"')
    expect(markup).not.toContain('loading="lazy"')
  })

  it('con varios anchos, srcset con descriptores w en AVIF y en WebP, y sizes en los dos', () => {
    const markup = html(<Picture image={responsive} alt="" sizes="100vw" />)
    expect(markup).toContain(
      '<source type="image/avif" srcSet="/img/b-480.avif 480w, /img/b-800.avif 800w" sizes="100vw"/>',
    )
    expect(markup).toMatch(
      /<img [^>]*srcSet="\/img\/b-480\.webp 480w, \/img\/b-800\.webp 800w"[^>]*sizes="100vw"/,
    )
    // El tamaño explícito es el del archivo principal: reserva su sitio (sin CLS).
    expect(markup).toMatch(/<img [^>]*src="\/img\/b-800\.webp"[^>]*width="800"[^>]*height="400"/)
  })

  it('con un solo ancho no escribe srcset ni sizes', () => {
    const markup = html(<Picture image={image} alt="" sizes="100vw" />)
    expect(markup).not.toMatch(/srcSet="[^"]* \d+w/)
    expect(markup).not.toContain('sizes=')
  })
})

describe('Figure', () => {
  it('pone el pie de foto si lo hay', () => {
    const withCaption = html(<Figure image={image} alt="Hupe Esse" caption="En la biblioteca." />)
    expect(withCaption).toContain('alt="Hupe Esse"')
    expect(withCaption).toContain('<figcaption')
    expect(html(<Figure image={image} alt="Hupe Esse" />)).not.toContain('<figcaption')
  })

  it('sin JavaScript, la imagen es un enlace al archivo más grande, el WebP', () => {
    const markup = html(<Figure image={image} alt="Hupe Esse" />)
    expect(markup).toMatch(/<a [^>]*href="\/img\/a\.webp"/)
    expect(markup).toMatch(/<a [^>]*>\s*<picture/)
  })

  it('con el original guardado, el enlace lleva al original y dice su tamaño a la isla', () => {
    const original = { src: '/img/b.png', width: 1920, height: 1080 }
    const markup = html(<Figure image={{ ...responsive, original }} alt="Hupe Esse" />)
    expect(markup).toMatch(/<a [^>]*href="\/img\/b\.png"/)
    expect(markup).toContain('data-image-width="1920"')
    expect(markup).toContain('data-image-height="1080"')
  })

  it('el enlace dice que abre la imagen a pantalla completa y lleva lo que usa la isla', () => {
    const markup = html(<Figure image={image} alt="Hupe Esse" />)
    expect(markup).toContain('aria-label="Ver imagen a pantalla completa: Hupe Esse"')
    expect(markup).toContain('data-image-viewer=""')
    expect(markup).toContain(`data-image-width="${image.width}"`)
    // El visor abre el original, no el AVIF de la columna.
    expect(markup).not.toContain('data-image-avif')
  })

  it('con varios anchos, el enlace lleva al más grande y la imagen ocupa la columna de lectura', () => {
    const markup = html(<Figure image={responsive} alt="Hupe Esse" />)
    expect(markup).toMatch(/<a [^>]*href="\/img\/b-800\.webp"/)
    expect(markup).toContain(`sizes="${IMAGE_SIZES.prose}"`)
  })

  it('en la rejilla de un paso, la imagen dice que ocupa media columna', () => {
    const markup = html(<Figure image={responsive} alt="Hupe Esse" sizes={IMAGE_SIZES.half} />)
    expect(markup).toContain(`sizes="${IMAGE_SIZES.half}"`)
  })

  it('diferida por defecto; con priority, la posible LCP, sin diferir y con prioridad alta', () => {
    expect(html(<Figure image={image} alt="Hupe Esse" />)).toContain('loading="lazy"')
    const first = html(<Figure image={image} alt="Hupe Esse" priority />)
    expect(first).not.toContain('loading="lazy"')
    expect(first).toContain('fetchPriority="high"')
  })

  it('sin texto alternativo, el nombre del enlace sigue diciendo qué hace', () => {
    const markup = html(<Figure image={{ src: '/img/b.webp', width: 10, height: 10 }} alt="" />)
    expect(markup).toContain('aria-label="Ver imagen a pantalla completa"')
  })
})

// DESIGN.md, Accessibility: objetivo de 40px (44px con puntero grueso). Lo que se dibuja más
// pequeño agranda el área que se pulsa con la clase hit-target.
describe('Objetivos táctiles', () => {
  it('todo botón, la etiqueta enlazada y la casilla agrandan su objetivo', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      expect(html(<Button variant={variant}>Entrar</Button>)).toMatch(/class="[^"]*\bhit-target\b/)
    }
    expect(html(<ButtonLink href="/a">Entrar</ButtonLink>)).toMatch(/class="[^"]*\bhit-target\b/)
    expect(html(<TagPill href="/a">Frigost</TagPill>)).toMatch(/class="[^"]*\bhit-target\b/)
    expect(html(<Checkbox label="Hecha" />)).toMatch(/^<label class="[^"]*\bhit-target\b/)
  })

  it('la etiqueta sin enlace no es un objetivo', () => {
    expect(html(<TagPill>Frigost</TagPill>)).not.toContain('hit-target')
  })
})
