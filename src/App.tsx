import { useEffect, useState, type ReactNode } from 'react'
import { CalendarDays, CalendarRange, Clock, Cloud, CloudOff, LayoutDashboard, LogOut, Palmtree, RefreshCw, Settings, Users, Timer, UserRound, Inbox, BarChart3, ChevronDown } from 'lucide-react'
import logo from './assets/logo-white.svg'
import { DatosProvider, MODO_NUBE, sb, useDatos } from './lib/datos'
import type { Perfil } from './lib/types'
import { Toasts } from './lib/toast'
import { Avatar, cx } from './ui'
import { Login, SelectorPerfil } from './views/Acceso'
import Hoy from './views/Hoy'
import Cuadrante from './views/Cuadrante'
import Mes from './views/Mes'
import Fichajes from './views/Fichajes'
import Ausencias from './views/Ausencias'
import Equipo from './views/Equipo'
import Ajustes from './views/Ajustes'
import Fichar from './views/Fichar'
import MiHorario from './views/MiHorario'
import Solicitudes from './views/Solicitudes'
import Informes from './views/Informes'

const K_PERFIL = 'tn-hor-perfil'

export default function App() {
  const [sesion, setSesion] = useState<boolean | null>(MODO_NUBE ? null : true)
  useEffect(() => {
    if (!sb) return
    sb.auth.getSession().then(({ data }) => setSesion(!!data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSesion(!!s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (sesion === null) return <Cargando />
  if (!sesion) return <Login />
  return <DatosProvider activo><Interior /><Toasts /></DatosProvider>
}

function Cargando() {
  return <div className="fondo-marca grid min-h-screen place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-vino-100 border-t-vino-600" /></div>
}

type Vista = { id: string; label: string; icono: ReactNode; el: ReactNode; badge?: number }

function Interior() {
  const d = useDatos()
  const [perfil, setPerfilS] = useState<Perfil | null>(() => { try { return JSON.parse(localStorage.getItem(K_PERFIL) || 'null') } catch { return null } })
  const setPerfil = (p: Perfil | null) => { setPerfilS(p); p ? localStorage.setItem(K_PERFIL, JSON.stringify(p)) : localStorage.removeItem(K_PERFIL) }
  const [vista, setVista] = useState(() => location.hash.slice(1) || 'hoy')
  const [menu, setMenu] = useState(false)
  useEffect(() => { history.replaceState(null, '', '#' + vista); window.scrollTo(0, 0) }, [vista])

  if (d.cargando && !d.empleados.length) return <Cargando />
  const emp = perfil?.rol === 'empleado' ? d.empleados.find((e) => e.id === perfil.id) : undefined
  if (!perfil || (perfil.rol === 'empleado' && !emp)) return <SelectorPerfil onElegir={(p) => { setPerfil(p); setVista(p.rol === 'encargado' ? 'hoy' : 'fichar') }} />

  const pend = d.solicitudes.filter((s) => s.estado === 'pendiente').length
  const vistas: Vista[] = perfil.rol === 'encargado'
    ? [
        { id: 'hoy', label: 'Hoy', icono: <LayoutDashboard size={20} />, el: <Hoy ir={setVista} /> },
        { id: 'cuadrante', label: 'Cuadrante', icono: <CalendarRange size={20} />, el: <Cuadrante editable /> },
        { id: 'mes', label: 'Mes', icono: <CalendarDays size={20} />, el: <Mes /> },
        { id: 'fichajes', label: 'Registro', icono: <Timer size={20} />, el: <Fichajes /> },
        { id: 'ausencias', label: 'Ausencias', icono: <Palmtree size={20} />, el: <Ausencias />, badge: pend },
        { id: 'informes', label: 'Informes', icono: <BarChart3 size={20} />, el: <Informes /> },
        { id: 'equipo', label: 'Equipo', icono: <Users size={20} />, el: <Equipo /> },
        { id: 'ajustes', label: 'Ajustes', icono: <Settings size={20} />, el: <Ajustes /> },
      ]
    : [
        { id: 'fichar', label: 'Fichar', icono: <Clock size={20} />, el: <Fichar emp={emp!} /> },
        { id: 'mihorario', label: 'Mi horario', icono: <CalendarDays size={20} />, el: <MiHorario emp={emp!} /> },
        { id: 'cuadrante', label: 'Equipo', icono: <CalendarRange size={20} />, el: <Cuadrante editable={false} /> },
        { id: 'solicitudes', label: 'Solicitudes', icono: <Inbox size={20} />, el: <Solicitudes emp={emp!} /> },
      ]
  const actual = vistas.find((v) => v.id === vista) || vistas[0]
  const movil = perfil.rol === 'encargado' ? vistas.filter((v) => ['hoy', 'cuadrante', 'fichajes', 'ausencias', 'equipo'].includes(v.id)) : vistas

  return (
    <div className="fondo-marca min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-vino-600 text-white lg:flex">
        <div className="px-6 pt-7 pb-6">
          <img src={logo} alt="Tierra Nuestra" className="h-9 w-auto" />
          <p className="mt-3 font-cond text-[11px] uppercase tracking-[0.3em] text-lila-200">Horarios del equipo</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {vistas.map((v) => (
            <button key={v.id} onClick={() => setVista(v.id)} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition', actual.id === v.id ? 'bg-white text-vino-700 font-semibold shadow' : 'text-white/85 hover:bg-white/10')}>
              {v.icono}<span className="flex-1 text-left">{v.label}</span>
              {!!v.badge && <span className="rounded-full bg-lila-400 px-2 text-xs font-bold text-white">{v.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-2xl bg-vino-700/60 p-3">
          <PerfilChip perfil={perfil} onSalir={() => setPerfil(null)} oscuro />
          <EstadoSync />
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-vino-600 px-4 py-3 text-white shadow-md lg:hidden" style={{ paddingTop: 'max(.75rem, env(safe-area-inset-top))' }}>
        <img src={logo} alt="Tierra Nuestra" className="h-6 w-auto" />
        <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm">
          {emp ? <Avatar emp={emp} size={28} /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-lila-400"><UserRound size={16} /></span>}
          <span className="max-w-[110px] truncate">{emp ? emp.nombre.split(' ')[0] : 'Encargado/a'}</span><ChevronDown size={14} />
        </button>
        {menu && (
          <div className="absolute right-3 top-full mt-2 w-60 rounded-2xl bg-white p-2 text-zinc-800 shadow-2xl" onClick={() => setMenu(false)}>
            {perfil.rol === 'encargado' && vistas.filter((v) => !movil.includes(v)).map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-vino-50">{v.icono}{v.label}</button>
            ))}
            <button onClick={() => setPerfil(null)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-vino-700 hover:bg-vino-50"><LogOut size={20} />Cambiar de usuario</button>
            <div className="px-3 pt-1"><EstadoSync claro /></div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1400px] px-3 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8" key={actual.id}>{actual.el}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-vino-100 bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {movil.map((v) => (
          <button key={v.id} onClick={() => setVista(v.id)} className={cx('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', actual.id === v.id ? 'text-vino-600' : 'text-zinc-500')}>
            <span className={cx('rounded-full px-4 py-1 transition', actual.id === v.id && 'bg-vino-50')}>{v.icono}</span>{v.label}
            {!!v.badge && <span className="absolute right-[22%] top-1 rounded-full bg-lila-400 px-1.5 text-[10px] font-bold text-white">{v.badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  )
}

function PerfilChip({ perfil, onSalir, oscuro }: { perfil: Perfil; onSalir: () => void; oscuro?: boolean }) {
  const { empleados } = useDatos()
  const emp = perfil.rol === 'empleado' ? empleados.find((e) => e.id === perfil.id) : undefined
  return (
    <div className="flex items-center gap-3">
      {emp ? <Avatar emp={emp} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-lila-400"><UserRound size={18} /></span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{emp ? emp.nombre : 'Encargado/a'}</p>
        <p className={cx('truncate text-xs', oscuro ? 'text-lila-200' : 'text-zinc-500')}>{emp ? emp.puesto || 'Equipo' : 'Gestión de horarios'}</p>
      </div>
      <button onClick={onSalir} title="Cambiar de usuario" className="rounded-lg p-2 hover:bg-white/10"><LogOut size={18} /></button>
    </div>
  )
}

function EstadoSync({ claro }: { claro?: boolean }) {
  const { sync, pendientes, recargar } = useDatos()
  const txt = { ok: 'Sincronizado', pendiente: `Guardando… (${pendientes})`, error: 'Sin conexión · se guardará luego', local: 'Solo en este dispositivo' }[sync]
  return (
    <button onClick={() => recargar()} className={cx('mt-2 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-xs', claro ? 'text-zinc-500' : 'text-lila-100')}>
      {sync === 'ok' ? <Cloud size={14} /> : sync === 'pendiente' ? <RefreshCw size={14} className="animate-spin" /> : <CloudOff size={14} />}
      {txt}
    </button>
  )
}
