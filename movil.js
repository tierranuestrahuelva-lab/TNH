'use strict';
/* TPV Tierra Nuestra — móvil: cámara (códigos de barras y QR), dictado por voz, asistente y ticket por WhatsApp. Se carga antes de app.js. */
const ICO = {
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>',
  ia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8l-1 7a3 3 0 0 1-6 0z"/><path d="M12 12v8M8 22h8"/><path d="M19 3l.6 1.4L21 5l-1.4.6L19 7l-.6-1.4L17 5l1.4-.6z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/></svg>',
};
const esMovil = () => window.matchMedia('(max-width:640px)').matches;
const vibra = (ms = 40) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ---------- barra inferior en el móvil ---------- */
function updMbar() {
  const m = $('#mbar'); if (!m) return;
  const c = calc(TK), ver = $('.venta') && $('.venta').classList.contains('vtk');
  m.innerHTML = ver
    ? `<button class="btn" data-a="mtk" data-v="0">‹ Seguir vendiendo</button>${TK.lineas.length ? `<button class="btn vino" data-a="cobrar">Cobrar ${eur(Math.abs(c.total))}</button>` : ''}`
    : `<button class="btn ${TK.lineas.length ? 'vino' : ''}" data-a="mtk" data-v="1" id="mbar-tk">Ticket · ${c.uds} ud. · <span class="num">${eur(c.total)}</span></button>`;
}
function mtk(v) { const ve = $('.venta'); if (!ve) return; ve.classList.toggle('vtk', v === '1'); S.mtk = v === '1'; updMbar(); window.scrollTo(0, 0); $('#main').scrollTop = 0; }

