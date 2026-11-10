/* Almacén · Tierra Nuestra — preparación paso a paso, punteo con lector, carga de furgoneta y tablero */
(function () {
'use strict'
const R = () => window.TNR
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const ZONAS = { nichero: ['Nichero', '#7c3aed', 1], almacen: ['Almacén tienda', '#2563eb', 2], nave: ['Nave', '#c47a00', 3], otra: ['Ubicación', '#6f6268', 4], ninguna: ['Sin ubicar', '#8a7f85', 5] }
const PREP = { pendiente: 'Por preparar', preparando: 'Preparando', preparado: 'Preparado', cargado: 'Cargado' }
const PCOL = { pendiente: '#8a7f85', preparando: '#2563eb', preparado: '#1f8a4c', cargado: '#830040' }

// ---------- artículos, ubicaciones y códigos de barras ----------
let ART = new Map(), CB = {}, EXTRA = {}, cargado = false
function usar(a, extra) {
  ART = new Map((a || []).map((x) => [String(x.c).trim(), x])); CB = {}; EXTRA = extra || {}
  for (const x of a || []) for (const b of x.b || []) CB[String(b).trim()] = { c: String(x.c).trim() }
  Object.assign(CB, EXTRA)
}
const cache = JSON.parse(localStorage.getItem('tn-alm-art') || 'null'); if (cache) usar(cache.a, cache.extra)
async function cargarArticulos(forzar) {
  if (cargado && !forzar) return
  try {
    const a = await R().Nube.api('articulos?select=c,n,u,v,b&limit=5000')
    const e = await R().Nube.api('reparto_estado?select=valor&id=eq.codigos')
    usar(a, e?.[0]?.valor); cargado = true
    localStorage.setItem('tn-alm-art', JSON.stringify({ a, extra: EXTRA }))
  } catch (e) {}
}
async function guardarCodigo(cb, info) {
  try { const e = await R().Nube.api('reparto_estado?select=valor&id=eq.codigos'); EXTRA = Object.assign({}, e?.[0]?.valor, EXTRA) } catch (e) {}
  EXTRA[cb] = info; CB[cb] = info
  try { await R().Nube.api('reparto_estado', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ id: 'codigos', valor: EXTRA }]) }) } catch (e) {}
}
const esCaja = (cb) => /^[1-8]\d{13}$/.test(cb)
const zona = (p) => /^[A-G]\d{2}S?$/i.test(p) ? 'nichero' : /^\d[A-Z]\d[A-Z]$/i.test(p) ? 'almacen' : /^\d[A-Z]\d$/i.test(p) ? 'nave' : 'otra'
function ubicaciones(c) {
  const x = ART.get(String(c || '').trim()); if (!x) return []
  return [x.u, x.v].flatMap((s) => String(s || '').split(/[\/,;]+/)).map((s) => s.trim()).filter(Boolean).map((cod) => ({ cod, zona: zona(cod) }))
}
function sitio(l) { // ubicación donde ir a por esta línea
  const u = ubicaciones(l.codigo); if (!u.length) return { cod: '', zona: 'ninguna', otras: [] }
  const pref = l.unidad === 'cajas' ? ['nave', 'almacen', 'nichero', 'otra'] : ['nichero', 'almacen', 'nave', 'otra']
  const s = [...u].sort((a, b) => pref.indexOf(a.zona) - pref.indexOf(b.zona))[0]
  return Object.assign({}, s, { otras: u.filter((x) => x !== s) })
}
const tieneCodigo = (c) => Object.values(CB).some((x) => x.c === c)

// ---------- pedido ----------
const est = (a) => a.prep?.estado || 'pendiente'
function lineas(a) {
  return (a.lineas || []).map((l, i) => {
    const p = a.prep?.l?.[i] || {}
    const x = { i, codigo: String(l.codigo || '').trim(), nombre: l.nombre || l.descripcion || '', cant: Number(l.unidades ?? l.cantidad) || 0, unidad: l.unidad || 'unidades', n: p.n || 0, falta: !!p.falta, manual: !!p.manual }
    x.sitio = sitio(x); x.hecha = x.falta || x.n >= x.cant; return x
  }).sort((a, b) => ZONAS[a.sitio.zona][2] - ZONAS[b.sitio.zona][2] || a.sitio.cod.localeCompare(b.sitio.cod, 'es', { numeric: true }) || a.i - b.i)
}
const uni = (n, u) => { const t = { cajas: ['caja', 'cajas'], botellas: ['botella', 'botellas'] }[u] || ['unidad', 'unidades']; return n + ' ' + t[n === 1 ? 0 : 1] }
const paraPreparar = () => R().delDia().filter((a) => a.lineas?.length)
function marcar(a, i, cambios) {
  a.prep = a.prep || { estado: 'preparando', l: {} }; a.prep.l = a.prep.l || {}
  a.prep.l[i] = Object.assign({}, a.prep.l[i], cambios); R().tocar(a)
}

