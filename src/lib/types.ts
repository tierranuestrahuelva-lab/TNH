export type Tramo = { i: string; f: string }
export type TipoTurno = 'trabajo' | 'libre' | 'vacaciones' | 'baja' | 'permiso' | 'festivo' | 'formacion'

export interface Empleado {
  id: string
  nombre: string
  puesto?: string | null
  color?: string | null
  horas_semana: number
  coste_hora?: number | null
  pin?: string | null
  telefono?: string | null
  email?: string | null
  centro?: string | null
  vacaciones_anuales: number
  activo: boolean
  orden: number
}

export interface Turno {
  id: string
  empleado_id: string
  fecha: string
  tipo: TipoTurno
  tramos: Tramo[]
  centro?: string | null
  nota?: string | null
}

export type TipoFichaje = 'entrada' | 'pausa' | 'vuelta' | 'salida'
export interface Fichaje {
  id: string
  empleado_id: string
  ts: string
  tipo: TipoFichaje
  nota?: string | null
  editado?: boolean
}

export type TipoSolicitud = 'vacaciones' | 'permiso' | 'cambio' | 'baja' | 'otro'
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada'
export interface Solicitud {
  id: string
  empleado_id: string
  tipo: TipoSolicitud
  desde: string
  hasta: string
  motivo?: string | null
  estado: EstadoSolicitud
  respuesta?: string | null
  created_at?: string
}

export interface Plantilla { id: string; nombre: string; tramos: Tramo[]; color: string }
export interface Festivo { fecha: string; nombre: string }
export interface Config {
  centros: string[]
  plantillas: Plantilla[]
  apertura: Record<number, Tramo[]> // 0 = lunes … 6 = domingo
  festivos: Festivo[]
  pin_encargado: string
  max_horas_dia: number
  descanso_min: number
  empresa: string
  cif: string
}

export type Perfil = { rol: 'encargado' } | { rol: 'empleado'; id: string }
