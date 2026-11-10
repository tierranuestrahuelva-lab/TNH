'use strict';
/* Guía de vinos para la tienda · Tierra Nuestra Huelva. Solo consulta: catálogo PVP tienda, voz, cámara y asistente. */
const VERSION = '1.0.0';
const A = window.GUIA || [];
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const eur = c => (c / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
const LS = { get(k, d) { try { const v = localStorage.getItem('guia_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('guia_' + k, JSON.stringify(v)); } catch (e) { } } };
const WEB = location.hostname.endsWith('github.io') ? '../vinos/' : 'https://tierranuestrahuelva-lab.github.io/TNH/vinos/';
const WEB_ABS = 'https://tierranuestrahuelva-lab.github.io/TNH/vinos/';
const TIENDA_WA = '34699414559';

const I = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
  ia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  vino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0z"/><path d="M12 12.5V20M8.5 20.5h7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.3-9.4C1.4 8.1 3.6 4.5 7.2 4.5c2 0 3.5 1.1 4.8 2.8 1.3-1.7 2.8-2.8 4.8-2.8 3.6 0 5.8 3.6 4.5 7.1C19.5 16.4 12 21 12 21z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/></svg>',
  filtro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9h16l-1.2 11H5.2zM8 9V7a4 4 0 0 1 8 0v2"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  altavoz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
};
const FAM = {
  tintos: ['Tintos', '#830040'], blancos: ['Blancos', '#d9c46a'], rosados: ['Rosados', '#e9879f'], espumosos: ['Espumosos', '#c9a646'],
  generosos: ['Generosos y dulces', '#b06a1f'], formatos: ['Magnum y formatos', '#5e002e'], destilados: ['Destilados', '#7a4a24'],
  regalo: ['Regalo y cestas', '#B771A0'], gourmet: ['Gourmet', '#6b7d3a'], accesorios: ['Cristalería y accesorios', '#64748b'], otros: ['Otros', '#999'],
};
const VINOS = ['tintos', 'blancos', 'rosados', 'espumosos', 'generosos', 'formatos'];
const ESTILOS = ['Ligero', 'Afrutado', 'Maduro', 'Potente'];

/* ---------- índices ---------- */
const BYC = new Map(), BYB = new Map(), BYS = new Map();
for (const a of A) {
  BYC.set(a.c, a); if (a.s) BYS.set(a.s, a);
  for (const b of a.b || []) { BYB.set(b, a); if (/^01\d{14}/.test(b)) BYB.set(b.slice(2, 16), a); }
  a._t = norm([a.n, a.d, a.v, a.o, a.z, a.y, a.e, a.an, a.c].join(' '));
  a._n = norm(a.n);
}
const uvasDe = a => (a.v || '').split(/\s*(?:,|\/|\by\b|\be\b|-|\+)\s*/).map(s => s.trim()).filter(s => s.length > 2);
const DOS = [...new Set(A.filter(a => a.d && VINOS.includes(a.f)).map(a => a.d))].sort((x, y) => norm(x).localeCompare(norm(y)));
const UVAS = (() => { const m = new Map(); for (const a of A) for (const u of uvasDe(a)) { const k = norm(u); if (!m.has(k)) m.set(k, u); } return [...m.values()].sort((x, y) => norm(x).localeCompare(norm(y))); })();

function buscarCodigo(t) {
  t = String(t || '').trim(); if (!t) return null;
  if (BYC.has(t)) return BYC.get(t);
  if (BYB.has(t)) return BYB.get(t);
  const d = t.replace(/\D/g, '');
  if (d && BYB.has(d)) return BYB.get(d);
  if (/^01\d{14}/.test(d) && BYB.has(d.slice(2, 16))) return BYB.get(d.slice(2, 16));
  if (d.length === 14 && BYB.has(d.slice(1))) return BYB.get(d.slice(1));
  if (d.length === 13 && BYB.has('0' + d)) return BYB.get('0' + d);
  if (d.length === 12 && BYB.has('0' + d)) return BYB.get('0' + d);
  if (/^1\d{7}$/.test(d) && BYC.has(String(+d - 10000000))) return BYC.get(String(+d - 10000000));
  return null;
}
function codigoDeTexto(txt) {
  txt = String(txt || '').trim();
  if (!/^https?:\/\//i.test(txt)) return buscarCodigo(txt);
  let u; try { u = new URL(txt); } catch (e) { return null; }
  const h = decodeURIComponent(u.hash || '');
  const m = h.match(/\/vino\/([^/?#]+)/); if (m) { if (BYS.has(m[1])) return BYS.get(m[1]); const a = buscarCodigo(m[1]); if (a) return a; const n = m[1].match(/(\d{5,})$/); if (n && buscarCodigo(n[1])) return buscarCodigo(n[1]); }
  const p = new URLSearchParams(u.search + '&' + (h.split('?')[1] || ''));
  for (const k of ['c', 'cod', 'codigo', 'ref', 'art', 'id']) if (p.get(k) && buscarCodigo(p.get(k))) return buscarCodigo(p.get(k));
  for (const t of (u.pathname + '/' + h).split(/[\/\-_.#]/).filter(Boolean).reverse()) { if (/^\d{5,}$/.test(t) && buscarCodigo(t)) return buscarCodigo(t); }
  return null;
}

/* ---------- utilidades de interfaz ---------- */
function toast(t, ms = 2600) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), ms); }
const vibra = () => { try { navigator.vibrate && navigator.vibrate(60); } catch (e) { } };
function botella(a) {
  const c = (FAM[a.f] || FAM.otros)[1];
  if (a.f === 'accesorios') return `<svg viewBox="0 0 60 120" aria-hidden="true"><path d="M14 10h32c0 22-4 36-16 38-12-2-16-16-16-38z" fill="#fff" stroke="${c}" stroke-width="2.5"/><path d="M17 26h26c-1 12-5 19-13 20-8-1-12-8-13-20z" fill="#83004055"/><path d="M30 48v46M16 100h28" stroke="${c}" stroke-width="3" stroke-linecap="round"/></svg>`;
  if (a.f === 'regalo') return `<svg viewBox="0 0 80 120" aria-hidden="true"><rect x="10" y="44" width="60" height="58" rx="4" fill="${c}"/><rect x="6" y="34" width="68" height="14" rx="3" fill="#830040"/><path d="M40 34v68" stroke="#fff" stroke-width="6"/><path d="M40 34c-8-14-22-10-16-2 3 3 10 2 16 2 6 0 13 1 16-2 6-8-8-12-16 2z" fill="none" stroke="#830040" stroke-width="3.5"/></svg>`;
  if (a.f === 'gourmet') return `<svg viewBox="0 0 70 120" aria-hidden="true"><rect x="12" y="30" width="46" height="70" rx="10" fill="${c}"/><rect x="16" y="22" width="38" height="10" rx="3" fill="#3f4a22"/><rect x="18" y="52" width="34" height="24" rx="3" fill="#fff" opacity=".85"/></svg>`;
  const ancha = a.f === 'destilados', esp = a.f === 'espumosos';
  const cuerpo = ancha ? 'M18 40c0-8 6-12 6-18V12h12v10c0 6 6 10 6 18v68a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z' : 'M22 48c0-12 5-16 5-24V6h6v18c0 8 5 12 5 24v60a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z';
  return `<svg viewBox="0 0 60 116" aria-hidden="true"><path d="${cuerpo}" fill="${c}"/>${esp ? '<path d="M26.5 4h7v20h-7z" fill="#c9a646"/>' : `<path d="${ancha ? 'M24 10h12v6H24z' : 'M27 6h6v8h-6z'}" fill="#3a0a20"/>`}<rect x="${ancha ? 21 : 24}" y="62" width="${ancha ? 18 : 12}" height="22" rx="2" fill="#fff" opacity=".9"/><path d="M${ancha ? 24 : 26} 69h${ancha ? 12 : 8}M${ancha ? 24 : 26} 75h${ancha ? 9 : 6}" stroke="${c}" stroke-width="1.6"/></svg>`;
}
function foto(a) { return a.im ? `<img loading="lazy" alt="" src="${WEB}img/${10000000 + +a.c}.jpg" onerror="this.replaceWith(document.createRange().createContextualFragment(botella(BYC.get('${esc(a.c)}'))))">` : botella(a); }
const tipoTxt = y => String(y || '').replace(/\s*(=<12Meses|>12Meses|3-9Meses|0Meses)\s*/g, ' ').replace(/\s+/g, ' ').trim();
const doCorta = d => String(d || '').replace(/,?\s*(VT\/IGP|AOC|DOC|DOCG)$/, '');
const favs = () => LS.get('favs', []);
const esFav = c => favs().includes(c);
function sellos(a) {
  const s = [];
  if (a.r && a.r <= 60) s.push('<span>Top ventas</span>'); else if (a.nv) s.push('<span class="l">Novedad</span>');
  if ((a.se || []).some(x => /ecol/i.test(x))) s.push('<span class="v">Eco</span>');
  return s.length ? `<div class="sello">${s.join('')}</div>` : '';
}
function tarjeta(a) {
  return `<div class="card" role="button" tabindex="0" data-a="ver" data-v="${esc(a.c)}" style="--c:${(FAM[a.f] || FAM.otros)[1]}">
  <div class="foto">${foto(a)}</div>${sellos(a)}
  <button class="fav ${esFav(a.c) ? 'on' : ''}" data-a="fav" data-v="${esc(a.c)}" aria-label="Favorito">${I.heart}</button>
  <div class="cuerpo"><div class="do">${esc(doCorta(a.d) || FAM[a.f]?.[0] || '')}</div><div class="nom">${esc(a.n)}</div><div class="uva">${esc(a.v || a.y || '')}</div>
  <div class="pie"><span class="precio">${eur(a.p)}</span><span class="cod">${esc(a.c)}</span></div></div></div>`;
}
function abrirHoja(titulo, html, clase = '') {
  cerrarHoja(true);
  const v = document.createElement('div'); v.className = 'velo';
  v.innerHTML = `<div class="hoja ${clase}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"><div class="hoja-cab"><h2>${esc(titulo)}</h2><button class="x" data-a="cerrar" aria-label="Cerrar">${I.x}</button></div><div class="hoja-in">${html}</div></div>`;
  v.addEventListener('click', e => { if (e.target === v) cerrarHoja(); });
  $('#sheet-root').appendChild(v); document.body.style.overflow = 'hidden';
  return v;
}
function cerrarHoja(silencio) {
  const r = $('#sheet-root'); if (!r.firstChild) return;
  r.innerHTML = ''; document.body.style.overflow = '';
  if (!silencio && /^#\/vino\//.test(location.hash)) history.back();
  if (CAM.stop) CAM.stop();
}

/* ---------- estado y catálogo ---------- */
const S = { q: '', fam: LS.get('fam', ''), dop: '', uva: '', estilo: '', min: '', max: '', orden: 'rel', eco: false, nov: false, foto: false, lim: 48 };
function puntuar(a, toks) {
  let p = 0;
  for (const t of toks) {
    if (a._n.includes(t)) p += a._n.split(/\W+/).includes(t) ? 12 : 8;
    else if (a._t.includes(t)) p += 4;
    else return -1;
  }
  return p;
}
function filtrar() {
  const toks = norm(S.q).split(/[\s,]+/).filter(t => t.length > 1 || /\d/.test(t));
  let L = A.map(a => [a, toks.length ? puntuar(a, toks) : 0]).filter(x => x[1] >= 0).map(x => (x[0]._p = x[1], x[0]));
  if (S.fam) L = L.filter(a => a.f === S.fam);
  if (S.dop) L = L.filter(a => a.d === S.dop);
  if (S.uva) { const u = norm(S.uva); L = L.filter(a => uvasDe(a).some(x => norm(x) === u)); }
  if (S.estilo) L = L.filter(a => a.e === S.estilo);
  if (S.min) L = L.filter(a => a.p >= S.min * 100);
  if (S.max) L = L.filter(a => a.p <= S.max * 100);
  if (S.eco) L = L.filter(a => (a.se || []).some(x => /ecol/i.test(x)) || /\beco\b|ecol/i.test(a.n));
  if (S.nov) L = L.filter(a => a.nv);
  if (S.foto) L = L.filter(a => a.im);
  const rk = a => a.r || 9999, vino = a => VINOS.includes(a.f) ? 0 : 1;
  const ord = {
    rel: (x, y) => (y._p - x._p) || vino(x) - vino(y) || rk(x) - rk(y) || x.n.localeCompare(y.n),
    ventas: (x, y) => rk(x) - rk(y) || x.n.localeCompare(y.n),
    pa: (x, y) => x.p - y.p, pd: (x, y) => y.p - x.p,
    nom: (x, y) => norm(x.n).localeCompare(norm(y.n)),
  }[S.orden] || ((x, y) => 0);
  return L.sort(ord);
}
const nFiltros = () => [S.dop, S.uva, S.estilo, S.min, S.max, S.eco, S.nov, S.foto].filter(Boolean).length;
function vistaCatalogo() {
  const L = filtrar();
  const cuenta = {}; for (const a of A) cuenta[a.f] = (cuenta[a.f] || 0) + 1;
  const act = [];
  if (S.dop) act.push(['dop', 'D.O. ' + S.dop]); if (S.uva) act.push(['uva', 'Uva ' + S.uva]); if (S.estilo) act.push(['estilo', S.estilo]);
  if (S.min) act.push(['min', 'Desde ' + S.min + ' €']); if (S.max) act.push(['max', 'Hasta ' + S.max + ' €']);
  if (S.eco) act.push(['eco', 'Ecológicos']); if (S.nov) act.push(['nov', 'Novedades']); if (S.foto) act.push(['foto', 'Con foto']);
  const inicio = !S.q && !S.fam && !nFiltros();
  $('#main').innerHTML = `${inicio ? `<div class="inicio"><div><h2>¿Qué busca el cliente?</h2><p>Pregunta al asistente por voz: «tinto de Ribera para carne de menos de 20 euros»</p></div><a class="btn" href="#/asistente">${I.ia} Preguntar al asistente</a></div>` : ''}
  <div class="fams" role="tablist"><button class="chip ${!S.fam ? 'act' : ''}" data-a="fam" data-v="">Todo <small>${A.length}</small></button>${Object.keys(FAM).filter(k => cuenta[k]).map(k => `<button class="chip ${S.fam === k ? 'act' : ''}" data-a="fam" data-v="${k}" style="--c:${FAM[k][1]}"><i></i>${FAM[k][0]} <small>${cuenta[k]}</small></button>`).join('')}</div>
  <div class="barra"><span class="cuenta" id="cuenta"><b>${L.length}</b> artículo${L.length === 1 ? '' : 's'}${S.q ? ` para «${esc(S.q)}»` : ''}</span>
   <button class="btn" data-a="filtros">${I.filtro} Filtros${nFiltros() ? ` <span class="n">${nFiltros()}</span>` : ''}</button>
   <select class="btn" id="orden" aria-label="Ordenar">${[['rel', 'Más relevantes'], ['ventas', 'Más vendidos'], ['pa', 'Precio: de menor a mayor'], ['pd', 'Precio: de mayor a menor'], ['nom', 'Nombre A-Z']].map(([k, t]) => `<option value="${k}" ${S.orden === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  ${act.length ? `<div class="activos">${act.map(([k, t]) => `<button data-a="quitar" data-v="${k}">${esc(t)} ✕</button>`).join('')}<button data-a="limpiar">Quitar todo</button></div>` : ''}
  ${L.length ? `<div class="grid" id="grid">${L.slice(0, S.lim).map(tarjeta).join('')}</div>${L.length > S.lim ? `<div class="mas"><button class="btn lila" data-a="mas" id="b-mas">Ver más (${L.length - S.lim})</button></div>` : ''}`
      : `<div class="vacio"><b>No hay artículos con esa búsqueda</b>Prueba con menos palabras, quita filtros o pregunta al asistente.<br><br><button class="btn vino" data-a="preguntar" data-v="${esc(S.q)}">${I.ia} Preguntar al asistente</button></div>`}
  ${pie()}`;
  $('#orden').onchange = e => { S.orden = e.target.value; S.lim = 48; vistaCatalogo(); };
  const bm = $('#b-mas'); if (bm && 'IntersectionObserver' in window) new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { ob.disconnect(); S.lim += 48; vistaCatalogo(); } }, { rootMargin: '400px' }).observe(bm);
}
const pie = () => `<footer class="pie-web"><a href="${WEB}" target="_blank" rel="noopener">Tienda online</a><a href="https://tierranuestra.es" target="_blank" rel="noopener">tierranuestra.es</a><a href="https://wa.me/${TIENDA_WA}" target="_blank" rel="noopener">WhatsApp tienda 699 414 559</a><a href="tel:+34959541579">Tienda 959 541 579</a><a href="https://www.instagram.com/tierranuestra.es/" target="_blank" rel="noopener">Instagram</a><span>Precios PVP tienda, IVA incluido · v${VERSION}</span></footer>`;
function hojaFiltros() {
  const h = abrirHoja('Filtros', `
  <div class="fgrupo"><h3>Denominación de origen</h3><select id="f-dop"><option value="">Todas</option>${DOS.map(d => `<option ${S.dop === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
  <div class="fgrupo"><h3>Uva</h3><select id="f-uva"><option value="">Todas</option>${UVAS.map(u => `<option ${S.uva === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
  <div class="fgrupo"><h3>Estilo</h3><div class="chips">${['', ...ESTILOS].map(e => `<button class="chip ${S.estilo === e ? 'act' : ''}" data-fe="${e}">${e || 'Todos'}</button>`).join('')}</div></div>
  <div class="fgrupo"><h3>Precio (€)</h3><div class="dos"><input id="f-min" type="number" inputmode="decimal" min="0" placeholder="Desde" value="${S.min}"><input id="f-max" type="number" inputmode="decimal" min="0" placeholder="Hasta" value="${S.max}"></div></div>
  <div class="fgrupo"><div class="chips"><button class="chip ${S.eco ? 'act' : ''}" data-ft="eco">Ecológicos</button><button class="chip ${S.nov ? 'act' : ''}" data-ft="nov">Novedades</button><button class="chip ${S.foto ? 'act' : ''}" data-ft="foto">Con foto</button></div></div>
  <div class="dos"><button class="btn" data-a="limpiar">Quitar filtros</button><button class="btn vino" id="f-ok" style="justify-content:center">Ver resultados</button></div>`);
  let est = S.estilo; const tg = { eco: S.eco, nov: S.nov, foto: S.foto };
  $$('[data-fe]', h).forEach(b => b.onclick = () => { est = b.dataset.fe; $$('[data-fe]', h).forEach(x => x.classList.toggle('act', x === b)); });
  $$('[data-ft]', h).forEach(b => b.onclick = () => { tg[b.dataset.ft] = !tg[b.dataset.ft]; b.classList.toggle('act'); });
  $('#f-ok').onclick = () => { Object.assign(S, { dop: $('#f-dop').value, uva: $('#f-uva').value, estilo: est, min: $('#f-min').value, max: $('#f-max').value, ...tg, lim: 48 }); cerrarHoja(); irA('#/'); vistaCatalogo(); };
}

/* ---------- conocimiento del vino: maridaje, temperatura, argumento ---------- */
function perfil(a) {
  const n = norm(a.n + ' ' + (a.y || '')), f = a.f;
  if (f === 'generosos' || /fino|manzanilla|amontillado|oloroso|palo cortado|pedro xim|\bpx\b|moscatel|cream|oporto|porto/.test(n)) {
    if (/manzanilla|\bfino\b/.test(n)) return { m: 'jamón ibérico, gambas, pescaíto frito, marisco y aceitunas', t: '6–8 °C', k: 'fino' };
    if (/amontillado/.test(n)) return { m: 'consomé, alcachofas, setas, atún y quesos curados', t: '12–14 °C', k: 'amontillado' };
    if (/oloroso|palo cortado/.test(n)) return { m: 'carnes guisadas, caza, rabo de toro y quesos curados', t: '12–14 °C', k: 'oloroso' };
    if (/pedro xim|\bpx\b|moscatel|cream|dulce|oporto|porto/.test(n)) return { m: 'postres, chocolate, foie y quesos azules', t: '10–12 °C', k: 'dulce' };
    return { m: 'aperitivo, jamón, frutos secos y quesos', t: '8–12 °C', k: 'generoso' };
  }
  if (f === 'espumosos' || /cava|champagne|brut|espumos/.test(n)) return { m: 'aperitivo, marisco, ostras, fritura, sushi y celebraciones', t: '6–8 °C', k: 'espumoso' };
  if (f === 'blancos') return /crianza|fb|barrica|fermentado/.test(n) ? { m: 'pescados en salsa, arroces, aves y quesos semicurados', t: '10–12 °C', k: 'blanco crianza' } : { m: 'marisco, pescado a la plancha, ensaladas y cocina asiática', t: '8–10 °C', k: 'blanco joven' };
  if (f === 'rosados') return { m: 'arroces, pastas, ensaladas y cocina mediterránea', t: '8–10 °C', k: 'rosado' };
  if (f === 'tintos' || f === 'formatos') {
    if (/gran reserva|reserva|>12|36m/.test(n) || a.e === 'Potente') return { m: 'carnes rojas, cordero asado, caza y quesos curados', t: '17–18 °C', k: 'reserva' };
    if (/crianza|24m/.test(n) || a.e === 'Maduro') return { m: 'carnes a la brasa, guisos, ibéricos y quesos curados', t: '16–18 °C', k: 'crianza' };
    if (/roble|barrica|3-9/.test(n)) return { m: 'arroces de carne, embutidos, ibéricos y quesos semicurados', t: '15–16 °C', k: 'roble' };
    return { m: 'tapas, embutidos, pasta, pizza y carnes blancas', t: '14–16 °C', k: 'joven' };
  }
  if (f === 'destilados') return { m: 'sobremesa y coctelería', t: /gin|ginebra|vodka/.test(n) ? 'muy frío, con hielo' : 'a temperatura ambiente o con un hielo', k: 'destilado' };
  return null;
}
const ESTILO_TXT = { Ligero: 'ligero y fácil de beber', Afrutado: 'afrutado y amable', Maduro: 'maduro, redondo y con cuerpo medio', Potente: 'potente, con estructura y largo' };
function argumento(a) {
  if (!VINOS.includes(a.f) && a.f !== 'destilados') return '';
  const p = perfil(a), tipo = (a.y || FAM[a.f][0]).replace(/\s*\(.*?\)|=<12Meses|>12Meses|3-9Meses|0Meses/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const fr = [];
  fr.push(`<b>${esc(a.n)}</b> es un ${esc(tipo)}${a.d ? ` de la ${/^(vino|otras|vinos|licor|gin|whisk|ron)/i.test(a.d) ? '' : 'D.O. '}${esc(doCorta(a.d))}` : ''}${a.z ? ` (${esc(a.z.split(' - ')[0])})` : ''}${a.v ? `, elaborado con ${esc(a.v.toLowerCase())}` : ''}.`);
  if (a.e) fr.push(`De estilo ${ESTILO_TXT[a.e] || a.e.toLowerCase()}.`);
  if (p) fr.push(`Ideal con ${p.m}. Servir a ${p.t}.`);
  if (a.r && a.r <= 100) fr.push('Es de los que más vendemos en la tienda: una apuesta segura.');
  else if (a.nv) fr.push('Es una de nuestras novedades.');
  if ((a.se || []).some(x => /ecol/i.test(x))) fr.push('Elaborado en ecológico.');
  return fr.join(' ');
}
function similares(a) {
  const pr = a.p;
  return A.filter(b => b !== a && b.f === a.f && Math.abs(b.p - pr) <= Math.max(400, pr * 0.3))
    .map(b => [b, (b.d && b.d === a.d ? 3 : 0) + (b.e && b.e === a.e ? 2 : 0) + (uvasDe(b).some(u => uvasDe(a).includes(u)) ? 2 : 0) + (b.r ? 1 : 0) - Math.abs(b.p - pr) / Math.max(pr, 1)])
    .sort((x, y) => y[1] - x[1]).slice(0, 10).map(x => x[0]);
}
const enlaceWeb = a => a.s ? `${WEB_ABS}#/vino/${a.s}` : `${WEB_ABS}#/tienda?q=${encodeURIComponent(a.n)}`;
function qrSVG(t) { try { const q = qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { return ''; } }

/* ---------- ficha del vino ---------- */
function verFicha(c, desdeHash) {
  const a = BYC.get(String(c)); if (!a) { toast('No encuentro ese artículo'); return; }
  if (!desdeHash) { history.pushState(null, '', '#/vino/' + encodeURIComponent(a.c)); }
  const rec = LS.get('rec', []).filter(x => x !== a.c); rec.unshift(a.c); LS.set('rec', rec.slice(0, 30));
  const p = perfil(a), arg = argumento(a), sim = similares(a), web = enlaceWeb(a);
  const dato = (t, v, ancho) => v ? `<div class="dato ${ancho ? 'ancho' : ''}"><span class="cap">${t}</span><b>${esc(v)}</b></div>` : '';
  const h = abrirHoja(FAM[a.f]?.[0] || 'Artículo', `<div class="ficha">
   <div class="ficha-top"><div class="ficha-foto">${foto(a)}</div><div>
    <div class="cap" style="color:var(--lila)">${esc(doCorta(a.d) || FAM[a.f]?.[0] || '')}</div><h1>${esc(a.n)}</h1>
    <div class="precio">${eur(a.p)}</div><div class="iva">PVP tienda · IVA incluido</div>
    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn ${esFav(a.c) ? 'vino' : ''}" data-a="fav" data-v="${esc(a.c)}" id="b-fav">${I.heart} ${esFav(a.c) ? 'En favoritos' : 'Favorito'}</button>${'speechSynthesis' in window && arg ? `<button class="btn" data-a="leer" data-v="${esc(a.c)}">${I.altavoz} Leer</button>` : ''}</div>
   </div></div>
   <div class="datos">${dato('Tipo', tipoTxt(a.y))}${dato('D.O. / categoría', a.d)}${dato('Uvas', (a.v || '').replace(/\s*,\s*/g, ', '), (a.v || '').length > 28)}${dato('Estilo', a.e)}${dato('Añada', a.an)}${dato('Formato', a.fm)}${dato('Graduación', a.g)}${dato('Zona', a.z, true)}${dato('Bodega / proveedor', a.o, true)}${dato('Código', a.c)}${a.r ? dato('Ranking ventas', 'Nº ' + a.r + ' de la tienda') : ''}</div>
   ${arg ? `<div class="bloque arg"><h3 class="cap">${I.ia.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} Argumento de venta</h3><p>${arg}</p></div>` : ''}
   ${p ? `<div class="bloque"><h3 class="cap">Maridaje y servicio</h3><p>${esc(p.m[0].toUpperCase() + p.m.slice(1))}. <b>Temperatura:</b> ${esc(p.t)}.</p></div>` : ''}
   ${a.t ? `<div class="bloque"><h3 class="cap">Descripción</h3><p>${esc(a.t)}</p></div>` : ''}
   ${a.pu ? `<div class="bloque"><h3 class="cap">Puntuación</h3><p>${esc(typeof a.pu === 'object' ? JSON.stringify(a.pu) : a.pu)}</p></div>` : ''}
   <div class="enlaces">
    <a class="btn vino" href="${esc(web)}" target="_blank" rel="noopener">${I.web} Ver en la web</a>
    ${a.fi ? `<a class="btn" href="${WEB}fichas/${10000000 + +a.c}.pdf" target="_blank" rel="noopener">${I.pdf} Ficha técnica</a>` : `<a class="btn" href="https://tierranuestra.es/?s=${encodeURIComponent(a.n.replace(/\d+\s?cl.*$/i, ''))}&post_type=product" target="_blank" rel="noopener">${I.shop} tierranuestra.es</a>`}
    <a class="btn" href="https://wa.me/?text=${encodeURIComponent(`${a.n} · ${eur(a.p)} (PVP tienda, IVA incl.)\nTierra Nuestra · C/ Fernando el Católico, 34 · Huelva · WhatsApp 699 414 559\n${web}`)}" target="_blank" rel="noopener">${I.wa} WhatsApp cliente</a>
    <button class="btn" data-a="compartir" data-v="${esc(a.c)}">${I.share} Compartir</button>
   </div>
   <div class="bloque qrw"><div class="qr">${qrSVG(web)}</div><p><b>Que el cliente lo escanee</b><br><span style="color:var(--gris);font-size:14px">Abre la ficha de este vino en la tienda online.</span></p></div>
   ${(a.b || []).length ? `<div class="bloque"><h3 class="cap">Códigos de barras</h3><p class="codes">${a.b.map(esc).join(' · ')}</p></div>` : ''}
   ${sim.length ? `<div class="seccion"><h2>Alternativas de precio parecido</h2></div><div class="mini">${sim.map(tarjeta).join('')}</div>` : ''}
  </div>`);
  h.querySelector('.hoja').scrollTop = 0;
  return h;
}

/* ---------- cámara: BarcodeDetector nativo o ZXing ---------- */
const CAM = {};
let ZX = null;
function cargarZXing() { if (window.ZXing) return Promise.resolve(); return ZX || (ZX = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'assets/zxing.min.js'; s.onload = ok; s.onerror = () => { ZX = null; ko(new Error('zxing')); }; document.head.appendChild(s); })); }
async function crearLector() {
  if ('BarcodeDetector' in window) {
    try {
      const sop = await BarcodeDetector.getSupportedFormats();
      const fm = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'itf', 'code_39', 'qr_code'].filter(f => sop.includes(f));
      if (fm.includes('ean_13')) { const d = new BarcodeDetector({ formats: fm }); return { tipo: 'nativo', leer: async v => { const r = await d.detect(v); return r.length ? r[0].rawValue : null; } }; }
    } catch (e) { }
  }
  await cargarZXing();
  const Z = window.ZXing, hints = new Map(), F = Z.BarcodeFormat;
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.ITF, F.CODE_39, F.QR_CODE]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const rd = new Z.MultiFormatReader(); rd.setHints(hints);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  return { tipo: 'zxing', leer: async v => {
    const w = v.videoWidth, h = v.videoHeight; if (!w || !h) return null;
    const k = Math.min(1, 960 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    cx.drawImage(v, 0, 0, cv.width, cv.height);
    try { return rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))).getText(); } catch (e) { rd.reset(); return null; }
  } };
}
function resultadoCodigo(code) {
  const a = codigoDeTexto(code);
  if (a) { vibra(); cerrarHoja(true); verFicha(a.c); return true; }
  return false;
}
async function camara() {
  const h = abrirHoja('Escanear código de barras', `<div class="cam"><video id="cam-v" playsinline autoplay muted></video><div class="mira"></div></div>
   <p class="cam-msg" id="cam-msg">Apunta al código de barras de la botella (o a un QR de la web).</p>
   <form class="manual" id="cam-f"><input id="cam-in" inputmode="numeric" placeholder="O escribe el código / usa la pistola lectora" autocomplete="off"><button class="btn vino">Buscar</button></form>`);
  $('#cam-f').onsubmit = e => { e.preventDefault(); const v = $('#cam-in').value; if (!resultadoCodigo(v)) toast(`El código ${v} no está en el catálogo`); };
  const msg = t => { const m = $('#cam-msg'); if (m) m.innerHTML = t; };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg('Este navegador no deja usar la cámara. Ábrelo en Chrome o Safari (con https). Puedes escribir el código abajo.'); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
  catch (e) { msg(e && e.name === 'NotAllowedError' ? 'Permite el uso de la cámara en el navegador (icono del candado) y vuelve a intentarlo.' : 'No se pudo abrir la cámara. Puedes escribir el código abajo.'); return; }
  if (!document.body.contains(h)) { stream.getTracks().forEach(t => t.stop()); return; }
  let vivo = true; const v = $('#cam-v'); v.srcObject = stream;
  CAM.stop = () => { vivo = false; stream.getTracks().forEach(t => t.stop()); CAM.stop = null; };
  let lector; try { lector = await crearLector(); } catch (e) { msg('No se pudo cargar el lector. Revisa la conexión.'); return; }
  window.__camLector = lector.tipo;
  let ultimo = '';
  const loop = async () => {
    if (!vivo) return;
    let code = null; try { code = await lector.leer(v); } catch (e) { }
    if (code && code !== ultimo) { ultimo = code; if (resultadoCodigo(code)) return; msg(`<b style="color:#b91c1c">El código ${esc(code.slice(0, 60))} no está en el catálogo de la tienda.</b><br>Prueba con otro código de la botella.`); }
    setTimeout(loop, lector.tipo === 'nativo' ? 150 : 220);
  };
  if (v.readyState >= 2) loop(); else v.onloadeddata = loop;
}

/* ---------- voz ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let REC = null;
function microfono(alTexto, boton) {
  if (!SR) { toast('Tu navegador no tiene dictado por voz. Usa Chrome (Android) o Safari (iPhone).', 3500); return; }
  if (REC) { try { REC.stop(); } catch (e) { } return; }
  const r = new SR(); REC = r; r.lang = 'es-ES'; r.interimResults = false; r.maxAlternatives = 1;
  boton && boton.classList.add('on'); toast('Te escucho…', 6000);
  r.onresult = e => { const t = e.results[0][0].transcript; toast('«' + t + '»'); alTexto(t); };
  r.onerror = e => toast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Permite el micrófono en el navegador para hablar.' : e.error === 'no-speech' ? 'No te he oído. Pulsa el micrófono y habla.' : 'No se pudo usar el micrófono', 3500);
  r.onend = () => { REC = null; $$('.ib.on,.btn.on').forEach(b => b.classList.remove('on')); };
  try { r.start(); } catch (e) { REC = null; boton && boton.classList.remove('on'); }
}
function hablar(html) {
  if (!('speechSynthesis' in window)) return;
  const t = String(html).replace(/<[^>]+>/g, ' ').replace(/€/g, ' euros').replace(/\s+/g, ' ').trim();
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; const v = speechSynthesis.getVoices().find(v => /^es(-|_)ES/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) { }
}
const esPregunta = t => /\b(para|recomien|aconsej|suger|menos de|hasta|entre|que (vino|tinto|blanco)|cual|maridaje|regalo|regalar|barato|celebrar|diferencia|que es|como|cuanto|precio de)\b/.test(norm(t));

/* ---------- asistente ---------- */
const NUM = { diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
function precioDe(t) {
  t = t.replace(/\b[a-z]+\b/g, w => NUM[w] != null ? String(NUM[w]) : w).replace(/(\d),(\d)/g, '$1.$2');
  let m;
  if ((m = t.match(/entre (\d+(?:\.\d+)?) y (\d+(?:\.\d+)?)/))) return [+m[1] * 100, +m[2] * 100];
  if ((m = t.match(/(?:menos de|hasta|maximo|max|no mas de|por debajo de|inferior a|que no pase de|de) (\d+(?:\.\d+)?) ?(?:€|eur|euro|pavo)/)) || (m = t.match(/(?:menos de|hasta|maximo|no mas de|por debajo de) (\d+(?:\.\d+)?)/))) return [0, +m[1] * 100];
  if ((m = t.match(/(?:mas de|desde|minimo|por encima de|superior a) (\d+(?:\.\d+)?)/))) return [+m[1] * 100, Infinity];
  if ((m = t.match(/(?:unos|sobre|alrededor de|aprox\w* |por) (\d+(?:\.\d+)?)/)) || (m = t.match(/(\d+(?:\.\d+)?) ?(?:€|eur|euro)/))) return [+m[1] * 75, +m[1] * 125];
  if (/\b(barat|economic|asequible|poco dinero)/.test(t)) return [0, 1200];
  if (/\b(caro|premium|top|lujo|muy especial|alta gama|exclusiv)/.test(t)) return [3500, Infinity];
  return null;
}
const COMIDAS = [
  [/carne|chulet|entrecot|solomillo|ternera|buey|vaca|cordero|cochinillo|cabrito|barbacoa|brasa|asado|parrilla|rabo|guiso|estofado|caza|venado|jabali|perdiz/, ['tintos', 'formatos'], 'carne', a => /crianza|reserva|24m|36m/i.test(a.y + a.n) || ['Maduro', 'Potente'].includes(a.e)],
  [/pescado|marisco|gamba|langostino|ostra|almeja|pulpo|calamar|choco|sushi|lubina|dorada|merluza|bacalao|atun|salmon|coquina|chirla|cigala|bogavante/, ['blancos', 'espumosos', 'generosos'], 'pescado y marisco', a => a.f !== 'generosos' || /fino|manzanilla/i.test(a.n)],
  [/frito|fritura|pescaito|tapeo|tapas|aperitivo|aceituna/, ['generosos', 'espumosos', 'blancos'], 'aperitivo y fritos', a => a.f !== 'generosos' || /fino|manzanilla/i.test(a.n)],
  [/jamon|iberico|embutido|chorizo|lomo/, ['generosos', 'tintos'], 'jamón e ibéricos', a => a.f === 'tintos' ? !/reserva/i.test(a.y || '') : /fino|manzanilla|amontillado/i.test(a.n)],
  [/arroz|paella|risotto/, ['blancos', 'rosados', 'tintos'], 'arroces', a => a.f !== 'tintos' || /roble|joven|3-9|0meses/i.test(a.y || '') || ['Ligero', 'Afrutado'].includes(a.e)],
  [/pasta|pizza|lasana|italian/, ['tintos', 'rosados'], 'pasta y pizza', a => a.f === 'rosados' || /roble|joven|3-9|0meses/i.test(a.y || '') || ['Ligero', 'Afrutado'].includes(a.e)],
  [/queso/, ['tintos', 'generosos', 'blancos'], 'quesos', a => a.f !== 'blancos' || /crianza|fb/i.test(a.y || '')],
  [/postre|chocolate|tarta|dulce|foie|helado/, ['generosos'], 'postres', a => /pedro|px|moscatel|cream|dulce|oporto|porto/i.test(a.n + a.y)],
  [/ensalada|verdura|vegetal|asiatic|ceviche/, ['blancos', 'rosados'], 'ensaladas y verduras', () => true],
  [/celebr|brindis|boda|cumple|nochevieja|fiesta|aniversario/, ['espumosos'], 'celebrar', () => true],
];
const TIPOS = [
  [/champa(n|gne)/, a => /champagne/i.test(a.d || '') || /champagne/i.test(a.n), 'champagne'],
  [/\bcava\b/, a => /cava/i.test(a.d || '') || /\bcava\b/i.test(a.n), 'cava'],
  [/\b(espumos|burbuja|brut|corpinnat)/, a => a.f === 'espumosos', 'espumosos'],
  [/\bmanzanilla/, a => /manzanilla/i.test(a.n), 'manzanilla'], [/\bfino\b/, a => a.f === 'generosos' && /\bfino\b/i.test(a.n.replace(/tinto fino|palomino fino/ig, '')), 'fino'],
  [/amontillado/, a => /amontillado/i.test(a.n), 'amontillado'], [/oloroso/, a => /oloroso/i.test(a.n), 'oloroso'], [/palo cortado/, a => /palo cortado/i.test(a.n), 'palo cortado'],
  [/pedro xim|\bpx\b/, a => /pedro xim|\bpx\b/i.test(a.n), 'Pedro Ximénez'], [/oporto|porto/, a => /oporto|porto/i.test(a.n + (a.d || '')), 'oporto'],
  [/generos|jerez|sherry|vino dulce|vinos dulces/, a => a.f === 'generosos', 'generosos'],
  [/vermut|vermouth/, a => /verm/i.test(a.n + (a.y || '')), 'vermut'],
  [/ginebra|\bgin\b/, a => /gin/i.test((a.y || '') + (a.d || '')) || /\bgin\b|ginebra/i.test(a.n), 'ginebra'], [/\bron\b/, a => /\bron\b/i.test((a.y || '') + ' ' + (a.d || '') + ' ' + a.n), 'ron'],
  [/whisk/, a => /whisk/i.test(a.n + (a.y || '') + (a.d || '')), 'whisky'], [/brandy|cognac|cognag|conac/, a => /brandy|cognac|armagnac/i.test(a.n + (a.y || '') + (a.d || '')), 'brandy y cognac'],
  [/vodka/, a => /vodka/i.test(a.n + (a.y || '')), 'vodka'], [/licor\b|licores|destilad|tequila|mezcal/, a => a.f === 'destilados', 'destilados'],
  [/magnum|gran formato/, a => a.f === 'formatos' || /magnum/i.test(a.n), 'magnum'],
  [/\bcesta|estuche|lote/, a => a.f === 'regalo', 'cestas y estuches'],
  [/\bcopa|riedel|cristaler|decantador|sacacorcho/, a => a.f === 'accesorios', 'cristalería y accesorios'],
  [/\btint/, a => a.f === 'tintos' || (a.f === 'formatos' && /tint/i.test(a.y + a.n)), 'tintos'],
  [/\bblanc/, a => a.f === 'blancos', 'blancos'], [/\brosad/, a => a.f === 'rosados', 'rosados'],
];
const CRIANZAS = [[/gran reserva/, a => /gran reserva|\bg\.? ?r(va)?\b/i.test(a.n), 'gran reserva'], [/\breserva/, a => /reserva|>12/i.test(a.y || '') || /\b(reserva|rva)\b/i.test(a.n), 'reserva'], [/crianza/, a => /crianza|=<12/i.test(a.y || '') || /\b(crianza|crza|cza)\b/i.test(a.n), 'crianza'], [/roble|barrica/, a => /roble|barrica/i.test((a.y || '') + a.n), 'roble'], [/joven/, a => /joven|0meses/i.test(a.y || ''), 'joven']];
const ALIAS_DO = [[/ribera/, 'Ribera del Duero'], [/rioja/, 'Rioja'], [/huelva|condado/, 'Condado de Huelva'], [/jerez|sanlucar|sherry/, 'Jerez-Xérès-Sherry y Manzanilla'], [/rias baixas|albarino/, 'Rías Baixas'], [/\btoro\b/, 'Toro'], [/rueda/, 'Rueda'], [/priorat/, 'Priorat'], [/bierzo/, 'Bierzo'], [/jumilla/, 'Jumilla'], [/somontano/, 'Somontano'], [/navarra/, 'Navarra'], [/penedes/, 'Penedes'], [/valdeorras/, 'Valdeorras'], [/ribeiro/, 'Ribeiro'], [/monsant/, 'Montsant'], [/montilla/, 'Montilla-Moriles'], [/malaga/, 'Malaga-Sierras de Malaga']];
const REGIONES = [/galicia/, /andaluc/, /cataluna/, /castilla y leon/, /castilla.la mancha|la mancha/, /pais vasco/, /aragon/, /murcia/, /valencia/, /extremadura/, /madrid/, /canarias/, /baleares|mallorca/, /francia|burdeos|borgona/, /italia|toscana|piamonte/, /portugal|douro/];
const FAQ = [
  [/(diferencia|que es|que significa).*(crianza|reserva|roble)|(crianza|reserva).*(diferencia|vs)/, 'En tinto: <b>Joven</b>, sin paso por barrica o muy corto. <b>Roble</b>: paso corto por barrica (unos 3–9 meses), sin mención legal. <b>Crianza</b>: al menos 24 meses de envejecimiento, 6 en barrica (12 en Rioja y Ribera del Duero). <b>Reserva</b>: al menos 36 meses, 12 en barrica. <b>Gran Reserva</b>: al menos 60 meses, 18 en barrica (24 en Rioja).'],
  [/fino|manzanilla|amontillado|oloroso|palo cortado|pedro xim|\bpx\b|generoso/, '<b>Fino</b> y <b>Manzanilla</b>: crianza bajo velo de flor, secos, salinos (la Manzanilla solo en Sanlúcar). Fríos, 6–8 °C, con jamón, marisco y fritos. <b>Amontillado</b>: empieza bajo flor y termina oxidativo, frutos secos. <b>Oloroso</b>: crianza oxidativa, más cuerpo, para guisos y quesos. <b>Palo Cortado</b>: nariz de amontillado y boca de oloroso. <b>Pedro Ximénez</b>: dulce de uva pasificada, con postres y chocolate.'],
  [/brut|nature|semiseco|semi seco|extra seco|azucar/, 'Azúcar en espumosos: <b>Brut Nature</b> menos de 3 g/l (sin azúcar añadido) · <b>Extra Brut</b> hasta 6 · <b>Brut</b> hasta 12 · <b>Extra Seco</b> 12–17 · <b>Seco</b> 17–32 · <b>Semiseco</b> 32–50 · <b>Dulce</b> más de 50 g/l.'],
  [/(cava|champa).*(champa|cava|diferencia)|corpinnat/, 'Cava y Champagne se elaboran igual (método tradicional, segunda fermentación en botella). El <b>Cava</b> es español (sobre todo Penedès; uvas Macabeo, Xarel·lo, Parellada); el <b>Champagne</b>, francés (Chardonnay, Pinot Noir, Pinot Meunier). <b>Corpinnat</b> es una marca colectiva de espumosos del Penedès: ecológicos, vendimia a mano y largas crianzas.'],
  [/temperatura|que frio|a cuantos grados|servir/, 'Temperaturas de servicio: espumosos, finos y manzanillas 6–8 °C · blancos jóvenes y rosados 8–10 °C · blancos con barrica 10–12 °C · tintos jóvenes 14–16 °C · crianzas y reservas 16–18 °C.'],
  [/decant|oxigen|airear/, 'Decantar ayuda a los tintos jóvenes potentes a abrirse (30–60 minutos) y separa los posos en reservas viejos (servir con cuidado, justo antes de beber).'],
  [/abiert|conservar|cuanto dura|aguanta/, 'Una botella abierta, con tapón y en frío: tintos y blancos 3–5 días · espumosos 1–2 días con tapón de cava · finos y manzanillas 3–4 días en nevera · olorosos y PX varias semanas.'],
  [/\bdop\b|\bdoca\b|\bigp\b|vino de pago|denominacion/, '<b>DOP</b>: vino de una zona delimitada con reglas propias. <b>DOCa</b>: el escalón superior (en España solo Rioja y Priorat). <b>Vino de Pago</b>: un único viñedo con calidad reconocida. <b>IGP / Vino de la Tierra</b>: zona más amplia y normas más flexibles.'],
  [/condado de huelva|zalema|vino de huelva|vinos de huelva/, 'La D.O. <b>Condado de Huelva</b> es la de casa: la uva estrella es la <b>Zalema</b> (blancos frescos), y además tiene generosos propios (Condado Pálido y Condado Viejo) y vinos naranja.'],
  [/escane|camara|codigo de barras/, 'Pulsa el botón <b>Escanear</b> (abajo o junto al buscador), apunta al código de barras de la botella y se abre la ficha sola. También vale una pistola lectora: escribe el código en el buscador.'],
];
const VACIAS = new Set('para con de del la las el los lo un una unos unas que me te se le algo vino vinos botella botellas quiero busco buscame tienes tiene teneis hay dame dime recomienda recomiendame recomiendas aconseja aconsejame sugiere sugiereme bueno buena buenos buenas mejor precio euros euro eur menos mas entre hasta sobre alrededor por y o a al en es son muy cliente clienta quiere comer cena comida acompanar maridar maridaje regalo regalar barato barata especial algun alguno alguna otro otra tipo como cual cuales donde ese este esta'.split(' '));
function quePregunta(t) {
  const q = norm(t).replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
  return q;
}
function vinoNombrado(q) {
  const ws = q.split(' ').filter(w => w.length > 2 && !VACIAS.has(w) && !/^(tinto|blanco|rosado|crianza|reserva|roble|joven|uva|uvas|bodega|precio|cuesta|vale|cuanto|denominacion|origen|habla|hablame|cuentame|argumento|informacion|info|ficha|cl|75cl)$/.test(w));
  if (ws.length < 1) return null;
  let best = null, bs = 0;
  for (const a of A) {
    const nw = a._n.split(/[^a-z0-9]+/).filter(w => w.length > 2);
    let s = 0; for (const w of ws) if (nw.includes(w)) s++;
    const mejor = () => (a.f === 'formatos') - (best.f === 'formatos') || (a.r || 9999) - (best.r || 9999) || a.n.length - best.n.length;
    if (s > bs) { bs = s; best = a; } else if (s === bs && s > 0 && mejor() < 0) best = a;
  }
  return bs >= 2 || (bs === 1 && ws.length === 1 && best && best._n.split(' ').length <= 3) ? best : null;
}
function responder(texto) {
  const q = quePregunta(texto);
  if (!q) return { texto: 'Dime qué busca el cliente.', arts: [] };
  // pregunta sobre un vino concreto
  if (/\b(precio|cuesta|vale|cuanto|uva|uvas|variedad|bodega|denominacion|de donde|habla|hablame|cuentame|argumento|como vendo|informacion|info|ficha|que tal es)\b/.test(q)) {
    const a = vinoNombrado(q);
    if (a) {
      let r;
      if (/precio|cuesta|vale|cuanto/.test(q)) r = `<b>${esc(a.n)}</b> cuesta <b>${eur(a.p)}</b> (PVP tienda, IVA incluido).`;
      else if (/uva|variedad/.test(q)) r = a.v ? `<b>${esc(a.n)}</b> está elaborado con <b>${esc(a.v)}</b>.` : `No tengo la uva de <b>${esc(a.n)}</b> en la ficha.`;
      else if (/bodega|de donde|denominacion/.test(q)) r = `<b>${esc(a.n)}</b>: ${a.d ? `D.O. <b>${esc(a.d)}</b>` : 'sin D.O. en la ficha'}${a.z ? `, zona ${esc(a.z)}` : ''}${a.o ? `. Bodega / proveedor: <b>${esc(a.o)}</b>` : ''}.`;
      else r = argumento(a) || `<b>${esc(a.n)}</b> · ${eur(a.p)}.`;
      return { texto: r + ' Toca la tarjeta para ver la ficha completa.', arts: [a, ...similares(a).slice(0, 3)] };
    }
  }
  const tiposM = TIPOS.filter(([re]) => re.test(q));
  // pregunta de conocimiento (sin pedir recomendación)
  const pideVino = /\b(recomien|aconsej|suger|quiero|busco|tienes|hay|dame|para|algo|regal|menos de|hasta|entre|euros|€)\b/.test(q);
  if (!pideVino || /diferencia|que es|que significa|temperatura|decant|conservar|abiert|cuanto dura|como (se )?escane/.test(q)) for (const [re, r] of FAQ) if (re.test(q)) return { texto: r, arts: [], faq: true };
  let L = A.slice(); const motivos = [];
  let tipos = tiposM;
  if (tipos.some(t => ['champagne', 'cava'].includes(t[2]))) tipos = tipos.filter(t => t[2] !== 'espumosos');
  if (tipos.some(t => ['manzanilla', 'fino', 'amontillado', 'oloroso', 'palo cortado', 'Pedro Ximénez', 'oporto'].includes(t[2]))) tipos = tipos.filter(t => t[2] !== 'generosos');
  if (tipos.some(t => ['ginebra', 'ron', 'whisky', 'brandy y cognac', 'vodka'].includes(t[2]))) tipos = tipos.filter(t => t[2] !== 'destilados');
  if (tipos.some(t => t[2] === 'magnum')) tipos = tipos.filter(t => t[2] === 'magnum');
  if (tipos.length) { L = L.filter(a => tipos.some(t => t[1](a))); motivos.push(tipos.map(t => t[2]).join(' o ')); }
  const comida = COMIDAS.find(([re]) => re.test(q));
  if (comida) {
    if (!tipos.length) L = L.filter(a => comida[1].includes(a.f));
    const pref = L.filter(comida[3]); if (pref.length >= 3) L = pref;
    motivos.push('para ' + comida[2]);
  }
  const cr = CRIANZAS.find(([re]) => re.test(q));
  if (cr) { const x = L.filter(cr[1]); if (x.length) { L = x; motivos.push(cr[2]); } }
  let dop = ALIAS_DO.find(([re]) => re.test(q));
  let dopName = dop ? dop[1] : (DOS.find(d => d.length > 3 && q.includes(norm(doCorta(d)))) || null);
  if (dopName) { const x = L.filter(a => a.d && norm(a.d).startsWith(norm(dopName).slice(0, 6))); if (x.length) { L = x; motivos.push('de ' + doCorta(dopName)); } else dopName = null; }
  if (!dopName) { const rg = REGIONES.find(re => re.test(q)); if (rg) { const x = L.filter(a => rg.test(norm((a.z || '') + ' ' + (a.d || '')))); if (x.length) { L = x; motivos.push('de ' + q.match(rg)[0]); } } }
  const uva = UVAS.filter(u => norm(u).length > 3 && new RegExp('\\b' + norm(u).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(q)).sort((x, y) => y.length - x.length)[0];
  if (uva) { const x = L.filter(a => norm(a.v || '').includes(norm(uva))); if (x.length) { L = x; motivos.push('con ' + uva); } }
  if (/ecolog|organic|\bbio\b|natural/.test(q)) { const x = L.filter(a => (a.se || []).some(s => /ecol/i.test(s)) || /\beco\b|ecol/i.test(a.n)); if (x.length) { L = x; motivos.push('ecológicos'); } }
  if (/novedad|nuevo|ultimo que ha llegado/.test(q)) { const x = L.filter(a => a.nv); if (x.length) { L = x; motivos.push('novedades'); } }
  for (const e of ESTILOS) if (new RegExp('\\b' + norm(e)).test(q)) { const x = L.filter(a => a.e === e); if (x.length) { L = x; motivos.push(e.toLowerCase()); } }
  if (/\b(suave|facil|ligero|fresco)\b/.test(q) && !motivos.some(m => /ligero|afrutado/.test(m))) { const x = L.filter(a => ['Ligero', 'Afrutado'].includes(a.e)); if (x.length >= 3) { L = x; motivos.push('suaves'); } }
  if (/\b(potente|con cuerpo|intenso|fuerte|estructura)\b/.test(q) && !motivos.includes('potente')) { const x = L.filter(a => ['Maduro', 'Potente'].includes(a.e)); if (x.length >= 3) { L = x; motivos.push('con cuerpo'); } }
  let pr = precioDe(q);
  const regalo = /regal|detalle|quedar bien|obsequio/.test(q);
  if (!pr && regalo) pr = [2000, Infinity];
  if (pr) { const x = L.filter(a => a.p >= pr[0] && a.p <= pr[1]); L = x; motivos.push(pr[1] === Infinity ? `desde ${eur(pr[0])}` : pr[0] > 0 ? `entre ${eur(pr[0])} y ${eur(pr[1])}` : `hasta ${eur(pr[1])}`); }
  // palabras sueltas (bodega, nombre, zona…)
  const usadas = [...tiposM.map(t => t[0]), ...(comida ? [comida[0]] : []), ...(cr ? [cr[0]] : []), ...(dop ? [dop[0]] : [])];
  const extra = q.split(' ').filter(w => w.length > 3 && !VACIAS.has(w) && !/^\d/.test(w) && !usadas.some(re => re.test(w)) && !(uva && norm(uva).includes(w)) && !(dopName && norm(dopName).includes(w)) && !NUM[w] && !/^(ecolog|organic|novedad|nuevo|suave|facil|ligero|fresco|potente|cuerpo|intenso|fuerte|maduro|afrutado|regal|celebr|comprar|vender|tienda|caro|barat|economic|premium|detalle|gasta|gastar|amigo|amiga|padre|madre|jefe|navidad|algo|cosa|marido|mujer|pareja|suegr)/.test(w));
  let sc = L.map(a => { let p = 0; for (const w of extra) if (a._t.includes(w.length > 5 ? w.slice(0, -1) : w)) p += 10; if (a.r) p += Math.max(0, 6 - a.r / 70); if (VINOS.includes(a.f)) p += 1; return [a, p]; });
  if (extra.length) { const con = sc.filter(x => x[1] >= 10); if (con.length) { sc = con; motivos.push(extra.map(w => '«' + w + '»').join(' ')); } }
  if (/mas vendid|lo que mas se vende|exito|top/.test(q)) motivos.push('los más vendidos');
  sc.sort((x, y) => y[1] - x[1] || (x[0].r || 9999) - (y[0].r || 9999) || x[0].p - y[0].p);
  if (!motivos.length) {
    for (const [re, r] of FAQ) if (re.test(q)) return { texto: r, arts: [], faq: true };
    return { texto: 'No te he entendido del todo. Dime el <b>tipo de vino</b>, <b>para qué comida</b> o <b>cuánto quiere gastar</b>. Por ejemplo: «tinto para carne de menos de 15 euros», «blanco de Huelva para pescado» o «¿qué uva lleva el Pago de Carraovejas?».', arts: [] };
  }
  const arts = sc.slice(0, 8).map(x => x[0]);
  if (!arts.length) return { texto: `No tengo artículos ${motivos.join(', ')}. Prueba a ampliar el precio o cambiar el tipo.`, arts: [] };
  const p0 = perfil(arts[0]);
  let r = `Te propongo ${sc.length > 8 ? 'estos' : 'estos ' + arts.length} ${motivos.join(', ')}. El primero, <b>${esc(arts[0].n)}</b> (${eur(arts[0].p)})${arts[0].r && arts[0].r <= 100 ? ', es de los más vendidos' : ''}${p0 && comida ? `; servir a ${p0.t}` : ''}.`;
  if (sc.length > 8) r += ` Hay ${sc.length} en total.`;
  return { texto: r, arts, total: sc.length };
}
const CHAT = [];
function vistaAsistente() {
  const voz = LS.get('voz', true);
  $('#main').innerHTML = `<div class="ia-cab"><div class="av">${I.ia}</div><div><h2>Asistente de vinos</h2><div style="color:var(--gris);font-size:13.5px">Pregunta escribiendo o con el micrófono. Responde con lo que hay en la tienda.</div></div></div>
   <label class="voz"><input type="checkbox" id="ia-voz" ${voz ? 'checked' : ''}> Leer las respuestas en voz alta</label>
   <div class="chat" id="chat">${CHAT.length ? '' : `<div class="msg ia"><p>Hola 👋 Soy el asistente de la tienda. Te ayudo a recomendar vino, a encontrar precios, uvas y bodegas, y a resolver dudas del cliente.</p>
   <div class="sugs">${['Tinto de Ribera para carne de menos de 20 €', 'Blanco de Huelva para pescado', 'Espumoso para celebrar', 'Regalo especial de unos 40 €', 'Fino para el jamón', '¿Diferencia entre crianza y reserva?', 'Ecológicos', 'Los más vendidos'].map(c => `<button data-a="preguntar" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`}</div>
   <div class="ask"><form id="ia-f"><input id="ia-q" placeholder="Ej.: rosado para arroz de menos de 12 €" autocomplete="off" enterkeyhint="send" aria-label="Pregunta">${SR ? `<button type="button" class="ib" id="ia-mic" aria-label="Preguntar con la voz">${I.mic}</button>` : ''}<button class="btn vino">Enviar</button></form></div>`;
  const ch = $('#chat'); for (const m of CHAT) ch.insertAdjacentHTML('beforeend', m);
  $('#ia-voz').onchange = e => { LS.set('voz', e.target.checked); if (!e.target.checked && 'speechSynthesis' in window) speechSynthesis.cancel(); };
  $('#ia-f').onsubmit = e => { e.preventDefault(); preguntar($('#ia-q').value); };
  const m = $('#ia-mic'); if (m) m.onclick = () => microfono(t => preguntar(t, true), m);
  window.scrollTo(0, document.body.scrollHeight);
}
function preguntar(t, porVoz) {
  t = String(t || '').trim(); if (!t) return;
  if (!/^#\/asistente/.test(location.hash)) { irA('#/asistente'); }
  const r = responder(t);
  const html = `<div class="msg yo">${esc(t)}</div><div class="msg ia"><p>${r.texto}</p>${r.arts.length ? `<div class="mini">${r.arts.map(tarjeta).join('')}</div>` : ''}</div>`;
  CHAT.push(html);
  const ch = $('#chat'); if (ch) { ch.insertAdjacentHTML('beforeend', html); const i = $('#ia-q'); if (i) i.value = ''; setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 30); }
  if (porVoz && LS.get('voz', true)) hablar(r.texto);
  window.__ultima = r;
  return r;
}

/* ---------- favoritos ---------- */
function vistaFavoritos() {
  const F = favs().map(c => BYC.get(c)).filter(Boolean), R = LS.get('rec', []).map(c => BYC.get(c)).filter(Boolean).slice(0, 12);
  $('#main').innerHTML = `<div class="seccion"><h2>Favoritos</h2><span style="color:var(--gris);font-size:14px">${F.length}</span></div>
  ${F.length ? `<div class="grid">${F.map(tarjeta).join('')}</div>` : '<div class="vacio"><b>Aún no hay favoritos</b>Pulsa el corazón de un vino para tenerlo a mano.</div>'}
  ${R.length ? `<div class="seccion"><h2>Vistos hace poco</h2></div><div class="mini">${R.map(tarjeta).join('')}</div>` : ''}${pie()}`;
}

/* ---------- navegación ---------- */
const NAV = [['#/', 'Catálogo', I.vino], ['#/escanear', 'Escanear', I.cam, 'scan'], ['#/asistente', 'Asistente', I.ia], ['#/favoritos', 'Favoritos', I.heart]];
function pintarNav() {
  const h = location.hash || '#/', act = k => (k === '#/' ? !/^#\/(asistente|favoritos)/.test(h) : h.startsWith(k));
  $('#nav-mov').innerHTML = NAV.map(([k, t, ic, cl]) => `<a href="${k}" data-nav="${k}" class="${cl || ''} ${act(k) && k !== '#/escanear' ? 'act' : ''}">${cl ? `<span class="dot">${ic}</span>` : ic}${t}</a>`).join('');
  $('#nav-pc').innerHTML = NAV.map(([k, t, ic]) => `<a href="${k}" data-nav="${k}" class="${act(k) && k !== '#/escanear' ? 'act' : ''}">${ic}${t}</a>`).join('');
}
let VISTA = '';
function irA(h) { if (location.hash !== h) history.pushState(null, '', h); ruta(); }
function ruta() {
  const h = location.hash || '#/';
  pintarNav();
  if (h === '#/escanear') { history.replaceState(null, '', VISTA || '#/'); pintarNav(); if (!VISTA) { VISTA = '#/'; vistaCatalogo(); } camara(); return; }
  const m = h.match(/^#\/vino\/([^/?]+)/);
  if (m) { if (!VISTA) { VISTA = '#/'; vistaCatalogo(); } const c = decodeURIComponent(m[1]), abierta = $('.velo #b-fav'); if (!abierta || abierta.dataset.v !== c) verFicha(c, true); return; }
  cerrarHoja(true);
  const v = h.startsWith('#/asistente') ? 'a' : h.startsWith('#/favoritos') ? 'f' : 'c';
  if (VISTA === h && v === 'c' && $('#grid,.vacio,.fams')) return;
  VISTA = h;
  if (v === 'a') vistaAsistente(); else if (v === 'f') vistaFavoritos(); else vistaCatalogo();
  if (v !== 'a') window.scrollTo(0, 0);
}

/* ---------- eventos ---------- */
const ACC = {
  ver: c => verFicha(c), cerrar: () => cerrarHoja(),
  fam: v => { S.fam = v; LS.set('fam', v); S.lim = 48; vistaCatalogo(); },
  filtros: hojaFiltros, mas: () => { S.lim += 48; vistaCatalogo(); },
  quitar: k => { S[k] = typeof S[k] === 'boolean' ? false : ''; S.lim = 48; vistaCatalogo(); },
  limpiar: () => { Object.assign(S, { dop: '', uva: '', estilo: '', min: '', max: '', eco: false, nov: false, foto: false, lim: 48 }); cerrarHoja(true); vistaCatalogo(); },
  fav: (c, el) => { let f = favs(); f = f.includes(c) ? f.filter(x => x !== c) : [c, ...f]; LS.set('favs', f); const on = f.includes(c); $$(`.fav[data-v="${CSS.escape(c)}"]`).forEach(b => b.classList.toggle('on', on)); const bf = $('#b-fav'); if (bf && bf.dataset.v === c) { bf.classList.toggle('vino', on); bf.innerHTML = I.heart + (on ? ' En favoritos' : ' Favorito'); } toast(on ? 'Añadido a favoritos' : 'Quitado de favoritos', 1500); if (/favoritos/.test(location.hash) && !$('.velo')) vistaFavoritos(); },
  preguntar: v => preguntar(v),
  leer: c => { const a = BYC.get(c); if (a) hablar(`${a.n}. ${eur(a.p)}. ${argumento(a)}`); },
  compartir: async c => { const a = BYC.get(c); const url = enlaceWeb(a), text = `${a.n} · ${eur(a.p)} · Tierra Nuestra Huelva`; try { if (navigator.share) await navigator.share({ title: a.n, text, url }); else { await navigator.clipboard.writeText(text + '\n' + url); toast('Enlace copiado'); } } catch (e) { } },
};
document.addEventListener('click', e => {
  const n = e.target.closest('[data-nav]');
  if (n) { e.preventDefault(); const k = n.dataset.nav; if (k === '#/escanear') return camara(); if (k === '#/' && location.hash.replace(/^$/, '#/') === '#/' && !$('.velo')) { window.scrollTo({ top: 0, behavior: 'smooth' }); } irA(k); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const f = ACC[b.dataset.a]; if (!f) return;
  e.preventDefault(); e.stopPropagation(); f(b.dataset.v, b);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.velo')) cerrarHoja();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[role=button]')) { e.preventDefault(); verFicha(e.target.dataset.v); }
});
window.addEventListener('popstate', ruta);
let tq;
$('#q').addEventListener('input', e => { clearTimeout(tq); tq = setTimeout(() => { S.q = e.target.value.trim(); S.lim = 48; if (VISTA !== '#/' || $('.velo')) irA('#/'); vistaCatalogo(); }, 160); });
$('#f-busca').addEventListener('submit', e => {
  e.preventDefault(); clearTimeout(tq); const v = $('#q').value.trim(); if (!v) return;
  const a = /^\S+$/.test(v) && codigoDeTexto(v); if (a) { $('#q').value = ''; S.q = ''; verFicha(a.c); return; }
  if (esPregunta(v)) { $('#q').value = ''; S.q = ''; preguntar(v); return; }
  $('#q').blur();
});
$('#b-mic').innerHTML = I.mic; $('#b-cam').innerHTML = I.cam;
$('#b-mic').onclick = () => microfono(t => { if (esPregunta(t)) preguntar(t, true); else { const a = codigoDeTexto(t.replace(/\s/g, '')); if (a) return verFicha(a.c); $('#q').value = t; S.q = t; S.lim = 48; irA('#/'); vistaCatalogo(); } }, $('#b-mic'));
$('#b-cam').onclick = () => camara();
window.botella = botella;
window.__G = { A, S, BYC, responder, buscarCodigo, codigoDeTexto, VERSION };
ruta();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
