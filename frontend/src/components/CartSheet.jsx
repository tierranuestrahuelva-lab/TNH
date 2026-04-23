import { useState } from "react";
import {
    X,
    Trash2,
    Mail,
    MessageCircle,
    FileDown,
    ChevronDown,
    ShoppingBag,
    Minus,
    Plus,
} from "lucide-react";
import { useCart, TARIFAS } from "@/lib/cart";
import { buildOrderSummary, openEmail, openWhatsApp } from "@/lib/order";
import { exportOrderPDF } from "@/lib/pdf";
import { api } from "@/lib/api";
import { toast } from "sonner";

const COMERCIALES = ["Fernando", "Ernesto", "Tienda"];

export default function CartSheet() {
    const {
        items,
        remove,
        setQty,
        clear,
        totals,
        comercial,
        setComercial,
        cliente,
        setCliente,
        observaciones,
        setObservaciones,
        tarifa,
        setTarifa,
        priceOf,
        open,
        setOpen,
    } = useCart();

    const [saving, setSaving] = useState(false);

    const buildOrder = () => ({
        comercial,
        cliente,
        observaciones,
        tarifa,
        items,
        totals,
        text: buildOrderSummary({
            items,
            comercial,
            cliente,
            observaciones,
            tarifa,
            totals,
            priceOf,
        }),
    });

    const persistOrder = async () => {
        if (!items.length) return null;
        setSaving(true);
        try {
            const { data } = await api.post("/orders", {
                comercial,
                cliente,
                observaciones,
                tarifa,
                items: items.map((it) => ({
                    codigo: it.codigo,
                    nombre: it.nombre,
                    cantidad: it.cantidad,
                    precio_unitario: priceOf(it.snapshot, tarifa),
                    tarifa,
                })),
            });
            return data;
        } finally {
            setSaving(false);
        }
    };

    const sendEmail = async () => {
        if (!validate()) return;
        await persistOrder();
        openEmail(buildOrder());
        toast.success("Pedido guardado y correo abierto");
    };

    const sendWhatsApp = async () => {
        if (!validate()) return;
        await persistOrder();
        openWhatsApp(buildOrder());
        toast.success("Pedido guardado y WhatsApp abierto");
    };

    const downloadPDF = async () => {
        if (!validate()) return;
        exportOrderPDF({
            comercial,
            cliente,
            observaciones,
            tarifa,
            items,
            totals,
            priceOf,
        });
    };

    const saveOnly = async () => {
        if (!validate()) return;
        const o = await persistOrder();
        if (o) toast.success(`Pedido #${o.id.slice(0, 6)} guardado`);
    };

    const validate = () => {
        if (items.length === 0) {
            toast.error("El carrito está vacío");
            return false;
        }
        if (!cliente.trim()) {
            toast.error("Indica el nombre del cliente");
            return false;
        }
        return true;
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex"
            data-testid="cart-sheet"
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />
            <aside
                className="relative ml-auto h-full w-full sm:w-[440px] bg-card border-l border-border shadow-2xl flex flex-col fade-in"
                data-testid="cart-sheet-panel"
            >
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Carrito de pedido</h3>
                        <span className="text-xs text-muted-foreground">
                            {totals.units} uds
                        </span>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        data-testid="cart-close-btn"
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-5 pt-4 pb-2 space-y-3 border-b border-border">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="overline">Comercial</label>
                            <select
                                data-testid="cart-comercial-select"
                                value={comercial}
                                onChange={(e) => setComercial(e.target.value)}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-input text-sm"
                            >
                                {COMERCIALES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="overline">Tarifa</label>
                            <select
                                data-testid="cart-tarifa-select"
                                value={tarifa}
                                onChange={(e) => setTarifa(e.target.value)}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-input text-sm"
                            >
                                {TARIFAS.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="overline">Cliente</label>
                        <input
                            data-testid="cart-client-input"
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                            placeholder="Nombre del cliente / establecimiento"
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-input text-sm"
                        />
                    </div>
                    <div>
                        <label className="overline">Observaciones</label>
                        <textarea
                            data-testid="cart-obs-input"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={2}
                            placeholder="Notas internas, horarios, preferencias…"
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-input text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                    {items.length === 0 ? (
                        <div
                            className="text-center py-16 text-muted-foreground"
                            data-testid="cart-empty"
                        >
                            <ShoppingBag className="h-10 w-10 mx-auto opacity-30" />
                            <p className="mt-4 text-sm">Aún no has añadido productos</p>
                        </div>
                    ) : (
                        items.map((it) => {
                            const p = priceOf(it.snapshot, tarifa);
                            return (
                                <div
                                    key={it.codigo}
                                    data-testid={`cart-item-${it.codigo}`}
                                    className="card-thin p-3 flex gap-3 items-center"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] uppercase text-muted-foreground">
                                            {it.codigo} · {it.bodega || "—"}
                                        </div>
                                        <div className="font-medium text-sm truncate">
                                            {it.nombre}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {p.toFixed(2)} € · {(p * it.cantidad).toFixed(2)} €
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            data-testid={`cart-dec-${it.codigo}`}
                                            onClick={() => setQty(it.codigo, it.cantidad - 1)}
                                            className="h-7 w-7 rounded border border-input hover:border-primary flex items-center justify-center"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <input
                                            data-testid={`cart-qty-${it.codigo}`}
                                            type="number"
                                            value={it.cantidad}
                                            onChange={(e) =>
                                                setQty(it.codigo, Number(e.target.value) || 1)
                                            }
                                            className="w-12 text-center text-sm bg-transparent border-b border-border focus:border-primary outline-none"
                                        />
                                        <button
                                            data-testid={`cart-inc-${it.codigo}`}
                                            onClick={() => setQty(it.codigo, it.cantidad + 1)}
                                            className="h-7 w-7 rounded border border-input hover:border-primary flex items-center justify-center"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <button
                                        data-testid={`cart-remove-${it.codigo}`}
                                        onClick={() => remove(it.codigo)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border p-5 space-y-3 bg-muted/30">
                    <div className="flex items-baseline justify-between">
                        <div className="overline">Total</div>
                        <div className="font-display text-3xl tracking-tight" data-testid="cart-total">
                            {totals.subtotal.toFixed(2)}€
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            data-testid="cart-send-email"
                            onClick={sendEmail}
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        >
                            <Mail className="h-4 w-4" />
                            Email
                        </button>
                        <button
                            data-testid="cart-send-whatsapp"
                            onClick={sendWhatsApp}
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                        </button>
                        <button
                            data-testid="cart-pdf"
                            onClick={downloadPDF}
                            className="btn-pill justify-center"
                        >
                            <FileDown className="h-4 w-4" />
                            PDF
                        </button>
                        <button
                            data-testid="cart-save"
                            onClick={saveOnly}
                            disabled={saving}
                            className="btn-pill justify-center disabled:opacity-60"
                        >
                            Guardar
                        </button>
                    </div>
                    {items.length > 0 && (
                        <button
                            data-testid="cart-clear"
                            onClick={clear}
                            className="w-full text-xs text-muted-foreground hover:text-destructive"
                        >
                            Vaciar carrito
                        </button>
                    )}
                </div>
            </aside>
        </div>
    );
}