/* ---------- códigos leídos (lector, cámara o QR) ---------- */
function codigoDeTexto(txt) {
  txt = String(txt || '').trim();
  if (!/^https?:\/\//i.test(txt)) return { codigo: txt };
  let u; try { u = new URL(txt); } catch (e) { return { codigo: txt }; }
  const params = new URLSearchParams(u.search + '&' + (u.hash.split('?')[1] || ''));
  for (const k of ['c', 'cod', 'codigo', 'ref', 'art', 'id']) if (params.get(k) && buscarCodigo(params.get(k))) return { codigo: params.get(k) };
  const trozos = (u.pathname + '/' + u.hash.replace(/^#/, '').split('?')[0]).split(/[\/\-_.]/).filter(Boolean).reverse();
  for (const t of trozos) if (buscarCodigo(t)) return { codigo: t };
  return { url: txt };
}
/* devuelve {tipo:'art'|'ticket'|'url'|'nada', a, t} */
function tratarCodigo(txt, cantidad = 1) {
  const r = codigoDeTexto(txt);
  if (r.url) return { tipo: 'url', url: r.url };
  const a = buscarCodigo(r.codigo);
  if (a) { addArt(a, cantidad); vibra(); return { tipo: 'art', a }; }
  const t = TICKETS.find(t => t.num.toUpperCase() === r.codigo.toUpperCase());
  if (t) return { tipo: 'ticket', t };
  beep(300); return { tipo: 'nada', codigo: r.codigo };
}

/* ---------- cámara: BarcodeDetector si existe, si no ZXing ---------- */
let ZX = null;
function cargarZXing() {
  if (window.ZXing) return Promise.resolve();
  return ZX || (ZX = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'assets/zxing.min.js'; s.onload = ok; s.onerror = () => { ZX = null; ko(new Error('zxing')); }; document.head.appendChild(s); }));
}
async function crearLector() {
  if ('BarcodeDetector' in window) {
    try {
      const sop = await BarcodeDetector.getSupportedFormats();
      const fm = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'itf', 'code_39'].filter(f => sop.includes(f));
      if (fm.includes('qr_code') && fm.includes('ean_13')) { const d = new BarcodeDetector({ formats: fm }); return { tipo: 'nativo', leer: async v => { const r = await d.detect(v); return r.length ? r[0].rawValue : null; } }; }
    } catch (e) { }
  }
  await cargarZXing();
  const Z = window.ZXing, hints = new Map(), F = Z.BarcodeFormat;
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [F.QR_CODE, F.EAN_13, F.EAN_8, F.CODE_128, F.UPC_A, F.UPC_E, F.ITF, F.CODE_39]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const rd = new Z.MultiFormatReader(); rd.setHints(hints);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  return {
    tipo: 'zxing', leer: async v => {
      const w = v.videoWidth, h = v.videoHeight; if (!w || !h) return null;
      const k = Math.min(1, 960 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      cx.drawImage(v, 0, 0, cv.width, cv.height);
      try { return rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))).getText(); }
      catch (e) { rd.reset(); return null; }
    },
  };
}
async function camara() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Este navegador no deja usar la cámara. Abre el TPV con https en Chrome o Safari.', 1);
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
  catch (e) { return toast(e && e.name === 'NotAllowedError' ? 'Permite el uso de la cámara en el navegador para escanear.' : 'No se pudo abrir la cámara', 1); }
  const ov = modal('Escanear códigos de barras y QR', `<div class="cam-box"><video id="cam-v" playsinline autoplay muted></video><div class="mira"></div></div>
   <label class="chk" style="margin-top:10px"><input type="checkbox" id="cam-rafaga" ${LS.get('rafaga', true) ? 'checked' : ''}> Seguir escaneando (varios productos seguidos)</label>
   <div class="cam-log" id="cam-log"><div class="muted">Apunta al código de barras de la botella o a un QR.</div></div>`, `<button class="btn vino" data-a="cerrarModal">Terminar</button>`);
  const v = $('#cam-v'); v.srcObject = stream;
  let vivo = true, ultimo = '', ultT = 0, lector;
  const stop = () => { vivo = false; stream.getTracks().forEach(t => t.stop()); };
  new MutationObserver((m, obs) => { if (!document.body.contains(ov)) { stop(); obs.disconnect(); } }).observe($('#modal-root'), { childList: true });
  $('#cam-rafaga').onchange = e => LS.set('rafaga', e.target.checked);
  try { lector = await crearLector(); } catch (e) { stop(); cerrarModal(); return toast('No se pudo cargar el lector de la cámara', 1); }
  window.__camLector = lector.tipo;
  const log = html => { const l = $('#cam-log'); if (l) { if (l.firstElementChild && l.firstElementChild.classList.contains('muted')) l.innerHTML = ''; l.insertAdjacentHTML('afterbegin', `<div>${html}</div>`); } };
  const loop = async () => {
    if (!vivo) return;
    let code = null; try { code = await lector.leer(v); } catch (e) { }
    const now = Date.now();
    if (code && !(code === ultimo && now - ultT < 2500)) {
      ultimo = code; ultT = now;
      const r = tratarCodigo(code);
      if (r.tipo === 'art') { log(`✔ <b>${esc(r.a.n)}</b> · ${eur(precio(r.a, TK.tarifa))}`); if (!$('#cam-rafaga').checked) { cerrarModal(); return; } }
      else if (r.tipo === 'ticket') { cerrarModal(); verTicket(r.t.id); return; }
      else if (r.tipo === 'url') log(`QR con un enlace que no es de un producto: <span class="muted">${esc(r.url.slice(0, 70))}</span>`);
      else log(`<span class="mal">Código ${esc(r.codigo)} no está en el catálogo</span>`);
    } else if (code === ultimo) ultT = now;
    setTimeout(loop, lector.tipo === 'nativo' ? 150 : 220);
  };
  if (v.readyState >= 2) loop(); else v.onloadeddata = loop;
}

