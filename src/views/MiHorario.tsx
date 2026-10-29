import { CalendarPlus, MessageCircle } from 'lucide-react'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado, Turno } from '../lib/types'
import { DIAS, deIso, diaSemana, fechaCorta, fmtH, hoy, lunesDe, numSemana, semana, sumarDias, MESES } from '../lib/fechas'
import { TIPOS, minTurno, textoTramos } from '../lib/reglas'
import { ics, whatsapp } from '../lib/exportar'
import { Barra, Boton, Tarjeta, cx } from '../ui'

export default function MiHorario({ emp }: { emp: Empleado }) {
  const { turnos } = useDatos()
  const ix = useIndices()
  const f = hoy()
  const semanas = [0, 1, 2, 3].map((k) => semana(sumarDias(lunesDe(f), 7 * k)))
  const anio = f.slice(0, 4)
  const vac = turnos.filter((t) => t.empleado_id === emp.id && t.tipo === 'vacaciones' && t.fecha.startsWith(anio)).length
  const futuros = turnos.filter((t) => t.empleado_id === emp.id && t.fecha >= f).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const texto = () => ['*Mi horario · Tierra Nuestra*', ...semanas[0].concat(semanas[1]).map((d) => { const t = ix.turnoDe(emp.id, d); return `${DIAS[diaSemana(d)]} ${fechaCorta(d)}: ${!t ? '—' : t.tipo === 'trabajo' ? textoTramos(t.tramos) : TIPOS[t.tipo].label}` })].join('\n')

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Hola, {emp.nombre.split(' ')[0]}</p><h1 className="text-2xl font-semibold text-vino-900">Mi horario</h1></div>
        <div className="flex gap-2">
          <Boton tipo="secundario" onClick={() => ics('mi-horario-tierra-nuestra.ics', emp, futuros as Turno[])}><CalendarPlus size={16} />A mi calendario</Boton>
          <Boton tipo="secundario" onClick={() => whatsapp(texto())}><MessageCircle size={16} /></Boton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Vacaciones {anio}</p><p className="mt-1 text-2xl font-semibold text-vino-900">{vac} <span className="text-base font-normal text-zinc-500">/ {emp.vacaciones_anuales} días</span></p><div className="mt-2"><Barra valor={vac} max={emp.vacaciones_anuales} color="#047857" /></div></Tarjeta>
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Esta semana</p><p className="mt-1 text-2xl font-semibold text-vino-900 tabular">{fmtH(semanas[0].reduce((s, d) => s + minTurno(ix.turnoDe(emp.id, d)), 0))} <span className="text-base font-normal text-zinc-500">/ {emp.horas_semana} h</span></p></Tarjeta>
      </div>

      {semanas.map((dias, k) => (
        <Tarjeta key={k} titulo={k === 0 ? 'Esta semana' : k === 1 ? 'Próxima semana' : `Semana ${numSemana(dias[0])}`} accion={<span className="text-xs text-zinc-500">{fechaCorta(dias[0])} – {fechaCorta(dias[6])} · {fmtH(dias.reduce((s, d) => s + minTurno(ix.turnoDe(emp.id, d)), 0))}</span>}>
          <ul className="space-y-1.5">
            {dias.map((d) => {
              const t = ix.turnoDe(emp.id, d), fest = ix.festivoDe(d), ti = t ? TIPOS[t.tipo] : null
              return (
                <li key={d} className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5', d === f ? 'bg-vino-600 text-white' : d < f ? 'opacity-50' : 'bg-vino-50/40')}>
                  <div className="w-12 text-center"><p className={cx('font-cond text-[11px] uppercase', d === f ? 'text-lila-100' : 'text-zinc-500')}>{DIAS[diaSemana(d)].slice(0, 3)}</p><p className="text-xl font-semibold leading-none">{deIso(d).getDate()}</p></div>
                  <div className="min-w-0 flex-1">
                    {!t ? <p className={cx('text-sm', d === f ? 'text-white/70' : 'text-zinc-400')}>Sin asignar</p>
                      : t.tipo === 'trabajo' ? <><p className="font-semibold tabular">{textoTramos(t.tramos)}</p><p className={cx('truncate text-xs', d === f ? 'text-lila-100' : 'text-zinc-500')}>{fmtH(minTurno(t))}{t.centro && ` · ${t.centro}`}{t.nota && ` · ${t.nota}`}</p></>
                      : <span className="inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium" style={{ background: ti!.bg, color: ti!.fg }}>{ti!.label}</span>}
                    {fest && <p className={cx('text-xs', d === f ? 'text-white' : 'text-blue-700')}>Festivo: {fest}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Tarjeta>
      ))}
      <p className="text-center text-xs text-zinc-400">Los cambios del encargado aparecen aquí al momento · {MESES[new Date().getMonth()]}</p>
    </div>
  )
}
