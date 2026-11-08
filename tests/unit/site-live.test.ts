import { describe, expect, it } from 'vitest'

import { liveState } from '@/lib/site/live'

describe('el directo de Torre', () => {
  it('sin la API de Twitch, nunca está en directo', () => {
    expect(liveState(undefined, { NODE_ENV: 'production' })).toEqual({ live: false })
  })

  it('?directo=1 no hace nada en producción', () => {
    expect(liveState('1', { NODE_ENV: 'production' })).toEqual({ live: false })
    expect(liveState('1', { NODE_ENV: 'production', APP_ENV: 'prod' })).toEqual({ live: false })
  })

  it('en desarrollo y en el entorno dev, ?directo=1 lo simula', () => {
    expect(liveState('1', { NODE_ENV: 'development' })).toEqual({ live: true })
    expect(liveState('1', { NODE_ENV: 'production', APP_ENV: 'dev' })).toEqual({ live: true })
    expect(liveState('0', { NODE_ENV: 'development' })).toEqual({ live: false })
  })
})
