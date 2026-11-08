import { CHECKLISTS } from '@/components/site/nav'
import { StaticImg } from '@/components/site/StaticImg'
import { Amount } from '@/components/ui/Amount'

import { CHECKLIST_FIGURES } from './data'
import { homeStrings } from './strings'

const s = homeStrings.checklists

/**
 * «Checklists para ir a por tu Dofus» (DESIGN.md, Home): los tres checklists del menú, cada
 * uno con su huevo y su cifra (data.ts).
 */
export function ChecklistsSection() {
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
          {CHECKLISTS.map((checklist, i) => (
            <li key={checklist.href}>
              <a href={checklist.href}>
                <span className="trio__egg">
                  <StaticImg
                    src={checklist.image!.src}
                    width={checklist.image!.size}
                    height={checklist.image!.size}
                    loading="lazy"
                  />
                </span>
                <span className="trio__t">{checklist.name}</span>
                <span className="trio__d">
                  <b>
                    <Amount value={CHECKLIST_FIGURES[i].value} />
                  </b>{' '}
                  {CHECKLIST_FIGURES[i].unit}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
