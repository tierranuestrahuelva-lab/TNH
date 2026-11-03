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
    await page.getByRole('button', { name: 'Fichar entrada' }).click()
    await page.getByRole('button', { name: 'Ahora no' }).click()
    await page.getByRole('button', { name: 'Sí, registrar' }).click()
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

test.describe('fichajes olvidados', () => {
  test('[OLV-01][OLV-02][OLV-03] salida olvidada: el trabajador la pide → aprobada → queda en el registro', async ({ page, abrir }) => {
    await abrir({ perfil: yo('ana') })
    await expect(page.getByText(/no fichaste la salida/)).toBeVisible()
    await page.getByRole('button', { name: 'Indicar mi hora de salida' }).click()
    await expect(page.getByText('Fichajes de ese día:')).toContainText('Entrada 10:00')
    const hora = page.getByLabel('Hora real')
    await expect(hora).toHaveValue('14:00')
    const enviar = page.getByRole('button', { name: 'Enviar' })
    await expect(enviar).toBeDisabled()
    await page.getByPlaceholder(/último reparto/).fill('Se me olvidó al cerrar')
    await hora.fill('09:00')
    await expect(page.getByText('La salida tiene que ser después de la entrada (10:00)')).toBeVisible()
    await expect(enviar).toBeDisabled()
    await hora.fill('14:05')
    await enviar.click()
    await expect(page.getByText('Corrección enviada')).toBeVisible()
    await expect(page.getByText(/no fichaste la salida/)).toHaveCount(0)
    let e = await estado(page)
    expect(e.fichajes.filter((x: { empleado_id: string }) => x.empleado_id === 'ana')).toHaveLength(3)
    expect(e.solicitudes[0]).toMatchObject({ tipo: 'fichaje', estado: 'pendiente', desde: '2026-11-10', fichaje: { tipo: 'salida', hora: '14:05' } })

    await page.evaluate(() => localStorage.setItem('tn-hor-perfil', JSON.stringify({ rol: 'encargado' })))
    await page.goto('/?v=2#hoy')
    await expect(page.getByText('Jornadas sin cerrar')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ha pedido corrección' })).toBeVisible()
    await page.goto('/?v=3#ausencias')
    await expect(page.getByText('Salida a las 14:05')).toBeVisible()
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.getByText('Fichaje añadido al registro')).toBeVisible()
    e = await estado(page)
    const nuevo = e.fichajes.find((x: { empleado_id: string; tipo: string; editado?: boolean }) => x.empleado_id === 'ana' && x.tipo === 'salida' && x.editado)
    expect(nuevo).toMatchObject({ ts: '2026-11-10T13:05:00.000Z', editado_por: 'Encargado/a (a petición del trabajador)' })
    expect(e.solicitudes[0]).toMatchObject({ estado: 'aprobada', fichaje: { id: nuevo.id } })
    await page.goto('/?v=4#fichajes')
    await expect(page.locator('tbody tr').nth(9)).not.toContainText('falta salida')
  })

  test('[OLV-03] al fichar la entrada con una jornada abierta, primero pide la hora de salida', async ({ page, abrir }) => {
    await abrir({ perfil: yo('ana') })
    await page.getByRole('button', { name: 'Fichar entrada' }).click()
    await expect(page.getByText(/Antes de fichar: el martes, 10 de noviembre no fichaste la salida/)).toBeVisible()
    await page.getByRole('button', { name: 'Ahora no' }).click()
    await page.getByRole('button', { name: 'Sí, registrar' }).click()
    await expect(page.getByText('Estás trabajando')).toBeVisible()
  })

  test('[REC-01][REC-02] avisos de entrada y salida sin fichar', async ({ page, abrir }) => {
    await abrir({ perfil: yo('juan'), geo: 'denegada' })
    await expect(page.getByText('Tu turno empezó a las 08:00')).toBeVisible()
    await page.getByRole('button', { name: 'Fichar ahora' }).click()
    await page.getByRole('button', { name: 'Sí, registrar' }).click()
    await expect(page.getByText('Estás trabajando')).toBeVisible()
    await expect(page.getByText(/Tu turno empezó/)).toHaveCount(0)
    await page.clock.fastForward('05:00:00')
    await expect(page.getByText('Tu turno terminó a las 15:00')).toBeVisible()
    await page.getByRole('button', { name: 'Pedir corrección' }).click()
    await expect(page.getByLabel('Hora real')).toHaveValue('15:00')
  })
})

test.describe('cambios de horario', () => {
  test('[AUS-03][AUS-04] el empleado pide un cambio con observación → aprobado → cuadrante e historial', async ({ page, abrir }) => {
    await abrir({ perfil: yo('ana'), vista: 'mihorario' })
    await page.getByRole('button', { name: 'Pedir cambio del 2026-11-12' }).click()
    await expect(page.getByText('Horario actual:')).toContainText('10:00–14:00')
    await page.getByLabel('Entrada').fill('11:00')
    await page.getByLabel('Salida').fill('15:00')
    const enviar = page.getByRole('button', { name: 'Enviar' })
    await expect(enviar).toBeDisabled()
    await page.getByPlaceholder(/médico/).fill('Médico a primera hora')
    await enviar.click()
    await expect(page.getByText('Cambio enviado')).toBeVisible()
    await expect(page.getByText('Cambio pedido · pendiente de aprobar')).toBeVisible()
    let e = await estado(page)
    expect(e.turnos.find((x: { id: string }) => x.id === 'ana_2026-11-12').tramos).toEqual([{ i: '10:00', f: '14:00' }])
    await page.evaluate(() => localStorage.setItem('tn-hor-perfil', JSON.stringify({ rol: 'encargado' })))
    await page.goto('/?v=2#ausencias')
    await expect(page.getByText('Pide: 11:00–15:00')).toBeVisible()
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.getByText('Cambio aprobado y aplicado al cuadrante')).toBeVisible()
    e = await estado(page)
    expect(e.turnos.find((x: { id: string }) => x.id === 'ana_2026-11-12')).toMatchObject({ tipo: 'trabajo', tramos: [{ i: '11:00', f: '15:00' }] })
    expect(e.solicitudes[0]).toMatchObject({ estado: 'aprobada', motivo: 'Médico a primera hora', turno_antes: { tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }] } })
    await expect(page.getByText('10:00–14:00 → 11:00–15:00')).toBeVisible()
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
