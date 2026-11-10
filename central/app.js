/* TN Central · Tierra Nuestra — un solo enlace para todas las aplicaciones, conectadas a la base central alimentada por Sage 50 */
(function () {
'use strict'
const VERSION = '1.0.0'
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const eur = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
const hoy = () => new Date().toLocaleDateString('sv-SE')
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const SUPA = { url: 'https://zxrrwwmxbvdlkalqzzau.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cnJ3d214YnZkbGthbHF6emF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzkxODQsImV4cCI6MjEwODg1NTE4NH0.IZltQVDiXx6QAYSwt5Lt6wGA8U0YRNlKvrICaTEUYh0', email: 'reparto@tierranuestra.es' }

const SVG = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON.vino}</svg>`
const ICON = {
  tpv: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h5M8 18h3"/>',
  guia: '<path d="M8 2h8l-1 7a3 3 0 0 1-6 0z"/><path d="M12 12v8M8 22h8"/>',
  vinos: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L21 7H6"/>',
  club: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
  reparto: '<path d="M1 4h13v12H1zM14 8h4l4 4v4h-8"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
  whatsapp: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>',
  comerciales: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
  ubicaciones: '<path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  preparar: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  croquis: '<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>',
  horarios: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4"/>',
  redes: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8"/>',
  specialdays: '<path d="M12 2l2.6 6.4L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.6z"/>',
  inicio: '<path d="M3 11 12 3l9 8M5 10v10h14V10"/>',
  sage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  vino: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
}
const GRUPOS = [
  ['venta', 'Tienda y venta'],
  ['pedidos', 'Pedidos, clientes y reparto'],
  ['almacen', 'Almacén'],
  ['equipo', 'Equipo'],
  ['marketing', 'Marketing'],
]
const MODULOS = [
  { id: 'tpv', g: 'venta', n: 'TPV tienda', d: 'Cobrar en tienda con lector, cámara y ticket', url: '../tpv/' },
  { id: 'guia', g: 'venta', n: 'Guía de vinos', d: 'Fichas, precios PVP y asistente para el mostrador', url: '../guia/' },
  { id: 'vinos', g: 'venta', n: 'Web de vinos', d: 'Tienda online para clientes', url: '../vinos/' },
  { id: 'club', g: 'venta', n: 'Club de Vinos', d: 'Altas de socios y exportación a Sage', url: '../club/' },
  { id: 'reparto', g: 'pedidos', n: 'Reparto y oficina', d: 'Albaranes de Sage, rutas, entregas y cobros', url: '../reparto/' },
  { id: 'whatsapp', g: 'pedidos', n: 'Pedidos WhatsApp', d: 'Pedidos del chatbot (en Reparto › Oficina › WhatsApp)', url: '../reparto/' },
  { id: 'comerciales', g: 'pedidos', n: 'Comerciales', d: 'Clientes, catálogo con tarifas y pedidos (perfil Comercial)', url: '../reparto/' },
  { id: 'ubicaciones', g: 'almacen', n: 'Ubicaciones', d: 'Dónde está cada vino: nicheros, almacén y nave', url: '../ubicaciones/' },
  { id: 'preparar', g: 'almacen', n: 'Preparar pedidos', d: 'Picking con lector y voz, bultos y carga (perfil Almacén)', url: '../reparto/' },
  { id: 'croquis', g: 'almacen', n: 'Croquis del almacén', d: 'Plano de zonas y estanterías', url: '../croquis/' },
  { id: 'horarios', g: 'equipo', n: 'Horarios y fichajes', d: 'Turnos, fichar entrada/salida y solicitudes', url: '../horarios/' },
  { id: 'redes', g: 'marketing', n: 'Redes sociales', d: 'Publicaciones e historias de la semana', url: '../redes/2026-11-s1/' },
  { id: 'specialdays', g: 'marketing', n: 'Special Days', d: 'Campaña de ofertas y reservas', url: '../specialdays/' },
]
// las tres entradas de Reparto son la misma app: se comparte un solo marco
const marcoDe = (m) => (m.url === '../reparto/' ? 'reparto' : m.id)
const MOD = Object.fromEntries(MODULOS.map((m) => [m.id, m]))

function toast(t, ms = 2600) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), ms) }
const LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) }

// ---------- base central (misma sesión que la app de Reparto) ----------
const Nube = {
  get token() { return LS.get('tn-reparto-token', null) },
  set token(t) { if (t) LS.set('tn-reparto-token', t); else localStorage.removeItem('tn-reparto-token') },
  async auth(password) {
    const r = await fetch(SUPA.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: SUPA.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: SUPA.email, password }) })
    if (!r.ok) throw new Error('Contraseña incorrecta')
    const t = await r.json(); t.exp = Date.now() + t.expires_in * 1000; this.token = t
  },
  async renovar() {
    const t = this.token
    if (!t) return false
    if (Date.now() < t.exp - 60000) return true
    const r = await fetch(SUPA.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SUPA.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: t.refresh_token }) }).catch(() => null)
    if (!r) throw new Error('sin conexión')
    if (!r.ok) { this.token = null; return false }
    const n = await r.json(); n.exp = Date.now() + n.expires_in * 1000; this.token = n; return true
  },
  async api(path) {
    if (!(await this.renovar())) throw new Error('sin sesión')
    const r = await fetch(SUPA.url + '/rest/v1/' + path, { headers: { apikey: SUPA.key, Authorization: 'Bearer ' + this.token.access_token } })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
}

let EST = LS.get('tn-central-estado', null) // último estado leído (se ve aunque no haya cobertura)
let estadoError = ''
async function leerEstado() {
  if (!Nube.token) { EST = null; pintarNube(); return }
  try {
    const [sage, alb, wa] = await Promise.all([
      Nube.api('reparto_estado?select=valor&id=eq.sage'),
      Nube.api('reparto_albaranes?select=data&fecha=eq.' + hoy()),
      Nube.api('wa_pedidos?select=estado&order=creado.desc&limit=500').catch(() => []),
    ])
    const l = alb.map((f) => f.data || {})
    const c = (e) => l.filter((a) => a.estado === e).length
    EST = {
      leido: new Date().toISOString(),
      sage: sage[0]?.valor || null,
      hoy: { total: l.length, pendiente: c('pendiente'), ruta: c('ruta'), entregado: c('entregado') + c('parcial'), incidencia: c('incidencia'), importe: l.reduce((s, a) => s + (Number(a.total) || 0), 0) },
      wa: { abiertos: wa.filter((p) => p.estado === 'borrador' || p.estado === 'confirmado').length, confirmados: wa.filter((p) => p.estado === 'confirmado').length },
    }
    estadoError = ''
    LS.set('tn-central-estado', EST)
  } catch (e) {
    estadoError = /sin sesión/.test(e.message) ? 'sesion' : 'red'
  }
  pintarNube()
  if (!V.mod) pintarEstado()
}
function semaforo() {
  const at = EST?.sage?.at ? new Date(EST.sage.at) : null
  if (!Nube.token) return { c: '', t: 'Sin conectar', d: 'Entre con la contraseña del equipo para ver los datos de Sage.' }
  if (!at) return { c: 'ko', t: 'Sage aún no ha enviado datos', d: 'El conector de Sage 50 no está instalado o no ha funcionado todavía.' }
  const min = Math.round((Date.now() - at) / 60000)
  const hace = min < 1 ? 'hace un momento' : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`
  const d = `Última lectura de Sage ${hace} (${at.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })})${EST.sage.base ? ' · empresa ' + EST.sage.base : ''}${EST.sage.equipo ? ' · desde ' + EST.sage.equipo : ''}`
  if (min <= 15) return { c: 'ok', t: 'Sage 50 conectado', d }
  if (min <= 24 * 60) return { c: 'warn', t: 'Sage 50 con retraso', d: d + '. ¿Está encendido el ordenador del conector?' }
  return { c: 'ko', t: 'Sage 50 sin sincronizar', d: d + '. Revise el ordenador donde está instalado el conector.' }
}
function pintarNube() {
  const s = semaforo(), n = $('#nube')
  n.className = 'nube ' + s.c
  n.textContent = (s.c === 'ok' ? '● ' : '○ ') + (s.c === 'ok' ? 'Sage al día' : s.c === 'warn' ? 'Sage con retraso' : s.c === 'ko' ? 'Sage sin datos' : 'Sin conectar')
}

