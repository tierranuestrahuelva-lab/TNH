'use strict';
/* TPV Tierra Nuestra — app de caja en el navegador. Datos en este dispositivo (IndexedDB + localStorage). */
const VERSION = '1.0.0';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem('tpv_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('tpv_' + k, JSON.stringify(v)); } catch (e) { toast('No se pudo guardar (memoria llena). Haz una copia de seguridad.', 1); } },
};
const rnd = x => Math.sign(x) * Math.round(Math.abs(x));
const n2 = c => { const s = (Math.abs(c) / 100).toFixed(2).split('.'); return (c < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1]; };
const eur = c => n2(c) + ' €';
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const pad = (n, l) => String(n).padStart(l, '0');
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const dia = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`; };
const fdate = iso => { const d = new Date(iso); return `${pad(d.getDate(), 2)}/${pad(d.getMonth() + 1, 2)}/${d.getFullYear()}`; };
const ftime = iso => { const d = new Date(iso); return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`; };
function parseEur(s) {
  s = String(s ?? '').trim().replace(/\s|€/g, ''); if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const v = parseFloat(s); return isNaN(v) ? NaN : Math.round(v * 100);
}

/* ---------- configuración ---------- */
const CFG0 = {
  empresa: { comercial: 'Tierra Nuestra', nombre: 'CONSTANTIN BECERRA S.L.', nif: 'B21295688', dir: 'C/ Fernando el Católico, 34', cp: '21003 Huelva', tel: '959 541 579', web: 'tierranuestra.es', email: 'tnh@tierranuestrahuelva.es', insta: '@tierranuestra.es' },
  serie: 'T', serieDev: 'D', papel: 80, logo: true, qr: true, qrUrl: 'https://tierranuestra.es', codigoBarras: true,
  pie: 'Gracias por su visita\nCambios y devoluciones en 15 días\npresentando este ticket',
  autoPrint: true, copias: 1, imprimirZ: true, limiteSimplificada: 300000,
  adminPin: '1234', operarios: [{ id: 'op1', nombre: 'Tienda', pin: '0000' }],
  sage: { almacen: '', codVarios: '', clienteContado: '', cuentaCaja: '570000000', cuentaTarjeta: '572000000', cuentaBizum: '572000000', ventas: { 21: '700000000', 10: '700000000', 4: '700000000', 0: '700000000' }, iva: { 21: '477000021', 10: '477000010', 4: '477000004', 0: '477000000' }, asientoInicial: 1 },
};
function deepMerge(a, b) {
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}
let CFG = deepMerge(JSON.parse(JSON.stringify(CFG0)), LS.get('cfg', {}));
const saveCfg = () => LS.set('cfg', CFG);

const FAMS = [
  ['top', 'Más vendidos', '#830040'], ['todos', 'Todos', '#B771A0'], ['tintos', 'Tintos', '#830040'], ['blancos', 'Blancos', '#d9b945'],
  ['rosados', 'Rosados', '#e98aa6'], ['espumosos', 'Espumosos', '#c7a24a'], ['generosos', 'Generosos y dulces', '#a8662b'],
  ['destilados', 'Destilados', '#4a3b30'], ['formatos', 'Formatos', '#B771A0'], ['regalo', 'Regalo', '#B771A0'],
  ['gourmet', 'Gourmet', '#6b8e3e'], ['accesorios', 'Accesorios', '#7a7a7a'], ['otros', 'Otros', '#9a9a9a'],
];
const FAM = Object.fromEntries(FAMS.map(f => [f[0], f]));
const FORMAS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum' };
const IVAS = [21, 10, 4, 0];

/* ---------- almacenamiento ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('tpv-tn', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('tickets', { keyPath: 'id' }); d.createObjectStore('cierres', { keyPath: 'id' }); };
      r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => rej(r.error);
    });
  },
  all(s) { return new Promise((res, rej) => { const q = this.db.transaction(s).objectStore(s).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  put(s, v) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readwrite'); tx.objectStore(s).put(v); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
  putMany(s, arr) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readwrite'); const st = tx.objectStore(s); arr.forEach(v => st.put(v)); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
  clear(s) { return new Promise((res, rej) => { const tx = this.db.transaction(s, 'readwrite'); tx.objectStore(s).clear(); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
};
let TICKETS = [], CIERRES = [];
let CAJA = LS.get('caja', null);
let CONT = LS.get('cont', {});
let PARK = LS.get('park', []);
let EXTRA = LS.get('arts', {});
let TARIFAS = LS.get('tarifas', []);
let CLIENTES = LS.get('clientes', []);

/* ---------- artículos ---------- */
let ARTS = [], BYC = new Map(), BYB = new Map();
function buildArts() {
  const m = new Map();
  for (const a of (window.TN_ARTICULOS || [])) m.set(a.c, { ...a });
  for (const [c, x] of Object.entries(EXTRA)) {
    if (x.del) { m.delete(c); continue; }
    m.set(c, { ...(m.get(c) || { c, n: '', p: 0, i: 21, f: 'otros' }), ...x, c });
  }
  ARTS = [...m.values()];
  ARTS.forEach(a => { a._s = norm(a.n + ' ' + a.c + ' ' + (a.b || []).join(' ')); });
  ARTS.sort((a, b) => a.n.localeCompare(b.n, 'es'));
  BYC = new Map(ARTS.map(a => [a.c.toUpperCase(), a]));
  BYB = new Map(); for (const a of ARTS) for (const b of (a.b || [])) BYB.set(String(b), a);
}
function buscarCodigo(code) {
  code = String(code || '').trim(); if (!code) return null;
  return BYB.get(code) || BYB.get(code.replace(/^0+/, '')) || BYB.get('0' + code) || BYC.get(code.toUpperCase()) || null;
}
function filtrar(q, fam) {
  const ws = norm(q).split(/\s+/).filter(Boolean);
  let r = ARTS;
  if (ws.length) r = r.filter(a => ws.every(w => a._s.includes(w)));
  else if (fam === 'top') r = ARTS.filter(a => a.r).sort((a, b) => a.r - b.r);
  if (!ws.length && fam !== 'top' && fam !== 'todos') r = r.filter(a => a.f === fam);
  if (ws.length && fam !== 'top' && fam !== 'todos') { const rf = r.filter(a => a.f === fam); if (rf.length) r = rf; }
  return r;
}
const precio = (a, tar) => tar === 'p' || !tar ? a.p : ((a.t && a.t[tar] != null) ? a.t[tar] : a.p);

/* ---------- estado ---------- */
const S = { op: null, vista: 'venta', fam: 'top', q: '', sel: -1 };
let TK = LS.get('actual', null) || nuevoTK();
function nuevoTK() { return { lineas: [], cliente: null, tarifa: 'p', dto: 0, orig: null }; }
const saveTK = () => LS.set('actual', TK);

function calc(t) {
  let total = 0, bruto = 0; const iva = {};
  const lin = t.lineas.map(l => {
    const b0 = rnd(l.u * l.pu); bruto += b0;
    const br = rnd(l.u * l.pu * (100 - (l.dto || 0)) / 100);
    const tot = rnd(br * (100 - (t.dto || 0)) / 100);
    total += tot; iva[l.i] = (iva[l.i] || 0) + tot;
    return { ...l, tot };
  });
  const ivas = Object.keys(iva).map(Number).sort((a, b) => b - a).map(r => { const tt = iva[r]; const base = rnd(tt * 100 / (100 + r)); return { r, total: tt, base, cuota: tt - base }; });
  return { lin, total, ivas, ahorro: bruto - total, uds: t.lineas.reduce((s, l) => s + l.u, 0) };
}

/* ---------- utilidades UI ---------- */
let toastT;
function toast(msg, mal) { const t = $('#toast'); t.textContent = msg; t.className = 'on' + (mal ? ' mal' : ''); clearTimeout(toastT); toastT = setTimeout(() => t.className = '', mal ? 4200 : 2400); }
let audioCtx;
function beep(f = 1400) { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = f; g.gain.value = .05; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + .06); } catch (e) { } }
function modal(title, body, foot = '', cls = '') {
  const root = $('#modal-root');
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = `<div class="md ${cls}" role="dialog" aria-label="${esc(title)}"><div class="md-h"><h3>${esc(title)}</h3><button class="x" data-a="cerrarModal" aria-label="Cerrar">×</button></div><div class="md-b">${body}</div>${foot ? `<div class="md-f">${foot}</div>` : ''}</div>`;
  root.appendChild(ov);
  const f = ov.querySelector('[autofocus]'); if (f) setTimeout(() => { f.focus(); f.select && f.select(); }, 30);
  return ov;
}
function cerrarModal() { const r = $('#modal-root'); if (r.lastElementChild) r.lastElementChild.remove(); if (!r.children.length && S.vista === 'venta') focoBuscar(); }
const cerrarTodos = () => { $('#modal-root').innerHTML = ''; };
function confirmar(title, msg, okTxt, fn, peligro) {
  modal(title, `<p>${msg}</p>`, `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn ${peligro ? 'peligro' : 'vino'}" id="cf-ok">${esc(okTxt)}</button>`);
  $('#cf-ok').onclick = () => { cerrarModal(); fn(); };
}
function pedirPin(title, fn) {
  modal(title, `<label class="f">PIN de administrador<input id="pin-adm" type="password" inputmode="numeric" autocomplete="off" autofocus></label>`, `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="pin-ok">Entrar</button>`);
  const ok = () => { if ($('#pin-adm').value === CFG.adminPin) { cerrarModal(); fn(); } else toast('PIN incorrecto', 1); };
  $('#pin-ok').onclick = ok; $('#pin-adm').onkeydown = e => { if (e.key === 'Enter') ok(); };
}
function descargar(nombre, data, tipo) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: tipo || 'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

/* ---------- render principal ---------- */
const VISTAS = [['venta', 'Venta'], ['tickets', 'Tickets'], ['caja', 'Caja'], ['sage', 'Sage 50'], ['articulos', 'Artículos'], ['ajustes', 'Ajustes']];
function render() {
  if (!S.op) return renderLogin();
  const cajaTxt = CAJA ? `<span class="pill verde">Caja abierta</span>` : `<span class="pill roja">Caja cerrada</span>`;
  $('#app').innerHTML = `<header class="top"><img src="assets/logo-white.svg" alt="Tierra Nuestra"><nav>${VISTAS.map(([k, n]) => `<button data-a="vista" data-v="${k}" class="${S.vista === k ? 'on' : ''}">${n}</button>`).join('')}</nav>
  <div class="info">${cajaTxt}<br><b>${esc(S.op.nombre)}</b> · <span id="reloj"></span></div><button class="btn sm" data-a="bloquear" title="Bloquear" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">Salir</button></header><main id="main"></main>`;
  reloj();
  ({ venta: vVenta, tickets: vTickets, caja: vCaja, sage: vSage, articulos: vArticulos, ajustes: vAjustes })[S.vista]();
}
function reloj() { const r = $('#reloj'); if (r) { const d = new Date(); r.textContent = `${fdate(d)} ${ftime(d)}`; } }
setInterval(reloj, 20000);

