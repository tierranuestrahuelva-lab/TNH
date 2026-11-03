import { describe, expect, it } from 'vitest'
import { errorOlvido, fichajeDeOlvido, jornadasAbiertas, recordatorio, SIN_MOTIVO } from '../../src/lib/olvidos'
import { CONFIG_BASE as BASE } from '../../src/lib/config'
import type { Empleado, Fichaje, Solicitud, Turno } from '../../src/lib/types'

const ana: Empleado = { id: 'ana', nombre: 'Ana', puesto: 'Dependiente/a', horas_semana: 40, vacaciones_anuales: 30, activo: true, orden: 0 }
const com: Empleado = { ...ana, id: 'luis', puesto: 'Comercial' }
const turno: Turno = { id: 'ana_2026-11-11', empleado_id: 'ana', fecha: '2026-11-11', tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }] }
const a = (h: string) => new Date(`2026-11-11T${h}:00`).getTime()
const fx = (tipo: Fichaje['tipo'], fecha: string, h: string): Fichaje => ({ id: tipo + h, empleado_id: 'ana', tipo, ts: new Date(`${fecha}T${h}:00`).toISOString() })

describe('recordatorios', () => {
  it('[REC-01] aviso de entrada a partir de 5 min de retraso; nunca a horario libre', () => {
    expect(recordatorio(ana, BASE, turno, [], a('10:04'))).toBeNull()
    expect(recordatorio(ana, BASE, turno, [], a('10:05'))).toEqual({ tipo: 'entrada', hora: '10:00' })
    expect(recordatorio(ana, BASE, turno, [fx('entrada', '2026-11-11', '10:01')], a('10:30'))).toBeNull()
    expect(recordatorio(com, BASE, { ...turno, empleado_id: 'luis' }, [], a('10:30'))).toBeNull()
    expect(recordatorio(ana, BASE, { ...turno, tipo: 'libre', tramos: [] }, [], a('10:30'))).toBeNull()
  })
  it('[REC-02] aviso de salida pasado el margen con la jornada abierta', () => {
    const fs = [fx('entrada', '2026-11-11', '10:00')]
    expect(recordatorio(ana, BASE, turno, fs, a('14:14'))).toBeNull()
    expect(recordatorio(ana, BASE, turno, fs, a('14:15'))).toEqual({ tipo: 'salida', hora: '14:00' })
    expect(recordatorio(ana, BASE, turno, [...fs, fx('salida', '2026-11-11', '14:02')], a('15:00'))).toBeNull()
  })
})

describe('fichajes olvidados', () => {
  const ok = { fecha: '2026-11-10', tipo: 'salida' as const, hora: '14:05', motivo: 'Se me olvidó' }
  const dia = [fx('entrada', '2026-11-10', '10:00')]
  it('[OLV-01] validación de la petición', () => {
    expect(errorOlvido(ok, dia, [], a('10:30'))).toBeNull()
    expect(errorOlvido({ ...ok, motivo: ' ' }, dia, [], a('10:30'))).toBe(SIN_MOTIVO)
    expect(errorOlvido({ ...ok, hora: '09:00' }, dia, [], a('10:30'))).toMatch(/después de la entrada \(10:00\)/)
    expect(errorOlvido({ ...ok, fecha: '2026-11-11', hora: '12:00' }, [], [], a('10:30'))).toMatch(/todavía no ha llegado/)
    expect(errorOlvido({ ...ok, fecha: '2026-10-01' }, [], [], a('10:30'))).toMatch(/último mes/)
    const pend: Solicitud = { id: 's', empleado_id: 'ana', tipo: 'fichaje', desde: ok.fecha, hasta: ok.fecha, estado: 'pendiente', fichaje: { tipo: 'salida', hora: '14:05' } }
    expect(errorOlvido(ok, dia, [pend], a('10:30'))).toMatch(/Ya has pedido/)
  })
  it('[OLV-02] al aprobar se crea el fichaje marcado como corrección a petición del trabajador', () => {
    const s: Solicitud = { id: 's', empleado_id: 'ana', tipo: 'fichaje', desde: '2026-11-10', hasta: '2026-11-10', motivo: 'Último reparto', estado: 'pendiente', fichaje: { tipo: 'salida', hora: '14:05' } }
    const f = fichajeDeOlvido(s)
    expect(f).toMatchObject({ empleado_id: 'ana', tipo: 'salida', ts: new Date('2026-11-10T14:05:00').toISOString(), editado: true })
    expect(f.nota).toContain('Último reparto')
    expect(f.editado_por).toContain('petición del trabajador')
  })
  it('[OLV-03] jornadas abiertas de la última semana', () => {
    const fs: Record<string, Fichaje[]> = { '2026-11-10': [fx('entrada', '2026-11-10', '10:00')], '2026-11-09': [fx('entrada', '2026-11-09', '10:00'), fx('salida', '2026-11-09', '14:00')], '2026-11-02': [fx('entrada', '2026-11-02', '10:00')] }
    expect(jornadasAbiertas('ana', (_e, d) => fs[d] || [], '2026-11-11')).toEqual(['2026-11-10'])
  })
})
