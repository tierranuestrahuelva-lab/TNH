import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { csv, ics } from '../../src/lib/exportar'
import type { Empleado, Turno } from '../../src/lib/types'

let ultimo: { nombre: string; blob: Blob } | null = null
beforeEach(() => {
  ultimo = null
  let blob: Blob
  vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { blob = b; return 'blob:x' }, revokeObjectURL: () => {} })
  vi.stubGlobal('document', { createElement: () => { const a: any = { click: () => { ultimo = { nombre: a.download, blob } } }; return a } })
})
afterEach(() => vi.unstubAllGlobals())
const emp: Empleado = { id: 'ana', nombre: 'Ana', horas_semana: 40, vacaciones_anuales: 30, activo: true, orden: 0 }

describe('exportar', () => {
  it('[REG-06] CSV para Excel español: BOM, punto y coma y textos raros escapados', async () => {
    csv('r.csv', [['Nombre', 'Nota'], ['López, Ana', 'dijo "hola"; adiós\nfin'], ['Ñandú', 3]])
    const bytes = new Uint8Array(await ultimo!.blob.arrayBuffer())
    expect(ultimo!.nombre).toBe('r.csv')
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const filas = (await ultimo!.blob.text()).split('\r\n')
    expect(filas[0]).toBe('Nombre;Nota')
    expect(filas[1]).toBe('López, Ana;"dijo ""hola""; adiós\nfin"')
    expect(filas[2]).toBe('Ñandú;3')
  })
  it('[CUA-08] calendario .ics con la hora de fin después de la de inicio', async () => {
    const turnos: Turno[] = [
      { id: 'a', empleado_id: 'ana', fecha: '2026-11-09', tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }] },
      { id: 'b', empleado_id: 'ana', fecha: '2026-11-10', tipo: 'trabajo', tramos: [{ i: '22:00', f: '02:00' }] },
      { id: 'c', empleado_id: 'ana', fecha: '2026-11-11', tipo: 'libre', tramos: [] },
    ]
    ics('h.ics', emp, turnos)
    const txt = await ultimo!.blob.text()
    const ev = txt.split('BEGIN:VEVENT').slice(1)
    expect(ev).toHaveLength(2)
    for (const e of ev) {
      const ini = e.match(/DTSTART:(\d{8}T\d{6})/)![1], fin = e.match(/DTEND:(\d{8}T\d{6})/)![1]
      expect(fin > ini).toBe(true)
    }
    expect(ev[1]).toContain('DTEND:20261111T020000')
  })
})

describe('árbitro · exportar', () => {
  it('[REG-06] un texto que empieza por "=" no se ejecuta como fórmula al abrir en Excel', async () => {
    csv('r.csv', [['Nota', 'Dif'], ['=HIPERVINCULO("http://x")', '-1h 30'], ['@SUMA(A1)', '+34 600']])
    const filas = (await ultimo!.blob.text()).split('\r\n')
    expect(filas[1]).toBe(`"'=HIPERVINCULO(""http://x"")";-1h 30`)
    expect(filas[2]).toBe("'@SUMA(A1);'+34 600")
  })
  it('[CUA-08] notas con comas, punto y coma o saltos no rompen el .ics', async () => {
    const t: Turno = { id: 't1', empleado_id: 'ana', fecha: '2026-11-10', tipo: 'trabajo', tramos: [{ i: '10:00', f: '14:00' }], nota: 'Cata; traer copas, hielo\nY mesas' }
    ics('h.ics', { ...emp, nombre: 'Ana, la de tienda' }, [t])
    const txt = await ultimo!.blob.text()
    expect(txt).toContain('DESCRIPTION:Cata\\; traer copas\\, hielo\\nY mesas')
    expect(txt).toContain('X-WR-CALNAME:Horario Ana\\, la de tienda')
  })
})
