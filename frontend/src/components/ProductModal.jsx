import {
    X,
    Plus,
    Wine,
    MapPin,
    Grape,
    Building2,
    Share2,
    Globe2,
    Tag,
    Sparkles,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

const TARIFA_LABELS = {
    pvp_tienda: { label: "Tienda (PVP 1)", tone: "text-foreground" },
    pvp_horeca: { label: "HORECA (PVP 5)", tone: "text-primary" },
    pvp_asociado: { label: "Asociado (PVP 4)", tone: "text-accent-foreground" },
    pvp_sin_iva: { label: "Sin IVA (PVP 6)", tone: "text-muted-foreground" },
};

export default function ProductModal({ product, onClose }) {
    const { add } = useCart();

    const shareWhatsApp = () => {
        const text = `*${product.nombre}*\nCódigo: ${product.codigo}\nBodega: ${product.bodega || "—"}\nDO: ${product.denominacion || "—"}\nPVP Tienda: ${product.pvp_tienda?.toFixed(2)}€`;
        window.open(
            `https://wa.me/?text=${encodeURIComponent(text)}`,
            "_blank"
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 fade-in"
            onClick={onClose}
            data-testid="product-modal"
        >
            <div
                className="card-thin bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="relative p-6 border-b border-border bg-gradient-to-br from-primary/10 to-transparent">
                    <button
                        data-testid="modal-close-btn"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-xl bg-primary/15 flex items-center justify-center">
                            <Wine className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1 pr-8">
                            <div className="overline">
                                {product.categoria} · {product.tipo} · cód.{" "}
                                <span className="font-semibold">{product.codigo}</span>
                            </div>
                            <h2 className="font-display text-3xl leading-tight tracking-tight mt-1">
                                {product.nombre}
                            </h2>
                            {product.volumen && (
                                <div className="text-sm text-muted-foreground mt-1">
                                    {product.volumen}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* meta */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoRow icon={Building2} label="Bodega" value={product.bodega} />
                        <InfoRow icon={MapPin} label="Denominación" value={product.denominacion} />
                        <InfoRow icon={Grape} label="Variedades" value={product.variedades} />
                        <InfoRow icon={Globe2} label="Zona" value={product.zona} />
                        <InfoRow icon={Tag} label="País" value={product.pais} />
                        <InfoRow icon={Tag} label="Distribuidor" value={product.distribuidor} />
                    </div>

                    {/* Tarifas */}
                    <div>
                        <div className="overline mb-2">Tarifas</div>
                        <div className="grid grid-cols-2 gap-2">
                            {["pvp_tienda", "pvp_horeca", "pvp_asociado", "pvp_sin_iva"].map((k) => (
                                <div
                                    key={k}
                                    className="card-thin p-3"
                                    data-testid={`tarifa-${k}`}
                                >
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {TARIFA_LABELS[k].label}
                                    </div>
                                    <div
                                        className={`font-display text-2xl mt-1 ${TARIFA_LABELS[k].tone}`}
                                    >
                                        {(product[k] || 0).toFixed(2)}€
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-2">
                            IVA {Math.round((product.iva || 0) * 100)}% · Descuento{" "}
                            {product.descuento || 0}%
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                            data-testid="modal-add-cart"
                            onClick={() => {
                                add(product, 1);
                                toast.success("Añadido al carrito");
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition"
                        >
                            <Plus className="h-4 w-4" />
                            Añadir al carrito
                        </button>
                        <button
                            data-testid="modal-share-wa"
                            onClick={shareWhatsApp}
                            className="btn-pill !py-3 justify-center"
                        >
                            <Share2 className="h-4 w-4" />
                            Compartir por WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                </div>
                <div className="font-data text-sm truncate">{value || "—"}</div>
            </div>
        </div>
    );
}
