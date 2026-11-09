import type { CSSProperties, ReactNode } from 'react'

import { Lockup } from '@/components/brand/Lockup'
import { GAME_ICONS } from '@/components/game/game-icons'
import { ModeToggle } from '@/components/mode-toggle/ModeToggle'
import { Amount } from '@/components/ui/Amount'
import type { Mode } from '@/lib/theme/theme'

import { HeaderIsland } from './HeaderIsland'
import { ArrowIcon, ChevronIcon, CloseIcon, MenuIcon, SearchIcon, SocialIcon } from './icons'
import {
  CHECKLISTS,
  CLASSES,
  DOFUS_FEATURED,
  DOFUS_GUIDES,
  DUNGEONS,
  type GameImage,
  KOFI_URL,
  type Section,
  type SectionKey,
  SOCIALS,
  SECTIONS,
  searchIndex,
  section,
} from './nav'
import { Soon } from './Soon'
import { StaticImg } from './StaticImg'
import { siteShellStrings as s } from './strings'
import './site.css'

export interface SiteCounts {
  /** Guías de misión publicadas. */
  guides: number
  /** Logros distintos de esas guías. */
  achievements: number
}

const p = s.panels
const accent = (sec: Section) => ({ '--color-section': sec.accent }) as CSSProperties

/** Un icono del juego en su hueco, como en el inventario (DESIGN.md, Icon wells). */
export function Well({
  image,
  size,
  className,
}: {
  image: GameImage
  size: number
  className?: string
}) {
  return (
    <span className={`site-well${className ? ` ${className}` : ''}`} aria-hidden="true">
      <StaticImg
        src={image.src}
        width={Math.min(size, image.size)}
        height={Math.min(size, image.size)}
        alt=""
        loading="lazy"
      />
    </span>
  )
}

