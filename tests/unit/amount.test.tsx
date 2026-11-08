import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Amount } from '@/components/ui/Amount'

const html = (value: number) => renderToStaticMarkup(<Amount value={value} />)

describe('las cifras del sitio', () => {
  it('separa los miles con un espacio fino que no se parte (U+202F), en su propio span', () => {
    expect(html(1272)).toBe('<span class="amount">1<span class="amount__th"> </span>272</span>')
    expect(html(3_000_000)).toBe(
      '<span class="amount">3<span class="amount__th"> </span>000<span class="amount__th"> </span>000</span>',
    )
  })

  it('sin miles, solo la cifra', () => {
    expect(html(214)).toBe('<span class="amount">214</span>')
    expect(html(0)).toBe('<span class="amount">0</span>')
  })
})
