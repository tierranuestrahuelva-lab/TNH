import { useState } from 'react'
import { Eye, EyeOff, MessageCircle, Phone, Plus, RefreshCw, UserPlus } from 'lucide-react'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado } from '../lib/types'
import { COLORES } from '../lib/config'
import { DIAS_C, diaSemana, fmtH, hoy, lunesDe, semana, uid, deIso } from '../lib/fechas'
import { TIPOS, minTurno, textoTramos } from '../lib/reglas'
import { whatsapp } from '../lib/exportar'
import { toast } from '../lib/toast'
import { Avatar, Barra, Boton, Campo, Modal, Tarjeta, cx, input } from '../ui'

const pinNuevo = () => String(Math.floor(1000 + Math.random() * 9000))

export default function Equipo() {
  const { empleados, config, guardar } = useDatos()
  const ix = useIndices()
  const [edit, setEdit] = useState<Empleado | null>(null)
  const [verPin, setVerPin] = useState(false)
  const [verInactivos, setVerInactivos] = useState(false)
  const dias = semana(lunesDe(hoy()))
  const lista = empleados.filter((e) => verInactivos || e.activo).sort((a, b) => Number(b.activo) - Number(a.activo) || a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  const nuevo = (): Empleado => ({ id: uid(), nombre: '', puesto: 'Dependiente/a', color: COLORES[empleados.length % COLORES.length], horas_semana: 40, coste_hora: null, pin: pinNuevo(), telefono: '', email: '', centro: config.centros[0], vacaciones_anuales: 30, activo: true, orden: empleados.length })
  const textoSemana = (e: Empleado) => [`Hola ${e.nombre.split(' ')[0]}, tu horario de esta semana en Tierra Nuestra:`, ...dias.map((d) => { const t = ix.turnoDe(e.id, d); return `${DIAS_C[diaSemana(d)]} ${deIso(d).getDate()}: ${!t ? '—' : t.tipo === 'trabajo' ? textoTramos(t.tramos) : TIPOS[t.tipo].label}` }), '', 'Puedes verlo siempre en la app de Horarios.'].join('\n')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">{ix.activos.length} personas</p><h1 className="text-2xl font-semibold text-vino-900 sm:text-3xl">Equipo</h1></div>
        <div className="flex gap-2">
          <Boton tipo="fantasma" onClick={() => setVerInactivos(!verInactivos)}>{verInactivos ? 'Ocultar bajas' : 'Ver antiguos'}</Boton>
          <Boton onClick={() => setEdit(nuevo())}><UserPlus size={16} />Nuevo empleado</Boton>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((e) => {
          const m = dias.reduce((s, d) => s + minTurno(ix.turnoDe(e.id, d)), 0)
          return (
            <Tarjeta key={e.id} className={cx('p-5 transition hover:shadow-lg', !e.activo && 'opacity-60')}>
              <button className="flex w-full items-center gap-4 text-left" onClick={() => setEdit(e)}>
                <Avatar emp={e} size={54} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-zinc-800">{e.nombre}</p>
                  <p className="truncate text-sm text-zinc-500">{e.puesto}{e.centro && ` · ${e.centro}`}</p>
                  {!e.activo && <p className="text-xs font-medium text-red-600">Ya no trabaja aquí</p>}
                </div>
              </button>
              <div className="mt-4">
                <p className="mb-1 flex justify-between text-xs text-zinc-500"><span>Esta semana</span><span className="tabular">{fmtH(m)} / {e.horas_semana} h</span></p>
                <Barra valor={m} max={e.horas_semana * 60} color={e.color || undefined} />
              </div>
              <div className="mt-4 flex gap-1.5">
                {dias.map((d) => { const t = ix.turnoDe(e.id, d); return <span key={d} title={t?.tipo === 'trabajo' ? textoTramos(t.tramos) : t ? TIPOS[t.tipo].label : 'Sin asignar'} className="flex-1 rounded-md py-1 text-center text-[10px] font-medium" style={{ background: t ? TIPOS[t.tipo].bg : '#fafafa', color: t ? TIPOS[t.tipo].fg : '#d4d4d8' }}>{DIAS_C[diaSemana(d)][0]}</span> })}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-vino-50 pt-3">
                <span className="flex-1 text-xs text-zinc-500">PIN: <b className="tabular text-zinc-700">{verPin ? e.pin : '••••'}</b></span>
                {e.telefono && <a href={`tel:${e.telefono}`} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50"><Phone size={16} /></a>}
                <button title="Enviar su horario por WhatsApp" onClick={() => whatsapp(textoSemana(e), e.telefono)} className="rounded-lg p-2 text-vino-700 hover:bg-vino-50"><MessageCircle size={16} /></button>
              </div>
            </Tarjeta>
          )
        })}
        <button onClick={() => setEdit(nuevo())} className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-vino-200 text-vino-600 transition hover:bg-vino-50"><Plus size={28} />Añadir persona</button>
      </div>
      <button onClick={() => setVerPin(!verPin)} className="flex items-center gap-2 text-sm text-vino-700">{verPin ? <EyeOff size={16} /> : <Eye size={16} />}{verPin ? 'Ocultar PIN' : 'Mostrar PIN de cada empleado'}</button>
      {edit && <FichaEmpleado e={edit} onCerrar={() => setEdit(null)} onGuardar={(x) => { guardar('empleados', x); toast('Ficha guardada'); setEdit(null) }} />}
    </div>
  )
}

