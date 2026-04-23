import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const TARIFA_FIELD = {
    "PVP 1 (TIENDA)": "pvp_tienda",
    "PVP 5 (HORECA)": "pvp_horeca",
    "PVP 4 (ASOCIADO)": "pvp_asociado",
    "PVP 6 (SIN IVA)": "pvp_sin_iva",
};
export const TARIFAS = Object.keys(TARIFA_FIELD);
export const TARIFA_FIELD_MAP = TARIFA_FIELD;

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState(() => {
        try {
            const raw = localStorage.getItem("tnh_cart");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [comercial, setComercial] = useState(
        () => localStorage.getItem("tnh_cart_comercial") || "Fernando"
    );
    const [cliente, setCliente] = useState(
        () => localStorage.getItem("tnh_cart_cliente") || ""
    );
    const [observaciones, setObservaciones] = useState(
        () => localStorage.getItem("tnh_cart_obs") || ""
    );
    const [tarifa, setTarifa] = useState(
        () => localStorage.getItem("tnh_cart_tarifa") || "PVP 5 (HORECA)"
    );
    const [open, setOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem("tnh_cart", JSON.stringify(items));
    }, [items]);
    useEffect(() => localStorage.setItem("tnh_cart_comercial", comercial), [comercial]);
    useEffect(() => localStorage.setItem("tnh_cart_cliente", cliente), [cliente]);
    useEffect(() => localStorage.setItem("tnh_cart_obs", observaciones), [observaciones]);
    useEffect(() => localStorage.setItem("tnh_cart_tarifa", tarifa), [tarifa]);

    const priceOf = (p, t = tarifa) => {
        const f = TARIFA_FIELD[t] || "pvp_horeca";
        return Number(p?.[f]) || 0;
    };

    const add = (product, qty = 1) => {
        setItems((prev) => {
            const i = prev.findIndex((x) => x.codigo === product.codigo);
            if (i >= 0) {
                const next = [...prev];
                next[i] = { ...next[i], cantidad: next[i].cantidad + qty };
                return next;
            }
            return [
                ...prev,
                {
                    codigo: product.codigo,
                    nombre: product.nombre,
                    volumen: product.volumen,
                    bodega: product.bodega,
                    cantidad: qty,
                    snapshot: product,
                },
            ];
        });
        setOpen(true);
    };

    const remove = (codigo) =>
        setItems((prev) => prev.filter((x) => x.codigo !== codigo));
    const setQty = (codigo, cantidad) =>
        setItems((prev) =>
            prev.map((x) =>
                x.codigo === codigo ? { ...x, cantidad: Math.max(1, cantidad) } : x
            )
        );
    const clear = () => setItems([]);

    const totals = useMemo(() => {
        const subtotal = items.reduce(
            (sum, it) => sum + it.cantidad * priceOf(it.snapshot, tarifa),
            0
        );
        const units = items.reduce((s, it) => s + it.cantidad, 0);
        return { subtotal, units };
    }, [items, tarifa]);

    const value = {
        items,
        add,
        remove,
        setQty,
        clear,
        comercial,
        setComercial,
        cliente,
        setCliente,
        observaciones,
        setObservaciones,
        tarifa,
        setTarifa,
        totals,
        priceOf,
        open,
        setOpen,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
