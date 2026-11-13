/* TN Central · Tierra Nuestra — un solo enlace para todas las aplicaciones, conectadas a la base central alimentada por Sage 50 */
(function () {
'use strict'
const VERSION = '1.1.0'
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
  equipo: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 7"/>',
  ia: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
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
  { id: 'tpv', p: 'tpv', g: 'venta', n: 'TPV tienda', d: 'Cobrar en tienda con lector, cámara y ticket', url: '../tpv/' },
  { id: 'guia', p: null, g: 'venta', n: 'Guía de vinos', d: 'Fichas, precios PVP y asistente para el mostrador', url: '../guia/' },
  { id: 'vinos', p: null, g: 'venta', n: 'Web de vinos', d: 'Tienda online para clientes', url: '../vinos/' },
  { id: 'club', p: 'ventas', g: 'venta', n: 'Club de Vinos', d: 'Altas de socios y exportación a Sage', url: '../club/' },
  { id: 'reparto', p: 'reparto', g: 'pedidos', n: 'Reparto y oficina', d: 'Albaranes de Sage, rutas, entregas y cobros', url: '../reparto/' },
  { id: 'whatsapp', p: 'ventas', g: 'pedidos', n: 'Pedidos WhatsApp', d: 'Pedidos del chatbot (en Reparto › Oficina › WhatsApp)', url: '../reparto/' },
  { id: 'comerciales', p: 'ventas', g: 'pedidos', n: 'Comerciales', d: 'Clientes, catálogo con tarifas y pedidos (perfil Comercial)', url: '../reparto/' },
  { id: 'ubicaciones', p: 'almacen', g: 'almacen', n: 'Ubicaciones', d: 'Dónde está cada vino: nicheros, almacén y nave', url: '../ubicaciones/' },
  { id: 'preparar', p: 'almacen', g: 'almacen', n: 'Preparar pedidos', d: 'Picking con lector y voz, bultos y carga (perfil Almacén)', url: '../reparto/' },
  { id: 'croquis', p: 'almacen', g: 'almacen', n: 'Croquis del almacén', d: 'Plano de zonas y estanterías', url: '../croquis/' },
  { id: 'horarios', p: null, g: 'equipo', n: 'Horarios y fichajes', d: 'Turnos, fichar entrada/salida y solicitudes', url: '../horarios/' },
  { id: 'redes', p: 'marketing', g: 'marketing', n: 'Redes sociales', d: 'Publicaciones e historias de la semana', url: '../redes/2026-11-s1/' },
]
// las tres entradas de Reparto son la misma app: se comparte un solo marco
const marcoDe = (m) => (m.url === '../reparto/' ? 'reparto' : m.id)
const MOD = Object.fromEntries(MODULOS.map((m) => [m.id, m]))
const ROLES = { gerente: 'Gerente', oficina: 'Oficina', comercial: 'Comercial', dependienta: 'Dependienta', almacen: 'Almacén', repartidor: 'Repartidor' }
const AREAS = [['ventas', 'Ventas y clientes'], ['compras', 'Compras'], ['cartera', 'Cartera de cobros y pagos'], ['tpv', 'TPV tienda'], ['almacen', 'Almacén y stock'], ['reparto', 'Reparto'], ['contabilidad', 'Contabilidad'], ['equipo', 'Equipo y horarios'], ['marketing', 'Web y redes'], ['ia', 'IA acompañante']]

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
  get perfil() { return LS.get('tn-central-perfil', null) },
  set perfil(p) { if (p) LS.set('tn-central-perfil', p); else localStorage.removeItem('tn-central-perfil') },
  async authUsuario(email, password) {
    const r = await fetch(SUPA.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: SUPA.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) })
    if (!r.ok) throw new Error('Correo o contraseña incorrectos')
    const t = await r.json(); t.exp = Date.now() + t.expires_in * 1000; this.token = t
    await this.cargarPerfil()
  },
  async cargarPerfil() {
    const uid = this.token?.user?.id
    if (!uid) { this.perfil = null; return null }
    const [p] = await this.api('tn_perfiles?select=nombre,rol,agente,activo&user_id=eq.' + uid)
    const perms = p ? await this.api('tn_permisos?select=modulo,ver,editar&rol=eq.' + p.rol) : []
    this.perfil = p && p.activo ? { ...p, email: this.token.user.email, perms } : { sinPuesto: true, email: this.token.user.email, perms: [] }
    return this.perfil
  },
  salir() { this.token = null; this.perfil = null; localStorage.removeItem('tn-central-estado') },
  async renovar() {
    const t = this.token
    if (!t) return false
    if (Date.now() < t.exp - 60000) return true
    const r = await fetch(SUPA.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SUPA.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: t.refresh_token }) }).catch(() => null)
    if (!r) throw new Error('sin conexión')
    if (!r.ok) { this.token = null; return false }
    const n = await r.json(); n.exp = Date.now() + n.expires_in * 1000; this.token = n; return true
  },
  async api(path, metodo = 'GET', datos) {
    if (!(await this.renovar())) throw new Error('sin sesión')
    const r = await fetch(SUPA.url + '/rest/v1/' + path, { method: metodo, headers: { apikey: SUPA.key, Authorization: 'Bearer ' + this.token.access_token, 'Content-Type': 'application/json', Prefer: 'return=minimal' + (path.includes('on_conflict=') ? ',resolution=merge-duplicates' : '') }, body: datos === undefined ? undefined : JSON.stringify(datos) })
    if (!r.ok) throw new Error(await r.text())
    return r.status === 204 || r.status === 201 ? null : r.json()
  },
  async fn(nombre, datos) {
    if (!(await this.renovar())) throw new Error('sin sesión')
    const r = await fetch(SUPA.url + '/functions/v1/' + nombre, { method: 'POST', headers: { apikey: SUPA.key, Authorization: 'Bearer ' + this.token.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Error ' + r.status)
    return d
  },
  async cambiarClave(password) {
    if (!(await this.renovar())) throw new Error('sin sesión')
    const r = await fetch(SUPA.url + '/auth/v1/user', { method: 'PUT', headers: { apikey: SUPA.key, Authorization: 'Bearer ' + this.token.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).msg || 'No se pudo cambiar')
  },
}
// permisos: sin perfil personal (contraseña del equipo) se mantiene el acceso de siempre
const P = {
  get personal() { return !!Nube.perfil && !Nube.perfil.sinPuesto },
  get gerente() { return Nube.perfil?.rol === 'gerente' },
  ve(area) { const p = Nube.perfil; if (!p) return true; if (p.sinPuesto) return false; return p.rol === 'gerente' || p.perms.some((x) => x.modulo === area && x.ver) },
  app(m) { const p = Nube.perfil; if (!p) return true; if (p.sinPuesto) return false; return !m.p || this.ve(m.p) },
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
  const rec2 = rec.filter((id) => P.app(MOD[id]))
  const it = [['#/', 'inicio', 'Inicio', !V.mod && !V.sage && !V.vista], ['#/sage', 'sage', 'Sage 50', V.sage]]
    .concat(P.gerente ? [['#/equipo', 'equipo', 'Equipo', V.vista === 'equipo']] : [])
    .concat(rec2.map((id) => ['#/m/' + id, id, MOD[id].n.split(' ')[0], V.mod?.id === id]))
  $('#dock').innerHTML = it.map(([href, e, t, on]) => `<a href="${href}" class="${on ? 'on' : ''}">${SVG(e)}${h(t)}</a>`).join('')
}
function abrirModulo(id, sub) {
  const m = MOD[id]; if (!m) return (location.hash = '#/')
  if (!P.app(m)) { toast('Su puesto no tiene acceso a ' + m.n); return (location.hash = '#/') }
  V.mod = m; V.sage = false; V.vista = null
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
  cerrarModulo(); V.sage = false; V.vista = null; dock()
  const hora = new Date().getHours(), saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'
  $('#main').innerHTML = `
    <h1>${saludo}${P.personal ? ', ' + h(Nube.perfil.nombre.split(' ')[0]) : ''}</h1>
    <div class="mut">${P.personal ? 'Puesto: <b>' + h(ROLES[Nube.perfil.rol] || Nube.perfil.rol) + '</b> · <a href="#/cuenta">Mi cuenta</a>' : 'Todas las aplicaciones de Tierra Nuestra en un solo sitio, con los datos de Sage 50.'}</div>
    ${Nube.perfil?.sinPuesto ? '<div class="card" style="margin-top:12px"><b>Su usuario aún no tiene puesto asignado.</b><div class="mut">Pida al gerente que se lo asigne en «Equipo». <a href="#/cuenta">Mi cuenta</a></div></div>' : ''}
    <div class="busca"><input id="q" type="search" placeholder="Buscar vino o artículo: nombre, código de Sage o código de barras" autocomplete="off" enterkeyhint="search"></div>
    <div id="res" class="res"></div>
    <div id="estado"></div>
    ${GRUPOS.map(([g, t]) => [t, MODULOS.filter((m) => m.g === g && P.app(m))]).filter(([, l]) => l.length).map(([t, l]) => `<h2>${t}</h2><div class="grid">${l.map((m) => `<a class="mod" href="#/m/${m.id}" data-mod="${m.id}"><div class="e">${SVG(m.id)}</div><b>${h(m.n)}</b><span>${h(m.d)}</span></a>`).join('')}</div>`).join('')}
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
    el.innerHTML = cab.replace('<a class="btn sm sec" href="#/sage">Ver conexión</a>', '') + `<form id="f-in" class="form"><input id="em" type="email" placeholder="Su correo (si tiene usuario propio)" autocomplete="username"><input id="pw" type="password" placeholder="Contraseña (o la del equipo de Reparto)" autocomplete="current-password"><button class="btn">Entrar</button></form>`
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
  const pw = $('#pw').value, em = ($('#em')?.value || '').trim(); if (!pw) return toast('Escriba la contraseña')
  const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Entrando…'
  try {
    if (em) { await Nube.authUsuario(em, pw); toast(Nube.perfil.sinPuesto ? 'Ha entrado, pero aún no tiene puesto asignado.' : 'Hola, ' + Nube.perfil.nombre.split(' ')[0], 3000) }
    else { await Nube.auth(pw); Nube.perfil = null; toast('Conectado. Reparto, WhatsApp y Comerciales ya quedan abiertos en este dispositivo.', 4000) }
    pintarUsuario(); await leerEstado(); if (location.hash === '#/' || !location.hash) vistaInicio()
  } catch (err) { toast(/incorrect/.test(err.message) ? err.message : 'Sin conexión. Inténtelo de nuevo.'); b.disabled = false; b.textContent = 'Entrar' }
}
function vistaSage() {
  cerrarModulo(); V.sage = true; dock()
  const s = semaforo()
  $('#main').innerHTML = `
    <h1>Conexión con Sage 50</h1>
    <div class="card sage"><span class="luz ${s.c}"></span><div style="flex:1;min-width:200px"><b>${h(s.t)}</b><div class="mut">${h(s.d)}</div></div>${Nube.token ? '<button class="btn sm sec" id="b-act">Actualizar</button><button class="btn sm sec" id="b-out">Desconectar</button>' : ''}</div>
    ${Nube.token ? '' : '<form id="f-in" class="form"><input id="em" type="email" placeholder="Su correo (si tiene usuario propio)" autocomplete="username"><input id="pw" type="password" placeholder="Contraseña (o la del equipo de Reparto)" autocomplete="current-password"><button class="btn">Entrar</button></form>'}
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
  if ($('#b-out')) $('#b-out').onclick = () => { if (!confirm('¿Desconectar este dispositivo? También se cerrará la sesión de Reparto.')) return; Nube.salir(); EST = null; pintarNube(); pintarUsuario(); vistaSage() }
}

// ---------- usuario, equipo y permisos ----------
function pintarUsuario() {
  const b = $('#b-ia'); if (b) b.hidden = !(P.personal && P.ve('ia'))
  if (!b || b.hidden) $('#ia').hidden = true
}
function vistaCuenta() {
  cerrarModulo(); V.sage = false; V.vista = 'cuenta'; dock()
  const p = Nube.perfil
  if (!p) { location.hash = '#/'; return }
  $('#main').innerHTML = `<h1>Mi cuenta</h1>
    <div class="card"><b>${h(p.nombre || p.email)}</b><div class="mut">${h(p.email)} · ${p.sinPuesto ? 'sin puesto asignado' : 'Puesto: ' + h(ROLES[p.rol] || p.rol)}</div></div>
    <h2>Cambiar mi contraseña</h2>
    <form id="f-clave" class="form"><input id="c1" type="password" placeholder="Nueva contraseña (mínimo 8)" autocomplete="new-password"><input id="c2" type="password" placeholder="Repita la contraseña" autocomplete="new-password"><button class="btn">Guardar</button></form>
    <p><button class="btn sec" id="b-salir">Salir de mi usuario en este dispositivo</button></p>`
  $('#f-clave').onsubmit = async (e) => {
    e.preventDefault(); const a = $('#c1').value, b2 = $('#c2').value
    if (a.length < 8) return toast('Mínimo 8 caracteres'); if (a !== b2) return toast('Las dos contraseñas no coinciden')
    try { await Nube.cambiarClave(a); toast('Contraseña cambiada'); e.target.reset() } catch (err) { toast(err.message) }
  }
  $('#b-salir').onclick = () => { Nube.salir(); EST = null; pintarNube(); pintarUsuario(); location.hash = '#/' }
}
async function vistaEquipo() {
  cerrarModulo(); V.sage = false; V.vista = 'equipo'; dock()
  if (!P.gerente) { $('#main').innerHTML = '<h1>Equipo</h1><div class="card">Solo el gerente puede gestionar usuarios y permisos.</div>'; return }
  $('#main').innerHTML = '<h1>Equipo y permisos</h1><div class="mut">Cargando…</div>'
  let us = [], perms = []
  try { [{ usuarios: us }, perms] = await Promise.all([Nube.fn('tn-usuarios', { accion: 'listar' }), Nube.api('tn_permisos?select=rol,modulo,ver,editar')]) }
  catch (e) { $('#main').innerHTML = '<h1>Equipo y permisos</h1><div class="card">No se pudo cargar: ' + h(e.message) + '</div>'; return }
  const opRol = (sel) => Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v}</option>`).join('')
  const tiene = (rol, mod, campo) => perms.some((x) => x.rol === rol && x.modulo === mod && x[campo])
  const rolesEmp = Object.keys(ROLES).filter((r) => r !== 'gerente')
  $('#main').innerHTML = `<h1>Equipo y permisos</h1>
    <div class="mut">Cada persona entra con su correo y su contraseña. Ve solo lo que permite su puesto; la protección está en la base de datos, no solo en la pantalla.</div>
    <h2>Personas</h2>
    <div class="tabla"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Puesto</th><th>Agente Sage</th><th>Último acceso</th><th></th></tr></thead><tbody>
    ${us.map((u) => `<tr data-id="${h(u.user_id)}" class="${u.activo ? '' : 'baja'}"><td>${h(u.nombre)}</td><td>${h(u.email || '')}</td>
      <td><select class="u-rol">${opRol(u.rol)}</select></td><td><input class="u-ag" value="${h(u.agente || '')}" placeholder="—" size="5"></td>
      <td class="mut">${u.ultimo ? new Date(u.ultimo).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca'}</td>
      <td class="acc"><button class="btn sm sec u-clave">Nueva contraseña</button><button class="btn sm sec u-act">${u.activo ? 'Dar de baja' : 'Reactivar'}</button></td></tr>`).join('') || '<tr><td colspan="6" class="mut">Todavía no hay nadie.</td></tr>'}
    </tbody></table></div>
    <h2>Añadir persona</h2>
    <form id="f-alta" class="form"><input id="a-nom" placeholder="Nombre y apellido"><input id="a-em" type="email" placeholder="Correo"><select id="a-rol">${opRol('dependienta')}</select><input id="a-ag" placeholder="Agente en Sage (solo comerciales)"><button class="btn">Crear usuario</button></form>
    <div id="alta-ok"></div>
    <h2>Qué ve cada puesto</h2>
    <div class="mut">El gerente lo ve y lo cambia todo. Marque «Ver» o «Cambiar» para el resto de puestos.</div>
    <div class="tabla"><table class="perm"><thead><tr><th>Área</th>${rolesEmp.map((r) => `<th>${ROLES[r]}</th>`).join('')}</tr></thead><tbody>
    ${AREAS.map(([m, t]) => `<tr><td>${t}</td>${rolesEmp.map((r) => `<td><label><input type="checkbox" data-r="${r}" data-m="${m}" data-c="ver" ${tiene(r, m, 'ver') ? 'checked' : ''}> Ver</label><label><input type="checkbox" data-r="${r}" data-m="${m}" data-c="editar" ${tiene(r, m, 'editar') ? 'checked' : ''}> Cambiar</label></td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`
  const cambiar = async (id, datos) => { try { await Nube.fn('tn-usuarios', { accion: 'cambiar', user_id: id, ...datos }); toast('Guardado') } catch (e) { toast(e.message); vistaEquipo() } }
  $$('tr[data-id]').forEach((tr) => {
    const id = tr.dataset.id
    $('.u-rol', tr).onchange = (e) => cambiar(id, { rol: e.target.value })
    $('.u-ag', tr).onchange = (e) => cambiar(id, { agente: e.target.value.trim() })
    $('.u-act', tr).onclick = async () => { const baja = !tr.classList.contains('baja'); if (baja && !confirm('¿Dar de baja a esta persona? No podrá entrar.')) return; await cambiar(id, { activo: !baja }); vistaEquipo() }
    $('.u-clave', tr).onclick = async () => {
      if (!confirm('¿Crear una contraseña nueva para esta persona? La anterior dejará de valer.')) return
      try { const r = await Nube.fn('tn-usuarios', { accion: 'clave', user_id: id }); mostrarClave(tr.children[1].textContent, r.clave) } catch (e) { toast(e.message) }
    }
  })
  $('#f-alta').onsubmit = async (e) => {
    e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true
    try { const r = await Nube.fn('tn-usuarios', { accion: 'crear', nombre: $('#a-nom').value, email: $('#a-em').value, rol: $('#a-rol').value, agente: $('#a-ag').value.trim() }); await vistaEquipo(); mostrarClave(r.email, r.clave) }
    catch (err) { toast(err.message); b.disabled = false }
  }
  $$('.perm input').forEach((c) => (c.onchange = async () => {
    const { r, m } = c.dataset, fila = (cc) => $(`.perm input[data-r="${r}"][data-m="${m}"][data-c="${cc}"]`)
    if (c.dataset.c === 'editar' && c.checked) fila('ver').checked = true
    if (c.dataset.c === 'ver' && !c.checked) fila('editar').checked = false
    const ver = fila('ver').checked, editar = fila('editar').checked
    try {
      if (!ver) await Nube.api(`tn_permisos?rol=eq.${r}&modulo=eq.${m}`, 'DELETE')
      else await Nube.api('tn_permisos?on_conflict=rol,modulo', 'POST', { rol: r, modulo: m, ver, editar })
      toast('Permiso guardado')
    } catch (e) { toast('No se pudo guardar: ' + e.message) }
  }))
}
function mostrarClave(email, clave) {
  $('#alta-ok').innerHTML = `<div class="card ok"><b>Usuario listo</b><div>Entra en este enlace con su correo <b>${h(email)}</b> y esta contraseña provisional:</div>
    <div class="clave">${h(clave)}</div><div class="mut">Désela en persona o por WhatsApp; no se volverá a mostrar. Al entrar, que la cambie en «Mi cuenta».</div></div>`
  $('#alta-ok').scrollIntoView({ behavior: 'smooth' })
}

// ---------- IA acompañante ----------
const IA = { hist: [] }
function abrirIA() {
  const el = $('#ia'); el.hidden = !el.hidden; if (el.hidden) return
  if (!el.dataset.ok) {
    el.dataset.ok = 1
    el.innerHTML = `<div class="ia-cab"><b>${SVG('ia')} Asistente</b><button class="ico" id="ia-x" aria-label="Cerrar">✕</button></div>
      <div id="ia-log" class="ia-log"><div class="msg a">Pregúnteme por pedidos pendientes, cartera de cobros, compras por llegar, stock o reparto. Solo le enseño lo que su puesto puede ver y no cambio nada.</div>
      <div class="ia-sug">${['¿Quién me debe dinero?', '¿Qué pedidos de venta faltan por servir?', '¿Qué pedidos de compra faltan por llegar?', '¿Qué falta por reponer?', '¿Cómo va el reparto hoy?'].map((t) => `<button class="btn sm sec">${t}</button>`).join('')}</div></div>
      <form id="ia-f" class="ia-f"><input id="ia-q" placeholder="Escriba su pregunta…" autocomplete="off"><button class="btn">Enviar</button></form>`
    $('#ia-x').onclick = () => (el.hidden = true)
    $$('.ia-sug button', el).forEach((b) => (b.onclick = () => preguntar(b.textContent)))
    $('#ia-f').onsubmit = (e) => { e.preventDefault(); preguntar($('#ia-q').value) }
  }
  $('#ia-q').focus()
}
async function preguntar(q) {
  q = String(q || '').trim(); if (!q) return
  const log = $('#ia-log'), inp = $('#ia-q'); inp.value = ''
  log.insertAdjacentHTML('beforeend', `<div class="msg u">${h(q)}</div><div class="msg a esp">Consultando…</div>`); log.scrollTop = log.scrollHeight
  const esp = log.lastElementChild
  try {
    const r = await Nube.fn('tn-copiloto', { pregunta: q, historial: IA.hist })
    IA.hist.push({ role: 'user', content: q }, { role: 'assistant', content: r.respuesta }); IA.hist = IA.hist.slice(-12)
    esp.classList.remove('esp'); esp.innerHTML = h(r.respuesta).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')
  } catch (e) { esp.classList.remove('esp'); esp.textContent = 'No he podido responder: ' + e.message }
  log.scrollTop = log.scrollHeight
}

function ruta() {
  const hs = decodeURIComponent(location.hash || '#/')
  const m = hs.match(/^#\/m\/([a-z]+)\/?(.*)$/)
  if (m) return abrirModulo(m[1], m[2])
  if (hs.startsWith('#/sage')) return vistaSage()
  if (hs.startsWith('#/equipo')) return vistaEquipo()
  if (hs.startsWith('#/cuenta')) return vistaCuenta()
  vistaInicio()
}
window.addEventListener('hashchange', ruta)
$('#nube').onclick = () => (location.hash = '#/sage')
$('#b-ia').onclick = abrirIA
ruta()
pintarNube()
pintarUsuario()
if (Nube.token?.user && Nube.perfil) Nube.cargarPerfil().then(() => { pintarUsuario(); if (!V.mod) ruta() }).catch(() => {})
leerEstado()
setInterval(() => { if (document.visibilityState === 'visible') leerEstado() }, 60000)
})()