// ---------- sonido y voz ----------
const VOZ = { altavoz: localStorage.getItem('tn-alm-altavoz') !== 'no', mic: false, hablando: 0 }
let ctxA = null
function pitido(ok) {
  try {
    ctxA = ctxA || new (window.AudioContext || window.webkitAudioContext)()
    const tonos = ok ? [[880, 0, 0.12]] : [[220, 0, 0.25], [180, 0.3, 0.35]]
    for (const [f, t0, d] of tonos) { const o = ctxA.createOscillator(), g = ctxA.createGain(); o.frequency.value = f; o.type = ok ? 'sine' : 'square'; g.gain.value = 0.25; o.connect(g); g.connect(ctxA.destination); o.start(ctxA.currentTime + t0); o.stop(ctxA.currentTime + t0 + d) }
    navigator.vibrate?.(ok ? 60 : [200, 100, 300])
  } catch (e) {}
}
const ABREV = [[/\bCrza\b/gi, 'crianza'], [/\bRva\b/gi, 'reserva'], [/\bGr\b\.?/gi, 'gran'], [/\bEst\b\.?/gi, 'estuche'], [/\bTto\b/gi, 'tinto'], [/\bBco\b/gi, 'blanco'], [/\bManz\b\.?/gi, 'manzanilla'], [/\(.*?\)/g, ' ']]
const hablable = (t) => ABREV.reduce((s, [r, v]) => s.replace(r, v), String(t))
function decir(t) {
  if (!VOZ.altavoz || !window.speechSynthesis) return
  try {
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(hablable(t)); u.lang = 'es-ES'; u.rate = 1.05
    VOZ.hablando = Date.now() + 15000; u.onend = () => { VOZ.hablando = Date.now() + 600 }
    speechSynthesis.speak(u)
  } catch (e) {}
}
const deletrear = (c) => String(c).replace(/([A-Za-z])/g, ' $1 ').replace(/\s+/g, ' ').trim()
const SR = window.SpeechRecognition || window.webkitSpeechRecognition
let rec = null, alOir = null
function microfono(on) {
  VOZ.mic = on && !!SR
  if (!SR) return R().toast('Este navegador no entiende la voz. Usa Chrome en Android o el ordenador.')
  if (!on) { try { rec?.stop() } catch (e) {} return }
  if (!rec) {
    rec = new SR(); rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = false
    rec.onresult = (e) => { if (Date.now() < VOZ.hablando) return; const t = e.results[e.results.length - 1][0].transcript.toLowerCase().trim(); if (alOir) alOir(t) }
    rec.onend = () => { if (VOZ.mic) setTimeout(() => { try { rec.start() } catch (e) {} }, 300) }
  }
  try { rec.start() } catch (e) {}
}

// ---------- cámara ----------
async function camara(cb) {
  if (!('BarcodeDetector' in window)) return R().toast('Este móvil no lee códigos con la cámara. Usa la pistola o escribe el número.', 5000)
  R().modal('<h2>Apunta al código de barras</h2><video id="cam" playsinline muted style="width:100%;border-radius:12px;background:#000"></video><button class="btn sec big" id="cam-x" style="margin-top:10px">Cancelar</button>')
  let st = null, vivo = true
  const parar = () => { vivo = false; st?.getTracks().forEach((t) => t.stop()); R().cerrar() }
  $('#cam-x').onclick = parar
  try {
    st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); const v = $('#cam'); v.srcObject = st; await v.play()
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'itf', 'upc_a', 'upc_e', 'code_39'] })
    while (vivo) { const r = await det.detect(v).catch(() => []); if (r[0]) { parar(); return cb(r[0].rawValue) } await new Promise((ok) => setTimeout(ok, 200)) }
  } catch (e) { parar(); R().toast('No se ha podido abrir la cámara.') }
}

// ---------- etiquetas de bultos ----------
const compacto = (id) => String(id).replace(/[^a-z0-9]/gi, '').toUpperCase()
const codigoBulto = (a, n, N) => `TN.${n}.${N}.${compacto(a.id)}`
function leerBulto(v) { const m = String(v).trim().match(/^TN\.(\d+)\.(\d+)\.([A-Z0-9]+)$/i); if (!m) return null; const id = m[3].toUpperCase(); return { n: +m[1], N: +m[2], a: R().S.albaranes.find((x) => compacto(x.id) === id) } }
function etiquetas(lista) {
  lista = lista.filter((a) => a.prep?.bultos)
  if (!lista.length) return R().toast('No hay pedidos preparados con bultos.')
  const svg = (v) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); JsBarcode(s, v, { format: 'CODE128', height: 55, width: 2, fontSize: 13, margin: 4 }); return s.outerHTML }
  const et = lista.flatMap((a) => Array.from({ length: a.prep.bultos }, (_, k) => `<div class="et"><div class="tn">TIERRA NUESTRA · ${h(R().fechaES(a.fecha))}</div><div class="cl">${h(a.cliente.nombre)}</div><div class="mu">${h([a.cliente.direccion, a.cliente.poblacion].filter(Boolean).join(', '))}</div><div class="row"><span>Alb. ${h(a.numero)}</span><span>🚚 ${h(a.repartidor || 'sin asignar')}${a.orden ? ' · parada ' + a.orden : ''}</span></div><div class="bu">BULTO ${k + 1} / ${a.prep.bultos}</div>${svg(codigoBulto(a, k + 1, a.prep.bultos))}</div>`)).join('')
  const w = window.open('', '_blank'); if (!w) return R().toast('Permite las ventanas emergentes para imprimir.')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>@page{size:100mm 70mm;margin:0}body{margin:0;font-family:system-ui,sans-serif}.et{width:100mm;height:70mm;box-sizing:border-box;padding:4mm 5mm;page-break-after:always;overflow:hidden;display:flex;flex-direction:column;gap:1mm}.tn{font-size:10px;letter-spacing:.15em;color:#830040;font-weight:700}.cl{font-size:20px;font-weight:800;line-height:1.1}.mu{font-size:12px;color:#444}.row{display:flex;justify-content:space-between;font-size:12px}.bu{font-size:18px;font-weight:800;text-align:center;border:2px solid #000;border-radius:6px}svg{width:100%;height:auto;max-height:24mm}</style></head><body>${et}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`)
  w.document.close()
}

