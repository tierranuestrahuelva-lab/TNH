import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScrollText, Mail, MessageCircle, FileDown, Calendar, User, Euro, Package } from "lucide-react";
import { exportOrderPDF } from "@/lib/pdf";
import { openEmail, openWhatsApp, buildOrderSummary } from "@/lib/order";

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        api.get("/orders?mine=true&limit=100")
            .then((r) => setOrders(r.data.items))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-5 sm:p-8 max-w-6xl mx-auto" data-testid="orders-page">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Historial</div>
                    <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-1">
                        Mis pedidos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Todos los pedidos guardados por tu usuario.
                    </p>
                </div>
            </div>

            <div className="mt-8 grid lg:grid-cols-[1fr_1.2fr] gap-4">
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 shimmer rounded-xl" />
                        ))
                    ) : orders.length === 0 ? (
                        <div className="card-thin p-8 text-center text-muted-foreground" data-testid="orders-empty">
                            <ScrollText className="h-10 w-10 mx-auto opacity-40" />
                            <p className="mt-4 text-sm">Aún no hay pedidos guardados</p>
                        </div>
                    ) : (
                        orders.map((o) => (
                            <button
                                key={o.id}
                                data-testid={`order-item-${o.id}`}
                                onClick={() => setSelected(o)}
                                className={`w-full card-thin p-4 text-left hover:border-primary/60 transition ${
                                    selected?.id === o.id ? "border-primary ring-1 ring-primary/30" : ""
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-xs text-muted-foreground">
                                            #{o.id.slice(0, 8)}
                                        </div>
                                        <div className="font-semibold truncate">
                                            {o.cliente || "Sin cliente"}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {o.comercial} · {new Date(o.created_at).toLocaleString("es-ES")}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-display text-xl">{o.total?.toFixed(2)}€</div>
                                        <div className="text-xs text-muted-foreground">
                                            {o.items.length} art.
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="lg:sticky lg:top-6 self-start">
                    {selected ? (
                        <OrderDetail order={selected} />
                    ) : (
                        <div className="card-thin p-10 text-center text-muted-foreground" data-testid="orders-select-hint">
                            <Package className="h-10 w-10 mx-auto opacity-30" />
                            <p className="mt-4 text-sm">Selecciona un pedido para ver el detalle</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function OrderDetail({ order }) {
    // Rebuild cart-like structure for actions
    const items = order.items.map((it) => ({
        ...it,
        snapshot: {
            pvp_tienda: it.precio_unitario,
            pvp_horeca: it.precio_unitario,
            pvp_asociado: it.precio_unitario,
            pvp_sin_iva: it.precio_unitario,
        },
        bodega: "",
    }));
    const priceOf = (p) => p.pvp_horeca || 0;
    const totals = { units: items.reduce((s, it) => s + it.cantidad, 0), subtotal: order.total };

    const asOrderObj = {
        comercial: order.comercial,
        cliente: order.cliente,
        observaciones: order.observaciones,
        tarifa: order.tarifa,
        items,
        totals,
        text: buildOrderSummary({
            items,
            comercial: order.comercial,
            cliente: order.cliente,
            observaciones: order.observaciones,
            tarifa: order.tarifa,
            totals,
            priceOf,
        }),
    };

    return (
        <div className="card-thin p-6 fade-in" data-testid="order-detail">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <div className="overline">Pedido</div>
                    <h2 className="font-display text-2xl mt-1">
                        {order.cliente || "Sin cliente"}
                    </h2>
                </div>
                <div className="text-right">
                    <div className="font-display text-3xl text-primary">
                        {order.total?.toFixed(2)}€
                    </div>
                    <div className="text-xs text-muted-foreground">{order.tarifa}</div>
                </div>
            </div>

            <div className="flex gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {order.comercial}
                </span>
                <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleString("es-ES")}
                </span>
                <span className="inline-flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {order.items.length} artículos · {totals.units} ud.
                </span>
            </div>

            <div className="mt-5 hairline" />

            <div className="mt-5 max-h-80 overflow-y-auto pr-2 space-y-2">
                {order.items.map((it, i) => (
                    <div
                        key={i}
                        className="flex justify-between gap-4 text-sm bg-muted/30 rounded-lg p-2.5"
                    >
                        <div className="min-w-0">
                            <div className="text-[10px] text-muted-foreground">{it.codigo}</div>
                            <div className="font-medium truncate">{it.nombre}</div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="font-data">
                                {it.cantidad} × {it.precio_unitario.toFixed(2)}€
                            </div>
                            <div className="text-xs text-muted-foreground">
                                = {(it.cantidad * it.precio_unitario).toFixed(2)}€
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {order.observaciones && (
                <div className="mt-4 p-3 bg-accent/10 border-l-2 border-accent rounded text-sm">
                    <div className="overline mb-1">Observaciones</div>
                    {order.observaciones}
                </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                    data-testid="order-detail-email"
                    onClick={() => openEmail(asOrderObj)}
                    className="btn-pill justify-center bg-primary text-primary-foreground border-primary"
                >
                    <Mail className="h-4 w-4" /> Email
                </button>
                <button
                    data-testid="order-detail-wa"
                    onClick={() => openWhatsApp(asOrderObj)}
                    className="btn-pill justify-center bg-[#25D366] text-white border-[#25D366]"
                >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
                <button
                    data-testid="order-detail-pdf"
                    onClick={() =>
                        exportOrderPDF({
                            ...order,
                            items,
                            totals,
                            priceOf,
                        })
                    }
                    className="btn-pill justify-center"
                >
                    <FileDown className="h-4 w-4" /> PDF
                </button>
            </div>
        </div>
    );
}
