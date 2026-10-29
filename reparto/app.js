/* Reparto · Tierra Nuestra — app de rutas y entregas conectada con Sage 50 */
(function () {
'use strict'
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const hoy = () => new Date().toLocaleDateString('sv-SE')
const ahora = () => new Date().toISOString()
const eur = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
const horaDe = (iso) => iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''
const fechaES = (f) => f ? f.split('-').reverse().join('/') : ''
const uid = () => Math.random().toString(36).slice(2, 10)
const CFG = window.TN_CONFIG || {}
const NUBE = !!(CFG.supabaseUrl && CFG.supabaseKey)
const LOGO = 'assets/logo-white.svg'
const ESTADOS = { pendiente: 'Pendiente', ruta: 'En ruta', entregado: 'Entregado', parcial: 'Entrega parcial', incidencia: 'Incidencia' }
const COLOR = { pendiente: '#8a7f85', ruta: '#2563eb', entregado: '#1f8a4c', parcial: '#c47a00', incidencia: '#c0262d' }
const COBROS = ['Ya pagado / a crédito', 'Efectivo', 'Tarjeta (TPV)', 'Bizum', 'Pendiente de cobro']
const INCID = ['Cerrado', 'Cliente ausente', 'Rechaza la mercancía', 'Falta mercancía', 'Dirección incorrecta', 'Otro']

// ---------- datos ----------
const KEY = 'tn-reparto-v1'
const defecto = () => ({ albaranes: [], repartidores: ['Repartidor 1', 'Repartidor 2'], salida: { nombre: 'Tienda Tierra Nuestra', direccion: 'C/ Fernando el Católico, 34, 21003 Huelva', lat: 37.2563, lng: -6.9483 }, posiciones: {}, ultimaSage: null })
let S = Object.assign(defecto(), JSON.parse(localStorage.getItem(KEY) || '{}'))
let U = JSON.parse(localStorage.getItem('tn-reparto-user') || 'null')
let V = { tab: null, fecha: hoy(), filtro: 'todos', rep: '' }
function guardar() {
  try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { toast('Memoria del móvil llena: envía las entregas a la oficina y borra días antiguos.') }
}
function tocar(a) { a.upd = Date.now(); a.porQuien = U?.nombre || ''; guardar(); Nube.subir([a]) }
function delDia() { return S.albaranes.filter((a) => V.fecha === 'todas' || a.fecha === V.fecha) }
function ruta(rep) { return delDia().filter((a) => a.repartidor === rep).sort((x, y) => (x.orden || 999) - (y.orden || 999)) }
const finalizado = (a) => ['entregado', 'parcial', 'incidencia'].includes(a.estado)

function fusionar(lista, origen) {
  let nuevos = 0, act = 0
  const idx = new Map(S.albaranes.map((a) => [a.id, a]))
  for (const n of lista) {
    if (!n || !n.id) continue
    const v = idx.get(n.id)
    if (!v) { S.albaranes.push(n); idx.set(n.id, n); nuevos++; continue }
    if (origen === 'sage') {
      // Sage manda los datos del documento; lo hecho en la calle se conserva
      Object.assign(v, { cliente: Object.assign({}, v.cliente, n.cliente, v.cliente?.lat ? { lat: v.cliente.lat, lng: v.cliente.lng } : {}), lineas: n.lineas, total: n.total, formaPago: n.formaPago, obs: n.obs, fecha: v.fecha || n.fecha })
      act++
    } else if ((n.upd || 0) > (v.upd || 0)) { Object.assign(v, n); act++ }
  }
  guardar()
  return { nuevos, act }
}

// ---------- nube (Supabase) ----------
const Nube = {
  token: JSON.parse(localStorage.getItem('tn-reparto-token') || 'null'),
  estado: NUBE ? 'conectando' : 'local',
  async auth(email, password) {
    const r = await fetch(CFG.supabaseUrl + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (!r.ok) throw new Error('Contraseña incorrecta')
    this.token = await r.json(); this.token.exp = Date.now() + this.token.expires_in * 1000
    localStorage.setItem('tn-reparto-token', JSON.stringify(this.token))
  },
  async renovar() {
    if (!this.token) return false
    if (Date.now() < this.token.exp - 60000) return true
    const r = await fetch(CFG.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: this.token.refresh_token }) })
    if (!r.ok) { this.token = null; localStorage.removeItem('tn-reparto-token'); return false }
    this.token = await r.json(); this.token.exp = Date.now() + this.token.expires_in * 1000
    localStorage.setItem('tn-reparto-token', JSON.stringify(this.token)); return true
  },
  async api(path, opt = {}) {
    if (!(await this.renovar())) throw new Error('sin sesión')
    const r = await fetch(CFG.supabaseUrl + '/rest/v1/' + path, Object.assign({}, opt, { headers: Object.assign({ apikey: CFG.supabaseKey, Authorization: 'Bearer ' + this.token.access_token, 'Content-Type': 'application/json' }, opt.headers || {}) }))
    if (!r.ok) throw new Error(await r.text())
    return r.status === 204 ? null : r.json().catch(() => null)
  },
  async subir(lista) {
    if (!NUBE || !this.token) return
    try {
      await this.api('reparto_albaranes', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(lista.map((a) => ({ id: a.id, fecha: a.fecha, data: a, upd: a.upd || Date.now() }))) })
      this.ok()
    } catch (e) { this.fallo() }
  },
  desde: Number(localStorage.getItem('tn-reparto-desde') || 0),
  async bajar() {
    if (!NUBE || !this.token) return
    try {
      const filas = await this.api('reparto_albaranes?select=data,upd&upd=gt.' + this.desde + '&order=upd.asc&limit=1000')
      if (filas.length) {
        fusionar(filas.map((f) => f.data), 'nube')
        this.desde = Math.max(...filas.map((f) => f.upd)); localStorage.setItem('tn-reparto-desde', this.desde)
        render(true)
      }
      if (U?.rol === 'oficina') {
        const pos = await this.api('reparto_posiciones?select=*')
        S.posiciones = Object.fromEntries(pos.map((p) => [p.repartidor, p]))
        const est = await this.api('reparto_estado?select=*&id=in.(sage,clientes)')
        for (const e of est) { if (e.id === 'sage') S.ultimaSage = e.valor; if (e.id === 'clientes') S.clientes = Object.assign({}, e.valor, S.clientes) }
      }
      this.ok()
    } catch (e) { this.fallo() }
  },
  async guardarClientes() {
    if (!NUBE || !this.token) return
    try { await this.api('reparto_estado', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ id: 'clientes', valor: S.clientes }]) }) } catch (e) {}
  },
  async posicion(lat, lng) {
    if (!NUBE || !this.token || !U) return
    try { await this.api('reparto_posiciones', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ repartidor: U.nombre, lat, lng, at: ahora() }]) }) } catch (e) {}
  },
  ok() { if (this.estado !== 'ok') { this.estado = 'ok'; pintarNube() } },
  fallo() { if (this.estado !== 'sin conexión') { this.estado = 'sin conexión'; pintarNube() } },
}
function pintarNube() { const n = $('#nube'); if (n) n.textContent = nubeTxt() }
const nubeTxt = () => NUBE ? (Nube.estado === 'ok' ? '● En línea' : '○ ' + Nube.estado) : '● En este dispositivo'
if (NUBE) setInterval(() => Nube.bajar(), 15000)

// ---------- GPS del repartidor ----------
let ultimaPos = null
function iniciarGPS() {
  if (!navigator.geolocation || iniciarGPS.on) return
  iniciarGPS.on = true
  let ultEnvio = 0
  navigator.geolocation.watchPosition((p) => {
    ultimaPos = { lat: p.coords.latitude, lng: p.coords.longitude, at: ahora() }
    if (Date.now() - ultEnvio > 30000) { ultEnvio = Date.now(); Nube.posicion(ultimaPos.lat, ultimaPos.lng) }
  }, () => {}, { enableHighAccuracy: true, maximumAge: 15000 })
}

