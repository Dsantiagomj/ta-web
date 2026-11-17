import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MetaParts } from '@/components/ui/MetaParts'

// Una línea de cifras («Misión de Astrub - Nivel 20 - Misión 2 de 3») que se parte en el
// móvil: cada cifra entera mientras quepa, y el guion al final de la anterior, así que una
// línea partida nunca empieza por él.

const text = (markup: string) => markup.replace(/<[^>]+>/g, '')

describe('MetaParts', () => {
  const markup = renderToStaticMarkup(
    <p>
      <MetaParts parts={['Misión de Astrub', 'Nivel 20', 'Misión 2 de 3']} separator=" - " />
    </p>,
  )

  it('se lee igual que las cifras unidas por el separador', () => {
    expect(text(markup)).toBe('Misión de Astrub - Nivel 20 - Misión 2 de 3')
  })

  it('cada cifra va en un bloque que no se parte, con el guion al final de la anterior', () => {
    expect(markup).toBe(
      '<p>' +
        '<span class="inline-block">Misión de Astrub -</span> ' +
        '<span class="inline-block">Nivel 20 -</span> ' +
        '<span class="inline-block">Misión 2 de 3</span>' +
        '</p>',
    )
  })

  it('una sola cifra va sin separador', () => {
    expect(renderToStaticMarkup(<MetaParts parts={['Nivel 6']} separator=" - " />)).toBe(
      '<span class="inline-block">Nivel 6</span>',
    )
  })
})
