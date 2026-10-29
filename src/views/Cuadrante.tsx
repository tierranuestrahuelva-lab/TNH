import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Eraser, FileSpreadsheet, MessageCircle, Paintbrush, Printer, Repeat, StickyNote, X } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import { turnoId, useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado, Turno, TipoTurno, Tramo } from '../lib/types'
import { DIAS, DIAS_C, deIso, diaSemana, fechaCorta, fmtH, hoy, lunesDe, numSemana, semana, sumarDias, aMin } from '../lib/fechas'
import { TIPOS, avisosSemana, huecosCobertura, minTramo, minTurno, textoTramos } from '../lib/reglas'
import { csv, whatsapp } from '../lib/exportar'
import { toast } from '../lib/toast'
import { Avatar, Barra, Boton, Modal, Segmentos, cx } from '../ui'
import EditorTurno from './EditorTurno'

type Pincel = { tipo: TipoTurno; tramos: Tramo[]; nombre: string; color: string } | 'borrar' | null

export default function Cuadrante({ editable }: { editable: boolean }) {
  const { config, turnos, guardar, borrar } = useDatos()
  const ix = useIndices()
  const [lunes, setLunes] = useState(() => lunesDe(hoy()))
  const [modo, setModo] = useState<'semana' | 'dia'>('semana')
  const [diaSel, setDiaSel] = useState(hoy())
  const [centro, setCentro] = useState('')
  const [edit, setEdit] = useState<{ emp: Empleado; fecha: string } | null>(null)
  const [pincel, setPincel] = useState<Pincel>(null)
  const [verAvisos, setVerAvisos] = useState(false)
  const [repetir, setRepetir] = useState(false)
  const dias = semana(lunes)
  const emps = ix.activos.filter((e) => !centro || e.centro === centro || dias.some((d) => ix.turnoDe(e.id, d)?.centro === centro))

  const avisos = useMemo(() => emps.flatMap((e) => avisosSemana(e, dias, ix.turnoDe, config, ix.festivoDe)), [emps, dias, ix, config])
  const avisosDe = (id: string) => avisos.filter((a) => a.empleado_id === id)

  const turnosSemana = (desde: string) => semana(desde).flatMap((d) => emps.map((e) => ix.turnoDe(e.id, d)).filter(Boolean) as Turno[])
  const copiarAnterior = () => {
    const prev = turnosSemana(sumarDias(lunes, -7))
    if (!prev.length) return toast('La semana anterior está vacía')
    if (turnosSemana(lunes).length && !confirm('Esta semana ya tiene turnos. ¿Sustituirlos por los de la semana anterior?')) return
    borrar('turnos', turnosSemana(lunes).map((t) => t.id))
    guardar('turnos', prev.map((t) => { const f = sumarDias(t.fecha, 7); return { ...t, id: turnoId(t.empleado_id, f), fecha: f } }))
    toast(`${prev.length} turnos copiados`)
  }
  const repetirSemanas = (n: number) => {
    const act = turnosSemana(lunes)
    if (!act.length) return toast('Esta semana está vacía')
    const filas: Turno[] = []
    for (let k = 1; k <= n; k++) for (const t of act) { const f = sumarDias(t.fecha, 7 * k); filas.push({ ...t, id: turnoId(t.empleado_id, f), fecha: f }) }
    guardar('turnos', filas)
    setRepetir(false)
    toast(`Semana repetida en las ${n} siguientes`)
  }
  const vaciar = () => {
    const act = turnosSemana(lunes)
    if (act.length && confirm(`¿Borrar los ${act.length} turnos de esta semana?`)) { borrar('turnos', act.map((t) => t.id)); toast('Semana vaciada') }
  }
  const pulsarCelda = (emp: Empleado, fecha: string) => {
    if (!editable) return
    if (!pincel) return setEdit({ emp, fecha })
    if (pincel === 'borrar') { const t = ix.turnoDe(emp.id, fecha); if (t) borrar('turnos', t.id); return }
    guardar('turnos', { id: turnoId(emp.id, fecha), empleado_id: emp.id, fecha, tipo: pincel.tipo, tramos: pincel.tramos, centro: pincel.tipo === 'trabajo' ? emp.centro || config.centros[0] : null, nota: null })
  }
  const exportar = () => {
    csv(`cuadrante-${lunes}.csv`, [['Empleado', 'Puesto', ...dias.map((d) => `${DIAS[diaSemana(d)]} ${fechaCorta(d)}`), 'Horas'],
      ...emps.map((e) => [e.nombre, e.puesto || '', ...dias.map((d) => { const t = ix.turnoDe(e.id, d); return !t ? '' : t.tipo === 'trabajo' ? textoTramos(t.tramos) : TIPOS[t.tipo].label }), fmtH(dias.reduce((s, d) => s + minTurno(ix.turnoDe(e.id, d)), 0))])])
  }
  const textoWhats = (e?: Empleado) => {
    const l = [`*Horario Tierra Nuestra* · semana ${numSemana(lunes)} (${fechaCorta(lunes)} – ${fechaCorta(dias[6])})`, '']
    for (const emp of e ? [e] : emps) {
      if (!e) l.push(`*${emp.nombre}*`)
      for (const d of dias) {
        const t = ix.turnoDe(emp.id, d)
        l.push(`${DIAS_C[diaSemana(d)]} ${deIso(d).getDate()}: ${!t ? '—' : t.tipo === 'trabajo' ? textoTramos(t.tramos) + (t.nota ? ` (${t.nota})` : '') : TIPOS[t.tipo].label}`)
      }
      l.push('')
    }
    return l.join('\n')
  }

  const minEmp = (e: Empleado) => dias.reduce((s, d) => s + minTurno(ix.turnoDe(e.id, d)), 0)
  const coste = emps.reduce((s, e) => s + (e.coste_hora || 0) * minEmp(e) / 60, 0)
  const totalMin = emps.reduce((s, e) => s + minEmp(e), 0)
  const errores = avisos.filter((a) => a.nivel === 'error').length

  return (
    <div className="space-y-4">
      <div className="solo-print mb-3 rounded-xl bg-vino-600 px-5 py-3 text-white">
        <div className="flex items-center justify-between"><img src={logo} className="h-7" /><div className="text-right"><p className="font-semibold">Cuadrante semanal · semana {numSemana(lunes)}</p><p className="text-sm">{fechaCorta(lunes)} – {fechaCorta(dias[6])} {deIso(dias[6]).getFullYear()}{centro && ` · ${centro}`}</p></div></div>
      </div>

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Semana {numSemana(lunes)}</p>
          <h1 className="text-2xl font-semibold text-vino-900 sm:text-3xl">{fechaCorta(lunes)} – {fechaCorta(dias[6])} <span className="text-zinc-400">{deIso(dias[6]).getFullYear()}</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-vino-100 bg-white">
            <button className="p-2.5 text-vino-700 hover:bg-vino-50 rounded-l-xl" onClick={() => { setLunes(sumarDias(lunes, -7)); setDiaSel(sumarDias(diaSel, -7)) }} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
            <button className="px-3 text-sm font-medium text-vino-700" onClick={() => { setLunes(lunesDe(hoy())); setDiaSel(hoy()) }}>Hoy</button>
            <button className="p-2.5 text-vino-700 hover:bg-vino-50 rounded-r-xl" onClick={() => { setLunes(sumarDias(lunes, 7)); setDiaSel(sumarDias(diaSel, 7)) }} aria-label="Semana siguiente"><ChevronRight size={18} /></button>
          </div>
          <input type="date" value={lunes} onChange={(e) => e.target.value && (setLunes(lunesDe(e.target.value)), setDiaSel(e.target.value))} className="rounded-xl border border-vino-100 bg-white px-3 py-2 text-sm text-vino-800" />
          <Segmentos valor={modo} onChange={setModo} opciones={[{ v: 'semana', l: 'Semana' }, { v: 'dia', l: 'Por horas' }]} />
          {config.centros.length > 1 && (
            <select value={centro} onChange={(e) => setCentro(e.target.value)} className="rounded-xl border border-vino-100 bg-white px-3 py-2 text-sm text-vino-800">
              <option value="">Todos los centros</option>{config.centros.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato t="Horas planificadas" v={fmtH(totalMin)} />
        <Dato t="Personas" v={String(emps.filter((e) => minEmp(e) > 0).length) + ' / ' + emps.length} />
        {editable ? <Dato t="Coste estimado" v={coste ? coste.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'} sub={coste ? 'según €/hora de cada ficha' : 'añade €/hora en Equipo'} /> : <Dato t="Festivos" v={String(dias.filter((d) => ix.festivoDe(d)).length)} />}
        <button onClick={() => setVerAvisos(true)} className={cx('rounded-2xl border p-4 text-left shadow-suave transition', errores ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-vino-100/60 bg-white hover:bg-vino-50')}>
          <p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Revisión legal</p>
          <p className={cx('mt-1 flex items-center gap-2 text-xl font-semibold', errores ? 'text-red-700' : 'text-emerald-700')}>{errores ? <><AlertTriangle size={18} />{errores} {errores === 1 ? 'problema' : 'problemas'}</> : 'Todo correcto'}</p>
          <p className="text-xs text-zinc-500">{avisos.length - errores} avisos · ver detalle</p>
        </button>
      </div>

      {editable && (
        <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-vino-100/60 bg-white p-2 shadow-suave">
          <span className="flex items-center gap-1.5 px-2 font-cond text-xs uppercase tracking-wider text-vino-700"><Paintbrush size={14} />Pintar</span>
          {config.plantillas.map((p) => (
            <Chip key={p.id} activo={pincel !== null && pincel !== 'borrar' && pincel.nombre === p.nombre} color={p.color} onClick={() => setPincel(pincel !== 'borrar' && pincel?.nombre === p.nombre ? null : { tipo: 'trabajo', tramos: p.tramos, nombre: p.nombre, color: p.color })}>{p.nombre}</Chip>
          ))}
          {(['libre', 'vacaciones', 'baja', 'permiso'] as TipoTurno[]).map((k) => (
            <Chip key={k} activo={pincel !== null && pincel !== 'borrar' && pincel.nombre === k} color={TIPOS[k].borde} onClick={() => setPincel(pincel !== 'borrar' && pincel?.nombre === k ? null : { tipo: k, tramos: [], nombre: k, color: TIPOS[k].borde })}>{TIPOS[k].label}</Chip>
          ))}
          <Chip activo={pincel === 'borrar'} color="#71717a" onClick={() => setPincel(pincel === 'borrar' ? null : 'borrar')}><Eraser size={13} />Borrar</Chip>
          {pincel && <button onClick={() => setPincel(null)} className="ml-1 flex items-center gap-1 rounded-full bg-vino-600 px-3 py-1 text-xs font-medium text-white"><X size={12} />Terminar</button>}
          <div className="ml-auto flex flex-wrap gap-1">
            <Accion icono={<Copy size={16} />} t="Copiar semana anterior" onClick={copiarAnterior} />
            <Accion icono={<Repeat size={16} />} t="Repetir en semanas siguientes" onClick={() => setRepetir(true)} />
            <Accion icono={<Eraser size={16} />} t="Vaciar semana" onClick={vaciar} />
            <Accion icono={<MessageCircle size={16} />} t="Enviar por WhatsApp" onClick={() => whatsapp(textoWhats())} />
            <Accion icono={<FileSpreadsheet size={16} />} t="Descargar Excel (CSV)" onClick={exportar} />
            <Accion icono={<Printer size={16} />} t="Imprimir / PDF" onClick={() => window.print()} />
          </div>
        </div>
      )}
      {!editable && (
        <div className="no-print flex justify-end gap-2"><Boton tipo="secundario" onClick={() => window.print()}><Printer size={16} />Imprimir</Boton></div>
      )}
      {pincel && <p className="no-print -mt-2 text-sm text-vino-700">Toca las casillas para {pincel === 'borrar' ? 'borrar turnos' : <>poner <b>{pincel.tipo === 'trabajo' ? pincel.nombre : TIPOS[pincel.tipo].label}</b></>}.</p>}

      {modo === 'semana' ? (
        <div className="print-plano overflow-x-auto rounded-2xl border border-vino-100/60 bg-white shadow-suave scroll-fino">
          <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-vino-50/60">
                <th className="sticky left-0 z-10 w-48 bg-vino-50 px-4 py-3 text-left font-cond text-xs font-semibold uppercase tracking-wider text-vino-700">Equipo</th>
                {dias.map((d) => {
                  const fest = ix.festivoDe(d), esHoy = d === hoy()
                  return (
                    <th key={d} className={cx('px-2 py-2.5 text-center', esHoy && 'bg-vino-600 text-white')}>
                      <span className={cx('block font-cond text-[11px] uppercase tracking-wider', esHoy ? 'text-lila-100' : 'text-zinc-500')}>{DIAS_C[diaSemana(d)]}</span>
                      <span className={cx('block text-lg font-semibold leading-tight', !esHoy && 'text-vino-900')}>{deIso(d).getDate()}</span>
                      {fest && <span className={cx('mt-0.5 block truncate text-[10px] font-medium', esHoy ? 'text-white' : 'text-blue-700')} title={fest}>{fest}</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {emps.map((e) => {
                const m = minEmp(e), av = avisosDe(e.id)
                return (
                  <tr key={e.id} className="border-t border-vino-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar emp={e} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-zinc-800">{e.nombre}{av.some((a) => a.nivel === 'error') && <AlertTriangle size={14} className="shrink-0 text-red-600" />}</p>
                          <p className="mb-1 flex justify-between text-[11px] text-zinc-500 tabular"><span className="truncate">{e.puesto}</span><span className={cx(m > e.horas_semana * 60 && 'font-semibold text-red-600')}>{fmtH(m)} / {e.horas_semana}h</span></p>
                          <Barra valor={m} max={e.horas_semana * 60} color={e.color || undefined} />
                        </div>
                      </div>
                    </td>
                    {dias.map((d) => {
                      const t = ix.turnoDe(e.id, d)
                      const err = av.some((a) => a.fecha === d && a.nivel === 'error')
                      return (
                        <td key={d} className={cx('p-1 align-top', d === hoy() && 'bg-vino-50/40')}>
                          <button onClick={() => pulsarCelda(e, d)} className={cx('group flex min-h-[64px] w-full flex-col justify-center rounded-xl border-2 border-dashed p-1.5 text-left transition', t ? 'border-transparent' : 'border-transparent', editable && 'hover:border-vino-200', !editable && 'cursor-default')}>
                            {t ? <Celda t={t} err={err} /> : editable && <span className="mx-auto text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100">+ añadir</span>}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr className="border-t-2 border-vino-100 bg-vino-50/40">
                <td className="sticky left-0 z-10 bg-vino-50 px-4 py-2 font-cond text-xs font-semibold uppercase tracking-wider text-vino-700">Cobertura tienda</td>
                {dias.map((d) => {
                  const ts = emps.map((e) => ix.turnoDe(e.id, d)).filter(Boolean) as Turno[]
                  const pers = ts.filter((t) => t.tipo === 'trabajo').length
                  const huecos = huecosCobertura(d, ts.filter((t) => !t.centro || t.centro === config.centros[0]), config)
                  const cerrado = !(config.apertura[diaSemana(d)] || []).length || ix.festivoDe(d)
                  return (
                    <td key={d} className="px-2 py-2 text-center align-top">
                      <p className="text-sm font-semibold text-vino-900">{pers} <span className="font-normal text-zinc-500">pers.</span></p>
                      <MiniLinea fecha={d} turnos={ts} />
                      {cerrado ? <p className="mt-1 text-[10px] text-zinc-400">Cerrado</p> : huecos.length ? <p className="mt-1 text-[10px] font-medium text-red-600" title="Horario de apertura sin nadie asignado">Sin cubrir {huecos.map((h) => `${h.i}–${h.f}`).join(', ')}</p> : <p className="mt-1 text-[10px] font-medium text-emerald-700">Cubierto</p>}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          {!emps.length && <p className="p-8 text-center text-sm text-zinc-500">No hay empleados. Dales de alta en «Equipo».</p>}
        </div>
      ) : (
        <PorHoras dias={dias} diaSel={dias.includes(diaSel) ? diaSel : dias[0]} setDia={setDiaSel} emps={emps} onEditar={(emp, fecha) => editable && setEdit({ emp, fecha })} />
      )}

      <div className="no-print flex flex-wrap gap-3 text-xs text-zinc-500">
        {Object.entries(TIPOS).map(([k, t]) => <span key={k} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: t.bg, border: `1.5px solid ${t.borde}` }} />{t.label}</span>)}
      </div>
      <div className="solo-print mt-6 text-xs text-zinc-500">{config.empresa} · CIF {config.cif} · Impreso el {new Date().toLocaleString('es-ES')}</div>

      <EditorTurno emp={edit?.emp || null} fecha={edit?.fecha || null} onCerrar={() => setEdit(null)} />

      <Modal abierto={verAvisos} onCerrar={() => setVerAvisos(false)} titulo="Revisión legal de la semana">
        <p className="mb-3 text-sm text-zinc-500">Comprobaciones según el Estatuto de los Trabajadores: máximo {config.max_horas_dia} h diarias, {config.descanso_min} h de descanso entre jornadas, descanso semanal y horas de contrato.</p>
        {!avisos.length && <p className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Todo correcto esta semana.</p>}
        <ul className="space-y-2">
          {avisos.map((a, i) => {
            const e = a.empleado_id ? ix.empleado(a.empleado_id) : undefined
            return (
              <li key={i} className={cx('flex items-start gap-3 rounded-xl p-3 text-sm', a.nivel === 'error' ? 'bg-red-50 text-red-800' : a.nivel === 'aviso' ? 'bg-amber-50 text-amber-900' : 'bg-zinc-50 text-zinc-700')}>
                {e && <Avatar emp={e} size={26} />}<span><b>{e?.nombre}</b> · {a.texto}</span>
              </li>
            )
          })}
        </ul>
      </Modal>

      <Modal abierto={repetir} onCerrar={() => setRepetir(false)} titulo="Repetir esta semana">
        <p className="mb-4 text-sm text-zinc-600">Copia el cuadrante de esta semana en las semanas siguientes (sustituye lo que haya esos días).</p>
        <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4, 6, 8, 12, 26].map((n) => <Boton key={n} tipo="secundario" onClick={() => repetirSemanas(n)}>{n} sem.</Boton>)}</div>
      </Modal>
    </div>
  )
}

function Celda({ t, err }: { t: Turno; err?: boolean }) {
  const ti = TIPOS[t.tipo]
  return (
    <div className={cx('w-full rounded-lg border-l-4 px-2 py-1.5', err && 'ring-2 ring-red-400')} style={{ background: ti.bg, borderColor: ti.borde }}>
      {t.tipo === 'trabajo' ? <>
        {t.tramos.map((x, i) => <p key={i} className="text-[13px] font-semibold leading-tight text-vino-900 tabular">{x.i}–{x.f}</p>)}
        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-vino-700/70">{fmtH(minTurno(t))}{t.centro && ` · ${t.centro}`}{t.nota && <StickyNote size={10} className="shrink-0" />}</p>
      </> : <p className="text-[13px] font-semibold" style={{ color: ti.fg }}>{ti.label}</p>}
      {t.nota && t.tipo !== 'trabajo' && <p className="truncate text-[10px] text-zinc-500">{t.nota}</p>}
    </div>
  )
}

const H0 = 7 * 60, H1 = 23 * 60
function MiniLinea({ fecha, turnos }: { fecha: string; turnos: Turno[] }) {
  const { config } = useDatos()
  const ap = config.apertura[diaSemana(fecha)] || []
  const pct = (m: number) => `${((m - H0) / (H1 - H0)) * 100}%`
  return (
    <div className="relative mx-auto mt-1 h-2.5 w-full max-w-[120px] overflow-hidden rounded-full bg-zinc-100">
      {ap.map((a, i) => <span key={i} className="absolute inset-y-0 bg-red-200" style={{ left: pct(aMin(a.i)), width: `calc(${pct(aMin(a.f))} - ${pct(aMin(a.i))})` }} />)}
      {turnos.filter((t) => t.tipo === 'trabajo').flatMap((t) => t.tramos).map((x, i) => <span key={i} className="absolute inset-y-0 bg-vino-500/70" style={{ left: pct(aMin(x.i)), width: `${(minTramo(x) / (H1 - H0)) * 100}%` }} />)}
    </div>
  )
}

function PorHoras({ dias, diaSel, setDia, emps, onEditar }: { dias: string[]; diaSel: string; setDia: (d: string) => void; emps: Empleado[]; onEditar: (e: Empleado, f: string) => void }) {
  const { config } = useDatos()
  const ix = useIndices()
  const horas = Array.from({ length: (H1 - H0) / 60 + 1 }, (_, i) => H0 / 60 + i)
  const pct = (m: number) => ((m - H0) / (H1 - H0)) * 100
  const ap = config.apertura[diaSemana(diaSel)] || []
  const ahora = new Date(), mAhora = ahora.getHours() * 60 + ahora.getMinutes()
  return (
    <div className="space-y-3">
      <div className="no-print flex gap-1.5 overflow-x-auto scroll-fino">
        {dias.map((d) => (
          <button key={d} onClick={() => setDia(d)} className={cx('min-w-[64px] rounded-xl border px-3 py-2 text-center transition', d === diaSel ? 'border-vino-600 bg-vino-600 text-white' : 'border-vino-100 bg-white text-zinc-700 hover:border-vino-300')}>
            <span className="block font-cond text-[11px] uppercase tracking-wider opacity-70">{DIAS_C[diaSemana(d)]}</span><span className="text-lg font-semibold">{deIso(d).getDate()}</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-vino-100/60 bg-white p-4 shadow-suave scroll-fino">
        <div className="min-w-[760px]">
          <div className="relative ml-44 h-6 border-b border-vino-50">
            {horas.map((h) => <span key={h} className="absolute -translate-x-1/2 text-[11px] text-zinc-400 tabular" style={{ left: `${pct(h * 60)}%` }}>{h}h</span>)}
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-44 right-0">
              {ap.map((a, i) => <span key={i} className="absolute inset-y-0 bg-lila-50" style={{ left: `${pct(aMin(a.i))}%`, width: `${pct(aMin(a.f)) - pct(aMin(a.i))}%` }} />)}
              {horas.map((h) => <span key={h} className="absolute inset-y-0 border-l border-dashed border-vino-50" style={{ left: `${pct(h * 60)}%` }} />)}
              {diaSel === hoy() && mAhora > H0 && mAhora < H1 && <span className="absolute inset-y-0 z-10 w-0.5 bg-red-500" style={{ left: `${pct(mAhora)}%` }} />}
            </div>
            {emps.map((e) => {
              const t = ix.turnoDe(e.id, diaSel)
              return (
                <div key={e.id} className="relative flex h-14 items-center border-b border-vino-50 last:border-0">
                  <div className="flex w-44 shrink-0 items-center gap-2 pr-2"><Avatar emp={e} size={28} /><span className="truncate text-sm font-medium">{e.nombre}</span></div>
                  <button className="relative h-full flex-1" onClick={() => onEditar(e, diaSel)}>
                    {t?.tipo === 'trabajo' ? t.tramos.map((x, i) => (
                      <span key={i} className="absolute top-2.5 flex h-9 items-center overflow-hidden whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-white shadow-sm" style={{ left: `${pct(aMin(x.i))}%`, width: `${(minTramo(x) / (H1 - H0)) * 100}%`, background: e.color || '#830040' }}>{x.i}–{x.f}</span>
                    )) : t ? <span className="absolute left-2 top-3.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: TIPOS[t.tipo].bg, color: TIPOS[t.tipo].fg }}>{TIPOS[t.tipo].label}</span> : null}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500">La franja lila es el horario de apertura de la tienda.</p>
    </div>
  )
}

function Dato({ t, v, sub }: { t: string; v: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-vino-100/60 bg-white p-4 shadow-suave">
      <p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">{t}</p>
      <p className="mt-1 text-xl font-semibold text-vino-900 tabular">{v}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}
function Chip({ children, activo, color, onClick }: { children: React.ReactNode; activo: boolean; color: string; onClick: () => void }) {
  return <button onClick={onClick} className={cx('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition', activo ? 'text-white shadow' : 'border-vino-100 bg-white text-zinc-700 hover:border-vino-300')} style={activo ? { background: color, borderColor: color } : undefined}>{!activo && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}{children}</button>
}
function Accion({ icono, t, onClick }: { icono: React.ReactNode; t: string; onClick: () => void }) {
  return <button title={t} aria-label={t} onClick={onClick} className="rounded-xl p-2.5 text-vino-700 transition hover:bg-vino-50">{icono}</button>
}
