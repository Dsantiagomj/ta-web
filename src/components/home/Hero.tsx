import { ArrowIcon, SearchIcon } from '@/components/site/icons'
import { StaticImg } from '@/components/site/StaticImg'
import { Picture } from '@/components/ui/Picture'
import { legacyHref } from '@/lib/site/legacy'

import { KROSMOZ, ORBS, TORRE_ASK } from './art'
import { HERO_SEARCH_ID } from './hero-search-strings'
import { HeroSearch } from './HeroSearch'
import { homeStrings as s } from './strings'

/**
 * El hero de la portada (DESIGN.md, Home): el nombre con lo que es, una frase, y Torre que
 * pregunta qué misión estás haciendo sobre la búsqueda de misiones. A un lado, la isla del
 * Krosmoz con los seis Dofus primordiales, que es la imagen principal en el móvil. Sin
 * JavaScript, la búsqueda va a la de la web de siempre.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="h-hero">
      <div className="home-wrap hero__in">
        <div className="hero__txt">
          <h1 id="h-hero" className="hero__t">
            <span className="hero__eyebrow">{s.eyebrow}</span> {s.title}
          </h1>
          <p className="hero__lead">{s.lead}</p>
          <form
            className="ask"
            role="search"
            aria-label={s.searchForm}
            action={legacyHref('search')}
          >
            <div className="ask__top">
              <span className="ask__torre">
                <Picture
                  image={TORRE_ASK}
                  alt=""
                  sizes="(max-width: 30rem) 104px, (min-width: 90rem) 172px, calc(7vw + 72px)"
                />
              </span>
              <p className="ask__line">
                <span className="ask__who">{s.who}</span>
                <label className="ask__q" htmlFor={HERO_SEARCH_ID}>
                  {s.question}
                </label>
              </p>
            </div>
            <HeroSearch
              icon={<SearchIcon className="ask__icon" />}
              arrow={<ArrowIcon className="ask__arrow" />}
            />
            <p className="sr-only" id={`${HERO_SEARCH_ID}-ayuda`}>
              {s.searchHelp}
            </p>
          </form>
        </div>
        <div className="hero__art" aria-hidden="true">
          {/* La imagen principal en el móvil. Se pinta al 112 % con los bordes difuminados por
              la máscara, así que basta un 85 % del ancho: a 412 px y 1,75x pide la de 640. */}
          <Picture
            image={KROSMOZ}
            alt=""
            priority
            sizes="(min-width: 64rem) 760px, 85vw"
            className="hero__isle"
          />
          {ORBS.map((orb) => (
            <span
              key={orb.slug}
              className="orb"
              style={{ '--x': orb.x, '--y': orb.y, '--bob': orb.delay } as React.CSSProperties}
            >
              {/* Baja prioridad: no compiten con la isla, la imagen principal. */}
              <StaticImg src={orb.src} width={128} height={128} fetchPriority="low" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
