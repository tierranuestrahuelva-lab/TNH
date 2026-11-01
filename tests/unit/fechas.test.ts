import { describe, expect, it } from 'vitest'
import { aMin, deMin, diaSemana, diasMes, fmtH, lunesDe, numSemana, rango, sumarDias, sumarMes } from '../../src/lib/fechas'

describe('fechas', () => {
  it('[FEC-01] sumar días en los cambios de hora de marzo y octubre', () => {
    expect(sumarDias('2026-03-28', 1)).toBe('2026-03-29')
    expect(sumarDias('2026-03-29', 1)).toBe('2026-03-30')
    expect(sumarDias('2026-10-25', 1)).toBe('2026-10-26')
    expect(sumarDias('2026-10-26', -1)).toBe('2026-10-25')
    expect(rango('2026-10-23', '2026-10-27')).toHaveLength(5)
    expect(rango('2026-03-27', '2026-03-31')).toHaveLength(5)
  })
  it('[FEC-02] la semana empieza en lunes y el domingo es de la semana anterior', () => {
    expect(diaSemana('2026-11-09')).toBe(0)
    expect(diaSemana('2026-11-01')).toBe(6)
    expect(lunesDe('2026-11-01')).toBe('2026-10-26')
    expect(lunesDe('2026-11-09')).toBe('2026-11-09')
  })
  it('[FEC-03] días de cada mes y número de semana ISO', () => {
    expect(diasMes('2026-02')).toHaveLength(28)
    expect(diasMes('2028-02')).toHaveLength(29)
    expect(diasMes('2026-04')).toHaveLength(30)
    expect(diasMes('2026-12')).toHaveLength(31)
    expect(sumarMes('2026-12', 1)).toBe('2027-01')
    expect(sumarMes('2026-01', -1)).toBe('2025-12')
    expect(numSemana('2026-01-01')).toBe(1)
    expect(numSemana('2026-11-09')).toBe(46)
    expect(numSemana('2026-12-31')).toBe(53)
    expect(numSemana('2027-01-04')).toBe(1)
  })
  it('[FIC-04] formato de horas y minutos', () => {
    expect(fmtH(0)).toBe('0h')
    expect(fmtH(125)).toBe('2h 05')
    expect(fmtH(-90)).toBe('-1h 30')
    expect(aMin('17:30')).toBe(1050)
    expect(deMin(1500)).toBe('01:00')
  })
})
