import { useCart } from "./cart";

export function buildOrderSummary({ items, comercial, cliente, observaciones, tarifa, totals, priceOf }) {
    const lines = [];
    lines.push(`*TNH — Pedido Lo Más Pro*`);
    lines.push(`Comercial: ${comercial}`);
    lines.push(`Cliente: ${cliente || "—"}`);
    lines.push(`Tarifa: ${tarifa}`);
    lines.push(`Fecha: ${new Date().toLocaleString("es-ES")}`);
    lines.push("");
    lines.push("*Artículos:*");
    items.forEach((it, idx) => {
        const p = priceOf(it.snapshot, tarifa);
        const subtotal = (it.cantidad * p).toFixed(2);
        lines.push(
            `${idx + 1}. [${it.codigo}] ${it.nombre}${it.volumen ? " (" + it.volumen + ")" : ""} — ${it.cantidad} x ${p.toFixed(2)}€ = ${subtotal}€`
        );
    });
    lines.push("");
    lines.push(`*Unidades totales:* ${totals.units}`);
    lines.push(`*Total:* ${totals.subtotal.toFixed(2)}€`);
    if (observaciones) {
        lines.push("");
        lines.push(`*Observaciones:* ${observaciones}`);
    }
    return lines.join("\n");
}

export function openEmail(order) {
    const subject = encodeURIComponent(
        `Pedido ${order.comercial} — ${order.cliente || "Cliente"} (${order.items.length} art.)`
    );
    const body = encodeURIComponent(order.text);
    window.location.href = `mailto:tnh@tierranuestrahuelva.es?subject=${subject}&body=${body}`;
}

export function openWhatsApp(order) {
    // Remove the bold Markdown asterisks for plain WhatsApp formatting (wa.me preserves asterisks for bold)
    const txt = encodeURIComponent(order.text);
    window.open(`https://wa.me/34699414559?text=${txt}`, "_blank");
}

export function useBuildOrder() {
    const { items, comercial, cliente, observaciones, tarifa, totals, priceOf } = useCart();
    return () => ({
        comercial,
        cliente,
        observaciones,
        tarifa,
        items,
        totals,
        text: buildOrderSummary({ items, comercial, cliente, observaciones, tarifa, totals, priceOf }),
    });
}
