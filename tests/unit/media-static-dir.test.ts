import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { mediaStaticDir, staleTestMediaDir, testMediaDir } from '@/lib/media/static-dir'

// Las pruebas (E2E, Lighthouse CI) suben sus imágenes al disco, cada base a su carpeta. Con
// una sola ./media, lo que dejaba una base vaciada hacía que Payload renombrara la subida
// siguiente («-1») y, con las copias acumuladas, la siembra chocaba consigo misma.

describe('mediaStaticDir', () => {
  it('es ./media salvo que MEDIA_STATIC_DIR diga otra carpeta', () => {
    expect(mediaStaticDir({})).toBe('media')
    expect(mediaStaticDir({ MEDIA_STATIC_DIR: '  ' })).toBe('media')
    expect(mediaStaticDir({ MEDIA_STATIC_DIR: 'media/test/ta_web_e2e' })).toBe(
      'media/test/ta_web_e2e',
    )
  })
})

describe('testMediaDir', () => {
  it('da a cada base de pruebas su carpeta dentro de ./media/test', () => {
    expect(testMediaDir('postgres://postgres:postgres@127.0.0.1:54329/ta_web_e2e')).toBe(
      'media/test/ta_web_e2e',
    )
    expect(testMediaDir('postgres://ci@localhost/pruebas?sslmode=disable')).toBe(
      'media/test/pruebas',
    )
  })

  it('no sale de ./media/test con un nombre de base raro', () => {
    expect(testMediaDir('postgres://ci@localhost/..%2F..%2Fetc')).toBe('media/test/______etc')
    expect(testMediaDir('postgres://ci@localhost/')).toBe('media/test/postgres')
  })
})

describe('staleTestMediaDir', () => {
  const env = { MEDIA_STATIC_DIR: 'media/test/ta_web_e2e' }

  it('con la base sin archivos de Media, su carpeta de pruebas sobra entera', () => {
    expect(staleTestMediaDir(env, 0)).toBe(path.resolve('media/test/ta_web_e2e'))
  })

  it('con archivos en la base no toca nada: repetir la siembra los reutiliza', () => {
    expect(staleTestMediaDir(env, 4)).toBeNull()
  })

  it('nunca vacía ./media ni una carpeta fuera de ./media/test', () => {
    for (const dir of [undefined, 'media', 'media/test', 'otra', 'media/test/../../src']) {
      expect(staleTestMediaDir({ MEDIA_STATIC_DIR: dir }, 0), String(dir)).toBeNull()
    }
  })

  it('con R2 no hay nada en el disco que vaciar', () => {
    expect(
      staleTestMediaDir(
        {
          ...env,
          S3_ENDPOINT: 'https://r2',
          S3_BUCKET: 'b',
          S3_ACCESS_KEY_ID: 'k',
          S3_SECRET_ACCESS_KEY: 's',
        },
        0,
      ),
    ).toBeNull()
  })
})