// ---------- PREPARAR (almacén) ----------
let PK = null // { id, cur, msg, tipo, pend }
function vPreparar(m) {
  cargarArticulos()
  if (PK) { const a = R().S.albaranes.find((x) => x.id === PK.id); if (a) return picking(m, a); PK = null }
  const lista = paraPreparar().sort((x, y) => ['preparando', 'pendiente', 'preparado', 'cargado'].indexOf(est(x)) - ['preparando', 'pendiente', 'preparado', 'cargado'].indexOf(est(y)) || (x.repartidor || 'zz').localeCompare(y.repartidor || 'zz') || (y.orden || 0) - (x.orden || 0))
  const sin = R().delDia().filter((a) => !a.lineas?.length).length
  m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">Pedidos para preparar</h1>${R().selectorFecha()}</div>
  ${lista.length ? '' : '<div class="card mut">No hay pedidos con artículos para este día. La oficina los pasa desde la pestaña Almacén (WhatsApp o Sage).</div>'}
  ${lista.map((a) => { const L = lineas(a), hechas = L.filter((l) => l.hecha).length; return `<div class="card stop" data-pk="${a.id}"><div class="num" style="background:${PCOL[est(a)]}">${hechas}/${L.length}</div><div class="grow"><b>${h(a.cliente.nombre)}</b><div class="mut">Alb. ${h(a.numero)} · ${L.length} artículos · 🚚 ${h(a.repartidor || 'sin asignar')}</div>${a.prep?.quien ? `<div class="mut">👤 ${h(a.prep.quien)}</div>` : ''}<div class="bar" style="margin-top:6px"><i style="width:${L.length ? (100 * hechas) / L.length : 0}%"></i></div></div><span class="pill" style="background:${PCOL[est(a)]}">${PREP[est(a)]}</span></div>` }).join('')}
  ${sin ? `<div class="mut">${sin} albaranes de este día no traen artículos (llegarán con la conexión a Sage).</div>` : ''}`
  R().enlazarFecha()
  $$('[data-pk]').forEach((b) => (b.onclick = () => {
    const a = R().S.albaranes.find((x) => x.id === b.dataset.pk)
    if (['preparado', 'cargado'].includes(est(a)) && !confirm('Este pedido ya está preparado. ¿Volver a abrirlo?')) return
    a.prep = Object.assign({ l: {} }, a.prep, { estado: 'preparando', quien: R().U.nombre, inicio: a.prep?.inicio || new Date().toISOString() }); R().tocar(a)
    PK = { id: a.id }; R().render(); anunciar(a)
  }))
}
function actual(a) { const L = lineas(a); if (PK.cur == null || !L.some((l) => l.i === PK.cur && !l.hecha)) PK.cur = L.find((l) => !l.hecha)?.i ?? null; return { L, l: L.find((x) => x.i === PK.cur) } }
function anunciar(a) {
  const { l } = actual(a); if (!l) return decir('Pedido completo. Indica los bultos.')
  decir(`${l.sitio.cod ? ZONAS[l.sitio.zona][0] + ' ' + deletrear(l.sitio.cod) : 'Sin ubicación'}. ${uni(l.cant - l.n, l.unidad)} de ${l.nombre}`)
}
function aviso(txt, tipo, voz) { PK.msg = txt; PK.tipo = tipo; if (tipo) pitido(tipo === 'ok'); if (voz) decir(voz) }
function preguntar(txt, fn, voz) { PK.pend = { txt, fn }; PK.msg = null; pitido(false); decir(voz || txt + '. Confírmalo.') }
function picking(m, a) {
  const { L, l } = actual(a)
  const hechas = L.filter((x) => x.hecha).length
  const z = l ? ZONAS[l.sitio.zona] : null
  m.innerHTML = `<div class="row" style="margin-bottom:8px"><button class="btn sec sm" id="pk-salir">◀ Pedidos</button><div class="grow"><b>${h(a.cliente.nombre)}</b> <span class="mut">· Alb. ${h(a.numero)}</span></div><span class="mut">${hechas}/${L.length}</span></div>
  <div class="bar" style="margin-bottom:10px"><i style="width:${(100 * hechas) / (L.length || 1)}%"></i></div>
  ${PK.pend ? `<div class="card" style="border:3px solid var(--warn)"><h2>${h(PK.pend.txt)}</h2><div class="row"><button class="btn ok big grow" id="pk-si" style="width:auto">Sí</button><button class="btn sec big grow" id="pk-no" style="width:auto">No</button></div></div>` : ''}
  ${PK.msg ? `<div class="card" style="background:${PK.tipo === 'ok' ? '#e7f6ec' : PK.tipo === 'ko' ? '#fde8e8' : '#fff'};border:3px solid ${PK.tipo === 'ok' ? 'var(--ok)' : PK.tipo === 'ko' ? 'var(--ko)' : 'var(--borde)'};font-size:18px;font-weight:600">${h(PK.msg)}</div>` : ''}
  ${l ? `<div class="card" style="text-align:center;padding:18px"><div style="display:inline-block;background:${z[1]};color:#fff;border-radius:12px;padding:8px 18px;font-size:15px;letter-spacing:.08em">${z[0].toUpperCase()}</div>
    <div style="font-size:54px;font-weight:800;color:${z[1]};line-height:1.1;margin:6px 0">${h(l.sitio.cod || '—')}</div>${l.sitio.otras.length ? `<div class="mut">También en: ${l.sitio.otras.map((o) => h(o.cod)).join(', ')}</div>` : ''}
    <div style="font-size:40px;font-weight:800;margin-top:10px">${h(uni(l.cant, l.unidad))}</div><div style="font-size:21px;font-weight:600">${h(l.nombre)}</div><div class="mut">Código ${h(l.codigo || '—')}</div>
    <div style="font-size:26px;margin-top:10px">Leídas: <b style="color:${l.n ? 'var(--ok)' : 'inherit'}">${l.n}</b> de ${l.cant}</div>
    ${!l.codigo ? '<div class="mut" style="color:var(--warn)">Esta línea no tiene código de artículo: compruébala a mano.</div>' : !tieneCodigo(l.codigo) ? '<div class="mut" style="color:var(--warn)">Este vino aún no tiene código de barras guardado: léelo y te pregunto si es este.</div>' : ''}</div>
  <input id="pk-scan" inputmode="none" autocomplete="off" placeholder="🔫 Lee el código con la pistola (o pulsa ⌨ para escribirlo)" style="font-size:18px;padding:14px;border:2px solid var(--vino)">
  <div class="choice" style="grid-template-columns:repeat(4,1fr);margin-top:8px"><button id="pk-cam">📷 Cámara</button><button id="pk-tec">⌨ Escribir</button><button id="pk-mic" class="${VOZ.mic ? 'on' : ''}">🎤 Voz ${VOZ.mic ? 'sí' : 'no'}</button><button id="pk-alt" class="${VOZ.altavoz ? 'on' : ''}">🔊 ${VOZ.altavoz ? 'Sí' : 'No'}</button></div>
  <div class="choice" style="grid-template-columns:repeat(4,1fr);margin-top:8px"><button id="pk-rep">🔁 Repetir</button><button id="pk-ant">◀ Anterior</button><button id="pk-fal" style="color:var(--ko)">✖ Falta</button><button id="pk-sig">Siguiente ▶</button></div>
  ${VOZ.mic ? '<div class="mut" style="margin-top:6px">Di: «repetir», «siguiente», «anterior», «falta», y «sí» o «no» para confirmar.</div>' : ''}`
  : fin(a, L)}
  <div class="card" style="margin-top:12px"><h3>Todo el pedido (en orden de recorrido)</h3><table class="lineas">${L.map((x) => `<tr style="${x.i === PK.cur ? 'background:#f6e9ef' : ''}"><td style="width:70px"><b style="color:${ZONAS[x.sitio.zona][1]}">${h(x.sitio.cod || '—')}</b></td><td>${h(uni(x.cant, x.unidad))} · ${h(x.nombre)}</td><td style="width:70px;text-align:right">${x.falta ? `<b style="color:var(--ko)">FALTA ${x.n}/${x.cant}</b>` : x.hecha ? '<b style="color:var(--ok)">✓</b>' + (x.manual ? ' a mano' : '') : `${x.n}/${x.cant}`}</td></tr>`).join('')}</table></div>`
  const ir = () => R().render()
  $('#pk-salir').onclick = () => { PK = null; microfono(false); alOir = null; ir() }
  if (PK.pend) { $('#pk-si').onclick = () => { const f = PK.pend.fn; PK.pend = null; f(); ir() }; $('#pk-no').onclick = () => { PK.pend = null; ir() } }
  if (!l) return enlazarFin(a, L)
  const sc = $('#pk-scan'); const foco = () => { if ($('#modal.hidden') && document.activeElement !== sc && !PK.pend) sc.focus({ preventScroll: true }) }
  sc.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = sc.value.trim(); sc.value = ''; if (v) { leer(a, v); ir() } } }
  setTimeout(foco, 50)
  $('#pk-tec').onclick = () => { sc.inputMode = sc.inputMode === 'none' ? 'numeric' : 'none'; sc.blur(); setTimeout(() => sc.focus(), 50) }
  $('#pk-cam').onclick = () => camara((v) => { leer(a, v); ir() })
  $('#pk-alt').onclick = () => { VOZ.altavoz = !VOZ.altavoz; localStorage.setItem('tn-alm-altavoz', VOZ.altavoz ? 'si' : 'no'); ir() }
  $('#pk-mic').onclick = () => { microfono(!VOZ.mic); ir() }
  $('#pk-rep').onclick = () => anunciar(a)
  $('#pk-ant').onclick = () => { const i = L.findIndex((x) => x.i === PK.cur); const p = L[i - 1]; if (p) { marcar(a, p.i, { n: 0, falta: false, manual: false }); PK.cur = p.i; PK.msg = 'Vuelves a: ' + p.nombre; PK.tipo = null; ir(); anunciar(a) } }
  $('#pk-fal').onclick = () => { faltaQ(a, l); ir() }
  $('#pk-sig').onclick = () => { siguienteQ(a, l); ir() }
  alOir = (t) => {
    if (PK.pend) { if (/\b(s[ií]|vale|confirmo|correcto|ok)\b/.test(t)) { const f = PK.pend.fn; PK.pend = null; f() } else if (/\b(no|cancela)/.test(t)) PK.pend = null; else return; return ir() }
    PK.msg = '🎤 «' + t + '»'; PK.tipo = null
    if (/repet/.test(t)) anunciar(a)
    else if (/siguiente|listo|hecho/.test(t)) siguienteQ(a, l)
    else if (/anterior|atr[aá]s/.test(t)) return $('#pk-ant').click()
    else if (/falta|no hay/.test(t)) faltaQ(a, l)
    else return
    ir()
  }
}
function sumar(a, l, k) {
  if (l.n + k > l.cant) return aviso(`Te pasas: llevas ${l.n} y se piden ${l.cant}. No cojas más.`, 'ko', 'Error. Te pasas.')
  marcar(a, l.i, { n: l.n + k }); const n = l.n + k
  if (n >= l.cant) { aviso(`✓ Completo: ${uni(l.cant, l.unidad)} de ${l.nombre}`, 'ok'); PK.cur = null; setTimeout(() => anunciar(a), 50) } else aviso(`✓ Bien: ${n} de ${l.cant}`, 'ok', `${n} de ${l.cant}`)
}
function leer(a, v) {
  const { L, l } = actual(a); if (!l) return
  PK.pend = null
  const info = CB[v]
  if (!info) {
    if (!l.codigo) return aviso('Código desconocido. Esta línea no tiene código de artículo: compruébala a mano y pulsa Siguiente.', 'ko', 'Código desconocido.')
    return preguntar(`Código ${v} desconocido. ¿Es de «${l.nombre}»? (solo si lo tienes en la mano)`, () => { guardarCodigo(v, { c: l.codigo, caja: esCaja(v) }); leer(a, v) }, 'Código desconocido. ¿Es de este vino?')
  }
  if (info.c !== l.codigo) {
    const otra = L.find((x) => x.codigo === info.c), nom = ART.get(info.c)?.n || info.c
    return aviso(`✖ ESE NO ES. Has leído «${nom}»${otra ? ' (va en otra línea de este pedido)' : ' (no va en este pedido)'}. Ahora toca: ${l.nombre}`, 'ko', 'Error. Ese no es.')
  }
  const caja = info.caja ?? esCaja(v)
  if (l.unidad === 'cajas') {
    if (!caja) return preguntar(`Has leído el código de una BOTELLA y se piden CAJAS. ¿Contar 1 caja entera?`, () => sumar(a, l, 1), 'Ojo, es código de botella. ¿Cuento una caja?')
    return sumar(a, l, 1)
  }
  if (caja) {
    if (info.x) return sumar(a, l, info.x)
    PK.pend = { txt: `Has leído una CAJA. ¿Cuántas botellas trae?`, elegir: true, fn: () => {} }
    PK.cajaDe = v; decir('Has leído una caja. ¿Cuántas botellas trae?')
    setTimeout(() => {
      const box = $('#pk-si')?.parentElement; if (!box) return
      box.innerHTML = [6, 12, 24, 3, 1].map((n) => `<button class="btn ${n === 1 ? 'sec' : ''} grow" data-x="${n}" style="width:auto">${n === 1 ? 'Era 1 botella' : n}</button>`).join('') + '<button class="btn sec grow" id="pk-no2" style="width:auto">Cancelar</button>'
      $$('[data-x]', box).forEach((b) => (b.onclick = () => { const x = +b.dataset.x; PK.pend = null; if (x > 1) guardarCodigo(v, { c: l.codigo, caja: true, x }); sumar(a, l, x); R().render() }))
      $('#pk-no2').onclick = () => { PK.pend = null; R().render() }
    }, 30)
    return
  }
  sumar(a, l, 1)
}
function siguienteQ(a, l) {
  if (l.n >= l.cant) return
  preguntar(`¿Dar por buena «${l.nombre}» sin leer los códigos? (${uni(l.cant, l.unidad)})`, () => { marcar(a, l.i, { n: l.cant, manual: true }); PK.cur = null; aviso('✓ Apuntado a mano: ' + l.nombre, 'ok'); anunciar(a) }, '¿La doy por buena sin leer?')
}
function faltaQ(a, l) {
  preguntar(`¿Apuntar FALTA de «${l.nombre}»? Llevas ${l.n} de ${l.cant}.`, () => { marcar(a, l.i, { falta: true }); PK.cur = null; aviso(`Falta apuntada: ${l.nombre} (${l.n} de ${l.cant}). La oficina lo verá.`, 'ko'); setTimeout(() => anunciar(a), 50) }, `¿Apunto falta? Llevas ${l.n} de ${l.cant}.`)
}
function fin(a, L) {
  const faltas = L.filter((x) => x.falta), cajas = L.filter((x) => x.unidad === 'cajas').reduce((s, x) => s + x.n, 0), bot = L.filter((x) => x.unidad !== 'cajas').reduce((s, x) => s + x.n, 0)
  const bultos = a.prep?.bultos || Math.max(1, cajas + Math.ceil(bot / 12))
  return `<div class="card" style="text-align:center;border:3px solid ${faltas.length ? 'var(--warn)' : 'var(--ok)'}"><div style="font-size:40px">${faltas.length ? '⚠' : '✅'}</div><h2>${faltas.length ? 'Pedido terminado con faltas' : 'Pedido completo'}</h2>
  ${faltas.length ? `<div style="text-align:left">${faltas.map((x) => `<div style="color:var(--ko)">✖ ${h(x.nombre)}: ${x.n} de ${x.cant}</div>`).join('')}</div>` : ''}
  <label>¿Cuántos bultos (cajas para cargar) salen?</label><div class="row" style="justify-content:center"><button class="btn sec" id="pk-bm">−</button><input id="pk-bultos" type="number" min="1" value="${bultos}" style="width:90px;font-size:26px;text-align:center"><button class="btn sec" id="pk-bp">+</button></div>
  <button class="btn big ok" id="pk-fin" style="margin-top:10px">Terminar e imprimir etiquetas</button><button class="btn sec" id="pk-fin2" style="margin-top:8px;width:100%">Terminar sin etiquetas</button></div>`
}
function enlazarFin(a) {
  const b = $('#pk-bultos'); $('#pk-bm').onclick = () => (b.value = Math.max(1, +b.value - 1)); $('#pk-bp').onclick = () => (b.value = +b.value + 1)
  const terminar = (imp) => {
    const L = lineas(a)
    Object.assign(a.prep, { estado: 'preparado', bultos: Math.max(1, +b.value || 1), fin: new Date().toISOString(), faltas: L.filter((x) => x.falta).map((x) => ({ codigo: x.codigo, nombre: x.nombre, pedidas: x.cant, cogidas: x.n })), cargados: [] })
    R().tocar(a); decir('Pedido terminado.'); if (imp) etiquetas([a]); PK = null; microfono(false); R().render(); R().toast('Pedido preparado')
  }
  $('#pk-fin').onclick = () => terminar(true); $('#pk-fin2').onclick = () => terminar(false)
}

// ---------- CARGAR FURGONETA (punteo de bultos) ----------
let CG = { rep: '', msg: null, tipo: null }
function vCargar(m) {
  const { S, U } = R()
  if (U.rol === 'repartidor') CG.rep = U.nombre
  if (!CG.rep) CG.rep = S.repartidores[0]
  const lista = R().ruta(CG.rep).filter((a) => a.lineas?.length || a.prep).sort((x, y) => (y.orden || 0) - (x.orden || 0))
  const listos = lista.filter((a) => ['preparado', 'cargado'].includes(est(a)))
  const tot = listos.reduce((s, a) => s + (a.prep.bultos || 0), 0), cargados = listos.reduce((s, a) => s + (a.prep.cargados || []).length, 0)
  m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">Cargar furgoneta</h1>${R().selectorFecha()}</div>
  <div class="card row">${U.rol === 'repartidor' ? `<b class="grow">🚚 ${h(CG.rep)}</b>` : `<label>Ruta</label><select id="cg-rep" class="grow" style="width:auto">${S.repartidores.map((r) => `<option ${r === CG.rep ? 'selected' : ''}>${h(r)}</option>`).join('')}</select>`}<b style="font-size:22px">${cargados} / ${tot} bultos</b></div>
  ${CG.msg ? `<div class="card" style="font-size:18px;font-weight:600;background:${CG.tipo === 'ok' ? '#e7f6ec' : '#fde8e8'};border:3px solid ${CG.tipo === 'ok' ? 'var(--ok)' : 'var(--ko)'}">${h(CG.msg)}</div>` : ''}
  <input id="cg-scan" inputmode="none" autocomplete="off" placeholder="🔫 Lee la etiqueta de cada bulto al subirlo" style="font-size:18px;padding:14px;border:2px solid var(--vino)">
  <div class="choice" style="margin-top:8px"><button id="cg-cam">📷 Cámara</button><button id="cg-tec">⌨ Escribir</button></div>
  <p class="mut">Carga primero lo último que vas a entregar: la lista va de la última parada a la primera.</p>
  ${lista.map((a) => { const e = est(a), N = a.prep?.bultos || 0, c = (a.prep?.cargados || []).length; return `<div class="card stop"><div class="num" style="background:${e === 'cargado' ? 'var(--ok)' : ['preparado'].includes(e) ? 'var(--azul)' : 'var(--ko)'}">${a.orden || '·'}</div><div class="grow"><b>${h(a.cliente.nombre)}</b><div class="mut">Alb. ${h(a.numero)} · ${PREP[e]}${N ? ` · bultos ${c}/${N}` : ''}</div>${a.prep?.faltas?.length ? `<div style="color:var(--ko);font-size:14px">⚠ Con faltas: ${a.prep.faltas.map((f) => h(f.nombre)).join(', ')}</div>` : ''}</div>${e === 'preparado' ? `<button class="btn sec sm" data-mano="${a.id}">Sin etiqueta</button>` : ''}</div>` }).join('') || '<div class="card mut">No hay pedidos preparados en esta ruta.</div>'}
  ${lista.length && cargados === tot && tot ? '<div class="card" style="text-align:center;border:3px solid var(--ok);font-size:20px;font-weight:700">✅ Furgoneta completa</div>' : ''}`
  R().enlazarFecha()
  if ($('#cg-rep')) $('#cg-rep').onchange = (e) => { CG.rep = e.target.value; CG.msg = null; R().render() }
  const sc = $('#cg-scan'); setTimeout(() => { if ($('#modal.hidden')) sc.focus({ preventScroll: true }) }, 50)
  sc.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = sc.value.trim(); sc.value = ''; if (v) { cargar(v); R().render() } } }
  $('#cg-tec').onclick = () => { sc.inputMode = sc.inputMode === 'none' ? 'text' : 'none'; sc.blur(); setTimeout(() => sc.focus(), 50) }
  $('#cg-cam').onclick = () => camara((v) => { cargar(v); R().render() })
  $$('[data-mano]').forEach((b) => (b.onclick = () => { const a = R().S.albaranes.find((x) => x.id === b.dataset.mano); if (!confirm(`¿Cargar los ${a.prep.bultos} bultos de ${a.cliente.nombre} sin leer etiquetas?`)) return; a.prep.cargados = Array.from({ length: a.prep.bultos }, (_, i) => i + 1); cerrarCarga(a); R().render() }))
}
function cargaMsg(t, ok, voz) { CG.msg = t; CG.tipo = ok ? 'ok' : 'ko'; pitido(ok); decir(voz || t) }
function cerrarCarga(a) { a.prep.estado = 'cargado'; a.prep.cargadoAt = new Date().toISOString(); if (a.estado === 'pendiente') a.estado = 'ruta'; R().tocar(a) }
function cargar(v) {
  const b = leerBulto(v)
  if (!b) return cargaMsg('✖ Eso no es una etiqueta de bulto de Tierra Nuestra.', false, 'Error. No es una etiqueta.')
  const a = b.a
  if (!a) return cargaMsg('✖ Etiqueta de un pedido que no está en la app (¿de otro día?). No lo subas.', false, 'Error. Pedido desconocido.')
  if (a.repartidor !== CG.rep || (R().V.fecha !== 'todas' && a.fecha !== R().V.fecha)) return cargaMsg(`✖ NO LO SUBAS: es de ${a.cliente.nombre}, ruta de ${a.repartidor || 'sin asignar'} (${R().fechaES(a.fecha)}).`, false, 'Error. Ese bulto es de otra ruta.')
  if (!['preparado', 'cargado'].includes(est(a))) return cargaMsg(`✖ El pedido de ${a.cliente.nombre} no está terminado de preparar.`, false, 'Error. Pedido sin terminar.')
  a.prep.cargados = a.prep.cargados || []
  if (a.prep.cargados.includes(b.n)) return cargaMsg(`Ese bulto (${b.n} de ${b.N}) de ${a.cliente.nombre} ya estaba cargado.`, false, 'Ya estaba cargado.')
  a.prep.cargados.push(b.n)
  if (a.prep.cargados.length >= a.prep.bultos) { cerrarCarga(a); cargaMsg(`✓ ${a.cliente.nombre}: ${a.prep.bultos} de ${a.prep.bultos}. Pedido cargado.`, true) } else { R().tocar(a); cargaMsg(`✓ ${a.cliente.nombre}: bulto ${b.n} de ${b.N}. Faltan ${a.prep.bultos - a.prep.cargados.length}.`, true, `Bulto ${b.n} de ${b.N}.`) }
}

