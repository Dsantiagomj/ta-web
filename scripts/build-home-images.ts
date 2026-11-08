// Genera el arte de la portada en public/img/inicio: AVIF y WebP a los anchos que pide su
// maquetación (DESIGN.md, Imagery), una vez, desde el arte del prototipo aprobado (inicio v9),
// que no está en el repo. Ese arte viene del juego, descargado una vez y nunca enlazado:
// - krosmoz: la isla flotante del Krosmoz de la web de Torre (prototipos de inicio).
// - torre-*: el avatar recortado de Torre.
// Uso: node scripts/build-home-images.ts <carpeta img del prototipo>
import path from 'node:path'
import sharp from 'sharp'

const from = process.argv[2]
if (!from) throw new Error('Falta la carpeta del arte del prototipo (tmp/mockups/inicio-v9/img).')
const out = path.resolve('public/img/inicio')

// [archivo de origen, nombre, anchos]; un ancho mayor que el original no se genera.
const IMAGES: [string, string, number[]][] = [
  ['zona-krosmoz.webp', 'krosmoz', [480, 640, 960]],
  ['torre-recorte-512.webp', 'torre-pregunta', [172, 344]],
]

for (const [file, name, widths] of IMAGES) {
  const source = sharp(path.join(from, file))
  const { width: original = 0 } = await source.metadata()
  for (const width of widths) {
    const resized = source.clone().resize({ width: Math.min(width, original) })
    await resized
      .clone()
      .avif({ quality: 50 })
      .toFile(path.join(out, `${name}-${width}.avif`))
    await resized
      .clone()
      .webp({ quality: 80 })
      .toFile(path.join(out, `${name}-${width}.webp`))
  }
}
console.log('Arte de la portada listo en public/img/inicio.')
