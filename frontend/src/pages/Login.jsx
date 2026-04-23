import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Wine, Lock, User, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const SOMMELIER_BG =
    "https://images.unsplash.com/photo-1773113634646-953447d509d9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwyfHx3aW5lJTIwY2VsbGFyJTIwZGFyayUyMG1vb2R5fGVufDB8fHx8MTc3Njk2NDAyNHww&ixlib=rb-4.1.0&q=85";

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
            toast.success("Bienvenido a TNH — Lo Más Pro");
            nav("/dashboard");
        } catch (err) {
            setError(err?.response?.data?.detail || "Error al iniciar sesión");
        }
    };

    const quick = (u) => {
        setUsername(u);
        // prefill hint password to help during demo: user can overwrite
        setPassword(`${u}2026`);
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
            {/* LEFT: image + quote */}
            <div
                className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden"
                style={{
                    backgroundImage: `linear-gradient(120deg, rgba(10,9,9,0.72) 0%, rgba(114,47,55,0.55) 100%), url(${SOMMELIER_BG})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="text-white/90">
                    <div className="overline text-white/60">Tierra Nuestra Huelva</div>
                    <div className="flex items-center gap-2 mt-2">
                        <Wine className="h-5 w-5 text-accent" />
                        <span className="font-display text-xl text-white">Lo Más Pro</span>
                    </div>
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <h2 className="font-display text-5xl xl:text-6xl leading-[0.95] tracking-tight">
                        El catálogo profesional
                        <br />
                        de <span className="gold-underline">nuestros vinos</span>.
                    </h2>
                    <p className="mt-6 text-white/70 text-sm leading-relaxed">
                        Buscador potente, escaneo por cámara, carrito comercial con envío a
                        e-mail y WhatsApp, y un Sumiller IA (Claude Sonnet 4.5) para potenciar
                        cada venta.
                    </p>
                    <div className="mt-8 flex items-center gap-4 text-xs text-white/50">
                        <span>1 586 referencias</span>
                        <span>·</span>
                        <span>4 tarifas</span>
                        <span>·</span>
                        <span>IA de ventas</span>
                    </div>
                </div>

                <div className="text-xs text-white/40">
                    tnh@tierranuestrahuelva.es · +34 699 414 559
                </div>
            </div>

            {/* RIGHT: form */}
            <div className="flex items-center justify-center p-6 sm:p-10 relative">
                <div className="w-full max-w-md fade-in">
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <Wine className="h-5 w-5 text-primary" />
                        <span className="font-display text-xl">TNH · Lo Más Pro</span>
                    </div>

                    <div className="overline">Acceso equipo comercial</div>
                    <h1 className="font-display text-4xl sm:text-5xl mt-2 tracking-tight">
                        Bienvenido de vuelta
                    </h1>
                    <p className="mt-2 text-muted-foreground text-sm">
                        Selecciona tu perfil y entra al buscador.
                    </p>

                    {/* Quick select */}
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
                                <div className="font-semibold">{u.label}</div>
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
                        Acceso restringido al equipo de Tierra Nuestra Huelva. Cada uno tiene
                        su propio perfil y pedidos guardados en la nube.
                    </div>
                </div>
            </div>
        </div>
    );
}
