// Genera el arte de la portada en public/img/inicio: AVIF y WebP a los anchos que pide su
// maquetación (DESIGN.md, Imagery), una vez, desde el arte del prototipo aprobado (inicio v9),
// que no está en el repo. Ese arte viene del juego, descargado una vez y nunca enlazado:
// - krosmoz: la isla flotante del Krosmoz de la web de Torre (prototipos de inicio).
// - astrub: el mapa de la plaza de Astrub [5,-18] en DofusDB (mapa 191105026, 1910 × 970),
//   recortado arriba y abajo para quitar la marca de DofusDB.
// - npc-*: los PNJ de renderer.dofusdb.fr con su look de DofusDB, recortados: Meriana (2205),
//   Enviada de los Doce (4355), Paula Sepe (4356), Draconiros (6167) y Hupe Esse (4412),
//   mirando a la derecha (se) y a la izquierda (so).
// - crocanteria: la última sala de la Crocantería (mapa 197398528 de DofusDB) y su jefe, el
//   Crunchidor.
// - guia-paso: la captura del paso 1 de la guía «Seis pies bajo tierra».
// - item-*: los iconos de objeto de DofusDB (128px).
// - torre-*: el avatar recortado de Torre.
// Uso: node scripts/build-home-images.ts <carpeta img del prototipo>
import path from 'node:path'
import sharp from 'sharp'

const from = process.argv[2]
if (!from) throw new Error('Falta la carpeta del arte del prototipo (tmp/mockups/inicio-v9/img).')
const out = path.resolve('public/img/inicio')

// [archivo de origen, nombre, anchos]; un ancho mayor que el original es un error, porque
// el nombre del archivo y su descriptor w mentirían.
const IMAGES: [string, string, number[]][] = [
  ['zona-krosmoz.webp', 'krosmoz', [480, 640, 960]],
  ['torre-recorte-512.webp', 'torre-pregunta', [172, 344]],
  ['torre-recorte-512.webp', 'torre', [256, 512]],
  ['zona-astrub.webp', 'astrub', [480, 800, 1200, 1600]],
  ['npc-2205.webp', 'npc-2205', [414]],
  ['npc-4355.webp', 'npc-4355', [244]],
  ['npc-4356.webp', 'npc-4356', [238]],
  ['npc-6167.webp', 'npc-6167', [185]],
  ['mazmorra-crocanteria-sala.webp', 'crocanteria', [480, 960]],
  ['jefe-crunchidor.webp', 'crunchidor', [334]],
  ['npc-4412-se.webp', 'npc-4412-se', [168]],
  ['npc-4412-so.webp', 'npc-4412-so', [100]],
  ['sp-1.webp', 'guia-paso', [480, 800]],
  ['item-366.png', 'item-366', [64]],
  ['item-373.png', 'item-373', [64]],
  ['item-388.png', 'item-388', [64]],
  ['item-2491.png', 'item-2491', [64]],
]

for (const [file, name, widths] of IMAGES) {
  const source = sharp(path.join(from, file))
  const { width: original = 0 } = await source.metadata()
  for (const width of widths) {
    if (width > original) throw new Error(`${file} mide ${original}px: no llega a ${width}px.`)
    const resized = source.clone().resize({ width })
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
