import { useState } from 'react'
import { Crosshair, DatabaseBackup, FileSpreadsheet, KeyRound, LogOut, MapPin, Plus, Smartphone, Trash2 } from 'lucide-react'
import { mapa, posicion } from '../lib/geo'
import { copiaCompleta, diasDesdeCopia, excelFichajes } from '../lib/copia'
import { CambiarPin, ClaveEquipo } from './Claves'
import { sb, useDatos } from '../lib/datos'
import type { Lugar, Plantilla, Tramo } from '../lib/types'
import { COLORES } from '../lib/config'
import { DIAS, fechaCorta, uid } from '../lib/fechas'
import { toast } from '../lib/toast'
import { Boton, Campo, Tarjeta, cx, input } from '../ui'

export default function Ajustes() {
  const { config, guardarConfig, empleados, turnos, fichajes, solicitudes, borrar } = useDatos()
  const [verPin, setVerPin] = useState(false)
  const [fest, setFest] = useState({ fecha: '', nombre: '' })
  const [anio, setAnio] = useState(new Date().getFullYear())
  const setPl = (pl: Plantilla[]) => guardarConfig({ plantillas: pl })
  const demo = empleados.filter((e) => e.id.startsWith('demo-'))

  const borrarDemo = () => {
    if (!confirm('¿Borrar los empleados de ejemplo con todos sus turnos, fichajes y solicitudes?')) return
    const ids = new Set(demo.map((e) => e.id))
    borrar('turnos', turnos.filter((t) => ids.has(t.empleado_id)).map((t) => t.id))
    borrar('solicitudes', solicitudes.filter((t) => ids.has(t.empleado_id)).map((t) => t.id))
    borrar('empleados', [...ids])
    toast('Datos de ejemplo borrados')
  }

  return (
    <div className="space-y-6">
      <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Configuración</p><h1 className="text-2xl font-semibold text-vino-900 sm:text-3xl">Ajustes</h1></div>

      {demo.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-lila-200 bg-lila-50 p-4">
          <p className="flex-1 text-sm text-lila-600"><b>Hay {demo.length} empleados de ejemplo</b> para que pruebes la app. Cuando des de alta a tu equipo real, bórralos aquí.</p>
          <Boton tipo="peligro" onClick={borrarDemo}><Trash2 size={16} />Borrar datos de ejemplo</Boton>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Turnos rápidos (plantillas)">
          <ul className="space-y-3">
            {config.plantillas.map((p, k) => (
              <li key={p.id} className="rounded-xl border border-vino-100 p-3">
                <div className="flex items-center gap-2">
                  <input value={p.nombre} onChange={(e) => setPl(config.plantillas.map((x, j) => (j === k ? { ...x, nombre: e.target.value } : x)))} className={cx(input, 'font-semibold')} />
                  <div className="flex gap-1">{COLORES.slice(0, 6).map((c) => <button key={c} onClick={() => setPl(config.plantillas.map((x, j) => (j === k ? { ...x, color: c } : x)))} className={cx('h-5 w-5 rounded-full', p.color === c && 'ring-2 ring-offset-1 ring-vino-400')} style={{ background: c }} />)}</div>
                  <button onClick={() => setPl(config.plantillas.filter((_, j) => j !== k))} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
                <Tramos tramos={p.tramos} onChange={(t) => setPl(config.plantillas.map((x, j) => (j === k ? { ...x, tramos: t } : x)))} />
              </li>
            ))}
          </ul>
          <Boton tipo="fantasma" className="mt-3" onClick={() => setPl([...config.plantillas, { id: uid(), nombre: 'Nuevo turno', tramos: [{ i: '10:00', f: '14:00' }], color: COLORES[config.plantillas.length % 6] }])}><Plus size={16} />Añadir turno rápido</Boton>
        </Tarjeta>

        <Tarjeta titulo="Horario de apertura de la tienda">
          <p className="mb-3 text-sm text-zinc-500">Sirve para avisarte si algún momento con la tienda abierta queda sin nadie.</p>
          <ul className="space-y-2">
            {DIAS.map((d, i) => (
              <li key={d} className="flex flex-wrap items-center gap-2 border-b border-vino-50 pb-2">
                <span className="w-24 text-sm font-medium">{d}</span>
                <div className="flex-1">
                  {(config.apertura[i] || []).length ? <Tramos tramos={config.apertura[i]} onChange={(t) => guardarConfig({ apertura: { ...config.apertura, [i]: t } })} /> : <button className="text-sm text-zinc-400 hover:text-vino-700" onClick={() => guardarConfig({ apertura: { ...config.apertura, [i]: [{ i: '10:00', f: '14:00' }] } })}>Cerrado · añadir horario</button>}
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Festivos" accion={<div className="flex gap-1">{[anio - 1, anio, anio + 1].map((a) => <button key={a} onClick={() => setAnio(a)} className={cx('rounded-lg px-2 py-1 text-xs font-medium', a === anio ? 'bg-vino-600 text-white' : 'text-vino-700 hover:bg-vino-50')}>{a}</button>)}</div>}>
          <p className="mb-3 text-sm text-zinc-500">Nacionales, de Andalucía y locales de Huelva. Revisa los de cada año con el calendario oficial del BOJA.</p>
          <ul className="max-h-72 space-y-1 overflow-y-auto scroll-fino">
            {config.festivos.filter((f) => f.fecha.startsWith(String(anio))).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((f) => (
              <li key={f.fecha + f.nombre} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-vino-50/50">
                <span className="w-16 font-medium text-vino-800">{fechaCorta(f.fecha)}</span><span className="flex-1">{f.nombre}</span>
                <button onClick={() => guardarConfig({ festivos: config.festivos.filter((x) => x !== f) })} className="text-zinc-400 hover:text-red-600"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input type="date" value={fest.fecha} onChange={(e) => setFest({ ...fest, fecha: e.target.value })} className={cx(input, 'w-40')} />
            <input value={fest.nombre} onChange={(e) => setFest({ ...fest, nombre: e.target.value })} placeholder="Nombre del festivo" className={input} />
            <Boton disabled={!fest.fecha || !fest.nombre} onClick={() => { guardarConfig({ festivos: [...config.festivos, fest] }); setFest({ fecha: '', nombre: '' }) }}><Plus size={16} /></Boton>
          </div>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Puestos de trabajo">
            <ListaChips items={config.puestos} onChange={(puestos) => guardarConfig({ puestos })} ejemplo="Ej.: Jefe/a de almacén" />
          </Tarjeta>
          <Tarjeta titulo="Centros de trabajo">
            <ListaChips items={config.centros} onChange={(centros) => guardarConfig({ centros })} ejemplo="Ej.: Nave Polígono" />
          </Tarjeta>
          <Tarjeta titulo="Contraseñas">
            <ClaveEquipo />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-vino-50 pt-4">
              <p className="text-sm text-zinc-500">PIN para entrar como encargado/a.<br />Cada empleado cambia el suyo desde su menú.</p>
              <Boton tipo="secundario" onClick={() => setVerPin(true)}><KeyRound size={16} />Cambiar PIN del encargado/a</Boton>
            </div>
            {verPin && <CambiarPin onCerrar={() => setVerPin(false)} />}
          </Tarjeta>
          <Tarjeta titulo="Reglas y empresa">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Máx. horas al día"><input type="number" className={input} value={config.max_horas_dia} onChange={(e) => guardarConfig({ max_horas_dia: Number(e.target.value) || 9 })} /></Campo>
              <Campo label="Descanso mínimo (h)"><input type="number" className={input} value={config.descanso_min} onChange={(e) => guardarConfig({ descanso_min: Number(e.target.value) || 12 })} /></Campo>
              <Campo label="CIF"><input className={input} value={config.cif} onChange={(e) => guardarConfig({ cif: e.target.value })} /></Campo>
            </div>
            <div className="mt-4"><Campo label="Empresa (sale en los impresos)"><input className={input} value={config.empresa} onChange={(e) => guardarConfig({ empresa: e.target.value })} /></Campo></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Campo label="Domicilio de la empresa"><input className={input} value={config.domicilio || ''} onChange={(e) => guardarConfig({ domicilio: e.target.value })} /></Campo>
              <Campo label="Email para protección de datos"><input className={input} value={config.email_privacidad || ''} onChange={(e) => guardarConfig({ email_privacidad: e.target.value })} /></Campo>
            </div>
          </Tarjeta>
          <UbicacionFichar />
          <Tarjeta titulo="Copia de seguridad">
            <CopiaSeguridad />
          </Tarjeta>
          <Tarjeta titulo="Instalar en el móvil">
            <div className="flex gap-3 text-sm text-zinc-600"><Smartphone className="shrink-0 text-vino-600" />
              <p><b>iPhone:</b> abrir el enlace en Safari → botón Compartir → «Añadir a pantalla de inicio».<br /><b>Android:</b> abrir en Chrome → menú ⋮ → «Instalar aplicación».</p>
            </div>
            {sb && <Boton tipo="peligro" className="mt-4" onClick={() => { if (confirm('¿Cerrar la sesión del equipo en este dispositivo? Hará falta la contraseña para volver a entrar.')) { localStorage.removeItem('tn-hor-perfil'); sb!.auth.signOut() } }}><LogOut size={16} />Cerrar sesión en este dispositivo</Boton>}
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

function Tramos({ tramos, onChange }: { tramos: Tramo[]; onChange: (t: Tramo[]) => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {tramos.map((t, i) => (
        <span key={i} className="flex items-center gap-1 rounded-lg bg-vino-50/60 p-1">
          <input type="time" value={t.i} onChange={(e) => onChange(tramos.map((x, j) => (j === i ? { ...x, i: e.target.value } : x)))} className="rounded-md bg-white px-1.5 py-1 text-sm tabular" />
          <span className="text-zinc-400">–</span>
          <input type="time" value={t.f} onChange={(e) => onChange(tramos.map((x, j) => (j === i ? { ...x, f: e.target.value } : x)))} className="rounded-md bg-white px-1.5 py-1 text-sm tabular" />
          <button onClick={() => onChange(tramos.filter((_, j) => j !== i))} className="px-1 text-zinc-400 hover:text-red-600">×</button>
        </span>
      ))}
      {tramos.length < 3 && <button onClick={() => onChange([...tramos, { i: '17:30', f: '21:00' }])} className="rounded-lg px-2 py-1 text-xs text-vino-700 hover:bg-vino-50">+ tramo</button>}
    </div>
  )
}

function ListaChips({ items, onChange, ejemplo }: { items: string[]; onChange: (v: string[]) => void; ejemplo: string }) {
  const [nuevo, setNuevo] = useState('')
  const añadir = () => { const v = nuevo.trim(); if (v && !items.includes(v)) onChange([...items, v]); setNuevo('') }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => <span key={c} className="flex items-center gap-1 rounded-full bg-vino-50 py-1 pl-3 pr-1 text-sm text-vino-800">{c}<button onClick={() => onChange(items.filter((x) => x !== c))} className="rounded-full p-1 hover:bg-vino-100" aria-label={'Quitar ' + c}><Trash2 size={12} /></button></span>)}
      </div>
      <div className="mt-3 flex gap-2"><input value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && añadir()} placeholder={ejemplo} className={input} /><Boton disabled={!nuevo.trim()} onClick={añadir}><Plus size={16} /></Boton></div>
    </>
  )
}

export function CopiaSeguridad({ compacto }: { compacto?: boolean }) {
  const d = useDatos()
  const [haciendo, setHaciendo] = useState(false)
  const dias = diasDesdeCopia(d.config.ultima_copia)
  const est = { empleados: d.empleados, turnos: d.turnos, fichajes: d.fichajes, solicitudes: d.solicitudes, config: d.config }
  const hacer = async () => {
    setHaciendo(true)
    try { await copiaCompleta(est); d.guardarConfig({ ultima_copia: new Date().toISOString() }); toast('Copia descargada. Guárdala en tu ordenador o en Drive') }
    catch { toast('No se pudo hacer la copia: revisa la conexión') }
    setHaciendo(false)
  }
  const excel = async () => { try { await excelFichajes(est, d.config.empresa) } catch { toast('No se pudo descargar: revisa la conexión') } }
  return (
    <div className="space-y-3">
      {!compacto && <p className="text-sm text-zinc-600">Descarga una vez al mes una copia completa de todo (empleados, turnos, fichajes con sus correcciones y solicitudes) y guárdala en tu ordenador o en Google Drive. Así tienes el registro de jornada asegurado durante los 4 años que exige la ley, pase lo que pase con la app.</p>}
      <p className={cx('text-sm font-medium', dias === null || dias >= 30 ? 'text-amber-700' : 'text-emerald-700')}>{dias === null ? 'Todavía no se ha hecho ninguna copia' : dias === 0 ? 'Última copia: hoy' : `Última copia: hace ${dias} ${dias === 1 ? 'día' : 'días'}`}</p>
      <div className="flex flex-wrap gap-2">
        <Boton onClick={hacer} disabled={haciendo}><DatabaseBackup size={16} />{haciendo ? 'Preparando…' : 'Descargar copia completa'}</Boton>
        {!compacto && <Boton tipo="secundario" onClick={excel}><FileSpreadsheet size={16} />Excel con todos los fichajes</Boton>}
      </div>
    </div>
  )
}

function UbicacionFichar() {
  const { config, guardarConfig } = useDatos()
  const gp = config.geo_puestos || [], zp = config.geo_zona_puestos || [], lugares = config.lugares || []
  const [buscando, setBuscando] = useState<string | null>(null)
  const conGeo = (p: string, v: boolean) => guardarConfig(v ? { geo_puestos: [...gp, p] } : { geo_puestos: gp.filter((x) => x !== p), geo_zona_puestos: zp.filter((x) => x !== p) })
  const conZona = (p: string, v: boolean) => guardarConfig(v ? { geo_zona_puestos: [...zp, p], geo_puestos: gp.includes(p) ? gp : [...gp, p] } : { geo_zona_puestos: zp.filter((x) => x !== p) })
  const setL = (ls: Lugar[]) => guardarConfig({ lugares: ls })
  const cambiar = (id: string, c: Partial<Lugar>) => setL(lugares.map((l) => (l.id === id ? { ...l, ...c } : l)))
  const aqui = async (l: Lugar) => {
    setBuscando(l.id)
    try { const p = await posicion(); cambiar(l.id, { lat: p.coords.latitude, lon: p.coords.longitude }); toast(`Ubicación de «${l.nombre}» guardada (precisión ${Math.round(p.coords.accuracy)} m)`) }
    catch { toast('No se pudo obtener la ubicación: da permiso de ubicación al navegador') }
    setBuscando(null)
  }
  const nuevo = () => setL([...lugares, { id: uid(), nombre: 'Nuevo sitio', lat: lugares[0]?.lat ?? 37.25634, lon: lugares[0]?.lon ?? -6.94829, radio: 150 }])
  return (
    <Tarjeta titulo="Ubicación al fichar">
      <p className="text-sm text-zinc-600">Solo se guarda dónde está la persona <b>en el momento de fichar</b>. Nunca se sigue su recorrido durante el día.</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-vino-100">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-vino-50/60 px-3 py-2 font-cond text-[11px] uppercase tracking-wider text-vino-700"><span>Puesto</span><span className="w-20 text-center">Guardar ubicación</span><span className="w-20 text-center">Avisar fuera de zona</span></div>
        {config.puestos.map((p) => (
          <label key={p} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-vino-50 px-3 py-1.5 text-sm">
            <span className="truncate">{p}</span>
            <span className="w-20 text-center"><input type="checkbox" className="h-4 w-4 accent-vino-600" checked={gp.includes(p)} onChange={(e) => conGeo(p, e.target.checked)} /></span>
            <span className="w-20 text-center"><input type="checkbox" className="h-4 w-4 accent-vino-600" checked={zp.includes(p)} onChange={(e) => conZona(p, e.target.checked)} /></span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">«Avisar fuera de zona» marca en naranja la entrada o la salida fichadas lejos de los sitios de trabajo.</p>
      <p className="mb-2 mt-5 font-cond text-xs uppercase tracking-wider text-vino-800/70">Sitios de trabajo</p>
      <ul className="space-y-2">
        {lugares.map((l) => (
          <li key={l.id} className="rounded-xl bg-vino-50/50 p-3">
            <div className="flex gap-2">
              <input value={l.nombre} onChange={(e) => cambiar(l.id, { nombre: e.target.value })} className={input} aria-label="Nombre del sitio" />
              <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">Radio<input type="number" min={50} step={50} value={l.radio} onChange={(e) => cambiar(l.id, { radio: Math.max(50, Number(e.target.value) || 150) })} className={cx(input, 'w-20 tabular')} />m</label>
              <button onClick={() => confirm(`¿Quitar «${l.nombre}»?`) && setL(lugares.filter((x) => x.id !== l.id))} className="rounded-lg p-2 text-zinc-400 hover:text-red-600" aria-label="Quitar sitio"><Trash2 size={15} /></button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Boton tipo="secundario" onClick={() => aqui(l)} disabled={buscando === l.id}><Crosshair size={15} />{buscando === l.id ? 'Buscando…' : 'Usar mi ubicación actual'}</Boton>
              <a href={mapa(l)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-vino-600 hover:underline"><MapPin size={14} />Ver en el mapa</a>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={nuevo} className="mt-2 text-sm font-medium text-vino-700 hover:underline">+ Añadir sitio</button>
      <p className="mt-2 text-xs text-zinc-500">Para fijar un sitio con exactitud, ve allí con el móvil, entra como encargado/a y pulsa «Usar mi ubicación actual».</p>
    </Tarjeta>
  )
}