// ---------- OFICINA: tablero de almacén y dispatching ----------
async function traerWhatsapp() {
  const { S, Nube, V, hoy } = R()
  let ps = []
  try { ps = await Nube.api('wa_pedidos?select=*&estado=in.(confirmado,revisado)&order=creado.asc&limit=300') } catch (e) { return R().toast('Sin conexión') }
  const nuevos = ps.filter((p) => (p.lineas || []).length && !S.albaranes.some((a) => a.id === 'wa-' + p.id))
  if (!nuevos.length) return R().toast('No hay pedidos nuevos confirmados por WhatsApp.')
  const fecha = V.fecha === 'todas' ? hoy() : V.fecha
  if (!confirm(`¿Pasar ${nuevos.length} pedidos confirmados de WhatsApp a preparación del ${R().fechaES(fecha)}?`)) return
  for (const p of nuevos) {
    const c = (S.clientes || {})[p.cliente_codigo] || {}
    const a = { id: 'wa-' + p.id, numero: 'WA-' + p.id, fecha, origen: 'whatsapp', cliente: { codigo: p.cliente_codigo || '', nombre: p.cliente_nombre || c.nombre || p.telefono, direccion: c.direccion || '', cp: c.cp || '', poblacion: c.poblacion || '', telefono: c.telefono || p.telefono }, lineas: (p.lineas || []).map((l) => ({ codigo: l.codigo, nombre: l.descripcion, unidades: l.cantidad, unidad: l.unidad })), total: 0, obs: p.notas || '', estado: 'pendiente', repartidor: '', orden: 0 }
    S.albaranes.push(a); R().tocar(a)
  }
  R().toast(`${nuevos.length} pedidos de WhatsApp pasados a preparación. Asígnales repartidor en Albaranes o Rutas.`, 5000); R().render()
}
function vTablero(m) {
  cargarArticulos()
  const lista = paraPreparar()
  const c = (e) => lista.filter((a) => est(a) === e).length, conF = lista.filter((a) => a.prep?.faltas?.length)
  const sinUb = new Set(lista.flatMap((a) => lineas(a).filter((l) => l.sitio.zona === 'ninguna').map((l) => l.nombre)))
  m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">Almacén: preparación y carga</h1>${R().selectorFecha()}</div>
  <div class="stats">${Object.keys(PREP).map((e) => `<div class="stat"><b style="color:${PCOL[e]}">${c(e)}</b><span>${PREP[e]}</span></div>`).join('')}<div class="stat"><b style="color:var(--ko)">${conF.length}</b><span>Con faltas</span></div></div>
  <div class="card row"><button class="btn" id="tb-wa">📲 Traer pedidos confirmados de WhatsApp</button><button class="btn sec" id="tb-et">🏷 Etiquetas de todos los preparados</button><button class="btn sec" id="tb-art">↻ Actualizar ubicaciones y códigos</button></div>
  ${conF.length ? `<div class="card" style="border:2px solid var(--ko)"><h3 style="color:var(--ko)">⚠ Faltas en la preparación</h3>${conF.map((a) => `<div><b>${h(a.cliente.nombre)}</b> (Alb. ${h(a.numero)}): ${a.prep.faltas.map((f) => `${h(f.nombre)} ${f.cogidas}/${f.pedidas}`).join(' · ')}</div>`).join('')}</div>` : ''}
  <div class="card" style="overflow-x:auto"><table><thead><tr><th>Cliente</th><th>Albarán</th><th>Ruta</th><th>Estado</th><th>Líneas</th><th>Bultos</th><th></th></tr></thead><tbody>
  ${lista.map((a) => { const L = lineas(a), hh = L.filter((l) => l.hecha).length; return `<tr><td><b>${h(a.cliente.nombre)}</b>${a.origen === 'whatsapp' ? ' <span class="mut">📲</span>' : ''}</td><td>${h(a.numero)}</td><td>${h(a.repartidor || '—')}${a.orden ? ' · ' + a.orden : ''}</td><td><span class="pill" style="background:${PCOL[est(a)]}">${PREP[est(a)]}</span>${a.prep?.quien ? `<div class="mut">${h(a.prep.quien)}</div>` : ''}</td><td>${hh}/${L.length}</td><td>${a.prep?.bultos ? `${(a.prep.cargados || []).length}/${a.prep.bultos}` : '—'}</td><td style="white-space:nowrap">${a.prep?.bultos ? `<button class="btn sec sm" data-et="${a.id}">🏷</button> ` : ''}${a.prep ? `<button class="btn sec sm" data-re="${a.id}">↺</button>` : ''}</td></tr>` }).join('') || '<tr><td colspan="7" class="mut">No hay pedidos con artículos este día.</td></tr>'}</tbody></table></div>
  ${sinUb.size ? `<div class="card"><h3>Vinos sin ubicación en la app Ubicaciones (${sinUb.size})</h3><div class="mut">${[...sinUb].map(h).join(' · ')}</div></div>` : ''}
  <p class="mut">Los preparadores entran en la app como <b>Almacén</b>. Los albaranes de Sage llegarán con sus artículos cuando esté la conexión de solo lectura.</p>`
  R().enlazarFecha()
  $('#tb-wa').onclick = traerWhatsapp
  $('#tb-et').onclick = () => etiquetas(lista.filter((a) => est(a) === 'preparado'))
  $('#tb-art').onclick = async () => { await cargarArticulos(true); R().toast(`${ART.size} artículos con ubicación cargados`); R().render() }
  $$('[data-et]').forEach((b) => (b.onclick = () => etiquetas([R().S.albaranes.find((x) => x.id === b.dataset.et)])))
  $$('[data-re]').forEach((b) => (b.onclick = () => { const a = R().S.albaranes.find((x) => x.id === b.dataset.re); if (!confirm('¿Borrar la preparación de este pedido y empezarlo de cero?')) return; delete a.prep; R().tocar(a); R().render() }))
}

window.TNP = { codigoDe: (v) => { cargarArticulos(); const x = CB[String(v).trim()]; return x ? Object.assign({ caja: esCaja(String(v).trim()) }, x) : null }, vPreparar, vCargar, vTablero, _leer: leer, _cargar: cargar, _codigoBulto: codigoBulto, _lineas: lineas, enPicking: () => !!PK }
})()
