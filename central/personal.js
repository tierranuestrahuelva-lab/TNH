/* Espacio personal: preferencias voluntarias y compras que la persona revisa. */
'use strict'
window.TNPersonal = function ({ Nube, P, $, h, SVG, toast, preparar, pintarEstado, abrirIA, preguntar }) {
  const uid = () => Nube.token?.user?.id
  const puedeComprar = () => P.gerente || Nube.perfil?.perms?.some((p) => p.modulo === 'compras' && p.editar)
  const api = (...a) => Nube.api(...a)
  const hablar = (q = '') => { if ($('#ia').hidden) abrirIA(); if (q) preguntar(q) }
  const avisoError = (e) => toast('No se pudo guardar o cargar: ' + e.message, 6000)
  let generacion = 0
  function inicio() {
    const nombre = /maribel@/i.test(Nube.perfil.email) ? 'Maribel' : Nube.perfil.nombre.split(' ')[0]
    const accesoIA = P.ve('ia')
    $('#main').innerHTML = `<section class="personal"><p class="mut">TU ESPACIO PERSONAL</p><h1>Hola, ${h(nombre)}</h1><p>¿Qué necesitas consultar?</p>
      ${accesoIA ? '<form id="personal-pregunta" class="card"><label for="personal-q">Pregunta con tus palabras</label><input id="personal-q" placeholder="Por ejemplo: ¿qué debe este cliente?" required maxlength="2000"><div class="row"><button class="btn">Preguntar</button><button type="button" class="btn sec" id="personal-micro">Hablar</button></div><span id="personal-micro-estado" role="status"></span></form>' : '<p>Tu puesto no tiene acceso al asistente. Puedes consultar las opciones disponibles abajo.</p>'}
      <div class="personal-grid">${[
        ['ia', 'Preguntar a mi asistente', 'Precios, clientes y dudas del día', P.ve('ia')],
        ['precios', 'Precios y stock', 'Busca un vino y comprueba sus tarifas', P.ve('almacen')],
        ['cartera', 'Deudas de clientes', 'Consulta los cobros pendientes', P.ve('cartera')],
        ['compras', 'Mis compras', 'Prepara un borrador y revisa lo que falta por llegar', P.ve('compras')],
      ].filter((x) => x[3]).map(([id, t, d]) => `<button class="personal-tarjeta" data-personal="${id}">${SVG(id === 'ia' ? 'ia' : id)}<b>${t}</b><span>${d}</span></button>`).join('')}</div>
      <div id="estado"></div><p><a href="#/personal">Lo que recuerda mi asistente</a> · <a href="#/cuenta">Mi cuenta y contraseña</a> · <a href="#/completo">Todas las aplicaciones</a></p></section>`
    pintarEstado()
    document.querySelectorAll('[data-personal]').forEach((b) => { b.onclick = () => {
      const id = b.dataset.personal
      if (id === 'ia') hablar()
      else location.hash = id === 'compras' ? '#/miscompras' : '#/v/' + id
    } })
    if (!accesoIA) return
    $('#personal-pregunta').onsubmit = (e) => { e.preventDefault(); if (!P.ve('ia')) return toast('Tu puesto no tiene acceso al asistente'); hablar($('#personal-q').value) }
    $('#personal-micro').onclick = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) return toast('Puedes escribir la pregunta. La voz está disponible en Chrome para Android.')
      const r = new SR(); r.lang = 'es-ES'; r.interimResults = false
      const estado = $('#personal-micro-estado'), campo = $('#personal-q')
      estado.textContent = 'Escuchando…'
      r.onresult = (e) => { campo.value = e.results[0][0].transcript; estado.textContent = 'Revisa la pregunta y pulsa Preguntar.' }
      r.onerror = () => { estado.textContent = 'No se pudo usar el micrófono. Puedes escribir.' }
      r.onend = () => { if (estado.textContent === 'Escuchando…') estado.textContent = '' }
      try { r.start() } catch (e) { estado.textContent = 'No se pudo abrir el micrófono.' }
    }
  }
  async function preferencias() {
    preparar('personal')
    if (!P.personal) { $('#main').innerHTML = '<p>Entra con tu usuario personal.</p>'; return }
    const n = ++generacion, usuario = uid()
    $('#main').innerHTML = '<p>Cargando preferencias…</p>'
    try {
      const rows = await api('tn_preferencias?user_id=eq.' + usuario + '&select=inicio_sencillo,notas_ia')
      if (n !== generacion || usuario !== uid() || location.hash !== '#/personal') return
      const p = rows?.[0] || {}
      $('#main').innerHTML = `<h1>Mi asistente</h1><p>Solo recuerda lo que escribas y guardes aquí. Puedes cambiarlo o borrarlo cuando quieras. Tus preferencias se usan en tus consultas y no se comparten con otros usuarios.</p><form id="personal-preferencias" class="card"><p><label><input type="checkbox" id="personal-sencillo" ${p.inicio_sencillo ? 'checked' : ''}> Usar el inicio sencillo</label></p><label for="personal-notas">Cómo quieres que te ayude</label><textarea id="personal-notas" rows="5" maxlength="1000" placeholder="Por ejemplo: respuestas cortas, con precios y fechas claros">${h(p.notas_ia || '')}</textarea><p class="mut">No guardes contraseñas. Los precios y las deudas siempre se consultan en Sage.</p><div class="row"><button class="btn">Guardar preferencias</button><button class="btn sec" type="button" id="personal-olvidar">Borrar recuerdos</button></div></form><p><a href="#/">Volver al inicio</a></p>`
      $('#personal-olvidar').onclick = () => { $('#personal-notas').value = ''; $('#personal-preferencias').requestSubmit() }
      $('#personal-preferencias').onsubmit = async (e) => {
        e.preventDefault(); const boton = e.target.querySelector('button'); boton.disabled = true
        const datos = { user_id: usuario, inicio_sencillo: $('#personal-sencillo').checked, notas_ia: $('#personal-notas').value.trim(), actualizado: new Date().toISOString() }
        try { await api('tn_preferencias?on_conflict=user_id', 'POST', datos); if (usuario === uid()) Nube.preferencias = datos; toast('Preferencias guardadas') } catch (err) { avisoError(err) } finally { boton.disabled = false }
      }
    } catch (e) { if (usuario === uid()) $('#main').innerHTML = '<p>No se pudieron cargar las preferencias. Comprueba la conexión y vuelve a intentarlo.</p>' }
  }
  async function compras() {
    preparar('miscompras')
    if (!P.personal || !P.ve('compras')) { $('#main').innerHTML = '<p>Tu puesto no tiene acceso a compras.</p>'; return }
    const usuario = uid(), n = ++generacion
    $('#main').innerHTML = '<p>Cargando tus compras…</p>'
    try {
      const rutaBorradores = 'tn_borradores_compra?user_id=eq.' + usuario + '&order=actualizado.desc,id.desc&limit=100'
      const borradores = puedeComprar() ? await api(rutaBorradores) : []
      let ultimo = borradores.at(-1)
      if (n !== generacion || usuario !== uid() || location.hash !== '#/miscompras') return
      $('#main').innerHTML = `<h1>Mis compras</h1><p><a class="btn sec" href="#/v/compras">Ver pedidos pendientes de Sage</a></p><p>Prepara lo que necesitas comprar. El borrador se guarda para revisarlo; no se envía al proveedor ni se convierte en un pedido de Sage.</p>
        ${puedeComprar() ? '<form class="card" id="compra-form"><label for="compra-proveedor">Proveedor</label><input id="compra-proveedor" required maxlength="200" placeholder="Nombre del proveedor"><label for="compra-buscar">Añadir vino o artículo</label><div class="row"><input id="compra-buscar" type="search" placeholder="Nombre o código de Sage"><button type="button" class="btn sec" id="compra-boton-buscar">Buscar</button></div><div id="compra-resultados" role="status"></div><div id="compra-lineas"></div><label for="compra-notas">Notas para revisar</label><textarea id="compra-notas" maxlength="2000" rows="2"></textarea><p><button class="btn">Guardar borrador</button> <button class="btn sec" type="button" id="compra-nuevo">Nuevo</button></p></form>' : ''}
        <h2>Mis borradores</h2><div id="compra-guardados"></div><button class="btn sec" id="compra-mas" ${borradores.length < 100 ? 'hidden' : ''}>Ver más borradores</button><p><a href="#/">Volver al inicio</a></p>`
      let lineas = [], editando = null, buscando = 0
      const pintarLineas = () => {
        $('#compra-lineas').innerHTML = lineas.map((l, i) => `<div class="compra-linea"><b>${h(l.nombre)}</b><label>Cantidad<input type="number" min="0.001" step="any" value="${l.cantidad}" data-cantidad="${i}" required></label><label>Unidad<select data-unidad="${i}">${['botellas','cajas','unidades'].map((u) => `<option ${u === l.unidad ? 'selected' : ''}>${u}</option>`).join('')}</select></label><button class="btn sec" type="button" data-quitar="${i}" aria-label="Quitar ${h(l.nombre)}">Quitar</button></div>`).join('')
        document.querySelectorAll('[data-cantidad]').forEach((e) => { e.oninput = () => { lineas[+e.dataset.cantidad].cantidad = Number(e.value) } })
        document.querySelectorAll('[data-unidad]').forEach((e) => { e.onchange = () => { lineas[+e.dataset.unidad].unidad = e.value } })
        document.querySelectorAll('[data-quitar]').forEach((e) => { e.onclick = () => { lineas.splice(+e.dataset.quitar, 1); pintarLineas() } })
      }
      const nuevo = () => { editando = null; lineas = []; $('#compra-form').reset(); $('#compra-resultados').textContent = ''; pintarLineas() }
      const texto = (d) => `BORRADOR PARA REVISAR\nProveedor: ${d.proveedor}\n${d.lineas.map((l) => `${l.cantidad} ${l.unidad} · ${l.nombre} (${l.codigo})`).join('\n')}\n${d.notas || ''}\nNo enviado ni registrado en Sage.`
      const pintarGuardados = () => {
        $('#compra-guardados').innerHTML = borradores.map((d, i) => `<div class="card"><h3>${h(d.proveedor)}</h3><p>${h(new Date(d.actualizado).toLocaleString('es-ES'))} · ${d.lineas.length} artículos</p><pre class="compra-texto">${h(texto(d))}</pre><button class="btn sec" data-editar="${i}">Editar</button> <button class="btn sec" data-descargar="${i}">Descargar</button> <button class="btn sec" data-borrar="${i}">Borrar</button></div>`).join('') || '<p class="mut">Aún no hay borradores guardados.</p>'
        document.querySelectorAll('[data-editar]').forEach((e) => { e.onclick = () => { const d = borradores[+e.dataset.editar]; editando = d.id; lineas = structuredClone(d.lineas); $('#compra-proveedor').value = d.proveedor; $('#compra-notas').value = d.notas; pintarLineas(); $('#compra-proveedor').focus() } })
        document.querySelectorAll('[data-descargar]').forEach((e) => { e.onclick = () => { const url = URL.createObjectURL(new Blob([texto(borradores[+e.dataset.descargar])], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'borrador-compra.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) } })
        document.querySelectorAll('[data-borrar]').forEach((e) => { e.onclick = async () => { const d = borradores[+e.dataset.borrar]; if (e.disabled || !confirm('¿Borrar este borrador?')) return; e.disabled = true; try { await api('tn_borradores_compra?id=eq.' + d.id + '&user_id=eq.' + usuario, 'DELETE'); if (editando === d.id) nuevo(); borradores.splice(borradores.indexOf(d), 1); pintarGuardados() } catch (err) { avisoError(err); e.disabled = false } } })
      }
      pintarGuardados()
      $('#compra-mas').onclick = async (e) => {
        const b = e.target; b.disabled = true
        try {
          const cursor = ultimo ? `&or=(actualizado.lt.${encodeURIComponent(ultimo.actualizado)},and(actualizado.eq.${encodeURIComponent(ultimo.actualizado)},id.lt.${ultimo.id}))` : ''
          const mas = await api(rutaBorradores + cursor)
          if (usuario !== uid() || location.hash !== '#/miscompras' || n !== generacion) return
          ultimo = mas.at(-1) || ultimo; borradores.push(...mas.filter((d) => !borradores.some((x) => x.id === d.id))); pintarGuardados(); b.hidden = mas.length < 100
        } catch (err) { avisoError(err) } finally { b.disabled = false }
      }
      if (!puedeComprar()) return
      $('#compra-nuevo').onclick = nuevo
      $('#compra-boton-buscar').onclick = async () => {
        const q = $('#compra-buscar').value.trim().replace(/[%_,()."\\]/g, ' '), num = ++buscando
        if (q.length < 2) return toast('Escribe al menos dos letras o cifras')
        const caja = $('#compra-resultados'); caja.textContent = 'Buscando en Sage…'
        try {
          const filtro = encodeURIComponent('%' + q + '%')
          const arts = await api(`sage_articulos?select=cod,nombre&baja=eq.false&or=(nombre.ilike.${filtro},cod.ilike.${filtro})&limit=12`)
          if (num !== buscando || usuario !== uid()) return
          caja.innerHTML = arts.map((a, i) => `<button type="button" class="btn sec compra-resultado" data-articulo="${i}">${h(a.nombre)} · ${h(a.cod)}</button>`).join('') || 'Ningún artículo coincide.'
          caja.querySelectorAll('[data-articulo]').forEach((b) => { b.onclick = () => { if (lineas.length >= 100) return toast('Máximo 100 artículos'); const a = arts[+b.dataset.articulo]; lineas.push({ codigo: a.cod, nombre: a.nombre, cantidad: 1, unidad: 'botellas' }); pintarLineas(); caja.textContent = '' } })
        } catch (e) { caja.textContent = 'No se pudo consultar Sage. Inténtalo de nuevo.' }
      }
      $('#compra-buscar').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#compra-boton-buscar').click() } }
      $('#compra-form').onsubmit = async (e) => {
        e.preventDefault()
        if (!lineas.length || lineas.some((l) => !Number.isFinite(l.cantidad) || l.cantidad <= 0)) return toast('Añade artículos con cantidades mayores que cero')
        const btn = e.target.querySelector('button:not([type])'); btn.disabled = true
        const d = { user_id: usuario, proveedor: $('#compra-proveedor').value.trim(), notas: $('#compra-notas').value.trim(), lineas, actualizado: new Date().toISOString() }
        if (!d.proveedor) { btn.disabled = false; return toast('Indica el proveedor') }
        try {
          if (editando) await api('tn_borradores_compra?id=eq.' + editando + '&user_id=eq.' + usuario, 'PATCH', d)
          else { d.id = crypto.randomUUID(); await api('tn_borradores_compra', 'POST', d) }
          toast('Borrador guardado para revisar'); compras()
        } catch (err) { avisoError(err) } finally { btn.disabled = false }
      }
    } catch (e) { if (usuario === uid()) $('#main').innerHTML = '<p>No se pudieron cargar tus compras. Comprueba la conexión y vuelve a intentarlo.</p>' }
  }
  return { inicio, preferencias, compras, sencillo: () => P.personal && Nube.preferencias?.inicio_sencillo }
}
