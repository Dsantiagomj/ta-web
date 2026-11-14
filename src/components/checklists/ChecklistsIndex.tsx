import type { CSSProperties, ReactNode } from 'react'

import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import type { ChecklistEntry, ChecklistTeaser } from '@/lib/checklists/list'
import { checklistIndexStrings as s } from '@/lib/checklists/strings'

import { ChecklistPostersIsland } from './ChecklistPostersIsland'

import './checklists-index.css'

/**
 * Los carteles que se ven al cargar en un móvil: su escena y su huevo pueden ser la imagen más
 * grande de la pantalla (el LCP) y no se difieren.
 */
const ABOVE_THE_FOLD = 2

// Lo que mide cada imagen según el ancho del cartel (checklists-index.css): unos 164px en un
// móvil de 390, 208px en una tableta, 170px a 1024 y 252px desde 1280. La escena cubre el
// cartel (2:3) con una imagen apaisada (unas 2,3:1): se pinta 3,45 veces más ancha que él. El
// PNJ llega a tres cuartos de su alto; el huevo, al 54 % de su ancho y como mucho 128px.
const SCENE_SIZES =
  '(min-width: 1280px) 880px, (min-width: 1024px) 600px, (min-width: 640px) 740px, 570px'
const NPC_SIZES = '(min-width: 1280px) 280px, (min-width: 640px) 240px, 190px'
const EGG_SIZES = '(min-width: 1280px) 128px, (min-width: 640px) 112px, 90px'

type Vars = CSSProperties & Record<`--${string}`, string>

function posterVars(entry: ChecklistEntry): Vars | undefined {
  if (!entry.color) return undefined
  return {
    '--egg': entry.color,
    ...(entry.ink && {
      '--egg-ink-dark': entry.ink.dark,
      '--egg-ink-light': entry.ink.light,
    }),
  }
}

function npcVars(fit: ChecklistEntry['npcFit']): Vars | undefined {
  if (!fit) return undefined
  return {
    ...(fit.height != null && { '--npc-h': `${fit.height}%` }),
    ...(fit.right != null && { '--npc-r': `${fit.right}%` }),
    ...(fit.top != null && { '--npc-t': `${fit.top}%` }),
  }
}

/** Lo pintado dentro del cartel: la escena, el PNJ, la sombra, el huevo y el brillo. */
function Art({
  scene,
  npc,
  fit,
  egg,
  priority,
}: {
  scene?: ImageAsset
  npc?: ImageAsset
  fit?: ChecklistEntry['npcFit']
  egg?: ImageAsset
  priority: boolean
}) {
  return (
    <>
      <span className="poster__art" aria-hidden="true">
        {scene && <Picture image={scene} alt="" sizes={SCENE_SIZES} priority={priority} />}
      </span>
      {npc && (
        <span className="poster__npc" aria-hidden="true" style={npcVars(fit)}>
          <Picture image={npc} alt="" sizes={NPC_SIZES} />
        </span>
      )}
      <span className="poster__shade" aria-hidden="true" />
      {egg && (
        <span className="poster__egg" aria-hidden="true">
          <Picture image={egg} alt="" sizes={EGG_SIZES} priority={priority} />
        </span>
      )}
      <span className="poster__foil" aria-hidden="true" />
    </>
  )
}

function Poster({ entry, priority }: { entry: ChecklistEntry; priority: boolean }) {
  const inner = (extra: ReactNode) => (
    <span className="poster__frame">
      <Art
        scene={entry.scene}
        npc={entry.npc}
        fit={entry.npcFit}
        egg={entry.egg}
        priority={priority}
      />
      {extra}
      <span className="poster__name">{entry.name}</span>
      {entry.state === 'published' && (
        // Absoluto en su esquina: aparecer no mueve nada.
        <span className="poster__ring" data-poster-progress={entry.slug} hidden>
          <span className="poster__pct" data-poster-pct="" />
          <span className="sr-only">{s.done}</span>
        </span>
      )}
    </span>
  )
  if (!entry.href) {
    return (
      <div className="poster poster--off" aria-disabled="true" style={posterVars(entry)}>
        {inner(<span className="poster__badge">{s.preparing}</span>)}
      </div>
    )
  }
  return (
    <a className="poster" href={entry.href} style={posterVars(entry)} data-tilt="">
      {inner(null)}
    </a>
  )
}

/** La tarjeta «???»: en gris, el huevo en silueta, sin enlace ni inclinación. */
function Teaser({ teaser }: { teaser: ChecklistTeaser }) {
  return (
    <div className="poster poster--soon">
      <span className="poster__frame">
        <Art scene={teaser.scene} egg={teaser.egg} priority={false} />
        {teaser.label && <span className="poster__badge">{teaser.label}</span>}
        <span className="poster__name">{teaser.text}</span>
      </span>
    </div>
  )
}

/** Los carteles de las checklists: el índice y el catálogo /sistema. */
export function ChecklistPosters({
  entries,
  teaser = null,
}: {
  entries: ChecklistEntry[]
  teaser?: ChecklistTeaser | null
}) {
  return (
    <ul className="posters" role="list" data-checklist-grid="">
      {entries.map((entry, index) => (
        <li key={entry.slug}>
          <Poster entry={entry} priority={index < ABOVE_THE_FOLD} />
        </li>
      ))}
      {teaser && (
        <li>
          <Teaser teaser={teaser} />
        </li>
      )}
    </ul>
  )
}

/**
 * El índice de las checklists (DESIGN.md, Checklists index): el título, la entradilla y una fila
 * de carteles en el orden de Torre, como el hub de Squarespace, con la tarjeta «???» al final si
 * Torre la tiene encendida. Cada cartel enseña el progreso del navegador. Sin ninguna checklist,
 * un aviso en vez de una fila vacía. Ninguna cifra: Torre suma checklists.
 */
export function ChecklistsIndex({
  entries,
  teaser,
}: {
  entries: ChecklistEntry[]
  teaser: ChecklistTeaser | null
}) {
  return (
    <main id="contenido" className="ck-index">
      <header className="ck-hero">
        <p className="ck-eyebrow">{s.eyebrow}</p>
        <h1 className="ck-h1">{s.title}</h1>
        <p className="ck-lead">{s.lead}</p>
      </header>
      {entries.length ? (
        <>
          <ChecklistPosters entries={entries} teaser={teaser} />
          <ChecklistPostersIsland />
        </>
      ) : (
        <p className="ck-empty">{s.empty}</p>
      )}
    </main>
  )
}
