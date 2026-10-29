import { useState } from 'react'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado } from '../lib/types'
import { DIAS_C, deIso, diaSemana, diasMes, fmtH, hoy, mesDe, nombreMes, sumarMes, lunesDe, sumarDias } from '../lib/fechas'
import { TIPOS, minTurno } from '../lib/reglas'
import { Avatar, Boton, cx, iniciales } from '../ui'
import EditorTurno from './EditorTurno'

export default function Mes() {
  const { config } = useDatos()
  const ix = useIndices()
  const [mes, setMes] = useState(mesDe(hoy()))
  const [edit, setEdit] = useState<{ emp: Empleado; fecha: string } | null>(null)
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const dias = diasMes(mes)
  const inicio = lunesDe(dias[0])
  const celdas: string[] = []
  for (let d = inicio; d <= dias[dias.length - 1] || diaSemana(d) !== 0; d = sumarDias(d, 1)) celdas.push(d)

  return (
    <div className="space-y-4">
      <div className="solo-print mb-3 rounded-xl bg-vino-600 px-5 py-3 text-white"><div className="flex items-center justify-between"><img src={logo} className="h-7" /><p className="font-semibold capitalize">Calendario · {nombreMes(mes)}</p></div></div>
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Vista mensual</p><h1 className="text-2xl font-semibold capitalize text-vino-900 sm:text-3xl">{nombreMes(mes)}</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-vino-100 bg-white">
            <button className="rounded-l-xl p-2.5 text-vino-700 hover:bg-vino-50" onClick={() => setMes(sumarMes(mes, -1))}><ChevronLeft size={18} /></button>
            <button className="px-3 text-sm font-medium text-vino-700" onClick={() => setMes(mesDe(hoy()))}>Hoy</button>
            <button className="rounded-r-xl p-2.5 text-vino-700 hover:bg-vino-50" onClick={() => setMes(sumarMes(mes, 1))}><ChevronRight size={18} /></button>
          </div>
          <Boton tipo="secundario" onClick={() => window.print()}><Printer size={16} />Imprimir</Boton>
        </div>
      </div>
      <div className="print-plano overflow-hidden rounded-2xl border border-vino-100/60 bg-white shadow-suave">
        <div className="grid grid-cols-7 bg-vino-50/60">{DIAS_C.map((d) => <p key={d} className="py-2 text-center font-cond text-xs font-semibold uppercase tracking-wider text-vino-700">{d}</p>)}</div>
        <div className="grid grid-cols-7">
          {celdas.map((d) => {
            const fuera = mesDe(d) !== mes, fest = ix.festivoDe(d)
            const lista = ix.activos.map((e) => ({ e, t: ix.turnoDe(e.id, d) })).filter((x) => x.t)
            return (
              <button key={d} onClick={() => setDiaAbierto(d)} className={cx('min-h-[92px] border-b border-r border-vino-50 p-1.5 text-left align-top transition hover:bg-vino-50/40 sm:min-h-[118px]', fuera && 'bg-zinc-50/70 opacity-50', fest && !fuera && 'bg-blue-50/50')}>
                <p className="mb-1 flex items-center justify-between"><span className={cx('grid h-6 w-6 place-items-center rounded-full text-xs font-semibold', d === hoy() ? 'bg-vino-600 text-white' : 'text-zinc-700')}>{deIso(d).getDate()}</span>{fest && <span className="hidden truncate pl-1 text-[9px] font-medium text-blue-700 sm:block" title={fest}>{fest}</span>}</p>
                <div className="flex flex-wrap gap-0.5 sm:block sm:space-y-0.5">
                  {lista.map(({ e, t }) => (
                    <span key={e.id} className="flex items-center gap-1 truncate rounded px-1 text-[10px] font-medium leading-4 sm:py-px" style={{ background: t!.tipo === 'trabajo' ? (e.color || '#830040') + '1a' : TIPOS[t!.tipo].bg, color: t!.tipo === 'trabajo' ? e.color || '#830040' : TIPOS[t!.tipo].fg }}>
                      <span className="sm:hidden">{iniciales(e.nombre)}</span><span className="hidden truncate sm:inline">{e.nombre.split(' ')[0]} {t!.tipo === 'trabajo' ? t!.tramos[0]?.i : '· ' + TIPOS[t!.tipo].corto}</span>
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ix.activos.map((e) => {
          const m = dias.reduce((s, d) => s + minTurno(ix.turnoDe(e.id, d)), 0)
          const cuenta = (tipo: string) => dias.filter((d) => ix.turnoDe(e.id, d)?.tipo === tipo).length
          return (
            <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-vino-100/60 bg-white p-3 shadow-suave">
              <Avatar emp={e} size={34} />
              <div className="min-w-0 flex-1 text-sm"><p className="truncate font-semibold">{e.nombre}</p><p className="text-xs text-zinc-500">{fmtH(m)} · {cuenta('trabajo')} días{cuenta('vacaciones') ? ` · ${cuenta('vacaciones')} vac.` : ''}{cuenta('baja') ? ` · ${cuenta('baja')} baja` : ''}</p></div>
            </div>
          )
        })}
      </div>
      {diaAbierto && (
        <div className="no-print fixed inset-0 z-40 flex items-end justify-center bg-vino-900/30 sm:items-center" onClick={() => setDiaAbierto(null)}>
          <div className="animate-subir w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(x) => x.stopPropagation()}>
            <p className="mb-3 text-lg font-semibold capitalize text-vino-900">{DIAS_C[diaSemana(diaAbierto)]} {deIso(diaAbierto).getDate()} · {ix.festivoDe(diaAbierto) || nombreMes(mesDe(diaAbierto))}</p>
            <ul className="space-y-1">
              {ix.activos.map((e) => { const t = ix.turnoDe(e.id, diaAbierto); return (
                <li key={e.id}><button onClick={() => { setEdit({ emp: e, fecha: diaAbierto }); setDiaAbierto(null) }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-vino-50">
                  <Avatar emp={e} size={30} /><span className="flex-1 text-sm font-medium">{e.nombre}</span>
                  <span className="text-sm tabular" style={{ color: t ? TIPOS[t.tipo].fg : '#a1a1aa' }}>{!t ? 'Sin asignar' : t.tipo === 'trabajo' ? t.tramos.map((x) => `${x.i}–${x.f}`).join(' · ') : TIPOS[t.tipo].label}</span>
                </button></li>) })}
            </ul>
          </div>
        </div>
      )}
      <EditorTurno emp={edit?.emp || null} fecha={edit?.fecha || null} onCerrar={() => setEdit(null)} />
      <p className="hidden">{config.empresa}</p>
    </div>
  )
}
