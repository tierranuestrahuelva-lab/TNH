import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { AYUDA_UBICACION, comprobarUbicacion, esIOS } from '../lib/geo'
import { cx } from '../ui'

/** Comprobar la ubicación y cómo activarla en iPhone / Android */
export default function AyudaUbicacion({ error }: { error?: string | null }) {
  const [res, setRes] = useState<{ ok: boolean; texto: string } | null>(null)
  const [mirando, setMirando] = useState(false)
  const [so, setSo] = useState<'iphone' | 'android'>(() => (esIOS() ? 'iphone' : 'android'))
  const [abierta, setAbierta] = useState(!!error)
  const mal = (res && !res.ok) || (!res && !!error)
  const comprobar = async () => { setMirando(true); const r = await comprobarUbicacion(); setRes(r); setMirando(false); if (!r.ok) setAbierta(true) }
  return (
    <div className={cx('rounded-2xl border p-4 text-sm shadow-suave', mal ? 'border-amber-200 bg-amber-50' : 'border-vino-100 bg-white')}>
      <div className="flex flex-wrap items-center gap-3">
        <MapPin size={18} className={mal ? 'text-amber-700' : 'text-vino-600'} />
        <p className="min-w-0 flex-1 basis-48 text-zinc-700">
          {res ? <b className={res.ok ? 'text-emerald-700' : 'text-amber-800'}>{res.texto}</b>
            : error ? <b className="text-amber-800">Tu último fichaje se guardó sin ubicación exacta ({error.toLowerCase()}).</b>
            : 'Tu puesto guarda la ubicación al fichar. Comprueba que tu móvil la da bien.'}
        </p>
        <button onClick={comprobar} disabled={mirando} className="w-full rounded-xl bg-vino-600 px-4 py-2 font-semibold text-white disabled:opacity-60 sm:w-auto">{mirando ? 'Comprobando…' : 'Comprobar mi ubicación'}</button>
      </div>
      <button onClick={() => setAbierta(!abierta)} className="mt-2 text-xs font-medium text-vino-700 underline">{abierta ? 'Ocultar cómo activarla' : 'Cómo activar la ubicación'}</button>
      {abierta && (
        <div className="mt-3">
          <div className="mb-2 flex gap-2">
            {(['iphone', 'android'] as const).map((k) => <button key={k} onClick={() => setSo(k)} className={cx('rounded-full border px-3 py-1 text-xs font-medium', so === k ? 'border-vino-600 bg-vino-600 text-white' : 'border-vino-100 bg-white text-vino-700')}>{k === 'iphone' ? 'iPhone' : 'Android'}</button>)}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-zinc-700">{AYUDA_UBICACION[so].map((p) => <li key={p}>{p}</li>)}</ol>
        </div>
      )}
    </div>
  )
}
