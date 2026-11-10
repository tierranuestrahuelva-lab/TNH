/* Comerciales · Tierra Nuestra — clientes, ficha, catálogo con tarifas y pedidos (borradores sin conexión) */
(function () {
'use strict'
const R = () => window.TNR
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const eur = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
const uid = () => Math.random().toString(36).slice(2, 10)
const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const M = window.TN_MEDIA || { img: [], ficha: [], estilo: {} }
const IMG = new Set(M.img), FICHA = new Set(M.ficha)
const VINOS = '../vinos/'
const foto = (c) => IMG.has(c) ? `${VINOS}img/${10000000 + Number(c)}.jpg` : ''
const ficha = (c) => FICHA.has(c) ? `${VINOS}fichas/${10000000 + Number(c)}.pdf` : ''
const TARIFAS = { pvp5: 'HORECA (PVP 5)', pvp1: 'Tienda (PVP 1)', pvp4: 'Asociado (PVP 4)', pvp6: 'Sin IVA (PVP 6)' }
const GRUPOS = [['Todos', () => true], ['Tintos', (t) => /^tinto/i.test(t)], ['Blancos', (t) => /^blanco/i.test(t)], ['Rosados', (t) => /rosado/i.test(t)], ['Espumosos', (t) => /espum/i.test(t)], ['Generosos', (t) => /generos|encabez/i.test(t)], ['Magnum', (t) => /magnum/i.test(t)], ['Destilados', (t) => /licor|spirit|ginebra|ron|whisky|vodka|brandy/i.test(t)], ['Gourmet y regalos', (t) => /gastron|aceite|cesta|caja|regalo|selecc/i.test(t)], ['Cristalería y accesorios', (t) => /cristal|accesor|soporte/i.test(t)]]

// ---------- datos ----------
const KEY = 'tn-comercial-v1'
const C = Object.assign({ borradores: [], tarifa: 'pvp5' }, JSON.parse(localStorage.getItem(KEY) || '{}'))
const guardarC = () => localStorage.setItem(KEY, JSON.stringify(C))
let CAT = JSON.parse(localStorage.getItem('tn-com-cat') || '[]'), catOk = false, WAC = [], SALDOS = {}, WAP = []
async function cargar() {
  if (catOk) return
  try {
    const todo = []
    for (let off = 0; ; off += 1000) { const pag = await R().Nube.api(`wa_articulos?select=codigo,nombre,volumen,tipo,bodega,denominacion,variedades,pvp1,pvp5,pvp4,pvp6&activo=eq.true&order=nombre&limit=1000&offset=${off}`); todo.push(...pag); if (pag.length < 1000) break }
    CAT = todo
    localStorage.setItem('tn-com-cat', JSON.stringify(CAT)); catOk = true
    WAC = await R().Nube.api('wa_clientes?select=telefono,codigo,nombre')
    SALDOS = Object.fromEntries((await R().Nube.api('wa_saldos?select=codigo,pendiente,detalle,upd')).map((s) => [s.codigo, s]))
    WAP = await R().Nube.api('wa_pedidos?select=id,cliente_codigo,lineas,estado,creado&estado=neq.anulado&order=creado.desc&limit=500')
    R().render()
  } catch (e) {}
}
const art = (c) => CAT.find((a) => a.codigo === c)
function buscarArt(q, n = 30) {
  const t = sinAcento(q).split(/\s+/).filter(Boolean); if (!t.length) return []
  return CAT.map((a) => { const s = sinAcento(a.nombre + ' ' + a.bodega + ' ' + a.denominacion + ' ' + a.codigo); const ok = t.every((w) => s.includes(w)); return ok ? [a, sinAcento(a.nombre).startsWith(t[0]) ? 0 : 1] : null }).filter(Boolean).sort((x, y) => x[1] - y[1] || x[0].nombre.localeCompare(y[0].nombre)).slice(0, n).map((x) => x[0])
}
function clientes() {
  const m = new Map()
  for (const [cod, c] of Object.entries(R().S.clientes || {})) m.set(cod, Object.assign({ codigo: cod }, c))
  for (const a of R().S.albaranes) if (a.cliente?.codigo && !m.has(a.cliente.codigo)) m.set(a.cliente.codigo, Object.assign({}, a.cliente))
  for (const w of WAC) if (w.codigo && !m.has(w.codigo)) m.set(w.codigo, { codigo: w.codigo, nombre: w.nombre, telefono: w.telefono })
  return [...m.values()].filter((c) => c.nombre).sort((a, b) => a.nombre.localeCompare(b.nombre))
}
function historial(cod) {
  const alb = R().S.albaranes.filter((a) => a.cliente?.codigo === cod).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const wa = WAP.filter((p) => p.cliente_codigo === cod)
  const cuenta = new Map()
  for (const a of alb) for (const l of a.lineas || []) { const x = cuenta.get(l.codigo) || { codigo: l.codigo, nombre: l.nombre, veces: 0, ult: '' }; x.veces++; if ((a.fecha || '') >= x.ult) { x.ult = a.fecha || ''; x.ultCant = Number(l.unidades) || 1; x.unidad = l.unidad || 'botellas' } if (l.codigo) cuenta.set(l.codigo, x) }
  for (const p of wa) for (const l of p.lineas || []) { const f = (p.creado || '').slice(0, 10); const x = cuenta.get(l.codigo) || { codigo: l.codigo, nombre: l.descripcion, veces: 0, ult: '' }; x.veces++; if (f >= x.ult) { x.ult = f; x.ultCant = Number(l.cantidad) || 1; x.unidad = l.unidad || 'botellas' } if (l.codigo) cuenta.set(l.codigo, x) }
  return { alb, wa, habituales: [...cuenta.values()].sort((a, b) => b.veces - a.veces || b.ult.localeCompare(a.ult)).slice(0, 20) }
}
function manana() { const d = new Date(); d.setDate(d.getDate() + 1); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d.toLocaleDateString('sv-SE') }
function nuevoBorrador(cli, lineas = []) {
  const b = { id: 'b-' + uid(), cliente: Object.assign({}, cli), tarifa: C.tarifa, fecha: manana(), obs: '', lineas, creado: new Date().toISOString() }
  C.borradores.unshift(b); guardarC(); return b
}
const precio = (b, l) => Number(art(l.codigo)?.[b.tarifa]) || 0
function total(b) { return b.lineas.reduce((s, l) => s + (l.unidad === 'cajas' ? 0 : precio(b, l) * l.unidades), 0) }
function añadir(b, a, cant = 1, unidad = 'botellas') {
  const l = b.lineas.find((x) => x.codigo === a.codigo && x.unidad === unidad)
  if (l) l.unidades += cant; else b.lineas.push({ codigo: a.codigo, nombre: a.nombre, unidades: cant, unidad })
  b.upd = Date.now(); guardarC()
}

// ---------- pantallas ----------
let V = { cli: null, bor: null, q: '', grupo: 'Todos', cq: '' }
function cabecera(m, titulo, extra = '') { m.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="margin:0">${titulo}</h1>${extra}</div>` }
function vClientes(m) {
  cargar()
  if (V.bor) return vPedido(m, C.borradores.find((b) => b.id === V.bor))
  if (V.cli) return vFicha(m)
  const lista = clientes(), q = sinAcento(V.cq)
  const fil = q ? lista.filter((c) => sinAcento(c.nombre + ' ' + c.codigo + ' ' + (c.poblacion || '') + ' ' + (c.telefono || '')).includes(q)) : lista
  cabecera(m, 'Clientes', '<button class="btn sm" id="cl-nuevo">＋ Cliente nuevo</button>')
  m.insertAdjacentHTML('beforeend', `<input id="cl-q" placeholder="🔍 Buscar por nombre, código, pueblo o teléfono" value="${h(V.cq)}" style="margin-bottom:10px">
  ${!lista.length ? '<div class="card mut">Todavía no hay clientes. Llegarán solos con la conexión a Sage; mientras tanto puedes crear un pedido con «Cliente nuevo».</div>' : ''}
  ${fil.slice(0, 150).map((c) => { const s = SALDOS[c.codigo]; return `<div class="card stop" data-cli="${h(c.codigo)}"><div class="num">${h((c.nombre || '?')[0])}</div><div class="grow"><b>${h(c.nombre)}</b><div class="mut">${h([c.codigo, c.poblacion, c.telefono].filter(Boolean).join(' · '))}</div></div>${s && Number(s.pendiente) > 0 ? `<span class="pill" style="background:var(--warn)">Debe ${eur(s.pendiente)}</span>` : ''}</div>` }).join('')}
  ${fil.length > 150 ? `<div class="mut">Y ${fil.length - 150} más: afina la búsqueda.</div>` : ''}`)
  const qi = $('#cl-q'); qi.oninput = () => { V.cq = qi.value; const p = qi.selectionStart; R().render(); const n = $('#cl-q'); n.focus(); n.setSelectionRange(p, p) }
  $$('[data-cli]').forEach((b) => (b.onclick = () => { V.cli = lista.find((c) => c.codigo === b.dataset.cli); R().render(); window.scrollTo(0, 0) }))
  $('#cl-nuevo').onclick = () => {
    R().modal(`<h2>Cliente nuevo</h2><div class="col"><label>Nombre</label><input id="cn-n"><label>Teléfono</label><input id="cn-t" type="tel"><label>Dirección</label><input id="cn-d"><label>Población</label><input id="cn-p" value="Huelva"><p class="mut">La oficina le dará de alta en Sage con su código.</p><button class="btn big" id="cn-ok">Crear pedido para este cliente</button></div>`)
    $('#cn-ok').onclick = () => { const n = $('#cn-n').value.trim(); if (!n) return R().toast('Falta el nombre'); const b = nuevoBorrador({ codigo: '', nombre: n, telefono: $('#cn-t').value, direccion: $('#cn-d').value, poblacion: $('#cn-p').value, nuevo: true }); R().cerrar(); V.bor = b.id; R().render() }
  }
}
function vFicha(m) {
  const c = V.cli, { alb, wa, habituales } = historial(c.codigo), s = SALDOS[c.codigo]
  const bor = C.borradores.filter((b) => b.cliente.codigo === c.codigo)
  m.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sec sm" id="fi-vol">◀ Clientes</button><h1 class="grow" style="margin:0;font-size:20px">${h(c.nombre)}</h1></div>
  <div class="card"><div class="mut">Cliente ${h(c.codigo || 'nuevo')}</div><div>${h([c.direccion, c.cp, c.poblacion].filter(Boolean).join(', '))}</div>
  <div class="row" style="margin-top:8px">${c.telefono ? `<a class="btn sec sm" href="tel:${h(c.telefono)}">📞 Llamar</a><a class="btn sec sm" target="_blank" href="https://wa.me/34${h(String(c.telefono).replace(/\D/g, '').replace(/^34/, ''))}">💬 WhatsApp</a>` : ''}${c.direccion ? `<a class="btn sec sm" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([c.direccion, c.poblacion].join(', '))}">🗺 Mapa</a>` : ''}</div></div>
  <div class="stats"><div class="stat"><b style="color:${s && Number(s.pendiente) > 0 ? 'var(--warn)' : 'var(--ok)'}">${s ? eur(s.pendiente) : '—'}</b><span>${s ? 'Pendiente de cobro' : 'Deuda: llegará con Sage'}</span></div><div class="stat"><b>${alb.length}</b><span>Albaranes en la app</span></div><div class="stat"><b>${wa.length}</b><span>Pedidos por WhatsApp</span></div></div>
  ${s && Number(s.pendiente) > 300 ? `<div class="card" style="border:2px solid var(--warn)">⚠ <b>Atención:</b> este cliente tiene ${eur(s.pendiente)} pendientes. Consulta con la oficina antes de servir más.</div>` : ''}
  <div class="row" style="margin-bottom:12px"><button class="btn big grow" id="fi-nuevo" style="width:auto">🛒 Nuevo pedido</button>${habituales.length ? '<button class="btn big sec grow" id="fi-rep" style="width:auto">🔁 Pedido con sus habituales</button>' : ''}</div>
  ${bor.length ? `<div class="card" style="border:2px solid var(--azul)"><h3>Borradores sin enviar</h3>${bor.map((b) => `<div class="row"><span class="grow">${b.lineas.length} artículos · ${new Date(b.creado).toLocaleString('es-ES')}</span><button class="btn sm" data-bor="${b.id}">Seguir</button></div>`).join('')}</div>` : ''}
  <div class="card"><h3>Lo que suele pedir</h3>${habituales.length ? `<table class="lineas">${habituales.map((x) => `<tr><td>${h(x.nombre)}</td><td class="mut" style="white-space:nowrap">${x.veces} ${x.veces === 1 ? 'vez' : 'veces'} · últ. ${h(x.ultCant)} ${h(x.unidad)}</td></tr>`).join('')}</table>` : '<div class="mut">Sin historial todavía. Con la conexión a Sage saldrán aquí sus vinos más comprados.</div>'}</div>
  <div class="card"><h3>Historial</h3>${[...alb.map((a) => `<div class="row"><span class="grow">📄 ${h(R().fechaES(a.fecha))} · Alb. ${h(a.numero)}${a.origen === 'comercial' ? ' · ' + h(a.comercial || '') : ''}</span><span class="mut">${a.total ? eur(a.total) : ''} ${h(R().ESTADOS?.[a.estado] || a.estado)}</span></div>`), ...wa.map((p) => `<div class="row"><span class="grow">💬 ${h(new Date(p.creado).toLocaleDateString('es-ES'))} · WhatsApp ${p.lineas.length} artículos</span><span class="mut">${h(p.estado)}</span></div>`)].join('') || '<div class="mut">Sin documentos todavía.</div>'}</div>`
  $('#fi-vol').onclick = () => { V.cli = null; R().render() }
  $('#fi-nuevo').onclick = () => { V.bor = nuevoBorrador(c).id; R().render(); window.scrollTo(0, 0) }
  if ($('#fi-rep')) $('#fi-rep').onclick = () => { V.bor = nuevoBorrador(c, habituales.filter((x) => art(x.codigo)).map((x) => ({ codigo: x.codigo, nombre: art(x.codigo).nombre, unidades: 0, unidad: x.unidad }))).id; R().render(); R().toast('Pon la cantidad en los que quiera; los que se queden a 0 no se envían.', 5000) }
  $$('[data-bor]').forEach((b) => (b.onclick = () => { V.bor = b.dataset.bor; R().render() }))
}
function vPedido(m, b) {
  if (!b) { V.bor = null; return R().render() }
  const res = V.q ? buscarArt(V.q, 12) : []
  const lin = b.lineas.filter((l) => l.unidades > 0).length
  m.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sec sm" id="pe-vol">◀ Salir</button><div class="grow"><b>${h(b.cliente.nombre)}</b><div class="mut">Borrador guardado en este dispositivo</div></div></div>
  <div class="card row"><div class="grow col" style="min-width:150px"><label>Tarifa</label><select id="pe-tar">${Object.entries(TARIFAS).map(([k, t]) => `<option value="${k}" ${k === b.tarifa ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="grow col" style="min-width:150px"><label>Entrega</label><input id="pe-fec" type="date" value="${h(b.fecha)}"></div></div>
  <div class="card"><input id="pe-q" placeholder="🔍 Añadir vino: escribe nombre, bodega o código · o lee el código de barras" value="${h(V.q)}" autocomplete="off">
  ${res.map((a) => `<div class="row" style="border-bottom:1px solid var(--borde);padding:6px 0">${foto(a.codigo) ? `<img src="${foto(a.codigo)}" style="width:34px;height:48px;object-fit:contain">` : ''}<div class="grow"><b>${h(a.nombre)}</b><div class="mut">${h(a.bodega || '')} · ${eur(a[b.tarifa])}/bot.</div></div><button class="btn sm" data-add="${h(a.codigo)}" data-u="botellas">+ Bot.</button><button class="btn sec sm" data-add="${h(a.codigo)}" data-u="cajas">+ Caja</button></div>`).join('')}
  ${V.q && !res.length ? '<div class="mut" style="margin-top:6px">No encuentro ese vino en el catálogo.</div>' : ''}</div>
  <div class="card"><h3>Pedido (${lin} artículos)</h3>${b.lineas.length ? b.lineas.map((l, i) => `<div class="row" style="border-bottom:1px solid var(--borde);padding:8px 0;${l.unidades ? '' : 'opacity:.55'}"><div class="grow" style="min-width:160px"><b>${h(l.nombre)}</b><div class="mut">${l.unidad === 'cajas' ? 'Precio según caja' : eur(precio(b, l)) + '/bot. · ' + eur(precio(b, l) * l.unidades)}</div></div>
    <div class="row" style="gap:4px"><button class="btn sec sm" data-menos="${i}">−</button><input data-cant="${i}" type="number" min="0" value="${l.unidades}" style="width:64px;text-align:center;font-size:18px;padding:6px"><button class="btn sec sm" data-mas="${i}">+</button>
    <select data-uni="${i}" style="width:auto;padding:6px"><option value="botellas" ${l.unidad !== 'cajas' ? 'selected' : ''}>bot.</option><option value="cajas" ${l.unidad === 'cajas' ? 'selected' : ''}>cajas</option></select><button class="btn ko sm" data-del="${i}">✕</button></div></div>`).join('') : '<div class="mut">Busca arriba los vinos o añádelos desde la pestaña Catálogo.</div>'}
  <div style="text-align:right;margin-top:8px">Total aprox. botellas: <b>${eur(total(b))}</b>${b.lineas.some((l) => l.unidad === 'cajas' && l.unidades) ? '<div class="mut">Las cajas se valoran en la oficina.</div>' : ''}</div></div>
  <div class="card"><label>Observaciones para la oficina y el almacén</label><textarea id="pe-obs" rows="2">${h(b.obs)}</textarea></div>
  <div class="row"><button class="btn big ok grow" id="pe-env" style="width:auto" ${lin ? '' : 'disabled'}>📤 Enviar pedido</button><button class="btn sec" id="pe-bor">🗑 Borrar borrador</button></div>`
  const cambio = () => { b.upd = Date.now(); guardarC() }
  $('#pe-vol').onclick = () => { V.bor = null; V.q = ''; R().render() }
  $('#pe-tar').onchange = (e) => { b.tarifa = C.tarifa = e.target.value; cambio(); R().render() }
  $('#pe-fec').onchange = (e) => { b.fecha = e.target.value; cambio() }
  $('#pe-obs').oninput = (e) => { b.obs = e.target.value; cambio() }
  const q = $('#pe-q')
  q.oninput = () => { V.q = q.value; const p = q.selectionStart; R().render(); const n = $('#pe-q'); n.focus(); n.setSelectionRange(p, p) }
  q.onkeydown = (e) => {
    if (e.key !== 'Enter') return
    const v = q.value.trim(), c = window.TNP?.codigoDe?.(v), a = c && art(c.c)
    if (a) { añadir(b, a, c.caja ? 1 : 1, c.caja ? 'cajas' : 'botellas'); V.q = ''; R().render(); R().toast('Añadido: ' + a.nombre) }
    else if (res.length === 1) { añadir(b, res[0]); V.q = ''; R().render() }
  }
  $$('[data-add]').forEach((x) => (x.onclick = () => { añadir(b, art(x.dataset.add), 1, x.dataset.u); V.q = ''; R().render(); R().toast('Añadido') }))
  $$('[data-menos]').forEach((x) => (x.onclick = () => { const l = b.lineas[x.dataset.menos]; l.unidades = Math.max(0, l.unidades - 1); cambio(); R().render() }))
  $$('[data-mas]').forEach((x) => (x.onclick = () => { b.lineas[x.dataset.mas].unidades++; cambio(); R().render() }))
  $$('[data-cant]').forEach((x) => (x.onchange = () => { b.lineas[x.dataset.cant].unidades = Math.max(0, Number(x.value) || 0); cambio(); R().render() }))
  $$('[data-uni]').forEach((x) => (x.onchange = () => { b.lineas[x.dataset.uni].unidad = x.value; cambio(); R().render() }))
  $$('[data-del]').forEach((x) => (x.onclick = () => { b.lineas.splice(Number(x.dataset.del), 1); cambio(); R().render() }))
  $('#pe-bor').onclick = () => { if (!confirm('¿Borrar este borrador?')) return; C.borradores = C.borradores.filter((x) => x !== b); guardarC(); V.bor = null; R().render() }
  $('#pe-env').onclick = () => enviar(b)
}
async function enviar(b) {
  const lineas = b.lineas.filter((l) => l.unidades > 0)
  if (!lineas.length) return
  if (!confirm(`¿Enviar a la oficina el pedido de ${b.cliente.nombre} (${lineas.length} artículos) para el ${R().fechaES(b.fecha)}?`)) return
  const g = await Promise.race([Promise.resolve(R().gpsAhora?.()).catch(() => null), new Promise((ok) => setTimeout(() => ok(null), 4000))])
  const n = new Date()
  const a = { id: 'com-' + uid(), numero: 'COM-' + n.toTimeString().slice(0, 5).replace(':', '') + '-' + uid().slice(0, 3).toUpperCase(), fecha: b.fecha, origen: 'comercial', comercial: R().U.nombre, tarifa: b.tarifa,
    cliente: Object.assign({ codigo: '', nombre: '', direccion: '', cp: '', poblacion: '', telefono: '' }, b.cliente), lineas: lineas.map((l) => ({ codigo: l.codigo, nombre: l.nombre, unidades: l.unidades, unidad: l.unidad })),
    total: Math.round(total(b) * 100) / 100, obs: [b.obs, b.cliente.nuevo ? 'CLIENTE NUEVO: dar de alta en Sage' : ''].filter(Boolean).join(' · '), estado: 'pendiente', repartidor: '', orden: 0, creado: n.toISOString(), gps: g ? { lat: g.lat, lng: g.lng } : null }
  R().S.albaranes.push(a); R().tocar(a)
  C.borradores = C.borradores.filter((x) => x !== b); guardarC(); V.bor = null; V.q = ''
  const resumen = `*Pedido Tierra Nuestra*\n${a.cliente.nombre}\nEntrega: ${R().fechaES(a.fecha)}\n` + a.lineas.map((l) => `- ${l.unidades} ${l.unidad} de ${l.nombre}`).join('\n') + (a.obs ? `\nNotas: ${a.obs}` : '')
  R().modal(`<h2>✅ Pedido enviado</h2><p>Llega a la oficina y al almacén en cuanto haya internet${R().Nube.estado === 'ok' ? ' (ahora mismo hay conexión)' : '. <b>Ahora no hay conexión:</b> se enviará solo al recuperarla'}.</p>
  <div class="col">${a.cliente.telefono ? `<a class="btn big" target="_blank" href="https://wa.me/34${h(String(a.cliente.telefono).replace(/\D/g, '').replace(/^34/, ''))}?text=${encodeURIComponent(resumen)}">💬 Mandar resumen al cliente por WhatsApp</a>` : ''}<button class="btn sec big" id="en-ok">Cerrar</button></div>`)
  $('#en-ok').onclick = () => { R().cerrar(); R().render() }
}
function vPedidos(m) {
  cargar()
  if (V.bor) return vPedido(m, C.borradores.find((b) => b.id === V.bor))
  const yo = R().U.nombre
  const env = R().S.albaranes.filter((a) => a.origen === 'comercial' && a.comercial === yo).sort((a, b) => (b.creado || '').localeCompare(a.creado || '')).slice(0, 60)
  const pend = R().Nube.pendientes?.() || 0
  cabecera(m, 'Mis pedidos')
  m.insertAdjacentHTML('beforeend', `${pend ? `<div class="card" style="border:2px solid var(--warn)">⏳ ${pend} cambios esperando conexión para enviarse.</div>` : ''}
  <div class="card"><h3>Borradores (${C.borradores.length})</h3>${C.borradores.map((b) => `<div class="row" style="border-bottom:1px solid var(--borde);padding:6px 0"><span class="grow"><b>${h(b.cliente.nombre)}</b><div class="mut">${b.lineas.filter((l) => l.unidades).length} artículos · ${new Date(b.creado).toLocaleString('es-ES')}</div></span><button class="btn sm" data-bor="${b.id}">Seguir</button></div>`).join('') || '<div class="mut">No tienes borradores.</div>'}</div>
  <div class="card"><h3>Enviados</h3>${env.map((a) => `<div class="row" style="border-bottom:1px solid var(--borde);padding:6px 0"><span class="grow"><b>${h(a.cliente.nombre)}</b><div class="mut">${h(R().fechaES(a.fecha))} · ${a.lineas.length} artículos · ${eur(a.total)}</div></span><span class="pill" style="background:#8a7f85">${h(a.prep?.estado ? { preparando: 'Preparando', preparado: 'Preparado', cargado: 'Cargado' }[a.prep.estado] : R().ESTADOS?.[a.estado] || a.estado)}</span></div>`).join('') || '<div class="mut">Todavía no has enviado pedidos.</div>'}</div>`)
  $$('[data-bor]').forEach((b) => (b.onclick = () => { V.bor = b.dataset.bor; R().render() }))
}
function vCatalogo(m) {
  cargar()
  const bor = C.borradores.find((b) => b.id === V.borCat) || null
  const g = GRUPOS.find((x) => x[0] === V.grupo) || GRUPOS[0]
  const base = V.cat ? buscarArt(V.cat, 2000) : CAT
  const lista = base.filter((a) => g[1](a.tipo || ''))
  cabecera(m, 'Catálogo', `<select id="ca-tar" style="width:auto">${Object.entries(TARIFAS).map(([k, t]) => `<option value="${k}" ${k === C.tarifa ? 'selected' : ''}>${t}</option>`).join('')}</select>`)
  m.insertAdjacentHTML('beforeend', `<input id="ca-q" placeholder="🔍 Buscar vino, bodega, D.O. o código" value="${h(V.cat || '')}" style="margin-bottom:8px">
  <div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:nowrap;overflow-x:auto">${GRUPOS.map(([n]) => `<button class="btn sm ${n === V.grupo ? '' : 'sec'}" data-gr="${h(n)}" style="white-space:nowrap">${h(n)}</button>`).join('')}</div>
  <div class="card row"><span class="grow">${lista.length} artículos${C.borradores.length ? ` · Añadir a: <select id="ca-bor" style="width:auto">${'<option value="">— elige pedido —</option>' + C.borradores.map((b) => `<option value="${b.id}" ${bor === b ? 'selected' : ''}>${h(b.cliente.nombre)}</option>`).join('')}</select>` : ''}</span><button class="btn sec sm" id="ca-pdf">📄 Catálogo PDF</button></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">${lista.slice(0, 120).map((a) => `<div class="card" style="margin:0;display:flex;gap:10px"><div style="width:56px;height:100px;flex:none;display:flex;align-items:center;justify-content:center;background:#faf7f8;border-radius:8px">${foto(a.codigo) ? `<img loading="lazy" src="${foto(a.codigo)}" style="max-width:56px;max-height:100px;object-fit:contain">` : '<span style="font-size:34px;opacity:.35">🍷</span>'}</div>
    <div class="grow" style="min-width:0"><b style="font-size:15px">${h(a.nombre)}</b><div class="mut" style="font-size:13px">${h([a.bodega && a.bodega.replace(/\(.*?\)|\d{2,}/g, '').trim(), a.denominacion, a.volumen && Number(a.volumen) ? (Number(a.volumen) * 100).toLocaleString('es-ES') + ' cl' : ''].filter(Boolean).join(' · '))}</div>
    <div style="font-size:18px;font-weight:700;color:var(--vino);margin:4px 0">${eur(a[C.tarifa])}</div><div class="row" style="gap:4px">${bor ? `<button class="btn sm" data-ca="${h(a.codigo)}">+ Añadir</button>` : ''}${ficha(a.codigo) ? `<a class="btn sec sm" target="_blank" href="${ficha(a.codigo)}">Ficha</a>` : ''}</div></div></div>`).join('')}</div>
  ${lista.length > 120 ? `<p class="mut">Se muestran 120 de ${lista.length}: usa el buscador o los filtros.</p>` : ''}`)
  const q = $('#ca-q'); q.oninput = () => { V.cat = q.value; const p = q.selectionStart; R().render(); const n = $('#ca-q'); n.focus(); n.setSelectionRange(p, p) }
  $('#ca-tar').onchange = (e) => { C.tarifa = e.target.value; guardarC(); R().render() }
  $$('[data-gr]').forEach((b) => (b.onclick = () => { V.grupo = b.dataset.gr; R().render() }))
  if ($('#ca-bor')) $('#ca-bor').onchange = (e) => { V.borCat = e.target.value; R().render() }
  $$('[data-ca]').forEach((b) => (b.onclick = () => { añadir(bor, art(b.dataset.ca)); R().toast('Añadido al pedido de ' + bor.cliente.nombre) }))
  $('#ca-pdf').onclick = () => catalogoPDF(lista)
}
function catalogoPDF(lista) {
  R().modal(`<h2>Catálogo en PDF</h2><p class="mut">${lista.length} artículos (los de la búsqueda y el filtro actual).</p><div class="col"><label>Precios</label><select id="pd-p"><option value="">Sin precios</option>${Object.entries(TARIFAS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select><label>Para (opcional)</label><input id="pd-c" placeholder="Nombre del cliente"><button class="btn big" id="pd-ok">Crear PDF</button></div>`)
  $('#pd-ok').onclick = () => {
    const t = $('#pd-p').value, para = $('#pd-c').value.trim(); R().cerrar()
    const abs = (u) => new URL(u, location.href).href
    const w = window.open('', '_blank'); if (!w) return R().toast('Permite las ventanas emergentes.')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Catálogo Tierra Nuestra</title><style>@page{size:A4;margin:12mm}body{font-family:system-ui,sans-serif;color:#1d1418}h1{color:#830040;margin:0}.g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.v{border:1px solid #eadde3;border-radius:8px;padding:8px;display:flex;gap:8px;break-inside:avoid}.v img{width:40px;height:90px;object-fit:contain}.n{font-weight:700;font-size:12px}.m{font-size:10px;color:#6f6268}.p{color:#830040;font-weight:700;margin-top:4px}</style></head><body>
    <h1>Tierra Nuestra · Vinos de España</h1><p>${para ? 'Selección para <b>' + h(para) + '</b> · ' : ''}${new Date().toLocaleDateString('es-ES')}${t ? ' · Tarifa ' + h(TARIFAS[t]) : ''}</p><div class="g">${lista.slice(0, 400).map((a) => `<div class="v">${foto(a.codigo) ? `<img src="${abs(foto(a.codigo))}">` : ''}<div><div class="n">${h(a.nombre)}</div><div class="m">${h([a.bodega && a.bodega.replace(/\(.*?\)|\d{2,}/g, '').trim(), a.denominacion, a.variedades].filter(Boolean).join(' · '))}</div>${t ? `<div class="p">${eur(a[t])}</div>` : ''}</div></div>`).join('')}</div>
    <p class="m">Tierra Nuestra · C/ Fernando el Católico, 34 · Huelva${t ? ' · Precios orientativos, salvo error' : ''}</p><script>onload=()=>setTimeout(()=>print(),800)<\/script></body></html>`)
    w.document.close()
  }
}
window.TNC = { vClientes, vCatalogo, vPedidos, _C: C, _V: V }
})()
