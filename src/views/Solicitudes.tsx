import { useState } from 'react'
import { Plus, Send } from 'lucide-react'
import { useDatos } from '../lib/datos'
import type { Empleado, Solicitud, TipoSolicitud } from '../lib/types'
import { fechaCorta, hoy, rango, uid } from '../lib/fechas'
import { toast } from '../lib/toast'
import { Boton, Campo, Modal, Tarjeta, Vacio, cx, input } from '../ui'
import { Inbox } from 'lucide-react'

export const TIPOS_SOL: Record<TipoSolicitud, string> = { vacaciones: 'Vacaciones', permiso: 'Permiso / asuntos propios', cambio: 'Cambio de turno', baja: 'Baja médica', otro: 'Otro' }
export const ESTADO: Record<string, string> = { pendiente: 'bg-amber-50 text-amber-800', aprobada: 'bg-emerald-50 text-emerald-800', rechazada: 'bg-red-50 text-red-700' }

export default function Solicitudes({ emp }: { emp: Empleado }) {
  const { solicitudes, guardar } = useDatos()
  const [nueva, setNueva] = useState(false)
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
      <Tarjeta>
        {!mias.length ? <Vacio icono={<Inbox size={28} />} titulo="Sin solicitudes" texto="Pide vacaciones, un permiso o un cambio de turno. Tu encargado/a lo verá al momento." /> : (
          <ul className="divide-y divide-vino-50">
            {mias.map((x) => (
              <li key={x.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-800">{TIPOS_SOL[x.tipo]}</p>
                  <p className="text-sm text-zinc-500">{x.desde === x.hasta ? fechaCorta(x.desde) : `${fechaCorta(x.desde)} – ${fechaCorta(x.hasta)}`} · {rango(x.desde, x.hasta).length} días</p>
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
          <Campo label="Tipo"><select className={input} value={s.tipo} onChange={(e) => setS({ ...s, tipo: e.target.value as TipoSolicitud })}>{Object.entries(TIPOS_SOL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
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
