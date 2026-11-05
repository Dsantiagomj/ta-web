import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Button, ButtonLink } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Chip } from '@/components/ui/Chip'
import { Figure } from '@/components/ui/Figure'
import { IconButton } from '@/components/ui/IconButton'
import { Picture } from '@/components/ui/Picture'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatTile } from '@/components/ui/StatTile'
import { TagPill } from '@/components/ui/TagPill'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const image = { src: '/img/a.webp', avif: '/img/a.avif', width: 96, height: 64 }

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
    // La barra se llena con transform, nunca con width.
    expect(markup).toContain('transform:scaleX(0.375)')
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
})

describe('Figure', () => {
  it('pone el pie de foto si lo hay', () => {
    const withCaption = html(<Figure image={image} alt="Hupe Esse" caption="En la biblioteca." />)
    expect(withCaption).toContain('alt="Hupe Esse"')
    expect(withCaption).toContain('<figcaption')
    expect(html(<Figure image={image} alt="Hupe Esse" />)).not.toContain('<figcaption')
  })
})
