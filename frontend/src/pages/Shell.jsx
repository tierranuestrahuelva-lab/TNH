import { Outlet, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Wine,
    ScrollText,
    Sparkles,
    LogOut,
    Sun,
    Moon,
    ShoppingBag,
    User,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import CartSheet from "@/components/CartSheet";

export default function Shell() {
    const { theme, toggle } = useTheme();
    const { user, logout } = useAuth();
    const { items, setOpen } = useCart();
    const nav = useNavigate();
    const loc = useLocation();

    const nav_items = [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/catalogo", label: "Catálogo", icon: Wine },
        { to: "/pedidos", label: "Pedidos", icon: ScrollText },
        { to: "/ia", label: "Sumiller IA", icon: Sparkles },
    ];

    const doLogout = () => {
        logout();
        nav("/login");
    };

    return (
        <div className="app-shell flex min-h-screen bg-background text-foreground">
            {/* SIDEBAR */}
            <aside
                data-testid="sidebar"
                className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur relative z-10"
            >
                <div className="px-6 py-6 border-b border-border">
                    <img
                        src="/brand/logo.webp"
                        alt="Tierra Nuestra"
                        className="h-12 w-auto dark:brightness-0 dark:invert"
                    />
                    <div className="mt-2 text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
                        Lo Más Pro · v1.1
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {nav_items.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-foreground/80 hover:bg-muted/70 hover:text-foreground"
                                }`
                            }
                        >
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border space-y-3">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/50">
                        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                            {user?.display_name?.[0] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                                {user?.display_name || user?.username}
                            </div>
                            <div className="text-[11px] text-muted-foreground capitalize">
                                {user?.role}
                            </div>
                        </div>
                        <button
                            data-testid="logout-btn"
                            onClick={doLogout}
                            className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition"
                            title="Cerrar sesión"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* TOPBAR */}
                <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
                    <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                        {/* Mobile brand */}
                        <div className="lg:hidden flex items-center gap-2">
                            <img
                                src="/brand/logo.webp"
                                alt="Tierra Nuestra"
                                className="h-7 w-auto dark:brightness-0 dark:invert"
                            />
                        </div>

                        {/* Path breadcrumb (desktop) */}
                        <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="overline">Vista</span>
                            <span className="text-foreground font-medium">
                                {
                                    {
                                        "/dashboard": "Dashboard",
                                        "/catalogo": "Catálogo",
                                        "/pedidos": "Pedidos",
                                        "/ia": "Sumiller IA",
                                    }[loc.pathname] || "Dashboard"
                                }
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                data-testid="theme-toggle"
                                onClick={toggle}
                                className="btn-pill !px-3 !py-2"
                                title="Cambiar tema"
                            >
                                {theme === "dark" ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {theme === "dark" ? "Claro" : "Oscuro"}
                                </span>
                            </button>

                            <button
                                data-testid="open-cart-btn"
                                onClick={() => setOpen(true)}
                                className="btn-pill !px-3 !py-2 relative"
                                title="Carrito"
                            >
                                <ShoppingBag className="h-4 w-4" />
                                <span className="hidden sm:inline">Carrito</span>
                                {items.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold h-5 min-w-5 px-1 rounded-full flex items-center justify-center">
                                        {items.reduce((s, i) => s + i.cantidad, 0)}
                                    </span>
                                )}
                            </button>

                            <div className="lg:hidden">
                                <button
                                    onClick={doLogout}
                                    data-testid="logout-btn-mobile"
                                    className="btn-pill !px-3 !py-2"
                                    title="Salir"
                                >
                                    <User className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile quick nav */}
                    <div className="lg:hidden flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
                        {nav_items.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                data-testid={`nav-mobile-${label.toLowerCase().replace(/\s/g, "-")}`}
                                className={({ isActive }) =>
                                    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground/80"
                                    }`
                                }
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </header>

                {/* CONTENT */}
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>

            <CartSheet />
        </div>
    );
}