// ---------- utilidades UI ----------
function toast(t, ms = 3200) { const el = $('#toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), ms) }
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="sheet">' + html + '</div>'; m.classList.remove('hidden'); m.onclick = (e) => { if (e.target === m) cerrar() }; return m }
function cerrar() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = '' }
const pill = (e) => `<span class="pill e-${e}">${ESTADOS[e] || e}</span>`
const dirTxt = (c) => [c.direccion, [c.cp, c.poblacion].filter(Boolean).join(' ')].filter(Boolean).join(', ')
const navURL = (c) => c.lat ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dirTxt(c) + ', España')}`
function descargar(nombre, contenido, tipo) {
  const b = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo })
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
async function compartirArchivo(nombre, texto, titulo) {
  const f = new File([texto], nombre, { type: 'application/json' })
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: titulo }); return } catch (e) { if (e.name === 'AbortError') return } }
  descargar(nombre, texto, 'application/json'); toast('Archivo descargado: envíalo por WhatsApp o correo.')
}
function leerArchivo(acepta) {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = acepta; i.onchange = () => res(i.files[0]); i.click() })
}
function reducirFoto(file, max = 900) {
  return new Promise((res) => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.6)); URL.revokeObjectURL(img.src)
    }; img.src = URL.createObjectURL(file)
  })
}
function gpsAhora() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(ultimaPos)
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(ultimaPos), { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 })
  })
}

// ---------- geocodificación y rutas ----------
const GEO = JSON.parse(localStorage.getItem('tn-reparto-geo') || '{}')
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const ZONA = '&viewbox=-7.6,37.75,-6.2,36.9&bounded=1' // provincia de Huelva
const sinTipo = (n) => n.replace(/\(.*?\)/g, ' ').replace(/^\s*(restaurante|bar|meson|mesón|supermercados?|chiringuito|delicatessen|distribuciones|hotel|tabanco|bodegon|bodegón|cafeteria|cafetería)\b/gi, ' ').replace(/\s+/g, ' ').trim()
async function geocodificar(c) {
  const conDir = !!dirTxt(c)
  const qs = conDir ? [dirTxt(c) + ', España', [c.cp, c.poblacion, 'España'].filter(Boolean).join(' ')] : [c.nombre, sinTipo(c.nombre || '')].filter((q, i, l) => q && q.length > 3 && l.indexOf(q) === i)
  for (const q of qs) {
    if (GEO[q]) return GEO[q]
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es' + (conDir ? '' : ZONA) + '&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'es' } })
      const j = await r.json(); await espera(1100)
      if (j[0]) { GEO[q] = { lat: +j[0].lat, lng: +j[0].lon, aprox: !conDir || q !== qs[0] }; localStorage.setItem('tn-reparto-geo', JSON.stringify(GEO)); return GEO[q] }
    } catch (e) { await espera(1100) }
  }
  return null
}
async function situarTodos() {
  const faltan = delDia().filter((a) => !a.cliente.lat && (dirTxt(a.cliente) || a.cliente.nombre))
  if (!faltan.length) return toast('Todas las direcciones ya están en el mapa.')
  let n = 0
  for (const a of faltan) {
    toast(`Buscando direcciones en el mapa… ${++n}/${faltan.length}`, 60000)
    const g = await geocodificar(a.cliente)
    if (g) { a.cliente.lat = g.lat; a.cliente.lng = g.lng; a.cliente.aprox = g.aprox; mismoCliente(a); tocar(a) }
  }
  const sin = faltan.filter((a) => !a.cliente.lat).length
  toast(sin ? `Hecho. ${sin} sin encontrar: márcalas a mano en el mapa.` : 'Hecho: todas las direcciones situadas.', 5000)
  render()
}
function mismoCliente(a) { // copia la posición a otros albaranes del mismo cliente
  for (const b of S.albaranes) if (b !== a && b.cliente.codigo && b.cliente.codigo === a.cliente.codigo && !b.cliente.lat) { b.cliente.lat = a.cliente.lat; b.cliente.lng = a.cliente.lng }
}
const dist = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)) }
async function optimizar(rep) {
  const todas = ruta(rep), pend = todas.filter((a) => !finalizado(a))
  const con = pend.filter((a) => a.cliente.lat), sin = pend.filter((a) => !a.cliente.lat)
  if (con.length < 2) return toast('Hacen falta al menos 2 paradas situadas en el mapa.')
  const inicio = (U?.rol === 'repartidor' && ultimaPos) ? ultimaPos : S.salida
  let orden = null
  try {
    toast('Calculando la mejor ruta…', 20000)
    const pts = [inicio, ...con.map((a) => a.cliente)].map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
    const r = await fetch(`https://router.project-osrm.org/trip/v1/driving/${pts}?source=first&roundtrip=true&overview=false`)
    const j = await r.json()
    if (j.code === 'Ok') {
      orden = con.map((a, i) => ({ a, k: j.waypoints[i + 1].waypoint_index })).sort((x, y) => x.k - y.k).map((x) => x.a)
      const t = j.trips[0]; toast(`Ruta optimizada: ${(t.distance / 1000).toFixed(1)} km · unos ${Math.round(t.duration / 60)} min conduciendo`, 6000)
    }
  } catch (e) {}
  if (!orden) { // vecino más cercano
    orden = []; let p = inicio; const resto = [...con]
    while (resto.length) { resto.sort((x, y) => dist(p, x.cliente) - dist(p, y.cliente)); const s = resto.shift(); orden.push(s); p = s.cliente }
    toast('Ruta ordenada por cercanía (sin conexión al servicio de rutas).')
  }
  const hechas = todas.filter(finalizado)
  ;[...hechas, ...orden, ...sin].forEach((a, i) => { a.orden = i + 1; tocar(a) })
  render()
}

