// Genera las variantes AVIF y WebP de los huevos del interruptor de modo, a 1x y 2x del
// tamaño en pantalla (28 px). Los PNG de public/img/mode son los iconos originales del
// juego. Uso: node scripts/build-mode-eggs.ts
import path from 'node:path'
import sharp from 'sharp'

const dir = path.resolve('public/img/mode')
const DISPLAY_SIZE = 28

for (const egg of ['dofus-marfil', 'dofus-ebano']) {
  for (const scale of [1, 2]) {
    const size = DISPLAY_SIZE * scale
    const resized = sharp(path.join(dir, `${egg}.png`)).resize(size, size)
    await resized
      .clone()
      .avif({ quality: 70 })
      .toFile(path.join(dir, `${egg}-${size}.avif`))
    await resized
      .clone()
      .webp({ quality: 85 })
      .toFile(path.join(dir, `${egg}-${size}.webp`))
  }
}
console.log('Variantes de los huevos listas en public/img/mode.')
