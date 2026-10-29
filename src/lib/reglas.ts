import type { Config, Empleado, Fichaje, Tramo, Turno } from './types'
import { aMin, diaSemana, fmtH, sumarDias } from './fechas'

export const minTramo = (t: Tramo) => { let d = aMin(t.f) - aMin(t.i); if (d <= 0) d += 1440; return d }
export const minTramos = (ts: Tramo[]) => ts.reduce((s, t) => s + minTramo(t), 0)
export const minTurno = (t?: Turno) => (t && t.tipo === 'trabajo' ? minTramos(t.tramos) : 0)
export const textoTramos = (ts: Tramo[]) => ts.map((t) => `${t.i}–${t.f}`).join(' · ')

export const TIPOS: Record<string, { label: string; corto: string; bg: string; fg: string; borde: string }> = {
  trabajo: { label: 'Trabajo', corto: 'Turno', bg: '#fbf2f6', fg: '#830040', borde: '#830040' },
  libre: { label: 'Libre', corto: 'Libre', bg: '#f4f4f5', fg: '#71717a', borde: '#d4d4d8' },
  vacaciones: { label: 'Vacaciones', corto: 'Vacaciones', bg: '#ecfdf5', fg: '#047857', borde: '#34d399' },
  baja: { label: 'Baja médica', corto: 'Baja', bg: '#fef2f2', fg: '#b91c1c', borde: '#f87171' },
  permiso: { label: 'Permiso', corto: 'Permiso', bg: '#fffbeb', fg: '#b45309', borde: '#fbbf24' },
  festivo: { label: 'Festivo', corto: 'Festivo', bg: '#eff6ff', fg: '#1d4ed8', borde: '#60a5fa' },
  formacion: { label: 'Formación', corto: 'Formación', bg: '#f5f3ff', fg: '#6d28d9', borde: '#a78bfa' },
}

export type Aviso = { nivel: 'error' | 'aviso' | 'info'; texto: string; empleado_id?: string; fecha?: string }

/** Comprueba la semana de un empleado según el Estatuto de los Trabajadores y la configuración */
export function avisosSemana(emp: Empleado, dias: string[], turnoDe: (e: string, f: string) => Turno | undefined, cfg: Config, festivoDe: (f: string) => string | undefined): Aviso[] {
  const r: Aviso[] = []
  let total = 0, libres = 0
  for (const f of dias) {
    const t = turnoDe(emp.id, f)
    const m = minTurno(t)
    total += m
    if (!t || t.tipo !== 'trabajo') { libres++; continue }
    if (m > cfg.max_horas_dia * 60) r.push({ nivel: 'error', texto: `${fmtH(m)} el ${f.slice(8)}: supera ${cfg.max_horas_dia} h/día`, empleado_id: emp.id, fecha: f })
    const larga = t.tramos.find((x) => minTramo(x) > 360)
    if (larga) r.push({ nivel: 'info', texto: `Jornada continuada de más de 6 h el día ${f.slice(8)}: corresponde pausa de 15 min`, empleado_id: emp.id, fecha: f })
    const fest = festivoDe(f)
    if (fest) r.push({ nivel: 'aviso', texto: `Trabaja en festivo (${fest}) el día ${f.slice(8)}`, empleado_id: emp.id, fecha: f })
    const ant = turnoDe(emp.id, sumarDias(f, -1))
    if (ant && ant.tipo === 'trabajo' && ant.tramos.length) {
      const fin = Math.max(...ant.tramos.map((x) => aMin(x.i) + minTramo(x)))
      const ini = Math.min(...t.tramos.map((x) => aMin(x.i))) + 1440
      if (ini - fin < cfg.descanso_min * 60) r.push({ nivel: 'error', texto: `Solo ${fmtH(ini - fin)} de descanso antes del día ${f.slice(8)} (mínimo ${cfg.descanso_min} h)`, empleado_id: emp.id, fecha: f })
    }
  }
  if (libres === 0) r.push({ nivel: 'error', texto: 'Sin ningún día libre esta semana (mínimo día y medio)', empleado_id: emp.id })
  const contrato = emp.horas_semana * 60
  if (contrato && total > contrato) r.push({ nivel: 'aviso', texto: `${fmtH(total - contrato)} por encima de su contrato (${emp.horas_semana} h)`, empleado_id: emp.id })
  return r
}

/** Huecos de apertura sin nadie asignado */
export function huecosCobertura(fecha: string, turnos: Turno[], cfg: Config): Tramo[] {
  const ap = cfg.apertura[diaSemana(fecha)] || []
  const huecos: Tramo[] = []
  for (const a of ap) {
    let ini = aMin(a.i)
    const fin = aMin(a.f)
    for (let m = ini; m < fin; m += 15) {
      const cubierto = turnos.some((t) => t.tipo === 'trabajo' && t.tramos.some((x) => aMin(x.i) <= m && aMin(x.i) + minTramo(x) > m))
      if (cubierto) { if (m > ini) huecos.push({ i: minToH(ini), f: minToH(m) }); ini = m + 15 }
    }
    if (ini < fin) huecos.push({ i: minToH(ini), f: minToH(fin) })
  }
  return huecos
}
const minToH = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Estado y minutos trabajados según los fichajes de un día */
export function resumenFichajes(fs: Fichaje[], ahora = Date.now()) {
  const orden = [...fs].sort((a, b) => a.ts.localeCompare(b.ts))
  let min = 0, desde: number | null = null
  let estado: 'fuera' | 'dentro' | 'pausa' = 'fuera'
  for (const f of orden) {
    const t = new Date(f.ts).getTime()
    if (f.tipo === 'entrada' || f.tipo === 'vuelta') { desde = t; estado = 'dentro' }
    else { if (desde !== null) min += (t - desde) / 6e4; desde = null; estado = f.tipo === 'pausa' ? 'pausa' : 'fuera' }
  }
  if (desde !== null) min += (ahora - desde) / 6e4
  return { min, estado, primera: orden[0], ultima: orden[orden.length - 1], abierto: desde !== null }
}