// ---------- mapas ----------
let mapa = null
function pintarMapa(el, paradas, opts = {}) {
  if (mapa) { mapa.remove(); mapa = null }
  mapa = L.map(el, { zoomControl: true })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa)
  const b = []
  const casa = L.divIcon({ className: '', html: '<div style="background:#830040;color:#fff;border-radius:8px;padding:4px 6px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px #0006">TN</div>', iconSize: [30, 24] })
  L.marker([S.salida.lat, S.salida.lng], { icon: casa }).addTo(mapa).bindPopup(h(S.salida.nombre)); b.push([S.salida.lat, S.salida.lng])
  const porRep = {}
  paradas.forEach((a, i) => {
    if (!a.cliente.lat) return
    const n = opts.numerar ? (a.orden || i + 1) : ''
    const ic = L.divIcon({ className: '', html: `<div style="background:${COLOR[a.estado]};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px #0006">${n || '•'}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] })
    const m = L.marker([a.cliente.lat, a.cliente.lng], { icon: ic, draggable: !!opts.mover }).addTo(mapa)
    m.bindPopup(`<b>${h(a.cliente.nombre)}</b><br>${h(dirTxt(a.cliente))}<br>Alb. ${h(a.numero)} · ${pill(a.estado)}${a.repartidor ? '<br>🚚 ' + h(a.repartidor) : ''}${a.cliente.aprox ? '<br><i>Posición aproximada: arrastra el punto</i>' : ''}`)
    if (opts.mover) m.on('dragend', () => { const p = m.getLatLng(); a.cliente.lat = p.lat; a.cliente.lng = p.lng; a.cliente.aprox = false; tocar(a); toast('Posición guardada') })
    if (opts.alPulsar) m.on('click', () => opts.alPulsar(a))
    b.push([a.cliente.lat, a.cliente.lng])
    ;(porRep[a.repartidor] = porRep[a.repartidor] || []).push(a)
  })
  if (opts.lineas) for (const rep in porRep) {
    const pts = porRep[rep].filter((a) => a.cliente.lat).sort((x, y) => (x.orden || 999) - (y.orden || 999)).map((a) => [a.cliente.lat, a.cliente.lng])
    if (rep && pts.length) L.polyline([[S.salida.lat, S.salida.lng], ...pts], { color: '#B771A0', weight: 3, dashArray: '6 6' }).addTo(mapa)
  }
  for (const r in (opts.posiciones || {})) {
    const p = opts.posiciones[r]
    const ic = L.divIcon({ className: '', html: `<div style="background:#1d1418;color:#fff;border-radius:8px;padding:3px 7px;font-size:12px;white-space:nowrap;border:2px solid #fff;box-shadow:0 1px 4px #0006">🚚 ${h(r)}</div>`, iconSize: [90, 22] })
    L.marker([p.lat, p.lng], { icon: ic }).addTo(mapa).bindPopup(`${h(r)}<br>Última posición: ${horaDe(p.at)}`); b.push([p.lat, p.lng])
  }
  if (opts.yo && ultimaPos) { L.circleMarker([ultimaPos.lat, ultimaPos.lng], { radius: 8, color: '#2563eb', fillOpacity: 0.9 }).addTo(mapa).bindPopup('Estás aquí'); b.push([ultimaPos.lat, ultimaPos.lng]) }
  if (opts.alClicMapa) mapa.on('click', (e) => opts.alClicMapa(e.latlng))
  if (b.length > 1) mapa.fitBounds(b, { padding: [30, 30], maxZoom: 15 }); else mapa.setView(b[0], 13)
  setTimeout(() => mapa && mapa.invalidateSize(), 200)
}

// ---------- pantallas ----------
function render(silencioso) {
  if (silencioso && $('#modal:not(.hidden)')) return
  if (silencioso && V.tab && ['mapa', 'importar', 'ajustes'].includes(V.tab)) return
  const app = $('#app')
  if (!U) return pantallaEntrada(app)
  if (NUBE && !Nube.token) return pantallaClave(app)
  if (U.rol === 'repartidor') iniciarGPS()
  const tabs = U.rol === 'oficina'
    ? [['hoy', 'Albaranes'], ['rutas', 'Rutas'], ['mapa', 'Mapa en vivo'], ['importar', 'Sage 50'], ['informe', 'Informe'], ['ajustes', 'Ajustes']]
    : [['ruta', 'Mi ruta'], ['mapa', 'Mapa'], ['enviar', 'Enviar a oficina']]
  if (!V.tab || !tabs.some((t) => t[0] === V.tab)) V.tab = tabs[0][0]
  const sc = $('main')?.scrollTop, sy = window.scrollY
  app.innerHTML = `<div class="top"><img src="${LOGO}" alt="Tierra Nuestra"><span class="t">Reparto</span><span class="sp"></span><span class="nube" id="nube">${nubeTxt()}</span><button id="salir" title="Cambiar de usuario">${h(U.nombre)} ⏻</button></div>
  <div class="tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${V.tab === k ? 'on' : ''}">${t}</button>`).join('')}</div><main id="main"></main>`
  $$('[data-tab]').forEach((b) => (b.onclick = () => { V.tab = b.dataset.tab; render(); window.scrollTo(0, 0) }))
  $('#salir').onclick = () => { if (confirm('¿Cambiar de usuario?')) { U = null; localStorage.removeItem('tn-reparto-user'); render() } }
  const main = $('#main')
  ;({ hoy: vHoy, rutas: vRutas, mapa: vMapa, importar: vImportar, informe: vInforme, ajustes: vAjustes, ruta: vMiRuta, enviar: vEnviar })[V.tab](main)
  if (silencioso) window.scrollTo(0, sy)
}

function pantallaEntrada(app) {
  app.innerHTML = `<div class="hero"><img src="${LOGO}" alt="Tierra Nuestra"><div style="font-family:FiraC;letter-spacing:.2em">REPARTO Y ENTREGAS</div>
  <div class="box col"><h2>¿Quién eres?</h2>
  <button class="btn big" id="ofi">🏢 Oficina</button>
  <label>Repartidor</label><select id="rep">${S.repartidores.map((r) => `<option>${h(r)}</option>`).join('')}</select>
  <button class="btn big sec" id="rr">🚚 Entrar como repartidor</button></div></div>`
  $('#ofi').onclick = () => entrar({ rol: 'oficina', nombre: 'Oficina' })
  $('#rr').onclick = () => entrar({ rol: 'repartidor', nombre: $('#rep').value })
}
function entrar(u) { U = u; localStorage.setItem('tn-reparto-user', JSON.stringify(U)); V.tab = null; render(); Nube.bajar() }
function pantallaClave(app) {
  app.innerHTML = `<div class="hero"><img src="${LOGO}"><div class="box col"><h2>Contraseña del equipo</h2><input id="pw" type="password" placeholder="Contraseña"><button class="btn big" id="ent">Entrar</button><button class="btn sec" id="otro">Cambiar de usuario</button></div></div>`
  $('#ent').onclick = async () => { try { await Nube.auth(CFG.equipoEmail, $('#pw').value); render(); Nube.bajar() } catch (e) { toast(e.message) } }
  $('#otro').onclick = () => { U = null; localStorage.removeItem('tn-reparto-user'); render() }
}

function selectorFecha() {
  const fechas = [...new Set(S.albaranes.map((a) => a.fecha))].sort().reverse()
  if (!fechas.includes(V.fecha) && V.fecha !== 'todas') fechas.unshift(V.fecha)
  return `<select id="fecha" style="width:auto">${fechas.map((f) => `<option value="${f}" ${f === V.fecha ? 'selected' : ''}>${f === hoy() ? 'Hoy ' : ''}${fechaES(f)}</option>`).join('')}<option value="todas" ${V.fecha === 'todas' ? 'selected' : ''}>Todas las fechas</option></select>`
}
function enlazarFecha() { const f = $('#fecha'); if (f) f.onchange = () => { V.fecha = f.value; render() } }

function estadisticas(lista) {
  const c = (e) => lista.filter((a) => a.estado === e).length
  const cobrado = lista.reduce((s, a) => s + (a.entrega?.cobro && ['Efectivo', 'Tarjeta (TPV)', 'Bizum'].includes(a.entrega.cobro.forma) ? Number(a.entrega.cobro.importe) || 0 : 0), 0)
  return `<div class="stats"><div class="stat"><b>${lista.length}</b><span>Albaranes</span></div><div class="stat"><b>${c('pendiente') + c('ruta')}</b><span>Por entregar</span></div><div class="stat"><b style="color:var(--ok)">${c('entregado') + c('parcial')}</b><span>Entregados</span></div><div class="stat"><b style="color:var(--ko)">${c('incidencia')}</b><span>Incidencias</span></div><div class="stat"><b>${eur(cobrado)}</b><span>Cobrado en ruta</span></div></div>`
}

// ----- OFICINA: albaranes -----
function vHoy(m) {
  let lista = delDia()
  if (V.filtro !== 'todos') lista = lista.filter((a) => V.filtro === 'sinasignar' ? !a.repartidor : a.estado === V.filtro)
  lista.sort((x, y) => (x.repartidor || 'zzz').localeCompare(y.repartidor || 'zzz') || (x.orden || 999) - (y.orden || 999))
  const opRep = (sel) => `<option value="">— Sin asignar —</option>` + S.repartidores.map((r) => `<option ${r === sel ? 'selected' : ''}>${h(r)}</option>`).join('')
  m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">Albaranes para repartir</h1>${selectorFecha()}</div>
  ${estadisticas(delDia())}
  <div class="card"><div class="row">
    <select id="filtro" style="width:auto"><option value="todos">Todos</option><option value="sinasignar">Sin asignar</option>${Object.keys(ESTADOS).map((e) => `<option value="${e}">${ESTADOS[e]}</option>`).join('')}</select>
    <span class="grow"></span>
    <select id="masrep" style="width:auto">${opRep('')}</select><button class="btn sm" id="asig">Asignar marcados</button>
    <button class="btn sm sec" id="nuevo">+ Pedido de última hora</button>
  </div></div>
  <div class="card" style="overflow-x:auto">${lista.length ? `<table><thead><tr><th><input type="checkbox" class="chk" id="todos"></th><th>Albarán</th><th>Cliente</th><th>Dirección</th><th>Total</th><th>Repartidor</th><th>Estado</th><th></th></tr></thead><tbody>
  ${lista.map((a) => `<tr><td><input type="checkbox" class="chk" data-sel="${a.id}"></td><td><b>${h(a.numero)}</b><div class="mut">${fechaES(a.fecha)}</div></td><td>${h(a.cliente.nombre)}<div class="mut">${h(a.cliente.telefono || '')}</div></td><td>${h(dirTxt(a.cliente))}${a.cliente.lat ? '' : ' <span class="mut">(sin situar)</span>'}</td><td>${eur(a.total)}</td>
  <td><select data-rep="${a.id}">${opRep(a.repartidor)}</select></td><td>${pill(a.estado)}${a.entrega?.hora ? '<div class="mut">' + horaDe(a.entrega.hora) + '</div>' : ''}</td><td><button class="btn sm sec" data-ver="${a.id}">Ver</button></td></tr>`).join('')}
  </tbody></table>` : `<p class="mut">No hay albaranes para esta fecha. Ve a <b>Sage 50</b> para traerlos, o crea un pedido de última hora.</p>`}</div>`
  enlazarFecha()
  $('#filtro').value = V.filtro; $('#filtro').onchange = (e) => { V.filtro = e.target.value; render() }
  $$('[data-rep]').forEach((s) => (s.onchange = () => { const a = S.albaranes.find((x) => x.id === s.dataset.rep); a.repartidor = s.value; a.orden = s.value ? ruta(s.value).length + 1 : 0; if (a.estado === 'pendiente' && s.value) a.estado = 'ruta'; if (!s.value && a.estado === 'ruta') a.estado = 'pendiente'; tocar(a); render() }))
  $$('[data-ver]').forEach((b) => (b.onclick = () => detalle(S.albaranes.find((x) => x.id === b.dataset.ver))))
  const t = $('#todos'); if (t) t.onchange = () => $$('[data-sel]').forEach((c) => (c.checked = t.checked))
  $('#asig').onclick = () => {
    const ids = $$('[data-sel]:checked').map((c) => c.dataset.sel), rep = $('#masrep').value
    if (!ids.length) return toast('Marca primero los albaranes.')
    let n = ruta(rep).length
    for (const id of ids) { const a = S.albaranes.find((x) => x.id === id); a.repartidor = rep; a.orden = rep ? ++n : 0; if (a.estado === 'pendiente' && rep) a.estado = 'ruta'; if (!rep && a.estado === 'ruta') a.estado = 'pendiente'; tocar(a) }
    toast(`${ids.length} albaranes ${rep ? 'asignados a ' + rep : 'sin asignar'}`); render()
  }
  $('#nuevo').onclick = nuevoPedido
}

function nuevoPedido() {
  modal(`<h2>Pedido de última hora</h2><div class="col">
  <label>Cliente</label><input id="n-nom" placeholder="Nombre del cliente">
  <label>Dirección</label><input id="n-dir" placeholder="Calle y número">
  <div class="row"><div class="grow col"><label>C.P.</label><input id="n-cp"></div><div class="grow col"><label>Población</label><input id="n-pob" value="Huelva"></div></div>
  <label>Teléfono</label><input id="n-tel" type="tel">
  <label>Qué llevar</label><textarea id="n-lin" rows="3" placeholder="Una línea por producto, p. ej.: 6 x Vino tinto crianza"></textarea>
  <div class="row"><div class="grow col"><label>Total €</label><input id="n-tot" type="number" step="0.01"></div><div class="grow col"><label>Repartidor</label><select id="n-rep"><option value="">— Sin asignar —</option>${S.repartidores.map((r) => `<option>${h(r)}</option>`).join('')}</select></div></div>
  <label>Observaciones</label><input id="n-obs">
  <button class="btn big" id="n-ok">Crear</button><button class="btn sec" onclick="document.getElementById('modal').click()">Cancelar</button></div>`)
  $('#modal .btn.sec').onclick = cerrar
  $('#n-ok').onclick = () => {
    const nom = $('#n-nom').value.trim(); if (!nom) return toast('Falta el nombre del cliente')
    const rep = $('#n-rep').value
    const a = { id: 'm-' + uid(), numero: 'URG-' + new Date().toTimeString().slice(0, 5).replace(':', ''), fecha: V.fecha === 'todas' ? hoy() : V.fecha, origen: 'manual',
      cliente: { nombre: nom, direccion: $('#n-dir').value, cp: $('#n-cp').value, poblacion: $('#n-pob').value, telefono: $('#n-tel').value },
      lineas: $('#n-lin').value.split('\n').filter((l) => l.trim()).map((l) => { const m = l.match(/^\s*(\d+[.,]?\d*)\s*[xX×]?\s*(.+)$/); return m ? { unidades: +m[1].replace(',', '.'), nombre: m[2] } : { unidades: '', nombre: l } }),
      total: Number($('#n-tot').value) || 0, obs: $('#n-obs').value, repartidor: rep, orden: rep ? ruta(rep).length + 1 : 0, estado: rep ? 'ruta' : 'pendiente' }
    S.albaranes.push(a); tocar(a); cerrar(); render(); toast('Pedido creado')
    geocodificar(a.cliente).then((g) => { if (g) { a.cliente.lat = g.lat; a.cliente.lng = g.lng; a.cliente.aprox = g.aprox; tocar(a) } })
  }
}

function detalle(a) {
  const e = a.entrega || {}, inc = a.incidencia
  modal(`<div class="row"><h2 class="grow">Albarán ${h(a.numero)}</h2>${pill(a.estado)}</div>
  <div class="card"><h3>${h(a.cliente.nombre)}</h3><div>${h(dirTxt(a.cliente))}</div><div class="mut">${h(a.cliente.telefono || '')} ${a.cliente.codigo ? '· Cliente ' + h(a.cliente.codigo) : ''}</div>${a.obs ? `<div style="margin-top:6px">📝 ${h(a.obs)}</div>` : ''}</div>
  ${tablaLineas(a)}
  ${e.hora ? `<div class="card"><h3>Entrega</h3><div>${horaDe(e.hora)} · ${h(a.repartidor)} · Recibe: <b>${h(e.receptor || '')}</b></div>${e.cobro ? `<div>Cobro: <b>${h(e.cobro.forma)}</b> ${e.cobro.importe ? eur(e.cobro.importe) : ''}</div>` : ''}${e.nota ? `<div>📝 ${h(e.nota)}</div>` : ''}${e.firma ? `<img class="foto" src="${e.firma}" style="background:#fff;border:1px solid var(--borde)">` : ''}${e.foto ? `<img class="foto" src="${e.foto}">` : ''}</div>` : ''}
  ${inc ? `<div class="card" style="border-color:var(--ko)"><h3 style="color:var(--ko)">Incidencia: ${h(inc.tipo)}</h3><div>${horaDe(inc.hora)} · ${h(inc.nota || '')}</div>${inc.foto ? `<img class="foto" src="${inc.foto}">` : ''}</div>` : ''}
  <div class="row">${a.cliente.telefono ? `<a class="btn sec" href="tel:${h(a.cliente.telefono)}">📞 Llamar</a>` : ''}<a class="btn sec" target="_blank" href="${navURL(a.cliente)}">🧭 Cómo llegar</a>${e.hora ? '<button class="btn sec" id="d-pdf">🖨 Comprobante PDF</button>' : ''}
  ${U.rol === 'oficina' && a.estado !== 'pendiente' ? '<button class="btn sec" id="d-rei">↺ Volver a pendiente</button>' : ''}${U.rol === 'oficina' && a.origen === 'manual' ? '<button class="btn ko sm" id="d-del">Borrar</button>' : ''}<span class="grow"></span><button class="btn" id="d-x">Cerrar</button></div>`)
  $('#d-x').onclick = cerrar
  if ($('#d-pdf')) $('#d-pdf').onclick = () => comprobante([a])
  if ($('#d-rei')) $('#d-rei').onclick = () => { if (!confirm('¿Quitar la entrega/incidencia y dejarlo pendiente?')) return; a.estado = a.repartidor ? 'ruta' : 'pendiente'; delete a.entrega; delete a.incidencia; tocar(a); cerrar(); render() }
  if ($('#d-del')) $('#d-del').onclick = () => { if (!confirm('¿Borrar este pedido?')) return; S.albaranes = S.albaranes.filter((x) => x !== a); guardar(); cerrar(); render() }
}
const tablaLineas = (a) => a.lineas?.length ? `<div class="card"><h3>Mercancía</h3><table class="lineas"><tbody>${a.lineas.map((l) => `<tr><td style="width:60px;text-align:right"><b>${h(l.unidades)}</b></td><td>${h(l.nombre)}</td><td class="mut">${h(l.codigo || '')}</td></tr>`).join('')}</tbody></table><div style="text-align:right;margin-top:6px">Total: <b>${eur(a.total)}</b>${a.formaPago ? ' · ' + h(a.formaPago) : ''}</div></div>` : ''

// ----- OFICINA: rutas -----
function vRutas(m) {
  const reps = S.repartidores
  m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">Rutas</h1>${selectorFecha()}<button class="btn sm sec" id="sit">📍 Situar direcciones</button></div>
  ${reps.map((r) => { const l = ruta(r), hechas = l.filter(finalizado).length
    return `<div class="card"><div class="row"><h2 class="grow" style="margin:0">🚚 ${h(r)}</h2><span class="mut">${hechas}/${l.length} hechas</span>
    <button class="btn sm" data-opt="${h(r)}">⚡ Optimizar ruta</button>${NUBE ? '' : `<button class="btn sm sec" data-env="${h(r)}">📤 Enviar ruta al móvil</button>`}</div>
    <div class="bar" style="margin:10px 0"><i style="width:${l.length ? (hechas / l.length) * 100 : 0}%"></i></div>
    ${l.length ? l.map((a, i) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--borde)"><div class="num ${a.estado === 'incidencia' ? 'bad' : finalizado(a) ? 'done' : ''}">${i + 1}</div><div class="grow"><b>${h(a.cliente.nombre)}</b> <span class="mut">· ${h(a.numero)}</span><div class="mut">${h(dirTxt(a.cliente))}</div></div>${pill(a.estado)}
    <button class="btn sm sec" data-up="${a.id}" ${i === 0 ? 'disabled' : ''}>▲</button><button class="btn sm sec" data-down="${a.id}" ${i === l.length - 1 ? 'disabled' : ''}>▼</button></div>`).join('') : '<p class="mut">Sin paradas asignadas. Asígnalas en Albaranes.</p>'}</div>` }).join('')}
  ${delDia().filter((a) => !a.repartidor).length ? `<div class="card"><b>${delDia().filter((a) => !a.repartidor).length}</b> albaranes sin repartidor. Asígnalos en <b>Albaranes</b>.</div>` : ''}`
  enlazarFecha()
  $('#sit').onclick = situarTodos
  $$('[data-opt]').forEach((b) => (b.onclick = () => optimizar(b.dataset.opt)))
  $$('[data-env]').forEach((b) => (b.onclick = () => { const l = ruta(b.dataset.env); compartirArchivo(`ruta-${b.dataset.env.replace(/\s+/g, '_')}-${V.fecha}.json`, JSON.stringify({ tipo: 'tn-reparto', de: 'oficina', albaranes: l }), 'Ruta de ' + b.dataset.env) }))
  const mover = (id, d) => { const a = S.albaranes.find((x) => x.id === id), l = ruta(a.repartidor), i = l.indexOf(a), j = i + d; [l[i], l[j]] = [l[j], l[i]]; l.forEach((x, k) => { if (x.orden !== k + 1) { x.orden = k + 1; tocar(x) } }); render() }
  $$('[data-up]').forEach((b) => (b.onclick = () => mover(b.dataset.up, -1)))
  $$('[data-down]').forEach((b) => (b.onclick = () => mover(b.dataset.down, 1)))
}

// ----- mapa -----
let fijar = null
function vMapa(m) {
  const of = U.rol === 'oficina', l = of ? delDia() : ruta(U.nombre)
  const sin = l.filter((a) => !a.cliente.lat)
  m.innerHTML = `<div class="row" style="margin-bottom:10px"><h1 class="grow" style="margin:0">${of ? 'Mapa en vivo' : 'Mi ruta en el mapa'}</h1>${of ? selectorFecha() : ''}<button class="btn sm sec" id="rec">↻</button></div>
  <div id="mp" class="map"></div>
  <div class="row mut" style="margin-top:8px">${Object.keys(ESTADOS).map((e) => `<span><span class="pill e-${e}">&nbsp;</span> ${ESTADOS[e]}</span>`).join(' ')}</div>
  ${of && !NUBE ? '<p class="mut">Para ver las furgonetas moviéndose en el mapa hace falta activar la conexión central (Ajustes).</p>' : ''}
  ${of && sin.length ? `<div class="card"><h3>Sin situar en el mapa (${sin.length})</h3><p class="mut">Pulsa uno y luego toca su sitio en el mapa. También puedes arrastrar cualquier punto para corregirlo.</p>${sin.map((a) => `<button class="btn sm sec" style="margin:3px" data-fij="${a.id}">${h(a.cliente.nombre)}</button>`).join('')}<div style="margin-top:8px"><button class="btn sm" id="sit">📍 Buscar direcciones automáticamente</button></div></div>` : ''}`
  pintarMapa($('#mp'), l, { numerar: true, lineas: true, mover: of, posiciones: of ? S.posiciones : {}, yo: !of, alPulsar: of ? null : (a) => {}, alClicMapa: (ll) => { if (!fijar) return; fijar.cliente.lat = ll.lat; fijar.cliente.lng = ll.lng; fijar.cliente.aprox = false; mismoCliente(fijar); tocar(fijar); toast('Situado: ' + fijar.cliente.nombre); fijar = null; render() } })
  enlazarFecha()
  $('#rec').onclick = async () => { await Nube.bajar(); render() }
  $$('[data-fij]').forEach((b) => (b.onclick = () => { fijar = S.albaranes.find((x) => x.id === b.dataset.fij); toast('Ahora toca en el mapa dónde está ' + fijar.cliente.nombre, 6000) }))
  if ($('#sit')) $('#sit').onclick = situarTodos
}

// ----- OFICINA: Sage 50 -----
function vImportar(m) {
  const u = S.ultimaSage
  m.innerHTML = `<h1>Conexión con Sage 50</h1>
  <div class="card"><h2>🔌 Conexión directa</h2>
  <p>El <b>Conector Sage</b> instalado en el ordenador de la oficina lee de Sage 50 los albaranes de venta y los clientes (solo lectura, no modifica nada en Sage).</p>
  ${NUBE ? `<p>Última lectura de Sage: <b>${u ? new Date(u.at).toLocaleString('es-ES') + ' · ' + u.albaranes + ' albaranes' : 'todavía ninguna'}</b>. Los albaranes nuevos aparecen solos en <b>Albaranes</b>.</p>`
    : `<p>Cada vez que se ejecuta, deja un archivo <b>reparto-sage.json</b> en el escritorio. Cárgalo aquí:</p><button class="btn" id="imp-json">📥 Cargar archivo del Conector Sage</button>`}
  <p class="mut" style="margin-top:12px">Instalación en el ordenador de Sage: descarga el conector, descomprímelo en el escritorio y haz doble clic en <b>Conector Sage - Reparto</b>.</p><a class="btn sec" href="conector-sage-reparto.zip" download>⬇ Descargar Conector Sage</a>
  </div>
  <div class="card"><h2>📊 Desde Excel de Sage</h2><p class="mut">Alternativa: en Sage 50 saca un listado de albaranes de venta (con cliente, dirección, población, teléfono y total) y exporta a Excel. La app reconoce las columnas sola.</p>
  <button class="btn sec" id="imp-xls">📥 Cargar Excel de albaranes o de clientes</button></div>
  <div class="card"><h2>🧪 Probar con datos de ejemplo</h2><p class="mut">Carga 8 albaranes ficticios en Huelva para ver cómo funciona todo.</p><button class="btn sec" id="demo">Cargar ejemplo</button></div>
  <div class="card"><h2>📤 Devolver a Sage</h2><p class="mut">La app nunca escribe en Sage. Las entregas y cobros del día se descargan en Excel desde <b>Informe</b> para pasarlos a Sage.</p></div>`
  if ($('#imp-json')) $('#imp-json').onclick = async () => { const f = await leerArchivo('.json,application/json'); if (f) importarJSON(await f.text()) }
  $('#imp-xls').onclick = async () => { const f = await leerArchivo('.xlsx,.xls,.csv'); if (f) importarExcel(await f.arrayBuffer()) }
  $('#demo').onclick = cargarDemo
}
function importarJSON(txt) {
  let d; try { d = JSON.parse(txt) } catch (e) { return toast('Ese archivo no es válido.') }
  const lista = d.albaranes || []
  const r = fusionar(lista, d.de === 'sage' ? 'sage' : 'archivo')
  if (d.de === 'sage') S.ultimaSage = { at: d.generado || ahora(), albaranes: lista.length }
  guardar(); toast(`${r.nuevos} nuevos, ${r.act} actualizados`); Nube.subir(lista.map((x) => S.albaranes.find((a) => a.id === x.id)))
  if (lista[0]?.fecha) V.fecha = lista.map((a) => a.fecha).sort().pop()
  render()
}
function importarExcel(buf) {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' })
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const campos = { numero: ['numero', 'albaran', 'numalbaran', 'documento', 'n', 'num'], fecha: ['fecha', 'fechaalbaran'], codigo: ['cliente', 'codcliente', 'codigocliente', 'codigo'], nombre: ['nombre', 'nombrecliente', 'razonsocial', 'nombrefiscal'], direccion: ['direccion', 'domicilio', 'direccionenvio'], cp: ['cp', 'codpostal', 'codigopostal'], poblacion: ['poblacion', 'localidad', 'ciudad'], telefono: ['telefono', 'telefono1', 'tlf', 'movil'], total: ['total', 'importe', 'totaldoc', 'totalalbaran', 'importetotal'], articulo: ['articulo', 'codarticulo'], descripcion: ['descripcion', 'nombrearticulo', 'definicion'], unidades: ['unidades', 'cantidad', 'uds'], formaPago: ['formapago', 'fpago', 'formadepago'], obs: ['observaciones', 'obs', 'notas'], sel: ['checkselec', 'seleccionado', 'sel'], serie: ['serie'] }
  let hi = -1, col = {}
  for (let i = 0; i < Math.min(15, filas.length) && hi < 0; i++) {
    const c = {}; filas[i].forEach((v, j) => { const n = norm(v); for (const k in campos) if (c[k] === undefined && campos[k].includes(n)) c[k] = j })
    if (c.numero !== undefined && (c.nombre !== undefined || c.codigo !== undefined)) { hi = i; col = c }
  }
  if (hi < 0) return importarClientes(filas, norm, campos)
  const val = (f, k) => col[k] === undefined ? '' : f[col[k]]
  const fec = (v) => v instanceof Date ? v.toLocaleDateString('sv-SE') : /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(String(v).trim()) ? (([d, m, y]) => `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)(String(v).trim().split('/')) : (typeof v === 'number' ? new Date(Math.round((v - 25569) * 864e5)).toLocaleDateString('sv-SE') : hoy())
  const por = new Map()
  const marcado = (f) => /^(true|verdadero|si|sí|1|x)$/i.test(String(val(f, 'sel')).trim()) || val(f, 'sel') === true
  const soloMarcados = col.sel !== undefined && filas.slice(hi + 1).some(marcado)
  for (const f of filas.slice(hi + 1)) {
    if (soloMarcados && !marcado(f)) continue
    const num = String(val(f, 'numero')).trim(); if (!num) continue
    let a = por.get(num)
    if (!a) { a = { id: 'xls-' + num, numero: num, fecha: soloMarcados ? hoy() : fec(val(f, 'fecha')), fechaAlbaran: fec(val(f, 'fecha')), origen: 'excel', cliente: { codigo: String(val(f, 'codigo')).trim(), nombre: String(val(f, 'nombre') || val(f, 'codigo')).trim(), direccion: String(val(f, 'direccion')).trim(), cp: String(val(f, 'cp')).trim(), poblacion: String(val(f, 'poblacion')).trim(), telefono: String(val(f, 'telefono')).trim() }, total: 0, lineas: [], formaPago: String(val(f, 'formaPago')), obs: String(val(f, 'obs')), estado: 'pendiente', repartidor: '', orden: 0 }; por.set(num, a) }
    const t = parseFloat(String(val(f, 'total')).replace(/\./g, (x, i, s) => (s.includes(',') ? '' : x)).replace(',', '.')) || 0
    if (col.descripcion !== undefined && val(f, 'descripcion')) { a.lineas.push({ codigo: String(val(f, 'articulo')).trim(), nombre: String(val(f, 'descripcion')).trim(), unidades: val(f, 'unidades') }); if (col.articulo !== undefined) a.total += t; else a.total = t } else a.total = t
  }
  const lista = [...por.values()]
  lista.forEach(completarCliente)
  const r = fusionar(lista, 'sage'); Nube.subir(lista.map((x) => S.albaranes.find((a) => a.id === x.id)))
  V.fecha = lista.map((a) => a.fecha).sort().pop() || hoy()
  toast(`Excel cargado: ${r.nuevos} albaranes nuevos, ${r.act} actualizados${soloMarcados ? ' (solo los marcados en Sage)' : ''}`, 6000); V.tab = 'hoy'; render()
}
// Listado de clientes de Sage (código, dirección, teléfono…): completa los albaranes que no traen dirección
function completarCliente(a) {
  const c = (S.clientes || {})[a.cliente.codigo]; if (!c) return false
  let cambia = false
  for (const k of ['direccion', 'cp', 'poblacion', 'telefono']) if (!a.cliente[k] && c[k]) { a.cliente[k] = c[k]; cambia = true }
  return cambia
}
function importarClientes(filas, norm, campos) {
  let hi = -1, col = {}
  for (let i = 0; i < Math.min(15, filas.length) && hi < 0; i++) {
    const c = {}; filas[i].forEach((v, j) => { const n = norm(v); for (const k of ['codigo', 'nombre', 'direccion', 'cp', 'poblacion', 'telefono']) if (c[k] === undefined && campos[k].includes(n)) c[k] = j })
    if (c.codigo !== undefined && (c.direccion !== undefined || c.poblacion !== undefined)) { hi = i; col = c }
  }
  if (hi < 0) return toast('No encuentro las columnas (Número de albarán, o Código y Dirección del cliente). Envíame el Excel y lo adapto.', 6000)
  S.clientes = S.clientes || {}; let n = 0
  for (const f of filas.slice(hi + 1)) {
    const cod = String(f[col.codigo] ?? '').trim(); if (!cod) continue
    const v = (k) => col[k] === undefined ? '' : String(f[col[k]] ?? '').trim()
    S.clientes[cod] = { nombre: v('nombre'), direccion: v('direccion'), cp: v('cp'), poblacion: v('poblacion'), telefono: v('telefono') }; n++
  }
  const tocados = S.albaranes.filter((a) => { const c = completarCliente(a); if (c) { delete a.cliente.lat; delete a.cliente.lng; a.upd = Date.now() } return c })
  guardar(); Nube.subir(tocados); Nube.guardarClientes()
  toast(`Clientes cargados: ${n}. Direcciones añadidas a ${tocados.length} albaranes. Pulsa "Situar en el mapa".`, 7000); render()
}
function cargarDemo() {
  const f = hoy(), C = [
    ['Restaurante La Ría (DEMO)', 'Av. Francisco Montenegro', '21001', 'Huelva', '959000001', 37.2531, -6.9563, [[12, 'Tinto Ribera del Duero Crianza'], [6, 'Blanco Rueda Verdejo']], 214.5, 'Contado'],
    ['Bar El Puerto (DEMO)', 'C/ Puerto 12', '21001', 'Huelva', '959000002', 37.2547, -6.9513, [[24, 'Vino del Condado joven'], [6, 'Manzanilla en rama']], 156.2, 'Crédito 30 días'],
    ['Hotel Plaza (DEMO)', 'Plaza de las Monjas', '21001', 'Huelva', '959000003', 37.2586, -6.9502, [[18, 'Cava Brut Nature'], [6, 'Albariño Rías Baixas']], 389.0, 'Transferencia'],
    ['Taberna Isla Chica (DEMO)', 'Av. Pío XII', '21003', 'Huelva', '959000004', 37.2652, -6.9387, [[12, 'Tinto Rioja Reserva']], 198.0, 'Contado'],
    ['Gastrobar Santa Fe (DEMO)', 'Av. Andalucía', '21006', 'Huelva', '959000005', 37.2746, -6.9301, [[6, 'Champagne Brut'], [12, 'Rosado Navarra']], 452.8, 'Contado'],
    ['Club Náutico (DEMO)', 'Av. de la Ría', '21410', 'Punta Umbría', '959000006', 37.1825, -6.9662, [[36, 'Blanco Condado de Huelva'], [12, 'Fino del Condado']], 301.4, 'Crédito 30 días'],
    ['Restaurante Aljaraque (DEMO)', 'C/ Real', '21110', 'Aljaraque', '959000007', 37.2697, -7.0232, [[12, 'Tinto Toro Roble']], 142.0, 'Contado'],
    ['Vinoteca San Juan (DEMO)', 'C/ Real', '21610', 'San Juan del Puerto', '959000008', 37.3166, -6.8414, [[24, 'Surtido navideño'], [6, 'Oporto Tawny']], 512.6, 'Transferencia'],
  ]
  const lista = C.map((c, i) => ({ id: 'demo-' + f + '-' + i, numero: 'AV-' + (1201 + i), fecha: f, origen: 'demo', cliente: { codigo: 'D' + (100 + i), nombre: c[0], direccion: c[1], cp: c[2], poblacion: c[3], telefono: c[4], lat: c[5], lng: c[6] }, lineas: c[7].map(([u, n]) => ({ unidades: u, nombre: n })), total: c[8], formaPago: c[9], estado: 'pendiente', repartidor: '', orden: 0, upd: Date.now() }))
  const r = fusionar(lista, 'archivo'); Nube.subir(lista); V.fecha = f; V.tab = 'hoy'; toast(`Ejemplo cargado (${r.nuevos} albaranes)`); render()
}

