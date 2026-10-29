import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { turnoId, useDatos } from '../lib/datos'
import type { Empleado, TipoTurno, Tramo, Turno } from '../lib/types'
import { DIAS_C, diaSemana, fechaLarga, fmtH, semana, lunesDe } from '../lib/fechas'
import { TIPOS, minTramos } from '../lib/reglas'
import { toast } from '../lib/toast'
import { Avatar, Boton, Campo, Modal, cx, input } from '../ui'

export default function EditorTurno({ emp, fecha, onCerrar }: { emp: Empleado | null; fecha: string | null; onCerrar: () => void }) {
  const { config, turnos, guardar, borrar } = useDatos()
  const actual = emp && fecha ? turnos.find((t) => t.id === turnoId(emp.id, fecha)) : undefined
  const [tipo, setTipo] = useState<TipoTurno>('trabajo')
  const [tramos, setTramos] = useState<Tramo[]>([])
  const [centro, setCentro] = useState('')
  const [nota, setNota] = useState('')
  const [extra, setExtra] = useState<string[]>([])

  useEffect(() => {
    if (!emp || !fecha) return
    setTipo(actual?.tipo || 'trabajo')
    setTramos(actual?.tramos?.length ? actual.tramos : config.plantillas[0]?.tramos || [{ i: '10:00', f: '14:00' }])
    setCentro(actual?.centro || emp.centro || config.centros[0] || '')
    setNota(actual?.nota || '')
    setExtra([])
  }, [emp, fecha]) // eslint-disable-line

  if (!emp || !fecha) return null
  const dias = semana(lunesDe(fecha))
  const ok = tipo !== 'trabajo' || (tramos.length > 0 && tramos.every((t) => t.i && t.f))

  const guardarTodo = () => {
    const filas: Turno[] = [fecha, ...extra].map((f) => ({ id: turnoId(emp.id, f), empleado_id: emp.id, fecha: f, tipo, tramos: tipo === 'trabajo' ? tramos : [], centro: tipo === 'trabajo' ? centro || null : null, nota: nota || null }))
    guardar('turnos', filas)
    toast(filas.length > 1 ? `${filas.length} días guardados` : 'Turno guardado')
    onCerrar()
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={<span className="flex items-center gap-3"><Avatar emp={emp} size={32} /><span><span className="block">{emp.nombre}</span><span className="block text-sm font-normal text-zinc-500 first-letter:uppercase">{fechaLarga(fecha)}</span></span></span>}
      pie={<>
        {actual && <Boton tipo="peligro" className="mr-auto" onClick={() => { borrar('turnos', actual.id); toast('Turno borrado'); onCerrar() }}><Trash2 size={16} />Quitar</Boton>}
        <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
        <Boton onClick={guardarTodo} disabled={!ok}>Guardar</Boton>
      </>}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIPOS).map(([k, t]) => (
            <button key={k} onClick={() => setTipo(k as TipoTurno)} className={cx('rounded-full border px-3 py-1.5 text-sm font-medium transition', tipo === k ? 'shadow-sm' : 'border-transparent bg-zinc-50 text-zinc-500 hover:bg-zinc-100')} style={tipo === k ? { background: t.bg, color: t.fg, borderColor: t.borde } : undefined}>{t.label}</button>
          ))}
        </div>

        {tipo === 'trabajo' && <>
          <div>
            <p className="mb-2 font-cond text-xs uppercase tracking-wider text-vino-800/70">Turnos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {config.plantillas.map((p) => (
                <button key={p.id} onClick={() => setTramos(p.tramos)} className="group rounded-xl border border-vino-100 bg-white px-3 py-2 text-left transition hover:border-vino-300 hover:shadow-sm">
                  <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.nombre}</span>
                  <span className="block text-xs text-zinc-500 tabular">{p.tramos.map((t) => `${t.i}–${t.f}`).join(' · ')}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-cond text-xs uppercase tracking-wider text-vino-800/70">Horario · {fmtH(minTramos(tramos))}</p>
            <div className="space-y-2">
              {tramos.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" value={t.i} onChange={(e) => setTramos(tramos.map((x, j) => (j === i ? { ...x, i: e.target.value } : x)))} className={cx(input, 'tabular')} />
                  <span className="text-zinc-400">a</span>
                  <input type="time" value={t.f} onChange={(e) => setTramos(tramos.map((x, j) => (j === i ? { ...x, f: e.target.value } : x)))} className={cx(input, 'tabular')} />
                  <button onClick={() => setTramos(tramos.filter((_, j) => j !== i))} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar tramo"><Trash2 size={16} /></button>
                </div>
              ))}
              {tramos.length < 3 && <Boton tipo="fantasma" onClick={() => setTramos([...tramos, { i: '17:30', f: '21:00' }])}><Plus size={16} />Añadir tramo (turno partido)</Boton>}
            </div>
          </div>
          <Campo label="Lugar de trabajo">
            <select value={centro} onChange={(e) => setCentro(e.target.value)} className={input}>{config.centros.map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
        </>}

        <Campo label="Nota (opcional)"><input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: inventario, cata en tienda, reparto Isla Cristina…" className={input} /></Campo>

        <div>
          <p className="mb-2 font-cond text-xs uppercase tracking-wider text-vino-800/70">Copiar también a</p>
          <div className="flex flex-wrap gap-1.5">
            {dias.map((d) => d !== fecha && (
              <button key={d} onClick={() => setExtra(extra.includes(d) ? extra.filter((x) => x !== d) : [...extra, d])} className={cx('h-10 w-12 rounded-xl border text-sm font-medium transition', extra.includes(d) ? 'border-vino-600 bg-vino-600 text-white' : 'border-vino-100 text-zinc-600 hover:border-vino-300')}>{DIAS_C[diaSemana(d)]}</button>
            ))}
            <button onClick={() => setExtra(dias.filter((d) => d !== fecha && diaSemana(d) < 5))} className="rounded-xl px-3 text-sm text-vino-700 hover:bg-vino-50">L–V</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
