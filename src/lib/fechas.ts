export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_C = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const p2 = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const deIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const hoy = () => iso(new Date())
export const sumarDias = (s: string, n: number) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d) }
export const diaSemana = (s: string) => (deIso(s).getDay() + 6) % 7
export const lunesDe = (s: string) => sumarDias(s, -diaSemana(s))
export const semana = (lunes: string) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
export const rango = (a: string, b: string) => { const r: string[] = []; for (let d = a; d <= b; d = sumarDias(d, 1)) r.push(d); return r }
export const mesDe = (s: string) => s.slice(0, 7)
export const diasMes = (ym: string) => { const [y, m] = ym.split('-').map(Number); const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => `${ym}-${p2(i + 1)}`) }
export const sumarMes = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}` }
export const nombreMes = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} ${y}` }
export const fechaLarga = (s: string) => { const d = deIso(s); return `${DIAS[diaSemana(s)]}, ${d.getDate()} de ${MESES[d.getMonth()]}` }
export const fechaCorta = (s: string) => { const d = deIso(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}` }
export const numSemana = (s: string) => {
  const d = deIso(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}
export const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0) }
export const deMin = (m: number) => `${p2(Math.floor(m / 60) % 24)}:${p2(Math.round(m % 60))}`
export const horaDe = (ts: string) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}` }
export const fmtH = (min: number) => {
  const s = min < 0 ? '-' : ''; const a = Math.abs(Math.round(min))
  const h = Math.floor(a / 60), m = a % 60
  return m ? `${s}${h}h ${p2(m)}` : `${s}${h}h`
}
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
