import { afterEach, describe, expect, it, vi } from 'vitest'
import { avisoFichaje, distancia, flexible, salidaTarde, textoGeo, ubicarFichaje, usaGeo } from '../../src/lib/geo'
import { CONFIG_BASE } from '../../src/lib/config'
import type { Empleado } from '../../src/lib/types'

const base: Empleado = { id: 'x', nombre: 'X', horas_semana: 40, vacaciones_anuales: 30, activo: true, orden: 0 }
const repartidor = { ...base, puesto: 'Repartidor/a' }
const comercial = { ...base, puesto: 'Comercial' }
const dependiente = { ...base, puesto: 'Dependiente/a' }
const ALMACEN = CONFIG_BASE.lugares![0]
const gps = (lat: number, lon: number, accuracy = 10) => vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (ok: any) => ok({ coords: { latitude: lat, longitude: lon, accuracy } }) } })
const gpsError = (code: number) => vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_ok: any, mal: any) => mal({ code }) } })
afterEach(() => vi.unstubAllGlobals())

describe('ubicación al fichar', () => {
  it('[GEO-01] solo se pide a los puestos configurados', () => {
    expect(usaGeo(repartidor, CONFIG_BASE)).toBe(true)
    expect(usaGeo(comercial, CONFIG_BASE)).toBe(true)
    expect(usaGeo(dependiente, CONFIG_BASE)).toBe(false)
    expect(usaGeo(base, CONFIG_BASE)).toBe(false)
  })
  it('distancia Huelva–Sevilla ≈ 87 km', () => {
    const d = distancia(37.2614, -6.9447, 37.3891, -5.9845)
    expect(d).toBeGreaterThan(84000)
    expect(d).toBeLessThan(90000)
  })
  it('[GEO-02] dentro del radio del almacén', async () => {
    gps(ALMACEN.lat + 0.0005, ALMACEN.lon)
    const g = await ubicarFichaje(repartidor, CONFIG_BASE, 'entrada')
    expect(g.lugar).toBe('Almacén')
    expect(g.fuera_zona).toBe(false)
    expect(textoGeo({ id: '1', empleado_id: 'x', ts: '', tipo: 'entrada', ...g }, CONFIG_BASE)).toBe('En Almacén')
  })
  it('[GEO-03] repartidor fuera de zona al fichar la entrada', async () => {
    gps(37.3891, -5.9845)
    const g = await ubicarFichaje(repartidor, CONFIG_BASE, 'entrada')
    expect(g.fuera_zona).toBe(true)
    expect(g.lugar).toBeNull()
    expect(textoGeo({ id: '1', empleado_id: 'x', ts: '', tipo: 'entrada', ...g }, CONFIG_BASE)).toMatch(/^Fuera de zona · a \d+(,\d)? km/)
  })
  it('[GEO-06] el repartidor puede fichar la salida donde termine (reparto, casa, tienda)', async () => {
    gps(37.3891, -5.9845)
    const g = await ubicarFichaje(repartidor, CONFIG_BASE, 'salida')
    expect(g.fuera_zona).toBeNull()
    expect(g.lat).toBeCloseTo(37.3891)
  })
  it('[GEO-07] salida del repartidor fuera de hora: avisa pasado el margen', () => {
    const t = { id: 't', empleado_id: 'x', fecha: '2026-11-02', tipo: 'trabajo' as const, tramos: [{ i: '08:00', f: '14:00' }] }
    const sal = (h: string) => ({ id: '1', empleado_id: 'x', ts: new Date(`2026-11-02T${h}:00`).toISOString(), tipo: 'salida' as const })
    expect(salidaTarde(repartidor, CONFIG_BASE, sal('14:15'), t)).toBeNull()
    expect(salidaTarde(repartidor, CONFIG_BASE, sal('15:10'), t)).toEqual({ min: 70, fin: '14:00' })
    expect(avisoFichaje(repartidor, CONFIG_BASE, sal('15:10'), t)).toMatch(/^Salida 1h 10 después de su horario \(14:00\)/)
    expect(salidaTarde(repartidor, CONFIG_BASE, sal('15:10'), undefined)).toBeNull()
    expect(salidaTarde(comercial, CONFIG_BASE, sal('15:10'), t)).toBeNull()
  })
  it('[GEO-08] los comerciales tienen horario libre', () => {
    expect(flexible(comercial, CONFIG_BASE)).toBe(true)
    expect(flexible(repartidor, CONFIG_BASE)).toBe(false)
  })
  it('[GEO-03] un comercial fuera no salta como «fuera de zona»', async () => {
    gps(37.3891, -5.9845)
    const g = await ubicarFichaje(comercial, CONFIG_BASE, 'entrada')
    expect(g.fuera_zona).toBeNull()
    expect(g.lat).toBeCloseTo(37.3891)
  })
  it('[GEO-05] las pausas no marcan fuera de zona', async () => {
    gps(37.3891, -5.9845)
    expect((await ubicarFichaje(repartidor, CONFIG_BASE, 'pausa')).fuera_zona).toBeNull()
  })
  it('[GEO-04] permiso denegado o sin señal: se ficha igual con el motivo', async () => {
    gpsError(1)
    expect(await ubicarFichaje(repartidor, CONFIG_BASE, 'entrada')).toEqual({ geo_error: 'Permiso de ubicación denegado' })
    gpsError(3)
    expect((await ubicarFichaje(repartidor, CONFIG_BASE, 'entrada')).geo_error).toBe('El móvil no dio la ubicación a tiempo')
    vi.stubGlobal('navigator', {})
    expect((await ubicarFichaje(repartidor, CONFIG_BASE, 'entrada')).geo_error).toBe('Ubicación no disponible')
  })
})
