import { useEffect, useState } from 'react'
import { Plus, Send, Trash2 } from 'lucide-react'
import { useDatos } from '../lib/datos'
import type { Empleado, Solicitud, TipoSolicitud, Tramo } from '../lib/types'
import { useIndices } from '../lib/usar'
import { esCambioHorario, horarioPedido, textoHorario, tramosValidos } from '../lib/cambios'
import { fechaCorta, hoy, rango, uid } from '../lib/fechas'
import { toast } from '../lib/toast'
import { Boton, Campo, Modal, Tarjeta, Vacio, cx, input } from '../ui'
import { Inbox } from 'lucide-react'

export const TIPOS_SOL: Record<TipoSolicitud, string> = { vacaciones: 'Vacaciones', permiso: 'Permiso / asuntos propios', cambio: 'Cambio de horario', baja: 'Baja médica', otro: 'Otro' }
export const ESTADO: Record<string, string> = { pendiente: 'bg-amber-50 text-amber-800', aprobada: 'bg-emerald-50 text-emerald-800', rechazada: 'bg-red-50 text-red-700' }

export default function Solicitudes({ emp }: { emp: Empleado }) {
  const { solicitudes, guardar } = useDatos()
  const [nueva, setNueva] = useState(false)
  const [cambio, setCambio] = useState<string | null>(null)
  const [s, setS] = useState({ tipo: 'vacaciones' as TipoSolicitud, desde: hoy(), hasta: hoy(), motivo: '' })
  const mias = solicitudes.filter((x) => x.empleado_id === emp.id).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const enviar = () => {
    const fila: Solicitud = { id: uid(), empleado_id: emp.id, ...s, hasta: s.hasta < s.desde ? s.desde : s.hasta, estado: 'pendiente', created_at: new Date().toISOString() }
    guardar('solicitudes', fila)
    setNueva(false)
    toast('Solicitud enviada al encargado/a')
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between"><h1 className="text-2xl font-semibold text-vino-900">Mis solicitudes</h1><Boton onClick={() => setNueva(true)}><Plus size={16} />Nueva</Boton></div>
      <ModalCambio emp={emp} fecha={cambio} onCerrar={() => setCambio(null)} />
      <Tarjeta>
        {!mias.length ? <Vacio icono={<Inbox size={28} />} titulo="Sin solicitudes" texto="Pide vacaciones, un permiso o un cambio de horario. Tu encargado/a lo verá al momento." /> : (
          <ul className="divide-y divide-vino-50">
            {mias.map((x) => (
              <li key={x.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-800">{TIPOS_SOL[x.tipo]}</p>
                  <p className="text-sm text-zinc-500">{x.desde === x.hasta ? fechaCorta(x.desde) : `${fechaCorta(x.desde)} – ${fechaCorta(x.hasta)}`}{esCambioHorario(x) ? <> · pides <b className="text-zinc-700">{textoHorario(horarioPedido(x))}</b></> : ` · ${rango(x.desde, x.hasta).length} días`}</p>
                  {x.turno_antes && <p className="text-xs text-zinc-500">Antes: {textoHorario(x.turno_antes)}</p>}
                  {x.motivo && <p className="mt-1 text-sm text-zinc-600">«{x.motivo}»</p>}
                  {x.respuesta && <p className="mt-1 text-sm text-vino-700">Respuesta: {x.respuesta}</p>}
                </div>
                <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', ESTADO[x.estado])}>{x.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
      <Modal abierto={nueva} onCerrar={() => setNueva(false)} titulo="Nueva solicitud" pie={<><Boton tipo="secundario" onClick={() => setNueva(false)}>Cancelar</Boton><Boton onClick={enviar}><Send size={16} />Enviar</Boton></>}>
        <div className="space-y-4">
          <Campo label="Tipo"><select className={input} value={s.tipo} onChange={(e) => { const tipo = e.target.value as TipoSolicitud; if (tipo === 'cambio') { setNueva(false); setCambio(s.desde) } else setS({ ...s, tipo }) }}>{Object.entries(TIPOS_SOL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Desde"><input type="date" className={input} value={s.desde} onChange={(e) => setS({ ...s, desde: e.target.value, hasta: s.hasta < e.target.value ? e.target.value : s.hasta })} /></Campo>
            <Campo label="Hasta"><input type="date" className={input} value={s.hasta} min={s.desde} onChange={(e) => setS({ ...s, hasta: e.target.value })} /></Campo>
          </div>
          <Campo label="Motivo o comentario"><textarea rows={3} className={input} value={s.motivo} onChange={(e) => setS({ ...s, motivo: e.target.value })} placeholder={s.tipo === 'cambio' ? 'Ej.: cambio mi tarde del jueves con Lucía' : 'Opcional'} /></Campo>
        </div>
      </Modal>
    </div>
  )
}

export function ModalCambio({ emp, fecha, onCerrar }: { emp: Empleado; fecha: string | null; onCerrar: () => void }) {
  const { guardar } = useDatos()
  const ix = useIndices()
  const [dia, setDia] = useState(hoy())
  const [libre, setLibre] = useState(false)
  const [tramos, setTramos] = useState<Tramo[]>([])
  const [motivo, setMotivo] = useState('')
  const actual = ix.turnoDe(emp.id, dia)
  useEffect(() => {
    if (!fecha) return
    const t = ix.turnoDe(emp.id, fecha)
    setDia(fecha); setMotivo(''); setLibre(false)
    setTramos(t?.tipo === 'trabajo' && t.tramos.length ? t.tramos.map((x) => ({ ...x })) : [{ i: '09:00', f: '14:00' }])
  }, [fecha]) // eslint-disable-line react-hooks/exhaustive-deps
  const ok = !!motivo.trim() && dia >= hoy() && (libre || (tramos.length > 0 && tramosValidos(tramos)))
  const enviar = () => {
    const fila: Solicitud = { id: uid(), empleado_id: emp.id, tipo: 'cambio', desde: dia, hasta: dia, motivo: motivo.trim(), tramos: libre ? [] : tramos, estado: 'pendiente', created_at: new Date().toISOString() }
    guardar('solicitudes', fila)
    onCerrar()
    toast('Cambio enviado al encargado/a para que lo apruebe')
  }
  const fijar = (k: number, c: 'i' | 'f', v: string) => setTramos(tramos.map((x, j) => (j === k ? { ...x, [c]: v } : x)))
  return (
    <Modal abierto={!!fecha} onCerrar={onCerrar} titulo="Pedir cambio de horario" pie={<><Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton><Boton disabled={!ok} onClick={enviar}><Send size={16} />Enviar</Boton></>}>
      <div className="space-y-4">
        <Campo label="Día"><input type="date" className={input} value={dia} min={hoy()} onChange={(e) => setDia(e.target.value)} /></Campo>
        <p className="rounded-xl bg-vino-50/60 px-3 py-2 text-sm text-zinc-600">Horario actual: <b className="text-vino-900">{textoHorario(actual)}</b></p>
        <div>
          <p className="mb-1.5 font-cond text-[11px] uppercase tracking-wider text-vino-700">Horario que pides</p>
          <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-vino-600" checked={libre} onChange={(e) => setLibre(e.target.checked)} />Pido el día libre</label>
          {!libre && (
            <div className="space-y-2">
              {tramos.map((t, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="time" aria-label="Entrada" value={t.i} onChange={(e) => fijar(k, 'i', e.target.value)} className={cx(input, 'tabular')} />
                  <span className="text-zinc-400">a</span>
                  <input type="time" aria-label="Salida" value={t.f} onChange={(e) => fijar(k, 'f', e.target.value)} className={cx(input, 'tabular')} />
                  {tramos.length > 1 && <button type="button" aria-label="Quitar tramo" onClick={() => setTramos(tramos.filter((_, j) => j !== k))} className="p-2 text-zinc-400 hover:text-red-600"><Trash2 size={16} /></button>}
                </div>
              ))}
              {tramos.length < 2 && <button type="button" onClick={() => setTramos([...tramos, { i: '17:00', f: '20:30' }])} className="text-sm font-medium text-vino-700">+ Añadir tarde (horario partido)</button>}
              {tramos.length > 0 && !tramosValidos(tramos) && <p className="text-xs text-red-600">Revisa las horas: la salida debe ser posterior a la entrada.</p>}
            </div>
          )}
        </div>
        <Campo label="Observación (obligatoria)"><textarea rows={3} className={input} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: entro a las 11 porque tengo médico a primera hora" /></Campo>
        <p className="text-xs text-zinc-500">Tu horario no cambia hasta que el encargado/a lo apruebe.</p>
      </div>
    </Modal>
  )
}