/* ---------- voz ---------- */
const NUMS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, docena: 12, quince: 15, veinte: 20, veinticuatro: 24 };
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'botella', 'botellas', 'unidad', 'unidades', 'caja', 'por', 'favor', 'me', 'una', 'un', 'vino', 'a']);
function cantidadYResto(t) {
  t = t.replace(/^(anade|anadir|anademe|pon|ponme|ponle|mete|meteme|dame|quiero|vendo|vende|agrega|suma|y)\s+/, '');
  let u = 1, m;
  if ((m = t.match(/^media docena\s+/))) { u = 6; t = t.slice(m[0].length); }
  else if ((m = t.match(/^(\d{1,3})\s+/))) { u = +m[1]; t = t.slice(m[0].length); }
  else if ((m = t.match(/^([a-z]+)\s+/)) && NUMS[m[1]]) { u = NUMS[m[1]]; t = t.slice(m[0].length); }
  return { u: Math.max(1, Math.min(u, 999)), q: t.replace(/^(botellas?|unidades?|cajas?)\s+(de\s+)?/, '').trim() };
}
function mejorArticulo(q) {
  const ws = norm(q).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(w => w && !PALABRAS_VACIAS.has(w));
  if (!ws.length) return { lista: [] };
  const exacto = ARTS.filter(a => ws.every(w => a._s.includes(w)));
  if (exacto.length) return { a: exacto.length === 1 ? exacto[0] : null, lista: exacto, ws };
  const sc = ARTS.map(a => [a, ws.reduce((s, w) => s + (w.length > 2 && a._s.includes(w) ? 1 : 0), 0)]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1] || (x[0].r || 9999) - (y[0].r || 9999));
  if (!sc.length) return { lista: [], ws };
  const top = sc[0][1], mejores = sc.filter(x => x[1] === top).map(x => x[0]);
  return { a: top / ws.length >= .6 && mejores.length === 1 ? mejores[0] : null, lista: mejores, ws };
}
/* interpreta una frase dicha en la venta; devuelve un texto con lo que ha hecho */
function ordenVoz(frase) {
  const t = norm(frase).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (/^(cobra|cobrar|cobramos|a cobrar|cuenta)\b/.test(t)) { if (!TK.lineas.length) return 'El ticket está vacío'; abrirCobro(); return 'Abriendo el cobro'; }
  if (/^(quita|quitar|borra|borrar|elimina)\b.*\b(ultimo|ultima)\b/.test(t)) { if (!TK.lineas.length) return 'No hay líneas'; const l = TK.lineas.pop(); S.sel = -1; saveTK(); renderTicket(); return `Quitado: ${l.n}`; }
  if (/^(total|cuanto es|cuanto va)/.test(t)) return `Total ${eur(calc(TK).total)}`;
  if (/^(busca|buscar|buscame|ensename)\s+/.test(t)) { const q = t.replace(/^\S+\s+/, ''); S.q = q; const i = $('#q'); if (i) i.value = q; if (esMovil()) mtk('0'); renderGrid(); return `Buscando «${q}»`; }
  if (/\b(recomienda|recomiendame|aconseja|aconsejame|sugiere|maridaje|que vino|para regalar|para comer|acompanar)\b/.test(t)) { asistente(frase); return 'Te ayudo a elegir'; }
  const { u, q } = cantidadYResto(t);
  const r = tratarCodigo(q.replace(/\s/g, ''), u);
  if (r.tipo === 'art') return `Añadido ${u} × ${r.a.n}`;
  const m = mejorArticulo(q);
  if (m.a) { addArt(m.a, u); vibra(); return `Añadido ${u} × ${m.a.n}`; }
  if (m.lista.length) { S.q = (m.ws || []).join(' '); const i = $('#q'); if (i) i.value = S.q; if (esMovil()) mtk('0'); renderGrid(); return `Hay ${m.lista.length} parecidos a «${q}». Toca el que sea.`; }
  return `No encuentro «${q}»`;
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function microfono(destino) {
  if (!SR) return toast('Este navegador no permite dictar. Usa Chrome (Android/PC) o Safari (iPhone/iPad).', 1);
  const r = new SR(); r.lang = 'es-ES'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  const enAsis = destino === 'asistente' && $('#ia-q');
  const ov = enAsis ? null : modal('Te escucho', `<div class="puls">${ICO.mic}</div><div class="oido" id="oido">Di por ejemplo: «dos Ramón Bilbao crianza»</div><p class="muted" style="text-align:center;font-size:13px">También: «quita el último», «total», «cobrar», «recomiéndame un tinto para carne».</p>`, `<button class="btn" data-a="cerrarModal">Cerrar</button>`);
  let fin = '';
  r.onresult = e => { let s = ''; for (const x of e.results) s += x[0].transcript; fin = s; if (enAsis) $('#ia-q').value = s; else if ($('#oido')) $('#oido').textContent = s; };
  r.onerror = e => { if (ov && document.body.contains(ov)) cerrarModal(); toast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Permite el micrófono en el navegador para dictar.' : e.error === 'no-speech' ? 'No te he oído. Prueba otra vez.' : 'El dictado no está disponible ahora (necesita internet).', 1); };
  r.onend = () => {
    if (ov && document.body.contains(ov)) cerrarModal();
    if (!fin) return;
    if (enAsis) return preguntarIA(fin);
    const msg = ordenVoz(fin); if (msg) toast(msg);
  };
  try { r.start(); } catch (e) { if (ov) cerrarModal(); toast('No se pudo empezar a escuchar', 1); }
}

/* ---------- asistente (sin internet, con el catálogo de la tienda) ---------- */
const AYUDA = [
  [/devol|cambio de|devuelve/, 'Para una devolución: <b>Tickets</b> › toca el ticket (o escanea su código de barras) › <b>Devolución / cambio</b> › elige las unidades › cobra. Sale una factura rectificativa (serie D).'],
  [/cierr|cerrar|\bz\b|arqueo/, 'Para cerrar la caja: <b>Caja</b> › <b>Cierre Z</b>, cuenta el efectivo (por billetes o el total) y confirma. Si hay diferencia, la verás antes de cerrar.'],
  [/aparc|esperar|dejar.*ticket/, 'Pulsa <b>Aparcar</b> para dejar un ticket en espera y atender a otro cliente. Con <b>Recuperar</b> lo vuelves a abrir.'],
  [/descuent|rebaja|oferta/, 'Toca una línea del ticket › <b>Precio / dto</b> para un descuento en ese vino, o <b>Dto. ticket</b> para todo el ticket.'],
  [/mixto|dividir|parte en|dos formas/, 'En el cobro elige la forma, escribe el importe y pulsa <b>Añadir pago parcial</b>. Luego elige la otra forma para el resto.'],
  [/factura|nif|empresa/, 'Toca <b>Cliente</b> encima del ticket y pon nombre y NIF: el ticket sale como factura completa.'],
  [/imprim|impresora|papel/, 'En <b>Ajustes</b> eliges papel de 80 o 58 mm y haces una prueba de impresión. Sin impresora a mano, envía el ticket por <b>WhatsApp</b>.'],
  [/whatsapp|enviar ticket|mandar ticket/, 'Después de cobrar aparece <b>Enviar por WhatsApp</b>. También desde <b>Tickets</b> › el ticket › <b>WhatsApp</b>.'],
  [/camara|escane|codigo de barras|\bqr\b/, 'Pulsa el botón de la <b>cámara</b> y apunta al código de barras o al QR. Con «Seguir escaneando» puedes pasar varios vinos seguidos.'],
  [/regalo/, 'Para un ticket regalo (sin precios): <b>Tickets</b> › el ticket › <b>Imprimir ticket regalo</b>.'],
];
const TIPOS_IA = [
  [/\btint/, a => a.f === 'tintos'], [/\bblanc/, a => a.f === 'blancos'], [/\brosad/, a => a.f === 'rosados'],
  [/espumos|cava|champ|burbuja|brindis|celebra/, a => a.f === 'espumosos'],
  [/\bfino\b|manzanilla|oloroso|amontillado|generos|jerez|vermu|vermouth/, a => a.f === 'generosos'],
  [/dulce|postre|chocolate|pedro ximenez|\bpx\b/, a => a.f === 'generosos' && /dulce|px|pedro|moscatel|cream|naranja/i.test(a.n + ' ' + (a.y || '')) || /dulce/i.test(a.y || '')],
  [/ginebra|\bgin\b/, a => /ginebra/i.test(a.y || '')], [/whisk/, a => /whisk/i.test(a.y || '')], [/\bron\b/, a => /^ron/i.test(a.y || '')], [/brandy|cognac|coñac/, a => /brandy|cognac/i.test(a.y || '')],
  [/cesta|lote|regalo|regalar/, a => a.f === 'regalo' || a.f === 'formatos' && /magnum/i.test(a.y || '')],
];
const COMIDAS = [
  [/carne|ternera|cordero|chuleton|barbacoa|caza|asado|solomillo|rabo|presa|secreto|iberico/, ['tintos'], /crianza|reserva|roble/i, 'carne'],
  [/pescado|marisco|gamba|choco|coquina|atun|sushi|ostra|langostino|salmon|frito/, ['blancos', 'espumosos'], null, 'pescado y marisco'],
  [/arroz|paella|pasta|verdura|ensalada/, ['blancos', 'rosados'], null, 'arroz y verduras'],
  [/jamon|aperitivo|tapa|embutido|aceituna|almendra/, ['generosos', 'espumosos'], /fino|manzanilla|brut|cava/i, 'aperitivo'],
  [/queso/, ['tintos', 'generosos'], null, 'queso'],
];
function precioIA(t) {
  const n = s => parseFloat(String(s).replace(',', '.')) * 100; let m;
  if ((m = t.match(/entre (\d+(?:[.,]\d+)?) y (\d+(?:[.,]\d+)?)/))) return [n(m[1]), n(m[2])];
  if ((m = t.match(/(?:menos de|hasta|maximo|por debajo de|no mas de|como mucho) (\d+(?:[.,]\d+)?)/))) return [0, n(m[1])];
  if ((m = t.match(/(?:mas de|desde|minimo|por encima de) (\d+(?:[.,]\d+)?)/))) return [n(m[1]), Infinity];
  if ((m = t.match(/(?:unos|sobre|alrededor de|por) (\d+(?:[.,]\d+)?)\s*(?:euros|€|eur)/))) return [n(m[1]) * .75, n(m[1]) * 1.25];
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:euros|€|eur)/))) return [0, n(m[1])];
  if (/barat|economic|asequible/.test(t)) return [0, 1000];
  if (/especial|premium|caro|bueno de verdad|lujo|capricho/.test(t)) return [3000, Infinity];
  return null;
}
function asistenteResponde(pregunta) {
  const t = norm(pregunta).replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(como|donde|que hago|puedo|se puede|ayuda)\b/.test(t) || /\bcomo (hago|se|puedo)\b/.test(t)) for (const [re, txt] of AYUDA) if (re.test(t)) return { texto: txt, arts: [], ayuda: true };
  let lista = ARTS.filter(a => a.p > 0 && !['accesorios', 'otros'].includes(a.f));
  const motivos = [];
  const tipos = TIPOS_IA.filter(([re]) => re.test(t));
  const comida = COMIDAS.find(([re]) => re.test(t));
  if (tipos.length) lista = lista.filter(a => tipos.some(([, fn]) => fn(a)));
  else if (comida) { lista = lista.filter(a => comida[1].includes(a.f)); }
  if (comida) motivos.push('para ' + comida[3]);
  const pr = precioIA(t);
  if (pr) { lista = lista.filter(a => a.p >= pr[0] && a.p <= pr[1]); motivos.push(pr[1] === Infinity ? `desde ${eur(pr[0])}` : pr[0] > 0 ? `entre ${eur(pr[0])} y ${eur(pr[1])}` : `hasta ${eur(pr[1])}`); }
  const usadas = /\b(tint|blanc|rosad|vino|vinos|para|con|de|del|la|el|un|una|unos|menos|mas|euros|eur|que|me|recomienda|recomiendame|aconseja|aconsejame|sugiere|quiero|busco|algo|bueno|buena|regalo|regalar|precio|entre|hasta|sobre|alrededor|por|y|o|comer|cena|comida|acompanar|maridaje|barato|especial)/;
  const extra = t.split(' ').filter(w => w.length > 3 && !usadas.test(w) && !(comida && comida[0].test(w)) && !tipos.some(([re]) => re.test(w)) && !/^\d/.test(w));
  const txt = a => norm([a.n, a.d, a.v, a.o, a.z, a.y].join(' '));
  let sc = lista.map(a => { const s = txt(a); let p = 0; for (const w of extra) if (s.includes(w.slice(0, Math.max(4, w.length - 1)))) p += 10; if (comida && comida[2] && comida[2].test(a.n + ' ' + (a.y || ''))) p += 3; if (a.r) p += Math.max(0, 5 - a.r / 80); return [a, p]; });
  if (extra.length) { const con = sc.filter(x => x[1] >= 10); if (con.length) { sc = con; motivos.push(extra.map(w => '«' + w + '»').join(', ')); } }
  sc.sort((x, y) => y[1] - x[1] || (x[0].r || 9999) - (y[0].r || 9999) || x[0].p - y[0].p);
  if (!tipos.length && !comida && !pr && !(extra.length && sc.length && sc[0][1] >= 10)) {
    for (const [re, txt2] of AYUDA) if (re.test(t)) return { texto: txt2, arts: [], ayuda: true };
    return { texto: 'Dime qué buscas: tipo de vino, para qué comida y cuánto quiere gastar. Por ejemplo: «tinto para carne de menos de 15 euros» o «blanco de Huelva para pescado».', arts: [] };
  }
  const arts = sc.slice(0, 6).map(x => x[0]);
  if (!arts.length) return { texto: `No tengo vinos ${[tipos.length ? 'de ese tipo' : '', ...motivos].filter(Boolean).join(' ')}. Prueba a subir un poco el precio o a cambiar el tipo.`, arts: [] };
  const nom = tipos.length ? '' : comida ? '' : 'vinos ';
  return { texto: `Te propongo estos ${nom}${tipos.length ? 'vinos' : ''} ${motivos.join(' · ')}`.replace(/\s+/g, ' ').trim() + ':', arts };
}
function tarjetaArt(a) {
  const extra = [a.d, a.v].filter(Boolean).map(x => esc(String(x).replace(/, ?DOP\.?|D\.O\.?/i, ''))).join(' · ');
  return `<button class="prod" data-a="add" data-v="${esc(a.c)}" style="--c:${(FAM[a.f] || FAM.otros)[2]}"><span class="n">${esc(a.n)}</span><span><span class="muted" style="font-size:12px">${extra}</span><br><span class="p">${eur(precio(a, TK.tarifa))}</span> <span class="muted" style="font-size:12px">+ añadir</span></span></button>`;
}
function preguntarIA(q) {
  q = String(q || '').trim(); if (!q) return;
  const ch = $('#ia-chat'); if (!ch) return;
  const r = asistenteResponde(q);
  ch.insertAdjacentHTML('beforeend', `<div class="yo">${esc(q)}</div><div class="ia">${r.texto}${r.arts.length ? `<div class="sug">${r.arts.map(tarjetaArt).join('')}</div>` : ''}</div>`);
  ch.scrollTop = ch.scrollHeight; const i = $('#ia-q'); if (i) i.value = '';
  return r;
}
function asistente(pregunta) {
  if ($('#ia-chat')) return preguntarIA(pregunta);
  modal('Asistente Tierra Nuestra', `<div class="chat" id="ia-chat"><div class="ia">Hola. Te ayudo a elegir vino con lo que hay en la tienda, y a usar el TPV. Pregúntame escribiendo o con el micrófono.</div></div>
   <div class="chips">${['Tinto para carne de menos de 15 €', 'Blanco de Huelva para pescado', 'Espumoso para celebrar', 'Regalo especial', '¿Cómo hago una devolución?'].map(c => `<button data-a="iaChip">${c}</button>`).join('')}</div>
   <form class="ask" id="ia-f"><input id="ia-q" placeholder="Escribe tu pregunta…" autocomplete="off" enterkeyhint="send">${SR ? `<button type="button" class="btn ico-only ico" data-a="mic" data-v="asistente" aria-label="Dictar">${ICO.mic}</button>` : ''}<button class="btn vino">Preguntar</button></form>`, '', 'ancho');
  $('#ia-f').onsubmit = e => { e.preventDefault(); preguntarIA($('#ia-q').value); };
  if (typeof pregunta === 'string' && pregunta) preguntarIA(pregunta);
}

