import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { Empleado } from './lib/types'
import { TIPOS } from './lib/reglas'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Boton({ children, onClick, tipo = 'primario', className, disabled, title, type = 'button' }: { children: ReactNode; onClick?: () => void; tipo?: 'primario' | 'secundario' | 'fantasma' | 'peligro'; className?: string; disabled?: boolean; title?: string; type?: 'button' | 'submit' }) {
  const t = {
    primario: 'bg-vino-600 text-white hover:bg-vino-700 shadow-sm',
    secundario: 'bg-white text-vino-700 border border-vino-200 hover:bg-vino-50',
    fantasma: 'text-vino-700 hover:bg-vino-50',
    peligro: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  }[tipo]
  return <button type={type} title={title} disabled={disabled} onClick={onClick} className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed', t, className)}>{children}</button>
}

export function Tarjeta({ children, className, titulo, accion }: { children: ReactNode; className?: string; titulo?: ReactNode; accion?: ReactNode }) {
  return (
    <section className={cx('min-w-0 rounded-2xl bg-white shadow-suave border border-vino-100/60', className)}>
      {titulo && <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-2"><h2 className="font-cond uppercase tracking-[0.12em] text-[13px] font-semibold text-vino-700">{titulo}</h2>{accion}</header>}
      <div className={titulo ? 'px-5 pb-5' : ''}>{children}</div>
    </section>
  )
}

export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg', pie }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: string; pie?: ReactNode }) {
  useEffect(() => {
    if (!abierto) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [abierto, onCerrar])
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-vino-900/40 backdrop-blur-[2px] p-0 sm:p-4 no-print" onMouseDown={onCerrar}>
      <div className={cx('w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col animate-subir', ancho)} onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-vino-50">
          <h3 className="text-lg font-semibold text-vino-900">{titulo}</h3>
          <button onClick={onCerrar} className="rounded-full p-2 hover:bg-vino-50 text-vino-700" aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
        {pie && <footer className="px-6 py-4 border-t border-vino-50 flex flex-wrap gap-2 justify-end">{pie}</footer>}
      </div>
    </div>
  )
}

export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export function Avatar({ emp, size = 36 }: { emp?: Pick<Empleado, 'nombre' | 'color'>; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white" style={{ width: size, height: size, background: emp?.color || '#B771A0', fontSize: size * 0.38 }}>
      {emp ? iniciales(emp.nombre) : '?'}
    </span>
  )
}

export function Etiqueta({ tipo, children }: { tipo: string; children?: ReactNode }) {
  const t = TIPOS[tipo] || TIPOS.trabajo
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: t.bg, color: t.fg }}>{children ?? t.label}</span>
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-vino-800/70 font-cond">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-zinc-500">{ayuda}</span>}
    </label>
  )
}
export const input = 'w-full rounded-xl border border-vino-100 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-vino-400 focus:ring-4 focus:ring-vino-100 transition'

export function Vacio({ icono, titulo, texto, children }: { icono: ReactNode; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="mb-3 rounded-2xl bg-vino-50 p-4 text-vino-600">{icono}</div>
      <p className="font-semibold text-vino-900">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-zinc-500">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function Segmentos<T extends string>({ valor, opciones, onChange }: { valor: T; opciones: { v: T; l: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-vino-50 p-1">
      {opciones.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', valor === o.v ? 'bg-white text-vino-700 shadow-sm' : 'text-vino-800/60 hover:text-vino-700')}>{o.l}</button>
      ))}
    </div>
  )
}

export function Barra({ valor, max, color = '#830040' }: { valor: number; max: number; color?: string }) {
  const p = max ? Math.min(100, (valor / max) * 100) : 0
  const exceso = max && valor > max
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-vino-50"><div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: exceso ? '#dc2626' : color }} /></div>
}
