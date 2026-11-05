import { useId } from 'react'

import type { ImageAsset } from '@/components/ui/types'

import './game.css'
import { LevelMedallion } from './LevelMedallion'
import { gameStrings } from './strings'

export interface Crumb {
  label: string
  href: string
  icon?: ImageAsset
}

export interface HeroArt {
  image: ImageAsset
  /** Recorte 4:3 para móviles (DESIGN.md, Imagery); sin él, la misma imagen. */
  mobile?: ImageAsset
  /** object-position del recorte, como «50% 38%». */
  position?: string
}

type HeadingLevel = 1 | 2 | 3 | 4

/**
 * Cabecera de la guía (DESIGN.md, Hero header): migas, título, subtítulo y medallón de
 * nivel, sobre el arte de la misión si lo hay. Sin arte, la misma rejilla sobre el fondo.
 */
export function HeroHeader({
  title,
  subtitle,
  level,
  crumbs,
  art,
  headingLevel = 1,
}: {
  title: string
  subtitle?: string
  level?: number
  crumbs: Crumb[]
  art?: HeroArt
  headingLevel?: HeadingLevel
}) {
  const Heading = `h${headingLevel}` as const
  // Único aunque haya varias cabeceras, como en el catálogo.
  const titleId = useId()
  return (
    <section className="hero" aria-labelledby={titleId} data-art={art ? '' : undefined}>
      {art && (
        <picture>
          {art.mobile?.avif && (
            <source media="(max-width: 47.99rem)" type="image/avif" srcSet={art.mobile.avif} />
          )}
          {art.mobile && (
            <source media="(max-width: 47.99rem)" type="image/webp" srcSet={art.mobile.src} />
          )}
          {art.image.avif && <source type="image/avif" srcSet={art.image.avif} />}
          {/* Decorativa: el título dice de qué va. Es la candidata a LCP, sin carga diferida. */}
          <img
            className="hero__art"
            src={art.image.src}
            width={art.image.width}
            height={art.image.height}
            alt=""
            fetchPriority="high"
            decoding="async"
            style={art.position ? { objectPosition: art.position } : undefined}
          />
        </picture>
      )}
      <div className="hero__grid">
        {crumbs.length > 0 && (
          <nav className="hero__crumbs enter" aria-label={gameStrings.breadcrumb}>
            <ol>
              {crumbs.map((crumb) => (
                <li key={crumb.href}>
                  <a href={crumb.href}>
                    {crumb.icon && (
                      // eslint-disable-next-line @next/next/no-img-element -- icono ya convertido
                      <img src={crumb.icon.src} width={20} height={20} alt="" />
                    )}
                    {crumb.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="hero__body">
          <Heading id={titleId} className="hero__title">
            {title}
          </Heading>
          {subtitle && (
            <p
              className="enter text-lg font-medium text-ink-2"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              {subtitle}
            </p>
          )}
        </div>
        {level != null && (
          <div className="hero__medal enter" style={{ '--i': 2 } as React.CSSProperties}>
            <LevelMedallion level={level} />
          </div>
        )}
      </div>
    </section>
  )
}
