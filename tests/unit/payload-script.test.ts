import { describe, expect, it, vi } from 'vitest'

import { runPayloadScript } from '../../scripts/payload-script'

// Un script de `payload run` sale con 0 si termina sin lanzar: el fallo lo marca exit(1), que
// debe llegar aunque Payload no arranque o no se cierre.

function setup(destroy: () => Promise<void> = async () => {}) {
  const payload = { destroy: vi.fn(destroy) }
  const exit = vi.fn()
  const log = vi.fn()
  return { payload, exit, log }
}

describe('runPayloadScript', () => {
  it('corre la tarea, cierra Payload y no marca fallo', async () => {
    const { payload, exit, log } = setup()
    const task = vi.fn(async () => {})
    await runPayloadScript(async () => payload, task, { label: 'Informe', exit, log })
    expect(task).toHaveBeenCalledWith(payload)
    expect(payload.destroy).toHaveBeenCalledOnce()
    expect(exit).not.toHaveBeenCalled()
  })

  it('si Payload no arranca, lo dice y sale con 1', async () => {
    const { exit, log } = setup()
    const task = vi.fn(async () => {})
    await runPayloadScript(
      async () => {
        throw new Error('sin base')
      },
      task,
      { label: 'Informe', exit, log },
    )
    expect(task).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('Informe falló:', expect.any(Error))
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('si la tarea falla y además Payload no se cierra, sale con 1 igual', async () => {
    const { payload, exit, log } = setup(async () => {
      throw new Error('no cierra')
    })
    await runPayloadScript(
      async () => payload,
      async () => {
        throw new Error('falla')
      },
      { label: 'Informe', exit, log },
    )
    expect(payload.destroy).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledTimes(2)
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('si solo falla el cierre, también sale con 1', async () => {
    const { payload, exit, log } = setup(async () => {
      throw new Error('no cierra')
    })
    await runPayloadScript(
      async () => payload,
      async () => {},
      { label: 'Informe', exit, log },
    )
    expect(exit).toHaveBeenCalledWith(1)
  })
})
