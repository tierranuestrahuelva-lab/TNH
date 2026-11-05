import type { Config, Empleado, Fichaje, TipoFichaje, Turno } from './types'
import { aMin, deMin, fmtH } from './fechas'

export type DatosGeo = Pick<Fichaje, 'lat' | 'lon' | 'precision_m' | 'lugar' | 'distancia_m' | 'fuera_zona' | 'geo_error'>

export const usaGeo = (emp: Empleado, c: Config) => !!emp.puesto && (c.geo_puestos || []).includes(emp.puesto)
const en = (l: string[] | undefined, emp: Empleado) => !!emp.puesto && (l || []).includes(emp.puesto)
const exigeZona = (emp: Empleado, c: Config, tipo: TipoFichaje) => tipo === 'entrada' && en(c.geo_zona_puestos, emp)
export const flexible = (emp: Empleado, c: Config) => en(c.flex_puestos, emp)
export const controlaHora = (emp: Empleado, c: Config) => en(c.hora_puestos, emp)

export function salidaTarde(emp: Empleado, c: Config, x: Fichaje, t?: Turno | null) {
  if (x.tipo !== 'salida' || !controlaHora(emp, c) || t?.tipo !== 'trabajo' || !t.tramos.length) return null
  const fin = Math.max(...t.tramos.map((r) => aMin(r.f))), d = new Date(x.ts), m = d.getHours() * 60 + d.getMinutes() - fin
  return m > (c.margen_salida ?? 15) ? { min: m, fin: deMin(fin) } : null
}

export function avisoFichaje(emp: Empleado, c: Config, x: Fichaje, t?: Turno | null) {
  const st = salidaTarde(emp, c, x, t)
  const p = [alertaGeo(x) && textoGeo(x, c), st && `Salida ${fmtH(st.min)} después de su horario (${st.fin})${x.lat != null && !alertaGeo(x) ? ' · ' + textoGeo(x, c) : ''}`].filter(Boolean)
  return p.length ? p.join(' · ') : null
}

export function distancia(a: number, b: number, c: number, d: number) {
  const R = 6371000, r = Math.PI / 180
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

/** Más de esto (en metros) es una ubicación aproximada: el móvil no tiene activada la «Ubicación exacta» */
export const PRECISION_MAX = 1000

const pedir = (timeout: number) => new Promise<GeolocationPosition>((ok, mal) => {
  if (!navigator.geolocation) return mal({ code: 99 })
  navigator.geolocation.getCurrentPosition(ok, mal, { enableHighAccuracy: true, timeout, maximumAge: 0 })
})

/** Ubicación actual; si la primera lectura es poco precisa (habitual en iPhone) se pide otra y se queda la mejor */
export async function posicion(): Promise<GeolocationPosition> {
  const p = await pedir(15000)
  if (p.coords.accuracy <= 100) return p
  try { const q = await pedir(8000); return q.coords.accuracy < p.coords.accuracy ? q : p } catch { return p }
}

export const esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

export const AYUDA_UBICACION = {
  iphone: [
    'Abre Ajustes → Privacidad y seguridad → Localización y activa «Localización».',
    'En esa misma lista entra en «Sitios web de Safari» (o en Chrome, si abres la app con Chrome), elige «Al usar la app» y activa «Ubicación exacta».',
    'Si alguna vez pulsaste «No permitir»: Ajustes → Apps → Safari → Ubicación → «Preguntar» o «Permitir».',
    'Vuelve aquí, pulsa «Comprobar mi ubicación» y acepta «Permitir».',
  ],
  android: [
    'Desliza desde arriba de la pantalla y activa «Ubicación».',
    'En Chrome, toca el icono junto a la dirección web → Permisos → Ubicación → «Permitir».',
    'En Ajustes → Ubicación, activa «Ubicación precisa» (Google).',
    'Vuelve aquí y pulsa «Comprobar mi ubicación».',
  ],
}

const ERROR_GEO: Record<number, string> = {
  1: 'Permiso de ubicación denegado',
  2: 'La localización del móvil está apagada',
  3: 'El móvil no dio la ubicación a tiempo',
}

export async function comprobarUbicacion(): Promise<{ ok: boolean; texto: string }> {
  try {
    const p = await posicion(), m = Math.round(p.coords.accuracy)
    return m > PRECISION_MAX
      ? { ok: false, texto: `Ubicación aproximada (± ${km(m)}): activa «Ubicación exacta»` }
      : { ok: true, texto: `Ubicación correcta (± ${km(m)})` }
  } catch (e) {
    const code = (e as GeolocationPositionError)?.code
    return { ok: false, texto: ERROR_GEO[code] || 'Este móvil no da la ubicación' }
  }
}

export async function ubicarFichaje(emp: Empleado, c: Config, tipo: TipoFichaje): Promise<DatosGeo> {
  try {
    const p = await posicion()
    const lat = p.coords.latitude, lon = p.coords.longitude, precision_m = Math.round(p.coords.accuracy)
    const cerca = (c.lugares || []).map((l) => ({ l, d: distancia(lat, lon, l.lat, l.lon) })).sort((a, b) => a.d - b.d)[0]
    const dentro = !!cerca && cerca.d <= cerca.l.radio + Math.min(precision_m, 100)
    const vaga = precision_m > PRECISION_MAX
    return {
      lat, lon, precision_m,
      lugar: dentro ? cerca.l.nombre : null,
      distancia_m: cerca ? Math.round(cerca.d) : null,
      fuera_zona: exigeZona(emp, c, tipo) && !vaga ? !dentro : null,
      geo_error: vaga ? 'Ubicación aproximada: el móvil no tiene activada la «Ubicación exacta»' : null,
    }
  } catch (e) {
    const code = (e as GeolocationPositionError)?.code
    return { geo_error: ERROR_GEO[code] || 'Ubicación no disponible' }
  }
}

export const mapa = (f: Pick<Fichaje, 'lat' | 'lon'>) => `https://www.google.com/maps?q=${f.lat},${f.lon}`
export const tieneGeo = (f: Fichaje) => f.lat != null || !!f.geo_error
export const km = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`)

export function textoGeo(f: Fichaje, c: Config) {
  if (f.geo_error && f.lat != null) return `Ubicación aproximada (± ${km(f.precision_m || 0)}): revisar`
  if (f.geo_error) return `Sin ubicación (${f.geo_error.toLowerCase()})`
  if (f.lat == null) return ''
  if (f.lugar) return `En ${f.lugar}`
  const ref = (c.lugares || []).length && f.distancia_m != null ? ` · a ${km(f.distancia_m)} del sitio más cercano` : ''
  return `${f.fuera_zona ? 'Fuera de zona' : 'Fuera de los sitios de trabajo'}${ref}`
}
export const alertaGeo = (f: Fichaje) => !!f.fuera_zona || !!f.geo_error
