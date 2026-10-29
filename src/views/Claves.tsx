import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { sb, useDatos } from '../lib/datos'
import type { Empleado } from '../lib/types'
import { toast } from '../lib/toast'
import { Boton, Campo, Modal, cx, input } from '../ui'

const soloNum = (v: string) => v.replace(/\D/g, '').slice(0, 6)

export function CambiarPin({ emp, onCerrar }: { emp?: Empleado; onCerrar: () => void }) {
  const { config, guardar, guardarConfig } = useDatos()
  const [act, setAct] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [rep, setRep] = useState('')
  const pinActual = emp ? emp.pin || '' : config.pin_encargado
  const error = act && act !== pinActual ? 'El PIN actual no es correcto' : nuevo && nuevo.length < 4 ? 'Mínimo 4 cifras' : rep && rep !== nuevo ? 'Los PIN nuevos no coinciden' : ''
  const ok = act === pinActual && nuevo.length >= 4 && nuevo === rep
  const cambiar = () => {
    if (emp) guardar('empleados', { ...emp, pin: nuevo })
    else guardarConfig({ pin_encargado: nuevo })
    toast('PIN cambiado')
    onCerrar()
  }
  const campo = (v: string, set: (s: string) => void, auto?: boolean) => <input autoFocus={auto} type="password" inputMode="numeric" maxLength={6} className={cx(input, 'tabular tracking-[0.4em] text-lg')} value={v} onChange={(e) => set(soloNum(e.target.value))} />
  return (
    <Modal abierto onCerrar={onCerrar} titulo={emp ? 'Cambiar mi PIN' : 'Cambiar PIN del encargado/a'} pie={<><Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton><Boton disabled={!ok} onClick={cambiar}>Guardar PIN</Boton></>}>
      <div className="space-y-4">
        <Campo label="PIN actual">{campo(act, setAct, true)}</Campo>
        <Campo label="PIN nuevo (4 a 6 cifras)">{campo(nuevo, setNuevo)}</Campo>
        <Campo label="Repite el PIN nuevo">{campo(rep, setRep)}</Campo>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

export function ClaveEquipo() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [enviando, setEnviando] = useState(false)
  const error = a && a.length < 8 ? 'Mínimo 8 caracteres' : b && a !== b ? 'No coinciden' : ''
  const cambiar = async () => {
    if (!sb) return
    setEnviando(true)
    const { error } = await sb.auth.updateUser({ password: a })
    setEnviando(false)
    if (error) return toast('No se pudo cambiar: ' + (error.message.includes('different') ? 'tiene que ser distinta de la actual' : 'revisa la conexión'))
    setA(''); setB('')
    toast('Contraseña del equipo cambiada')
  }
  if (!sb) return null
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Es la contraseña que se pide al abrir la app por primera vez en cada móvil. Los móviles que ya están dentro siguen funcionando; los nuevos tendrán que usar la nueva.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nueva contraseña"><input type="password" autoComplete="new-password" className={input} value={a} onChange={(e) => setA(e.target.value)} /></Campo>
        <Campo label="Repítela"><input type="password" autoComplete="new-password" className={input} value={b} onChange={(e) => setB(e.target.value)} /></Campo>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Boton disabled={a.length < 8 || a !== b || enviando} onClick={cambiar}><KeyRound size={16} />{enviando ? 'Cambiando…' : 'Cambiar contraseña del equipo'}</Boton>
    </div>
  )
}
