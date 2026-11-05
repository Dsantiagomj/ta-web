import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { GetObjectCommand } from '@aws-sdk/client-s3'
import type { Payload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import packageJson from '../../package.json'
import { type ObjectGetter, originalReader, regenerationRefusal } from '@/lib/media/regenerate'
import type { Media } from '@/payload-types'

describe('regenerationRefusal', () => {
  it('en local, contra la base de pnpm db:dev, sigue', () => {
    expect(regenerationRefusal({}, [])).toBeNull()
    expect(
      regenerationRefusal(
        { DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:54329/ta_web' },
        [],
      ),
    ).toBeNull()
    expect(regenerationRefusal({ DATABASE_URL: 'postgres://u:p@localhost/ta_web' }, [])).toBeNull()
  })

  it('en producción se niega sin --production', () => {
    for (const env of [
      { APP_ENV: 'production' },
      { RAILWAY_ENVIRONMENT_NAME: 'production' },
      { NODE_ENV: 'production' },
    ]) {
      expect(regenerationRefusal(env, [])).toMatch(/--production/)
      expect(regenerationRefusal(env, ['--production'])).toBeNull()
    }
  })

  it('contra una base remota se niega sin --remote, porque puede ser la de producción', () => {
    const env = { DATABASE_URL: 'postgres://u:p@ep-algo.eu-central-1.aws.neon.tech/neondb' }
    expect(regenerationRefusal(env, [])).toMatch(/--remote/)
    expect(regenerationRefusal(env, ['--remote'])).toBeNull()
  })

  it('una base remota en producción necesita --production, no basta con --remote', () => {
    const env = {
      APP_ENV: 'production',
      DATABASE_URL: 'postgres://u:p@ep-algo.eu-central-1.aws.neon.tech/neondb',
    }
    expect(regenerationRefusal(env, ['--remote'])).toMatch(/--production/)
    expect(regenerationRefusal(env, ['--production'])).toBeNull()
  })

  it('una DATABASE_URL que no se entiende cuenta como remota', () => {
    expect(regenerationRefusal({ DATABASE_URL: 'no es una url' }, [])).toMatch(/--remote/)
  })
})

describe('pnpm media:sizes', () => {
  // `payload run` reescribe process.argv con minimist y solo conserva los argumentos sueltos:
  // --remote y --production se pierden salvo que lleguen detrás de `--`. pnpm añade los del
  // usuario al final del script, así que el script termina en `--`.
  it('pasa --remote y --production al script detrás de --', () => {
    expect(packageJson.scripts['media:sizes']).toMatch(/payload run scripts\/media-sizes\.ts --$/)
  })
})

describe('originalReader', () => {
  const r2 = {
    S3_ENDPOINT: 'https://cuenta.r2.cloudflarestorage.com',
    S3_BUCKET: 'torrente-media',
    S3_ACCESS_KEY_ID: 'clave-de-acceso',
    S3_SECRET_ACCESS_KEY: 'secreto-de-r2',
  }
  const original = Buffer.from('original')
  let staticDir: string
  let payload: Payload

  const media = (fields: Partial<Media>) =>
    ({ id: 1, filename: 'mapa.png', url: '/api/media/file/mapa.png', ...fields }) as Media

  const bucket = (send: ObjectGetter['send']) => ({
    send: vi.fn(send),
  })

  beforeEach(async () => {
    staticDir = await mkdtemp(path.join(tmpdir(), 'media-'))
    payload = {
      collections: { media: { config: { upload: { staticDir } } } },
    } as unknown as Payload
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await rm(staticDir, { recursive: true, force: true })
  })

  it('con R2 y sin MEDIA_BASE_URL lee el original del bucket, con su prefijo', async () => {
    const s3 = bucket(async () => ({
      Body: { transformToByteArray: async () => new Uint8Array(original) },
    }))
    const read = originalReader(payload, { env: r2, s3 })

    expect(await read(media({ prefix: 'guias' }))).toEqual(original)
    const [command] = s3.send.mock.calls[0]
    expect(command).toBeInstanceOf(GetObjectCommand)
    expect(command.input).toEqual({ Bucket: 'torrente-media', Key: 'guias/mapa.png' })
  })

  it('si el bucket falla, el error nombra la clave y nunca las credenciales', async () => {
    const s3 = bucket(async () => {
      throw Object.assign(new Error('The specified key does not exist.'), { name: 'NoSuchKey' })
    })
    const read = originalReader(payload, { env: r2, s3 })

    const error = await read(media({})).catch((caught: Error) => caught)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/torrente-media\/mapa\.png/)
    expect((error as Error).message).toMatch(/does not exist/)
    expect((error as Error).message).not.toMatch(/clave-de-acceso|secreto-de-r2/)
  })

  it('con MEDIA_BASE_URL descarga el original de su URL pública, sin pasar por el bucket', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(original)))
    vi.stubGlobal('fetch', fetchMock)
    const s3 = bucket(async () => ({}))
    const read = originalReader(payload, {
      env: { ...r2, MEDIA_BASE_URL: 'https://media.torrentearcano.com' },
      s3,
    })

    const url = 'https://media.torrentearcano.com/mapa.png'
    expect(await read(media({ url }))).toEqual(original)
    expect(fetchMock).toHaveBeenCalledWith(url)
    expect(s3.send).not.toHaveBeenCalled()
  })

  it('sin R2 lee el original del disco', async () => {
    await writeFile(path.join(staticDir, 'mapa.png'), original)
    const read = originalReader(payload, { env: {} })

    expect(await read(media({}))).toEqual(original)
    await expect(read(media({ filename: 'falta.png' }))).rejects.toThrow(/No está en/)
  })

  it('rechaza un nombre de archivo que sale de su carpeta', async () => {
    const s3 = bucket(async () => ({}))
    for (const env of [r2, {}]) {
      const read = originalReader(payload, { env, s3 })
      await expect(read(media({ filename: '../secreto.png' }))).rejects.toThrow(/no válido/)
    }
    expect(s3.send).not.toHaveBeenCalled()
  })
})
