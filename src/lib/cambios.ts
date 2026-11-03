import type { Solicitud, Tramo, Turno } from './types'
import { TIPOS, textoTramos } from './reglas'

export const esCambioHorario = (s: Solicitud) => s.tipo === 'cambio' && Array.isArray(s.tramos)

export const tramosValidos = (ts: Tramo[]) => ts.every((t, k) => t.i && t.f && t.i < t.f && (k === 0 || ts[k - 1].f <= t.i))

export const textoHorario = (h?: Pick<Turno, 'tipo' | 'tramos'> | null) => (!h ? 'Sin asignar' : h.tipo === 'trabajo' ? textoTramos(h.tramos) : TIPOS[h.tipo].label)

export const horarioPedido = (s: Solicitud): Pick<Turno, 'tipo' | 'tramos'> => ({ tipo: s.tramos?.length ? 'trabajo' : 'libre', tramos: s.tramos || [] })

export function aplicarCambio(s: Solicitud, actual?: Turno | null) {
  const turno: Turno = { id: `${s.empleado_id}_${s.desde}`, empleado_id: s.empleado_id, fecha: s.desde, ...horarioPedido(s), centro: actual?.centro ?? null, nota: `Cambio pedido: ${s.motivo || ''}`.slice(0, 200) }
  return { turno, turno_antes: actual ? { tipo: actual.tipo, tramos: actual.tramos } : null }
}
