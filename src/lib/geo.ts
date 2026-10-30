import type { Config, Empleado, Fichaje, TipoFichaje } from './types'

export type DatosGeo = Pick<Fichaje, 'lat' | 'lon' | 'precision_m' | 'lugar' | 'distancia_m' | 'fuera_zona' | 'geo_error'>

export const usaGeo = (emp: Empleado, c: Config) => !!emp.puesto && (c.geo_puestos || []).includes(emp.puesto)
const exigeZona = (emp: Empleado, c: Config, tipo: TipoFichaje) => (tipo === 'entrada' || tipo === 'salida') && !!emp.puesto && (c.geo_zona_puestos || []).includes(emp.puesto)

export function distancia(a: number, b: number, c: number, d: number) {
  const R = 6371000, r = Math.PI / 180
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function posicion(): Promise<GeolocationPosition> {
  return new Promise((ok, mal) => {
    if (!navigator.geolocation) return mal({ code: 99 })
    navigator.geolocation.getCurrentPosition(ok, mal, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
  })
}

export async function ubicarFichaje(emp: Empleado, c: Config, tipo: TipoFichaje): Promise<DatosGeo> {
  try {
    const p = await posicion()
    const lat = p.coords.latitude, lon = p.coords.longitude, precision_m = Math.round(p.coords.accuracy)
    const cerca = (c.lugares || []).map((l) => ({ l, d: distancia(lat, lon, l.lat, l.lon) })).sort((a, b) => a.d - b.d)[0]
    const dentro = !!cerca && cerca.d <= cerca.l.radio + Math.min(precision_m, 100)
    return {
      lat, lon, precision_m,
      lugar: dentro ? cerca.l.nombre : null,
      distancia_m: cerca ? Math.round(cerca.d) : null,
      fuera_zona: exigeZona(emp, c, tipo) ? !dentro : null,
      geo_error: null,
    }
  } catch (e) {
    const code = (e as GeolocationPositionError)?.code
    return { geo_error: code === 1 ? 'Permiso de ubicación denegado' : code === 3 ? 'El móvil no dio la ubicación a tiempo' : 'Ubicación no disponible' }
  }
}

export const mapa = (f: Pick<Fichaje, 'lat' | 'lon'>) => `https://www.google.com/maps?q=${f.lat},${f.lon}`
export const tieneGeo = (f: Fichaje) => f.lat != null || !!f.geo_error
export const km = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`)

export function textoGeo(f: Fichaje, c: Config) {
  if (f.geo_error) return `Sin ubicación (${f.geo_error.toLowerCase()})`
  if (f.lat == null) return ''
  if (f.lugar) return `En ${f.lugar}`
  const ref = (c.lugares || []).length && f.distancia_m != null ? ` · a ${km(f.distancia_m)} del sitio más cercano` : ''
  return `${f.fuera_zona ? 'Fuera de zona' : 'Fuera de los sitios de trabajo'}${ref}`
}
export const alertaGeo = (f: Fichaje) => !!f.fuera_zona || !!f.geo_error
