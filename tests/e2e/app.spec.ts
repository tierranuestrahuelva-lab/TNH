import { ALMACEN, estado, expect, pin, test } from './base'
import type { Page } from '@playwright/test'

const ENC = { rol: 'encargado' as const }
const yo = (id: string) => ({ rol: 'empleado' as const, id })

const fichar = async (page: Page, boton: string) => {
  await page.getByRole('button', { name: boton }).click()
  await page.getByRole('button', { name: 'Sí, registrar' }).click()
}

test.describe('acceso', () => {
  test('[ACC-01][ACC-04] se ven los activos y no las bajas', async ({ page, abrir }) => {
    await abrir()
    await expect(page.getByRole('button', { name: /Ana Pérez/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Lucía/ })).toBeVisible()
    await expect(page.getByText('Pedro Baja')).toHaveCount(0)
  })

  test('[ACC-02] PIN incorrecto no deja entrar; el correcto sí', async ({ page, abrir }) => {
    await abrir()
    await page.getByRole('button', { name: /Ana Pérez/ }).click()
    await pin(page, '9999')
    await expect(page.getByText('PIN incorrecto')).toBeVisible()
    await pin(page, '1111')
    await expect(page.getByText('Aún no has fichado')).toBeVisible()
  })

  test('[ACC-03] encargado/a entra con su PIN', async ({ page, abrir }) => {
    await abrir()
    await page.getByRole('button', { name: /Entrar como encargado/ }).click()
    await pin(page, '0000')
    await expect(page.getByText('PIN incorrecto')).toBeVisible()
    await pin(page, '1234')
    await expect(page.getByRole('button', { name: /Registro/ }).first()).toBeVisible()
  })
})

test.describe('fichar', () => {
  test('[FIC-01][FIC-02][FIC-03] entrada → pausa → vuelta → salida, con confirmación', async ({ page, abrir }) => {
    await abrir({ perfil: yo('lucia') })
    await expect(page.getByText('Aún no has fichado')).toBeVisible()
    await page.getByRole('button', { name: 'Fichar entrada' }).click()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Todavía no hay registros hoy.')).toBeVisible()
    await fichar(page, 'Fichar entrada')
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    await page.clock.fastForward('02:00:00')
    await fichar(page, 'Pausa')
    await expect(page.getByText('Estás en pausa')).toBeVisible()
    await page.clock.fastForward('00:15:00')
    await fichar(page, 'Volver')
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    await page.clock.fastForward('01:00:00')
    await fichar(page, 'Fichar salida')
    await expect(page.getByText('Jornada terminada')).toBeVisible()
    const fs = (await estado(page)).fichajes.filter((f: { empleado_id: string }) => f.empleado_id === 'lucia')
    expect(fs.map((f: { tipo: string }) => f.tipo)).toEqual(['entrada', 'pausa', 'vuelta', 'salida'])
    expect(fs.every((f: { registrado_at?: string }) => !!f.registrado_at)).toBe(true)
  })

  test('[FIC-05][FIC-06] una salida olvidada ayer no infla la semana', async ({ page, abrir }) => {
    await abrir({ perfil: yo('ana') })
    await expect(page.getByText(/Trabajado\s*18h$/)).toBeVisible()
  })
})

