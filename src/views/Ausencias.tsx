import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { turnoId, useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Solicitud, TipoTurno, Turno } from '../lib/types'
import { fechaCorta, hoy, rango, uid } from '../lib/fechas'
import { TIPOS } from '../lib/reglas'
import { toast } from '../lib/toast'
import { Avatar, Barra, Boton, Campo, Modal, Tarjeta, Vacio, cx, input } from '../ui'
import { ESTADO, TIPOS_SOL } from './Solicitudes'
import { Palmtree } from 'lucide-react'

export default function Ausencias() {
  const { solicitudes, turnos, guardar } = useDatos()
  const ix = useIndices()
  const [resp, setResp] = useState<Record<string, string>>({})
  const [nueva, setNueva] = useState(false)
  const [n, setN] = useState({ emp: '', tipo: 'vacaciones' as TipoTurno, desde: hoy(), hasta: hoy(), nota: '' })
  const anio = hoy().slice(0, 4)
  const pend = solicitudes.filter((s) => s.estado === 'pendiente').sort((a, b) => a.desde.localeCompare(b.desde))
  const hist = solicitudes.filter((s) => s.estado !== 'pendiente').sort((a, b) => b.desde.localeCompare(a.desde)).slice(0, 30)
  const proximas = turnos.filter((t) => ['vacaciones', 'baja', 'permiso'].includes(t.tipo) && t.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const ponerAusencia = (emp: string, tipo: TipoTurno, desde: string, hasta: string, nota?: string) => {
    guardar('turnos', rango(desde, hasta).map((f): Turno => ({ id: turnoId(emp, f), empleado_id: emp, fecha: f, tipo, tramos: [], centro: null, nota: nota || null })))
  }
  const decidir = (s: Solicitud, estado: 'aprobada' | 'rechazada') => {
    guardar('solicitudes', { ...s, estado, respuesta: resp[s.id] || null, updated_at: new Date().toISOString() })
    if (estado === 'aprobada' && s.tipo !== 'cambio' && s.tipo !== 'otro') ponerAusencia(s.empleado_id, s.tipo as TipoTurno, s.desde, s.hasta, s.motivo || undefined)
    toast(estado === 'aprobada' ? 'Aprobada y añadida al cuadrante' : 'Solicitud rechazada')
  }
  const solapes = (s: Solicitud) => ix.activos.filter((e) => e.id !== s.empleado_id && rango(s.desde, s.hasta).some((f) => ['vacaciones', 'permiso', 'baja'].includes(ix.turnoDe(e.id, f)?.tipo || '')))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Vacaciones, permisos y bajas</p><h1 className="text-2xl font-semibold text-vino-900 sm:text-3xl">Ausencias</h1></div>
        <Boton onClick={() => { setN({ ...n, emp: ix.activos[0]?.id || '' }); setNueva(true) }}><Plus size={16} />Registrar ausencia</Boton>
      </div>

      <Tarjeta titulo={`Pendientes de aprobar (${pend.length})`}>
        {!pend.length ? <Vacio icono={<Check size={26} />} titulo="Todo al día" texto="Cuando alguien pida vacaciones o un cambio, aparecerá aquí." /> : (
          <ul className="space-y-3">
            {pend.map((s) => {
              const e = ix.empleado(s.empleado_id), sol = solapes(s)
              return (
                <li key={s.id} className="rounded-2xl border border-lila-200 bg-lila-50/50 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <Avatar emp={e} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-800">{e?.nombre} · <span className="text-vino-700">{TIPOS_SOL[s.tipo]}</span></p>
                      <p className="text-sm text-zinc-600">{s.desde === s.hasta ? fechaCorta(s.desde) : `${fechaCorta(s.desde)} – ${fechaCorta(s.hasta)}`} · {rango(s.desde, s.hasta).length} días</p>
                      {s.motivo && <p className="mt-1 text-sm text-zinc-600">«{s.motivo}»</p>}
                      {sol.length > 0 && <p className="mt-1 text-sm font-medium text-amber-700">Coincide con la ausencia de {sol.map((x) => x.nombre.split(' ')[0]).join(', ')}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input value={resp[s.id] || ''} onChange={(ev) => setResp({ ...resp, [s.id]: ev.target.value })} placeholder="Respuesta (opcional)" className={cx(input, 'min-w-[180px] flex-1')} />
                    <Boton tipo="peligro" onClick={() => decidir(s, 'rechazada')}><X size={16} />Rechazar</Boton>
                    <Boton onClick={() => decidir(s, 'aprobada')}><Check size={16} />Aprobar</Boton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo={`Vacaciones ${anio}`}>
          <ul className="space-y-3">
            {ix.activos.map((e) => {
              const usadas = turnos.filter((t) => t.empleado_id === e.id && t.tipo === 'vacaciones' && t.fecha.startsWith(anio)).length
              const bajas = turnos.filter((t) => t.empleado_id === e.id && t.tipo === 'baja' && t.fecha.startsWith(anio)).length
              return (
                <li key={e.id} className="flex items-center gap-3">
                  <Avatar emp={e} size={32} />
                  <div className="flex-1">
                    <p className="mb-1 flex justify-between text-sm"><span className="font-medium">{e.nombre}</span><span className="text-zinc-500 tabular">{usadas} / {e.vacaciones_anuales} días · quedan <b className="text-vino-800">{Math.max(0, e.vacaciones_anuales - usadas)}</b>{bajas ? ` · ${bajas} de baja` : ''}</span></p>
                    <Barra valor={usadas} max={e.vacaciones_anuales} color="#047857" />
                  </div>
                </li>
              )
            })}
          </ul>
        </Tarjeta>
        <Tarjeta titulo="Próximas ausencias">
          {!proximas.length ? <Vacio icono={<Palmtree size={26} />} titulo="Nadie ausente próximamente" /> : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto scroll-fino">
              {agrupar(proximas).map((g, i) => { const e = ix.empleado(g.emp); return (
                <li key={i} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-vino-50/50">
                  <Avatar emp={e} size={28} /><span className="flex-1 text-sm font-medium">{e?.nombre}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: TIPOS[g.tipo].bg, color: TIPOS[g.tipo].fg }}>{TIPOS[g.tipo].label}</span>
                  <span className="w-32 text-right text-sm text-zinc-500">{g.desde === g.hasta ? fechaCorta(g.desde) : `${fechaCorta(g.desde)} – ${fechaCorta(g.hasta)}`}</span>
                </li>) })}
            </ul>
          )}
        </Tarjeta>
      </div>

      {hist.length > 0 && (
        <Tarjeta titulo="Historial de solicitudes">
          <ul className="divide-y divide-vino-50">
            {hist.map((s) => { const e = ix.empleado(s.empleado_id); return (
              <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm"><Avatar emp={e} size={28} /><span className="flex-1"><b>{e?.nombre}</b> · {TIPOS_SOL[s.tipo]} · {fechaCorta(s.desde)}{s.hasta !== s.desde && ` – ${fechaCorta(s.hasta)}`}</span><span className={cx('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', ESTADO[s.estado])}>{s.estado}</span></li>) })}
          </ul>
        </Tarjeta>
      )}

      <Modal abierto={nueva} onCerrar={() => setNueva(false)} titulo="Registrar ausencia" pie={<><Boton tipo="secundario" onClick={() => setNueva(false)}>Cancelar</Boton><Boton disabled={!n.emp} onClick={() => { ponerAusencia(n.emp, n.tipo, n.desde, n.hasta < n.desde ? n.desde : n.hasta, n.nota); setNueva(false); toast('Ausencia añadida al cuadrante') }}>Guardar</Boton></>}>
        <div className="space-y-4">
          <Campo label="Empleado"><select className={input} value={n.emp} onChange={(e) => setN({ ...n, emp: e.target.value })}>{ix.activos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></Campo>
          <Campo label="Tipo"><select className={input} value={n.tipo} onChange={(e) => setN({ ...n, tipo: e.target.value as TipoTurno })}>{(['vacaciones', 'baja', 'permiso', 'formacion', 'libre'] as TipoTurno[]).map((k) => <option key={k} value={k}>{TIPOS[k].label}</option>)}</select></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Desde"><input type="date" className={input} value={n.desde} onChange={(e) => setN({ ...n, desde: e.target.value, hasta: n.hasta < e.target.value ? e.target.value : n.hasta })} /></Campo>
            <Campo label="Hasta"><input type="date" className={input} value={n.hasta} min={n.desde} onChange={(e) => setN({ ...n, hasta: e.target.value })} /></Campo>
          </div>
          <Campo label="Nota"><input className={input} value={n.nota} onChange={(e) => setN({ ...n, nota: e.target.value })} /></Campo>
          <p className="text-xs text-zinc-500">Se marcarán {rango(n.desde, n.hasta < n.desde ? n.desde : n.hasta).length} días naturales en el cuadrante (sustituye los turnos de esos días).</p>
        </div>
      </Modal>
    </div>
  )
}

function agrupar(ts: Turno[]) {
  const g: { emp: string; tipo: TipoTurno; desde: string; hasta: string }[] = []
  const orden = [...ts].sort((a, b) => a.empleado_id.localeCompare(b.empleado_id) || a.fecha.localeCompare(b.fecha))
  for (const t of orden) {
    const u = g[g.length - 1]
    const sig = u && new Date(new Date(u.hasta).getTime() + 864e5).toISOString().slice(0, 10)
    if (u && u.emp === t.empleado_id && u.tipo === t.tipo && sig === t.fecha) u.hasta = t.fecha
    else g.push({ emp: t.empleado_id, tipo: t.tipo, desde: t.fecha, hasta: t.fecha })
  }
  return g.sort((a, b) => a.desde.localeCompare(b.desde))
}
