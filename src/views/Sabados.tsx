import { useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { turnoId, useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { RuedaSabados, Tramo, Turno } from '../lib/types'
import { DIAS, deIso, fechaCorta, fmtH, sumarDias, aMin } from '../lib/fechas'
import { minTramos, textoTramos } from '../lib/reglas'
import { toast } from '../lib/toast'
import { Avatar, Boton, Campo, Modal, cx, input } from '../ui'

const semanasEntre = (a: string, b: string) => Math.round((deIso(b).getTime() - deIso(a).getTime()) / (7 * 864e5))
const MODOS: { v: RuedaSabados['compModo']; l: string }[] = [
  { v: 'tarde', l: 'Tiene libre la tarde' },
  { v: 'manana', l: 'Tiene libre la mañana' },
  { v: 'dia', l: 'Tiene libre el día entero' },
  { v: 'nada', l: 'No se compensa (solo se suman las horas)' },
]
const BLOQUEA = new Set(['vacaciones', 'baja', 'permiso', 'festivo'])

export default function Sabados({ lunes, onCerrar }: { lunes: string; onCerrar: () => void }) {
  const { config, guardar, guardarConfig } = useDatos()
  const ix = useIndices()
  const prev = config.sabados
  const apertura: Tramo[] = config.apertura[5]?.length ? config.apertura[5] : [{ i: '10:00', f: '14:00' }]
  const opcionesHorario = [{ n: 'Horario de apertura del sábado', t: apertura }, ...config.plantillas.map((p) => ({ n: p.nombre, t: p.tramos }))]
  const [ids, setIds] = useState<string[]>(() => (prev?.ids || ix.activos.map((e) => e.id)).filter((id) => ix.activos.some((e) => e.id === id)))
  const [porSabado, setPorSabado] = useState(prev?.porSabado || 1)
  const [tramos, setTramos] = useState<Tramo[]>(prev?.tramos || apertura)
  const [compDia, setCompDia] = useState(prev?.compDia ?? 0)
  const [compModo, setCompModo] = useState<RuedaSabados['compModo']>(prev?.compModo || 'tarde')
  const [semanas, setSemanas] = useState(8)
  const [primero, setPrimero] = useState(() => {
    if (!prev || !ids.length) return 0
    return (((prev.primero + semanasEntre(prev.inicio, lunes) * prev.porSabado) % ids.length) + ids.length) % ids.length
  })

  const n = Math.min(porSabado, Math.max(ids.length, 1))
  const tocan = (k: number) => ids.length ? Array.from({ length: n }, (_, j) => ids[(primero + k * n + j) % ids.length]) : []
  const orden = [...ids, ...ix.activos.map((e) => e.id).filter((id) => !ids.includes(id))]
  const alternar = (id: string) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  const subir = (id: string) => { const i = ids.indexOf(id); if (i > 0) { const c = [...ids]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; setIds(c) } }
  const diaComp = (L: string) => sumarDias(L, compDia)

  const compensar = (t: Turno | undefined): Turno | null => {
    if (!t || t.tipo !== 'trabajo' || compModo === 'nada') return null
    if (compModo === 'dia') return { ...t, tipo: 'libre', tramos: [], centro: null, nota: 'Libre por trabajar el sábado' }
    const quedan = t.tramos.filter((x) => (compModo === 'manana' ? aMin(x.i) >= 15 * 60 : aMin(x.i) < 15 * 60))
    if (quedan.length === t.tramos.length) return null
    if (!quedan.length) return { ...t, tipo: 'libre', tramos: [], centro: null, nota: 'Libre por trabajar el sábado' }
    return { ...t, tramos: quedan, nota: `Compensa sábado (${compModo === 'manana' ? 'mañana' : 'tarde'} libre)` }
  }

  const aplicar = () => {
    if (!ids.length) return toast('Elige al menos una persona')
    const filas: Turno[] = []
    let saltados = 0
    for (let k = 0; k < semanas; k++) {
      const L = sumarDias(lunes, 7 * k), sab = sumarDias(L, 5)
      if (ix.festivoDe(sab)) continue
      const elegidos = tocan(k)
      for (const id of ids) {
        const emp = ix.empleado(id)!
        const actual = ix.turnoDe(id, sab)
        if (actual && BLOQUEA.has(actual.tipo)) { if (elegidos.includes(id)) saltados++; continue }
        if (elegidos.includes(id)) {
          filas.push({ id: turnoId(id, sab), empleado_id: id, fecha: sab, tipo: 'trabajo', tramos, centro: emp.centro || config.centros[0], nota: 'Sábado de rueda' })
          const c = compensar(ix.turnoDe(id, diaComp(L)))
          if (c) filas.push(c)
        } else {
          filas.push({ id: turnoId(id, sab), empleado_id: id, fecha: sab, tipo: 'libre', tramos: [], centro: null, nota: null })
        }
      }
    }
    guardar('turnos', filas)
    guardarConfig({ sabados: { ids, porSabado: n, tramos, inicio: lunes, primero, compDia, compModo } })
    toast(`Sábados repartidos en ${semanas} semanas${saltados ? ` · ${saltados} con ausencia, revísalos` : ''}`)
    onCerrar()
  }

  const ejemplo = ids.length ? ix.empleado(tocan(0)[0]) : undefined
  return (
    <Modal abierto onCerrar={onCerrar} titulo="Sábados alternos" ancho="max-w-3xl"
      pie={<><Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton><Boton disabled={!ids.length} onClick={aplicar}>Repartir sábados</Boton></>}>
      <p className="mb-5 text-sm text-zinc-600">La app va turnando los sábados entre las personas que elijas. A quien le toca el sábado se le compensa con horas libres otro día de esa misma semana, para que sus horas cuadren.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Campo label="¿Quién entra en la rueda? (en este orden)">
            <ul className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-vino-100 p-1 scroll-fino">
              {orden.map((id) => {
                const e = ix.empleado(id)!, dentro = ids.includes(id)
                return (
                  <li key={id} className={cx('flex items-center gap-2 rounded-lg px-2 py-1.5', dentro ? 'bg-vino-50/70' : 'opacity-60')}>
                    <input type="checkbox" checked={dentro} onChange={() => alternar(id)} className="h-4 w-4 accent-vino-600" />
                    {dentro && <span className="w-5 text-center text-xs font-semibold text-vino-700">{ids.indexOf(id) + 1}</span>}
                    <Avatar emp={e} size={26} /><span className="flex-1 truncate text-sm">{e.nombre}<span className="text-zinc-400"> · {e.puesto}</span></span>
                    {dentro && ids.indexOf(id) > 0 && <button onClick={() => subir(id)} className="rounded p-1 text-vino-600 hover:bg-vino-100" title="Subir"><ArrowUp size={14} /></button>}
                  </li>
                )
              })}
            </ul>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Personas cada sábado"><select className={input} value={porSabado} onChange={(e) => setPorSabado(Number(e.target.value))}>{[1, 2, 3, 4].map((x) => <option key={x} value={x}>{x}</option>)}</select></Campo>
            <Campo label="Este sábado empieza"><select className={input} value={primero} onChange={(e) => setPrimero(Number(e.target.value))}>{ids.map((id, i) => <option key={id} value={i}>{ix.empleado(id)?.nombre}</option>)}</select></Campo>
          </div>
          <Campo label="Horario del sábado">
            <select className={input} value={textoTramos(tramos)} onChange={(e) => setTramos(opcionesHorario.find((o) => textoTramos(o.t) === e.target.value)!.t)}>
              {[...new Map(opcionesHorario.map((o) => [textoTramos(o.t), o])).values()].map((o) => <option key={o.n} value={textoTramos(o.t)}>{o.n} · {textoTramos(o.t)}</option>)}
            </select>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Compensación"><select className={input} value={compModo} onChange={(e) => setCompModo(e.target.value as RuedaSabados['compModo'])}>{MODOS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></Campo>
            <Campo label="¿Qué día?"><select className={input} value={compDia} disabled={compModo === 'nada'} onChange={(e) => setCompDia(Number(e.target.value))}>{DIAS.slice(0, 5).map((d, i) => <option key={d} value={i}>{d} de esa semana</option>)}</select></Campo>
          </div>
          <Campo label="Repartir durante"><div className="grid grid-cols-4 gap-2">{[4, 8, 12, 26].map((x) => <button key={x} onClick={() => setSemanas(x)} className={cx('rounded-xl border py-2 text-sm font-medium', semanas === x ? 'border-vino-600 bg-vino-600 text-white' : 'border-vino-100 text-vino-700 hover:bg-vino-50')}>{x} sem.</button>)}</div></Campo>
        </div>
        <div>
          <p className="mb-2 font-cond text-xs uppercase tracking-wider text-vino-700">Así quedaría</p>
          <ul className="max-h-[430px] space-y-1.5 overflow-y-auto pr-1 scroll-fino">
            {Array.from({ length: semanas }, (_, k) => {
              const sab = sumarDias(lunes, 7 * k + 5), fest = ix.festivoDe(sab)
              return (
                <li key={k} className="flex items-center gap-3 rounded-xl border border-vino-100/70 bg-white px-3 py-2">
                  <span className="w-16 text-sm font-semibold text-vino-800">Sáb {fechaCorta(sab)}</span>
                  {fest ? <span className="text-sm text-blue-700">Festivo · {fest}</span> : (
                    <div className="flex flex-wrap gap-1.5">{tocan(k).map((id) => { const e = ix.empleado(id)!; return <span key={id} className="flex items-center gap-1.5 rounded-full bg-vino-50 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-vino-800"><Avatar emp={e} size={20} />{e.nombre.split(' ')[0]}</span> })}</div>
                  )}
                </li>
              )
            })}
          </ul>
          {ejemplo && <p className="mt-3 rounded-xl bg-lila-50 p-3 text-xs text-lila-600">Ejemplo: {ejemplo.nombre.split(' ')[0]} trabaja el sábado {fechaCorta(sumarDias(lunes, 5))} ({fmtH(minTramos(tramos))}){compModo !== 'nada' && <> y {MODOS.find((m) => m.v === compModo)!.l.toLowerCase().replace('tiene', 'tiene')} del {DIAS[compDia].toLowerCase()} {fechaCorta(diaComp(lunes))}</>}. Los demás de la rueda tienen el sábado libre.</p>}
          <p className="mt-2 text-xs text-zinc-500">Consejo: haz primero el horario normal de lunes a viernes (o repite la semana) y después reparte los sábados.</p>
        </div>
      </div>
    </Modal>
  )
}
