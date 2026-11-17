import { contrastRatio } from '../../src/lib/checklists/poster-ink.ts'

/**
 * Un color de getComputedStyle en hexadecimal, sin alfa: Chrome da rgb()/rgba() para los
 * colores normales y color(srgb r g b) para los que salen de un color-mix().
 */
export function computedHex(color: string): string {
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(color)
  const channels = srgb
    ? srgb.slice(1, 4).map((value) => Math.round(Number(value) * 255))
    : (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

/** El contraste WCAG 2.x entre dos colores de getComputedStyle. */
export const computedContrast = (a: string, b: string) =>
  contrastRatio(computedHex(a), computedHex(b))
