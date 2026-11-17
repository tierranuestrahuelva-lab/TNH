/* Cantidades por etapa y recuentos físicos frente a la copia de Sage. */
(function () {
  'use strict'
  const R = () => window.TNR, $ = (s) => document.querySelector(s)
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const numero = (v) => v == null ? 'Sin registrar' : Number(v).toLocaleString('es-ES')
  function identificar(lineas, referencias = []) {
    const ocurrencias = new Map()
    return (lineas || []).map((l) => {
      const codigo = String(l.codigo || '').trim(), unidad = l.unidad || 'unidades', nombre = l.nombre || l.descripcion || ''
      const base = JSON.stringify([codigo || nombre, unidad]), n = ocurrencias.get(base) || 0
      ocurrencias.set(base, n + 1)
      // El formato antiguo guardaba índice, código y unidad, sin nombre/clave.
      // Solo conserva esa asociación posicional cuando tampoco hay código en el pedido.
      const antigua = !l.clave && !codigo && !nombre ? referencias[l.i] : null
      const claveAntigua = antigua && !antigua.codigo && antigua.unidad === unidad ? antigua.clave : null
      return { ...l, codigo, unidad, nombre, clave: l.clave || claveAntigua || base + ':' + n }
    })
  }
  function filas(a) {
    const mapa = new Map()
    const actuales = identificar(a.lineas)
    actuales.forEach((l, i) => {
      const preparacion = window.TNP._lineas(a).find((x) => x.i === i)
      mapa.set(l.clave, { clave: l.clave, codigo: l.codigo, unidad: l.unidad, nombre: l.nombre, pedidas: Number(l.unidades ?? l.cantidad) || 0,
        preparadas: a.prep?.l?.[i] && !preparacion.cambiada ? preparacion.n : null,
        cargadas: null, entregadas: null, vuelven: null, recibidas: null })
    })
    const etapas = [[a.prep?.carga_lineas, { n: 'cargadas' }], [a.entrega?.lineas, { entregadas: 'entregadas', devueltas: 'vuelven', referencia: 'referencia' }], [a.devolucion?.lineas, { recibidas: 'recibidas' }]]
    etapas.forEach(([registros, campos]) => identificar(registros, actuales).forEach((r) => {
      if (!mapa.has(r.clave)) mapa.set(r.clave, { clave: r.clave, codigo: r.codigo, unidad: r.unidad, nombre: r.nombre || r.codigo, pedidas: null, preparadas: null, cargadas: null, entregadas: null, vuelven: null, recibidas: null, retirada: true })
      const l = mapa.get(r.clave)
      Object.entries(campos).forEach(([origen, destino]) => { l[destino] = r[origen] ?? null })
    }))
    return [...mapa.values()].map((l, i) => ({ ...l, i }))
  }
  function formularioEntrega(a) {
    return `<details open><summary>Cantidades entregadas y que vuelven</summary><p class="mut">Comprueba las cantidades. Lo que vuelve en la furgoneta se recibe después en el almacén. Cajas y botellas se cuentan por separado.</p>${filas(a).map((l) => {
      const max = l.cargadas ?? l.preparadas ?? l.referencia ?? l.pedidas
      return `<div class="card"><b>${h(l.nombre)} · ${h(l.unidad)}</b><div class="mut">Cantidad de referencia: ${numero(max)} (${l.cargadas != null ? 'carga confirmada' : l.preparadas != null ? 'preparación' : 'pedido: sin preparación registrada'})</div><div class="choice"><label>Entregadas<input type="number" step="any" min="0" max="${max}" id="et-${l.i}" value=""></label><label>Vuelven en furgoneta<input type="number" step="any" min="0" max="${max}" id="ed-${l.i}" value=""></label></div></div>`
    }).join('')}</details>`
  }
  function confirmarTodo(a) { filas(a).forEach((l) => { $('#et-' + l.i).value = l.cargadas ?? l.preparadas ?? l.referencia ?? l.pedidas; $('#ed-' + l.i).value = 0 }) }
  function leerEntrega(a) {
    const salida = filas(a).map((l) => {
      const entregadas = Number($('#et-' + l.i).value), devueltas = Number($('#ed-' + l.i).value), max = l.cargadas ?? l.preparadas ?? l.referencia ?? l.pedidas
      if ($('#et-' + l.i).value === '' || $('#ed-' + l.i).value === '' || !window.TNAlmacen.entregaValida(max, entregadas, devueltas) || Math.abs(entregadas + devueltas - max) > 1e-8) throw new Error('Revisa ' + l.nombre + ': las entregadas y las que vuelven deben sumar ' + numero(max) + ' ' + l.unidad)
      return { i: l.i, clave: l.clave, codigo: l.codigo, nombre: l.nombre, unidad: l.unidad, pedidas: l.pedidas, referencia: max, entregadas, devueltas, base: l.cargadas != null ? 'carga' : l.preparadas != null ? 'preparacion' : 'pedido_sin_preparacion' }
    })
    return { lineas: salida, parcial: salida.some((l) => l.devueltas > 0 || l.entregadas < l.pedidas) }
  }
  function informe(a) {
    const L = filas(a)
    const celdas = ['pedidas', 'preparadas', 'cargadas', 'entregadas', 'vuelven', 'recibidas']
    R().modal(`<h2>Seguimiento · ${h(a.numero)}</h2><p>${h(a.cliente.nombre)}</p><p class="mut">La carga por artículos se confirma al completar todos los bultos. «Sin registrar» indica que falta ese detalle; los registros antiguos no se completan con cantidades supuestas.</p><div style="overflow:auto"><table><thead><tr><th>Artículo / unidad</th><th>Pedidas</th><th>Preparadas</th><th>En carga completa</th><th>Entregadas</th><th>Vuelven</th><th>Recibidas en almacén</th><th>Revisar</th></tr></thead><tbody>${L.map((l) => {
      const alertas = []
      if (l.retirada) alertas.push('Ya no figura en el pedido actual')
      if (l.preparadas != null && l.preparadas !== l.pedidas) alertas.push('Falta en preparación')
      if (l.cargadas != null && l.entregadas != null && Math.abs(l.cargadas - l.entregadas - (l.vuelven || 0)) > 1e-8) alertas.push('Diferencia en ruta')
      if (l.vuelven > (l.recibidas || 0)) alertas.push('Devolución pendiente de recibir')
      return `<tr><td>${h(l.nombre)}<br>${h(l.unidad)}</td>${celdas.map((c) => `<td>${numero(l[c])}</td>`).join('')}<td>${h(alertas.join(' · ') || (celdas.some((c) => l[c] == null) ? 'Falta detalle' : 'Cantidades conciliadas'))}</td></tr>`
    }).join('')}</tbody></table></div><p class="mut">Sage puede haber descontado ya el albarán. Estos movimientos no se restan otra vez a su stock.</p><p>${L.some((l) => l.vuelven > 0) ? '<button class="btn" id="tr-recibir">Recibir devoluciones</button>' : ''} <button class="btn sec" id="tr-cerrar">Cerrar</button></p>`)
    $('#tr-cerrar').onclick = R().cerrar
    if ($('#tr-recibir')) $('#tr-recibir').onclick = () => recibir(a)
  }
  function recibir(a) {
    const L = filas(a).filter((l) => l.vuelven > 0)
    R().modal(`<h2>Recibir devoluciones · ${h(a.numero)}</h2><p>Cuenta solo la mercancía que ha vuelto físicamente al almacén.</p>${L.map((l) => `<label>${h(l.nombre)} · ${h(l.unidad)} (vuelven ${l.vuelven})<input type="number" step="any" min="0" max="${l.vuelven}" value="${l.recibidas || 0}" id="dr-${l.i}"></label>`).join('')}<p><button class="btn ok" id="dr-guardar">Confirmar recepción</button> <button class="btn sec" id="dr-cancelar">Cancelar</button></p>`)
    $('#dr-cancelar').onclick = () => informe(a)
    $('#dr-guardar').onclick = () => {
      const lineas = L.map((l) => ({ i: l.i, clave: l.clave, codigo: l.codigo, nombre: l.nombre, unidad: l.unidad, recibidas: Number($('#dr-' + l.i).value) }))
      if (lineas.some((l, i) => $('#dr-' + l.i).value === '' || !Number.isFinite(l.recibidas) || l.recibidas < 0 || l.recibidas > L[i].vuelven)) return R().toast('Revisa las cantidades recibidas')
      if (!confirm('¿Confirmas las cantidades que han vuelto físicamente al almacén?')) return
      const anterior = a.devolucion
      a.devolucion = { at: new Date().toISOString(), quien: R().U.nombre, lineas }
      a.devolucion_historial = [...(a.devolucion_historial || []), { anterior, ...a.devolucion }].slice(-100)
      R().tocar(a); R().toast('Recepción de devolución registrada'); informe(a)
    }
  }
  function pedidos(lista) {
    R().modal(`<h2>Seguimiento y devoluciones</h2><p>Selecciona un albarán. Para ver otro día, cambia la fecha en la lista de preparación.</p>${lista.map((a, i) => `<p><button class="btn sec" data-seguimiento="${i}">${h(a.cliente.nombre)} · Alb. ${h(a.numero)}</button></p>`).join('') || '<p>No hay albaranes con artículos.</p>'}<button class="btn sec" id="tr-lista-cerrar">Cerrar</button>`)
    $('#tr-lista-cerrar').onclick = R().cerrar
    document.querySelectorAll('[data-seguimiento]').forEach((b) => { b.onclick = () => informe(lista[+b.dataset.seguimiento]) })
  }
  function contar() {
    R().modal('<h2>Recuento físico frente a Sage</h2><p>Cuenta en las mismas unidades que Sage para ese artículo. No conviertas cajas en botellas sin comprobar su contenido.</p><label>Código de artículo Sage<input id="iv-codigo" autocomplete="off"></label><label>Almacén<select id="iv-almacen"><option value="00">00 · Tienda</option><option value="01">01 · Nave</option></select></label><button class="btn sec" id="iv-consultar">Consultar stock de Sage</button><div id="iv-stock" role="status"></div><div id="iv-form"></div><p><button class="btn sec" id="iv-cerrar">Cerrar</button></p>')
    $('#iv-cerrar').onclick = R().cerrar
    const historial = document.createElement('div'); historial.id = 'iv-historial'; $('#iv-cerrar').parentElement.after(historial)
    const cargarHistorial = async () => {
      try {
        const rows = await R().Nube.api('reparto_estado?select=id,valor&id=like.inventario:*&order=id.desc&limit=30')
        if (!document.contains(historial)) return
        const lista = (rows || []).map((x) => x.valor).sort((a, b) => String(b.at).localeCompare(String(a.at)))
        historial.innerHTML = `<h3>Últimos recuentos guardados</h3>${lista.map((v) => `<div class="card"><b>${h(v.codigo)} · Almacén ${h(v.almacen)}</b><p>Contado: ${numero(v.contado)} · Sage: ${numero(v.stock_sage)} · Diferencia: ${numero(v.diferencia)}</p><p class="mut">${h(v.quien)} · ${h(new Date(v.at).toLocaleString('es-ES'))}</p><p>${h(v.notas)}</p></div>`).join('') || '<p>No hay recuentos guardados.</p>'}`
      } catch (e) { historial.textContent = 'No se pudieron cargar los recuentos anteriores.' }
    }
    cargarHistorial()
    let revision = 0
    const invalidar = () => { revision++; $('#iv-stock').textContent = ''; $('#iv-form').innerHTML = '' }
    $('#iv-codigo').oninput = invalidar; $('#iv-almacen').onchange = invalidar
    $('#iv-consultar').onclick = async () => {
      const codigo = $('#iv-codigo').value.trim(), almacen = $('#iv-almacen').value, num = ++revision, contenedor = $('#iv-form'), estado = $('#iv-stock')
      if (!codigo) return R().toast('Indica el código de Sage')
      contenedor.innerHTML = ''; estado.textContent = 'Consultando…'
      try {
        const datos = await R().Nube.api(`sage_stock?select=stock,actualizado&cod=eq.${encodeURIComponent(codigo)}&almacen=eq.${almacen}`)
        if (num !== revision || !document.contains(contenedor)) return
        const s = datos?.[0]
        if (!s || !Number.isFinite(Number(s.stock))) { estado.textContent = 'No hay stock de Sage disponible para este código y almacén. Comprueba el código, los permisos y la sincronización.'; return }
        estado.textContent = `Stock Sage: ${numero(s.stock)} · Copia actualizada: ${s.actualizado ? new Date(s.actualizado).toLocaleString('es-ES') : 'sin fecha disponible'}`
        contenedor.innerHTML = '<label>Cantidad contada físicamente<input id="iv-cantidad" type="number" step="any" min="0"></label><label>Observaciones<textarea id="iv-notas" maxlength="1000"></textarea></label><button class="btn" id="iv-guardar">Guardar recuento para revisar</button><p id="iv-resultado" role="status"></p>'
        $('#iv-guardar').onclick = async (e) => {
          const campo = $('#iv-cantidad'), contado = Number(campo.value)
          if (campo.value === '' || !Number.isFinite(contado) || contado < 0) return R().toast('Indica una cantidad válida')
          const valor = { codigo, almacen, contado, stock_sage: Number(s.stock), diferencia: contado - Number(s.stock), sage_actualizado: s.actualizado || null, at: new Date().toISOString(), quien: R().U.nombre, notas: $('#iv-notas').value.trim() }
          const boton = e.target; boton.disabled = true
          try {
            await R().Nube.api('reparto_estado', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ id: 'inventario:' + valor.at + ':' + crypto.randomUUID(), valor }]) })
            $('#iv-resultado').textContent = `Recuento guardado. Diferencia frente a la copia de Sage: ${numero(valor.diferencia)}. Revisa las entradas, salidas y devoluciones posteriores a la fecha de copia antes de ajustar en Sage.`
            cargarHistorial()
          } catch (err) { $('#iv-resultado').textContent = 'No se ha guardado el recuento. Comprueba la conexión y vuelve a intentarlo.'; boton.disabled = false }
        }
      } catch (e) { if (num === revision) estado.textContent = 'No se pudo consultar Sage. Comprueba la conexión y tus permisos.' }
    }
  }
  window.TNTrazabilidad = { identificar, filas, formularioEntrega, confirmarTodo, leerEntrega, informe, pedidos, contar }
})()
