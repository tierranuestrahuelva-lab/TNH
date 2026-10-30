import { CheckCircle2, Printer, ShieldCheck } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import { useDatos } from '../lib/datos'
import { useIndices } from '../lib/usar'
import type { Empleado } from '../lib/types'
import { toast } from '../lib/toast'
import { Avatar, Boton, Tarjeta } from '../ui'

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Privacidad({ emp }: { emp?: Empleado }) {
  const { config, guardar } = useDatos()
  const ix = useIndices()
  const leido = () => { guardar('empleados', { ...emp!, privacidad_at: new Date().toISOString() }); toast('Gracias, queda registrado') }
  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-cond text-xs uppercase tracking-[0.2em] text-lila-500">Información para el equipo</p><h1 className="text-2xl font-semibold text-vino-900 sm:text-3xl">Protección de datos</h1></div>
        <Boton tipo="secundario" onClick={() => window.print()}><Printer size={16} />Imprimir para firmar</Boton>
      </div>

      {!emp && (
        <Tarjeta titulo="¿Quién lo ha leído en la app?" className="no-print">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ix.activos.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-vino-50/50 px-3 py-2 text-sm">
                <Avatar emp={e} size={28} /><span className="flex-1 truncate">{e.nombre}</span>
                {e.privacidad_at ? <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={14} />{fecha(e.privacidad_at)}</span> : <span className="text-xs font-medium text-amber-700">Pendiente</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">Cada empleado lo lee desde su móvil y pulsa «He leído la información». Además, conviene imprimirlo y que lo firme: guarda la copia firmada.</p>
        </Tarjeta>
      )}

      <article className="print-plano mx-auto max-w-3xl overflow-hidden rounded-2xl border border-vino-100/60 bg-white shadow-suave">
        <header className="flex items-center justify-between gap-4 bg-vino-600 px-6 py-4 text-white">
          <img src={logo} className="h-8" alt="Tierra Nuestra" />
          <p className="text-right text-sm font-semibold leading-tight">Información sobre el tratamiento de datos<br /><span className="font-normal">Registro de jornada y gestión de horarios</span></p>
        </header>
        <div className="space-y-4 px-6 py-6 text-[14px] leading-relaxed text-zinc-800 [&_h2]:font-cond [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-vino-700">
          <p>En cumplimiento del Reglamento General de Protección de Datos (RGPD, UE 2016/679) y de la Ley Orgánica 3/2018 (LOPDGDD), te informamos de cómo tratamos tus datos en la aplicación de horarios y registro de jornada.</p>
          <section><h2>Responsable</h2><p>{config.empresa}. CIF {config.cif}. {config.domicilio}. Contacto: {config.email_privacidad}.</p></section>
          <section><h2>Qué datos tratamos</h2><p>Nombre, puesto, centro de trabajo, jornada contratada, teléfono y correo (si los facilitas), los turnos asignados, las horas de entrada, pausa y salida que registras, las correcciones de esos registros y las solicitudes de vacaciones o permisos. En caso de baja solo se anota el periodo, nunca el diagnóstico. <b>La aplicación no usa tu ubicación, ni la cámara, ni datos biométricos.</b></p></section>
          <section><h2>Para qué y con qué base legal</h2><p>Para cumplir la obligación legal de registrar la jornada diaria (art. 34.9 del Estatuto de los Trabajadores) y para organizar los horarios, descansos, vacaciones y permisos derivados de tu contrato de trabajo (art. 6.1.b y 6.1.c del RGPD). No se usan para otros fines.</p></section>
          <section><h2>Cuánto tiempo</h2><p>Los registros de jornada se conservan <b>cuatro años</b>, como exige la ley. El resto de datos se conservan mientras dure la relación laboral y, después, durante los plazos legales de prescripción.</p></section>
          <section><h2>Quién puede verlos</h2><p>La dirección y los encargados de la empresa; tú mismo/a; tus representantes legales y la Inspección de Trabajo cuando lo soliciten; y la asesoría laboral de la empresa. Los datos se alojan en servidores de Supabase situados en la Unión Europea (Irlanda), que actúa como encargado del tratamiento. No se ceden a terceros salvo obligación legal.</p></section>
          <section><h2>Cómo funciona el registro</h2><p>Cada fichaje guarda la hora y la hora en que llegó al servidor. Si un fichaje se corrige, se conserva la hora original, el motivo y la fecha de la corrección. Los fichajes no se borran: si hay un error, se anulan dejando constancia. Puedes consultar en cualquier momento tu propio registro en la app («Mi registro») e imprimirlo.</p></section>
          <section><h2>Uso del móvil y desconexión digital</h2><p>Si prefieres no usar tu móvil personal, puedes fichar desde el dispositivo de la tienda. La app solo se usa para fichar y consultar tu horario. No tienes que atenderla fuera de tu jornada (art. 88 LOPDGDD).</p></section>
          <section><h2>Tus derechos</h2><p>Puedes pedir el acceso, la rectificación, la supresión, la limitación, la oposición o la portabilidad de tus datos escribiendo a {config.email_privacidad} o en persona en la tienda. Si crees que no se han respetado tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</p></section>

          <div className="solo-print mt-10 grid grid-cols-2 gap-12 pt-6 text-sm">
            <div><p>Recibí y leí, en Huelva, a ____ de ____________ de 20___</p><p className="mt-8">Nombre: {emp?.nombre || '______________________________'}</p><p className="mt-3">DNI: ____________________</p></div>
            <div className="self-end border-t border-zinc-400 pt-2">Firma del trabajador/a</div>
          </div>
        </div>
      </article>

      {emp && (
        <div className="no-print mx-auto flex max-w-3xl justify-center">
          {emp.privacidad_at
            ? <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={18} />Leído el {fecha(emp.privacidad_at)}</p>
            : <Boton onClick={leido} className="w-full sm:w-auto"><ShieldCheck size={18} />He leído la información</Boton>}
        </div>
      )}
      <p className="no-print mx-auto max-w-3xl text-center text-xs text-zinc-400">Texto informativo orientativo. Conviene que la asesoría laboral lo revise.</p>
    </div>
  )
}
