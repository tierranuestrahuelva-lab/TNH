import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Lock, User, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const STORE_BG = "/brand/store-verano.webp";
const LOGO = "/brand/logo.webp";

const USERS = [
    { username: "fernando", label: "Fernando", hint: "Comercial" },
    { username: "ernesto", label: "Ernesto", hint: "Comercial" },
    { username: "tienda", label: "Tienda", hint: "Punto de venta" },
];

export default function Login() {
    const { user, login, loading } = useAuth();
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (user) return <Navigate to="/dashboard" replace />;

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await login(username.trim().toLowerCase(), password);
            toast.success("Bienvenido a Tierra Nuestra");
            nav("/dashboard");
        } catch (err) {
            setError(err?.response?.data?.detail || "Error al iniciar sesión");
        }
    };

    const quick = (u) => {
        setUsername(u);
        setPassword(`${u}2026`);
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
            {/* LEFT: real store photo + brand */}
            <div
                className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden"
                style={{
                    backgroundImage: `linear-gradient(135deg, rgba(22,6,12,0.55) 0%, rgba(141,4,68,0.65) 65%, rgba(90,2,43,0.75) 100%), url(${STORE_BG})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="text-white flex items-center gap-3">
                    <img src={LOGO} alt="Tierra Nuestra" className="h-10 w-auto brightness-0 invert" />
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <div className="overline text-white/60 mb-3">Lo Más Pro · v1.1</div>
                    <h2 className="font-display text-5xl xl:text-6xl leading-[0.95] tracking-tight">
                        Tu buscador
                        <br />
                        <span className="gold-underline">profesional</span> de vinos.
                    </h2>
                    <p className="mt-6 text-white/75 text-sm leading-relaxed max-w-md">
                        1 586 referencias. Filtros avanzados. Escáner de cámara. Sumiller IA con
                        acceso a internet y memoria de tus clientes. Pedidos directos por
                        e-mail y WhatsApp.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-2 text-[11px] text-white/70">
                        <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20">
                            ⭐ Precio/Calidad
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20">
                            🏆 Top ventas 2026
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20">
                            ECO · VEG · BIO
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Claude Sonnet 4.5
                        </span>
                    </div>
                </div>

                <div className="text-xs text-white/50">
                    tnh@tierranuestrahuelva.es · +34 699 414 559 · tierranuestra.es
                </div>
            </div>

            {/* RIGHT: form */}
            <div className="flex items-center justify-center p-6 sm:p-10 relative">
                <div className="w-full max-w-md fade-in">
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <img src={LOGO} alt="Tierra Nuestra" className="h-8 w-auto" />
                    </div>

                    <div className="overline">Acceso equipo comercial</div>
                    <h1 className="font-display text-4xl sm:text-5xl mt-2 tracking-tight">
                        Bienvenido de vuelta
                    </h1>
                    <p className="mt-2 text-muted-foreground text-sm">
                        Selecciona tu perfil y entra al buscador.
                    </p>

                    <div className="mt-7 grid grid-cols-3 gap-2" data-testid="quick-user-grid">
                        {USERS.map((u) => (
                            <button
                                key={u.username}
                                type="button"
                                data-testid={`quick-user-${u.username}`}
                                onClick={() => quick(u.username)}
                                className={`card-thin text-left px-3 py-3 transition hover:border-primary hover:shadow-sm ${
                                    username === u.username ? "border-primary ring-1 ring-primary" : ""
                                }`}
                            >
                                <div className="font-semibold font-brand">{u.label}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {u.hint}
                                </div>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div>
                            <label className="overline block mb-1.5">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    data-testid="login-username-input"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-input text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="fernando / ernesto / tienda"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="overline block mb-1.5">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    data-testid="login-password-input"
                                    type="password"
                                    autoComplete="current-password"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-input text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-destructive" data-testid="login-error">
                                {error}
                            </div>
                        )}

                        <button
                            data-testid="login-submit-button"
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold tracking-wide hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Entrar al catálogo
                        </button>
                    </form>

                    <div className="mt-6 text-[11px] text-muted-foreground/80 leading-relaxed">
                        Acceso restringido al equipo de Tierra Nuestra Huelva. Cada comercial
                        tiene su propio perfil, su carrito y su memoria de clientes en la IA.
                    </div>
                </div>
            </div>
        </div>
    );
}
