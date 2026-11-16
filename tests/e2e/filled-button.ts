import { expect, type Locator } from '@playwright/test'

/**
 * Cómo se ve un botón principal relleno (DESIGN.md, Components: Button, primary): el relleno
 * --color-btn con el texto en --color-btn-ink, Lexend 700, 0,625rem de radio, sin borde ni
 * sombra, y --color-btn-hi al pasar el ratón.
 */
export async function expectFilledButton(button: Locator, { radius = 0.625, weight = '700' } = {}) {
  const look = () =>
    button.evaluate((el) => {
      const s = getComputedStyle(el)
      const probe = document.createElement('i')
      el.parentElement!.append(probe)
      const token = (name: string) => {
        probe.style.color = `var(${name})`
        return getComputedStyle(probe).color
      }
      const tokens = {
        btn: token('--color-btn'),
        hi: token('--color-btn-hi'),
        ink: token('--color-btn-ink'),
      }
      probe.remove()
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      return {
        background: s.backgroundColor,
        color: s.color,
        family: s.fontFamily.split(',')[0].replaceAll('"', ''),
        weight: s.fontWeight,
        radius: parseFloat(s.borderTopLeftRadius) / rem,
        border: s.borderTopWidth === '0px' || s.borderTopColor === 'rgba(0, 0, 0, 0)',
        shadow: s.boxShadow,
        tokens,
      }
    })
  const rest = await look()
  expect(rest.background).toBe(rest.tokens.btn)
  expect(rest.color).toBe(rest.tokens.ink)
  expect(rest).toMatchObject({ family: 'Lexend', weight, border: true, shadow: 'none' })
  expect(rest.radius).toBeCloseTo(radius)

  await button.hover()
  await expect.poll(async () => (await look()).background).toBe(rest.tokens.hi)
}