/* ---------- login ---------- */
let LOGIN = { op: null, pin: '' };
function renderLogin() {
  const ops = CFG.operarios;
  if (!LOGIN.op) LOGIN.op = ops.find(o => o.id === LS.get('ultimoOp')) || ops[0];
  $('#app').innerHTML = `<div class="login"><img src="assets/logo-white.svg" alt="Tierra Nuestra">
  <div class="caps" style="margin-bottom:14px;opacity:.85">Terminal punto de venta</div>
  <div class="ops">${ops.map(o => `<button data-a="loginOp" data-v="${o.id}" class="${LOGIN.op && LOGIN.op.id === o.id ? 'on' : ''}">${esc(o.nombre)}</button>`).join('')}</div>
  <div class="pin">${[0, 1, 2, 3].map(i => `<i class="${LOGIN.pin.length > i ? 'f' : ''}"></i>`).join('')}</div>
  <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-a="loginKey" data-v="${n}">${n}</button>`).join('')}<button data-a="loginKey" data-v="C">C</button><button data-a="loginKey" data-v="0">0</button><button data-a="loginKey" data-v="B">⌫</button></div>
  <div style="margin-top:18px;font-size:12px;opacity:.6">v${VERSION}</div></div>`;
}
function loginKey(k) {
  if (k === 'C') LOGIN.pin = ''; else if (k === 'B') LOGIN.pin = LOGIN.pin.slice(0, -1); else if (LOGIN.pin.length < 8) LOGIN.pin += k;
  const op = LOGIN.op;
  if (op && LOGIN.pin === op.pin) { S.op = op; LS.set('ultimoOp', op.id); LOGIN.pin = ''; S.vista = 'venta'; render(); if (!CAJA) apertura(); return; }
  if (op && LOGIN.pin.length >= Math.max(4, op.pin.length)) { toast('PIN incorrecto', 1); LOGIN.pin = ''; }
  renderLogin();
}

/* ---------- vista venta ---------- */
function vVenta() {
  const tarifas = [{ k: 'p', n: 'PVP Tienda' }, ...TARIFAS];
  $('#main').innerHTML = `<div class="venta"><section class="cat">
   <div class="buscar"><input id="q" placeholder="Buscar vino, código o pasar el lector de códigos de barras…" value="${esc(S.q)}" autocomplete="off" enterkeyhint="go">
   ${'BarcodeDetector' in window ? '<button class="btn" data-a="camara">Cámara</button>' : ''}<button class="btn lila" data-a="libre">Artículo libre</button></div>
   <div class="fams">${FAMS.map(([k, n, c]) => `<button data-a="fam" data-v="${k}" class="${S.fam === k ? 'on' : ''}"><i style="background:${c}"></i>${n}</button>`).join('')}</div>
   <div class="grid" id="grid"></div></section>
   <aside class="tk"><div class="tk-head">
     <button class="cli" data-a="cliente"><span class="muted" style="font-size:12px">Cliente</span><b id="cli-n"></b></button>
     <select id="tarifa" aria-label="Tarifa">${tarifas.map(t => `<option value="${t.k}" ${TK.tarifa === t.k ? 'selected' : ''}>${esc(t.n)}</option>`).join('')}</select>
   </div><div class="lineas" id="lineas"></div><div class="tk-tot" id="tk-tot"></div></aside></div>`;
  renderGrid(); renderTicket();
  const q = $('#q');
  q.oninput = () => { S.q = q.value; renderGrid(); };
  q.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); entradaBuscar(q.value); } };
  $('#tarifa').onchange = e => cambiarTarifa(e.target.value);
  focoBuscar();
}
function focoBuscar() { const q = $('#q'); if (q && window.matchMedia('(pointer:fine)').matches) q.focus(); }
function entradaBuscar(v) {
  v = v.trim(); if (!v) return;
  const a = buscarCodigo(v);
  if (a) { addArt(a); S.q = ''; $('#q').value = ''; renderGrid(); return; }
  const t = TICKETS.find(t => t.num.toUpperCase() === v.toUpperCase());
  if (t) { S.q = ''; $('#q').value = ''; renderGrid(); return verTicket(t.id); }
  const r = filtrar(v, 'todos');
  if (r.length === 1) { addArt(r[0]); S.q = ''; $('#q').value = ''; renderGrid(); return; }
  if (/^\d{6,14}$/.test(v)) { beep(300); toast(`Código ${v} no encontrado. Añádelo en Artículos o usa "Artículo libre".`, 1); }
}
function renderGrid() {
  const g = $('#grid'); if (!g) return;
  const r = filtrar(S.q, S.fam);
  const max = 240;
  g.innerHTML = r.length ? r.slice(0, max).map(a => `<button class="prod" data-a="add" data-v="${esc(a.c)}" style="--c:${(FAM[a.f] || FAM.otros)[2]}">
    ${a.r && a.r <= 10 && S.fam === 'top' ? `<span class="top3">TOP ${a.r}</span>` : ''}
    <span class="n">${esc(a.n)}</span><span><span class="p">${eur(precio(a, TK.tarifa))}</span><br><span class="c">${esc(a.c)}${a.i !== 21 ? ` · IVA ${a.i}%` : ''}</span></span></button>`).join('')
    + (r.length > max ? `<div class="vacio" style="grid-column:1/-1">Se muestran ${max} de ${r.length}. Escribe para afinar la búsqueda.</div>` : '')
    : `<div class="vacio" style="grid-column:1/-1">${S.fam === 'top' && !S.q ? 'Aún no hay ranking de ventas. Elige una familia o busca.' : 'Sin resultados.'}</div>`;
}
function renderTicket() {
  const L = $('#lineas'); if (!L) return;
  const c = calc(TK);
  $('#cli-n').textContent = TK.cliente ? `${TK.cliente.nombre || ''}${TK.cliente.nif ? ' · ' + TK.cliente.nif : ''}` : 'Contado (cliente de mostrador)';
  L.innerHTML = TK.lineas.length ? c.lin.map((l, i) => `<div class="lin ${S.sel === i ? 'sel' : ''}" data-a="selLin" data-v="${i}">
     <div class="d">${esc(l.n)}</div><div class="t num">${eur(l.tot)}</div>
     <div class="m">${l.u} × ${eur(l.pu)}${l.dto ? ` · dto ${l.dto}%` : ''}${l.i !== 21 ? ` · IVA ${l.i}%` : ''}${l.c ? ` · ${esc(l.c)}` : ''}</div><div></div>
     ${S.sel === i ? `<div class="ctl"><div class="qty"><button data-a="menos" data-v="${i}" aria-label="Menos">−</button><span>${l.u}</span><button data-a="mas" data-v="${i}" aria-label="Más">+</button></div>
       <button class="btn sm" data-a="editLin" data-v="${i}">Precio / dto</button><button class="btn sm peligro" data-a="borrarLin" data-v="${i}">Quitar</button></div>` : ''}
    </div>`).join('')
    : (S.ultimo && !TK.orig ? `<div class="vacio" id="ultimo"><div class="muted">Ticket ${esc(S.ultimo.num)} · ${eur(S.ultimo.total)}</div>${S.ultimo.cambio > 0 ? `<div class="muted" style="margin-top:14px">Entregado ${eur(S.ultimo.entregado)}</div><div class="caps" style="color:var(--ok);margin-top:6px">Cambio</div><div class="num" style="font-size:54px;font-weight:600;color:var(--ok)">${eur(S.ultimo.cambio)}</div>` : ''}<div style="margin-top:14px">Pasa el siguiente vino para empezar otra venta.</div></div>`
    : `<div class="vacio">${TK.orig ? '' : 'Toca un vino o pasa el lector para empezar.'}</div>`);
  if (TK.orig) L.insertAdjacentHTML('afterbegin', `<div class="aviso" style="margin:8px 12px">Devolución del ticket <b>${esc(TK.orig)}</b>. Al cobrar se genera una factura rectificativa.</div>`);
  $('#tk-tot').innerHTML = `
   ${c.ahorro > 0 ? `<div class="row"><span>Descuento${TK.dto ? ` ticket ${TK.dto}%` : ''}</span><span class="num">−${eur(c.ahorro)}</span></div>` : ''}
   <div class="row"><span>${c.uds} ud.${c.ivas.map(v => ` · IVA ${v.r}%: ${eur(v.cuota)}`).join('')}</span><span>IVA incluido</span></div>
   <div class="total"><span style="font-size:18px" class="caps">Total</span><span class="num" id="total">${eur(c.total)}</span></div>
   <div class="tk-btns"><button class="btn" data-a="dtoTicket">Dto. ticket</button><button class="btn" data-a="aparcar" ${TK.lineas.length ? '' : 'disabled'}>Aparcar</button>
   <button class="btn" data-a="recuperar">Recuperar${PARK.length ? ` (${PARK.length})` : ''}</button><button class="btn peligro" data-a="vaciar" ${TK.lineas.length || TK.orig ? '' : 'disabled'}>Vaciar</button></div>
   <button class="btn vino grande cobrar" data-a="cobrar" ${TK.lineas.length ? '' : 'disabled'}>${c.total < 0 ? 'DEVOLVER' : 'COBRAR'} ${eur(Math.abs(c.total))}</button>`;
  const sel = L.querySelector('.lin.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
}
function addArt(a, u = 1) {
  S.ultimo = null;
  const pu = precio(a, TK.tarifa);
  const ex = TK.lineas.find(l => l.c === a.c && l.pu === pu && !l.libre && !l.dto && l.u > 0);
  if (ex) { ex.u += u; S.sel = TK.lineas.indexOf(ex); }
  else { TK.lineas.push({ c: a.c, n: a.n, i: a.i ?? 21, f: a.f || 'otros', u, pu, dto: 0 }); S.sel = TK.lineas.length - 1; }
  saveTK(); renderTicket(); beep();
}
function cambiarTarifa(k) {
  TK.tarifa = k;
  TK.lineas.forEach(l => { if (!l.libre && !l.manual) { const a = BYC.get(String(l.c).toUpperCase()); if (a) l.pu = precio(a, k); } });
  saveTK(); renderGrid(); renderTicket();
}
function editLin(i) {
  const l = TK.lineas[i];
  modal('Modificar línea', `<p style="margin-top:0"><b>${esc(l.n)}</b></p><div class="form">
   <label class="f">Unidades<input id="el-u" type="number" step="1" value="${l.u}"></label>
   <label class="f">Precio unidad (IVA incl.)<input id="el-p" inputmode="decimal" value="${n2(l.pu)}" autofocus></label>
   <label class="f">Descuento %<input id="el-d" type="number" min="0" max="100" step="0.5" value="${l.dto || 0}"></label>
   <label class="f">IVA<select id="el-i">${IVAS.map(v => `<option ${v === l.i ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="el-ok">Aplicar</button>`);
  $('#el-ok').onclick = () => {
    const u = parseInt($('#el-u').value, 10), p = parseEur($('#el-p').value), d = parseFloat($('#el-d').value) || 0;
    if (!u || isNaN(p) || p < 0 || d < 0 || d > 100) return toast('Revisa los datos', 1);
    if (TK.orig && u > 0 && l.u < 0) return toast('En una devolución las unidades son negativas', 1);
    if (p !== l.pu) l.manual = true;
    Object.assign(l, { u, pu: p, dto: d, i: parseInt($('#el-i').value, 10) }); saveTK(); cerrarModal(); renderTicket();
  };
}
function artLibre() {
  modal('Artículo libre', `<div class="form"><label class="f" style="grid-column:1/-1">Descripción<input id="al-n" autofocus placeholder="Ej.: Caja regalo 3 botellas"></label>
   <label class="f">Precio (IVA incl.)<input id="al-p" inputmode="decimal" placeholder="0,00"></label>
   <label class="f">Unidades<input id="al-u" type="number" value="1" min="1"></label>
   <label class="f">IVA<select id="al-i">${IVAS.map(v => `<option>${v}</option>`).join('')}</select></label>
   <label class="f">Familia<select id="al-f">${FAMS.slice(2).map(f => `<option value="${f[0]}">${f[1]}</option>`).join('')}</select></label></div>
   <p class="muted" style="font-size:13px">Se exporta a Sage con el código "${esc(CFG.sage.codVarios || '(sin código)')}" (Ajustes › Sage 50).</p>`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="al-ok">Añadir</button>`);
  $('#al-ok').onclick = () => {
    const n = $('#al-n').value.trim(), p = parseEur($('#al-p').value), u = parseInt($('#al-u').value, 10) || 1;
    if (!n || isNaN(p) || p <= 0) return toast('Pon descripción y precio', 1);
    S.ultimo = null; TK.lineas.push({ c: CFG.sage.codVarios || '', n, i: parseInt($('#al-i').value, 10), f: $('#al-f').value, u, pu: p, dto: 0, libre: true });
    S.sel = TK.lineas.length - 1; saveTK(); cerrarModal(); renderTicket();
  };
}
function dtoTicket() {
  modal('Descuento en todo el ticket', `<div class="billetes">${[0, 5, 10, 15, 20].map(v => `<button data-a="setDto" data-v="${v}">${v}%</button>`).join('')}</div>
   <label class="f">Otro %<input id="dt-v" type="number" min="0" max="100" step="0.5" value="${TK.dto || 0}" autofocus></label>`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="dt-ok">Aplicar</button>`);
  $('#dt-ok').onclick = () => setDto($('#dt-v').value);
}
function setDto(v) { v = parseFloat(v) || 0; if (v < 0 || v > 100) return toast('Descuento no válido', 1); TK.dto = v; saveTK(); cerrarModal(); renderTicket(); }
function clienteModal() {
  const c = TK.cliente || {};
  modal('Cliente del ticket', `<p class="muted" style="margin-top:0">Déjalo en "Contado" para ventas de mostrador. Si el cliente pide factura con sus datos, rellena NIF, nombre y dirección.</p>
   <div class="form"><label class="f">Código cliente Sage<input id="cl-c" value="${esc(c.codigo || '')}" autofocus></label>
   <label class="f">NIF / CIF<input id="cl-nif" value="${esc(c.nif || '')}"></label>
   <label class="f" style="grid-column:1/-1">Nombre o razón social<input id="cl-n" value="${esc(c.nombre || '')}"></label>
   <label class="f" style="grid-column:1/-1">Dirección completa<input id="cl-d" value="${esc(c.dir || '')}"></label></div>
   ${CLIENTES.length ? `<h2>Recientes</h2><div class="billetes">${CLIENTES.slice(0, 12).map((x, i) => `<button data-a="cliRec" data-v="${i}">${esc(x.nombre || x.codigo)}</button>`).join('')}</div>` : ''}`,
    `<button class="btn" data-a="cliContado">Contado</button><button class="btn vino" id="cl-ok">Aplicar</button>`);
  $('#cl-ok').onclick = () => {
    const x = { codigo: $('#cl-c').value.trim(), nif: $('#cl-nif').value.trim().toUpperCase(), nombre: $('#cl-n').value.trim(), dir: $('#cl-d').value.trim() };
    if (!x.codigo && !x.nif && !x.nombre) return ACT.cliContado();
    TK.cliente = x; CLIENTES = [x, ...CLIENTES.filter(y => !(y.codigo === x.codigo && y.nif === x.nif && y.nombre === x.nombre))].slice(0, 40); LS.set('clientes', CLIENTES);
    saveTK(); cerrarModal(); renderTicket();
  };
}
function aparcar() {
  PARK.push({ ...TK, id: uid(), fecha: new Date().toISOString(), op: S.op.nombre, total: calc(TK).total }); LS.set('park', PARK);
  TK = nuevoTK(); S.sel = -1; saveTK(); renderTicket(); toast('Ticket aparcado');
}
function recuperar() {
  if (!PARK.length) return toast('No hay tickets aparcados');
  modal('Tickets aparcados', `<table class="t"><tr><th>Hora</th><th>Operario</th><th>Cliente</th><th class="r">Total</th><th></th></tr>${PARK.map((p, i) => `<tr class="click" data-a="recPark" data-v="${i}"><td>${ftime(p.fecha)}</td><td>${esc(p.op)}</td><td>${esc(p.cliente ? p.cliente.nombre : 'Contado')}</td><td class="r">${eur(p.total)}</td><td><b style="color:var(--vino)">Recuperar</b></td></tr>`).join('')}</table>`);
}

