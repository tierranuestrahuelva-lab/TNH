import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarRange, Clock, Coffee, LogIn, Palmtree, PartyPopper, UserCheck, UserX } from 'lucide-react'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import { aMin, fechaCorta, fechaLarga, fmtH, horaDe, hoy, lunesDe, semana, sumarDias, diaSemana, deIso } from '../lib/fechas'
import { TIPOS, avisosSemana, huecosCobertura, resumenFichajes, textoTramos } from '../lib/reglas'
import { Avatar, Tarjeta, cx } from '../ui'

export function useAhora(ms = 30000) {
  const [t, setT] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setT(Date.now()), ms); return () => clearInterval(i) }, [ms])
  return t
}

export default function Hoy({ ir }: { ir: (v: string) => void }) {
  const { config, solicitudes } = useDatos()
  const ix = useIndices()
  const ahora = useAhora()
  const f = hoy()
  const d = new Date(ahora), mAhora = d.getHours() * 60 + d.getMinutes()
  const filas = ix.activos.map((e) => {
    const t = ix.turnoDe(e.id, f)
    const r = resumenFichajes(ix.fichajesDe(e.id, f), ahora)
    const ini = t?.tipo === 'trabajo' && t.tramos.length ? Math.min(...t.tramos.map((x) => aMin(x.i))) : null
    const tarde = ini !== null && r.estado === 'fuera' && !r.primera && mAhora > ini + 10
    return { e, t, r, tarde }
  })
  const trabajan = filas.filter((x) => x.t?.tipo === 'trabajo')
  const dentro = filas.filter((x) => x.r.estado === 'dentro')
  const pausa = filas.filter((x) => x.r.estado === 'pausa')
  const ausentes = filas.filter((x) => x.t && ['vacaciones', 'baja', 'permiso'].includes(x.t.tipo))
  const tarde = filas.filter((x) => x.tarde)
  const pend = solicitudes.filter((s) => s.estado === 'pendiente')
  const huecos = huecosCobertura(f, filas.map((x) => x.t!).filter(Boolean), config)
  const dias = semana(lunesDe(f))
  const errores = ix.activos.flatMap((e) => avisosSemana(e, dias, ix.turnoDe, config, ix.festivoDe)).filter((a) => a.nivel === 'error')
  const proxFest = config.festivos.filter((x) => x.fecha >= f).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3)
  const saludo = d.getHours() < 14 ? 'Buenos días' : d.getHours() < 21 ? 'Buenas tardes' : 'Buenas noches'
  const manana = sumarDias(f, 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500 first-letter:uppercase">{fechaLarga(f)}</p>
          <h1 className="text-2xl font-semibold text-vino-900 sm:text-3xl">{saludo}</h1>
        </div>
        <p className="text-4xl font-light text-vino-700 tabular">{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icono={<CalendarRange size={18} />} t="Trabajan hoy" v={trabajan.length} c="#830040" />
        <Kpi icono={<UserCheck size={18} />} t="Fichados ahora" v={dentro.length} c="#047857" />
        <Kpi icono={<Coffee size={18} />} t="En pausa" v={pausa.length} c="#b45309" />
        <Kpi icono={<Palmtree size={18} />} t="Ausentes" v={ausentes.length} c="#1d4ed8" />
        <Kpi icono={<UserX size={18} />} t="Sin fichar (retraso)" v={tarde.length} c="#b91c1c" alerta={tarde.length > 0} />
      </div>

      {(pend.length > 0 || errores.length > 0 || huecos.length > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          {pend.length > 0 && <Alerta onClick={() => ir('ausencias')} color="lila" t={`${pend.length} ${pend.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}`} s="Vacaciones, permisos o cambios por revisar" />}
          {errores.length > 0 && <Alerta onClick={() => ir('cuadrante')} color="rojo" t={`${errores.length} ${errores.length === 1 ? 'problema' : 'problemas'} en el cuadrante`} s={errores[0].texto} />}
          {huecos.length > 0 && <Alerta onClick={() => ir('cuadrante')} color="ambar" t="Tienda sin cubrir hoy" s={huecos.map((h) => `${h.i}–${h.f}`).join(', ')} />}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Tarjeta titulo="Equipo ahora" className="xl:col-span-2" accion={<button onClick={() => ir('fichajes')} className="text-sm text-vino-600 hover:underline">Registro de jornada</button>}>
          <ul className="divide-y divide-vino-50">
            {filas.map(({ e, t, r, tarde }) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <div className="relative"><Avatar emp={e} size={42} /><span className={cx('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white', r.estado === 'dentro' ? 'bg-emerald-500' : r.estado === 'pausa' ? 'bg-amber-400' : tarde ? 'bg-red-500 latido' : 'bg-zinc-300')} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-800">{e.nombre} <span className="hidden font-normal text-zinc-400 sm:inline">· {e.puesto}</span></p>
                  <p className="truncate text-sm text-zinc-500 tabular">{!t ? 'Sin turno asignado' : t.tipo === 'trabajo' ? `${textoTramos(t.tramos)}${t.centro ? ' · ' + t.centro : ''}` : TIPOS[t.tipo].label}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  {r.estado === 'dentro' && <p className="font-medium text-emerald-700">Trabajando</p>}
                  {r.estado === 'pausa' && <p className="font-medium text-amber-700">En pausa</p>}
                  {r.estado === 'fuera' && r.primera && <p className="font-medium text-zinc-500">Ha salido</p>}
                  {tarde && <p className="font-medium text-red-600">No ha fichado</p>}
                  {r.primera && <p className="text-xs text-zinc-500 tabular">desde {horaDe(r.primera.ts)} · {fmtH(r.min)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Hoy por horas">
            <LineaDia fecha={f} />
          </Tarjeta>
          <Tarjeta titulo="Mañana" accion={<span className="text-xs text-zinc-500">{fechaCorta(manana)}</span>}>
            <ul className="space-y-2">
              {ix.activos.map((e) => ({ e, t: ix.turnoDe(e.id, manana) })).filter((x) => x.t).map(({ e, t }) => (
                <li key={e.id} className="flex items-center gap-2 text-sm"><Avatar emp={e} size={24} /><span className="flex-1 truncate">{e.nombre.split(' ')[0]}</span><span className="text-zinc-500 tabular">{t!.tipo === 'trabajo' ? textoTramos(t!.tramos) : TIPOS[t!.tipo].label}</span></li>
              ))}
              {!ix.activos.some((e) => ix.turnoDe(e.id, manana)) && <p className="text-sm text-zinc-500">Sin turnos todavía.</p>}
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Próximos festivos">
            <ul className="space-y-2">{proxFest.map((x) => <li key={x.fecha} className="flex items-center gap-3 text-sm"><PartyPopper size={16} className="text-lila-500" /><span className="flex-1">{x.nombre}</span><span className="text-zinc-500">{fechaCorta(x.fecha)}</span></li>)}</ul>
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}

export function LineaDia({ fecha }: { fecha: string }) {
  const { config } = useDatos()
  const ix = useIndices()
  const ap = config.apertura[diaSemana(fecha)] || []
  const H0 = 8 * 60, H1 = 22 * 60, pct = (m: number) => Math.max(0, Math.min(100, ((m - H0) / (H1 - H0)) * 100))
  const n = new Date(), mA = n.getHours() * 60 + n.getMinutes()
  return (
    <div>
      <div className="relative mb-1 h-4 text-[10px] text-zinc-400">{[8, 10, 12, 14, 16, 18, 20, 22].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>{h}</span>)}</div>
      <div className="relative space-y-1.5">
        {ap.map((a, i) => <span key={i} className="absolute inset-y-0 rounded bg-lila-50" style={{ left: `${pct(aMin(a.i))}%`, width: `${pct(aMin(a.f)) - pct(aMin(a.i))}%` }} />)}
        {fecha === hoy() && mA > H0 && mA < H1 && <span className="absolute -inset-y-1 z-10 w-0.5 bg-red-500" style={{ left: `${pct(mA)}%` }} />}
        {ix.activos.map((e) => { const t = ix.turnoDe(e.id, fecha); return t?.tipo === 'trabajo' ? (
          <div key={e.id} className="relative h-5" title={e.nombre}>
            {t.tramos.map((x, i) => <span key={i} className="absolute inset-y-0 flex items-center overflow-hidden whitespace-nowrap rounded px-1 text-[10px] font-semibold text-white" style={{ left: `${pct(aMin(x.i))}%`, width: `${pct(aMin(x.f)) - pct(aMin(x.i))}%`, background: e.color || '#830040' }}>{i === 0 && e.nombre.split(' ')[0]}</span>)}
          </div>) : null })}
      </div>
      {deIso(fecha) && null}
    </div>
  )
}

function Kpi({ icono, t, v, c, alerta }: { icono: React.ReactNode; t: string; v: number; c: string; alerta?: boolean }) {
  return (
    <div className={cx('rounded-2xl border bg-white p-4 shadow-suave', alerta ? 'border-red-200' : 'border-vino-100/60')}>
      <span className="inline-flex rounded-xl p-2" style={{ background: c + '14', color: c }}>{icono}</span>
      <p className="mt-2 text-3xl font-semibold tabular" style={{ color: c }}>{v}</p>
      <p className="text-xs text-zinc-500">{t}</p>
    </div>
  )
}
function Alerta({ t, s, color, onClick }: { t: string; s: string; color: 'lila' | 'rojo' | 'ambar'; onClick: () => void }) {
  const c = { lila: 'bg-lila-50 border-lila-200 text-lila-600', rojo: 'bg-red-50 border-red-200 text-red-700', ambar: 'bg-amber-50 border-amber-200 text-amber-800' }[color]
  return (
    <button onClick={onClick} className={cx('flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:shadow-suave', c)}>
      {color === 'lila' ? <LogIn size={20} /> : color === 'rojo' ? <AlertTriangle size={20} /> : <Clock size={20} />}
      <div className="min-w-0 flex-1"><p className="font-semibold">{t}</p><p className="truncate text-sm opacity-80">{s}</p></div><ArrowRight size={18} />
    </button>
  )
}
