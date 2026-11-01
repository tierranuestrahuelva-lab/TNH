import type { Empleado, Turno } from './types'
import { aMin, sumarDias } from './fechas'

export function descargar(nombre: string, contenido: string, tipo = 'text/plain') {
  const b = new Blob([contenido], { type: tipo })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function csv(nombre: string, filas: (string | number)[][]) {
  const celda = (c: string | number) => {
    let s = String(c ?? '')
    if (/^[=+@\t\r]|^-[^\d]/.test(s)) s = "'" + s
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const txt = filas.map((f) => f.map(celda).join(';')).join('\r\n')
  descargar(nombre, '\ufeff' + txt, 'text/csv;charset=utf-8')
}

export function ics(nombre: string, emp: Empleado, turnos: Turno[]) {
  const p = (s: string) => s.replace(/[-:]/g, '')
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n')
  const ev = turnos.filter((t) => t.tipo === 'trabajo').flatMap((t) => t.tramos.map((x, i) => {
    const diaFin = aMin(x.f) <= aMin(x.i) ? sumarDias(t.fecha, 1) : t.fecha
    return ['BEGIN:VEVENT', `UID:${t.id}-${i}@horarios.tierranuestra`, `DTSTAMP:${p(new Date().toISOString().slice(0, 19))}Z`,
      `DTSTART:${p(t.fecha)}T${p(x.i)}00`, `DTEND:${p(diaFin)}T${p(x.f)}00`,
      `SUMMARY:Turno Tierra Nuestra${t.centro ? ' · ' + esc(t.centro) : ''}`, t.nota ? `DESCRIPTION:${esc(t.nota)}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n')
  }))
  descargar(nombre, ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tierra Nuestra//Horarios//ES', `X-WR-CALNAME:Horario ${esc(emp.nombre)}`, ...ev, 'END:VCALENDAR'].join('\r\n'), 'text/calendar')
}

export const whatsapp = (texto: string, tel?: string | null) =>
  window.open(`https://wa.me/${tel ? '34' + tel.replace(/\D/g, '').replace(/^34/, '') : ''}?text=${encodeURIComponent(texto)}`, '_blank')
