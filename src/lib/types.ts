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
  privacidad_at?: string | null
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
  ts_original?: string | null
  anulado?: boolean
  motivo_anulacion?: string | null
  editado_por?: string | null
  editado_at?: string | null
  registrado_at?: string | null
  lat?: number | null
  lon?: number | null
  precision_m?: number | null
  lugar?: string | null
  distancia_m?: number | null
  fuera_zona?: boolean | null
  geo_error?: string | null
}

export interface HistFichaje {
  hid: number
  fichaje_id: string
  accion: 'alta' | 'correccion' | 'anulacion'
  antes: Fichaje | null
  despues: Fichaje | null
  cuando: string
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
export interface RuedaSabados {
  ids: string[]
  porSabado: number
  tramos: Tramo[]
  inicio: string
  primero: number
  compDia: number
  compModo: 'manana' | 'tarde' | 'dia' | 'nada'
}
export interface Config {
  centros: string[]
  puestos: string[]
  sabados?: RuedaSabados | null
  plantillas: Plantilla[]
  apertura: Record<number, Tramo[]> // 0 = lunes … 6 = domingo
  festivos: Festivo[]
  pin_encargado: string
  max_horas_dia: number
  descanso_min: number
  empresa: string
  cif: string
  domicilio?: string
  email_privacidad?: string
  ultima_copia?: string | null
  lugares?: Lugar[]
  geo_puestos?: string[]
  geo_zona_puestos?: string[]
}
export interface Lugar { id: string; nombre: string; lat: number; lon: number; radio: number }

export type Perfil = { rol: 'encargado' } | { rol: 'empleado'; id: string }
