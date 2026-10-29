import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export const toast = (texto: string) => window.dispatchEvent(new CustomEvent('tn-toast', { detail: texto }))

export function Toasts() {
  const [l, setL] = useState<{ id: number; t: string }[]>([])
  useEffect(() => {
    const f = (e: Event) => {
      const id = Date.now() + Math.random()
      setL((x) => [...x, { id, t: (e as CustomEvent).detail }])
      setTimeout(() => setL((x) => x.filter((y) => y.id !== id)), 2600)
    }
    window.addEventListener('tn-toast', f)
    return () => window.removeEventListener('tn-toast', f)
  }, [])
  return (
    <div className="pointer-events-none fixed bottom-24 lg:bottom-6 left-1/2 z-[60] -translate-x-1/2 space-y-2 no-print">
      {l.map((x) => (
        <div key={x.id} className="animate-subir flex items-center gap-2 rounded-full bg-vino-900 px-4 py-2 text-sm text-white shadow-xl"><CheckCircle2 size={16} className="text-lila-300" />{x.t}</div>
      ))}
    </div>
  )
}
