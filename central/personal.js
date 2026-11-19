/* Espacio personal: preferencias voluntarias y compras que la persona revisa. */
'use strict'
window.TNPersonal = function ({ Nube, P, $, h, SVG, toast, preparar, pintarEstado, abrirIA, preguntar, apps = () => [] }) {
  const uid = () => Nube.token?.user?.id
  const puedeComprar = () => P.gerente || Nube.perfil?.perms?.some((p) => p.modulo === 'compras' && p.editar)
  const api = (...a) => Nube.api(...a)
  const avisoError = (e) => toast('No se pudo guardar o cargar: ' + e.message, 6000)
  let generacion = 0
  const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
  const DEF = {
    gerente: ['¿Qué hay que pagar esta semana?', '¿Quién nos debe dinero?', '¿Qué pedidos faltan por servir?'],
    oficina: ['¿Qué hay que pagar esta semana?', '¿Quién nos debe dinero?', '¿Qué pedidos faltan por servir?'],
    comercial: ['¿Qué pedidos de mis clientes faltan por servir?', '¿Qué me deben mis clientes?', 'Recomiéndame un vino para un restaurante de marisco'],
    dependienta: ['Un vino para regalar de unos 20 euros', '¿Qué vino va bien con pescado por menos de 15 euros?', '¿Qué falta por reponer en la tienda?'],
  }
  const RESUMEN = {
    gerente: 'Dame el resumen del día: pagos que vencen esta semana, los cobros vencidos más importantes, pedidos de venta pendientes y cómo va el reparto hoy.',
    oficina: 'Dame el resumen del día: pagos que vencen esta semana, los cobros vencidos más importantes y pedidos de venta pendientes.',
    comercial: 'Dame el resumen del día de mis clientes: pedidos pendientes de servir y cobros vencidos.',
    dependienta: 'Dame el resumen del día de la tienda: lo que falta por reponer y cómo va el reparto hoy.',
  }
  const RECUERDA = /^\s*(recuerda|recuérdame|recuerdame|apunta|acuérdate de|acuerdate de)\s+(que\s+)?/i
  const clave = (q) => q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ').trim()
  const plano = (t) => String(t || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[-•]\s*/gm, '').replace(/#+\s*/g, '')
  const LETRA = 'tn-facil-letra', VOZ = 'tn-facil-voz'
  let charla = [], ocupada = false, ultima = null
  const frecuentes = () => (Array.isArray(Nube.preferencias?.frecuentes) ? Nube.preferencias.frecuentes : [])
  async function guardarFrecuentes(lista) {
    lista = lista.sort((a, b) => (b.f - a.f) || (b.n - a.n) || String(b.u).localeCompare(String(a.u))).slice(0, 30)
    if (Nube.preferencias) Nube.preferencias.frecuentes = lista
    try { await api('tn_preferencias?user_id=eq.' + uid(), 'PATCH', { frecuentes: lista, actualizado: new Date().toISOString() }) } catch (e) { /* aprender es opcional */ }
  }
  function aprender(q, fijar) {
    const k = clave(q); if (!k || RECUERDA.test(q)) return
    const lista = frecuentes().map((x) => ({ ...x })), x = lista.find((y) => clave(y.q) === k)
    if (x) { x.n = (x.n || 0) + (fijar === undefined ? 1 : 0); x.u = new Date().toISOString(); if (fijar !== undefined) x.f = fijar } else lista.push({ q: q.trim().slice(0, 200), n: fijar === undefined ? 1 : 0, f: !!fijar, u: new Date().toISOString() })
    return guardarFrecuentes(lista)
  }
  function sugerencias() {
    const vistas = new Set(), out = []
    for (const x of [...frecuentes()].sort((a, b) => (b.f - a.f) || (b.n - a.n))) if (x.f || x.n >= 2) { if (!vistas.has(clave(x.q))) { vistas.add(clave(x.q)); out.push(x.q) } }
    for (const q of DEF[Nube.perfil?.rol] || DEF.dependienta) if (!vistas.has(clave(q))) { vistas.add(clave(q)); out.push(q) }
    return out.slice(0, 5)
  }
  function leer(t) {
    if (!('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(plano(t)); u.lang = 'es-ES'; u.rate = 0.95
    const v = speechSynthesis.getVoices().find((x) => /^es(-|_)ES/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^es/i.test(x.lang))
    if (v) u.voice = v
    speechSynthesis.speak(u)
  }
  function pintarSugerencias() {
    const caja = $('#facil-sug'); if (!caja) return
    caja.innerHTML = sugerencias().map((q, i) => `<button type="button" class="facil-q" data-facil-q="${i}">${h(q)}</button>`).join('')
    const lista = sugerencias()
    caja.querySelectorAll('[data-facil-q]').forEach((b) => { b.onclick = () => consultar(lista[+b.dataset.facilQ]) })
  }
  function pintarRespuesta(q, texto, error) {
    const caja = $('#facil-respuesta'); caja.hidden = false
    const fijada = frecuentes().some((x) => x.f && clave(x.q) === clave(q))
    caja.innerHTML = `<p class="facil-p">Has preguntado: «${h(q)}»</p><div class="facil-a${error ? ' error' : ''}">${h(texto).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>
      ${error ? '' : `<div class="facil-acciones"><button type="button" class="facil-b" id="facil-repetir">Repetir en voz alta</button><button type="button" class="facil-b" id="facil-parar">Callar</button><button type="button" class="facil-b" id="facil-letra">Más letra</button>${RECUERDA.test(q) ? '' : `<button type="button" class="facil-b" id="facil-fijar">${fijada ? 'Quitar de mis preguntas' : 'Guardar en mis preguntas'}</button>`}<a class="facil-b" id="facil-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(plano(texto))}">Mandar por WhatsApp</a></div>`}`
    caja.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (error) return
    $('#facil-repetir').onclick = () => leer(texto)
    $('#facil-parar').onclick = () => window.speechSynthesis?.cancel()
    $('#facil-letra').onclick = () => { const n = ((+localStorage.getItem(LETRA) || 0) + 1) % 3; localStorage.setItem(LETRA, n); $('.personal').dataset.letra = n }
    if ($('#facil-fijar')) $('#facil-fijar').onclick = async () => { await aprender(q, !fijada); pintarSugerencias(); pintarRespuesta(q, texto) }
  }
  async function recordar(q) {
    const nota = q.replace(RECUERDA, '').trim()
    const antes = Nube.preferencias?.notas_ia || '', nuevas = (antes ? antes + '\n' : '') + '- ' + nota
    if (!nota) return pintarRespuesta(q, 'Dime qué quieres que recuerde. Por ejemplo: «Recuerda que cuando digo Sevilla me refiero a Avanza Vinos».', true)
    if (nuevas.length > 1000) return pintarRespuesta(q, 'Ya tengo muchas cosas apuntadas. Borra alguna en «Lo que recuerda mi asistente» y vuelve a decírmelo.', true)
    try {
      await api('tn_preferencias?user_id=eq.' + uid(), 'PATCH', { notas_ia: nuevas, actualizado: new Date().toISOString() })
      if (Nube.preferencias) Nube.preferencias.notas_ia = nuevas
      const t = 'Apuntado. Lo tendré en cuenta a partir de ahora: ' + nota
      pintarRespuesta(q, t); if (localStorage.getItem(VOZ) !== '0') leer(t)
    } catch (e) { pintarRespuesta(q, 'No he podido apuntarlo. Comprueba la conexión e inténtalo otra vez.', true) }
  }
  async function consultar(q) {
    q = String(q || '').trim(); if (!q) return
    if (ocupada) return toast('Espera a que termine la respuesta anterior')
    if (!P.ve('ia')) return toast('Tu puesto no tiene acceso al asistente')
    window.speechSynthesis?.cancel()
    if ($('#personal-q')) $('#personal-q').value = ''
    if (RECUERDA.test(q)) return recordar(q)
    ocupada = true; const usuario = uid()
    const caja = $('#facil-respuesta'); caja.hidden = false
    caja.innerHTML = `<p class="facil-p">Has preguntado: «${h(q)}»</p><div class="facil-a esperando">Un momento, lo estoy mirando…</div>`
    caja.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      const r = await Nube.fn('tn-copiloto', { pregunta: q, historial: charla, modo: 'facil' })
      if (usuario !== uid()) return
      charla.push({ role: 'user', content: q }, { role: 'assistant', content: r.respuesta }); charla = charla.slice(-8)
      ultima = q; pintarRespuesta(q, r.respuesta)
      if (localStorage.getItem(VOZ) !== '0') leer(r.respuesta)
      aprender(q)?.then(pintarSugerencias)
    } catch (e) { if (usuario === uid()) pintarRespuesta(q, 'No he podido responder: ' + e.message + '. Prueba otra vez dentro de un momento.', true) }
    finally { ocupada = false }
  }
  function escuchar() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const boton = $('#facil-mic'), estado = $('#personal-micro-estado')
    if (!SR) { estado.textContent = 'En este móvil no puedo oírte. Escribe la pregunta aquí abajo.'; $('#personal-q').focus(); return }
    window.speechSynthesis?.cancel()
    const r = new SR(); r.lang = 'es-ES'; r.interimResults = false; r.maxAlternatives = 1
    boton.classList.add('escuchando'); boton.querySelector('span').textContent = 'Te escucho…'; estado.textContent = 'Habla ahora. Cuando termines, espera un segundo.'
    const fin = () => { boton.classList.remove('escuchando'); boton.querySelector('span').textContent = 'Pulsa y habla' }
    r.onresult = (e) => { fin(); estado.textContent = ''; consultar(e.results[0][0].transcript) }
    r.onerror = (e) => { fin(); estado.textContent = e.error === 'not-allowed' ? 'Hay que dar permiso al micrófono. Pulsa otra vez y elige «Permitir».' : 'No te he oído bien. Pulsa otra vez.' }
    r.onend = fin
    try { r.start() } catch (e) { fin() }
  }
  function inicio() {
    const nombre = /maribel@/i.test(Nube.perfil.email) ? 'Maribel' : /^tienda/i.test(Nube.perfil.nombre) ? 'equipo' : Nube.perfil.nombre.split(' ')[0]
    const accesoIA = P.ve('ia'), hora = new Date().getHours(), saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'
    const resumen = RESUMEN[Nube.perfil.rol]
    const opciones = [
      ['precios', 'Precios y stock', 'Busca un vino y comprueba sus tarifas', P.ve('almacen'), '#/v/precios'],
      ['cartera', 'Deudas de clientes', 'Consulta los cobros pendientes', P.ve('cartera'), '#/v/cartera'],
      ['compras', 'Mis compras', 'Prepara un borrador y revisa lo que falta por llegar', P.ve('compras'), '#/miscompras'],
      ...apps().map((a) => [a.id, a.n, a.d, true, a.href]),
    ].filter((x) => x[3])
    $('#main').innerHTML = `<section class="personal facil" data-letra="${+localStorage.getItem(LETRA) || 0}"><h1>${saludo}, ${h(nombre)}</h1>
      ${accesoIA ? `<p class="facil-intro">Pulsa el botón y pregúntame lo que necesites.</p>
      <button type="button" class="facil-mic" id="facil-mic">${MIC}<span>Pulsa y habla</span></button>
      <p id="personal-micro-estado" class="facil-estado" role="status"></p>
      <div id="facil-respuesta" class="facil-respuesta" aria-live="polite" hidden></div>
      <p class="facil-sub">Lo que sueles preguntar</p><div id="facil-sug" class="facil-sug"></div>
      ${resumen ? '<button type="button" class="facil-q facil-resumen" id="facil-resumen">El resumen del día</button>' : ''}
      <form id="personal-pregunta" class="facil-escribir"><label for="personal-q">O escribe tu pregunta</label><div class="row"><input id="personal-q" placeholder="Por ejemplo: ¿qué debe Casa Luciano?" required maxlength="2000" enterkeyhint="send"><button class="btn">Preguntar</button></div></form>
      <label class="facil-voz"><input type="checkbox" id="facil-voz" ${localStorage.getItem(VOZ) !== '0' ? 'checked' : ''}> Leer las respuestas en voz alta</label>
      <p class="facil-truco">Truco: di «Recuerda que…» y lo apunto para la próxima vez. Por ejemplo: «Recuerda que cuando digo Sevilla me refiero a Avanza Vinos».</p>`
      : '<p>Tu puesto no tiene acceso al asistente. Puedes consultar las opciones disponibles abajo.</p>'}
      ${opciones.length ? `<p class="facil-sub">Más opciones</p><div class="personal-grid">${opciones.map(([id, t, d, , href]) => `<a class="personal-tarjeta" href="${href}">${SVG(id)}<b>${h(t)}</b><span>${h(d)}</span></a>`).join('')}</div>` : ''}
      <div id="estado"></div><p><a href="#/personal">Lo que recuerda mi asistente</a> · <a href="#/cuenta">Mi cuenta y contraseña</a> · <a href="#/completo">Todas las aplicaciones</a></p></section>`
    pintarEstado()
    if (!accesoIA) return
    pintarSugerencias()
    $('#facil-mic').onclick = escuchar
    if (resumen) $('#facil-resumen').onclick = () => consultar(resumen)
    $('#facil-voz').onchange = (e) => { localStorage.setItem(VOZ, e.target.checked ? '1' : '0'); if (!e.target.checked) window.speechSynthesis?.cancel() }
    $('#personal-pregunta').onsubmit = (e) => { e.preventDefault(); consultar($('#personal-q').value) }
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
