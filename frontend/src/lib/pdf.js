import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportOrderPDF({ comercial, cliente, observaciones, tarifa, items, totals, priceOf }) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(114, 47, 55); // bordeaux
    doc.text("TIERRA NUESTRA HUELVA", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text("Pedido comercial — Lo Más Pro", 14, 24);

    // Right side: meta
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const today = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    doc.text(`Fecha: ${today}`, pageWidth - 14, 18, { align: "right" });
    doc.text(`Tarifa: ${tarifa}`, pageWidth - 14, 23, { align: "right" });

    // Gold line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
    doc.line(14, 28, pageWidth - 14, 28);

    // Client block
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Comercial:", 14, 36);
    doc.setFont("helvetica", "normal");
    doc.text(comercial || "—", 35, 36);

    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(cliente || "—", 35, 42);

    // Items table
    const rows = items.map((it, idx) => {
        const p = priceOf(it.snapshot, tarifa);
        return [
            String(idx + 1),
            it.codigo,
            it.nombre + (it.volumen ? ` (${it.volumen})` : ""),
            it.bodega || "—",
            String(it.cantidad),
            `${p.toFixed(2)} €`,
            `${(it.cantidad * p).toFixed(2)} €`,
        ];
    });

    autoTable(doc, {
        head: [["#", "Código", "Producto", "Bodega", "Ud.", "P/U", "Subtotal"]],
        body: rows,
        startY: 50,
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2, textColor: [40, 40, 40] },
        headStyles: { fillColor: [114, 47, 55], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 248, 243] },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 22 },
            4: { halign: "center", cellWidth: 14 },
            5: { halign: "right", cellWidth: 22 },
            6: { halign: "right", cellWidth: 26 },
        },
        margin: { left: 14, right: 14 },
    });

    const finalY = doc.lastAutoTable.finalY || 60;

    // Totals
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(114, 47, 55);
    doc.text(`Unidades: ${totals.units}`, pageWidth - 14, finalY + 10, { align: "right" });
    doc.text(`TOTAL: ${totals.subtotal.toFixed(2)} €`, pageWidth - 14, finalY + 16, { align: "right" });

    // Observaciones
    if (observaciones) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("Observaciones:", 14, finalY + 24);
        doc.setFont("helvetica", "normal");
        const split = doc.splitTextToSize(observaciones, pageWidth - 28);
        doc.text(split, 14, finalY + 30);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("tnh@tierranuestrahuelva.es · +34 699 414 559 · Huelva, Andalucía",
        pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

    const filename = `TNH_pedido_${(cliente || "cliente").replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    doc.save(filename);
}
