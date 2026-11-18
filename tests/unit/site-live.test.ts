import { describe, expect, it, vi } from 'vitest'

import {
  fetchLiveState,
  liveState,
  liveUrl,
  parseLiveResponse,
  TWITCH_LIVE_URL,
} from '@/lib/site/live'

const URL_OK = 'https://directo.example/'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('el directo de Torre: la respuesta del worker', () => {
  it('sin directo, como responde hoy el worker', () => {
    expect(
      parseLiveResponse({
        live: false,
        channel: 'torrentearcano',
        url: 'https://www.twitch.tv/torrentearcano',
      }),
    ).toEqual({ live: false })
  })

  it('en directo, con el título del directo si lo trae', () => {
    expect(parseLiveResponse({ live: true, title: '  Misiones de Frigost  ' })).toEqual({
      live: true,
      title: 'Misiones de Frigost',
    })
    expect(parseLiveResponse({ live: true })).toEqual({ live: true })
  })

  it('un título vacío o que no es texto no cuenta', () => {
    expect(parseLiveResponse({ live: true, title: '   ' })).toEqual({ live: true })
    expect(parseLiveResponse({ live: true, title: 42 })).toEqual({ live: true })
    expect(parseLiveResponse({ live: true, title: null })).toEqual({ live: true })
  })

  it('sin un live booleano verdadero, no está en directo', () => {
    for (const body of [
      { live: 'true' },
      { live: 1 },
      { title: 'x' },
      {},
      null,
      'live',
      [true],
      42,
    ]) {
      expect(parseLiveResponse(body)).toEqual({ live: false })
    }
  })
})

describe('el directo de Torre: la lectura del worker', () => {
  it('lee el worker y devuelve su estado', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ live: true, title: 'Rush de Dofus' }))
    await expect(fetchLiveState(URL_OK, { fetch: fetcher })).resolves.toEqual({
      live: true,
      title: 'Rush de Dofus',
    })
    expect(fetcher).toHaveBeenCalledWith(
      URL_OK,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('una respuesta que no es 2xx no está en directo', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ live: true }, { status: 503 }))
    await expect(fetchLiveState(URL_OK, { fetch: fetcher })).resolves.toEqual({ live: false })
  })

  it('un JSON roto no está en directo', async () => {
    const fetcher = vi.fn(async () => new Response('<html>no</html>', { status: 200 }))
    await expect(fetchLiveState(URL_OK, { fetch: fetcher })).resolves.toEqual({ live: false })
  })

  it('un error de red no está en directo', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(fetchLiveState(URL_OK, { fetch: fetcher })).resolves.toEqual({ live: false })
  })

  it('si el worker no contesta a tiempo, corta y no está en directo', async () => {
    let aborted = false
    // Un worker colgado: solo termina cuando la señal corta la petición.
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true
            reject(init.signal?.reason)
          })
        }),
    )
    const started = Date.now()
    await expect(fetchLiveState(URL_OK, { fetch: fetcher, timeoutMs: 30 })).resolves.toEqual({
      live: false,
    })
    expect(aborted).toBe(true)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('sin URL (TWITCH_LIVE_URL=off) no pregunta a nadie', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ live: true }))
    await expect(fetchLiveState(null, { fetch: fetcher })).resolves.toEqual({ live: false })
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('el directo de Torre: la URL del worker', () => {
  it('por defecto, el worker de Torre', () => {
    expect(TWITCH_LIVE_URL).toBe('https://torrente-twitch-live.torrentearcano.workers.dev/')
    expect(liveUrl({})).toBe(TWITCH_LIVE_URL)
    expect(liveUrl({ TWITCH_LIVE_URL: '  ' })).toBe(TWITCH_LIVE_URL)
  })

  it('TWITCH_LIVE_URL la cambia, y off la apaga', () => {
    expect(liveUrl({ TWITCH_LIVE_URL: ' https://otro.example/ ' })).toBe('https://otro.example/')
    expect(liveUrl({ TWITCH_LIVE_URL: 'off' })).toBeNull()
    expect(liveUrl({ TWITCH_LIVE_URL: 'OFF' })).toBeNull()
  })
})

describe('el directo de Torre: lo que ve la portada', () => {
  const offline = vi.fn(async () => ({ live: false }))

  it('fuera de la simulación, lo que diga el worker', async () => {
    const read = vi.fn(async () => ({ live: true, title: 'Ocre' }))
    await expect(liveState(undefined, { NODE_ENV: 'production' }, read)).resolves.toEqual({
      live: true,
      title: 'Ocre',
    })
    expect(read).toHaveBeenCalledOnce()
  })

  it('?directo=1 no hace nada en producción', async () => {
    await expect(liveState('1', { NODE_ENV: 'production' }, offline)).resolves.toEqual({
      live: false,
    })
    await expect(
      liveState('1', { NODE_ENV: 'production', APP_ENV: 'prod' }, offline),
    ).resolves.toEqual({ live: false })
  })

  it('en desarrollo y en el entorno dev, ?directo=1 lo simula sin leer el worker', async () => {
    const read = vi.fn(async () => ({ live: false }))
    await expect(liveState('1', { NODE_ENV: 'development' }, read)).resolves.toEqual({
      live: true,
    })
    await expect(liveState('1', { NODE_ENV: 'production', APP_ENV: 'dev' }, read)).resolves.toEqual(
      { live: true },
    )
    expect(read).not.toHaveBeenCalled()
    await expect(liveState('0', { NODE_ENV: 'development' }, offline)).resolves.toEqual({
      live: false,
    })
  })
})
