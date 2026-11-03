import { describe, expect, it } from 'vitest'
import { aplicarCambio, esCambioHorario, textoHorario, tramosValidos } from '../../src/lib/cambios'
import type { Solicitud, Turno } from '../../src/lib/types'

const sol = (o: Partial<Solicitud> = {}): Solicitud => ({ id: 's', empleado_id: 'ana', tipo: 'cambio', desde: '2026-11-12', hasta: '2026-11-12', motivo: 'Médico', estado: 'pendiente', tramos: [{ i: '11:00', f: '15:00' }], ...o })
const actual: Turno = { id: 'ana_2026-11-12', empleado_id: 'ana', fecha: '2026-11-12', tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }], centro: 'Tienda', nota: null }

describe('cambios de horario', () => {
  it('[AUS-03] horas válidas y solicitudes antiguas sin horario', () => {
    expect(tramosValidos([{ i: '10:00', f: '14:00' }, { i: '17:00', f: '20:00' }])).toBe(true)
    expect(tramosValidos([{ i: '14:00', f: '10:00' }])).toBe(false)
    expect(tramosValidos([{ i: '10:00', f: '14:00' }, { i: '13:00', f: '20:00' }])).toBe(false)
    expect(esCambioHorario(sol())).toBe(true)
    expect(esCambioHorario(sol({ tramos: undefined }))).toBe(false)
  })
  it('[AUS-04] aprobar aplica el horario pedido y guarda el anterior', () => {
    const { turno, turno_antes } = aplicarCambio(sol(), actual)
    expect(turno).toMatchObject({ id: 'ana_2026-11-12', tipo: 'trabajo', tramos: [{ i: '11:00', f: '15:00' }], centro: 'Tienda', nota: 'Cambio pedido: Médico' })
    expect(turno_antes).toEqual({ tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }] })
    expect(textoHorario(turno_antes)).toBe('10:00–14:00')
    const libre = aplicarCambio(sol({ tramos: [] }), undefined)
    expect(libre.turno.tipo).toBe('libre')
    expect(libre.turno_antes).toBeNull()
  })
})