/* ---------- cobro ---------- */
let CB = null;
function abrirCobro() {
  if (!TK.lineas.length) return;
  if (!CAJA) return apertura(abrirCobro);
  const c = calc(TK);
  if (c.lin.some(l => l.u < 0) && !TK.orig) return toast('Las unidades negativas solo se permiten en devoluciones (Tickets › Devolver)', 1);
  if (TK.orig && c.lin.some(l => l.u > 0)) return toast('Una devolución solo puede llevar unidades negativas. Haz la venta nueva aparte.', 1);
  if (c.total > CFG.limiteSimplificada && !(TK.cliente && TK.cliente.nif && TK.cliente.nombre)) {
    return confirmar('Importe alto', `El total supera ${eur(CFG.limiteSimplificada)}. Para facturas grandes conviene poner los datos fiscales del cliente (NIF, nombre, dirección). ¿Cobrar igualmente como factura simplificada?`, 'Cobrar igualmente', () => abrirCobro2(c));
  }
  abrirCobro2(c);
}
function abrirCobro2(c) {
  CB = { total: c.total, pagos: [], forma: 'efectivo', inp: '', entregado: 0, cambio: 0, regalo: false, imprimir: CFG.autoPrint };
  modal(c.total < 0 ? 'Devolución' : 'Cobro', '<div id="cobro"></div>', `<label class="chk" style="margin-right:auto"><input type="checkbox" id="cb-regalo"> Ticket regalo (sin precios)</label>
   <label class="chk" style="margin-right:12px"><input type="checkbox" id="cb-print" ${CB.imprimir ? 'checked' : ''}> Imprimir</label>
   <button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino grande" data-a="finCobro" id="cb-fin">Finalizar</button>`, 'ancho');
  $('#cb-regalo').onchange = e => CB.regalo = e.target.checked;
  $('#cb-print').onchange = e => CB.imprimir = e.target.checked;
  renderCobro();
}
const pendiente = () => CB.total - CB.pagos.reduce((s, p) => s + p.imp, 0);
function renderCobro() {
  const el = $('#cobro'); if (!el) return;
  const pend = pendiente(), v = parseEur(CB.inp);
  const dev = CB.total < 0;
  const cambioPrev = !dev && CB.forma === 'efectivo' && !isNaN(v) && v > pend ? v - pend : 0;
  el.innerHTML = `<div class="cobro"><div>
    <div class="muted caps" style="font-size:13px">${dev ? 'A devolver' : 'Total a cobrar'}</div><div class="tot num">${eur(Math.abs(CB.total))}</div>
    <div class="formas">${Object.entries(FORMAS).map(([k, n]) => `<button data-a="forma" data-v="${k}" class="${CB.forma === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    ${!dev && CB.forma === 'efectivo' ? `<div class="muted" style="font-size:13px">Entrega rápida</div><div class="billetes"><button data-a="billete" data-v="exacto">Exacto</button>${[5, 10, 20, 50, 100].map(b => `<button data-a="billete" data-v="${b * 100}">${b} €</button>`).join('')}</div>` : ''}
    <div class="pagos">${CB.pagos.map((p, i) => `<div class="p"><span>${FORMAS[p.f]}</span><span class="num"><b>${eur(p.imp)}</b> <button class="x" data-a="quitarPago" data-v="${i}" aria-label="Quitar pago" style="font-size:18px">×</button></span></div>`).join('')}</div>
    <div style="display:flex;justify-content:space-between;font-size:20px;margin-top:6px"><span>Pendiente</span><b class="num" id="cb-pend">${eur(Math.abs(pend))}</b></div>
    ${CB.cambio || cambioPrev ? `<div style="display:flex;justify-content:space-between;margin-top:8px"><span class="cambio">Cambio</span><span class="cambio num">${eur(CB.cambio + cambioPrev)}</span></div>` : ''}
   </div><div>
    <div class="muted" style="font-size:13px">${dev ? 'Importe (vacío = todo)' : CB.forma === 'efectivo' ? 'Entregado por el cliente (vacío = exacto)' : 'Importe (vacío = todo el pendiente)'}</div>
    <div class="display num" id="cb-disp">${CB.inp ? esc(CB.inp) + ' €' : '<span class="muted">' + n2(Math.abs(pend)) + '</span>'}</div>
    <div class="pad">${['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫'].map(k => `<button data-a="cbKey" data-v="${k}">${k}</button>`).join('')}</div>
    <button class="btn" style="width:100%;margin-top:8px" data-a="addPago" ${pend === 0 || dev ? 'disabled' : ''}>Añadir pago parcial (pago mixto)</button>
   </div></div>`;
}
function addPago(valor) {
  const pend = pendiente(); if (pend === 0) return;
  let v = valor != null ? valor : (CB.inp ? parseEur(CB.inp) : pend);
  if (isNaN(v) || v === 0) return toast('Importe no válido', 1);
  if (CB.total < 0) { CB.pagos.push({ f: CB.forma, imp: pend }); CB.inp = ''; return; }
  if (v < 0) return toast('Importe no válido', 1);
  if (CB.forma === 'efectivo') { const ap = Math.min(v, pend); CB.entregado += v; CB.cambio += v - ap; CB.pagos.push({ f: 'efectivo', imp: ap }); }
  else { if (v > pend) return toast(`Con ${FORMAS[CB.forma]} no se puede cobrar más del pendiente`, 1); CB.pagos.push({ f: CB.forma, imp: v }); }
  CB.inp = '';
}
async function finCobro() {
  if (!CB || CB.busy) return;
  if (pendiente() !== 0) addPago();
  if (pendiente() !== 0) { renderCobro(); return; }
  CB.busy = true; const btn = $('#cb-fin'); if (btn) btn.disabled = true;
  const t = await guardarTicket();
  cerrarTodos();
  TK = nuevoTK(); S.sel = -1; saveTK(); renderTicket(); focoBuscar();
  if (CB.imprimir) imprimirTicket(t, { regalo: CB.regalo });
  S.ultimo = { num: t.num, total: t.total, cambio: t.cambio, entregado: t.entregado }; renderTicket();
  toast(`Ticket ${t.num} guardado`);
}
function numerar(serie, d) {
  const yy = String(d.getFullYear()).slice(2), k = serie + yy;
  CONT[k] = (CONT[k] || 0) + 1; LS.set('cont', CONT);
  return { num: `${serie}${yy}-${pad(CONT[k], 6)}`, serie: serie + yy, n: CONT[k] };
}
async function guardarTicket() {
  const c = calc(TK), d = new Date();
  const dev = !!TK.orig;
  const nn = numerar(dev ? CFG.serieDev : CFG.serie, d);
  const t = {
    id: uid(), ...nn, tipo: dev ? 'dev' : 'venta', fecha: d.toISOString(), dia: dia(d), op: S.op.nombre, caja: CAJA.id,
    cliente: TK.cliente, tarifa: TK.tarifa, dto: TK.dto || 0, orig: TK.orig || null,
    lineas: c.lin.map(l => ({ c: l.c, n: l.n, i: l.i, f: l.f, u: l.u, pu: l.pu, dto: l.dto || 0, tot: l.tot })),
    total: c.total, ivas: c.ivas, pagos: CB.pagos.slice(), entregado: CB.entregado, cambio: CB.cambio, exp: {},
  };
  TICKETS.push(t);
  await DB.put('tickets', t);
  return t;
}

/* ---------- impresión ---------- */
let LOGO_SVG = '';
fetch('assets/logo-ticket.svg').then(r => r.text()).then(s => LOGO_SVG = s.replace(/<\?xml[^>]*>/, '')).catch(() => { });
function barcodeSVG(text) {
  try { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); JsBarcode(s, text, { format: 'CODE128', displayValue: false, height: 38, width: 1.5, margin: 0 }); return s.outerHTML; } catch (e) { return ''; }
}
function qrSVG(text) { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { return ''; } }
function cabeceraTicket() {
  const e = CFG.empresa;
  return `${CFG.logo && LOGO_SVG ? `<div class="logo">${LOGO_SVG}</div>` : `<div class="c big">${esc(e.comercial)}</div>`}
  <div class="c sm">${esc(e.nombre)} · NIF ${esc(e.nif)}<br>${esc(e.dir)} · ${esc(e.cp)}<br>Tel. ${esc(e.tel)}${e.web ? ' · ' + esc(e.web) : ''}</div>`;
}
const CSS_TICKET = w => `@font-face{font-family:FiraC;src:url(assets/fira-cond-500.woff2)}@font-face{font-family:Fira;src:url(assets/fira-400.woff2);font-weight:400}@font-face{font-family:Fira;src:url(assets/fira-600.woff2);font-weight:600}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}
body{width:${w}mm;font-family:Fira,Arial,sans-serif;font-size:${w > 60 ? 11.5 : 10}px;line-height:1.3;padding:${w > 60 ? '3mm 4mm' : '2mm 1.5mm'};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.logo svg{display:block;width:92%;height:auto;margin:0 auto 4px}
.c{text-align:center}.sm{font-size:.88em}.big{font-size:1.6em;font-weight:600}
.tit{font-family:FiraC,Arial Narrow,sans-serif;text-transform:uppercase;letter-spacing:.08em;text-align:center;font-weight:600;font-size:1.12em;border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:3px 0;margin:6px 0 4px}
.row{display:flex;justify-content:space-between;gap:6px}
table{width:100%;border-collapse:collapse}td,th{padding:1px 0;vertical-align:top}th{font-weight:600;text-align:left;border-bottom:1px solid #000;font-size:.9em}
.r{text-align:right;white-space:nowrap}.sub{font-size:.88em;padding-left:2mm}
.hr{border-top:1px dashed #000;margin:5px 0}
.total{font-size:1.55em;font-weight:600;display:flex;justify-content:space-between;margin:3px 0}
.bc{text-align:center;margin-top:6px}.bc svg{width:85%;height:34px}
.qr{text-align:center;margin-top:6px}.qr svg{width:22mm;height:22mm}
.pie{text-align:center;margin-top:6px;white-space:pre-line}`;
function ticketHTML(t, o = {}) {
  const regalo = !!o.regalo, dev = t.tipo === 'dev', fact = t.cliente && t.cliente.nif && t.cliente.nombre;
  const tit = regalo ? 'Ticket regalo' : dev ? (fact ? 'Factura rectificativa' : 'Factura simplificada rectificativa') : (fact ? 'Factura' : 'Factura simplificada');
  const pagos = {}; t.pagos.forEach(p => pagos[p.f] = (pagos[p.f] || 0) + p.imp);
  return `${cabeceraTicket()}<div class="tit">${tit}</div>
  <div class="row"><span>Nº <b>${esc(t.num)}</b></span><span>${fdate(t.fecha)} ${ftime(t.fecha)}</span></div>
  <div class="sm">Le atendió: ${esc(t.op)}${o.copia ? ' · <b>COPIA</b>' : ''}</div>
  ${t.orig ? `<div class="sm">Rectifica a: <b>${esc(t.orig)}</b> (devolución de mercancía)</div>` : ''}
  ${t.cliente && (t.cliente.nombre || t.cliente.nif) ? `<div class="hr"></div><div class="sm">Cliente: <b>${esc(t.cliente.nombre || '')}</b>${t.cliente.nif ? '<br>NIF: ' + esc(t.cliente.nif) : ''}${t.cliente.dir ? '<br>' + esc(t.cliente.dir) : ''}${t.cliente.codigo ? '<br>Cód.: ' + esc(t.cliente.codigo) : ''}</div>` : ''}
  <div class="hr"></div>
  <table><tr><th style="width:9%">Ud</th><th>Descripción</th>${regalo ? '' : '<th class="r">Importe</th>'}</tr>
  ${t.lineas.map(l => `<tr><td>${l.u}</td><td>${esc(l.n)}${regalo ? '' : `<div class="sub">${l.u !== 1 ? `${l.u} x ${n2(l.pu)}` : ''}${l.dto ? ` dto ${String(l.dto).replace('.', ',')}%` : ''}${l.i !== 21 ? ` IVA ${l.i}%` : ''}</div>`}</td>${regalo ? '' : `<td class="r">${n2(l.tot)}</td>`}</tr>`).join('')}</table>
  ${regalo ? `<div class="hr"></div><div class="c">Artículos: ${t.lineas.reduce((s, l) => s + l.u, 0)}</div>` : `
  ${t.dto ? `<div class="row sm" style="margin-top:3px"><span>Descuento aplicado al ticket</span><span>${String(t.dto).replace('.', ',')}%</span></div>` : ''}
  <div class="hr"></div><div class="total"><span>TOTAL</span><span>${eur(t.total)}</span></div>
  <table class="sm"><tr><th>IVA</th><th class="r">Base</th><th class="r">Cuota</th><th class="r">Total</th></tr>
  ${t.ivas.map(v => `<tr><td>${v.r}%</td><td class="r">${n2(v.base)}</td><td class="r">${n2(v.cuota)}</td><td class="r">${n2(v.total)}</td></tr>`).join('')}</table>
  <div class="hr"></div>
  ${Object.entries(pagos).map(([f, v]) => `<div class="row"><span>${FORMAS[f]}</span><span>${n2(v)}</span></div>`).join('')}
  ${t.entregado ? `<div class="row sm"><span>Entregado</span><span>${n2(t.entregado)}</span></div><div class="row"><b>Cambio</b><b>${n2(t.cambio)}</b></div>` : ''}
  <div class="sm c" style="margin-top:3px">IVA incluido</div>`}
  ${CFG.codigoBarras ? `<div class="bc">${barcodeSVG(t.num)}</div>` : ''}
  <div class="pie">${esc(CFG.pie)}</div>
  ${CFG.qr && CFG.qrUrl ? `<div class="qr">${qrSVG(CFG.qrUrl)}<div class="sm">${esc(CFG.empresa.insta || CFG.empresa.web)}</div></div>` : ''}`;
}
function documentoImpresion(body, w) {
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><style>${CSS_TICKET(w)}</style><style id="pg">@page{size:${CFG.papel}mm 297mm;margin:0}</style></head><body>${body}</body></html>`;
}
const anchoUtil = () => CFG.papel >= 70 ? 72 : 48;
function imprimir(body, copias = 1) {
  const f = $('#print-frame');
  const html = documentoImpresion(Array.from({ length: Math.max(1, copias) }, () => body).join('<div style="page-break-after:always"></div>'), anchoUtil());
  f.onload = async () => {
    const d = f.contentDocument;
    try { await d.fonts.ready; } catch (e) { }
    const hmm = Math.ceil(d.body.scrollHeight * 25.4 / 96) + 4;
    d.getElementById('pg').textContent = `@page{size:${CFG.papel}mm ${copias > 1 ? 297 : Math.max(60, hmm)}mm;margin:0}`;
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('No se pudo imprimir', 1); } window.focus(); focoBuscar(); }, 60);
  };
  f.srcdoc = html;
}
function imprimirTicket(t, o = {}) { imprimir(ticketHTML(t, o), o.copia ? 1 : (o.regalo ? 1 : CFG.copias)); }
function previewHTML(body) { return `<iframe class="tk-preview" style="width:${CFG.papel + 6}mm;height:560px;display:block" srcdoc="${esc(documentoImpresion(body, anchoUtil()))}"></iframe>`; }

