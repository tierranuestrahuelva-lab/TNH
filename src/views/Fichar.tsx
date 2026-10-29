import { useState } from 'react'
import { Coffee, LogIn, LogOut, Play } from 'lucide-react'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado, TipoFichaje } from '../lib/types'
import { fechaLarga, fmtH, horaDe, hoy, lunesDe, semana, uid } from '../lib/fechas'
import { TIPOS, minTurno, resumenFichajes, textoTramos } from '../lib/reglas'
import { toast } from '../lib/toast'
import { Barra, Tarjeta, cx } from '../ui'
import { useAhora } from './Hoy'

const NOMBRE: Record<TipoFichaje, string> = { entrada: 'Entrada', pausa: 'Inicio de pausa', vuelta: 'Fin de pausa', salida: 'Salida' }

export default function Fichar({ emp }: { emp: Empleado }) {
  const { guardar } = useDatos()
  const ix = useIndices()
  const ahora = useAhora(1000)
  const [confirmar, setConfirmar] = useState<TipoFichaje | null>(null)
  const f = hoy()
  const fs = ix.fichajesDe(emp.id, f)
  const r = resumenFichajes(fs, ahora)
  const t = ix.turnoDe(emp.id, f)
  const d = new Date(ahora)
  const sem = semana(lunesDe(f))
  const trabSem = sem.reduce((s, x) => s + resumenFichajes(ix.fichajesDe(emp.id, x), ahora).min, 0)
  const planSem = sem.reduce((s, x) => s + minTurno(ix.turnoDe(emp.id, x)), 0)

  const fichar = (tipo: TipoFichaje) => {
    guardar('fichajes', { id: uid(), empleado_id: emp.id, ts: new Date().toISOString(), tipo })
    setConfirmar(null)
    toast(`${NOMBRE[tipo]} registrada a las ${horaDe(new Date().toISOString())}`)
    navigator.vibrate?.(60)
  }

  const estadoTxt = { dentro: 'Estás trabajando', pausa: 'Estás en pausa', fuera: r.primera ? 'Jornada terminada' : 'Aún no has fichado' }[r.estado]

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="overflow-hidden rounded-3xl bg-vino-600 bg-[radial-gradient(600px_300px_at_100%_0%,#B771A088,transparent_60%)] p-6 text-center text-white shadow-xl">
        <p className="font-cond text-xs uppercase tracking-[0.25em] text-lila-100 first-letter:uppercase">{fechaLarga(f)}</p>
        <p className="mt-2 text-6xl font-light tabular">{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}<span className="text-3xl text-white/60">:{String(d.getSeconds()).padStart(2, '0')}</span></p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm">
          <span className={cx('h-2.5 w-2.5 rounded-full', r.estado === 'dentro' ? 'bg-emerald-400 latido' : r.estado === 'pausa' ? 'bg-amber-300' : 'bg-white/50')} />{estadoTxt}
        </p>
        <p className="mt-3 text-sm text-lila-100">Hoy llevas <b className="text-white tabular">{fmtH(r.min)}</b> · Tu turno: <b className="text-white">{!t ? 'sin turno' : t.tipo === 'trabajo' ? textoTramos(t.tramos) : TIPOS[t.tipo].label}</b></p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {r.estado === 'fuera' && <BotonGrande className="col-span-2 bg-emerald-600 hover:bg-emerald-700" icono={<LogIn size={28} />} t={r.primera ? 'Volver a entrar' : 'Fichar entrada'} onClick={() => setConfirmar('entrada')} />}
        {r.estado === 'dentro' && <>
          <BotonGrande className="bg-amber-500 hover:bg-amber-600" icono={<Coffee size={28} />} t="Pausa" onClick={() => setConfirmar('pausa')} />
          <BotonGrande className="bg-vino-600 hover:bg-vino-700" icono={<LogOut size={28} />} t="Fichar salida" onClick={() => setConfirmar('salida')} />
        </>}
        {r.estado === 'pausa' && <>
          <BotonGrande className="bg-emerald-600 hover:bg-emerald-700" icono={<Play size={28} />} t="Volver de pausa" onClick={() => setConfirmar('vuelta')} />
          <BotonGrande className="bg-vino-600 hover:bg-vino-700" icono={<LogOut size={28} />} t="Fichar salida" onClick={() => setConfirmar('salida')} />
        </>}
      </div>

      {confirmar && (
        <div className="animate-subir rounded-2xl border-2 border-vino-200 bg-white p-4 text-center shadow-suave">
          <p className="text-vino-900">¿Registrar <b>{NOMBRE[confirmar].toLowerCase()}</b> ahora, a las <b className="tabular">{horaDe(new Date(ahora).toISOString())}</b>?</p>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={() => setConfirmar(null)} className="rounded-xl border border-vino-100 px-5 py-2.5 text-sm font-medium text-vino-700">Cancelar</button>
            <button onClick={() => fichar(confirmar)} className="rounded-xl bg-vino-600 px-6 py-2.5 text-sm font-semibold text-white">Sí, registrar</button>
          </div>
        </div>
      )}

      <Tarjeta titulo="Fichajes de hoy">
        {!fs.length ? <p className="text-sm text-zinc-500">Todavía no hay registros hoy.</p> : (
          <ol className="relative ml-2 space-y-3 border-l-2 border-vino-100 pl-5">
            {fs.map((x) => (
              <li key={x.id} className="relative">
                <span className={cx('absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white', x.tipo === 'entrada' || x.tipo === 'vuelta' ? 'bg-emerald-500' : x.tipo === 'pausa' ? 'bg-amber-400' : 'bg-vino-600')} />
                <p className="flex justify-between text-sm"><span className="font-medium">{NOMBRE[x.tipo]}</span><span className="tabular text-zinc-600">{horaDe(x.ts)}</span></p>
                {x.editado && <p className="text-xs text-zinc-400">Corregido por el encargado{x.nota ? `: ${x.nota}` : ''}</p>}
              </li>
            ))}
          </ol>
        )}
      </Tarjeta>

      <Tarjeta titulo="Esta semana">
        <div className="mb-2 flex justify-between text-sm"><span>Trabajado <b className="tabular">{fmtH(trabSem)}</b></span><span className="text-zinc-500">Previsto {fmtH(planSem)} · Contrato {emp.horas_semana} h</span></div>
        <Barra valor={trabSem} max={Math.max(planSem, 1)} color={emp.color || undefined} />
      </Tarjeta>
      <p className="px-2 text-center text-xs text-zinc-400">Registro de jornada (art. 34.9 del Estatuto de los Trabajadores). Si te equivocas, avisa a tu encargado/a para corregirlo.</p>
    </div>
  )
}

function BotonGrande({ icono, t, onClick, className }: { icono: React.ReactNode; t: string; onClick: () => void; className?: string }) {
  return <button onClick={onClick} className={cx('flex flex-col items-center justify-center gap-2 rounded-3xl py-7 text-lg font-semibold text-white shadow-lg transition active:scale-[.98]', className)}>{icono}{t}</button>
}