// ----- OFICINA: informe -----
function vInforme(m) {
  const l = delDia().slice().sort((x, y) => (x.repartidor || '').localeCompare(y.repartidor || '') || (x.orden || 0) - (y.orden || 0))
  const formas = {}; l.forEach((a) => { const c = a.entrega?.cobro; if (c && c.forma) { const k = (a.repartidor || '—') + '|' + c.forma; formas[k] = (formas[k] || 0) + (Number(c.importe) || 0) } })
  m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">Informe del día</h1>${selectorFecha()}<button class="btn sm" id="xls">📊 Excel para Sage</button><button class="btn sm sec" id="pdf">🖨 PDF del día</button><button class="btn sm sec" id="cps">🖨 Comprobantes firmados</button></div>
  ${estadisticas(l)}
  <div class="card"><h2>Cobros por repartidor</h2>${Object.keys(formas).length ? `<table><thead><tr><th>Repartidor</th><th>Forma</th><th>Importe</th></tr></thead><tbody>${Object.entries(formas).map(([k, v]) => `<tr><td>${h(k.split('|')[0])}</td><td>${h(k.split('|')[1])}</td><td>${eur(v)}</td></tr>`).join('')}</tbody></table>` : '<p class="mut">Sin cobros registrados.</p>'}</div>
  <div class="card" style="overflow-x:auto"><h2>Entregas</h2><table><thead><tr><th>Albarán</th><th>Cliente</th><th>Repartidor</th><th>Estado</th><th>Hora</th><th>Recibe</th><th>Cobro</th><th>Incidencia</th></tr></thead><tbody>
  ${l.map((a) => `<tr><td>${h(a.numero)}</td><td>${h(a.cliente.nombre)}</td><td>${h(a.repartidor)}</td><td>${pill(a.estado)}</td><td>${horaDe(a.entrega?.hora || a.incidencia?.hora)}</td><td>${h(a.entrega?.receptor || '')}</td><td>${a.entrega?.cobro ? h(a.entrega.cobro.forma) + ' ' + (a.entrega.cobro.importe ? eur(a.entrega.cobro.importe) : '') : ''}</td><td>${a.incidencia ? h(a.incidencia.tipo + ': ' + (a.incidencia.nota || '')) : ''}</td></tr>`).join('')}</tbody></table></div>`
  enlazarFecha()
  $('#xls').onclick = () => {
    const filas = l.map((a) => ({ Fecha: fechaES(a.fecha), Albarán: a.numero, 'Cód. cliente': a.cliente.codigo || '', Cliente: a.cliente.nombre, Dirección: dirTxt(a.cliente), Total: a.total, Repartidor: a.repartidor, Orden: a.orden, Estado: ESTADOS[a.estado], 'Hora entrega': horaDe(a.entrega?.hora), Recibe: a.entrega?.receptor || '', 'Forma de cobro': a.entrega?.cobro?.forma || '', 'Importe cobrado': Number(a.entrega?.cobro?.importe) || '', Incidencia: a.incidencia ? a.incidencia.tipo : '', 'Nota': a.incidencia?.nota || a.entrega?.nota || '', 'GPS entrega': a.entrega?.gps ? `${a.entrega.gps.lat.toFixed(5)},${a.entrega.gps.lng.toFixed(5)}` : '' }))
    const ws = XLSX.utils.json_to_sheet(filas); ws['!cols'] = Object.keys(filas[0] || {}).map((k) => ({ wch: Math.max(10, k.length + 2) }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Entregas')
    XLSX.writeFile(wb, `entregas-${V.fecha}.xlsx`)
  }
  $('#pdf').onclick = () => parteDia(l)
  $('#cps').onclick = () => { const f = l.filter((a) => a.entrega?.hora); if (!f.length) return toast('Aún no hay entregas firmadas.'); comprobante(f) }
}
function ventanaImpresion(titulo, cuerpo) {
  const w = window.open('', '_blank'); if (!w) return toast('Permite las ventanas emergentes para imprimir.')
  const base = location.href.replace(/[^/]*$/, '')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${h(titulo)}</title><style>@font-face{font-family:Fira;src:url(${base}assets/fira-400.woff2)}body{font-family:Fira,Arial,sans-serif;color:#1d1418;margin:24px}h1{color:#830040;font-size:20px;margin:0}.cab{display:flex;align-items:center;gap:16px;border-bottom:3px solid #830040;padding-bottom:10px;margin-bottom:14px}.cab .logo{background:#830040;padding:8px 12px;border-radius:6px}.cab img{height:30px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #ddd;padding:5px;text-align:left}th{background:#f6e9ef}.pag{page-break-after:always;margin-bottom:30px}.firma{height:120px;border:1px solid #ccc}.foto{max-height:160px}.mut{color:#6f6268;font-size:12px}</style></head><body>${cuerpo}<script>window.onload=()=>setTimeout(()=>print(),400)<\/script></body></html>`)
  w.document.close()
}
const cabecera = (t, sub) => `<div class="cab"><div class="logo"><img src="${location.href.replace(/[^/]*$/, '')}${LOGO}"></div><div><h1>${h(t)}</h1><div class="mut">${h(sub)}</div></div></div>`
function comprobante(lista) {
  ventanaImpresion('Comprobantes de entrega', lista.map((a) => { const e = a.entrega || {}
    return `<div class="pag">${cabecera('Comprobante de entrega · Albarán ' + a.numero, 'CONSTANTIN BECERRA S.L. · C/ Fernando el Católico, 34 · 21003 Huelva · 959 541 579')}
    <p><b>${h(a.cliente.nombre)}</b> ${a.cliente.codigo ? '(' + h(a.cliente.codigo) + ')' : ''}<br>${h(dirTxt(a.cliente))}</p>
    <table><thead><tr><th>Uds.</th><th>Artículo</th><th>Código</th></tr></thead><tbody>${(a.lineas || []).map((l) => `<tr><td>${h(l.unidades)}</td><td>${h(l.nombre)}</td><td>${h(l.codigo || '')}</td></tr>`).join('')}</tbody></table>
    <p>Total albarán: <b>${eur(a.total)}</b>${e.cobro ? ` · Cobro: <b>${h(e.cobro.forma)}</b> ${e.cobro.importe ? eur(e.cobro.importe) : ''}` : ''}</p>
    <p>Entregado el ${fechaES(a.fecha)} a las ${horaDe(e.hora)} por ${h(a.repartidor)}. Recibe: <b>${h(e.receptor || '')}</b>${e.gps ? ` <span class="mut">(GPS ${e.gps.lat.toFixed(5)}, ${e.gps.lng.toFixed(5)})</span>` : ''}</p>
    ${a.estado === 'parcial' ? `<p><b>Entrega parcial:</b> ${h(e.nota || '')}</p>` : e.nota ? `<p>Nota: ${h(e.nota)}</p>` : ''}
    <p>Firma del cliente:</p>${e.firma ? `<img class="firma" src="${e.firma}">` : '<div class="firma"></div>'} ${e.foto ? `<p>Foto de la entrega:</p><img class="foto" src="${e.foto}">` : ''}</div>` }).join(''))
}
function parteDia(l) {
  ventanaImpresion('Parte de reparto', cabecera('Parte de reparto · ' + (V.fecha === 'todas' ? 'todas las fechas' : fechaES(V.fecha)), 'Tierra Nuestra Huelva') +
  `<table><thead><tr><th>#</th><th>Albarán</th><th>Cliente</th><th>Dirección</th><th>Repartidor</th><th>Estado</th><th>Hora</th><th>Recibe</th><th>Cobro</th><th>Total</th></tr></thead><tbody>${l.map((a) => `<tr><td>${a.orden || ''}</td><td>${h(a.numero)}</td><td>${h(a.cliente.nombre)}</td><td>${h(dirTxt(a.cliente))}</td><td>${h(a.repartidor)}</td><td>${ESTADOS[a.estado]}${a.incidencia ? ': ' + h(a.incidencia.tipo) : ''}</td><td>${horaDe(a.entrega?.hora || a.incidencia?.hora)}</td><td>${h(a.entrega?.receptor || '')}</td><td>${a.entrega?.cobro ? h(a.entrega.cobro.forma) + ' ' + (a.entrega.cobro.importe ? eur(a.entrega.cobro.importe) : '') : ''}</td><td>${eur(a.total)}</td></tr>`).join('')}</tbody></table>`)
}