/* ---------- tickets (historial) ---------- */
let TF = { dia: dia(), q: '' };
function vTickets() {
  const list = TICKETS.filter(t => (!TF.dia || t.dia === TF.dia) && (!TF.q || norm(t.num + ' ' + (t.cliente ? t.cliente.nombre + ' ' + t.cliente.nif : '') + ' ' + t.lineas.map(l => l.n).join(' ')).includes(norm(TF.q)))).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const tot = list.reduce((s, t) => s + t.total, 0);
  $('#main').innerHTML = `<div class="pane"><h1>Tickets</h1>
   <div class="acciones"><label class="f">Día<input type="date" id="tf-d" value="${TF.dia}"></label><label class="f" style="flex:1">Buscar (nº, cliente, vino)<input id="tf-q" value="${esc(TF.q)}"></label>
   <button class="btn" data-a="tfTodos" style="align-self:flex-end">Todos los días</button></div>
   <div class="cards" style="margin-bottom:12px"><div class="card"><div class="k">Tickets</div><div class="v">${list.length}</div></div><div class="card"><div class="k">Total</div><div class="v num">${eur(tot)}</div></div></div>
   <table class="t"><tr><th>Nº</th><th>Fecha</th><th>Operario</th><th>Cliente</th><th>Cobro</th><th class="r">Total</th></tr>
   ${list.slice(0, 500).map(t => `<tr class="click" data-a="verTicket" data-v="${t.id}"><td><b>${esc(t.num)}</b>${t.orig ? `<br><span class="muted" style="font-size:12px">rectifica ${esc(t.orig)}</span>` : ''}</td><td>${fdate(t.fecha)} ${ftime(t.fecha)}</td><td>${esc(t.op)}</td><td>${esc(t.cliente ? (t.cliente.nombre || t.cliente.codigo) : 'Contado')}</td><td>${[...new Set(t.pagos.map(p => FORMAS[p.f]))].join(' + ')}</td><td class="r num ${t.total < 0 ? 'mal' : ''}"><b>${eur(t.total)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="vacio">No hay tickets.</td></tr>'}</table></div>`;
  $('#tf-d').onchange = e => { TF.dia = e.target.value; vTickets(); };
  $('#tf-q').onchange = e => { TF.q = e.target.value; vTickets(); };
}
function devuelto(num) {
  const m = {}; TICKETS.filter(t => t.orig === num).forEach(t => t.lineas.forEach(l => { const k = l.c + '|' + l.n + '|' + l.pu; m[k] = (m[k] || 0) - l.u; })); return m;
}
function verTicket(id) {
  const t = TICKETS.find(x => x.id === id); if (!t) return;
  modal(`Ticket ${t.num}`, `<div style="display:flex;gap:16px;flex-wrap:wrap"><div>${previewHTML(ticketHTML(t))}</div><div style="flex:1;min-width:220px">
   <p><b>${eur(t.total)}</b> · ${fdate(t.fecha)} ${ftime(t.fecha)} · ${esc(t.op)}</p>
   ${t.exp && t.exp.stock ? `<p class="muted" style="font-size:13px">Stock exportado a Sage el ${fdate(t.exp.stock)}</p>` : ''}
   <div class="acciones" style="flex-direction:column;align-items:stretch">
    <button class="btn vino" data-a="reimprimir" data-v="${t.id}">Reimprimir (copia)</button>
    <button class="btn" data-a="regalo" data-v="${t.id}">Imprimir ticket regalo</button>
    ${t.tipo === 'venta' ? `<button class="btn" data-a="devolver" data-v="${t.id}">Devolución / cambio</button>` : ''}
   </div>${TICKETS.some(x => x.orig === t.num) ? `<p class="muted" style="font-size:13px">Tiene devoluciones: ${TICKETS.filter(x => x.orig === t.num).map(x => esc(x.num)).join(', ')}</p>` : ''}</div></div>`, '', 'ancho');
}
function devolver(id) {
  const t = TICKETS.find(x => x.id === id); if (!t) return;
  if (TK.lineas.length) return toast('Termina o aparca el ticket en curso antes de una devolución', 1);
  const dv = devuelto(t.num);
  const filas = t.lineas.map((l, i) => { const ya = dv[l.c + '|' + l.n + '|' + l.pu] || 0; return { l, i, max: Math.max(0, l.u - ya), ya }; });
  modal(`Devolución de ${t.num}`, `<p class="muted" style="margin-top:0">Indica cuántas unidades devuelve el cliente. Se genera una factura rectificativa (serie ${esc(CFG.serieDev)}) y el stock vuelve a sumar en Sage.</p>
   <table class="t"><tr><th>Artículo</th><th class="r">Vendidas</th><th class="r">Ya devueltas</th><th class="r">Devolver</th></tr>
   ${filas.map(f => `<tr><td>${esc(f.l.n)}<br><span class="muted" style="font-size:12px">${eur(f.l.pu)}${f.l.dto ? ` dto ${f.l.dto}%` : ''}</span></td><td class="r">${f.l.u}</td><td class="r">${f.ya}</td><td class="r"><input type="number" min="0" max="${f.max}" value="${f.max}" data-i="${f.i}" class="dv-u" style="width:70px;padding:6px;border:1.5px solid var(--linea);border-radius:8px;text-align:right" ${f.max ? '' : 'disabled'}></td></tr>`).join('')}</table>`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="dv-ok">Preparar devolución</button>`, 'ancho');
  $('#dv-ok').onclick = () => {
    const lineas = [];
    for (const inp of $$('.dv-u')) {
      const f = filas[+inp.dataset.i], u = parseInt(inp.value, 10) || 0;
      if (u < 0 || u > f.max) return toast('Unidades no válidas', 1);
      if (u) lineas.push({ c: f.l.c, n: f.l.n, i: f.l.i, f: f.l.f, u: -u, pu: f.l.pu, dto: f.l.dto, manual: true });
    }
    if (!lineas.length) return toast('No hay nada que devolver', 1);
    TK = { lineas, cliente: t.cliente, tarifa: t.tarifa, dto: t.dto, orig: t.num }; saveTK();
    cerrarTodos(); S.vista = 'venta'; S.sel = -1; render();
  };
}

/* ---------- caja ---------- */
function apertura(despues) {
  const ult = CIERRES.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const prop = ult ? ult.reposicion : 0;
  modal('Abrir caja', `<p style="margin-top:0">¿Cuánto efectivo hay en el cajón para empezar (fondo de caja)?</p><label class="f">Fondo inicial (€)<input id="ap-f" inputmode="decimal" value="${n2(prop)}" autofocus></label>`,
    `<button class="btn" data-a="cerrarModal">Ahora no</button><button class="btn vino" id="ap-ok">Abrir caja</button>`);
  const ok = () => {
    const f = parseEur($('#ap-f').value); if (isNaN(f) || f < 0) return toast('Importe no válido', 1);
    CAJA = { id: uid(), apertura: new Date().toISOString(), fondo: f, op: S.op.nombre, movs: [] }; LS.set('caja', CAJA);
    cerrarModal(); render(); toast('Caja abierta'); if (despues) despues();
  };
  $('#ap-ok').onclick = ok; $('#ap-f').onkeydown = e => { if (e.key === 'Enter') ok(); };
}
function resumen(tks, caja) {
  const r = { n: tks.length, ventas: 0, devol: 0, total: 0, formas: { efectivo: 0, tarjeta: 0, bizum: 0 }, ivas: {}, fams: {}, uds: 0, desde: null, hasta: null, entradas: 0, salidas: 0 };
  const ord = tks.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  r.desde = ord[0] ? ord[0].num : ''; r.hasta = ord.length ? ord[ord.length - 1].num : '';
  for (const t of tks) {
    r.total += t.total; if (t.total >= 0) r.ventas += t.total; else r.devol += t.total;
    t.pagos.forEach(p => r.formas[p.f] = (r.formas[p.f] || 0) + p.imp);
    t.ivas.forEach(v => { const x = r.ivas[v.r] || (r.ivas[v.r] = { base: 0, cuota: 0, total: 0 }); x.base += v.base; x.cuota += v.cuota; x.total += v.total; });
    t.lineas.forEach(l => { const k = l.f || 'otros'; r.fams[k] = (r.fams[k] || 0) + l.tot; r.uds += l.u; });
  }
  if (caja) { caja.movs.forEach(m => { if (m.t === 'entrada') r.entradas += m.imp; else r.salidas += m.imp; }); r.fondo = caja.fondo; r.esperado = caja.fondo + r.formas.efectivo + r.entradas - r.salidas; }
  return r;
}
function vCaja() {
  const ult = CIERRES.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  let h = `<div class="pane"><h1>Caja</h1>`;
  if (!CAJA) h += `<div class="box"><p>La caja está cerrada.</p><button class="btn vino grande" data-a="abrirCaja">Abrir caja</button></div>`;
  else {
    const r = resumen(TICKETS.filter(t => t.caja === CAJA.id), CAJA);
    h += `<p class="muted">Abierta el ${fdate(CAJA.apertura)} a las ${ftime(CAJA.apertura)} por ${esc(CAJA.op)}</p>
    <div class="cards"><div class="card"><div class="k">Ventas netas</div><div class="v num">${eur(r.total)}</div></div><div class="card"><div class="k">Tickets</div><div class="v">${r.n}</div></div>
    <div class="card"><div class="k">Efectivo</div><div class="v num">${eur(r.formas.efectivo)}</div></div><div class="card"><div class="k">Tarjeta</div><div class="v num">${eur(r.formas.tarjeta)}</div></div>
    <div class="card"><div class="k">Bizum</div><div class="v num">${eur(r.formas.bizum)}</div></div><div class="card"><div class="k">Debe haber en el cajón</div><div class="v num">${eur(r.esperado)}</div></div></div>
    <div class="acciones" style="margin-top:14px"><button class="btn" data-a="movCaja" data-v="entrada">Entrada de dinero</button><button class="btn" data-a="movCaja" data-v="salida">Salida de dinero</button>
    <button class="btn" data-a="informeX">Imprimir informe X (parcial)</button><button class="btn vino" data-a="cierreZ">Cierre de caja (Z)</button></div>
    <h2>Movimientos de caja</h2><table class="t"><tr><th>Hora</th><th>Tipo</th><th>Motivo</th><th>Operario</th><th class="r">Importe</th></tr>
    <tr><td>${ftime(CAJA.apertura)}</td><td>Fondo inicial</td><td></td><td>${esc(CAJA.op)}</td><td class="r">${eur(CAJA.fondo)}</td></tr>
    ${CAJA.movs.map(m => `<tr><td>${ftime(m.fecha)}</td><td>${m.t === 'entrada' ? 'Entrada' : 'Salida'}</td><td>${esc(m.motivo)}</td><td>${esc(m.op)}</td><td class="r ${m.t === 'salida' ? 'mal' : ''}">${m.t === 'salida' ? '−' : ''}${eur(m.imp)}</td></tr>`).join('')}</table>`;
  }
  h += `<h2>Cierres anteriores</h2><table class="t"><tr><th>Z</th><th>Fecha</th><th>Tickets</th><th class="r">Ventas</th><th class="r">Diferencia</th><th></th></tr>
  ${ult.slice(0, 60).map(z => `<tr><td><b>${esc(z.num)}</b></td><td>${fdate(z.fecha)} ${ftime(z.fecha)}</td><td>${z.r.n}</td><td class="r">${eur(z.r.total)}</td><td class="r ${z.dif ? 'mal' : 'ok'}">${eur(z.dif)}</td><td><button class="btn sm" data-a="reimpZ" data-v="${z.id}">Imprimir</button></td></tr>`).join('') || '<tr><td colspan="6" class="vacio">Sin cierres todavía.</td></tr>'}</table></div>`;
  $('#main').innerHTML = h;
}
function movCaja(tipo) {
  modal(tipo === 'entrada' ? 'Entrada de dinero' : 'Salida de dinero', `<div class="form"><label class="f">Importe (€)<input id="mv-i" inputmode="decimal" autofocus></label><label class="f">Motivo<input id="mv-m" placeholder="${tipo === 'entrada' ? 'Cambio, ingreso…' : 'Pago proveedor, compra material…'}"></label></div>`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="mv-ok">Guardar</button>`);
  $('#mv-ok').onclick = () => {
    const imp = parseEur($('#mv-i').value); if (isNaN(imp) || imp <= 0) return toast('Importe no válido', 1);
    CAJA.movs.push({ t: tipo, imp, motivo: $('#mv-m').value.trim(), fecha: new Date().toISOString(), op: S.op.nombre }); LS.set('caja', CAJA);
    cerrarModal(); vCaja(); toast('Movimiento guardado');
  };
}
const DENOM = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
function cierreZ() {
  const tks = TICKETS.filter(t => t.caja === CAJA.id); const r = resumen(tks, CAJA);
  if (PARK.length) toast(`Atención: hay ${PARK.length} ticket(s) aparcado(s) sin cobrar`, 1);
  modal('Cierre de caja (Z)', `<p style="margin-top:0">Cuenta el efectivo del cajón. Puedes contar por billetes y monedas o escribir el total.</p>
   <div class="denom">${DENOM.map(d => `<label>${d >= 100 ? d / 100 + ' €' : d + ' cts'} × <input type="number" min="0" class="z-d" data-d="${d}" inputmode="numeric"></label>`).join('')}</div>
   <div class="form" style="margin-top:12px"><label class="f">Total contado (€)<input id="z-c" inputmode="decimal" placeholder="${n2(r.esperado)}"></label>
   <label class="f">Dejar en caja para mañana (€)<input id="z-r" inputmode="decimal" value="${n2(Math.min(CAJA.fondo, r.esperado))}"></label></div>
   <div class="cards" style="margin-top:12px"><div class="card"><div class="k">Esperado en cajón</div><div class="v num">${eur(r.esperado)}</div></div><div class="card"><div class="k">Contado</div><div class="v num" id="z-cv">—</div></div><div class="card"><div class="k">Diferencia</div><div class="v num" id="z-dv">—</div></div></div>
   <p class="muted" style="font-size:13px">Ventas ${eur(r.total)} · ${r.n} tickets · Efectivo ${eur(r.formas.efectivo)} · Tarjeta ${eur(r.formas.tarjeta)} · Bizum ${eur(r.formas.bizum)}</p>`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="z-ok">Cerrar caja e imprimir Z</button>`, 'ancho');
  const contado = () => { const v = parseEur($('#z-c').value); if (!isNaN(v)) return v; let s = 0, any = false; $$('.z-d').forEach(i => { const n = parseInt(i.value, 10); if (n > 0) { any = true; s += n * +i.dataset.d; } }); return any ? s : NaN; };
  const upd = () => { const c = contado(); $('#z-cv').textContent = isNaN(c) ? '—' : eur(c); const d = isNaN(c) ? null : c - r.esperado; $('#z-dv').textContent = d == null ? '—' : eur(d); $('#z-dv').className = 'v num ' + (d ? 'mal' : 'ok'); };
  $$('.z-d').forEach(i => i.oninput = upd); $('#z-c').oninput = upd;
  $('#z-ok').onclick = async () => {
    const c = contado(); if (isNaN(c) || c < 0) return toast('Indica el efectivo contado', 1);
    const rep = parseEur($('#z-r').value); if (isNaN(rep) || rep < 0 || rep > c) return toast('El importe a dejar no puede ser mayor que lo contado', 1);
    const den = {}; $$('.z-d').forEach(i => { const n = parseInt(i.value, 10); if (n > 0) den[i.dataset.d] = n; });
    const nZ = (CONT.Z || 0) + 1; CONT.Z = nZ; LS.set('cont', CONT);
    const z = { id: uid(), num: 'Z-' + pad(nZ, 4), fecha: new Date().toISOString(), apertura: CAJA.apertura, op: S.op.nombre, caja: CAJA.id, r, contado: c, dif: c - r.esperado, reposicion: rep, retirado: c - rep, den, movs: CAJA.movs, fondo: CAJA.fondo };
    CIERRES.push(z); await DB.put('cierres', z);
    CAJA = null; LS.set('caja', null);
    cerrarTodos(); render(); toast(`Caja cerrada (${z.num})`);
    if (CFG.imprimirZ) imprimir(zHTML(z));
  };
}
function zHTML(z, parcial) {
  const r = z.r;
  return `${cabeceraTicket()}<div class="tit">${parcial ? 'Informe X (parcial)' : 'Cierre de caja ' + esc(z.num)}</div>
  <div class="sm">Apertura: ${fdate(z.apertura)} ${ftime(z.apertura)}<br>${parcial ? 'Emitido' : 'Cierre'}: ${fdate(z.fecha)} ${ftime(z.fecha)}<br>Operario: ${esc(z.op)}</div>
  <div class="hr"></div><div class="row"><span>Tickets</span><span>${r.n}</span></div>${r.n ? `<div class="sm">Del ${esc(r.desde)} al ${esc(r.hasta)}</div>` : ''}
  <div class="row"><span>Ventas</span><span>${n2(r.ventas)}</span></div><div class="row"><span>Devoluciones</span><span>${n2(r.devol)}</span></div>
  <div class="total"><span>TOTAL</span><span>${eur(r.total)}</span></div>
  <div class="hr"></div><b>Formas de cobro</b>${Object.entries(r.formas).map(([f, v]) => `<div class="row"><span>${FORMAS[f]}</span><span>${n2(v)}</span></div>`).join('')}
  <div class="hr"></div><table class="sm"><tr><th>IVA</th><th class="r">Base</th><th class="r">Cuota</th><th class="r">Total</th></tr>${Object.entries(r.ivas).sort((a, b) => b[0] - a[0]).map(([k, v]) => `<tr><td>${k}%</td><td class="r">${n2(v.base)}</td><td class="r">${n2(v.cuota)}</td><td class="r">${n2(v.total)}</td></tr>`).join('')}</table>
  <div class="hr"></div><b>Por familia</b>${Object.entries(r.fams).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<div class="row sm"><span>${(FAM[f] || FAM.otros)[1]}</span><span>${n2(v)}</span></div>`).join('')}
  <div class="hr"></div><b>Arqueo de efectivo</b><div class="row"><span>Fondo inicial</span><span>${n2(z.fondo)}</span></div><div class="row"><span>+ Cobros efectivo</span><span>${n2(r.formas.efectivo)}</span></div>
  <div class="row"><span>+ Entradas</span><span>${n2(r.entradas)}</span></div><div class="row"><span>− Salidas</span><span>${n2(r.salidas)}</span></div><div class="row"><b>Esperado</b><b>${n2(r.esperado)}</b></div>
  ${parcial ? '' : `<div class="row"><b>Contado</b><b>${n2(z.contado)}</b></div><div class="row"><b>Diferencia</b><b>${n2(z.dif)}</b></div><div class="row"><span>Retirado</span><span>${n2(z.retirado)}</span></div><div class="row"><span>Queda en caja</span><span>${n2(z.reposicion)}</span></div>`}
  ${(z.movs || []).length ? `<div class="hr"></div><b>Movimientos</b>${z.movs.map(m => `<div class="row sm"><span>${ftime(m.fecha)} ${m.t === 'entrada' ? 'Entrada' : 'Salida'} ${esc(m.motivo)}</span><span>${m.t === 'salida' ? '-' : ''}${n2(m.imp)}</span></div>`).join('')}` : ''}
  ${parcial ? '' : '<div style="margin-top:14px" class="sm">Firma:</div><div style="height:12mm"></div>'}`;
}

/* ---------- exportación Sage 50 ---------- */
let XF = { desde: dia(), hasta: dia(), solo: 'nuevos' };
function ticketsRango() { return TICKETS.filter(t => t.dia >= XF.desde && t.dia <= XF.hasta).sort((a, b) => a.fecha.localeCompare(b.fecha)); }
function vSage() {
  const tks = ticketsRango(), r = resumen(tks);
  const yaStock = tks.filter(t => t.exp && t.exp.stock).length, yaAs = tks.filter(t => t.exp && t.exp.asiento).length;
  $('#main').innerHTML = `<div class="pane"><h1>Pasar a Sage 50</h1>
  <div class="box"><div class="acciones" style="margin-top:0"><label class="f">Desde<input type="date" id="x-d" value="${XF.desde}"></label><label class="f">Hasta<input type="date" id="x-h" value="${XF.hasta}"></label>
   <label class="f">Incluir<select id="x-s"><option value="nuevos" ${XF.solo === 'nuevos' ? 'selected' : ''}>Solo lo no exportado</option><option value="todos" ${XF.solo === 'todos' ? 'selected' : ''}>Todo el periodo</option></select></label></div>
   <div class="cards"><div class="card"><div class="k">Tickets</div><div class="v">${r.n}</div></div><div class="card"><div class="k">Total</div><div class="v num">${eur(r.total)}</div></div>
   <div class="card"><div class="k">Stock ya exportado</div><div class="v">${yaStock}/${r.n}</div></div><div class="card"><div class="k">Asiento ya exportado</div><div class="v">${yaAs}/${r.n}</div></div></div></div>
  <div class="cards">
   <div class="box"><h2 style="margin-top:0">1 · Excel de ventas</h2><p class="muted">Tickets, líneas, IVA, cobros y cierres Z del periodo. Para revisar, para el asesor o para meter albaranes a mano en Sage.</p><button class="btn vino" data-a="expExcel" ${r.n ? '' : 'disabled'}>Descargar Excel</button></div>
   <div class="box"><h2 style="margin-top:0">2 · Stock para Sage</h2><p class="muted">CSV con las unidades vendidas en negativo por artículo (y las devueltas en positivo) para descontar el stock en Sage.</p><button class="btn vino" data-a="expStock" ${r.n ? '' : 'disabled'}>Descargar CSV de stock</button></div>
   <div class="box"><h2 style="margin-top:0">3 · Asiento contable</h2><p class="muted">CSV con formato ContaPlus: un asiento por día (caja y banco al debe; ventas e IVA al haber), para el add-on de asientos.</p><button class="btn vino" data-a="expAsiento" ${r.n ? '' : 'disabled'}>Descargar CSV de asientos</button></div>
  </div>
  <div class="box"><h2 style="margin-top:0">Cómo meterlo en Sage 50</h2>
   <h3>Stock (Herramientas › Importaciones)</h3><ol class="pasos">
    <li>Solo la primera vez: en Sage 50 ve a <b>Herramientas › Importaciones › Guías de datos</b> y crea una guía nueva de tipo <b>Artículos</b> (por ejemplo, código <b>TPV</b>).</li>
    <li>Pulsa <b>Usar fichero de muestra</b> y elige el CSV del TPV. Separador <b>punto y coma</b> y marca que la primera fila son los títulos.</li>
    <li>Relaciona <b>Código artículo → Código del artículo</b> y <b>Stock → Stock del artículo</b> (con tu almacén). Las demás columnas no las relaciones.</li>
    <li>Cada vez: en <b>Herramientas › Importaciones</b> elige la guía <b>TPV</b> y el CSV, y <b>NO marques "Actualizar datos existentes"</b>. Así Sage <b>suma</b> las unidades (en negativo, o sea, las resta) en lugar de sustituir el stock.</li>
    <li>La primera vez, haz la prueba con un CSV de un solo artículo y comprueba el stock en Sage antes de importar un día completo.</li></ol>
   <h3>Asiento de ventas (add-on Importación/Exportación de asientos)</h3><ol class="pasos">
    <li>Si no lo tienes, actívalo en el panel de <b>add-ons y servicios conectados › Imp./Exp. de asientos</b>.</li>
    <li>Abre <b>Archivos › Importación de asientos</b> y sigue el asistente con el CSV del TPV (estructura compatible con ContaPlus).</li>
    <li>Revisa las cuentas contables en <b>Ajustes › Sage 50</b> (caja 570, banco 572, ventas 700, IVA 477). Valídalo una vez con tu asesoría.</li></ol>
   <h3>Tickets como documento</h3><p>Sage 50 no importa tickets ni albaranes desde un fichero. Para tener el detalle en Sage, usa el Excel (hoja "Lineas") para hacer un albarán o factura resumen a "Clientes varios". Más adelante se puede conectar directo con la base de datos de Sage (como el conector de Reparto).</p>
   <div class="aviso"><b>Veri*factu:</b> los programas que emiten facturas o tickets tendrán que cumplir el reglamento Veri*factu (huella encadenada, QR de la AEAT y declaración del fabricante). Mientras tanto, consúltalo con tu asesoría: hoy este TPV sirve de caja y de control, y Sage sigue siendo el registro oficial.</div>
  </div></div>`;
  $('#x-d').onchange = e => { XF.desde = e.target.value; vSage(); };
  $('#x-h').onchange = e => { XF.hasta = e.target.value; vSage(); };
  $('#x-s').onchange = e => { XF.solo = e.target.value; };
}
function encode1252(str) {
  const map = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F };
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) { const ch = str[i], c = ch.charCodeAt(0); out[i] = map[ch] || (c < 256 && !(c >= 0x80 && c < 0xA0) ? c : 0x3F); }
  return out;
}
const csvCell = v => { v = String(v ?? ''); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const csv = rows => rows.map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
const n2p = c => (c / 100).toFixed(2).replace('.', ',');
const fname = (p, ext) => `${p}_${XF.desde.replace(/-/g, '')}${XF.hasta !== XF.desde ? '-' + XF.hasta.replace(/-/g, '') : ''}.${ext}`;
function elegir(tipo) { const tks = ticketsRango(); return XF.solo === 'todos' ? tks : tks.filter(t => !(t.exp && t.exp[tipo])); }
async function marcar(tks, tipo) { const now = new Date().toISOString(); tks.forEach(t => { t.exp = t.exp || {}; t.exp[tipo] = now; }); await DB.putMany('tickets', tks); }
async function expStock() {
  const tks = elegir('stock'); if (!tks.length) return toast('No hay tickets nuevos en ese periodo (cambia "Incluir" a "Todo el periodo" si quieres repetir)', 1);
  const m = new Map(); let sinCod = 0;
  tks.forEach(t => t.lineas.forEach(l => { if (!l.c) { sinCod += l.u; return; } const x = m.get(l.c) || { c: l.c, n: l.n, u: 0 }; x.u -= l.u; m.set(l.c, x); }));
  const rows = [['Código artículo', 'Nombre artículo', 'Stock', 'Almacén']];
  [...m.values()].filter(x => x.u !== 0).sort((a, b) => a.c.localeCompare(b.c)).forEach(x => rows.push([x.c, x.n, x.u, CFG.sage.almacen]));
  descargar(fname('TPV_stock', 'csv'), new Blob([encode1252(csv(rows))], { type: 'text/csv' }));
  await marcar(tks, 'stock'); vSage();
  toast(`CSV de stock: ${rows.length - 1} artículos${sinCod ? ` · ${sinCod} ud. de artículo libre sin código (no se descuentan)` : ''}`);
}
function lineasAsiento(tks) {
  const porDia = {};
  tks.forEach(t => { (porDia[t.dia] = porDia[t.dia] || []).push(t); });
  const sg = CFG.sage, out = [];
  let asien = parseInt(sg.asientoInicial, 10) || 1;
  for (const d of Object.keys(porDia).sort()) {
    const r = resumen(porDia[d]), f = d.split('-').reverse().join('/');
    const concepto = `Ventas TPV ${f} (${r.desde} a ${r.hasta})`.slice(0, 60);
    const apuntes = [];
    const cobro = {}; Object.entries(r.formas).forEach(([k, v]) => { const cta = k === 'efectivo' ? sg.cuentaCaja : k === 'tarjeta' ? sg.cuentaTarjeta : sg.cuentaBizum; cobro[cta] = (cobro[cta] || 0) + v; });
    Object.entries(cobro).forEach(([cta, v]) => v && apuntes.push({ cta, debe: v, haber: 0 }));
    const ventas = {}; Object.entries(r.ivas).forEach(([k, v]) => { const cta = sg.ventas[k] || sg.ventas[21]; ventas[cta] = (ventas[cta] || 0) + v.base; });
    Object.entries(ventas).forEach(([cta, v]) => v && apuntes.push({ cta, debe: 0, haber: v }));
    Object.entries(r.ivas).forEach(([k, v]) => v.cuota && apuntes.push({ cta: sg.iva[k] || sg.iva[21], debe: 0, haber: v.cuota, base: v.base, iva: +k }));
    apuntes.forEach(a => { if (a.debe < 0 || a.haber < 0) { const dd = -a.haber, hh = -a.debe; a.debe = Math.max(0, dd); a.haber = Math.max(0, hh); if (a.base) a.base = -a.base; } });
    const sd = apuntes.reduce((s, a) => s + a.debe, 0), sh = apuntes.reduce((s, a) => s + a.haber, 0);
    if (sd !== sh) throw new Error(`El asiento del ${f} no cuadra (${n2(sd)} / ${n2(sh)})`);
    apuntes.forEach(a => out.push({ asien, fecha: f, ...a, concepto, doc: r.desde }));
    asien++;
  }
  return out;
}
async function expAsiento() {
  const tks = elegir('asiento'); if (!tks.length) return toast('No hay tickets nuevos en ese periodo', 1);
  let ap; try { ap = lineasAsiento(tks); } catch (e) { return toast(e.message, 1); }
  const H = ['ASIEN', 'FECHA', 'SUBCTA', 'CONTRA', 'PTADEBE', 'CONCEPTO', 'PTAHABER', 'FACTURA', 'BASEIMPO', 'IVA', 'RECEQUIV', 'DOCUMENTO', 'DEPARTA', 'CLAVE', 'ESTADO', 'NCASADO', 'TCASADO', 'TRANS', 'CAMBIO', 'DEBEME', 'HABERME', 'AUXILIAR', 'SERIE', 'SUCURSAL', 'CODDIVISA', 'IMPAUXME', 'MONEDAUSO', 'EURODEBE', 'EUROHABER', 'BASEEURO', 'NOCONV', 'NUMEROINV'];
  const rows = [H, ...ap.map(a => [a.asien, a.fecha, a.cta, '', '0,00', a.concepto, '0,00', '', '0,00', a.iva != null ? a.iva : '0', '0', a.doc, '', '', '', '', '', '', '0', '0,00', '0,00', '', '', '', '', '0,00', '2', n2p(a.debe), n2p(a.haber), a.base != null ? n2p(a.base) : '0,00', '', ''])];
  descargar(fname('TPV_asientos', 'csv'), new Blob([encode1252(csv(rows))], { type: 'text/csv' }));
  await marcar(tks, 'asiento'); vSage();
  toast(`CSV de asientos: ${new Set(ap.map(a => a.asien)).size} asiento(s), ${ap.length} apuntes`);
}
function expExcel() {
  if (!window.XLSX) return toast('Cargando… vuelve a pulsar en un momento', 1);
  const tks = ticketsRango(); const e = v => v / 100;
  const T = tks.map(t => {
    const o = { 'Nº ticket': t.num, Tipo: t.tipo === 'dev' ? 'Devolución' : 'Venta', Fecha: fdate(t.fecha), Hora: ftime(t.fecha), Operario: t.op, 'Código cliente': t.cliente ? t.cliente.codigo : (CFG.sage.clienteContado || ''), Cliente: t.cliente ? t.cliente.nombre : 'Contado', NIF: t.cliente ? t.cliente.nif : '', 'Dto ticket %': t.dto };
    IVAS.forEach(r => { const v = t.ivas.find(x => x.r === r); o[`Base ${r}%`] = v ? e(v.base) : 0; o[`IVA ${r}%`] = v ? e(v.cuota) : 0; });
    o.Total = e(t.total); Object.keys(FORMAS).forEach(f => o[FORMAS[f]] = e(t.pagos.filter(p => p.f === f).reduce((s, p) => s + p.imp, 0)));
    o.Rectifica = t.orig || ''; return o;
  });
  const L = []; tks.forEach(t => t.lineas.forEach(l => { const base = rnd(l.tot * 100 / (100 + l.i)); L.push({ 'Nº ticket': t.num, Fecha: fdate(t.fecha), 'Código artículo': l.c, Descripción: l.n, Familia: (FAM[l.f] || FAM.otros)[1], Unidades: l.u, 'Precio (IVA incl.)': e(l.pu), 'Dto %': l.dto, 'Dto ticket %': t.dto, '% IVA': l.i, Base: e(base), Cuota: e(l.tot - base), Total: e(l.tot) }); }));
  const st = new Map(); tks.forEach(t => t.lineas.forEach(l => { const k = l.c || '(sin código) ' + l.n; const x = st.get(k) || { 'Código artículo': l.c, Nombre: l.n, Unidades: 0, Importe: 0 }; x.Unidades += l.u; x.Importe += e(l.tot); st.set(k, x); }));
  const porDia = {}; tks.forEach(t => (porDia[t.dia] = porDia[t.dia] || []).push(t));
  const D = Object.keys(porDia).sort().map(d => { const r = resumen(porDia[d]); const o = { Día: d.split('-').reverse().join('/'), Tickets: r.n, Desde: r.desde, Hasta: r.hasta, Ventas: e(r.ventas), Devoluciones: e(r.devol), Total: e(r.total) }; Object.keys(FORMAS).forEach(f => o[FORMAS[f]] = e(r.formas[f] || 0)); IVAS.forEach(k => { const v = r.ivas[k]; o[`Base ${k}%`] = v ? e(v.base) : 0; o[`IVA ${k}%`] = v ? e(v.cuota) : 0; }); return o; });
  const Z = CIERRES.filter(z => dia(z.fecha) >= XF.desde && dia(z.fecha) <= XF.hasta).map(z => ({ Z: z.num, Apertura: fdate(z.apertura) + ' ' + ftime(z.apertura), Cierre: fdate(z.fecha) + ' ' + ftime(z.fecha), Operario: z.op, Tickets: z.r.n, Total: e(z.r.total), Efectivo: e(z.r.formas.efectivo), Tarjeta: e(z.r.formas.tarjeta), Bizum: e(z.r.formas.bizum), Esperado: e(z.r.esperado), Contado: e(z.contado), Diferencia: e(z.dif), Retirado: e(z.retirado), 'Queda en caja': e(z.reposicion) }));
  const wb = XLSX.utils.book_new();
  const add = (n, rows) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'Sin datos' }]); ws['!cols'] = Object.keys(rows[0] || { a: 1 }).map(k => ({ wch: Math.max(10, Math.min(48, k.length + 4, ...rows.slice(0, 200).map(r => String(r[k] ?? '').length + 2))) })); XLSX.utils.book_append_sheet(wb, ws, n); };
  add('Resumen por dia', D); add('Tickets', T); add('Lineas', L); add('Stock vendido', [...st.values()]); add('Cierres Z', Z);
  descargar(fname('TPV_ventas', 'xlsx'), new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  toast('Excel descargado');
}

