import { describe, expect, it } from 'vitest'
import { compensarTurno, gruposPorPuesto, ruedasDe, tocanSabado } from '../../src/lib/sabados'
import { CONFIG_BASE } from '../../src/lib/config'
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

describe('ruedas por grupo', () => {
  const e = (id: string, puesto: string) => ({ id, nombre: id, puesto, horas_semana: 40, vacaciones_anuales: 30, activo: true, orden: 0 })
  it('[SAB-04] agrupa por puesto y cada grupo rota solo entre los suyos', () => {
    const g = gruposPorPuesto([e('ana', 'Dependienta'), e('juan', 'Repartidor/a'), e('eva', 'Dependienta'), e('luis', 'Repartidor/a')])
    expect(g).toEqual([{ puesto: 'Dependienta', ids: ['ana', 'eva'] }, { puesto: 'Repartidor/a', ids: ['juan', 'luis'] }])
    const dep = [0, 1, 2, 3].map((k) => tocanSabado(g[0].ids, 0, 1, k)[0])
    const rep = [0, 1, 2, 3].map((k) => tocanSabado(g[1].ids, 0, 1, k)[0])
    expect(dep).toEqual(['ana', 'eva', 'ana', 'eva'])
    expect(rep).toEqual(['juan', 'luis', 'juan', 'luis'])
    expect(tocanSabado([], 0, 1, 0)).toEqual([])
  })
  it('[SAB-04] la rueda única antigua sigue funcionando', () => {
    const vieja = { ids: ['ana'], porSabado: 1, tramos: [], inicio: '2026-11-09', primero: 0, compDia: 0, compModo: 'nada' as const }
    expect(ruedasDe({ ...CONFIG_BASE, sabados: vieja })).toMatchObject([{ id: 'r1', ids: ['ana'] }])
    expect(ruedasDe({ ...CONFIG_BASE, sabados: vieja, ruedas_sabados: [{ ...vieja, id: 'x', nombre: 'Repartidor/a' }] })).toHaveLength(1)
    expect(ruedasDe(CONFIG_BASE)).toEqual([])
  })
})
