// Genera los anchos menores de las capturas del catálogo /sistema, para que su Figure, su
// vídeo y su cabecera usen srcset como las imágenes de media. Parte del WebP más ancho de
// public/img/sistema, que ya es la variante convertida de las maquetas (los originales no
// están en el repo). Los iconos se quedan en un solo ancho. Uso: node scripts/build-catalog-images.ts
import path from 'node:path'
import sharp from 'sharp'

const dir = path.resolve('public/img/sistema')

// Los mismos anchos que las variantes de media (src/lib/media/sizes.ts) menores que cada original.
const IMAGES: Record<string, number[]> = {
  'seis-pies-combate': [480, 800],
  'seis-pies-hupe-esse': [480],
  'video-ron-marino': [480],
}

for (const [name, widths] of Object.entries(IMAGES)) {
  for (const width of widths) {
    const resized = sharp(path.join(dir, `${name}.webp`)).resize({ width })
    await resized
      .clone()
      .avif({ quality: 50 })
      .toFile(path.join(dir, `${name}-${width}.avif`))
    await resized
      .clone()
      .webp({ quality: 80 })
      .toFile(path.join(dir, `${name}-${width}.webp`))
  }
}
console.log('Anchos de las capturas del catálogo listos en public/img/sistema.')