function FichaEmpleado({ e, onCerrar, onGuardar }: { e: Empleado; onCerrar: () => void; onGuardar: (e: Empleado) => void }) {
  const { config, empleados, guardarConfig } = useDatos()
  const [f, setF] = useState<Empleado>(e)
  const existe = empleados.some((x) => x.id === e.id)
  const num = (v: string) => (v === '' ? null : Number(v.replace(',', '.')))
  return (
    <Modal abierto onCerrar={onCerrar} titulo={existe ? 'Ficha de empleado' : 'Nuevo empleado'} ancho="max-w-2xl"
      pie={<>{existe && <Boton tipo={f.activo ? 'peligro' : 'secundario'} className="mr-auto" onClick={() => onGuardar({ ...f, activo: !f.activo })}>{f.activo ? 'Dar de baja' : 'Reactivar'}</Boton>}<Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton><Boton disabled={!f.nombre.trim() || !/^\d{4,6}$/.test(f.pin || '')} onClick={() => onGuardar({ ...f, nombre: f.nombre.trim() })}>Guardar</Boton></>}>
      <div className="mb-5 flex items-center gap-4"><Avatar emp={{ nombre: f.nombre || '?', color: f.color }} size={64} />
        <div className="flex flex-wrap gap-2">{COLORES.map((c) => <button key={c} onClick={() => setF({ ...f, color: c })} className={cx('h-7 w-7 rounded-full transition', f.color === c && 'ring-2 ring-offset-2 ring-vino-400')} style={{ background: c }} aria-label={c} />)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre y apellidos"><input autoFocus className={input} value={f.nombre} onChange={(x) => setF({ ...f, nombre: x.target.value })} /></Campo>
        <Campo label="Puesto">
          <select className={input} value={f.puesto || ''} onChange={(x) => {
            if (x.target.value !== '__otro') return setF({ ...f, puesto: x.target.value })
            const n = prompt('Nombre del nuevo puesto')?.trim()
            if (!n) return
            if (!config.puestos.includes(n)) guardarConfig({ puestos: [...config.puestos, n] })
            setF({ ...f, puesto: n })
          }}>
            <option value="">— Sin puesto —</option>
            {[...config.puestos, ...(f.puesto && !config.puestos.includes(f.puesto) ? [f.puesto] : [])].map((p) => <option key={p} value={p}>{p}</option>)}
            <option value="__otro">+ Otro puesto…</option>
          </select>
        </Campo>
        <Campo label="Centro habitual"><select className={input} value={f.centro || ''} onChange={(x) => setF({ ...f, centro: x.target.value })}>{config.centros.map((c) => <option key={c}>{c}</option>)}</select></Campo>
        <Campo label="Horas de contrato / semana"><input type="number" className={input} value={f.horas_semana} onChange={(x) => setF({ ...f, horas_semana: Number(x.target.value) || 0 })} /></Campo>
        <Campo label="Días de vacaciones al año" ayuda="30 naturales según el Estatuto (o lo que diga el convenio)"><input type="number" className={input} value={f.vacaciones_anuales} onChange={(x) => setF({ ...f, vacaciones_anuales: Number(x.target.value) || 0 })} /></Campo>
        <Campo label="Coste por hora (€, opcional)" ayuda="Solo lo ve el encargado; sirve para estimar el coste del cuadrante"><input inputMode="decimal" className={input} value={f.coste_hora ?? ''} onChange={(x) => setF({ ...f, coste_hora: num(x.target.value) })} /></Campo>
        <Campo label="Teléfono (WhatsApp)"><input inputMode="tel" className={input} value={f.telefono || ''} onChange={(x) => setF({ ...f, telefono: x.target.value })} /></Campo>
        <Campo label="Email"><input type="email" className={input} value={f.email || ''} onChange={(x) => setF({ ...f, email: x.target.value })} /></Campo>
        <Campo label="PIN personal (4 cifras)" ayuda="Con él entra en la app para ver su horario y fichar">
          <div className="flex gap-2"><input inputMode="numeric" maxLength={6} className={cx(input, 'tabular tracking-[0.3em]')} value={f.pin || ''} onChange={(x) => setF({ ...f, pin: x.target.value.replace(/\D/g, '') })} /><Boton tipo="secundario" onClick={() => setF({ ...f, pin: pinNuevo() })} title="Generar otro"><RefreshCw size={16} /></Boton></div>
        </Campo>
        <Campo label="Orden en el cuadrante"><input type="number" className={input} value={f.orden} onChange={(x) => setF({ ...f, orden: Number(x.target.value) || 0 })} /></Campo>
      </div>
    </Modal>
  )
}
