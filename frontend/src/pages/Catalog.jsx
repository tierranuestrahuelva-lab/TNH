import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
    Search,
    SlidersHorizontal,
    Camera,
    X,
    Plus,
    Wine,
    Grape,
    MapPin,
    Building2,
    Share2,
    ChevronRight,
    Eye,
    Euro,
} from "lucide-react";
import { api } from "@/lib/api";
import { useCart, TARIFAS } from "@/lib/cart";
import { toast } from "sonner";
import BarcodeScanner from "@/components/BarcodeScanner";
import ProductModal from "@/components/ProductModal";

const QUICK_CATS = [
    { key: "tinto", label: "Tinto", color: "bg-[#7a2d36] text-white" },
    { key: "blanco", label: "Blanco", color: "bg-[#e6d59b] text-[#4a3e26]" },
    { key: "rosado", label: "Rosado", color: "bg-[#e8a7b7] text-[#5a1f2b]" },
    { key: "espumoso", label: "Espumoso", color: "bg-[#f6e9b0] text-[#5a4214]" },
    { key: "generoso", label: "Generoso", color: "bg-[#b98b3f] text-white" },
    { key: "licor", label: "Licor", color: "bg-[#2e3a4a] text-white" },
];

export default function Catalog() {
    const [filters, setFilters] = useState(null);
    const [q, setQ] = useState("");
    const [selectedCats, setSelectedCats] = useState([]);
    const [denom, setDenom] = useState("");
    const [zona, setZona] = useState("");
    const [pais, setPais] = useState("");
    const [bodega, setBodega] = useState("");
    const [variedad, setVariedad] = useState("");
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(1000);
    const [sort, setSort] = useState("nombre");
    const [page, setPage] = useState(1);
    const [perPage] = useState(30);

    const [data, setData] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [sideOpen, setSideOpen] = useState(true);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    const { add, tarifa } = useCart();
    const debounceRef = useRef(null);

    // Load filters once
    useEffect(() => {
        api.get("/products/filters").then((r) => {
            setFilters(r.data);
            setMinPrice(Math.floor(r.data.price_min));
            setMaxPrice(Math.ceil(r.data.price_max));
        });
    }, []);

    // Fetch products
    const fetchProducts = useCallback(() => {
        setLoading(true);
        const params = {
            q: q || undefined,
            categoria: selectedCats.length ? selectedCats.join(",") : undefined,
            denominacion: denom || undefined,
            zona: zona || undefined,
            pais: pais || undefined,
            bodega: bodega || undefined,
            variedad: variedad || undefined,
            min_price: minPrice || undefined,
            max_price: maxPrice || undefined,
            sort,
            page,
            per_page: perPage,
        };
        api.get("/products", { params })
            .then((r) => setData(r.data))
            .finally(() => setLoading(false));
    }, [q, selectedCats, denom, zona, pais, bodega, variedad, minPrice, maxPrice, sort, page, perPage]);

    useEffect(() => {
        // debounce search
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchProducts(), 250);
        return () => clearTimeout(debounceRef.current);
    }, [fetchProducts]);

    const toggleCat = (k) => {
        setPage(1);
        setSelectedCats((prev) =>
            prev.includes(k) ? prev.filter((c) => c !== k) : [...prev, k]
        );
    };

    const clearFilters = () => {
        setQ("");
        setSelectedCats([]);
        setDenom("");
        setZona("");
        setPais("");
        setBodega("");
        setVariedad("");
        if (filters) {
            setMinPrice(Math.floor(filters.price_min));
            setMaxPrice(Math.ceil(filters.price_max));
        }
        setPage(1);
    };

    const activeFiltersCount =
        (q ? 1 : 0) +
        selectedCats.length +
        (denom ? 1 : 0) +
        (zona ? 1 : 0) +
        (pais ? 1 : 0) +
        (bodega ? 1 : 0) +
        (variedad ? 1 : 0);

    const onScanned = async (code) => {
        setScannerOpen(false);
        try {
            const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
            if (data.match_type === "exact" || data.match_type === "fuzzy") {
                setSelected(data.product);
                toast.success(
                    `Coincidencia ${data.match_type === "exact" ? "exacta" : "aproximada"}: ${data.product.nombre}`
                );
            } else {
                toast.error(`Sin coincidencias para ${code}`);
                setQ(code);
            }
        } catch (e) {
            toast.error("Error buscando el código");
        }
    };

    const totalPages = Math.ceil(data.total / perPage);

    return (
        <div className="flex h-[calc(100vh-4rem)]" data-testid="catalog-page">
            {/* FILTER SIDEBAR */}
            <aside
                className={`${
                    sideOpen ? "w-72" : "w-0"
                } shrink-0 border-r border-border bg-card/40 overflow-hidden transition-all duration-300`}
                data-testid="filter-sidebar"
            >
                {filters && (
                    <div className="w-72 h-full overflow-y-auto p-5 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="overline">Filtros</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {activeFiltersCount} activo{activeFiltersCount !== 1 ? "s" : ""}
                                </div>
                            </div>
                            {activeFiltersCount > 0 && (
                                <button
                                    data-testid="clear-filters-btn"
                                    onClick={clearFilters}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Limpiar todo
                                </button>
                            )}
                        </div>

                        <FilterSelect
                            label="Denominación"
                            value={denom}
                            onChange={(v) => {
                                setDenom(v);
                                setPage(1);
                            }}
                            options={filters.denominacion}
                            testid="filter-denominacion"
                        />
                        <FilterSelect
                            label="Zona"
                            value={zona}
                            onChange={(v) => {
                                setZona(v);
                                setPage(1);
                            }}
                            options={filters.zona}
                            testid="filter-zona"
                        />
                        <FilterSelect
                            label="País"
                            value={pais}
                            onChange={(v) => {
                                setPais(v);
                                setPage(1);
                            }}
                            options={filters.pais}
                            testid="filter-pais"
                        />
                        <FilterSelect
                            label="Bodega"
                            value={bodega}
                            onChange={(v) => {
                                setBodega(v);
                                setPage(1);
                            }}
                            options={filters.bodega}
                            testid="filter-bodega"
                        />
                        <FilterSelect
                            label="Variedad"
                            value={variedad}
                            onChange={(v) => {
                                setVariedad(v);
                                setPage(1);
                            }}
                            options={filters.variedades}
                            testid="filter-variedad"
                        />

                        {/* PRICE */}
                        <div>
                            <div className="overline mb-2 flex items-center justify-between">
                                <span>Precio (tienda)</span>
                                <span className="text-[11px] normal-case tracking-normal text-foreground">
                                    {minPrice}€ – {maxPrice}€
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    data-testid="filter-min-price"
                                    type="number"
                                    value={minPrice}
                                    min={Math.floor(filters.price_min)}
                                    max={maxPrice}
                                    onChange={(e) => {
                                        setMinPrice(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="w-full px-2 py-1.5 text-xs rounded border border-input bg-card"
                                />
                                <span className="text-xs text-muted-foreground">–</span>
                                <input
                                    data-testid="filter-max-price"
                                    type="number"
                                    value={maxPrice}
                                    min={minPrice}
                                    max={Math.ceil(filters.price_max)}
                                    onChange={(e) => {
                                        setMaxPrice(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="w-full px-2 py-1.5 text-xs rounded border border-input bg-card"
                                />
                            </div>
                            <input
                                data-testid="filter-range-slider"
                                type="range"
                                min={Math.floor(filters.price_min)}
                                max={Math.ceil(filters.price_max)}
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className="w-full mt-3 accent-primary"
                            />
                        </div>
                    </div>
                )}
            </aside>

            {/* MAIN */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* SEARCH ROW */}
                <div className="p-4 sm:p-6 border-b border-border bg-background sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <button
                            data-testid="toggle-sidebar-btn"
                            onClick={() => setSideOpen((s) => !s)}
                            className="btn-pill !px-3 !py-2"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline">Filtros</span>
                        </button>

                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                data-testid="search-input"
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Buscar por nombre, bodega, variedad, código…"
                                className="w-full pl-10 pr-24 py-3 rounded-full bg-card border border-input font-data text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                data-testid="open-scanner-btn"
                                onClick={() => setScannerOpen(true)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-pill !py-1.5 !px-3 !text-xs bg-primary text-primary-foreground border-primary hover:opacity-90"
                                title="Escanear código de barras"
                            >
                                <Camera className="h-4 w-4" />
                                <span className="hidden sm:inline">Escanear</span>
                            </button>
                        </div>

                        <select
                            data-testid="sort-select"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="hidden md:block px-3 py-2 rounded-full border border-input bg-card text-sm"
                        >
                            <option value="nombre">A-Z</option>
                            <option value="price_asc">Precio ↑</option>
                            <option value="price_desc">Precio ↓</option>
                            <option value="bodega">Bodega</option>
                        </select>
                    </div>

                    {/* QUICK PILLS */}
                    <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                        {QUICK_CATS.map((c) => (
                            <button
                                key={c.key}
                                data-testid={`filter-pill-${c.key}`}
                                data-active={selectedCats.includes(c.key)}
                                onClick={() => toggleCat(c.key)}
                                className={`btn-pill whitespace-nowrap ${
                                    selectedCats.includes(c.key) ? c.color : ""
                                }`}
                            >
                                <Wine className="h-3.5 w-3.5" />
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* RESULTS */}
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-muted-foreground">
                            {loading ? (
                                "Buscando…"
                            ) : (
                                <>
                                    <span className="font-semibold text-foreground">
                                        {data.total.toLocaleString("es-ES")}
                                    </span>{" "}
                                    referencias · Tarifa:{" "}
                                    <span className="font-semibold text-foreground">{tarifa}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="shimmer rounded-xl h-48" />
                            ))}
                        </div>
                    ) : data.items.length === 0 ? (
                        <EmptyState q={q} />
                    ) : (
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-in"
                            data-testid="product-grid"
                        >
                            {data.items.map((p) => (
                                <ProductCard
                                    key={p.codigo}
                                    product={p}
                                    onOpen={() => setSelected(p)}
                                    onAdd={() => {
                                        add(p, 1);
                                        toast.success(`Añadido: ${p.nombre}`);
                                    }}
                                    tarifa={tarifa}
                                />
                            ))}
                        </div>
                    )}

                    {/* PAGINATION */}
                    {!loading && totalPages > 1 && (
                        <div className="mt-8 flex justify-center gap-2" data-testid="pagination">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="btn-pill !px-3 !py-1.5 disabled:opacity-50"
                                data-testid="page-prev"
                            >
                                ← Anterior
                            </button>
                            <span className="text-sm self-center px-3 text-muted-foreground">
                                Página <span className="text-foreground font-semibold">{page}</span> de{" "}
                                {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="btn-pill !px-3 !py-1.5 disabled:opacity-50"
                                data-testid="page-next"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {scannerOpen && (
                <BarcodeScanner
                    onClose={() => setScannerOpen(false)}
                    onDetected={onScanned}
                />
            )}
            {selected && (
                <ProductModal product={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

function FilterSelect({ label, value, onChange, options, testid }) {
    return (
        <div>
            <div className="overline mb-1.5">{label}</div>
            <select
                data-testid={testid}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-card border border-input text-xs font-data outline-none focus:border-primary"
            >
                <option value="">Todas</option>
                {options.slice(0, 100).map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.value} ({o.count})
                    </option>
                ))}
            </select>
        </div>
    );
}

function ProductCard({ product, onOpen, onAdd, tarifa }) {
    const priceField = {
        "PVP 1 (TIENDA)": "pvp_tienda",
        "PVP 5 (HORECA)": "pvp_horeca",
        "PVP 4 (ASOCIADO)": "pvp_asociado",
        "PVP 6 (SIN IVA)": "pvp_sin_iva",
    }[tarifa];
    const price = product[priceField] || 0;

    return (
        <div
            data-testid={`product-card-${product.codigo}`}
            className="group card-thin p-4 flex flex-col hover:border-primary/60 hover:shadow-lg transition-all cursor-pointer"
            onClick={onOpen}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground truncate">
                        {product.categoria} · {product.volumen || ""}
                    </div>
                    <h3 className="text-[15px] font-semibold leading-tight mt-1 line-clamp-2">
                        {product.nombre}
                    </h3>
                </div>
                <CategoryBadge cat={product.categoria} />
            </div>

            <div className="mt-3 space-y-1 text-[12px] font-data text-muted-foreground">
                {product.bodega && (
                    <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.bodega}</span>
                    </div>
                )}
                {product.denominacion && (
                    <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.denominacion}</span>
                    </div>
                )}
                {product.variedades && (
                    <div className="flex items-center gap-1.5 truncate">
                        <Grape className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.variedades}</span>
                    </div>
                )}
            </div>

            <div className="flex-1" />

            <div className="mt-4 pt-3 border-t border-border flex items-end justify-between gap-2">
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {tarifa.split("(")[1]?.replace(")", "") || tarifa}
                    </div>
                    <div className="font-display text-2xl leading-none mt-0.5">
                        {price.toFixed(2)}
                        <span className="text-sm text-muted-foreground ml-0.5">€</span>
                    </div>
                </div>
                <button
                    data-testid={`add-to-cart-${product.codigo}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAdd();
                    }}
                    className="btn-pill !px-3 !py-2 bg-primary text-primary-foreground border-primary hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function CategoryBadge({ cat }) {
    const map = {
        tinto: "bg-[#7a2d36]/20 text-[#a13c48]",
        blanco: "bg-[#e6d59b]/30 text-[#8a6f2e]",
        rosado: "bg-[#e8a7b7]/30 text-[#9b4158]",
        espumoso: "bg-[#f6e9b0]/30 text-[#8a6f20]",
        generoso: "bg-[#b98b3f]/25 text-[#a56d2a]",
        licor: "bg-[#2e3a4a]/20 text-[#4a5f7a]",
        otros: "bg-muted text-muted-foreground",
    };
    return (
        <span
            className={`text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-full ${
                map[cat] || map.otros
            }`}
        >
            {cat || "—"}
        </span>
    );
}

function EmptyState({ q }) {
    return (
        <div
            className="card-thin p-10 text-center max-w-xl mx-auto mt-16"
            data-testid="empty-state"
        >
            <Wine className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-display text-2xl mt-4">Sin resultados</h3>
            <p className="text-sm text-muted-foreground mt-2">
                No hay vinos que coincidan con{" "}
                <span className="font-semibold text-foreground">"{q}"</span> y los filtros
                aplicados.
            </p>
            <p className="text-sm mt-4">
                💡 Pregunta al{" "}
                <a href="/ia" className="text-primary underline">
                    Sumiller IA
                </a>{" "}
                por alternativas de nuestro catálogo.
            </p>
        </div>
    );
}
