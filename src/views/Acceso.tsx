import { useState } from 'react'
import { Delete, Lock, ShieldCheck, UserRound } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import { EQUIPO_EMAIL, sb, useDatos } from '../lib/datos'
import type { Empleado, Perfil } from '../lib/types'
import { Avatar, Boton, cx, input } from '../ui'

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vino-600 bg-[radial-gradient(900px_500px_at_100%_0%,#B771A066,transparent_60%),radial-gradient(700px_400px_at_0%_100%,#3d001e,transparent_60%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="Tierra Nuestra" className="mx-auto h-12 w-auto" />
          <p className="mt-4 font-cond text-xs uppercase tracking-[0.35em] text-lila-200">Horarios del equipo</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setErr('')
    const { error } = await sb!.auth.signInWithPassword({ email: EQUIPO_EMAIL, password: pw.trim() })
    setCargando(false)
    if (error) setErr('Contraseña incorrecta o sin conexión')
  }
  return (
    <Marco>
      <form onSubmit={entrar} className="rounded-3xl bg-white p-7 text-zinc-800 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-2xl bg-vino-50 p-3 text-vino-600"><Lock size={22} /></span>
          <div><h1 className="text-lg font-semibold text-vino-900">Acceso del equipo</h1><p className="text-sm text-zinc-500">Solo la primera vez en cada móvil u ordenador</p></div>
        </div>
        <input autoFocus type="password" placeholder="Contraseña del equipo" value={pw} onChange={(e) => setPw(e.target.value)} className={cx(input, 'py-3 text-base')} />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <Boton type="submit" className="mt-4 w-full py-3 text-base" disabled={!pw || cargando}>{cargando ? 'Entrando…' : 'Entrar'}</Boton>
      </form>
    </Marco>
  )
}

export function SelectorPerfil({ onElegir }: { onElegir: (p: Perfil) => void }) {
  const { empleados, config } = useDatos()
  const [sel, setSel] = useState<Empleado | 'enc' | null>(null)
  const activos = empleados.filter((e) => e.activo).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  if (sel) {
    const pin = sel === 'enc' ? config.pin_encargado : sel.pin || ''
    return <Marco><TecladoPin nombre={sel === 'enc' ? 'Encargado/a' : sel.nombre} emp={sel === 'enc' ? undefined : sel} correcto={pin} onOk={() => onElegir(sel === 'enc' ? { rol: 'encargado' } : { rol: 'empleado', id: sel.id })} onVolver={() => setSel(null)} /></Marco>
  }
  return (
    <Marco>
      <h1 className="mb-4 text-center text-2xl font-semibold">¿Quién eres?</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {activos.map((e) => (
          <button key={e.id} onClick={() => setSel(e)} className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 p-4 backdrop-blur transition hover:bg-white/20">
            <Avatar emp={e} size={56} />
            <span className="w-full truncate text-sm font-medium">{e.nombre}</span>
            <span className="-mt-2 w-full truncate text-xs text-lila-200">{e.puesto}</span>
          </button>
        ))}
        {!activos.length && <p className="col-span-full text-center text-sm text-lila-100">Todavía no hay empleados. Entra como encargado/a para darlos de alta.</p>}
      </div>
      <button onClick={() => setSel('enc')} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-vino-700 shadow-xl transition hover:bg-vino-50">
        <ShieldCheck size={20} /> Entrar como encargado/a
      </button>
    </Marco>
  )
}

function TecladoPin({ nombre, emp, correcto, onOk, onVolver }: { nombre: string; emp?: Empleado; correcto: string; onOk: () => void; onVolver: () => void }) {
  const [v, setV] = useState('')
  const [mal, setMal] = useState(false)
  const largo = Math.max(4, correcto.length)
  const pulsar = (n: string) => {
    if (v.length >= largo) return
    const nv = v + n
    setV(nv); setMal(false)
    if (nv.length === largo) {
      if (nv === correcto) setTimeout(onOk, 120)
      else setTimeout(() => { setMal(true); setV('') }, 250)
    }
  }
  return (
    <div className="rounded-3xl bg-white p-7 text-center text-zinc-800 shadow-2xl">
      <div className="mb-2 flex justify-center">{emp ? <Avatar emp={emp} size={64} /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-lila-400 text-white"><UserRound size={30} /></span>}</div>
      <p className="font-semibold text-vino-900">{nombre}</p>
      <p className="text-sm text-zinc-500">Introduce tu PIN</p>
      <div className={cx('my-5 flex justify-center gap-3', mal && 'animate-[subir_.2s]')}>
        {Array.from({ length: largo }).map((_, i) => <span key={i} className={cx('h-4 w-4 rounded-full border-2', i < v.length ? 'border-vino-600 bg-vino-600' : mal ? 'border-red-400' : 'border-vino-200')} />)}
      </div>
      {mal && <p className="-mt-2 mb-3 text-sm text-red-600">PIN incorrecto</p>}
      <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => <Tecla key={n} onClick={() => pulsar(n)}>{n}</Tecla>)}
        <button onClick={onVolver} className="text-sm text-vino-700">Volver</button>
        <Tecla onClick={() => pulsar('0')}>0</Tecla>
        <button onClick={() => setV(v.slice(0, -1))} className="grid place-items-center text-vino-700" aria-label="Borrar"><Delete size={22} /></button>
      </div>
    </div>
  )
}
const Tecla = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="h-16 rounded-2xl bg-vino-50 text-2xl font-medium text-vino-800 transition active:scale-95 active:bg-vino-100">{children}</button>
)