// ---------- buscador de artículos (datos de Sage publicados en la Guía) ----------
let ARTS = null
function cargarArticulos() {
  if (ARTS) return Promise.resolve(ARTS)
  if (cargarArticulos.p) return cargarArticulos.p
  return (cargarArticulos.p = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = '../guia/data.js?v=' + VERSION
    s.onload = () => { ARTS = (window.GUIA || []).map((a) => Object.assign(a, { _t: norm([a.n, a.c, a.o, a.d, a.y, a.v, a.an].join(' ')) })); ok(ARTS) }
    s.onerror = () => { cargarArticulos.p = null; ko(new Error('No se pudo cargar el catálogo')) }
    document.head.appendChild(s)
  }))
}
function buscar(q) {
  q = String(q || '').trim()
  if (!q || !ARTS) return []
  const dig = q.replace(/\D/g, '')
  if (/^\d{5,}$/.test(q)) {
    const exacto = ARTS.filter((a) => a.c === q || String(10000000 + +a.c) === q || (a.b || []).includes(q) || (a.b || []).some((b) => b.length === 14 && b.slice(1) === q))
    if (exacto.length) return exacto
  }
  const t = norm(q).split(/\s+/).filter(Boolean)
  const q0 = norm(q)
  return ARTS.filter((a) => t.every((x) => a._t.includes(x))).sort((x, y) => (norm(y.n).startsWith(q0) - norm(x.n).startsWith(q0)) || (x.n.length - y.n.length)).slice(0, 40)
}
function tarjeta(a) {
  const foto = '<div class="ph">' + SVG('vino') + (a.im ? ' <img loading="lazy" src="../vinos/img/' + (10000000 + +a.c) + '.jpg" alt="" onerror="this.remove()">' : '') + '</div>'
  return `<div class="art">${foto}<div class="g"><div class="n">${h(a.n)}</div><div class="mut">Cód. ${h(a.c)}${a.d ? ' · ' + h(a.d) : ''}${a.o ? ' · ' + h(a.o) : ''}</div>
    <div class="acc"><a class="btn sm" href="#/m/guia/vino/${encodeURIComponent(a.c)}">Ficha</a><a class="btn sm sec" href="#/m/ubicaciones">Ubicación</a><a class="btn sm sec" href="#/m/tpv">Vender</a></div></div>
    <div class="p">${a.p ? eur(a.p / 100) : ''}</div></div>`
}

