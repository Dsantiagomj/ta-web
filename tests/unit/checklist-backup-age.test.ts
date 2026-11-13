import { describe, expect, it } from 'vitest'

import { calendarDaysBetween } from '@/components/checklist/progress-strings'

// «Tu última copia es de hoy / de ayer»: días del calendario en la zona horaria de quien lee,
// no bloques de 24 horas.

describe('calendarDaysBetween', () => {
  it('a las 23:30 y a las 00:10 del día siguiente hay un día', () => {
    expect(calendarDaysBetween(new Date(2026, 10, 13, 23, 30), new Date(2026, 10, 14, 0, 10))).toBe(
      1,
    )
  })

  it('el mismo día, aunque pasen horas, es hoy', () => {
    expect(calendarDaysBetween(new Date(2026, 10, 14, 0, 5), new Date(2026, 10, 14, 23, 55))).toBe(
      0,
    )
  })

  it('cuenta días aunque cambie la hora de verano', () => {
    expect(calendarDaysBetween(new Date(2026, 2, 28, 12), new Date(2026, 2, 30, 12))).toBe(2)
  })
})