/** Todos los huevos: los que Torre aún no tiene escritos salen apagados y sin enlace. */
function EggGrid() {
  return (
    <ul className="art-grid art-grid--eggs" role="list">
      {DOFUS_GUIDES.map((dofus) => {
        const egg = <StaticImg src={dofus.image.src} width={44} height={44} alt="" loading="lazy" />
        return (
          <li key={dofus.name}>
            {dofus.preparing ? (
              <span className="egg-soon" aria-disabled="true">
                {egg}
                <span>{dofus.name}</span>
                <span className="sr-only">{s.preparing}</span>
              </span>
            ) : (
              <a href={dofus.href}>
                {egg}
                <span>{dofus.name}</span>
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ChecklistCards({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={compact ? 'chk-mini' : 'chk'} role="list">
      {CHECKLISTS.map((c) => (
        <li key={c.href}>
          <a href={c.href}>
            <StaticImg
              src={c.image!.src}
              width={compact ? 30 : 60}
              height={compact ? 30 : 60}
              alt=""
              loading="lazy"
            />
            <span>
              <span className="chk__t">{c.name}</span>
              <span className="chk__d">{c.description}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function AllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="all-link" href={href}>
      {children}
      <ArrowIcon />
    </a>
  )
}

function Blurb({ parts, value }: { parts: readonly [string, string, ...string[]]; value: string }) {
  return (
    <>
      {parts[0]}
      <b>{value}</b>
      {parts[1]}
    </>
  )
}

function MisionesBody() {
  return (
    <>
      <button type="button" className="scta" data-open-search>
        <SearchIcon />
        <span>
          <span className="scta__t">{p.misionesSearch}</span>
          <span className="scta__d">{p.misionesSearchHint}</span>
        </span>
        <kbd>{s.searchShortcut}</kbd>
      </button>
      <ul className="hub-l" role="list">
        <li>
          <a href={section('misiones').href}>
            <Well image={GAME_ICONS.achievement} size={28} />
            <span>{p.misionesAll}</span>
          </a>
        </li>
      </ul>
    </>
  )
}

function MisionesBlurb({ counts }: { counts: SiteCounts }) {
  const [middle, end] = p.misionesBlurb(counts.guides, counts.achievements)
  return (
    <>
      <b>
        <Amount value={counts.guides} />
      </b>
      {middle}
      <b>
        <Amount value={counts.achievements} />
      </b>
      {end}
    </>
  )
}

function sectionBlurb(key: SectionKey, counts: SiteCounts): ReactNode {
  switch (key) {
    case 'misiones':
      return <MisionesBlurb counts={counts} />
    case 'clases':
      return <Blurb parts={p.clasesBlurb} value={String(CLASSES.length)} />
    case 'mazmorras':
      return <Blurb parts={p.mazmorrasBlurb} value={String(DUNGEONS.length)} />
    default:
      return s.sheet.dofusBlurb
  }
}

/** La ficha de la sección a la izquierda del panel: icono, nombre y cifras. */
function SectionTile({ sec, counts }: { sec: Section; counts: SiteCounts }) {
  return (
    <div className="panel__tile">
      <Well image={sec.icon} size={46} className="site-well--xl" />
      <p className="panel__t">{sec.title}</p>
      <p className="panel__d">{sectionBlurb(sec.key, counts)}</p>
    </div>
  )
}

/**
 * Dofus y checklists en un solo panel: la guía de los Dofus y los checklists a la izquierda,
 * todos los huevos y el enlace a todas las guías a la derecha.
 */
function DofusPanel() {
  const dofus = section('dofus')
  return (
    <>
      <div className="panel__tile panel__tile--hub">
        <p className="panel__h">{p.dofusFeatured}</p>
        <a className="feat" href={dofus.href}>
          <span className="feat__art" aria-hidden="true">
            {DOFUS_FEATURED.map((image) => (
              <StaticImg
                key={image.src}
                src={image.src}
                width={60}
                height={60}
                alt=""
                loading="lazy"
              />
            ))}
          </span>
          <span>
            <span className="feat__t">{p.dofusFeaturedTitle}</span>
            <span className="feat__d">{p.dofusFeaturedText}</span>
          </span>
        </a>
        <p className="panel__h">{p.checklists}</p>
        <ChecklistCards compact />
      </div>
      <div className="panel__body">
        <p className="panel__h">{p.dofusAll}</p>
        <EggGrid />
        <AllLink href={dofus.href}>{p.dofusSeeAll}</AllLink>
      </div>
    </>
  )
}

const NAV = SECTIONS.filter((sec) => sec.key !== 'checklists')

function PanelContent({ sec, counts }: { sec: Section; counts: SiteCounts }) {
  return sec.key === 'dofus' ? (
    <DofusPanel />
  ) : (
    <>
      <SectionTile sec={sec} counts={counts} />
      <div className="panel__body">
        <MisionesBody />
      </div>
    </>
  )
}

function Panel({ sec, counts }: { sec: Section; counts: SiteCounts }) {
  return (
    <div className={`panel panel--${sec.key}`} id={`menu-${sec.key}`} hidden>
      <PanelContent sec={sec} counts={counts} />
    </div>
  )
}

/** Un panel del menú abierto y quieto, para el catálogo /sistema. */
export function MenuPanelPreview({
  sectionKey,
  counts,
}: {
  sectionKey: SectionKey
  counts: SiteCounts
}) {
  const sec = section(sectionKey)
  return (
    <div className={`panel panel--static panel--${sec.key}`} style={accent(sec)}>
      <PanelContent sec={sec} counts={counts} />
    </div>
  )
}

function SheetSection({ sec, counts, open }: { sec: Section; counts: SiteCounts; open: boolean }) {
  const dofus = sec.key === 'dofus'
  const id = `sheet-${sec.key}`
  if (sec.soon) {
    return (
      <li className="stile" style={accent(sec)}>
        <div className="stile__b stile__b--soon" aria-disabled="true">
          <Well image={sec.icon} size={36} className="site-well--lg" />
          <span className="stile__x">
            <span className="stile__t">
              {sec.title} <Soon />
            </span>
            <span className="stile__d">{sectionBlurb(sec.key, counts)}</span>
          </span>
        </div>
      </li>
    )
  }
  return (
    <li className="stile" style={accent(sec)}>
      <button type="button" className="stile__b" aria-expanded={open} aria-controls={id}>
        <Well image={sec.icon} size={36} className="site-well--lg" />
        <span className="stile__x">
          <span className="stile__t">{dofus ? s.sheet.dofusTitle : sec.title}</span>
          <span className="stile__d">{sectionBlurb(sec.key, counts)}</span>
        </span>
        <ChevronIcon className="stile__c" />
      </button>
      <div className="stile__p" id={id} hidden={!open}>
        {dofus ? (
          <>
            <ChecklistCards />
            <EggGrid />
            <AllLink href={sec.href}>{p.dofusSeeAll}</AllLink>
          </>
        ) : (
          <MisionesBody />
        )}
      </div>
    </li>
  )
}

function Sheet({ counts }: { counts: SiteCounts }) {
  return (
    <dialog className="sheet" id="site-sheet" aria-label={s.menu}>
      <div className="sheet__top">
        <Lockup />
        <button type="button" className="ib" aria-label={s.closeMenu} data-close-sheet autoFocus>
          <CloseIcon />
        </button>
      </div>
      <div className="sheet__body">
        <ul className="stiles" role="list">
          {NAV.map((sec, i) => (
            <SheetSection key={sec.key} sec={sec} counts={counts} open={i === 0} />
          ))}
        </ul>
        <ul className="sheet__soc" role="list">
          {SOCIALS.map((so) => (
            <li key={so.key}>
              <a href={so.href} rel="noopener" aria-label={so.name}>
                <SocialIcon name={so.key} />
              </a>
            </li>
          ))}
          <li>
            <a href={KOFI_URL} rel="noopener" aria-label={s.socials.kofi}>
              <SocialIcon name="kofi" />
            </a>
          </li>
        </ul>
      </div>
    </dialog>
  )
}

/**
 * La cabecera de todo el sitio (DESIGN.md, Layout: Header): el logo Sello, un desplegable
 * por sección con su ficha y su arte (Dofus y checklists comparten panel), la búsqueda con
 * Ctrl K, el interruptor de modo y, por debajo de 1120px, el menú del móvil. Todo se pinta
 * en el servidor; la isla abre y cierra los paneles, el menú y la búsqueda.
 */
export function SiteHeader({ counts, initialMode }: { counts: SiteCounts; initialMode: Mode }) {
  return (
    <>
      <a className="skip-link" href="#contenido">
        {s.skip}
      </a>
      <header className="site-hdr" data-site-header>
        <div className="site-hdr__in">
          <Lockup />
          <nav className="site-nav" aria-label={s.nav}>
            <ul role="list">
              {NAV.map((sec) =>
                sec.soon ? (
                  <li key={sec.key} className="site-nav__item" style={accent(sec)}>
                    <span className="np np--soon" aria-disabled="true">
                      <StaticImg
                        className="np__i"
                        src={sec.icon.src}
                        width={22}
                        height={22}
                        alt=""
                      />
                      {sec.label} <Soon />
                    </span>
                  </li>
                ) : (
                  <li key={sec.key} className="site-nav__item" style={accent(sec)}>
                    <button
                      type="button"
                      className="np"
                      aria-expanded="false"
                      aria-controls={`menu-${sec.key}`}
                    >
                      <StaticImg
                        className="np__i"
                        src={sec.icon.src}
                        width={22}
                        height={22}
                        alt=""
                      />
                      {sec.label}
                      <ChevronIcon className="np__c" />
                    </button>
                    <Panel sec={sec} counts={counts} />
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="site-hdr__act">
            <button type="button" className="spill" data-open-search>
              <SearchIcon />
              <span>{s.search}</span>
              <kbd>{s.searchShortcut}</kbd>
            </button>
            <button type="button" className="ib sbtn" aria-label={s.searchLabel} data-open-search>
              <SearchIcon />
            </button>
            <ModeToggle initialMode={initialMode} />
            <button
              type="button"
              className="ib burger"
              aria-label={s.menu}
              aria-haspopup="dialog"
              aria-controls="site-sheet"
              data-open-sheet
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>
      <Sheet counts={counts} />
      <HeaderIsland index={searchIndex()} />
    </>
  )
}
