import { describe, expect, it } from 'vitest'
import { avisosSemana, huecosCobertura, minTramo, minTurno, resumenFichajes } from '../../src/lib/reglas'
import { CONFIG_BASE } from '../../src/lib/config'
import { semana } from '../../src/lib/fechas'
import type { Empleado, Fichaje, Tramo, Turno } from '../../src/lib/types'

const emp: Empleado = { id: 'ana', nombre: 'Ana', horas_semana: 40, vacaciones_anuales: 30, activo: true, orden: 0 }
const turno = (fecha: string, tramos: Tramo[], tipo: Turno['tipo'] = 'trabajo'): Turno => ({ id: `ana_${fecha}`, empleado_id: 'ana', fecha, tipo, tramos })
const avisos = (ts: Turno[], e = emp, lunes = '2026-11-09') => {
  const m = new Map(ts.map((t) => [t.fecha, t]))
  const fest = new Map(CONFIG_BASE.festivos.map((f) => [f.fecha, f.nombre]))
  return avisosSemana(e, semana(lunes), (_e, f) => m.get(f), CONFIG_BASE, (f) => fest.get(f))
}
const fich = (tipo: Fichaje['tipo'], hora: string, dia = '2026-11-10'): Fichaje => ({ id: tipo + hora, empleado_id: 'ana', tipo, ts: new Date(`${dia}T${hora}:00+01:00`).toISOString() })

describe('cuadrante', () => {
  it('[CUA-01] un turno que pasa de medianoche cuenta bien', () => {
    expect(minTramo({ i: '22:00', f: '02:00' })).toBe(240)
    expect(minTurno(turno('2026-11-09', [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }]))).toBe(450)
    expect(minTurno(turno('2026-11-09', [], 'vacaciones'))).toBe(0)
  })
  it('[CUA-02] [CUA-06] más de 9 h en un día y tramo de más de 6 h', () => {
    const a = avisos([turno('2026-11-09', [{ i: '08:00', f: '18:00' }])])
    expect(a.some((x) => x.nivel === 'error' && x.texto.includes('supera 9 h'))).toBe(true)
    expect(a.some((x) => x.nivel === 'info' && x.texto.includes('pausa de 15 min'))).toBe(true)
  })
  it('[CUA-02] 9 h justas no es error', () => {
    expect(avisos([turno('2026-11-09', [{ i: '09:00', f: '14:00' }, { i: '16:00', f: '20:00' }])]).filter((x) => x.nivel === 'error')).toHaveLength(0)
  })
  it('[CUA-03] menos de 12 h de descanso entre jornadas', () => {
    const a = avisos([turno('2026-11-09', [{ i: '14:00', f: '23:00' }]), turno('2026-11-10', [{ i: '08:00', f: '14:00' }])])
    expect(a.some((x) => x.nivel === 'error' && x.texto.includes('de descanso'))).toBe(true)
    const b = avisos([turno('2026-11-09', [{ i: '10:00', f: '20:00' }]), turno('2026-11-10', [{ i: '08:00', f: '14:00' }])])
    expect(b.some((x) => x.texto.includes('de descanso'))).toBe(false)
  })
  it('[CUA-04] semana sin ningún día libre', () => {
    const ts = semana('2026-11-09').map((f) => turno(f, [{ i: '10:00', f: '14:00' }]))
    expect(avisos(ts).some((x) => x.nivel === 'error' && x.texto.includes('Sin ningún día libre'))).toBe(true)
    expect(avisos(ts.slice(0, 6)).some((x) => x.texto.includes('Sin ningún día libre'))).toBe(false)
  })
  it('[CUA-05] por encima del contrato y trabajo en festivo', () => {
    const ts = semana('2026-11-09').slice(0, 6).map((f) => turno(f, [{ i: '09:00', f: '15:00' }]))
    expect(avisos(ts, { ...emp, horas_semana: 30 }).some((x) => x.nivel === 'aviso' && x.texto.includes('por encima de su contrato'))).toBe(true)
    expect(avisos(ts, { ...emp, horas_semana: 40 }).some((x) => x.texto.includes('por encima'))).toBe(false)
    const f = avisos([turno('2026-12-08', [{ i: '10:00', f: '14:00' }])], emp, '2026-12-07')
    expect(f.some((x) => x.nivel === 'aviso' && x.texto.includes('Inmaculada'))).toBe(true)
  })
  it('[CUA-07] huecos sin cubrir en el horario de apertura', () => {
    const t = (tramos: Tramo[]) => [turno('2026-11-09', tramos)]
    expect(huecosCobertura('2026-11-09', [], CONFIG_BASE)).toEqual([{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }])
    expect(huecosCobertura('2026-11-09', t([{ i: '10:00', f: '14:00' }]), CONFIG_BASE)).toEqual([{ i: '17:30', f: '21:00' }])
    expect(huecosCobertura('2026-11-09', t([{ i: '10:00', f: '12:00' }, { i: '17:30', f: '21:00' }]), CONFIG_BASE)).toEqual([{ i: '12:00', f: '14:00' }])
    expect(huecosCobertura('2026-11-09', t([{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }]), CONFIG_BASE)).toEqual([])
    expect(huecosCobertura('2026-11-15', [], CONFIG_BASE)).toEqual([])
  })
})

describe('fichajes', () => {
  it('[FIC-04] descuenta las pausas y da el estado', () => {
    const r = resumenFichajes([fich('entrada', '10:00'), fich('pausa', '12:00'), fich('vuelta', '12:30'), fich('salida', '14:30')])
    expect(Math.round(r.min)).toBe(240 - 30 + 30)
    expect(r.estado).toBe('fuera')
    expect(r.abierto).toBe(false)
  })
  it('[FIC-04] da igual el orden en que lleguen los fichajes', () => {
    const r = resumenFichajes([fich('salida', '14:00'), fich('entrada', '10:00')])
    expect(Math.round(r.min)).toBe(240)
  })
  it('[FIC-04] un día abierto cuenta hasta ahora', () => {
    const ahora = new Date('2026-11-10T11:15:00+01:00').getTime()
    const r = resumenFichajes([fich('entrada', '10:00')], ahora)
    expect(Math.round(r.min)).toBe(75)
    expect(r.estado).toBe('dentro')
    const p = resumenFichajes([fich('entrada', '10:00'), fich('pausa', '11:00')], ahora)
    expect(p.estado).toBe('pausa')
    expect(Math.round(p.min)).toBe(60)
  })
  it('[FIC-04] una salida sin entrada no suma horas', () => {
    expect(resumenFichajes([fich('salida', '14:00')]).min).toBe(0)
  })
})
