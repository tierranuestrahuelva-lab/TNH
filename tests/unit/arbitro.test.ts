// Ronda del árbitro: casos rebuscados para intentar romper la app.
import { describe, expect, it } from 'vitest'
import { avisosSemana, minutosDia, resumenFichajes } from '../../src/lib/reglas'
import { CONFIG_BASE } from '../../src/lib/config'
import { semana } from '../../src/lib/fechas'
import type { Empleado, Fichaje, Turno } from '../../src/lib/types'

const f = (tipo: Fichaje['tipo'], ts: string): Fichaje => ({ id: tipo + ts, empleado_id: 'ana', tipo, ts: new Date(ts).toISOString() })

describe('árbitro', () => {
  it('[FIC-05] una salida olvidada ayer no sigue sumando horas hoy', () => {
    const ahora = new Date('2026-11-11T10:30:00+01:00').getTime()
    const ayer = [f('entrada', '2026-11-10T10:00:00+01:00')]
    const m = minutosDia(ayer, '2026-11-10', ahora)
    expect(Math.round(m)).toBe(14 * 60)
  })
  it('[FIC-04] el día de hoy abierto cuenta hasta ahora', () => {
    const ahora = new Date('2026-11-11T10:30:00+01:00').getTime()
    expect(Math.round(minutosDia([f('entrada', '2026-11-11T09:00:00+01:00')], '2026-11-11', ahora))).toBe(90)
  })
  it('[FIC-05] el día del cambio de hora (25 h) no se descuadra', () => {
    const ahora = new Date('2026-10-27T10:00:00+01:00').getTime()
    const m = minutosDia([f('entrada', '2026-10-25T22:00:00+01:00')], '2026-10-25', ahora)
    expect(Math.round(m)).toBe(120)
  })
  it('[CUA-03] turno de noche seguido de mañana: descanso corto', () => {
    const emp: Empleado = { id: 'ana', nombre: 'Ana', horas_semana: 40, vacaciones_anuales: 30, activo: true, orden: 0 }
    const ts: Turno[] = [
      { id: '1', empleado_id: 'ana', fecha: '2026-11-09', tipo: 'trabajo', tramos: [{ i: '22:00', f: '02:00' }] },
      { id: '2', empleado_id: 'ana', fecha: '2026-11-10', tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }] },
    ]
    const m = new Map(ts.map((t) => [t.fecha, t]))
    const a = avisosSemana(emp, semana('2026-11-09'), (_e, d) => m.get(d), CONFIG_BASE, () => undefined)
    expect(a.find((x) => x.texto.includes('de descanso'))?.texto).toContain('Solo 8h')
  })
  it('[FIC-04] doble toque en "entrada" no hace perder el tiempo ya trabajado', () => {
    const r = resumenFichajes([f('entrada', '2026-11-11T09:00:00+01:00'), f('entrada', '2026-11-11T09:40:00+01:00'), f('salida', '2026-11-11T13:00:00+01:00')])
    expect(Math.round(r.min)).toBe(240)
  })
  it('[FIC-04] una salida sin entrada no resta horas', () => {
    const r = resumenFichajes([f('salida', '2026-11-11T09:00:00+01:00'), f('entrada', '2026-11-11T10:00:00+01:00'), f('salida', '2026-11-11T11:00:00+01:00')])
    expect(Math.round(r.min)).toBe(60)
  })
})
