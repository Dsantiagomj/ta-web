import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AchievementHeader } from '@/components/achievement/AchievementParts'
import { QuestHeader } from '@/components/game/QuestHeader'
import { UpdatedDate } from '@/components/ui/UpdatedDate'

// «Actualizado el 18 de noviembre de 2026» en la cabecera (backlog D-03, DESIGN.md, Updated
// date): bajo el subtítulo, con <time datetime>.

const html = (node: React.ReactNode) => renderToStaticMarkup(node)

describe('UpdatedDate', () => {
  it('dice la fecha en español con <time datetime>', () => {
    expect(html(<UpdatedDate value="2026-11-18T10:00:00.000Z" />)).toBe(
      '<p class="qhead__updated">Actualizado el <time dateTime="2026-11-18">18 de noviembre de 2026</time></p>',
    )
  })

  it('otra clase para otra cabecera', () => {
    expect(
      html(<UpdatedDate value="2026-11-18T10:00:00.000Z" className="ck-head__updated" />),
    ).toContain('<p class="ck-head__updated">')
  })

  it('sin fecha no pinta nada', () => {
    expect(html(<UpdatedDate value={null} />)).toBe('')
  })
})

describe('en las cabeceras', () => {
  it('la guía: tras el subtítulo y antes de «Empieza con»', () => {
    const markup = html(
      <QuestHeader
        title="Seis pies bajo tierra"
        updated="2026-11-18T10:00:00.000Z"
        data={{
          meta: { zone: 'Astrub', level: 20 },
          giver: { name: 'Hupe Esse' },
          prerequisites: [],
          needs: { items: [], notes: [] },
          rewards: { items: [], notes: [] },
        }}
      />,
    )
    expect(markup).toMatch(
      /<p class="qhead__meta">.*<\/p><p class="qhead__updated">Actualizado el <time dateTime="2026-11-18">18 de noviembre de 2026<\/time><\/p><p class="qhead__start">/,
    )
  })

  it('el logro: tras su subtítulo', () => {
    const markup = html(
      <AchievementHeader title="Astrub" meta={['10 puntos']} updated="2026-11-18T10:00:00.000Z" />,
    )
    expect(markup).toMatch(/<p class="qhead__meta">10 puntos<\/p><p class="qhead__updated">/)
  })
})
