/* TN Central · Tierra Nuestra — un solo enlace para todas las aplicaciones, conectadas a la base central alimentada por Sage 50 */
(function () {
'use strict'
const VERSION = '1.2.0'
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
  ventas: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  compras: '<path d="M1 3h4l2.7 12.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L21 7H6"/><path d="M12 9v4M10 11h4"/>',
  cartera: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2M6 6V4h12v2"/>',
  clientes: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  precios: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
  inicio: '<path d="M3 11 12 3l9 8M5 10v10h14V10"/>',
  sage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  equipo: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 7"/>',
  ia: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  vino: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
}
const GRUPOS = [
  ['gestion', 'Gestión · datos de Sage'],
  ['venta', 'Tienda y venta'],
  ['pedidos', 'Pedidos, clientes y reparto'],
  ['almacen', 'Almacén'],
  ['equipo', 'Equipo'],
  ['marketing', 'Marketing'],
]
const MODULOS = [
  { id: 'ventas', c: 'Ventas', p: 'ventas', g: 'gestion', v: 1, n: 'Pedidos de venta', d: 'Pendientes de servir, por cliente, vendedor y fecha' },
  { id: 'compras', c: 'Compras', p: 'compras', g: 'gestion', v: 1, n: 'Pedidos de compra', d: 'Lo que falta por llegar de los proveedores' },
  { id: 'cartera', c: 'Cartera', p: 'cartera', g: 'gestion', v: 1, n: 'Cartera', d: 'Cobros y pagos pendientes, vencidos y antiguos' },
  { id: 'clientes', c: 'Clientes', p: 'ventas', g: 'gestion', v: 1, n: 'Clientes', d: 'Fichas de Sage por vendedor, ruta y tarifa' },
  { id: 'precios', c: 'Precios', p: 'almacen', g: 'gestion', v: 1, n: 'Precios y stock', d: 'Tarifas, stock de tienda y nave, y lotes' },
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
const enlace = (m) => (m.v ? '#/v/' : '#/m/') + m.id
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
  async lista(path, desde = 0, n = 100) {
    if (!(await this.renovar())) throw new Error('sin sesión')
    const r = await fetch(SUPA.url + '/rest/v1/' + path, { headers: { apikey: SUPA.key, Authorization: 'Bearer ' + this.token.access_token, Prefer: 'count=exact', 'Range-Unit': 'items', Range: `${desde}-${desde + n - 1}` } })
    if (!r.ok && r.status !== 416) throw new Error(await r.text())
    return { filas: r.status === 416 ? [] : await r.json(), total: +(r.headers.get('content-range') || '').split('/')[1] || 0 }
  },
  async todas(path) {
    const out = []
    for (let i = 0; i < 20000; i += 1000) { const { filas } = await this.lista(path, i, 1000); out.push(...filas); if (filas.length < 1000) break }
    return out
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
    .concat(rec2.map((id) => [enlace(MOD[id]), id, MOD[id].c || MOD[id].n.split(' ')[0], V.mod?.id === id || V.vista === id]))
  $('#dock').innerHTML = it.map(([href, e, t, on]) => `<a href="${href}" class="${on ? 'on' : ''}">${SVG(e)}${h(t)}</a>`).join('')
}
function abrirModulo(id, sub) {
  const m = MOD[id]; if (!m) return (location.hash = '#/')
  if (m.v) return (location.hash = enlace(m))
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
    ${GRUPOS.map(([g, t]) => [t, MODULOS.filter((m) => m.g === g && P.app(m))]).filter(([, l]) => l.length).map(([t, l]) => `<h2>${t}</h2><div class="grid">${l.map((m) => `<a class="mod" href="${enlace(m)}" data-mod="${m.id}"><div class="e">${SVG(m.id)}</div><b>${h(m.n)}</b><span>${h(m.d)}</span></a>`).join('')}</div>`).join('')}
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
      <div class="c"><b>Conector</b>Programa en el ordenador de la oficina. Lee Sage cada 10 minutos, solo lectura</div><div class="f">→</div>
      <div class="c"><b>Base central</b>Una sola base de datos en la nube que usan todas las aplicaciones</div>
    </div>
    <div class="card"><b>Qué llega hoy desde Sage</b><ul>
      <li><b>Cada 10 minutos:</b> artículos, PVP (tarifa 01) y tarifas, stock de tienda y nave, clientes, pedidos de venta pendientes, pedidos de compra por recibir, cobros y pagos pendientes, lotes y maestros (vendedores, familias, rutas).</li>
      <li><b>Dónde se ve:</b> Gestión (pedidos, cartera, clientes, precios y stock), la IA, Reparto, Preparar pedidos y Comerciales. Cada puesto ve solo lo suyo.</li>
    </ul>
    <b>Qué vuelve a Sage</b><ul><li>Nada se escribe solo en Sage 50: los pedidos de WhatsApp, comerciales y socios del Club se pasan a Sage desde la oficina (o con las plantillas de importación), como hasta ahora.</li></ul></div>
    <h2>Conector instalado</h2>
    <div class="card">El conector está en el servidor de Sage (<b>C:\\TN\\Conector</b>) y lo lanza Windows cada 10 minutos con la tarea «Tierra Nuestra - Conector Sage». Entra en Sage con un usuario que <b>solo puede leer</b>. Si el semáforo se pone en rojo, compruebe que el servidor está encendido.</div>`
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

// ---------- gestión: listados de Sage con filtros (la seguridad la pone la base de datos) ----------
let MAE = null
async function cargarMaestros() {
  if (MAE) return MAE
  const l = await Nube.api('sage_maestros?select=tipo,cod,nombre')
  MAE = {}; l.forEach((x) => ((MAE[x.tipo] = MAE[x.tipo] || {})[x.cod] = x.nombre || x.cod))
  return MAE
}
const nomM = (t, c) => (c ? MAE?.[t]?.[c] || c : '')
const opcM = (t, filtro = () => true) => Object.entries(MAE?.[t] || {}).filter(([c, n]) => filtro(c, n) && !/no usar/i.test(n)).sort((a, b) => a[0].localeCompare(b[0])).map(([c, n]) => [c, c + ' · ' + n])
const fec = (d) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '')
const limpio = (t) => String(t || '').replace(/[,()*%"\\:.]/g, ' ').trim().split(/\s+/).filter(Boolean).join('*')
const qOr = (cols, t) => (limpio(t) ? `&or=(${cols.map((c) => `${c}.ilike.*${encodeURIComponent(limpio(t))}*`).join(',')})` : '')
const eq = (c, v) => (v ? `&${c}=eq.${encodeURIComponent(v)}` : '')
const dias = (d) => Math.floor((Date.now() - new Date(d)) / 864e5)
const oficina = () => ['gerente', 'oficina'].includes(Nube.perfil?.rol)
const ORDEN = [['recientes', 'Más recientes primero'], ['antiguos', 'Más antiguos primero'], ['importe', 'Mayor importe primero']]
const lineasHTML = (r) => `<table><tr><th>Artículo</th><th>Descripción</th><th>Uds.</th><th>Servidas</th><th>Precio</th><th>Importe</th></tr>${(r.lineas || []).map((l) => `<tr><td>${h(l.art || '')}</td><td>${h(l.nombre)}</td><td>${+l.uds || ''}</td><td>${+l.servidas || ''}</td><td>${l.precio ? eur(l.precio) : ''}</td><td>${l.importe ? eur(l.importe) : ''}</td></tr>`).join('')}</table>${r.ref ? '<div class="mut">Ref.: ' + h(r.ref) + '</div>' : ''}`
const stat = (n, t) => `<div class="stat"><b>${n}</b><span>${t}</span></div>`

const DATOS = {
  ventas: {
    filtros: () => [['q', 'q', 'Cliente, código o nº de pedido'], oficina() && ['agente', 'sel', 'Todos los vendedores', opcM('vendedor')], ['estado', 'sel', 'Todos los pendientes', [['pendiente', 'Sin servir nada'], ['parcial', 'Servido en parte']]], ['desde', 'fecha', 'Desde'], ['hasta', 'fecha', 'Hasta'], ['orden', 'sel', null, ORDEN]],
    def: { orden: 'antiguos' },
    path: (f) => 'sage_documentos?tipo=eq.pedido_venta' + qOr(['tercero_nombre', 'tercero', 'numero', 'ref'], f.q) + eq('agente', f.agente) + eq('estado', f.estado) + (f.desde ? '&fecha=gte.' + f.desde : '') + (f.hasta ? '&fecha=lte.' + f.hasta : ''),
    sel: 'id,numero,fecha,entrega,tercero,tercero_nombre,agente,total,estado,lineas,ref',
    ord: (f) => (f.orden === 'importe' ? 'total.desc' : f.orden === 'recientes' ? 'fecha.desc,numero.desc' : 'fecha.asc,numero.asc'),
    resumen: (l) => stat(l.length, 'pedidos pendientes') + stat(eur(l.reduce((s, r) => s + +r.total, 0)), 'importe total') + stat(l.filter((r) => r.estado === 'parcial').length, 'servidos en parte') + stat(l.filter((r) => dias(r.fecha) > 30).length, 'con más de 30 días'),
    cab: ['Pedido', 'Fecha', 'Entrega', 'Cliente', 'Vendedor', 'Importe', 'Estado'],
    fila: (r) => [h(r.numero), fec(r.fecha), fec(r.entrega), `<b>${h(r.tercero_nombre)}</b><div class="mut">${h(r.tercero)}</div>`, h(nomM('vendedor', r.agente)), `<b>${eur(r.total)}</b>`, r.estado === 'parcial' ? '<span class="tag warn">En parte</span>' : '<span class="tag">Pendiente</span>'],
    detalle: lineasHTML,
  },
  compras: {
    filtros: () => [['q', 'q', 'Proveedor, código o nº de pedido'], ['desde', 'fecha', 'Desde'], ['hasta', 'fecha', 'Hasta'], ['orden', 'sel', null, ORDEN]],
    def: { orden: 'antiguos' },
    path: (f) => 'sage_documentos?tipo=eq.pedido_compra' + qOr(['tercero_nombre', 'tercero', 'numero', 'ref'], f.q) + (f.desde ? '&fecha=gte.' + f.desde : '') + (f.hasta ? '&fecha=lte.' + f.hasta : ''),
    sel: 'id,numero,fecha,entrega,tercero,tercero_nombre,total,estado,lineas,ref',
    ord: (f) => (f.orden === 'importe' ? 'total.desc' : f.orden === 'recientes' ? 'fecha.desc,numero.desc' : 'fecha.asc,numero.asc'),
    resumen: (l) => stat(l.length, 'pedidos por recibir') + stat(eur(l.reduce((s, r) => s + +r.total, 0)), 'importe total') + stat(l.filter((r) => dias(r.fecha) > 15).length, 'con más de 15 días'),
    cab: ['Pedido', 'Fecha', 'Entrega', 'Proveedor', 'Importe', 'Líneas'],
    fila: (r) => [h(r.numero), fec(r.fecha), fec(r.entrega), `<b>${h(r.tercero_nombre)}</b><div class="mut">${h(r.tercero)}</div>`, `<b>${eur(r.total)}</b>`, (r.lineas || []).length],
    detalle: lineasHTML,
  },
  cartera: {
    filtros: () => [oficina() && ['tipo', 'sel', null, [['cobro', 'Cobros (nos deben)'], ['pago', 'Pagos (debemos)']]], ['q', 'q', 'Cliente/proveedor, código o documento'], oficina() && ['agente', 'sel', 'Todos los vendedores', opcM('vendedor')], ['sit', 'sel', 'Todo lo pendiente', [['vencido', 'Solo vencido'], ['vence', 'Por vencer'], ['antiguo', 'Más de 2 años']]], ['desde', 'fecha', 'Vence desde'], ['hasta', 'fecha', 'Vence hasta'], ['orden', 'sel', null, [['antiguos', 'Vencimiento más antiguo'], ['recientes', 'Vencimiento más reciente'], ['importe', 'Mayor importe']]]],
    def: { tipo: 'cobro', orden: 'antiguos' },
    path: (f) => {
      const hoyS = hoy(), ant = new Date(Date.now() - 730 * 864e5).toLocaleDateString('sv-SE')
      return 'sage_cartera?pendiente=neq.0&tipo=eq.' + (oficina() ? f.tipo || 'cobro' : 'cobro') + qOr(['tercero_nombre', 'tercero', 'documento'], f.q) + (f.tipo !== 'pago' ? eq('agente', f.agente) : '') +
        (f.sit === 'vencido' ? '&vencimiento=lt.' + hoyS : f.sit === 'vence' ? '&vencimiento=gte.' + hoyS : f.sit === 'antiguo' ? '&vencimiento=lt.' + ant : '') + (f.desde ? '&vencimiento=gte.' + f.desde : '') + (f.hasta ? '&vencimiento=lte.' + f.hasta : '')
    },
    sel: 'id,tipo,tercero,tercero_nombre,agente,documento,vencimiento,importe,pendiente',
    ord: (f) => (f.orden === 'importe' ? 'pendiente.desc' : f.orden === 'recientes' ? 'vencimiento.desc' : 'vencimiento.asc'),
    resumen: (l) => { const s = (x) => eur(x.reduce((a, r) => a + +r.pendiente, 0)), v = l.filter((r) => r.vencimiento < hoy()); return stat(s(l), l.length + ' recibos pendientes') + stat(s(v), v.length + ' vencidos') + stat(s(l.filter((r) => r.vencimiento >= hoy())), 'por vencer') + stat(s(l.filter((r) => dias(r.vencimiento) > 730)), 'con más de 2 años') },
    cab: ['Vencimiento', 'Cliente / proveedor', 'Documento', 'Vendedor', 'Importe', 'Pendiente'],
    fila: (r) => [`${fec(r.vencimiento)}${r.vencimiento < hoy() ? `<div class="mut ko">vencido hace ${dias(r.vencimiento)} días</div>` : ''}`, `<b>${h(r.tercero_nombre)}</b><div class="mut">${h(r.tercero)}</div>`, h(r.documento), h(nomM('vendedor', r.agente)), eur(r.importe), `<b>${eur(r.pendiente)}</b>`],
  },
  clientes: {
    filtros: () => [['q', 'q', 'Nombre, código, NIF, población o teléfono'], oficina() && ['agente', 'sel', 'Todos los vendedores', opcM('vendedor')], ['ruta', 'sel', 'Todas las rutas', opcM('ruta')], ['tarifa', 'sel', 'Todas las tarifas', opcM('tarifa')]],
    def: {},
    path: (f) => 'sage_clientes?cod=neq.' + qOr(['nombre', 'cod', 'nif', 'poblacion', 'telefono'], f.q) + eq('agente', f.agente) + eq('ruta', f.ruta) + eq('tarifa', f.tarifa),
    sel: 'cod,nombre,nif,poblacion,telefono,tarifa,agente,ruta', resSel: 'cod',
    ord: () => 'nombre.asc',
    resumen: (l) => stat(l.length, 'clientes'),
    cab: ['Código', 'Cliente', 'Población', 'Teléfono', 'Tarifa', 'Vendedor', 'Ruta'],
    fila: (r) => [h(r.cod), `<b>${h(r.nombre)}</b><div class="mut">${h(r.nif)}</div>`, h(r.poblacion), r.telefono ? `<a href="tel:${h(r.telefono.replace(/\s/g, ''))}">${h(r.telefono)}</a>` : '', h(r.tarifa), h(nomM('vendedor', r.agente)), h(nomM('ruta', r.ruta))],
    detalle: async (r) => {
      const [ped, car] = await Promise.all([Nube.api('sage_documentos?select=numero,fecha,total,estado&tipo=eq.pedido_venta&tercero=eq.' + encodeURIComponent(r.cod) + '&order=fecha'), P.ve('cartera') ? Nube.api('sage_cartera?select=documento,vencimiento,pendiente&tipo=eq.cobro&pendiente=neq.0&tercero=eq.' + encodeURIComponent(r.cod) + '&order=vencimiento') : null])
      return `<b>Pedidos pendientes:</b> ${ped.length ? ped.map((p) => `nº ${h(p.numero)} del ${fec(p.fecha)} (${eur(p.total)})`).join(' · ') : 'ninguno'}` +
        (car ? `<br><b>Le debe:</b> ${car.length ? eur(car.reduce((s, x) => s + +x.pendiente, 0)) + ' en ' + car.length + ' recibos' + (car.some((x) => x.vencimiento < hoy()) ? `, vencido ${eur(car.filter((x) => x.vencimiento < hoy()).reduce((s, x) => s + +x.pendiente, 0))}` : '') : 'nada'}` : '')
    },
  },
  precios: {
    filtros: () => [['q', 'q', 'Vino o artículo: nombre, código o código de barras'], ['familia', 'sel', 'Todas las familias', opcM('familia')], ['stock', 'sel', 'Con y sin stock', [['si', 'Solo con stock']]]],
    def: {},
    path: (f) => 'sage_articulos?baja=is.false' + qOr(['nombre', 'cod', 'ean'], f.q) + eq('familia', f.familia),
    sel: 'cod,nombre,familia,pvp,ean,ubicacion', resSel: 'cod',
    ord: () => 'nombre.asc',
    resumen: (l) => stat(l.length, 'artículos'),
    extra: async (filas, f) => {
      if (!filas.length) return filas
      const inn = 'cod=in.(' + filas.map((r) => `"${encodeURIComponent(r.cod)}"`).join(',') + ')'
      const [tar, sto] = await Promise.all([Nube.api('sage_tarifas?select=cod,tarifa,precio&precio=gt.0&' + inn), Nube.api('sage_stock?select=cod,almacen,stock&' + inn)])
      filas.forEach((r) => { r.tar = {}; r.sto = {} })
      const ix = Object.fromEntries(filas.map((r) => [r.cod, r]))
      tar.forEach((t) => (ix[t.cod].tar[t.tarifa] = t)); sto.forEach((s) => (ix[s.cod].sto[s.almacen] = +s.stock))
      DATOS.precios.tarifas = [...new Set(tar.map((t) => t.tarifa))].sort()
      return f.stock === 'si' ? filas.filter((r) => Object.values(r.sto).some((s) => s > 0)) : filas
    },
    cabF: () => ['Código', 'Artículo', ...DATOS.precios.tarifas.map((t) => `<span title="${h(nomM('tarifa', t))}">Tarifa ${+t}${/S(IN)?\/IVA/i.test(nomM('tarifa', t)) ? '<div class="mut">sin IVA</div>' : ''}</span>`), 'Tienda', 'Nave'],
    fila: (r) => [h(r.cod), `<b>${h(r.nombre)}</b><div class="mut">${h(nomM('familia', r.familia))}${r.ubicacion ? ' · ' + h(r.ubicacion) : ''}</div>`, ...DATOS.precios.tarifas.map((t) => { const x = r.tar[t]; return x && +x.precio ? eur(x.precio) : '' }), stockTd(r.sto['00']), stockTd(r.sto['01'])],
    detalle: async (r) => {
      const l = await Nube.api('sage_lotes?select=almacen,lote,ubica,caducidad,unidades&unidades=gt.0&cod=eq.' + encodeURIComponent(r.cod) + '&order=lote')
      return `${r.ean ? 'Código de barras: ' + h(r.ean) + '<br>' : ''}<b>Lotes:</b> ${l.length ? l.map((x) => `${h(x.lote)} (${+x.unidades} uds., ${h(nomM('almacen', x.almacen))}${x.ubica ? ', ' + h(x.ubica) : ''}${x.caducidad ? ', cad. ' + fec(x.caducidad) : ''})`).join(' · ') : 'sin lotes con unidades'}`
    },
  },
}
const stockTd = (s) => (s == null ? '' : `<span class="${s < 0 ? 'ko' : s === 0 ? 'mut' : ''}">${s.toLocaleString('es-ES')}</span>`)

const FILTROS = LS.get('tn-central-filtros', {})
async function vistaDatos(id) {
  const m = MOD[id], D = DATOS[id]
  cerrarModulo(); V.sage = false; V.vista = id; dock()
  if (!m || !D) return (location.hash = '#/')
  if (!P.app(m)) { toast('Su puesto no tiene acceso a ' + m.n); return (location.hash = '#/') }
  $('#titulo').textContent = m.n; document.title = m.n + ' · TN Central'
  if (!P.personal) { $('#main').innerHTML = `<h1>${h(m.n)}</h1><div class="card">Para ver estos datos entre con <b>su usuario y contraseña</b> en <a href="#/sage">Sage 50</a>. Cada puesto ve solo lo que le corresponde.</div>`; return }
  const rec = LS.get('tn-central-recientes', []).filter((x) => x !== id); rec.unshift(id); LS.set('tn-central-recientes', rec.slice(0, 6)); dock()
  $('#main').innerHTML = `<h1>${h(m.n)}</h1><div class="mut">Cargando…</div>`
  try { await cargarMaestros() } catch (e) { MAE = {} }
  const f = (FILTROS[id] = { ...D.def, ...(FILTROS[id] || {}) })
  const campos = D.filtros().filter(Boolean)
  const campo = ([k, t, ph, op]) => t === 'q' ? `<input type="search" name="${k}" placeholder="${h(ph)}" value="${h(f[k] || '')}" class="fq" autocomplete="off" enterkeyhint="search">`
    : t === 'fecha' ? `<label class="ff">${h(ph)} <input type="date" name="${k}" value="${h(f[k] || '')}"></label>`
    : `<select name="${k}">${ph ? `<option value="">${h(ph)}</option>` : ''}${op.map(([v, n]) => `<option value="${h(v)}"${f[k] === v ? ' selected' : ''}>${h(n)}</option>`).join('')}</select>`
  $('#main').innerHTML = `<h1>${h(m.n)}</h1><div class="mut">${h(m.d)}. Datos leídos de Sage${EST?.sage?.at ? ' a las ' + new Date(EST.sage.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}; se actualizan solos cada 10 minutos.</div>
    <form id="filtros" class="form filtros" onsubmit="return false">${campos.map(campo).join('')}<button class="btn sm sec" type="button" id="f-limpiar">Limpiar filtros</button></form>
    <div id="resumen" class="estado" style="margin-top:12px"></div><div id="tabla" class="tabla"></div><div id="mas" style="margin-top:10px"></div>`
  const form = $('#filtros')
  let n = 0, filas = [], total = 0, turno = 0
  const pinta = () => {
    const cab = D.cabF ? D.cabF() : D.cab
    $('#tabla').innerHTML = filas.length ? `<table><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr>${filas.map((r, i) => `<tr class="${D.detalle ? 'clic' : ''}" data-i="${i}">${D.fila(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>` : '<div class="card mut" style="border:0">Nada coincide con estos filtros.</div>'
    $('#mas').innerHTML = n < total ? `<button class="btn sec" id="b-mas">Ver más${D.extra ? '' : ` (${filas.length} de ${total})`}</button>` : total > 100 ? `<span class="mut">${total} resultados</span>` : ''
    if ($('#b-mas')) $('#b-mas').onclick = () => cargar(true)
    $$('#tabla tr.clic').forEach((tr) => (tr.onclick = async () => {
      const sig = tr.nextElementSibling
      if (sig?.classList.contains('det')) return sig.remove()
      const d = document.createElement('tr'); d.className = 'det'; d.innerHTML = `<td colspan="${cab.length}">Cargando…</td>`; tr.after(d)
      try { d.firstChild.innerHTML = await D.detalle(filas[tr.dataset.i]) } catch (e) { d.firstChild.textContent = 'No se pudo cargar: ' + e.message }
    }))
  }
  const cargar = async (mas) => {
    const t = ++turno, base = D.path(f)
    if (!mas) { n = 0; filas = []; $('#resumen').innerHTML = ''; $('#tabla').innerHTML = '<div class="mut" style="padding:12px">Buscando…</div>' }
    try {
      const pag = Nube.lista(base + '&select=' + D.sel + '&order=' + D.ord(f), n, 100)
      const res = mas ? null : Nube.todas(base + '&select=' + (D.resSel || D.sel.replace(',lineas', '')))
      let { filas: l, total: tt } = await pag
      if (D.extra) l = await D.extra(l, f)
      if (t !== turno) return
      filas = filas.concat(l); total = tt; n += 100
      pinta()
      if (res) { const r = await res; if (t === turno) $('#resumen').innerHTML = D.resumen(r) }
    } catch (e) { if (t === turno) $('#tabla').innerHTML = `<div class="card">No se pudieron leer los datos: ${h(/sin sesión/.test(e.message) ? 'su sesión ha caducado; vuelva a entrar.' : e.message)}</div>` }
  }
  let esp
  const cambio = () => { const a = JSON.stringify(f); $$('input,select', form).forEach((el) => (f[el.name] = el.value)); if (JSON.stringify(f) === a) return; LS.set('tn-central-filtros', FILTROS); clearTimeout(esp); esp = setTimeout(() => cargar(), 300) }
  form.oninput = cambio; form.onchange = cambio
  $('#f-limpiar').onclick = () => { FILTROS[id] = { ...D.def }; LS.set('tn-central-filtros', FILTROS); vistaDatos(id) }
  cargar()
}

function ruta() {
  const hs = decodeURIComponent(location.hash || '#/')
  const m = hs.match(/^#\/m\/([a-z]+)\/?(.*)$/)
  if (m) return abrirModulo(m[1], m[2])
  const v = hs.match(/^#\/v\/([a-z]+)/)
  if (v) return vistaDatos(v[1])
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
