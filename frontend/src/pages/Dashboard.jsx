import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    CartesianGrid,
} from "recharts";
import { Wine, TrendingUp, Globe2, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const CATEGORY_COLORS = {
    tinto: "hsl(353 42% 42%)",
    blanco: "hsl(46 65% 62%)",
    rosado: "hsl(340 55% 68%)",
    espumoso: "hsl(45 85% 72%)",
    generoso: "hsl(30 55% 45%)",
    licor: "hsl(210 25% 45%)",
    otros: "hsl(0 0% 55%)",
};

const CAT_LABEL = {
    tinto: "Tintos",
    blanco: "Blancos",
    rosado: "Rosados",
    espumoso: "Espumosos",
    generoso: "Generosos",
    licor: "Licores",
    otros: "Otros",
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        setLoading(true);
        api.get("/products/stats")
            .then((r) => setStats(r.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !stats) {
        return (
            <div className="p-6 space-y-4">
                <div className="h-10 w-1/3 shimmer rounded" />
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 shimmer rounded-xl" />
                    ))}
                </div>
                <div className="h-72 shimmer rounded-xl" />
            </div>
        );
    }

    const byCat = stats.by_categoria
        .filter((c) => c.categoria && c.count > 0)
        .sort((a, b) => b.count - a.count);

    const kpis = [
        { label: "Referencias totales", value: stats.total, icon: Wine },
        {
            label: "Tintos",
            value: byCat.find((c) => c.categoria === "tinto")?.count || 0,
            icon: TrendingUp,
        },
        {
            label: "Denominaciones",
            value: stats.by_denominacion.length,
            icon: Sparkles,
        },
        {
            label: "Países origen",
            value: stats.by_pais.length,
            icon: Globe2,
        },
    ];

    return (
        <div className="p-5 sm:p-8 max-w-[1400px] mx-auto" data-testid="dashboard-page">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Dashboard comparativo</div>
                    <h1 className="font-display text-4xl sm:text-5xl mt-1 tracking-tight">
                        Hola, <span className="gold-underline">{user?.display_name}</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-2 max-w-xl">
                        Vista global del catálogo. Compara categorías, DO, precios y países de
                        un vistazo.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        data-testid="go-catalog-btn"
                        to="/catalogo"
                        className="btn-pill bg-primary text-primary-foreground border-primary hover:opacity-90"
                    >
                        Abrir buscador
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link data-testid="go-ai-btn" to="/ia" className="btn-pill">
                        <Sparkles className="h-4 w-4 text-accent" />
                        Sumiller IA
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 stagger-in">
                {kpis.map((k) => (
                    <div
                        key={k.label}
                        data-testid={`kpi-${k.label.replace(/\s/g, "-").toLowerCase()}`}
                        className="card-thin p-5 hover:border-primary/40 transition"
                    >
                        <div className="flex items-start justify-between">
                            <div className="overline">{k.label}</div>
                            <k.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 font-display text-4xl tracking-tight">
                            {k.value.toLocaleString("es-ES")}
                        </div>
                    </div>
                ))}
            </div>

            {/* BENTO */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 stagger-in">
                {/* BY CATEGORY */}
                <div className="card-thin p-5 md:col-span-2" data-testid="chart-category">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="overline">Distribución</div>
                            <h3 className="text-xl font-semibold">Por tipo de producto</h3>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer>
                            <BarChart data={byCat}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                />
                                <XAxis
                                    dataKey="categoria"
                                    tickFormatter={(v) => CAT_LABEL[v] || v}
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                    formatter={(value, name, props) => [value, "Productos"]}
                                    labelFormatter={(v) => CAT_LABEL[v] || v}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {byCat.map((c) => (
                                        <Cell
                                            key={c.categoria}
                                            fill={CATEGORY_COLORS[c.categoria] || "hsl(var(--primary))"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PIE */}
                <div className="card-thin p-5" data-testid="chart-pie">
                    <div className="overline">Mix</div>
                    <h3 className="text-xl font-semibold">Participación</h3>
                    <div className="h-72 mt-2">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={byCat}
                                    dataKey="count"
                                    nameKey="categoria"
                                    innerRadius={50}
                                    outerRadius={85}
                                    paddingAngle={2}
                                >
                                    {byCat.map((c) => (
                                        <Cell
                                            key={c.categoria}
                                            fill={CATEGORY_COLORS[c.categoria] || "hsl(var(--primary))"}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                    formatter={(value, name) => [value, CAT_LABEL[name] || name]}
                                />
                                <Legend
                                    formatter={(v) => CAT_LABEL[v] || v}
                                    wrapperStyle={{ fontSize: 11 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TOP DENOM */}
                <div className="card-thin p-5 md:col-span-2" data-testid="chart-denom">
                    <div className="overline">Top 10</div>
                    <h3 className="text-xl font-semibold">Denominaciones de Origen</h3>
                    <div className="h-80 mt-4">
                        <ResponsiveContainer>
                            <BarChart
                                data={stats.by_denominacion}
                                layout="vertical"
                                margin={{ left: 0 }}
                            >
                                <CartesianGrid
                                    horizontal={false}
                                    stroke="hsl(var(--border))"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    type="number"
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="denominacion"
                                    type="category"
                                    width={180}
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="hsl(var(--primary))"
                                    radius={[0, 6, 6, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PRICE BUCKETS */}
                <div className="card-thin p-5" data-testid="chart-price">
                    <div className="overline">Rangos</div>
                    <h3 className="text-xl font-semibold">Precios PVP Tienda</h3>
                    <div className="mt-4 space-y-2">
                        {stats.price_buckets.map((b, i) => {
                            const max = Math.max(...stats.price_buckets.map((x) => x.count));
                            const w = (b.count / max) * 100;
                            const label = priceBucketLabel(b.range);
                            return (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 text-xs"
                                    data-testid={`price-bucket-${i}`}
                                >
                                    <div className="w-24 text-muted-foreground">{label}</div>
                                    <div className="flex-1 h-6 bg-muted/60 rounded overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                                            style={{ width: `${w}%` }}
                                        />
                                    </div>
                                    <div className="w-10 text-right font-semibold">{b.count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function priceBucketLabel(range) {
    const map = {
        "0": "0-5 €",
        "5": "5-10 €",
        "10": "10-20 €",
        "20": "20-30 €",
        "30": "30-50 €",
        "50": "50-100 €",
        "100": "100-200 €",
        "200": "200+ €",
    };
    return map[range] || range;
}
