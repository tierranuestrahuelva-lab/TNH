const BASE = "https://tierranuestrahuelva-lab.github.io/TNH/";
const eur = n => Number(n || 0).toLocaleString("es-ES", {style: "currency", currency: "EUR", maximumFractionDigits: 0});
const num = n => Number(n || 0).toLocaleString("es-ES", {maximumFractionDigits: 0});
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const first = (d, k) => (d[k] && d[k][0]) || {};
const fecha = s => s ? new Date(s).toLocaleDateString("es-ES", {day: "numeric", month: "short", year: "numeric"}) : "—";

const ICONS = {
  dinero: '<path d="M4 7h16v10H4z"/><circle cx="12" cy="12" r="2.5"/>',
  stock: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  reparto: '<path d="M2 6h11v9H2zM13 9h5l3 3v3h-8z"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  clientes: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14c3 0 6 1.5 6 4.5"/>',
  equipo: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  marketing: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
};
const icon = k => `<div class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${ICONS[k]}</svg></div>`;

function idea(text, encargo) {
  return `<div class="idea"><p>${esc(text)}</p><button class="btn" data-copy="${esc(encargo || text)}">Copiar encargo</button></div>`;
}
function fact(v, l, cls = "") { return `<div class="fact ${cls}"><b>${v}</b><span>${esc(l)}</span></div>`; }
function card(k, title, facts, extra, have, ideas) {
  return `<article class="card">
    <div class="card-h">${icon(k)}<h3>${esc(title)}</h3></div>
    <div class="facts">${facts.join("")}</div>
    ${extra || ""}
    ${have ? `<div class="have">Ya lo tienes: ${have}</div>` : ""}
    <p class="sub">Ideas que puedo hacerte</p>
    ${ideas.join("")}
  </article>`;
}
const link = (path, name) => `<a href="${BASE}${path}/" target="_blank" rel="noopener">${esc(name)}</a>`;

