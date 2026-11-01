import { test as base, expect, type Page } from '@playwright/test'
import type { Empleado, Fichaje, Perfil, Turno } from '../../src/lib/types'

/** Miércoles 11-11-2026, 10:30 en Huelva */
export const AHORA = new Date('2026-11-11T09:30:00Z')
export const ALMACEN = { latitude: 37.25634, longitude: -6.94829 }

const emp = (id: string, nombre: string, puesto: string, pin: string, orden: number, activo = true): Empleado =>
  ({ id, nombre, puesto, pin, orden, activo, horas_semana: 40, vacaciones_anuales: 30, color: null, privacidad_at: '2026-11-01T00:00:00Z' })

const semana = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
const turnos = (id: string, tramos: Turno['tramos']): Turno[] => semana.map((fecha) => ({ id: `${id}_${fecha}`, empleado_id: id, fecha, tipo: 'trabajo', tramos, centro: null, nota: null }))
const fich = (id: string, empleado_id: string, ts: string, tipo: Fichaje['tipo']): Fichaje => ({ id, empleado_id, ts, tipo, registrado_at: ts })

export const SEMILLA = {
  empleados: [
    emp('ana', 'Ana Pérez', 'Dependienta', '1111', 0),
    emp('juan', 'Juan "el Rubio" Ñúñez', 'Repartidor/a', '2222', 1),
    emp('lucia', 'Lucía', 'Encargada de tienda', '3333', 2),
    emp('pedro', 'Pedro Baja', 'Mozo', '4444', 3, false),
  ],
  turnos: [...turnos('ana', [{ i: '10:00', f: '14:00' }]), ...turnos('juan', [{ i: '08:00', f: '15:00' }]), ...turnos('lucia', [{ i: '10:00', f: '14:00' }, { i: '17:30', f: '20:30' }])],
  fichajes: [
    fich('f1', 'ana', '2026-11-09T09:00:00.000Z', 'entrada'),
    fich('f2', 'ana', '2026-11-09T13:00:00.000Z', 'salida'),
    fich('f3', 'ana', '2026-11-10T09:00:00.000Z', 'entrada'),
  ],
  solicitudes: [],
}

type Abrir = { perfil?: Perfil | null; vista?: string; geo?: 'denegada' }

export const test = base.extend<{ abrir: (o?: Abrir) => Promise<void>; errores: string[] }>({
  errores: async ({}, use) => use([]),
  page: async ({ page, errores }, use) => {
    page.on('pageerror', (e) => errores.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
    await page.route(/supabase\.co/, (r) => { errores.push('Llamada a la nube: ' + r.request().url()); return r.abort() })
    await use(page)
    expect(errores, '[UI-02] sin errores JavaScript ni llamadas a la nube').toEqual([])
  },
  abrir: async ({ page }, use) => {
    await use(async ({ perfil = null, vista = '', geo } = {}) => {
      await page.clock.install({ time: AHORA })
      await page.addInitScript(({ estado, perfil, geo }) => {
        if (geo === 'denegada') {
          const err = { code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
          Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_ok: unknown, ko: (e: unknown) => void) => setTimeout(() => ko(err), 10) } })
        }
        if (sessionStorage.getItem('semilla')) return
        sessionStorage.setItem('semilla', '1')
        localStorage.setItem('tn-hor-cache', JSON.stringify(estado))
        if (perfil) localStorage.setItem('tn-hor-perfil', JSON.stringify(perfil))
        else localStorage.removeItem('tn-hor-perfil')
      }, { estado: SEMILLA, perfil, geo })
      await page.goto('/' + (vista ? '#' + vista : ''))
    })
  },
})

export const estado = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tn-hor-cache') || '{}'))
export const pin = async (page: Page, p: string) => { for (const c of p) await page.getByRole('button', { name: c, exact: true }).click() }
export { expect }
