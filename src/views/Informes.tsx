import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react'
import { useIndices } from '../lib/usar'
import { diasMes, fmtH, hoy, mesDe, nombreMes, sumarMes } from '../lib/fechas'
import { minTurno, resumenFichajes } from '../lib/reglas'
import { csv } from '../lib/exportar'
import { Avatar, Boton, Tarjeta, cx } from '../ui'

export default function Informes() {
  const ix = useIndices()
  const [mes, setMes] = useState(mesDe(hoy()))
  const dias = diasMes(mes)
  const semanasMes = dias.length / 7
  const filas = ix.activos.map((e) => {
    let plan = 0, trab = 0, vac = 0, baja = 0, perm = 0, diasT = 0, sinFichar = 0
    for (const d of dias) {
      const t = ix.turnoDe(e.id, d), m = minTurno(t)
      plan += m; if (m) diasT++
      const r = resumenFichajes(ix.fichajesDe(e.id, d), d === hoy() ? Date.now() : new Date(d + 'T23:59:59').getTime())
      trab += r.min
      if (m && !r.primera && d < hoy()) sinFichar++
      if (t?.tipo === 'vacaciones') vac++
      if (t?.tipo === 'baja') baja++
      if (t?.tipo === 'permiso') perm++
    }
    const contrato = e.horas_semana * 60 * semanasMes
    return { e, plan, trab, contrato, extra: Math.max(0, trab - contrato), vac, baja, perm, diasT, sinFichar, coste: (e.coste_hora || 0) * plan / 60 }
  })
  const max = Math.max(1, ...filas.map((f) => Math.max(f.plan, f.trab, f.contrato)))
  const tot = (k: 'plan' | 'trab' | 'coste') => filas.reduce((s, f) => s + f[k], 0)
  const exportar = () => csv(`informe-horas-${mes}.csv`, [['Empleado', 'Puesto', 'Días trabajo', 'Horas previstas', 'Horas trabajadas (fichajes)', 'Horas contrato (aprox.)', 'Exceso sobre contrato', 'Vacaciones', 'Baja', 'Permisos', 'Días sin fichar', 'Coste estimado €'],
    ...filas.map((f) => [f.e.nombre, f.e.puesto || '', f.diasT, fmtH(f.plan), fmtH(f.trab), fmtH(f.contrato), fmtH(f.extra), f.vac, f.baja, f.perm, f.sinFichar, f.coste.toFixed(2).replace('.', ',')])])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Informe mensual</p><h1 className="text-2xl font-semibold capitalize text-vino-900 sm:text-3xl">{nombreMes(mes)}</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-vino-100 bg-white">
            <button className="rounded-l-xl p-2.5 text-vino-700 hover:bg-vino-50" onClick={() => setMes(sumarMes(mes, -1))}><ChevronLeft size={18} /></button>
            <button className="px-3 text-sm font-medium text-vino-700" onClick={() => setMes(mesDe(hoy()))}>Este mes</button>
            <button className="rounded-r-xl p-2.5 text-vino-700 hover:bg-vino-50" onClick={() => setMes(sumarMes(mes, 1))}><ChevronRight size={18} /></button>
          </div>
          <Boton tipo="secundario" onClick={exportar}><FileSpreadsheet size={16} />Excel para la gestoría</Boton>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Horas previstas</p><p className="text-2xl font-semibold text-vino-900 tabular">{fmtH(tot('plan'))}</p></Tarjeta>
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Horas fichadas</p><p className="text-2xl font-semibold text-vino-900 tabular">{fmtH(tot('trab'))}</p></Tarjeta>
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Coste estimado</p><p className="text-2xl font-semibold text-vino-900 tabular">{tot('coste') ? tot('coste').toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}</p></Tarjeta>
        <Tarjeta className="p-4"><p className="font-cond text-[11px] uppercase tracking-wider text-zinc-500">Días sin fichar</p><p className={cx('text-2xl font-semibold tabular', filas.some((f) => f.sinFichar) ? 'text-red-600' : 'text-vino-900')}>{filas.reduce((s, f) => s + f.sinFichar, 0)}</p></Tarjeta>
      </div>
      <Tarjeta titulo="Horas por persona">
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-zinc-500"><span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-lila-300" />Previstas</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-vino-600" />Fichadas</span><span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-zinc-800" />Contrato</span></div>
        <ul className="space-y-4">
          {filas.map((f) => (
            <li key={f.e.id} className="grid grid-cols-[auto_1fr] items-center gap-3 sm:grid-cols-[200px_1fr_260px]">
              <div className="flex items-center gap-2"><Avatar emp={f.e} size={30} /><span className="truncate text-sm font-semibold">{f.e.nombre}</span></div>
              <div className="relative space-y-1">
                <div className="h-2.5 rounded-full bg-lila-300" style={{ width: `${(f.plan / max) * 100}%` }} />
                <div className="h-2.5 rounded-full bg-vino-600" style={{ width: `${(f.trab / max) * 100}%` }} />
                <span className="absolute -inset-y-1 w-0.5 bg-zinc-800" style={{ left: `${(f.contrato / max) * 100}%` }} />
              </div>
              <p className="col-span-2 text-xs text-zinc-500 sm:col-span-1 sm:text-right tabular">{fmtH(f.plan)} prev. · <b className="text-zinc-800">{fmtH(f.trab)} fich.</b>{f.extra > 0 && <span className="text-amber-700"> · +{fmtH(f.extra)}</span>}{f.vac ? ` · ${f.vac} vac.` : ''}{f.baja ? ` · ${f.baja} baja` : ''}</p>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  )
}
