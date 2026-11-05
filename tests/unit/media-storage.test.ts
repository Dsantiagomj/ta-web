import { describe, expect, it } from 'vitest'

import { mediaFileUrl, mediaObjectKey, readS3Settings } from '@/lib/media/storage'

const r2 = {
  S3_ENDPOINT: 'https://cuenta.r2.cloudflarestorage.com',
  S3_BUCKET: 'torrente-media',
  S3_ACCESS_KEY_ID: 'clave',
  S3_SECRET_ACCESS_KEY: 'secreto',
}

describe('readS3Settings', () => {
  it('devuelve null sin variables de R2: los archivos van al disco local', () => {
    expect(readS3Settings({})).toBeNull()
  })

  it('lee la configuración de R2 cuando están todas las variables', () => {
    expect(readS3Settings(r2)).toEqual({
      endpoint: r2.S3_ENDPOINT,
      bucket: r2.S3_BUCKET,
      accessKeyId: r2.S3_ACCESS_KEY_ID,
      secretAccessKey: r2.S3_SECRET_ACCESS_KEY,
      region: 'auto',
      publicBaseUrl: undefined,
    })
  })

  it('usa S3_REGION y MEDIA_BASE_URL cuando existen', () => {
    const settings = readS3Settings({
      ...r2,
      S3_REGION: 'eu',
      MEDIA_BASE_URL: 'https://media.torrentearcano.com/',
    })
    expect(settings?.region).toBe('eu')
    expect(settings?.publicBaseUrl).toBe('https://media.torrentearcano.com')
  })

  it('falla con la lista de lo que falta si la configuración está a medias', () => {
    expect(() => readS3Settings({ S3_BUCKET: 'torrente-media' })).toThrow(
      /S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY/,
    )
  })

  it('trata las variables vacías como ausentes', () => {
    expect(readS3Settings({ S3_ENDPOINT: '', S3_BUCKET: '' })).toBeNull()
  })
})

describe('mediaFileUrl', () => {
  it('une la URL pública, el prefijo y el nombre del archivo', () => {
    expect(mediaFileUrl('https://media.torrentearcano.com', 'guias', 'zaap.webp')).toBe(
      'https://media.torrentearcano.com/guias/zaap.webp',
    )
  })

  it('omite el prefijo vacío', () => {
    expect(mediaFileUrl('https://media.torrentearcano.com', '', 'zaap.webp')).toBe(
      'https://media.torrentearcano.com/zaap.webp',
    )
  })

  it('codifica los nombres con espacios o tildes', () => {
    expect(mediaFileUrl('https://media.torrentearcano.com', undefined, 'Brâkmar 1.png')).toBe(
      'https://media.torrentearcano.com/Br%C3%A2kmar%201.png',
    )
  })
})

describe('mediaObjectKey', () => {
  it('sin prefijo, la clave es el nombre del archivo', () => {
    expect(mediaObjectKey({ filename: 'mapa.png' })).toBe('mapa.png')
    expect(mediaObjectKey({ filename: 'mapa.png', prefix: null, _objectKey: null })).toBe(
      'mapa.png',
    )
  })

  it('une el prefijo y _objectKey como el adaptador de storage-s3', () => {
    expect(mediaObjectKey({ filename: 'mapa.png', prefix: 'guias' })).toBe('guias/mapa.png')
    expect(mediaObjectKey({ filename: 'mapa.png', prefix: '/guias/', _objectKey: 'abc' })).toBe(
      'guias/abc/mapa.png',
    )
  })

  it('un prefijo con .. no sale de su carpeta', () => {
    expect(mediaObjectKey({ filename: 'mapa.png', prefix: '../otra' })).toBe('otra/mapa.png')
  })
})
