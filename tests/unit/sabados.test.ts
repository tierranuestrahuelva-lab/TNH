import { describe, expect, it } from 'vitest'
import { compensarTurno, tocanSabado } from '../../src/lib/sabados'
import type { Turno } from '../../src/lib/types'

const ids = ['ana', 'juan', 'lucia']
const partido: Turno = { id: 't', empleado_id: 'ana', fecha: '2026-11-09', tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }] }

describe('sábados alternos', () => {
  it('[SAB-01] reparte en orden y vuelve a empezar', () => {
    expect([0, 1, 2, 3, 4].map((k) => tocanSabado(ids, 0, 1, k)[0])).toEqual(['ana', 'juan', 'lucia', 'ana', 'juan'])
    expect([0, 1, 2].map((k) => tocanSabado(ids, 2, 1, k)[0])).toEqual(['lucia', 'ana', 'juan'])
    expect(tocanSabado([], 0, 1, 0)).toEqual([])
  })
  it('[SAB-02] con 2 por sábado no se repite nadie el mismo día', () => {
    for (let k = 0; k < 12; k++) {
      const t = tocanSabado(ids, 1, 2, k)
      expect(t).toHaveLength(2)
      expect(new Set(t).size).toBe(2)
    }
    expect(tocanSabado(['ana'], 0, 3, 0)).toEqual(['ana'])
  })
  it('[SAB-03] compensación de mañana, tarde, día entero o nada', () => {
    expect(compensarTurno(partido, 'tarde')!.tramos).toEqual([{ i: '10:00', f: '14:00' }])
    expect(compensarTurno(partido, 'manana')!.tramos).toEqual([{ i: '17:30', f: '21:00' }])
    expect(compensarTurno(partido, 'dia')!.tipo).toBe('libre')
    expect(compensarTurno(partido, 'nada')).toBeNull()
    expect(compensarTurno({ ...partido, tipo: 'vacaciones', tramos: [] }, 'dia')).toBeNull()
    expect(compensarTurno({ ...partido, tramos: [{ i: '10:00', f: '14:00' }] }, 'tarde')).toBeNull()
    expect(compensarTurno({ ...partido, tramos: [{ i: '17:30', f: '21:00' }] }, 'tarde')!.tipo).toBe('libre')
  })
})
