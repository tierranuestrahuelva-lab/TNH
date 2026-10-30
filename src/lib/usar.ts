import { useMemo } from 'react'
import { useDatos, turnoId } from './datos'
import type { Fichaje } from './types'

export function useIndices() {
  const { turnos, empleados, config, fichajes } = useDatos()
  return useMemo(() => {
    const mt = new Map(turnos.map((t) => [turnoId(t.empleado_id, t.fecha), t]))
    const me = new Map(empleados.map((e) => [e.id, e]))
    const mf = new Map(config.festivos.map((f) => [f.fecha, f.nombre]))
    const fd = new Map<string, Fichaje[]>(), fa = new Map<string, Fichaje[]>()
    for (const f of fichajes) {
      const d = new Date(f.ts)
      const k = `${f.empleado_id}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const m = f.anulado ? fa : fd
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(f)
    }
    for (const l of [...fd.values(), ...fa.values()]) l.sort((a, b) => a.ts.localeCompare(b.ts))
    const activos = empleados.filter((e) => e.activo).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
    return {
      turnoDe: (e: string, f: string) => mt.get(turnoId(e, f)),
      empleado: (id: string) => me.get(id),
      festivoDe: (f: string) => mf.get(f),
      fichajesDe: (e: string, f: string) => fd.get(`${e}_${f}`) || [],
      anuladosDe: (e: string, f: string) => fa.get(`${e}_${f}`) || [],
      activos,
    }
  }, [turnos, empleados, config.festivos, fichajes])
}
