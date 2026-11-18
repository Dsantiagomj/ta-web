import { createServer, request, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createRequire } from 'node:module'
import { gunzipSync } from 'node:zlib'

import { NodeNextRequest, NodeNextResponse } from 'next/dist/server/base-http/node'
import { sendResponse } from 'next/dist/server/send-response'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Next hasta 16.4.5 guardaba cada cabecera de un route handler como array, y su
// `compression` no comprimía nada porque solo acepta un `Content-Type` de texto: el índice
// de búsqueda, el sitemap y la API de Payload salían sin comprimir. 16.4.6 lo arregla;
// esta prueba avisa si una versión futura lo rompe de nuevo (AGENTS.md, Next rules).
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void
const compression = createRequire(import.meta.url)(
  'next/dist/compiled/compression',
) as () => Middleware

// Más de 1 KB, el mínimo a partir del cual `compression` comprime.
const BODY = JSON.stringify({
  guides: Array.from({ length: 200 }, (_, i) => [`Misión ${i}`, `mision-${i}`]),
})

let origin = ''
const server = createServer((req, res) => {
  // Lo mismo que hace `router-server.js` de Next antes de servir cada petición.
  compression()(req, res, () => {})
  const response = new Response(BODY, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  })
  void sendResponse(new NodeNextRequest(req), new NodeNextResponse(res), response)
})

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

function get(headers: Record<string, string>) {
  return new Promise<{ headers: IncomingMessage['headers']; body: Buffer }>((resolve, reject) => {
    request(`${origin}/api/search/guides`, { headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }))
      res.on('error', reject)
    })
      .on('error', reject)
      .end()
  })
}

describe('Next comprime los route handlers', () => {
  it('comprime con gzip la respuesta de un route handler cuando el navegador lo acepta', async () => {
    const { headers, body } = await get({ 'Accept-Encoding': 'gzip' })

    expect(headers['content-encoding']).toBe('gzip')
    expect(headers.vary).toMatch(/Accept-Encoding/i)
    expect(headers['content-type']).toBe('application/json')
    expect(gunzipSync(body).toString()).toBe(BODY)
  })

  it('manda el JSON sin comprimir a quien no pide compresión', async () => {
    const { headers, body } = await get({ 'Accept-Encoding': 'identity' })

    expect(headers['content-encoding']).toBeUndefined()
    expect(body.toString()).toBe(BODY)
  })

  it('guarda una cabecera de un solo valor como texto y una repetida como lista', () => {
    const stored = new Map<string, number | string | string[]>()
    const res = {
      getHeader: (name: string) => stored.get(name.toLowerCase()),
      setHeader: (name: string, value: number | string | string[]) => {
        stored.set(name.toLowerCase(), value)
        return res
      },
    } as unknown as ServerResponse
    const next = new NodeNextResponse(res)

    next.appendHeader('Content-Type', 'application/json')
    next.appendHeader('Set-Cookie', 'a=1')
    next.appendHeader('Set-Cookie', 'b=2')

    expect(stored.get('content-type')).toBe('application/json')
    expect(stored.get('set-cookie')).toEqual(['a=1', 'b=2'])
  })
})
