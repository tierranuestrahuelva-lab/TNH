import { sb, traerTodo, type Estado } from './datos'
import { csv, descargar } from './exportar'
import type { Empleado, Fichaje } from './types'

const TABLAS = ['hor_empleados', 'hor_turnos', 'hor_fichajes', 'hor_fichajes_hist', 'hor_solicitudes', 'hor_config']
const fechaHoy = () => new Date().toISOString().slice(0, 10)
const fh = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : ''
const NOM: Record<string, string> = { entrada: 'Entrada', pausa: 'Pausa', vuelta: 'Vuelta', salida: 'Salida' }

async function todo(local: Estado) {
  if (!sb) return { hor_empleados: local.empleados, hor_turnos: local.turnos, hor_fichajes: local.fichajes, hor_solicitudes: local.solicitudes, hor_config: [{ clave: 'config', valor: local.config }] } as Record<string, any[]>
  return Object.fromEntries(await Promise.all(TABLAS.map(async (t) => [t, await traerTodo(t)]))) as Record<string, any[]>
}

export async function copiaCompleta(local: Estado) {
  const datos = await todo(local)
  descargar(`copia-horarios-tierranuestra-${fechaHoy()}.json`, JSON.stringify({ app: 'Horarios Tierra Nuestra', creada: new Date().toISOString(), datos }), 'application/json')
}

export async function excelFichajes(local: Estado, empresa: string) {
  const empleados: Empleado[] = sb ? await traerTodo('hor_empleados') : local.empleados
  const fichajes: Fichaje[] = sb ? await traerTodo('hor_fichajes') : local.fichajes
  const nom = new Map(empleados.map((e) => [e.id, e.nombre]))
  fichajes.sort((a, b) => (nom.get(a.empleado_id) || '').localeCompare(nom.get(b.empleado_id) || '') || a.ts.localeCompare(b.ts))
  csv(`registro-jornada-completo-${fechaHoy()}.csv`, [
    ['Registro de jornada completo', empresa, 'Generado ' + fh(new Date().toISOString())], [],
    ['Trabajador/a', 'Fecha', 'Hora', 'Tipo', 'Estado', 'Hora original (si se corrigió)', 'Motivo / nota', 'Modificado el', 'Recibido en el servidor'],
    ...fichajes.map((f) => [nom.get(f.empleado_id) || f.empleado_id, new Date(f.ts).toLocaleDateString('es-ES'), new Date(f.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), NOM[f.tipo] || f.tipo,
      f.anulado ? 'ANULADO' : f.editado ? 'Corregido' : 'Original', fh(f.ts_original), f.anulado ? f.motivo_anulacion || '' : f.nota || '', fh(f.editado_at), fh(f.registrado_at)]),
  ])
}

export const diasDesdeCopia = (ultima?: string | null) => ultima ? Math.floor((Date.now() - new Date(ultima).getTime()) / 864e5) : null