/* ---------- ticket por WhatsApp ---------- */
function textoTicket(t) {
  const e = CFG.empresa;
  return [`*${e.comercial}* · ${e.nombre} · NIF ${e.nif}`, `${t.tipo === 'dev' ? 'Factura rectificativa' : 'Ticket'} ${t.num} · ${fdate(t.fecha)} ${ftime(t.fecha)}`, '',
    ...t.lineas.map(l => `${l.u} x ${l.n}  ${n2(l.tot)} €`), '', `*TOTAL ${eur(t.total)}* (IVA incluido)`,
    ...t.ivas.map(v => `IVA ${v.r}%: base ${n2(v.base)} · cuota ${n2(v.cuota)}`), '', 'Gracias por su visita.', CFG.qrUrl ? `Nuestros vinos: ${CFG.qrUrl}` : ''].filter((x, i, arr) => x !== '' || arr[i - 1] !== '').join('\n');
}
function waTicket(id) {
  const t = TICKETS.find(x => x.id === id || x.num === id); if (!t) return;
  const tel = String((t.cliente && t.cliente.tel) || '').replace(/\D/g, '');
  const url = `https://wa.me/${tel ? (tel.length === 9 ? '34' + tel : tel) : ''}?text=${encodeURIComponent(textoTicket(t))}`;
  window.__waUrl = url; window.open(url, '_blank', 'noopener');
}