/* ---------- artículos ---------- */
let AQ = '';
function vArticulos() {
  const r = AQ ? filtrar(AQ, 'todos') : ARTS;
  $('#main').innerHTML = `<div class="pane"><h1>Artículos</h1>
   <div class="acciones"><input id="aq" placeholder="Buscar por nombre, código o código de barras" value="${esc(AQ)}" style="flex:1;font-size:16px;padding:11px 13px;border-radius:12px;border:1.5px solid var(--linea)">
   <button class="btn vino" data-a="nuevoArt">Nuevo artículo</button><button class="btn" data-a="importArt">Importar Excel de Sage</button><button class="btn" data-a="expArts">Exportar catálogo</button></div>
   <p class="muted" style="font-size:13px">${ARTS.length} artículos · ${ARTS.filter(a => a.b && a.b.length).length} con código de barras · tarifas: PVP Tienda${TARIFAS.map(t => ', ' + esc(t.n)).join('')}. Los cambios se guardan en este dispositivo.</p>
   <table class="t"><tr><th>Código</th><th>Nombre</th><th>Familia</th><th>Cód. barras</th><th class="r">IVA</th><th class="r">PVP</th></tr>
   ${r.slice(0, 400).map(a => `<tr class="click" data-a="editArt" data-v="${esc(a.c)}"><td>${esc(a.c)}</td><td>${esc(a.n)}</td><td>${(FAM[a.f] || FAM.otros)[1]}</td><td style="font-size:12.5px">${esc((a.b || []).join(' '))}</td><td class="r">${a.i}%</td><td class="r"><b>${eur(a.p)}</b></td></tr>`).join('')}</table>
   ${r.length > 400 ? `<p class="muted">Mostrando 400 de ${r.length}. Busca para afinar.</p>` : ''}</div>`;
  const q = $('#aq'); q.oninput = () => { AQ = q.value; clearTimeout(q._t); q._t = setTimeout(() => { vArticulos(); const n = $('#aq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
}
function editArt(c) {
  const a = c ? BYC.get(c.toUpperCase()) : { c: '', n: '', p: 0, i: 21, f: 'tintos', b: [] };
  modal(c ? 'Editar artículo' : 'Nuevo artículo', `<div class="form">
   <label class="f">Código (el de Sage)<input id="ea-c" value="${esc(a.c)}" ${c ? 'readonly' : 'autofocus'}></label>
   <label class="f" style="grid-column:span 2">Nombre<input id="ea-n" value="${esc(a.n)}" ${c ? 'autofocus' : ''}></label>
   <label class="f">PVP Tienda (IVA incl.)<input id="ea-p" inputmode="decimal" value="${n2(a.p)}"></label>
   ${TARIFAS.map(t => `<label class="f">${esc(t.n)}<input class="ea-t" data-k="${t.k}" inputmode="decimal" value="${a.t && a.t[t.k] != null ? n2(a.t[t.k]) : ''}"></label>`).join('')}
   <label class="f">IVA %<select id="ea-i">${IVAS.map(v => `<option ${v === a.i ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
   <label class="f">Familia<select id="ea-f">${FAMS.slice(2).map(f => `<option value="${f[0]}" ${a.f === f[0] ? 'selected' : ''}>${f[1]}</option>`).join('')}</select></label>
   <label class="f" style="grid-column:1/-1">Códigos de barras (separados por espacio)<input id="ea-b" value="${esc((a.b || []).join(' '))}"></label></div>`,
    `${c ? '<button class="btn peligro" id="ea-del" style="margin-right:auto">Ocultar del TPV</button>' : ''}<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn vino" id="ea-ok">Guardar</button>`);
  $('#ea-ok').onclick = () => {
    const code = $('#ea-c').value.trim(), n = $('#ea-n').value.trim(), p = parseEur($('#ea-p').value);
    if (!code || !n || isNaN(p) || p < 0) return toast('Código, nombre y precio son obligatorios', 1);
    if (!c && BYC.get(code.toUpperCase())) return toast('Ya existe un artículo con ese código', 1);
    const t = {}; $$('.ea-t').forEach(i => { const v = parseEur(i.value); if (!isNaN(v)) t[i.dataset.k] = v; });
    EXTRA[code] = { ...(EXTRA[code] || {}), n, p, i: parseInt($('#ea-i').value, 10), f: $('#ea-f').value, b: $('#ea-b').value.split(/[\s,;]+/).filter(Boolean), t };
    LS.set('arts', EXTRA); buildArts(); cerrarModal(); vArticulos(); toast('Artículo guardado');
  };
  if (c) $('#ea-del').onclick = () => confirmar('Ocultar artículo', `¿Ocultar "${esc(a.n)}" del TPV? No se borra de Sage.`, 'Ocultar', () => { EXTRA[c] = { del: true }; LS.set('arts', EXTRA); buildArts(); cerrarTodos(); vArticulos(); }, 1);
}
function importArt() {
  modal('Importar artículos desde Excel', `<p style="margin-top:0">Sirve el listado de Sage <b>"Tarifas de artículos"</b> o cualquier Excel/CSV con columnas de <b>código</b>, <b>nombre</b> y <b>precio</b>. Si tiene IVA, familia (TIPOS), códigos de barras u otras tarifas (PVP 4, PVP 5…), también se leen.</p>
   <p class="muted" style="font-size:13px">Los artículos que ya existen se actualizan y los nuevos se añaden. No se borra nada.</p>
   <input type="file" id="ia-f" accept=".xlsx,.xls,.csv">`, `<button class="btn" data-a="cerrarModal">Cerrar</button>`);
  $('#ia-f').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!window.XLSX) return toast('Cargando lector de Excel… prueba otra vez', 1);
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const res = importarFilas(wb);
      cerrarTodos(); vArticulos();
      modal('Importación terminada', `<p>${res.nuevos} artículos nuevos · ${res.act} actualizados · ${res.bc} códigos de barras${res.tarifas.length ? ' · tarifas: ' + res.tarifas.map(esc).join(', ') : ''}.</p>${res.omit ? `<p class="muted">${res.omit} filas omitidas (sin código, precio 0 o "NO USAR").</p>` : ''}`, `<button class="btn vino" data-a="cerrarModal">Vale</button>`);
    } catch (err) { console.error(err); toast('No se pudo leer el fichero: ' + err.message, 1); }
  };
}
function importarFilas(wb) {
  let best = null;
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
    for (let h = 0; h < Math.min(15, rows.length); h++) {
      const H = rows[h].map(x => norm(x).trim());
      const ci = H.findIndex(x => /^(codigo|cod\.?|articulo|cod\. articulo|codigo articulo|referencia)$/.test(x));
      const ni = H.findIndex(x => /^(nombre|nombre articulo|descripcion|denominacion)$/.test(x));
      if (ci >= 0 && ni >= 0) { best = { rows, h, H, ci, ni }; break; }
    }
    if (best) break;
  }
  if (!best) throw new Error('no encuentro las columnas Código y Nombre');
  const { rows, h, H, ci, ni } = best;
  const pi = H.findIndex(x => /^pvp ?1\b|pvp tienda|^precio( venta)?$|^pvp$/.test(x));
  const ii = H.findIndex(x => /iva/.test(x) && !/sin iva/.test(x));
  const ti = H.findIndex(x => /^(tipos?|familia|nombre familia)$/.test(x));
  const bis = H.map((x, i) => /barras|ean/.test(x) ? i : -1).filter(i => i >= 0);
  const otras = H.map((x, i) => (/^pvp ?\d/.test(x) && i !== pi && !/sin iva/.test(x)) ? i : -1).filter(i => i >= 0);
  if (pi < 0) throw new Error('no encuentro la columna de precio (PVP 1 o Precio)');
  const tk = otras.map(i => { const nm = String(rows[h][i]).trim(); return { k: 't' + norm(nm).replace(/[^a-z0-9]/g, ''), n: nm, i }; });
  tk.forEach(t => { if (!TARIFAS.find(x => x.k === t.k)) TARIFAS.push({ k: t.k, n: t.n }); }); LS.set('tarifas', TARIFAS);
  const num = v => typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  const res = { nuevos: 0, act: 0, bc: 0, omit: 0, tarifas: tk.map(t => t.n) };
  for (const r of rows.slice(h + 1)) {
    const c = String(r[ci] ?? '').trim(), n = String(r[ni] ?? '').replace(/\s+/g, ' ').trim(), p = num(r[pi]);
    if (!c || !n || /no usar/i.test(n) || !(p > 0)) { res.omit++; continue; }
    const ex = BYC.get(c.toUpperCase());
    const x = { ...(EXTRA[c] && !EXTRA[c].del ? EXTRA[c] : {}), n, p: Math.round(p * 100) };
    if (ii >= 0) { let iv = num(r[ii]); if (iv > 0 && iv < 1) iv *= 100; if ([21, 10, 4, 0].includes(Math.round(iv))) x.i = Math.round(iv); }
    if (ti >= 0 && r[ti]) x.f = famDe(String(r[ti]));
    const bcs = bis.map(i => String(r[i] ?? '').trim()).filter(v => /^\d{6,14}$/.test(v));
    if (bcs.length) { x.b = [...new Set([...(ex && ex.b || []), ...bcs])]; res.bc += bcs.length; }
    const t = { ...(ex && ex.t || {}) }; tk.forEach(tt => { const v = num(r[tt.i]); if (v > 0) t[tt.k] = Math.round(v * 100); }); if (Object.keys(t).length) x.t = t;
    if (!ex && x.i == null) x.i = 21; if (!ex && !x.f) x.f = 'otros';
    EXTRA[c] = x; ex ? res.act++ : res.nuevos++;
  }
  LS.set('arts', EXTRA); buildArts();
  return res;
}
function famDe(t) {
  t = norm(t);
  if (/^tinto dulce|dulce natural|^generoso/.test(t)) return 'generosos';
  if (/^tinto/.test(t)) return 'tintos'; if (/^blanco/.test(t)) return 'blancos'; if (/^rosado/.test(t)) return 'rosados'; if (/^espumoso|cava|champ/.test(t)) return 'espumosos';
  if (/licor|ginebra|\bron\b|whisk|brandy|vodka|cognac/.test(t)) return 'destilados'; if (/^magnum|botellas peq/.test(t)) return 'formatos';
  if (/cesta|cajas madera|regalo|selecciones club/.test(t)) return 'regalo'; if (/gastronom|aceite/.test(t)) return 'gourmet'; if (/cristaler|accesorio|soporte/.test(t)) return 'accesorios';
  return 'otros';
}
function expArts() {
  if (!window.XLSX) return toast('Cargando…', 1);
  const rows = ARTS.map(a => { const o = { 'Código artículo': a.c, 'Nombre artículo': a.n, Familia: (FAM[a.f] || FAM.otros)[1], '% IVA': a.i, 'PVP Tienda': a.p / 100 }; TARIFAS.forEach(t => o[t.n] = a.t && a.t[t.k] != null ? a.t[t.k] / 100 : ''); o['Códigos de barras'] = (a.b || []).join(' '); return o; });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Artículos TPV');
  descargar('TPV_articulos.xlsx', new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]));
}