test.describe('registro y correcciones', () => {
  const fila = (page: Page, dia: number) => page.locator('tbody tr').nth(dia - 1)

  test('[FIC-05][REG-01][REG-02][REG-03][REG-04] corregir con motivo y anular sin borrar', async ({ page, abrir }) => {
    page.on('dialog', (d) => d.accept())
    await abrir({ perfil: ENC, vista: 'fichajes' })
    await expect(fila(page, 10)).toContainText('falta salida')
    await expect(fila(page, 10)).toContainText('14h')
    await fila(page, 10).getByTitle('Corregir').click()
    await page.locator('input[type=time]').last().fill('18:00')
    await page.getByRole('button', { name: 'Añadir' }).click()
    await expect(page.getByText('Escribe primero el motivo')).toBeVisible()
    await page.getByPlaceholder('Ej.: olvidó fichar la salida').fill('Olvidó fichar la salida; "avisó" por WhatsApp')
    await page.getByRole('button', { name: 'Añadir' }).click()
    await expect(page.getByText('Fichaje añadido')).toBeVisible()
    await page.getByPlaceholder('Ej.: olvidó fichar la salida').fill('Llegó antes')
    const entrada = page.locator('li input[type=time]').first()
    await entrada.fill('09:30')
    await entrada.blur()
    await expect(page.getByText('Hora corregida')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(fila(page, 10)).not.toContainText('falta salida')
    await expect(fila(page, 10)).toContainText('8h 30')
    let fs = (await estado(page)).fichajes.filter((f: { empleado_id: string }) => f.empleado_id === 'ana')
    const corregida = fs.find((f: { id: string }) => f.id === 'f3')
    expect(corregida).toMatchObject({ ts_original: '2026-11-10T09:00:00.000Z', editado: true, nota: 'Llegó antes', editado_por: 'Encargado/a' })
    const anadida = fs.find((f: { tipo: string; editado?: boolean; id: string }) => f.tipo === 'salida' && f.editado)
    expect(anadida.editado_at).toBeTruthy()

    await fila(page, 10).getByTitle('Corregir').click()
    await page.getByPlaceholder('Ej.: olvidó fichar la salida').fill('Duplicado')
    await page.getByTitle('Anular fichaje').last().click()
    await expect(page.getByText('Fichaje anulado')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    fs = (await estado(page)).fichajes.filter((f: { empleado_id: string }) => f.empleado_id === 'ana')
    expect(fs).toHaveLength(4)
    expect(fs.find((f: { id: string }) => f.id === anadida.id)).toMatchObject({ anulado: true, motivo_anulacion: 'Duplicado' })
    await expect(fila(page, 10)).toContainText('falta salida')
  })

  test('[REG-05] el trabajador ve su registro pero no puede corregir', async ({ page, abrir }) => {
    await abrir({ perfil: yo('ana'), vista: 'miregistro' })
    await expect(page.locator('tbody tr').nth(8)).toContainText('4h')
    await expect(page.getByTitle('Corregir')).toHaveCount(0)
  })
})

test.describe('geolocalización', () => {
  test('[GEO-01][GEO-02] repartidor en el almacén: se guarda el sitio', async ({ page, abrir, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation(ALMACEN)
    await abrir({ perfil: yo('juan') })
    await fichar(page, 'Fichar entrada')
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    const f = (await estado(page)).fichajes.find((x: { empleado_id: string }) => x.empleado_id === 'juan')
    expect(f).toMatchObject({ lugar: 'Almacén', fuera_zona: false })
  })

  test('[GEO-03] repartidor lejos: ficha igual y queda “fuera de zona”', async ({ page, abrir, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 37.3, longitude: -6.9 })
    await abrir({ perfil: yo('juan') })
    await fichar(page, 'Fichar entrada')
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    const f = (await estado(page)).fichajes.find((x: { empleado_id: string }) => x.empleado_id === 'juan')
    expect(f.fuera_zona).toBe(true)
  })

  test('[GEO-04] permiso denegado: el fichaje no se bloquea y se apunta el motivo', async ({ page, abrir }) => {
    await abrir({ perfil: yo('juan'), geo: 'denegada' })
    await fichar(page, 'Fichar entrada')
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    const f = (await estado(page)).fichajes.find((x: { empleado_id: string }) => x.empleado_id === 'juan')
    expect(f.geo_error).toBeTruthy()
    expect(f.lat ?? null).toBeNull()
  })

  test('[GEO-05] puesto sin geolocalización: no se pide ubicación', async ({ page, abrir, context }) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation(ALMACEN)
    await abrir({ perfil: yo('ana') })
    await fichar(page, 'Fichar entrada')
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    const f = (await estado(page)).fichajes.filter((x: { empleado_id: string }) => x.empleado_id === 'ana').at(-1)
    expect(f.lat ?? null).toBeNull()
    expect(f.lugar ?? null).toBeNull()
  })
})

test.describe('ausencias', () => {
  test('[AUS-01][AUS-02] solicitud del trabajador → aprobada → aparece en el cuadrante', async ({ page, abrir }) => {
    await abrir({ perfil: yo('ana'), vista: 'solicitudes' })
    await page.getByRole('button', { name: 'Nueva' }).click()
    await page.locator('input[type=date]').first().fill('2026-11-12')
    await page.locator('input[type=date]').last().fill('2026-11-13')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Solicitud enviada')).toBeVisible()
    await page.evaluate(() => localStorage.setItem('tn-hor-perfil', JSON.stringify({ rol: 'encargado' })))
    await page.goto('/?v=2#ausencias')
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.getByText('Aprobada y añadida al cuadrante')).toBeVisible()
    const e = await estado(page)
    expect(e.solicitudes[0].estado).toBe('aprobada')
    const t = e.turnos.filter((x: { empleado_id: string; fecha: string }) => x.empleado_id === 'ana' && x.fecha >= '2026-11-12' && x.fecha <= '2026-11-13')
    expect(t.map((x: { tipo: string }) => x.tipo)).toEqual(['vacaciones', 'vacaciones'])
  })
})

test.describe('datos', () => {
  test('[DAT-02] sin nube: trabaja solo en este dispositivo', async ({ page, abrir }, info) => {
    test.skip(info.project.name === 'movil', 'el aviso de sincronización está en el menú lateral de escritorio')
    await abrir({ perfil: ENC })
    await expect(page.getByText('Solo en este dispositivo')).toBeVisible()
  })
})

const VISTAS = {
  encargado: ['hoy', 'cuadrante', 'mes', 'fichajes', 'ausencias', 'informes', 'equipo', 'ajustes', 'privacidad'],
  empleado: ['fichar', 'mihorario', 'miregistro', 'cuadrante', 'solicitudes', 'privacidad'],
}
for (const [rol, vistas] of Object.entries(VISTAS)) {
  for (const v of vistas) {
    test(`[UI-01][UI-02] ${rol} · ${v}: abre sin errores y no se sale por los lados`, async ({ page, abrir }) => {
      await abrir({ perfil: rol === 'encargado' ? ENC : yo('juan'), vista: v })
      await expect(page.locator('main')).toBeVisible()
      await page.waitForTimeout(300)
      const { ancho, pagina } = await page.evaluate(() => ({ ancho: window.innerWidth, pagina: document.documentElement.scrollWidth }))
      expect(pagina, 'ancho de la página').toBeLessThanOrEqual(ancho)
    })
  }
}
