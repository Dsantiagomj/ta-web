// La página del 410 (AGENTS.md, Redirects): la URL era de Squarespace y no tiene sustituta.
// La escribe el proxy sin pasar por Next, así que es un HTML suelto: su CSS va dentro, sin
// hojas de estilo, fuentes ni scripts. Los colores son los de Arcano (src/styles/theme.css),
// en el modo del visitante; la prueba comprueba que siguen siendo los del tema.

import type { Mode } from '@/lib/theme/theme'

export const goneStrings = {
  title: 'Esta página ya no existe',
  lead: 'La dirección era de la web antigua de Torrente Arcano y su contenido se retiró.',
  home: 'Volver a la portada',
  brand: 'Torrente Arcano',
}

export const GONE_COLORS: Record<Mode, { bg: string; ink: string; ink2: string; accent: string }> =
  {
    dark: { bg: '#0f0d1a', ink: '#ece9ff', ink2: '#bdb6e6', accent: '#6fe3ff' },
    light: { bg: '#f4f2fb', ink: '#1b1630', ink2: '#3f3763', accent: '#0a6a85' },
  }

/** El HTML del 410, en el modo del visitante (oscuro por defecto, como el sitio). */
export function gonePage(mode: Mode = 'dark'): string {
  const c = GONE_COLORS[mode]
  const s = goneStrings
  return `<!doctype html>
<html lang="es" data-mode="${mode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${s.title} · ${s.brand}</title>
<style>
body{margin:0;background:${c.bg};color:${c.ink};font:1.125rem/1.6 Montserrat,system-ui,sans-serif}
main{max-width:60ch;margin:0 auto;padding:4rem 1.5rem}
h1{font-size:2.25rem;line-height:1.2;margin:0 0 1rem}
p{color:${c.ink2};margin:0 0 1rem}
a{color:${c.accent};font-weight:600}
</style>
</head>
<body>
<main>
<h1>${s.title}</h1>
<p>${s.lead}</p>
<p><a href="/">${s.home}</a></p>
</main>
</body>
</html>
`
}