function render(d) {
  const st = first(d, "stock"), vs = first(d, "valor_stock"), ar = first(d, "articulos");
  const cob = (d.cartera || []).find(r => r.tipo === "cobro") || {};
  const pag = (d.cartera || []).find(r => r.tipo === "pago") || {};
  const ped = first(d, "pedidos"), pc = first(d, "pedidos_compra");
  const rep = first(d, "reparto"), hor = first(d, "horarios"), wa = first(d, "whatsapp");
  const cli = first(d, "clientes"), lot = first(d, "lotes");

  const sage = first(d, "sage").valor || {};
  const at = sage.at ? new Date(sage.at) : null;
  const mins = at ? Math.round((Date.now() - at) / 60000) : null;
  const cls = mins == null ? "" : mins <= 30 ? "ok" : mins <= 180 ? "warn" : "bad";
  document.getElementById("sync").innerHTML = at
    ? `<span class="dot ${cls}"></span>Sage 50 conectado · último dato hace ${mins < 60 ? mins + " min" : Math.round(mins / 60) + " h"}`
    : `<span class="dot"></span>Sin dato de Sage`;

  document.getElementById("band").innerHTML = [
    [eur(vs.valor), "dinero en stock en tienda (a coste)"],
    [eur(cob.vencido), "cobros ya vencidos"],
    [num(ped.n), "pedidos de venta pendientes"],
    [num(rep.semana), "albaranes de reparto esta semana"],
    [num(hor.fichajes_semana), "fichajes del equipo esta semana"],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  const deud = (d.top_deudores || []).map(r =>
    `<li><span>${esc(r.nombre)}<br><small class="muted">vencido desde ${fecha(r.desde)}</small></span><span class="n">${eur(r.pendiente)}</span></li>`).join("");
  const topst = (d.top_stock || []).map(r =>
    `<li><span>${esc(r.nombre)} <small class="muted">· ${num(r.stock)} uds</small></span><span class="n">${eur(r.valor)}</span></li>`).join("");
  const rutas = (d.rutas || []).map(r => `<li><span>${esc(r.ruta)}</span><span class="n">${num(r.n)}</span></li>`).join("");

  document.getElementById("areas").innerHTML = [
    card("dinero", "Dinero: cobros y pagos", [
      fact(eur(cob.pendiente), "te deben (pendiente de cobro)"),
      fact(eur(cob.vencido), "de eso, ya vencido", "bad"),
      fact(eur(cob.prox30), "cobros que vencen en 30 días"),
      fact(eur(pag.prox30), "pagos que vencen en 30 días", "warn"),
    ], deud ? `<p class="sub">Quién te debe más (vencido)</p><ul class="list">${deud}</ul>` : "",
      link("central", "TN Central"), [
      idea("Cada lunes, un aviso con los clientes que llevan más de 30 días sin pagar y cuánto debe cada uno.",
        "Quiero que cada lunes me prepares un aviso con los clientes que llevan más de 30 días sin pagar, ordenados por importe, sacado de Sage."),
      idea("Previsión de caja: lo que entra y lo que sale en las próximas semanas, para no llevarte sustos.",
        "Hazme una previsión de tesorería semana a semana para los próximos 2 meses con los cobros y pagos pendientes de Sage."),
      idea("Cartas o WhatsApp de reclamación de cobro, educados y listos para enviar.",
        "Prepárame cartas de reclamación de cobro, en tono serio y educado, para los clientes con facturas vencidas."),
    ]),
    card("stock", "Almacén y stock", [
      fact(num(st.refs_con_stock), "artículos con stock en tienda"),
      fact(num(st.unidades), "unidades en tienda"),
      fact(num(ar.activos), "artículos activos en Sage"),
      fact(num(lot.n), "lotes con fecha de caducidad pasada", lot.n ? "warn" : ""),
    ], topst ? `<p class="sub">Donde tienes más dinero parado</p><ul class="list">${topst}</ul>` : "",
      `${link("ubicaciones", "Ubicaciones")}, ${link("croquis", "Croquis")}`, [
      idea("Lista de vinos con mucho stock y poca salida, con una propuesta de oferta para liquidarlos (tú decides).",
        "Sácame los vinos con más dinero parado en stock y poca venta, y propónme una oferta para darles salida. No toques Sage."),
      idea("Aviso automático cuando un vino que se vende bien esté a punto de agotarse.",
        "Quiero un aviso cuando un vino que se vende bien baje del stock mínimo, para pedirlo a tiempo."),
      idea("Revisar los lotes con fecha de caducidad pasada y decirte cuáles hay que mirar.",
        "Revisa los lotes de Sage con fecha de caducidad pasada y dime cuáles hay que revisar en el almacén."),
    ]),
    card("reparto", "Pedidos y reparto", [
      fact(num(ped.n), "pedidos de venta pendientes"),
      fact(eur(ped.total), "importe de esos pedidos"),
      fact(num(rep.pendientes), "albaranes por repartir"),
      fact(num(rep.en_ruta), "albaranes en ruta ahora"),
    ], "", link("reparto", "Reparto"), [
      idea("Cada mañana, la hoja de ruta del repartidor ordenada por zonas, lista para el móvil.",
        "Quiero que cada mañana el repartidor tenga en el móvil su ruta del día ordenada por zonas, con los albaranes de Sage."),
      idea("Un WhatsApp al cliente avisando de que su pedido sale hoy.",
        "Quiero que al cliente le llegue un WhatsApp automático cuando su pedido sale en reparto."),
      idea("Resumen de pedidos pendientes por comercial y por ruta.",
        "Hazme un resumen de los pedidos de venta pendientes por comercial y por ruta."),
    ]),
    card("clientes", "Clientes", [
      fact(num(cli.n), "clientes en Sage"),
      fact(num(pc.n), "pedidos de compra a proveedores abiertos"),
    ], rutas ? `<p class="sub">Clientes por ruta o grupo</p><ul class="list">${rutas}</ul>` : "",
      link("club", "Club de vinos"), [
      idea("Campaña de Navidad para el grupo «Regalos de Empresa»: carta, catálogo sin precios y lista de contactos.",
        "Prepárame la campaña de Navidad para los clientes de Regalos de Empresa: carta, catálogo PDF y lista de contactos."),
      idea("Detectar clientes de hostelería que antes compraban y ahora no, para llamarlos.",
        "Dime qué clientes de hostelería han dejado de comprar en los últimos meses, para que el comercial los llame."),
      idea("Boletín mensual para los socios del Club de Vinos.",
        "Quiero un boletín mensual bonito para los socios del Club de Vinos con las novedades y la cata del mes."),
    ]),
    card("equipo", "Equipo y horarios", [
      fact(num(hor.empleados), "personas en el equipo"),
      fact(num(hor.fichajes_semana), "fichajes esta semana"),
      fact(num(hor.solicitudes), "solicitudes (vacaciones, cambios)"),
      fact(num(hor.fuera_zona), "fichajes fuera de zona", hor.fuera_zona ? "warn" : ""),
    ], "", link("horarios", "Horarios"), [
      idea("Informe mensual de horas por persona, listo para mandarlo a la gestoría.",
        "Hazme el informe mensual de horas trabajadas por persona para mandarlo a la gestoría."),
      idea("Cuadrante de turnos de Navidad, cuadrado con las vacaciones pedidas.",
        "Prepárame el cuadrante de turnos de diciembre teniendo en cuenta las vacaciones pedidas."),
    ]),
    card("marketing", "Tienda, web y redes", [
      fact(num(wa.articulos), "vinos que conoce el chatbot de WhatsApp"),
      fact(num(wa.pedidos), "pedidos por WhatsApp"),
    ], "", `${link("vinos", "Tienda de vinos")}, ${link("tpv", "TPV")}, ${link("guia", "Guía de vinos")}, ${link("redes", "Redes")}`, [
      idea("Catálogo PDF de Navidad, elegante y sin precios, para clientes y hostelería.",
        "Hazme un catálogo PDF de Navidad de Tierra Nuestra, sin precios, para clientes y hostelería."),
      idea("Publicaciones de Instagram y Facebook para toda la semana, con fotos de tus vinos.",
        "Prepárame las publicaciones de Instagram y Facebook de esta semana con los vinos destacados."),
      idea("Cartel de ofertas para la tienda con código QR a la web.",
        "Hazme un cartel de ofertas para el escaparate de la tienda con un QR a la web."),
    ]),
  ].join("");

  document.getElementById("apps").innerHTML = [
    ["central", "TN Central", "Todo en un solo enlace"],
    ["reparto", "Reparto", "Rutas y albaranes"],
    ["horarios", "Horarios", "Fichajes y turnos"],
    ["ubicaciones", "Ubicaciones", "Dónde está cada vino"],
    ["croquis", "Croquis", "Plano del almacén"],
    ["tpv", "TPV", "Caja de la tienda"],
    ["guia", "Guía de vinos", "Para el personal"],
    ["vinos", "Tienda de vinos", "Web /vinos/"],
    ["club", "Club de vinos", "Socios y catas"],
    ["redes", "Redes", "Instagram y Facebook"],
  ].map(([p, n, s]) => `<a class="appl" href="${BASE}${p}/" target="_blank" rel="noopener"><b>${n}</b><span>${s}</span></a>`).join("");
}

async function load() {
  try {
    const d = await (await fetch("api/resumen", {cache: "no-store"})).json();
    if (d._cargando) { setTimeout(load, 3000); return; }
    render(d);
  } catch (e) {
    document.getElementById("sync").textContent = "No se pudieron cargar los datos";
  }
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const t = b.dataset.copy;
  try { await navigator.clipboard.writeText(t); }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.append(a); a.select(); document.execCommand("copy"); a.remove(); }
  const toast = document.getElementById("toast");
  toast.textContent = "Copiado. Pégalo en el chat de Devin.";
  toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200);
});

if (!window.TN_PUBLICO) {
  load();
  setInterval(load, 5 * 60 * 1000);
}