// ---------- vistas ----------
const V = { mod: null }
const marcos = {}
function dock() {
  const rec = LS.get('tn-central-recientes', []).filter((id) => MOD[id]).slice(0, 4)
  const it = [['#/', 'inicio', 'Inicio', !V.mod && !V.sage], ['#/sage', 'sage', 'Sage 50', V.sage]].concat(rec.map((id) => ['#/m/' + id, id, MOD[id].n.split(' ')[0], V.mod?.id === id]))
  $('#dock').innerHTML = it.map(([href, e, t, on]) => `<a href="${href}" class="${on ? 'on' : ''}">${SVG(e)}${h(t)}</a>`).join('')
}
function abrirModulo(id, sub) {
  const m = MOD[id]; if (!m) return (location.hash = '#/')
  V.mod = m; V.sage = false
  const rec = LS.get('tn-central-recientes', []).filter((x) => x !== id); rec.unshift(id); LS.set('tn-central-recientes', rec.slice(0, 6))
  const k = marcoDe(m), src = m.url + (sub ? '#/' + sub : '')
  let f = marcos[k]
  if (!f) {
    f = marcos[k] = document.createElement('iframe')
    f.title = m.n; f.allow = 'camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen'
    f.src = src; $('#marco').appendChild(f)
  } else if (sub) f.src = src
  Object.entries(marcos).forEach(([kk, el]) => (el.hidden = kk !== k))
  $('#marco').hidden = false; $('#main').hidden = true
  $('#titulo').textContent = m.n
  const nv = $('#b-nueva'); nv.hidden = false; nv.href = src
  document.title = m.n + ' · TN Central'
  dock()
}
function cerrarModulo() {
  V.mod = null; $('#marco').hidden = true; $('#main').hidden = false; $('#titulo').textContent = ''; $('#b-nueva').hidden = true; document.title = 'TN Central · Tierra Nuestra'
}