/* ---------- ajustes ---------- */
let AJ_OK = false;
function vAjustes() {
  if (!AJ_OK) { $('#main').innerHTML = `<div class="pane"><h1>Ajustes</h1><div class="box"><p>Los ajustes están protegidos con el PIN de administrador.</p><button class="btn vino" data-a="desbloquearAj">Introducir PIN</button></div></div>`; return; }
  const e = CFG.empresa, sg = CFG.sage;
  const inp = (id, lab, val, extra = '') => `<label class="f">${lab}<input data-cfg="${id}" value="${esc(val)}" ${extra}></label>`;
  $('#main').innerHTML = `<div class="pane"><h1>Ajustes</h1>
  <div class="box"><h2 style="margin-top:0">Datos del ticket</h2><div class="form">
   ${inp('empresa.comercial', 'Nombre comercial', e.comercial)}${inp('empresa.nombre', 'Razón social', e.nombre)}${inp('empresa.nif', 'NIF', e.nif)}
   ${inp('empresa.dir', 'Dirección', e.dir)}${inp('empresa.cp', 'CP y ciudad', e.cp)}${inp('empresa.tel', 'Teléfono', e.tel)}${inp('empresa.web', 'Web', e.web)}${inp('empresa.insta', 'Instagram (debajo del QR)', e.insta)}${inp('qrUrl', 'Enlace del QR', CFG.qrUrl)}
   <label class="f" style="grid-column:1/-1">Texto al pie del ticket<textarea data-cfg="pie" rows="3">${esc(CFG.pie)}</textarea></label></div>
   <div class="acciones"><label class="chk"><input type="checkbox" data-cfgb="logo" ${CFG.logo ? 'checked' : ''}> Logo</label><label class="chk"><input type="checkbox" data-cfgb="qr" ${CFG.qr ? 'checked' : ''}> Código QR</label><label class="chk"><input type="checkbox" data-cfgb="codigoBarras" ${CFG.codigoBarras ? 'checked' : ''}> Código de barras del ticket</label><label class="chk"><input type="checkbox" data-cfgb="autoPrint" ${CFG.autoPrint ? 'checked' : ''}> Imprimir siempre al cobrar</label><label class="chk"><input type="checkbox" data-cfgb="imprimirZ" ${CFG.imprimirZ ? 'checked' : ''}> Imprimir el cierre Z</label></div></div>
  <div class="box"><h2 style="margin-top:0">Impresora de tickets</h2><div class="form">
   <label class="f">Ancho del papel<select data-cfgn="papel"><option value="80" ${CFG.papel == 80 ? 'selected' : ''}>80 mm (lo normal)</option><option value="58" ${CFG.papel == 58 ? 'selected' : ''}>58 mm (pequeña)</option></select></label>
   <label class="f">Copias por venta<select data-cfgn="copias"><option ${CFG.copias == 1 ? 'selected' : ''}>1</option><option ${CFG.copias == 2 ? 'selected' : ''}>2</option></select></label>
   ${inp('serie', 'Serie tickets', CFG.serie, 'maxlength="3"')}${inp('serieDev', 'Serie devoluciones', CFG.serieDev, 'maxlength="3"')}
   <label class="f">Avisar si el ticket supera (€)<input data-cfge="limiteSimplificada" value="${n2(CFG.limiteSimplificada)}" inputmode="decimal"></label></div>
   <div class="acciones"><button class="btn vino" data-a="pruebaImp">Imprimir ticket de prueba</button></div>
   <ol class="pasos" style="font-size:14.5px"><li>En Windows pon la impresora térmica (Epson TM-T20, Star…) como <b>predeterminada</b>, con papel <b>80 mm × rollo</b> (o 58 mm).</li>
   <li>La primera vez, en la ventana de imprimir de Chrome elige esa impresora, márgenes <b>Ninguno</b> y quita <b>Encabezados y pies de página</b>. Chrome lo recuerda.</li>
   <li>Para imprimir sin ventana: crea un acceso directo de Chrome con <code>--kiosk-printing</code> que abra este TPV.</li>
   <li>Cajón portamonedas: en las propiedades del driver de la impresora activa <b>"Abrir cajón al imprimir"</b> (en Epson: Cash Drawer).</li></ol></div>
  <div class="box"><h2 style="margin-top:0">Operarios</h2><table class="t"><tr><th>Nombre</th><th>PIN</th><th></th></tr>
   ${CFG.operarios.map((o, i) => `<tr><td><input data-op="${i}" data-k="nombre" value="${esc(o.nombre)}" style="padding:7px;border:1.5px solid var(--linea);border-radius:8px"></td><td><input data-op="${i}" data-k="pin" value="${esc(o.pin)}" inputmode="numeric" style="width:100px;padding:7px;border:1.5px solid var(--linea);border-radius:8px"></td><td>${CFG.operarios.length > 1 ? `<button class="btn sm peligro" data-a="delOp" data-v="${i}">Quitar</button>` : ''}</td></tr>`).join('')}</table>
   <div class="acciones"><button class="btn" data-a="addOp">Añadir operario</button></div>
   <div class="form">${inp('adminPin', 'PIN de administrador (Ajustes y borrar)', CFG.adminPin, 'inputmode="numeric"')}</div></div>
  <div class="box"><h2 style="margin-top:0">Sage 50</h2><div class="form">
   ${inp('sage.almacen', 'Código de almacén (CSV stock)', sg.almacen)}${inp('sage.codVarios', 'Código artículo para "Artículo libre"', sg.codVarios)}${inp('sage.clienteContado', 'Código cliente contado (Excel)', sg.clienteContado)}
   ${inp('sage.cuentaCaja', 'Cuenta caja (efectivo)', sg.cuentaCaja)}${inp('sage.cuentaTarjeta', 'Cuenta banco (tarjeta)', sg.cuentaTarjeta)}${inp('sage.cuentaBizum', 'Cuenta banco (Bizum)', sg.cuentaBizum)}
   ${IVAS.map(r => inp('sage.ventas.' + r, `Cuenta ventas IVA ${r}%`, sg.ventas[r])).join('')}${IVAS.map(r => inp('sage.iva.' + r, `Cuenta IVA repercutido ${r}%`, sg.iva[r])).join('')}
   ${inp('sage.asientoInicial', 'Nº del primer asiento en el CSV', sg.asientoInicial, 'inputmode="numeric"')}</div></div>
  <div class="box"><h2 style="margin-top:0">Copia de seguridad</h2><p class="muted">Todo (tickets, cierres, artículos, ajustes) se guarda en este dispositivo. Descarga una copia cada semana y guárdala en el ordenador de la oficina o en el NAS.</p>
   <div class="acciones"><button class="btn vino" data-a="backup">Descargar copia</button><button class="btn" data-a="restaurar">Restaurar copia</button><button class="btn peligro" data-a="borrarTodo">Borrar todos los datos</button></div>
   <p class="muted" style="font-size:13px">${TICKETS.length} tickets · ${CIERRES.length} cierres · versión ${VERSION}</p></div></div>`;
  const setPath = (p, v) => { const k = p.split('.'); let o = CFG; while (k.length > 1) o = o[k.shift()]; o[k[0]] = v; };
  $$('[data-cfg]').forEach(i => i.onchange = () => { setPath(i.dataset.cfg, i.value.trim()); saveCfg(); toast('Guardado'); });
  $$('[data-cfgb]').forEach(i => i.onchange = () => { CFG[i.dataset.cfgb] = i.checked; saveCfg(); toast('Guardado'); });
  $$('[data-cfgn]').forEach(i => i.onchange = () => { CFG[i.dataset.cfgn] = parseInt(i.value, 10); saveCfg(); toast('Guardado'); });
  $$('[data-cfge]').forEach(i => i.onchange = () => { const v = parseEur(i.value); if (!isNaN(v) && v > 0) { CFG[i.dataset.cfge] = v; saveCfg(); toast('Guardado'); } });
  $$('[data-op]').forEach(i => i.onchange = () => {
    const o = CFG.operarios[+i.dataset.op]; const v = i.value.trim();
    if (i.dataset.k === 'pin' && !/^\d{4,8}$/.test(v)) { toast('El PIN debe tener de 4 a 8 cifras', 1); i.value = o.pin; return; }
    if (!v) return; o[i.dataset.k] = v; saveCfg(); toast('Guardado');
  });
}
async function backup() {
  const data = { app: 'tpv-tn', version: VERSION, fecha: new Date().toISOString(), cfg: CFG, cont: CONT, caja: CAJA, park: PARK, arts: EXTRA, tarifas: TARIFAS, clientes: CLIENTES, tickets: TICKETS, cierres: CIERRES };
  descargar(`TPV_copia_${dia().replace(/-/g, '')}.json`, JSON.stringify(data), 'application/json'); LS.set('ultimaCopia', new Date().toISOString());
}
function restaurar() {
  modal('Restaurar copia', `<p style="margin-top:0">Elige un fichero de copia (TPV_copia_….json). <b>Sustituye</b> los datos de este dispositivo.</p><input type="file" id="rs-f" accept=".json">`, `<button class="btn" data-a="cerrarModal">Cancelar</button>`);
  $('#rs-f').onchange = async e => {
    try {
      const d = JSON.parse(await e.target.files[0].text()); if (d.app !== 'tpv-tn') throw new Error('no es una copia del TPV');
      CFG = deepMerge(JSON.parse(JSON.stringify(CFG0)), d.cfg || {}); saveCfg(); CONT = d.cont || {}; LS.set('cont', CONT); CAJA = d.caja || null; LS.set('caja', CAJA);
      PARK = d.park || []; LS.set('park', PARK); EXTRA = d.arts || {}; LS.set('arts', EXTRA); TARIFAS = d.tarifas || []; LS.set('tarifas', TARIFAS); CLIENTES = d.clientes || []; LS.set('clientes', CLIENTES);
      await DB.clear('tickets'); await DB.clear('cierres'); TICKETS = d.tickets || []; CIERRES = d.cierres || []; await DB.putMany('tickets', TICKETS); await DB.putMany('cierres', CIERRES);
      buildArts(); sincronizarContadores(); cerrarTodos(); render(); toast('Copia restaurada');
    } catch (err) { toast('No se pudo restaurar: ' + err.message, 1); }
  };
}
function borrarTodo() {
  modal('Borrar todos los datos', `<p style="margin-top:0">Se borran tickets, cierres, caja y artículos añadidos <b>de este dispositivo</b>. Descarga antes una copia. Escribe <b>BORRAR</b> para confirmar.</p><input id="bt-v" autofocus style="font-size:18px;padding:10px;border:1.5px solid var(--linea);border-radius:10px">`,
    `<button class="btn" data-a="cerrarModal">Cancelar</button><button class="btn peligro" id="bt-ok">Borrar</button>`);
  $('#bt-ok').onclick = async () => {
    if ($('#bt-v').value.trim().toUpperCase() !== 'BORRAR') return toast('Escribe BORRAR', 1);
    await DB.clear('tickets'); await DB.clear('cierres'); TICKETS = []; CIERRES = [];
    ['caja', 'cont', 'park', 'arts', 'tarifas', 'clientes', 'actual'].forEach(k => localStorage.removeItem('tpv_' + k));
    CAJA = null; CONT = {}; PARK = []; EXTRA = {}; TARIFAS = []; CLIENTES = []; TK = nuevoTK(); buildArts(); cerrarTodos(); render(); toast('Datos borrados');
  };
}
function sincronizarContadores() {
  for (const t of TICKETS) if (t.serie && t.n > (CONT[t.serie] || 0)) CONT[t.serie] = t.n;
  for (const z of CIERRES) { const n = parseInt(String(z.num).replace(/\D/g, ''), 10); if (n > (CONT.Z || 0)) CONT.Z = n; }
  LS.set('cont', CONT);
}
function pruebaImp() {
  const d = new Date().toISOString();
  const t = { num: 'PRUEBA', tipo: 'venta', fecha: d, op: S.op.nombre, lineas: [{ c: '10459', n: 'Ramon Bilbao Crianza Tinto', i: 21, u: 2, pu: 1250, dto: 0, tot: 2500 }, { c: '', n: 'Aceite de oliva virgen extra 500 ml', i: 4, u: 1, pu: 890, dto: 0, tot: 890 }], dto: 0, total: 3390, ivas: [{ r: 21, total: 2500, base: 2066, cuota: 434 }, { r: 4, total: 890, base: 856, cuota: 34 }], pagos: [{ f: 'efectivo', imp: 3390 }], entregado: 5000, cambio: 1610 };
  imprimir(ticketHTML(t));
}

