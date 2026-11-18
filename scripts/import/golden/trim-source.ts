// Una página de Squarespace recortada a lo que leen los conversores de la importación
// (squarespace/parse-page.ts y pages/convert.ts): el <title>, la descripción SEO, el título de
// la colección del JSON de contexto y los <article> enteros, sin los atributos que nadie lee. La
// cabecera, los scripts, los estilos y el pie se van: son dos tercios de la página y cambian en
// cada visita.
// pnpm import:golden-refresh comprueba que la página recortada convierte igual que la entera
// antes de guardarla. Código puro.

const TITLE = /<title>[\s\S]*?<\/title>/u
const DESCRIPTION = /<meta name="description" content="[^"]*"[^>]*>/u
// La misma expresión que lee el título en squarespace/parse-page.ts.
const CONTEXT_TITLE = /"collection":\{"title":"((?:[^"\\]|\\.)*)"/u
const ARTICLE = /<article\b[\s\S]*?<\/article>/gu
// Atributos de Squarespace que ningún conversor lee: los scripts y estilos de cada bloque, los
// tamaños de las imágenes (la importación usa data-image), y los estilos y puntos de corte de
// cada sección. Son un tercio de lo que queda.
const NOISE =
  / (?:data-block-scripts|data-block-css|data-current-styles|data-breakpoints|srcset|sizes)="[^"]*"/gu

export function trimSource(html: string): string {
  const articles = html.match(ARTICLE)
  if (!articles)
    throw new Error('La página no tiene ningún <article>: no hay contenido que guardar')
  const context = CONTEXT_TITLE.exec(html)
  const head = [
    TITLE.exec(html)?.[0],
    DESCRIPTION.exec(html)?.[0],
    context &&
      `<script>Static.SQUARESPACE_CONTEXT = {"collection":{"title":"${context[1]}"}};</script>`,
  ].filter(Boolean)
  return [
    '<!doctype html>',
    '<html lang="es-ES">',
    '<head>',
    ...head,
    '</head>',
    '<body>',
    ...articles.map((article) => article.replace(NOISE, '')),
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