function vistaInicio() {
  cerrarModulo(); V.sage = false; dock()
  const hora = new Date().getHours(), saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'
  $('#main').innerHTML = `
    <h1>${saludo}</h1>
    <div class="mut">Todas las aplicaciones de Tierra Nuestra en un solo sitio, con los datos de Sage 50.</div>
    <div class="busca"><input id="q" type="search" placeholder="Buscar vino o artículo: nombre, código de Sage o código de barras" autocomplete="off" enterkeyhint="search"></div>
    <div id="res" class="res"></div>
    <div id="estado"></div>
    ${GRUPOS.map(([g, t]) => `<h2>${t}</h2><div class="grid">${MODULOS.filter((m) => m.g === g).map((m) => `<a class="mod" href="#/m/${m.id}" data-mod="${m.id}"><div class="e">${SVG(m.id)}</div><b>${h(m.n)}</b><span>${h(m.d)}</span></a>`).join('')}</div>`).join('')}
    <p class="mut" style="margin-top:26px">TN Central ${VERSION} · Los datos de Sage solo se leen: nada se modifica en Sage 50.</p>`
  const q = $('#q'), res = $('#res')
  const pinta = () => {
    const v = q.value.trim()
    if (!v) { res.innerHTML = ''; return }
    if (!ARTS) { res.innerHTML = '<div class="mut">Cargando catálogo…</div>'; cargarArticulos().then(pinta, () => (res.innerHTML = '<div class="mut">No se pudo cargar el catálogo. Compruebe la conexión.</div>')); return }
    const l = buscar(v)
    res.innerHTML = l.length ? l.map(tarjeta).join('') + (l.length === 40 ? '<div class="mut">Mostrando los 40 primeros: escriba algo más para afinar.</div>' : '') : '<div class="mut">Ningún artículo coincide.</div>'
  }
  q.oninput = pinta
  q.onfocus = () => cargarArticulos().catch(() => {})
  q.value = sessionStorage.getItem('tn-central-q') || ''; if (q.value) pinta()
  q.addEventListener('input', () => sessionStorage.setItem('tn-central-q', q.value))
  pintarEstado()
}
function pintarEstado() {
  const el = $('#estado'); if (!el) return
  const s = semaforo()
  const cab = `<div class="card sage" style="margin-top:14px"><span class="luz ${s.c}"></span><div style="flex:1;min-width:200px"><b>${h(s.t)}</b><div class="mut">${h(s.d)}</div>${estadoError === 'red' ? '<div class="mut">Sin cobertura: se muestran los últimos datos leídos.</div>' : ''}</div><a class="btn sm sec" href="#/sage">Ver conexión</a></div>`
  if (!Nube.token || !EST) {
    el.innerHTML = cab.replace('<a class="btn sm sec" href="#/sage">Ver conexión</a>', '') + `<form id="f-in" class="form"><input id="pw" type="password" placeholder="Contraseña del equipo (la misma de Reparto)" autocomplete="current-password"><button class="btn">Conectar</button></form>`
    $('#f-in').onsubmit = entrar
    return
  }
  const d = EST.hoy
  el.innerHTML = cab + `<h2>Hoy</h2><div class="estado">
    <a class="stat" href="#/m/reparto"><b>${d.total}</b><span>Albaranes de hoy · ${eur(d.importe)}</span></a>
    <a class="stat" href="#/m/reparto"><b>${d.pendiente + d.ruta}</b><span>Por entregar (${d.ruta} en ruta)</span></a>
    <a class="stat" href="#/m/reparto"><b>${d.entregado}</b><span>Entregados</span></a>
    <a class="stat" href="#/m/reparto"><b style="${d.incidencia ? 'color:var(--ko)' : ''}">${d.incidencia}</b><span>Incidencias</span></a>
    <a class="stat" href="#/m/whatsapp"><b>${EST.wa.abiertos}</b><span>Pedidos WhatsApp por revisar (${EST.wa.confirmados} confirmados)</span></a>
  </div>`
}
async function entrar(e) {
  e.preventDefault()
  const pw = $('#pw').value; if (!pw) return toast('Escriba la contraseña')
  const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Conectando…'
  try { await Nube.auth(pw); toast('Conectado. Reparto, WhatsApp y Comerciales ya quedan abiertos en este dispositivo.', 4000); await leerEstado() }
  catch (err) { toast(err.message === 'Contraseña incorrecta' ? 'Contraseña incorrecta' : 'Sin conexión. Inténtelo de nuevo.'); b.disabled = false; b.textContent = 'Conectar' }
}
function vistaSage() {
  cerrarModulo(); V.sage = true; dock()
  const s = semaforo()
  $('#main').innerHTML = `
    <h1>Conexión con Sage 50</h1>
    <div class="card sage"><span class="luz ${s.c}"></span><div style="flex:1;min-width:200px"><b>${h(s.t)}</b><div class="mut">${h(s.d)}</div></div>${Nube.token ? '<button class="btn sm sec" id="b-act">Actualizar</button><button class="btn sm sec" id="b-out">Desconectar</button>' : ''}</div>
    ${Nube.token ? '' : '<form id="f-in" class="form"><input id="pw" type="password" placeholder="Contraseña del equipo (la misma de Reparto)" autocomplete="current-password"><button class="btn">Conectar</button></form>'}
    <h2>Cómo está todo conectado</h2>
    <div class="esquema">
      <div class="c"><b>Sage 50 (oficina)</b>Base de datos maestra: artículos, clientes, albaranes, facturas</div><div class="f">→</div>
      <div class="c"><b>Conector</b>Programa en el ordenador de la oficina. Lee Sage cada 5 minutos, solo lectura</div><div class="f">→</div>
      <div class="c"><b>Base central</b>Una sola base de datos en la nube que usan todas las aplicaciones</div>
    </div>
    <div class="card"><b>Qué llega hoy desde Sage</b><ul>
      <li><b>Ya conectado:</b> Albaranes de venta con sus líneas, clientes y direcciones de envío → Reparto, Preparar pedidos y Comerciales.</li>
      <li><b>Ya conectado:</b> Artículos, precios PVP y códigos de barras (último listado exportado de Sage) → Guía, TPV, Web y este buscador.</li>
      <li><b>Siguiente paso:</b> stock y tarifas HORECA directos de Sage cada 5 minutos, con la misma conexión.</li>
    </ul>
    <b>Qué vuelve a Sage</b><ul><li>Nada se escribe solo en Sage 50: los pedidos de WhatsApp, comerciales y socios del Club se pasan a Sage desde la oficina (o con las plantillas de importación), como hasta ahora.</li></ul></div>
    <h2>Instalar el conector en el ordenador de Sage</h2>
    <div class="card"><ol>
      <li>El informático crea el usuario de solo lectura <b>reparto_lectura</b> en el SQL Server de Sage (instrucciones dentro del paquete).</li>
      <li>Descargar el paquete: <a class="btn sm" href="../reparto/conector-sage-reparto.zip" download>Descargar conector Sage</a></li>
      <li>Descomprimir en <b>C:\\ConectorSage</b>, rellenar <b>conector.ini</b> con las dos contraseñas y hacer doble clic en <b>Instalar sincronización automática</b>.</li>
      <li>En unos minutos el semáforo de arriba se pone en verde.</li>
    </ol></div>`
  if ($('#f-in')) $('#f-in').onsubmit = async (e) => { await entrar(e); vistaSage() }
  if ($('#b-act')) $('#b-act').onclick = async () => { await leerEstado(); vistaSage(); toast('Actualizado') }
  if ($('#b-out')) $('#b-out').onclick = () => { if (!confirm('¿Desconectar este dispositivo? También se cerrará la sesión de Reparto.')) return; Nube.token = null; localStorage.removeItem('tn-central-estado'); EST = null; pintarNube(); vistaSage() }
}

function ruta() {
  const hs = decodeURIComponent(location.hash || '#/')
  const m = hs.match(/^#\/m\/([a-z]+)\/?(.*)$/)
  if (m) return abrirModulo(m[1], m[2])
  if (hs.startsWith('#/sage')) return vistaSage()
  vistaInicio()
}
window.addEventListener('hashchange', ruta)
$('#nube').onclick = () => (location.hash = '#/sage')
ruta()
pintarNube()
leerEstado()
setInterval(() => { if (document.visibilityState === 'visible') leerEstado() }, 60000)
})()