// ----- OFICINA: ajustes -----
function vAjustes(m) {
  m.innerHTML = `<h1>Ajustes</h1>
  <div class="card"><h2>Repartidores</h2><p class="mut">Un nombre por línea (furgonetas o personas).</p><textarea id="reps" rows="4">${h(S.repartidores.join('\n'))}</textarea><div style="margin-top:8px"><button class="btn" id="g-reps">Guardar</button></div></div>
  <div class="card"><h2>Punto de salida</h2><div>${h(S.salida.nombre)} · ${h(S.salida.direccion)}</div><p class="mut">Las rutas se calculan saliendo y volviendo aquí.</p></div>
  <div class="card"><h2>Conexión central</h2>${NUBE ? '<p>Activada: oficina y repartidores ven lo mismo en tiempo real.</p>' : '<p>Ahora mismo cada móvil guarda sus datos y la oficina envía las rutas por archivo (WhatsApp). Cuando se active la conexión central, todo se verá en tiempo real y las furgonetas aparecerán en el mapa.</p>'}</div>
  <div class="card"><h2>Copia de seguridad</h2><div class="row"><button class="btn sec" id="bk">📤 Descargar copia</button><button class="btn sec" id="rs">📥 Restaurar copia</button><button class="btn ko" id="old">Borrar días antiguos (más de 30 días)</button></div></div>
  <div class="card mut">Reparto · Tierra Nuestra — versión 1</div>`
  $('#g-reps').onclick = () => { S.repartidores = $('#reps').value.split('\n').map((s) => s.trim()).filter(Boolean); guardar(); toast('Guardado') }
  $('#bk').onclick = () => descargar(`copia-reparto-${hoy()}.json`, JSON.stringify({ tipo: 'tn-reparto', de: 'copia', albaranes: S.albaranes, repartidores: S.repartidores }), 'application/json')
  $('#rs').onclick = async () => { const f = await leerArchivo('.json'); if (f) importarJSON(await f.text()) }
  $('#old').onclick = () => { const lim = new Date(Date.now() - 30 * 864e5).toLocaleDateString('sv-SE'); const n = S.albaranes.filter((a) => a.fecha < lim).length; if (!n) return toast('No hay días antiguos.'); if (confirm(`¿Borrar ${n} albaranes de hace más de 30 días de este dispositivo?`)) { S.albaranes = S.albaranes.filter((a) => a.fecha >= lim); guardar(); toast('Borrados') } }
}

