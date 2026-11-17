// La página del 410 (AGENTS.md, Redirects): la URL era de Squarespace y no tiene sustituta.
// La escribe el proxy sin pasar por Next, así que es un HTML suelto: su CSS va dentro, sin
// hojas de estilo, fuentes ni scripts. Sigue el tema y el modo del visitante, como el resto
// del sitio: los colores son los de cada tema gratis (src/styles/theme.css) y la prueba
// comprueba que siguen siendo los del tema. Sin las fuentes de la web, las del sistema.

import type { FreeTheme, Mode } from '@/lib/theme/theme'

export const goneStrings = {
  title: 'Esta página ya no existe',
  lead: 'La dirección era de la web antigua de Torrente Arcano y su contenido se retiró.',
  home: 'Volver a la portada',
  brand: 'Torrente Arcano',
}

type GoneColors = { bg: string; ink: string; ink2: string; btn: string; btnInk: string }

export const GONE_COLORS: Record<`${FreeTheme}-${Mode}`, GoneColors> = {
  'amakna-dark': {
    bg: '#14110e',
    ink: '#f6f2ea',
    ink2: '#d6cdc0',
    btn: '#b5e04a',
    btnInk: '#141a05',
  },
  'amakna-light': {
    bg: '#f5f0e6',
    ink: '#1d1813',
    ink2: '#43392f',
    btn: '#a8d63c',
    btnInk: '#172105',
  },
  'arcano-dark': {
    bg: '#110f1b',
    ink: '#f1eeff',
    ink2: '#cdc6e8',
    btn: '#6fe3ff',
    btnInk: '#06222b',
  },
  'arcano-light': {
    bg: '#f3f1fa',
    ink: '#1b1630',
    ink2: '#3f3763',
    btn: '#0a6a85',
    btnInk: '#ffffff',
  },
  'bonta-dark': {
    bg: '#0e1320',
    ink: '#eef3fc',
    ink2: '#c4cde0',
    btn: '#8fb8ff',
    btnInk: '#0a1730',
  },
  'bonta-light': {
    bg: '#f2f5fb',
    ink: '#111a2c',
    ink2: '#33415c',
    btn: '#1f4fa8',
    btnInk: '#ffffff',
  },
  'brakmar-dark': {
    bg: '#150d0c',
    ink: '#f8eeec',
    ink2: '#dac5c1',
    btn: '#ff6a52',
    btnInk: '#2a0703',
  },
  'brakmar-light': {
    bg: '#f8f1ee',
    ink: '#22120f',
    ink2: '#4b2c27',
    btn: '#b3261c',
    btnInk: '#ffffff',
  },
}

/**
 * El HTML del 410 en el tema y el modo del visitante (Amakna oscuro por defecto, como el
 * sitio): a la izquierda, con los márgenes de las páginas, y la vuelta a la portada como el
 * botón principal relleno.
 */
export function gonePage(mode: Mode = 'dark', theme: FreeTheme = 'amakna'): string {
  const c = GONE_COLORS[`${theme}-${mode}`]
  const s = goneStrings
  return `<!doctype html>
<html lang="es" data-theme="${theme}" data-mode="${mode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${s.title} · ${s.brand}</title>
<style>
html{color-scheme:${mode}}
body{margin:0;background:${c.bg};color:${c.ink};font:1.125rem/1.6 system-ui,-apple-system,'Segoe UI',sans-serif}
main{padding:4rem 1rem}
@media (min-width:40rem){main{padding-inline:1.5rem}}
@media (min-width:64rem){main{padding-inline:max(clamp(3rem,5vw,8rem),calc((100% - 121rem) / 2))}}
h1{margin:0 0 1rem;font-size:clamp(2.25rem,1.75rem + 2vw,3rem);font-weight:800;line-height:1.02;text-transform:uppercase}
p{max-width:62ch;margin:0 0 1.5rem;color:${c.ink2}}
.btn{display:inline-flex;align-items:center;min-height:2.75rem;padding:0 1.5rem;border-radius:.625rem;background:${c.btn};color:${c.btnInk};font-weight:700;text-decoration:none}
.btn:focus-visible{outline:2px solid ${c.ink};outline-offset:2px}
</style>
</head>
<body>
<main>
<h1>${s.title}</h1>
<p>${s.lead}</p>
<a class="btn" href="/">${s.home}</a>
</main>
</body>
</html>
`
}