/* ---------- cámara (BarcodeDetector) ---------- */
async function camara() {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch (e) { return toast('No se pudo abrir la cámara', 1); }
  const ov = modal('Escanear con la cámara', `<video id="cam-v" playsinline autoplay muted style="width:100%;border-radius:12px;background:#000"></video>`, `<button class="btn" data-a="cerrarModal">Cerrar</button>`);
  const v = $('#cam-v'); v.srcObject = stream;
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'itf'] });
  let vivo = true;
  const stop = () => { vivo = false; stream.getTracks().forEach(t => t.stop()); };
  new MutationObserver((m, obs) => { if (!document.body.contains(ov)) { stop(); obs.disconnect(); } }).observe($('#modal-root'), { childList: true });
  const loop = async () => {
    if (!vivo) return;
    try { const r = await det.detect(v); if (r.length) { const code = r[0].rawValue; cerrarModal(); entradaBuscar(code); return; } } catch (e) { }
    setTimeout(loop, 250);
  };
  v.onloadeddata = loop;
}

/* ---------- acciones ---------- */
const ACT = {
  cerrarModal, vista(v) { S.vista = v; if (v !== 'ajustes') AJ_OK = false; render(); }, bloquear() { S.op = null; AJ_OK = false; cerrarTodos(); render(); },
  loginOp(v) { LOGIN.op = CFG.operarios.find(o => o.id === v); LOGIN.pin = ''; renderLogin(); }, loginKey,
  fam(v) { S.fam = v; $$('.fams button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); renderGrid(); focoBuscar(); },
  add(v) { const a = BYC.get(v.toUpperCase()); if (a) addArt(a); },
  selLin(v, el, e) { if (e.target.closest('button')) return; S.sel = S.sel === +v ? -1 : +v; renderTicket(); },
  mas(v) { const l = TK.lineas[+v]; if (l.u < 0) { if (l.u < -1) l.u++; } else l.u++; saveTK(); renderTicket(); },
  menos(v) { const l = TK.lineas[+v]; if (l.u > 1) l.u--; else if (l.u < 0) { const o = TICKETS.find(t => t.num === TK.orig); const max = o ? (o.lineas.find(x => x.c === l.c && x.n === l.n && x.pu === l.pu) || {}).u || 0 : 0; const ya = (devuelto(TK.orig)[l.c + '|' + l.n + '|' + l.pu] || 0); if (-l.u < max - ya) l.u--; else toast('No se puede devolver más de lo vendido', 1); } saveTK(); renderTicket(); },
  editLin(v) { editLin(+v); }, borrarLin(v) { TK.lineas.splice(+v, 1); S.sel = -1; if (!TK.lineas.length && TK.orig) TK = nuevoTK(); saveTK(); renderTicket(); },
  libre: artLibre, dtoTicket, setDto, cliente: clienteModal, cliContado() { TK.cliente = null; saveTK(); cerrarModal(); renderTicket(); },
  cliRec(v) { TK.cliente = CLIENTES[+v]; saveTK(); cerrarModal(); renderTicket(); },
  aparcar, recuperar, recPark(v) { if (TK.lineas.length) aparcarSilencioso(); const p = PARK.splice(+v, 1)[0]; LS.set('park', PARK); TK = { lineas: p.lineas, cliente: p.cliente, tarifa: p.tarifa, dto: p.dto, orig: p.orig }; saveTK(); cerrarModal(); render(); },
  vaciar() { confirmar('Vaciar ticket', '¿Quitar todas las líneas del ticket actual?', 'Vaciar', () => { TK = nuevoTK(); S.sel = -1; saveTK(); renderTicket(); }, 1); },
  cobrar: abrirCobro, forma(v) { CB.forma = v; renderCobro(); },
  billete(v) { addPago(v === 'exacto' ? pendiente() : +v); if (pendiente() === 0) finCobro(); else renderCobro(); },
  cbKey(k) { if (k === '⌫') CB.inp = CB.inp.slice(0, -1); else if (k === ',') { if (!CB.inp.includes(',')) CB.inp = (CB.inp || '0') + ','; } else if (!/,\d\d$/.test(CB.inp) && CB.inp.length < 9) CB.inp += k; renderCobro(); },
  addPago() { addPago(); renderCobro(); }, quitarPago(v) { const p = CB.pagos.splice(+v, 1)[0]; if (p.f === 'efectivo') { CB.entregado = 0; CB.cambio = 0; CB.pagos.filter(x => x.f === 'efectivo').forEach(x => CB.entregado += x.imp); } renderCobro(); },
  finCobro, verTicket, reimprimir(v) { imprimirTicket(TICKETS.find(t => t.id === v), { copia: true }); }, regalo(v) { imprimirTicket(TICKETS.find(t => t.id === v), { regalo: true }); }, devolver,
  tfTodos() { TF.dia = ''; vTickets(); },
  abrirCaja() { apertura(); }, movCaja, cierreZ, informeX() { const r = resumen(TICKETS.filter(t => t.caja === CAJA.id), CAJA); imprimir(zHTML({ r, fecha: new Date().toISOString(), apertura: CAJA.apertura, op: S.op.nombre, fondo: CAJA.fondo, movs: CAJA.movs }, true)); },
  reimpZ(v) { imprimir(zHTML(CIERRES.find(z => z.id === v))); },
  expExcel, expStock, expAsiento,
  nuevoArt() { editArt(null); }, editArt, importArt, expArts,
  desbloquearAj() { pedirPin('Ajustes', () => { AJ_OK = true; vAjustes(); }); },
  addOp() { CFG.operarios.push({ id: uid(), nombre: 'Nuevo', pin: String(1000 + Math.floor(Math.random() * 9000)) }); saveCfg(); vAjustes(); },
  delOp(v) { confirmar('Quitar operario', `¿Quitar a ${esc(CFG.operarios[+v].nombre)}?`, 'Quitar', () => { CFG.operarios.splice(+v, 1); saveCfg(); vAjustes(); }, 1); },
  pruebaImp, backup, restaurar, borrarTodo: () => pedirPin('Borrar datos', borrarTodo), camara,
};
function aparcarSilencioso() { PARK.push({ ...TK, id: uid(), fecha: new Date().toISOString(), op: S.op.nombre, total: calc(TK).total }); LS.set('park', PARK); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const fn = ACT[b.dataset.a]; if (fn) fn(b.dataset.v, b, e);
});
document.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('ov')) cerrarModal(); });