// ----- REPARTIDOR -----
function vMiRuta(m) {
  const fechas = [...new Set(S.albaranes.filter((a) => a.repartidor === U.nombre).map((a) => a.fecha))]
  if (V.fecha !== 'todas' && !fechas.includes(V.fecha) && fechas.length) V.fecha = fechas.includes(hoy()) ? hoy() : fechas.sort().pop()
  const l = ruta(U.nombre), hechas = l.filter(finalizado).length, sig = l.find((a) => !finalizado(a))
  m.innerHTML = `<div class="row" style="margin-bottom:8px"><h1 class="grow" style="margin:0">Hola, ${h(U.nombre)}</h1>${fechas.length > 1 ? selectorFecha() : `<span class="mut">${fechaES(V.fecha)}</span>`}</div>
  <div class="card"><div class="row"><b class="grow">${hechas} de ${l.length} paradas</b>${l.length > 1 ? '<button class="btn sm sec" id="opt">⚡ Reordenar desde aquí</button>' : ''}</div><div class="bar" style="margin-top:8px"><i style="width:${l.length ? (hechas / l.length) * 100 : 0}%"></i></div></div>
  ${!l.length ? `<div class="card"><p>No tienes paradas asignadas.</p>${NUBE ? '<p class="mut">Se actualiza sola cuando la oficina te asigne albaranes.</p>' : '<p class="mut">Abre el archivo de ruta que te envíe la oficina por WhatsApp:</p><button class="btn big" id="abrir">📥 Abrir ruta recibida</button>'}</div>` : ''}
  ${sig ? `<div class="card" style="border:2px solid var(--vino)"><div class="mut">SIGUIENTE PARADA</div><h2 style="margin:4px 0">${h(sig.cliente.nombre)}</h2><div>${h(dirTxt(sig.cliente))}</div>${sig.obs ? `<div style="margin-top:4px">📝 ${h(sig.obs)}</div>` : ''}
  <div class="choice" style="margin-top:12px"><a class="btn sec" target="_blank" href="${navURL(sig.cliente)}">🧭 Cómo llegar</a>${sig.cliente.telefono ? `<a class="btn sec" href="tel:${h(sig.cliente.telefono)}">📞 Llamar</a>` : '<span></span>'}</div>
  <div class="choice" style="margin-top:8px"><button class="btn ok big" data-ent="${sig.id}">✔ Entregar</button><button class="btn ko big" data-inc="${sig.id}">⚠ Incidencia</button></div></div>` : l.length ? '<div class="card" style="text-align:center"><h2>🎉 Ruta terminada</h2><p>Envía el resultado a la oficina.</p></div>' : ''}
  ${l.map((a, i) => `<div class="card stop" data-ver="${a.id}"><div class="num ${a.estado === 'incidencia' ? 'bad' : finalizado(a) ? 'done' : ''}">${finalizado(a) ? (a.estado === 'incidencia' ? '!' : '✓') : i + 1}</div><div class="grow"><b>${h(a.cliente.nombre)}</b><div class="mut">${h(dirTxt(a.cliente))}</div><div class="mut">Alb. ${h(a.numero)} · ${(a.lineas || []).reduce((s, x) => s + (Number(x.unidades) || 0), 0)} uds · ${eur(a.total)}</div></div>${pill(a.estado)}</div>`).join('')}
  ${!NUBE && l.length ? '<button class="btn sec" id="abrir" style="width:100%">📥 Abrir otra ruta recibida</button>' : ''}`
  enlazarFecha()
  if ($('#abrir')) $('#abrir').onclick = async () => { const f = await leerArchivo('.json,application/json'); if (f) importarJSON(await f.text()) }
  if ($('#opt')) $('#opt').onclick = () => optimizar(U.nombre)
  $$('[data-ent]').forEach((b) => (b.onclick = () => entregar(S.albaranes.find((x) => x.id === b.dataset.ent))))
  $$('[data-inc]').forEach((b) => (b.onclick = () => incidencia(S.albaranes.find((x) => x.id === b.dataset.inc))))
  $$('[data-ver]').forEach((c) => (c.onclick = () => paradaRepartidor(S.albaranes.find((x) => x.id === c.dataset.ver))))
}
function paradaRepartidor(a) {
  if (finalizado(a)) return detalle(a)
  modal(`<div class="row"><h2 class="grow">${h(a.cliente.nombre)}</h2>${pill(a.estado)}</div><div>${h(dirTxt(a.cliente))}</div>${a.obs ? `<div>📝 ${h(a.obs)}</div>` : ''}
  ${tablaLineas(a)}
  <div class="choice"><a class="btn sec" target="_blank" href="${navURL(a.cliente)}">🧭 Cómo llegar</a>${a.cliente.telefono ? `<a class="btn sec" href="tel:${h(a.cliente.telefono)}">📞 Llamar</a>` : '<span></span>'}<button class="btn ok big" id="p-ent">✔ Entregar</button><button class="btn ko big" id="p-inc">⚠ Incidencia</button></div>
  <button class="btn sec" style="width:100%;margin-top:8px" id="p-x">Cerrar</button>`)
  $('#p-x').onclick = cerrar; $('#p-ent').onclick = () => entregar(a); $('#p-inc').onclick = () => incidencia(a)
}
function firmaPad(cv) {
  const r = cv.getBoundingClientRect(), k = window.devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k
  const c = cv.getContext('2d'); c.scale(k, k); c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#1d1418'
  let on = false, vacio = true
  const p = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] }
  cv.onpointerdown = (e) => { on = true; vacio = false; cv.setPointerCapture(e.pointerId); c.beginPath(); c.moveTo(...p(e)) }
  cv.onpointermove = (e) => { if (on) { c.lineTo(...p(e)); c.stroke() } }
  cv.onpointerup = () => (on = false)
  return { vacio: () => vacio, limpiar: () => { c.clearRect(0, 0, cv.width, cv.height); vacio = true }, png: () => { const o = document.createElement('canvas'); o.width = 600; o.height = 600 * cv.height / cv.width; const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(cv, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', 0.7) } }
}
function entregar(a) {
  let forma = /contado|efectivo/i.test(a.formaPago || '') ? 'Efectivo' : (a.formaPago ? 'Ya pagado / a crédito' : ''), foto = null, parcial = false
  modal(`<h2>Entregar · ${h(a.cliente.nombre)}</h2><div class="mut">Albarán ${h(a.numero)} · ${eur(a.total)}${a.formaPago ? ' · ' + h(a.formaPago) : ''}</div>
  <div class="col" style="margin-top:12px">
  <label>¿Quién recibe?</label><input id="e-rec" placeholder="Nombre de quien recibe">
  <label>Firma del cliente</label><canvas class="firma" id="e-fir"></canvas><button class="btn sm sec" id="e-lim" style="align-self:flex-start">Borrar firma</button>
  <label>Cobro</label><div class="choice" id="e-cob">${COBROS.map((c) => `<button data-c="${c}" class="${c === forma ? 'on' : ''}">${c}</button>`).join('')}</div>
  <div id="e-imp-w" class="col"><label>Importe cobrado €</label><input id="e-imp" type="number" step="0.01" inputmode="decimal" value="${a.total || ''}"></div>
  <label><input type="checkbox" id="e-par" class="chk" style="width:auto;vertical-align:middle"> Entrega parcial (falta algo)</label>
  <label>Nota (opcional)</label><input id="e-not" placeholder="p. ej. dejado en almacén, falta 1 caja…">
  <label>Foto (opcional)</label><input type="file" accept="image/*" capture="environment" id="e-fot"><img id="e-prev" class="foto hidden">
  <button class="btn ok big" id="e-ok">✔ Confirmar entrega</button><button class="btn sec" id="e-x">Cancelar</button></div>`)
  const pad = firmaPad($('#e-fir'))
  const verImp = () => { $('#e-imp-w').style.display = ['Efectivo', 'Tarjeta (TPV)', 'Bizum'].includes(forma) ? '' : 'none' }; verImp()
  $('#e-lim').onclick = pad.limpiar; $('#e-x').onclick = cerrar
  $$('#e-cob button').forEach((b) => (b.onclick = () => { forma = b.dataset.c; $$('#e-cob button').forEach((x) => x.classList.toggle('on', x === b)); verImp() }))
  $('#e-fot').onchange = async (e) => { if (e.target.files[0]) { foto = await reducirFoto(e.target.files[0]); $('#e-prev').src = foto; $('#e-prev').classList.remove('hidden') } }
  $('#e-ok').onclick = async () => {
    if (pad.vacio() && !confirm('No hay firma. ¿Confirmar igualmente?')) return
    if (!forma) return toast('Indica el cobro')
    parcial = $('#e-par').checked
    if (parcial && !$('#e-not').value.trim()) return toast('Escribe en la nota qué falta')
    $('#e-ok').disabled = true
    const gps = await gpsAhora()
    a.entrega = { hora: ahora(), receptor: $('#e-rec').value.trim(), firma: pad.vacio() ? null : pad.png(), foto, gps, nota: $('#e-not').value.trim(), cobro: { forma, importe: ['Efectivo', 'Tarjeta (TPV)', 'Bizum'].includes(forma) ? Number($('#e-imp').value) || 0 : 0 } }
    delete a.incidencia; a.estado = parcial ? 'parcial' : 'entregado'; tocar(a); cerrar(); toast('Entrega registrada ✔'); render()
  }
}
function incidencia(a) {
  let tipo = '', foto = null
  modal(`<h2>Incidencia · ${h(a.cliente.nombre)}</h2><div class="col" style="margin-top:10px">
  <div class="choice" id="i-tip">${INCID.map((c) => `<button data-c="${c}">${c}</button>`).join('')}</div>
  <label>Explica qué ha pasado</label><textarea id="i-not" rows="3"></textarea>
  <label>Foto (opcional)</label><input type="file" accept="image/*" capture="environment" id="i-fot"><img id="i-prev" class="foto hidden">
  <button class="btn ko big" id="i-ok">Registrar incidencia</button><button class="btn sec" id="i-x">Cancelar</button></div>`)
  $('#i-x').onclick = cerrar
  $$('#i-tip button').forEach((b) => (b.onclick = () => { tipo = b.dataset.c; $$('#i-tip button').forEach((x) => x.classList.toggle('on', x === b)) }))
  $('#i-fot').onchange = async (e) => { if (e.target.files[0]) { foto = await reducirFoto(e.target.files[0]); $('#i-prev').src = foto; $('#i-prev').classList.remove('hidden') } }
  $('#i-ok').onclick = async () => {
    if (!tipo) return toast('Elige el tipo de incidencia')
    $('#i-ok').disabled = true
    a.incidencia = { tipo, nota: $('#i-not').value.trim(), foto, hora: ahora(), gps: await gpsAhora() }; a.estado = 'incidencia'; tocar(a); cerrar(); toast('Incidencia registrada. La oficina la verá.'); render()
  }
}
function vEnviar(m) {
  const l = ruta(U.nombre), hechas = l.filter(finalizado)
  m.innerHTML = `<h1>Enviar a la oficina</h1>${NUBE ? '<div class="card"><p>✔ Con la conexión central, cada entrega llega sola a la oficina en el momento.</p><button class="btn" id="sync">↻ Sincronizar ahora</button></div>' : `<div class="card"><p>Tienes <b>${hechas.length}</b> paradas hechas de ${l.length}. Pulsa el botón y envía el archivo a la oficina por WhatsApp.</p><button class="btn big" id="env">📤 Enviar resultado</button></div>`}`
  if ($('#env')) $('#env').onclick = () => compartirArchivo(`entregas-${U.nombre.replace(/\s+/g, '_')}-${V.fecha}.json`, JSON.stringify({ tipo: 'tn-reparto', de: U.nombre, albaranes: l }), 'Entregas de ' + U.nombre)
  if ($('#sync')) $('#sync').onclick = async () => { await Nube.subir(l); await Nube.bajar(); toast('Sincronizado') }
}

render()
if (NUBE) Nube.bajar()
})()
