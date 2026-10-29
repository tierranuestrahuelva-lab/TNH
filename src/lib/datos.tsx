import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config, Empleado, Fichaje, Solicitud, Turno } from './types'
import { CONFIG_BASE } from './config'
import { sumarDias, hoy } from './fechas'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const EQUIPO_EMAIL = (import.meta.env.VITE_EQUIPO_EMAIL as string | undefined) || ''
export const sb: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'tn-horarios-auth' } }) : null
export const MODO_NUBE = !!sb

type Tabla = 'empleados' | 'turnos' | 'fichajes' | 'solicitudes'
const T: Record<Tabla | 'config', string> = { empleados: 'hor_empleados', turnos: 'hor_turnos', fichajes: 'hor_fichajes', solicitudes: 'hor_solicitudes', config: 'hor_config' }
type Op = { op: 'up' | 'del'; tabla: Tabla | 'config'; fila?: any; ids?: string[] }

export interface Estado { empleados: Empleado[]; turnos: Turno[]; fichajes: Fichaje[]; solicitudes: Solicitud[]; config: Config }
const VACIO: Estado = { empleados: [], turnos: [], fichajes: [], solicitudes: [], config: CONFIG_BASE }
const K_CACHE = 'tn-hor-cache', K_COLA = 'tn-hor-cola'

const leer = <X,>(k: string, d: X): X => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
export const turnoId = (emp: string, fecha: string) => `${emp}_${fecha}`

async function traerTodo(tabla: string, filtro?: (q: any) => any) {
  const filas: any[] = []
  for (let desde = 0; ; desde += 1000) {
    let q = sb!.from(tabla).select('*').range(desde, desde + 999)
    if (filtro) q = filtro(q)
    const { data, error } = await q
    if (error) throw error
    filas.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return filas
}

interface Ctx extends Estado {
  cargando: boolean
  sync: 'ok' | 'pendiente' | 'error' | 'local'
  pendientes: number
  recargar: () => Promise<void>
  guardar: (tabla: Tabla, filas: any | any[]) => void
  borrar: (tabla: Tabla, ids: string | string[]) => void
  guardarConfig: (c: Partial<Config>) => void
}
const C = createContext<Ctx>(null as any)
export const useDatos = () => useContext(C)

function aplicar(e: Estado, tabla: Tabla, filas: any[], borrar = false): Estado {
  const ids = new Set(filas.map((f) => f.id))
  const resto = (e[tabla] as any[]).filter((x) => !ids.has(x.id))
  return { ...e, [tabla]: borrar ? resto : [...resto, ...filas] }
}

export function DatosProvider({ children, activo }: { children: ReactNode; activo: boolean }) {
  const [est, setEst] = useState<Estado>(() => ({ ...VACIO, ...leer(K_CACHE, {}) }))
  const [cargando, setCargando] = useState(true)
  const [cola, setCola] = useState<Op[]>(() => leer(K_COLA, []))
  const [error, setError] = useState(false)
  const colaRef = useRef(cola)
  colaRef.current = cola

  useEffect(() => { localStorage.setItem(K_CACHE, JSON.stringify(est)) }, [est])
  useEffect(() => { localStorage.setItem(K_COLA, JSON.stringify(cola)) }, [cola])

  const recargar = useCallback(async () => {
    if (!sb) { setCargando(false); return }
    try {
      const desde = sumarDias(hoy(), -400)
      const [empleados, turnos, fichajes, solicitudes, cfg] = await Promise.all([
        traerTodo(T.empleados),
        traerTodo(T.turnos, (q) => q.gte('fecha', desde)),
        traerTodo(T.fichajes, (q) => q.gte('ts', desde)),
        traerTodo(T.solicitudes),
        traerTodo(T.config),
      ])
      const c = cfg.find((x) => x.clave === 'config')?.valor
      setEst({ empleados, turnos, fichajes, solicitudes, config: { ...CONFIG_BASE, ...(c || {}) } })
      setError(false)
    } catch (e) { console.error(e); setError(true) }
    setCargando(false)
  }, [])

  const vaciarCola = useCallback(async () => {
    if (!sb) return
    while (colaRef.current.length) {
      const op = colaRef.current[0]
      const q = op.op === 'up' ? sb.from(T[op.tabla]).upsert(op.fila) : sb.from(T[op.tabla]).delete().in('id', op.ids!)
      const { error } = await q
      if (error) { console.error(error); setError(true); return }
      colaRef.current = colaRef.current.slice(1)
      setCola(colaRef.current)
    }
    setError(false)
  }, [])

  const encolar = useCallback((op: Op) => {
    colaRef.current = [...colaRef.current, op]
    setCola(colaRef.current)
    vaciarCola()
  }, [vaciarCola])

  useEffect(() => {
    if (!activo) return
    recargar().then(vaciarCola)
    if (!sb) return
    const canal = sb.channel('horarios')
    for (const tabla of ['empleados', 'turnos', 'fichajes', 'solicitudes'] as Tabla[]) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: T[tabla] }, (p: any) => {
        if (p.eventType === 'DELETE') setEst((e) => aplicar(e, tabla, [p.old], true))
        else setEst((e) => aplicar(e, tabla, [p.new]))
      })
    }
    canal.on('postgres_changes', { event: '*', schema: 'public', table: T.config }, (p: any) => {
      if (p.new?.clave === 'config') setEst((e) => ({ ...e, config: { ...CONFIG_BASE, ...p.new.valor } }))
    })
    canal.subscribe()
    const vis = () => { if (document.visibilityState === 'visible') vaciarCola().then(recargar) }
    const online = () => vaciarCola()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('online', online)
    const iv = setInterval(() => { if (colaRef.current.length) vaciarCola() }, 15000)
    return () => { sb!.removeChannel(canal); document.removeEventListener('visibilitychange', vis); window.removeEventListener('online', online); clearInterval(iv) }
  }, [activo, recargar, vaciarCola])

  const guardar = useCallback((tabla: Tabla, f: any | any[]) => {
    const filas = Array.isArray(f) ? f : [f]
    if (!filas.length) return
    setEst((e) => aplicar(e, tabla, filas))
    if (sb) encolar({ op: 'up', tabla, fila: filas })
  }, [encolar])

  const borrar = useCallback((tabla: Tabla, i: string | string[]) => {
    const ids = Array.isArray(i) ? i : [i]
    if (!ids.length) return
    setEst((e) => aplicar(e, tabla, ids.map((id) => ({ id })), true))
    if (sb) encolar({ op: 'del', tabla, ids })
  }, [encolar])

  const guardarConfig = useCallback((c: Partial<Config>) => {
    setEst((e) => {
      const config = { ...e.config, ...c }
      if (sb) setTimeout(() => encolar({ op: 'up', tabla: 'config', fila: { clave: 'config', valor: config, updated_at: new Date().toISOString() } }))
      return { ...e, config }
    })
  }, [encolar])

  const valor = useMemo<Ctx>(() => ({
    ...est, cargando, recargar, guardar, borrar, guardarConfig, pendientes: cola.length,
    sync: !sb ? 'local' : error ? 'error' : cola.length ? 'pendiente' : 'ok',
  }), [est, cargando, recargar, guardar, borrar, guardarConfig, cola.length, error])

  return <C.Provider value={valor}>{children}</C.Provider>
}