/* lector de códigos de barras tipo teclado: captura cuando el foco no está en un campo */
let SCAN = { buf: '', t: 0 };
document.addEventListener('keydown', e => {
  if (!S.op) { if (/^\d$/.test(e.key)) loginKey(e.key); else if (e.key === 'Backspace') loginKey('B'); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (e.key === 'Escape' && $('#modal-root').children.length) { cerrarModal(); return; }
  if (CB && $('#cobro') && tag !== 'input') {
    if (/^[0-9]$/.test(e.key)) { ACT.cbKey(e.key); e.preventDefault(); return; }
    if (e.key === ',' || e.key === '.') { ACT.cbKey(','); e.preventDefault(); return; }
    if (e.key === 'Backspace') { ACT.cbKey('⌫'); e.preventDefault(); return; }
    if (e.key === 'Enter') { e.preventDefault(); finCobro(); return; }
  }
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || $('#modal-root').children.length || S.vista !== 'venta') return;
  const now = Date.now();
  if (now - SCAN.t > 80) SCAN.buf = '';
  SCAN.t = now;
  if (e.key === 'Enter') { if (SCAN.buf.length >= 4) { entradaBuscar(SCAN.buf); e.preventDefault(); } SCAN.buf = ''; return; }
  if (e.key.length === 1) SCAN.buf += e.key;
  if (e.key === 'F2') { e.preventDefault(); abrirCobro(); }
});

/* ---------- arranque ---------- */
async function iniciar() {
  buildArts();
  try { await DB.open(); TICKETS = await DB.all('tickets'); CIERRES = await DB.all('cierres'); }
  catch (e) { console.error(e); toast('Este navegador no permite guardar tickets (modo privado?).', 1); }
  sincronizarContadores();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  window.__TPV = { S, get TK() { return TK; }, get TICKETS() { return TICKETS; }, get CIERRES() { return CIERRES; }, calc, lineasAsiento, resumen, ticketHTML, zHTML, CFG: () => CFG, setXF: o => Object.assign(XF, o) };
}
iniciar();
