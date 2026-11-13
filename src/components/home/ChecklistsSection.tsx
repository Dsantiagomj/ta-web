import type { ChecklistNavItem } from '@/components/site/nav'
import { StaticImg } from '@/components/site/StaticImg'
import { siteShellStrings } from '@/components/site/strings'

import { homeStrings } from './strings'

const s = homeStrings.checklists

function Inner({ checklist }: { checklist: ChecklistNavItem }) {
  return (
    <>
      <span className="trio__egg">
        {checklist.image && (
          <StaticImg
            src={checklist.image.src}
            width={checklist.image.size}
            height={checklist.image.size}
            alt=""
            loading="lazy"
          />
        )}
      </span>
      <span className="trio__t">{checklist.name}</span>
      {checklist.href && checklist.legacy && (
        <span className="sr-only">{siteShellStrings.legacyChecklist}</span>
      )}
      {!checklist.href && <span className="sr-only">{siteShellStrings.preparing}</span>}
      {checklist.description && <span className="trio__d">{checklist.description}</span>}
    </>
  )
}

/**
 * «Checklists para ir a por tu Dofus» (DESIGN.md, Home): las checklists del menú, de su
 * colección y en su orden (loadChecklistNav), cada una con su huevo y su frase. Sin cifras:
 * los pasos cambian y Torre suma checklists con el tiempo.
 */
export function ChecklistsSection({ checklists }: { checklists: ChecklistNavItem[] }) {
  if (!checklists.length) return null
  return (
    <section className="home-sec" aria-labelledby="h-cl">
      <div className="home-wrap cl">
        <div>
          <h2 id="h-cl" className="home-h2 rv">
            {s.title}
          </h2>
          <p className="cl__lead rv">{s.lead}</p>
        </div>
        <ul className="trio" role="list">
          {checklists.map((checklist) => (
            <li key={checklist.slug}>
              {checklist.href ? (
                <a href={checklist.href}>
                  <Inner checklist={checklist} />
                </a>
              ) : (
                <div className="trio__off" aria-disabled="true">
                  <Inner checklist={checklist} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
