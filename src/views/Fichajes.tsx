import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileSpreadsheet, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado, Fichaje, TipoFichaje } from '../lib/types'
import { DIAS_C, deIso, diaSemana, diasMes, fechaLarga, fmtH, horaDe, hoy, mesDe, nombreMes, sumarMes, uid } from '../lib/fechas'
import { TIPOS, minTurno, resumenFichajes, textoTramos } from '../lib/reglas'
import { csv } from '../lib/exportar'
import { toast } from '../lib/toast'
import { Avatar, Boton, Modal, Tarjeta, cx, input } from '../ui'

const NOM: Record<TipoFichaje, string> = { entrada: 'Entrada', pausa: 'Pausa', vuelta: 'Vuelta', salida: 'Salida' }

export default function Fichajes() {
  const { config } = useDatos()
  const ix = useIndices()
  const [mes, setMes] = useState(mesDe(hoy()))
  const [empId, setEmpId] = useState(ix.activos[0]?.id || '')
  const [edit, setEdit] = useState<string | null>(null)
  const emp = ix.empleado(empId) || ix.activos[0]
  if (!emp) return <p className="text-zinc-500">No hay empleados.</p>
  const dias = diasMes(mes)
  const filas = dias.map((d) => {
    const fs = ix.fichajesDe(emp.id, d), t = ix.turnoDe(emp.id, d)
    const r = resumenFichajes(fs, d === hoy() ? Date.now() : new Date(d + 'T23:59:59').getTime())
    const entradas = fs.filter((f) => f.tipo === 'entrada'), salidas = fs.filter((f) => f.tipo === 'salida')
    const pausaMin = (() => { let m = 0, p: number | null = null; for (const f of fs) { if (f.tipo === 'pausa') p = new Date(f.ts).getTime(); if (f.tipo === 'vuelta' && p) { m += (new Date(f.ts).getTime() - p) / 6e4; p = null } } return m })()
    return { d, fs, t, plan: minTurno(t), trab: r.min, abierto: r.abierto && d < hoy(), entradas, salidas, pausaMin }
  })
  const totPlan = filas.reduce((s, f) => s + f.plan, 0), totTrab = filas.reduce((s, f) => s + f.trab, 0)
  const exportar = () => csv(`registro-jornada-${emp.nombre.replace(/\s+/g, '-')}-${mes}.csv`, [
    ['Registro de jornada', config.empresa, 'CIF ' + config.cif], ['Trabajador', emp.nombre, emp.puesto || ''], ['Mes', nombreMes(mes)], [],
    ['Fecha', 'Día', 'Turno previsto', 'Entrada(s)', 'Salida(s)', 'Pausas', 'Horas previstas', 'Horas trabajadas', 'Diferencia', 'Incidencias'],
    ...filas.map((f) => [f.d, DIAS_C[diaSemana(f.d)], f.t ? (f.t.tipo === 'trabajo' ? textoTramos(f.t.tramos) : TIPOS[f.t.tipo].label) : '', f.entradas.map((x) => horaDe(x.ts)).join(' / '), f.salidas.map((x) => horaDe(x.ts)).join(' / '), f.pausaMin ? fmtH(f.pausaMin) : '', f.plan ? fmtH(f.plan) : '', f.trab ? fmtH(f.trab) : '', f.plan || f.trab ? fmtH(f.trab - f.plan) : '', [f.abierto && 'Sin fichar salida', f.fs.some((x) => x.editado) && 'Corregido'].filter(Boolean).join(', ')]),
    [], ['TOTAL', '', '', '', '', '', fmtH(totPlan), fmtH(totTrab), fmtH(totTrab - totPlan)],
  ])
  return (
    <div className="space-y-4">
      <div className="solo-print mb-3 rounded-xl bg-vino-600 px-5 py-3 text-white">
        <div className="flex items-center justify-between"><img src={logo} className="h-7" /><div className="text-right"><p className="font-semibold">Registro diario de jornada · {nombreMes(mes)}</p><p className="text-sm">{config.empresa} · CIF {config.cif}</p></div></div>
        <p className="mt-2 text-sm">Trabajador/a: <b>{emp.nombre}</b> {emp.puesto && `· ${emp.puesto}`} · Jornada contratada {emp.horas_semana} h/semana</p>
      </div>
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Registro de jornada</p><h1 className="text-2xl font-semibold capitalize text-vino-900 sm:text-3xl">{nombreMes(mes)}</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-vino-100 bg-white">
            <button className="rounded-l-xl p-2.5 text-vino-700 hover:bg-vino-50" onClick={() => setMes(sumarMes(mes, -1))}><ChevronLeft size={18} /></button>
            <button className="px-3 text-sm font-medium text-vino-700" onClick={() => setMes(mesDe(hoy()))}>Este mes</button>
            <button className="rounded-r-xl p-2.5 text-vino-700 hover:bg-vino-50" onClick={() => setMes(sumarMes(mes, 1))}><ChevronRight size={18} /></button>
          </div>
          <Boton tipo="secundario" onClick={exportar}><FileSpreadsheet size={16} />Excel</Boton>
          <Boton tipo="secundario" onClick={() => window.print()}><Printer size={16} />Imprimir para firmar</Boton>
        </div>
      </div>
      <div className="no-print flex gap-2 overflow-x-auto pb-1 scroll-fino">
        {ix.activos.map((e) => (
          <button key={e.id} onClick={() => setEmpId(e.id)} className={cx('flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-medium transition', e.id === emp.id ? 'border-vino-600 bg-vino-600 text-white' : 'border-vino-100 bg-white text-zinc-700 hover:border-vino-300')}><Avatar emp={e} size={28} />{e.nombre}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 no-print">
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Previstas</p><p className="text-2xl font-semibold text-vino-900 tabular">{fmtH(totPlan)}</p></Tarjeta>
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Trabajadas</p><p className="text-2xl font-semibold text-vino-900 tabular">{fmtH(totTrab)}</p></Tarjeta>
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Diferencia</p><p className={cx('text-2xl font-semibold tabular', totTrab - totPlan > 0 ? 'text-amber-700' : 'text-vino-900')}>{totTrab - totPlan > 0 ? '+' : ''}{fmtH(totTrab - totPlan)}</p></Tarjeta>
      </div>
      <div className="print-plano overflow-x-auto rounded-2xl border border-vino-100/60 bg-white shadow-suave scroll-fino">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="bg-vino-50/60 text-left font-cond text-[11px] uppercase tracking-wider text-vino-700">
            <th className="px-4 py-2.5">Día</th><th className="px-2">Previsto</th><th className="px-2">Fichajes</th><th className="px-2 text-right">Pausas</th><th className="px-2 text-right">Trabajado</th><th className="px-2 text-right">Dif.</th><th className="no-print w-10" />
          </tr></thead>
          <tbody>
            {filas.map((f) => {
              const fin = diaSemana(f.d) >= 5
              return (
                <tr key={f.d} className={cx('border-t border-vino-50', fin && 'bg-zinc-50/60', f.d === hoy() && 'bg-vino-50/50')}>
                  <td className="px-4 py-2 font-medium tabular"><span className="inline-block w-8 text-zinc-400">{DIAS_C[diaSemana(f.d)]}</span>{deIso(f.d).getDate()}</td>
                  <td className="px-2 text-zinc-600 tabular">{f.t ? (f.t.tipo === 'trabajo' ? textoTramos(f.t.tramos) : <span style={{ color: TIPOS[f.t.tipo].fg }}>{TIPOS[f.t.tipo].label}</span>) : ix.festivoDe(f.d) ? <span className="text-blue-700">{ix.festivoDe(f.d)}</span> : ''}</td>
                  <td className="px-2">
                    <div className="flex flex-wrap gap-1">{f.fs.map((x) => <span key={x.id} className={cx('rounded-md px-1.5 py-0.5 text-xs tabular', x.tipo === 'entrada' || x.tipo === 'vuelta' ? 'bg-emerald-50 text-emerald-800' : x.tipo === 'pausa' ? 'bg-amber-50 text-amber-800' : 'bg-vino-50 text-vino-800', x.editado && 'ring-1 ring-zinc-300')} title={x.nota || ''}>{NOM[x.tipo][0]} {horaDe(x.ts)}{x.editado && '*'}</span>)}
                      {f.abierto && <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">falta salida</span>}
                      {!f.fs.length && f.plan > 0 && f.d < hoy() && <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">sin fichar</span>}
                    </div>
                  </td>
                  <td className="px-2 text-right text-zinc-500 tabular">{f.pausaMin ? fmtH(f.pausaMin) : ''}</td>
                  <td className="px-2 text-right font-semibold tabular">{f.trab ? fmtH(f.trab) : ''}</td>
                  <td className={cx('px-2 text-right tabular', f.trab - f.plan > 15 ? 'text-amber-700' : f.trab - f.plan < -15 ? 'text-red-600' : 'text-zinc-400')}>{f.plan || f.trab ? fmtH(f.trab - f.plan) : ''}</td>
                  <td className="no-print pr-2"><button onClick={() => setEdit(f.d)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-vino-50 hover:text-vino-700" title="Corregir"><Pencil size={15} /></button></td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-vino-100 bg-vino-50/40 font-semibold"><td className="px-4 py-2.5" colSpan={4}>Total {nombreMes(mes)}</td><td className="px-2 text-right tabular">{fmtH(totTrab)}</td><td className="px-2 text-right tabular">{fmtH(totTrab - totPlan)}</td><td className="no-print" /></tr>
          </tbody>
        </table>
      </div>
      <p className="no-print text-xs text-zinc-500">* Fichaje corregido manualmente (queda marcado con el motivo). La ley obliga a conservar el registro 4 años y tenerlo a disposición del trabajador y de la Inspección de Trabajo.</p>
      <div className="solo-print mt-10 grid grid-cols-2 gap-16 text-sm"><div className="border-t border-zinc-400 pt-2">Firma de la empresa</div><div className="border-t border-zinc-400 pt-2">Firma del trabajador/a</div></div>
      {edit && <EditorFichajes emp={emp} fecha={edit} onCerrar={() => setEdit(null)} />}
    </div>
  )
}

function EditorFichajes({ emp, fecha, onCerrar }: { emp: Empleado; fecha: string; onCerrar: () => void }) {
  const { guardar, borrar } = useDatos()
  const ix = useIndices()
  const fs = ix.fichajesDe(emp.id, fecha)
  const [tipo, setTipo] = useState<TipoFichaje>(fs.length && fs[fs.length - 1].tipo !== 'salida' ? 'salida' : 'entrada')
  const [hora, setHora] = useState('')
  const [nota, setNota] = useState('')
  const ts = (h: string) => new Date(`${fecha}T${h}:00`).toISOString()
  const anadir = () => {
    guardar('fichajes', { id: uid(), empleado_id: emp.id, ts: ts(hora), tipo, editado: true, nota: nota || 'Añadido por el encargado' } as Fichaje)
    setHora(''); toast('Fichaje añadido')
  }
  const cambiarHora = (f: Fichaje, h: string) => h && guardar('fichajes', { ...f, ts: ts(h), editado: true, nota: f.nota || 'Hora corregida por el encargado' })
  return (
    <Modal abierto onCerrar={onCerrar} titulo={<span className="first-letter:uppercase">{emp.nombre} · {fechaLarga(fecha)}</span>}>
      <ul className="mb-5 space-y-2">
        {fs.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-xl bg-vino-50/50 p-2">
            <span className="w-20 text-sm font-medium">{NOM[f.tipo]}</span>
            <input type="time" defaultValue={horaDe(f.ts)} onBlur={(e) => e.target.value !== horaDe(f.ts) && cambiarHora(f, e.target.value)} className={cx(input, 'w-32 tabular')} />
            <span className="flex-1 truncate text-xs text-zinc-500">{f.editado ? f.nota || 'Corregido' : 'Fichado por el trabajador'}</span>
            <button onClick={() => borrar('fichajes', f.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
          </li>
        ))}
        {!fs.length && <p className="text-sm text-zinc-500">No hay fichajes este día.</p>}
      </ul>
      <p className="mb-2 font-cond text-xs uppercase tracking-wider text-vino-800/70">Añadir fichaje olvidado</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoFichaje)} className={input}>{Object.entries(NOM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={cx(input, 'tabular')} />
        <Boton onClick={anadir} disabled={!hora} className="col-span-2 sm:col-span-1"><Plus size={16} />Añadir</Boton>
      </div>
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Motivo (ej.: olvidó fichar la salida)" className={cx(input, 'mt-2')} />
    </Modal>
  )
}
