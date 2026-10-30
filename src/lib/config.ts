import type { Config } from './types'

export const COLORES = ['#830040', '#B771A0', '#1f2937', '#0f766e', '#b45309', '#1d4ed8', '#7c3aed', '#be123c', '#4d7c0f', '#0e7490', '#a16207', '#64748b']

export const CONFIG_BASE: Config = {
  empresa: 'CONSTANTIN BECERRA S.L. · Tierra Nuestra Huelva',
  cif: 'B21295688',
  domicilio: 'C/ Fernando el Católico, 34 · 21003 Huelva',
  email_privacidad: 'tnh@tierranuestrahuelva.es',
  lugares: [{ id: 'almacen', nombre: 'Almacén', lat: 37.25634, lon: -6.94829, radio: 150 }],
  geo_puestos: ['Repartidor/a', 'Comercial'],
  geo_zona_puestos: ['Repartidor/a'],
  centros: ['Tienda Huelva', 'Almacén', 'Reparto'],
  puestos: ['Dirección', 'Encargado/a de tienda', 'Dependiente/a', 'Sumiller', 'Comercial', 'Repartidor/a', 'Mozo/a de almacén', 'Administrativo/a'],
  plantillas: [
    { id: 'manana', nombre: 'Mañana', tramos: [{ i: '10:00', f: '14:00' }], color: '#B771A0' },
    { id: 'tarde', nombre: 'Tarde', tramos: [{ i: '17:30', f: '21:00' }], color: '#830040' },
    { id: 'partido', nombre: 'Partido', tramos: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }], color: '#55002a' },
    { id: 'intensiva', nombre: 'Intensiva', tramos: [{ i: '09:00', f: '15:00' }], color: '#0f766e' },
    { id: 'almacen', nombre: 'Almacén', tramos: [{ i: '08:00', f: '14:00' }, { i: '16:00', f: '18:00' }], color: '#1f2937' },
  ],
  apertura: {
    0: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }],
    1: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }],
    2: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }],
    3: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }],
    4: [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '21:00' }],
    5: [{ i: '10:00', f: '14:00' }],
    6: [],
  },
  festivos: [
    { fecha: '2026-01-01', nombre: 'Año Nuevo' }, { fecha: '2026-01-06', nombre: 'Reyes' },
    { fecha: '2026-02-28', nombre: 'Día de Andalucía' }, { fecha: '2026-04-02', nombre: 'Jueves Santo' },
    { fecha: '2026-04-03', nombre: 'Viernes Santo' }, { fecha: '2026-05-01', nombre: 'Fiesta del Trabajo' },
    { fecha: '2026-08-03', nombre: 'Fiesta local Huelva (Colombinas)' }, { fecha: '2026-08-15', nombre: 'Asunción' },
    { fecha: '2026-09-08', nombre: 'Fiesta local Huelva (Virgen de la Cinta)' }, { fecha: '2026-10-12', nombre: 'Fiesta Nacional' },
    { fecha: '2026-11-02', nombre: 'Todos los Santos (trasladado)' }, { fecha: '2026-12-07', nombre: 'Constitución (trasladado)' },
    { fecha: '2026-12-08', nombre: 'Inmaculada' }, { fecha: '2026-12-25', nombre: 'Navidad' },
    { fecha: '2027-01-01', nombre: 'Año Nuevo' }, { fecha: '2027-01-06', nombre: 'Reyes' },
    { fecha: '2027-03-01', nombre: 'Día de Andalucía (trasladado)' }, { fecha: '2027-03-25', nombre: 'Jueves Santo' },
    { fecha: '2027-03-26', nombre: 'Viernes Santo' }, { fecha: '2027-08-03', nombre: 'Fiesta local Huelva (Colombinas)' },
    { fecha: '2027-08-16', nombre: 'Asunción (trasladado)' }, { fecha: '2027-09-08', nombre: 'Fiesta local Huelva (Virgen de la Cinta)' },
    { fecha: '2027-10-12', nombre: 'Fiesta Nacional' }, { fecha: '2027-11-01', nombre: 'Todos los Santos' },
    { fecha: '2027-12-06', nombre: 'Constitución' }, { fecha: '2027-12-08', nombre: 'Inmaculada' },
    { fecha: '2027-12-25', nombre: 'Navidad' },
  ],
  pin_encargado: '1234',
  max_horas_dia: 9,
  descanso_min: 12,
}

// Fecha de la última versión del texto de protección de datos: hay que volver a confirmarlo si es anterior.
export const PRIV_ACTUALIZADA = '2026-10-30T12:00:00Z'
export const privacidadLeida = (e: { privacidad_at?: string | null }) => !!e.privacidad_at && e.privacidad_at >= PRIV_ACTUALIZADA
