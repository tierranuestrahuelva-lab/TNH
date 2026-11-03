import type { Config, Empleado, Fichaje, Solicitud, TipoFichaje, Turno } from './types'
import { aMin, horaDe, iso, sumarDias, uid } from './fechas'
import { resumenFichajes } from './reglas'
import { flexible } from './geo'

export const NOMBRE_FICHAJE: Record<TipoFichaje, string> = { entrada: 'Entrada', pausa: 'Inicio de pausa', vuelta: 'Fin de pausa', salida: 'Salida' }
export const MARGEN_ENTRADA = 5
export const DIAS_OLVIDO = 31
export const SIN_MOTIVO = 'Escribe el motivo'

export const esOlvido = (s: Solicitud) => s.tipo === 'fichaje' && !!s.fichaje
export const tsDe = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00`).toISOString()
export const textoOlvido = (s: Solicitud) => (s.fichaje ? `${NOMBRE_FICHAJE[s.fichaje.tipo]} a las ${s.fichaje.hora}` : '')
export const olvidoPendiente = (ss: Solicitud[], emp: string, fecha: string, tipo?: TipoFichaje) =>
  ss.some((s) => esOlvido(s) && s.estado === 'pendiente' && s.empleado_id === emp && s.desde === fecha && (!tipo || s.fichaje!.tipo === tipo))

type Olvido = { fecha: string; tipo: TipoFichaje; hora: string; motivo: string }
/** Motivo por el que no se puede enviar la petición, o null si es correcta */
export function errorOlvido(o: Olvido, fsDia: Fichaje[], mias: Solicitud[], ahora = Date.now()): string | null {
  const hoyS = iso(new Date(ahora))
  if (!o.fecha || !o.hora) return 'Indica el día y la hora'
  if (new Date(`${o.fecha}T${o.hora}:00`).getTime() > ahora) return 'Esa hora todavía no ha llegado'
  if (o.fecha < sumarDias(hoyS, -DIAS_OLVIDO)) return 'Solo se pueden pedir correcciones del último mes'
  if (mias.some((s) => esOlvido(s) && s.estado === 'pendiente' && s.desde === o.fecha && s.fichaje!.tipo === o.tipo && s.fichaje!.hora === o.hora)) return 'Ya has pedido esta corrección: espera a que la revisen'
  if (fsDia.some((f) => f.tipo === o.tipo && horaDe(f.ts) === o.hora)) return 'Ese fichaje ya está registrado'
  const horas = (t: TipoFichaje[]) => fsDia.filter((f) => t.includes(f.tipo)).map((f) => horaDe(f.ts))
  const ent = horas(['entrada'])
  if (o.tipo === 'salida' && ent.length && ent.every((h) => h >= o.hora)) return `La salida tiene que ser después de la entrada (${ent[0]})`
  const sal = horas(['salida'])
  if (o.tipo === 'entrada' && sal.length && sal.every((h) => h <= o.hora)) return `La entrada tiene que ser antes de la salida (${sal[sal.length - 1]})`
  if (!o.motivo.trim()) return SIN_MOTIVO
  return null
}

/** Fichaje que se añade al registro al aprobar la petición (queda marcado como corrección) */
export function fichajeDeOlvido(s: Solicitud, ahora = new Date()): Fichaje {
  const n = ahora.toISOString()
  return {
    id: uid(), empleado_id: s.empleado_id, ts: tsDe(s.desde, s.fichaje!.hora), tipo: s.fichaje!.tipo, editado: true,
    nota: `Olvido de fichaje pedido por el trabajador: ${s.motivo || ''}`.slice(0, 300),
    editado_por: 'Encargado/a (a petición del trabajador)', editado_at: n, registrado_at: n,
  }
}

/** Días pasados (últimos `dias`) que quedaron con la jornada abierta: falta fichar la salida */
export function jornadasAbiertas(emp: string, fichajesDe: (e: string, f: string) => Fichaje[], hoyS: string, dias = 7) {
  const r: string[] = []
  for (let k = 1; k <= dias; k++) {
    const d = sumarDias(hoyS, -k), fs = fichajesDe(emp, d)
    if (fs.length && resumenFichajes(fs).estado !== 'fuera') r.push(d)
  }
  return r
}

export type Recordatorio = { tipo: 'entrada' | 'salida'; hora: string }
/** Aviso al trabajador: su turno empezó y no ha fichado, o terminó y sigue con la jornada abierta */
export function recordatorio(emp: Empleado, cfg: Config, t: Turno | undefined, fsHoy: Fichaje[], ahora = Date.now()): Recordatorio | null {
  if (flexible(emp, cfg) || t?.tipo !== 'trabajo' || !t.tramos.length) return null
  const d = new Date(ahora), m = d.getHours() * 60 + d.getMinutes()
  const primero = t.tramos.reduce((a, b) => (aMin(b.i) < aMin(a.i) ? b : a)), ultimo = t.tramos[t.tramos.length - 1]
  const ini = aMin(primero.i), fin = aMin(ultimo.f)
  if (fin <= ini) return null
  if (!fsHoy.length && m >= ini + MARGEN_ENTRADA && m < fin) return { tipo: 'entrada', hora: primero.i }
  if (fsHoy.length && resumenFichajes(fsHoy, ahora).estado !== 'fuera' && m >= fin + (cfg.margen_salida ?? 15)) return { tipo: 'salida', hora: ultimo.f }
  return null
}

export function enlaceWhatsApp(tel: string, texto: string) {
  let n = tel.replace(/\D/g, '')
  if (n.length === 9) n = '34' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}
