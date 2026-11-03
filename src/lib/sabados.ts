import type { Config, Empleado, RuedaSabados, Turno } from './types'

/** Ruedas de sábados configuradas (una por grupo); compatible con la rueda única antigua */
export const ruedasDe = (c: Config): RuedaSabados[] =>
  c.ruedas_sabados?.length ? c.ruedas_sabados : c.sabados ? [{ ...c.sabados, id: c.sabados.id || 'r1', nombre: c.sabados.nombre || 'Sábados' }] : []

export function gruposPorPuesto(emps: Empleado[]) {
  const m = new Map<string, string[]>()
  for (const e of emps) { const p = e.puesto || 'Sin puesto'; m.set(p, [...(m.get(p) || []), e.id]) }
  return [...m].map(([puesto, ids]) => ({ puesto, ids }))
}
import { aMin } from './fechas'

/** Personas a las que les toca el sábado k (0 = el primero) */
export const tocanSabado = (ids: string[], primero: number, porSabado: number, k: number) => {
  const n = Math.min(porSabado, Math.max(ids.length, 1))
  return ids.length ? Array.from({ length: n }, (_, j) => ids[(primero + k * n + j) % ids.length]) : []
}

/** Turno compensado por trabajar el sábado, o null si no cambia */
export function compensarTurno(t: Turno | undefined, modo: RuedaSabados['compModo']): Turno | null {
  if (!t || t.tipo !== 'trabajo' || modo === 'nada') return null
  if (modo === 'dia') return { ...t, tipo: 'libre', tramos: [], centro: null, nota: 'Libre por trabajar el sábado' }
  const quedan = t.tramos.filter((x) => (modo === 'manana' ? aMin(x.i) >= 15 * 60 : aMin(x.i) < 15 * 60))
  if (quedan.length === t.tramos.length) return null
  if (!quedan.length) return { ...t, tipo: 'libre', tramos: [], centro: null, nota: 'Libre por trabajar el sábado' }
  return { ...t, tramos: quedan, nota: `Compensa sábado (${modo === 'manana' ? 'mañana' : 'tarde'} libre)` }
}
