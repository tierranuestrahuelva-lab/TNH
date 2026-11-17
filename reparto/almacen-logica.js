/* Reglas compartidas por el lector, los botones y la voz. Sin acceso a la nube. */
(function (root) {
  'use strict'
  const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,!¿?¡]/g, '').trim().replace(/\s+/g, ' ')
  function comando(t) {
    const n = normalizar(t)
    const grupos = { siguiente: ['siguiente', 'pasar', 'pasar linea'], anterior: ['anterior', 'atras'], validar: ['validar', 'validar linea', 'confirmar linea'], falta: ['falta', 'no hay', 'marcar falta'], repetir: ['repetir', 'repite'], si: ['si', 'confirmo', 'confirmar', 'correcto', 'vale'], no: ['no', 'cancelar', 'cancela', 'no confirmo'], cargar: ['cargar', 'cargar bulto', 'validar bulto'] }
    return Object.keys(grupos).find((k) => grupos[k].includes(n)) || null
  }
  function elegirLinea(lineas, codigo, elegida) {
    const pendientes = lineas.filter((l) => l.codigo === String(codigo).trim() && !l.hecha)
    if (!pendientes.length) return { error: lineas.some((l) => l.codigo === String(codigo).trim()) ? 'completo' : 'ajeno' }
    const directa = pendientes.find((l) => l.i === elegida)
    if (directa) return { linea: directa }
    if (new Set(pendientes.map((l) => l.unidad)).size > 1) return { opciones: pendientes }
    return { linea: pendientes[0] }
  }
  function etiquetaValida(n, totalEtiqueta, totalPedido) {
    return Number.isSafeInteger(n) && Number.isSafeInteger(totalEtiqueta) && Number.isSafeInteger(totalPedido) && n >= 1 && n <= totalPedido && totalEtiqueta === totalPedido
  }
  function entregaValida(preparadas, entregadas, devueltas) {
    return [preparadas, entregadas, devueltas].every((n) => Number.isFinite(n) && n >= 0) && entregadas + devueltas <= preparadas + 1e-9
  }
  const reglas = { comando, elegirLinea, etiquetaValida, entregaValida }
  if (typeof module !== 'undefined' && module.exports) module.exports = reglas
  else root.TNAlmacen = reglas
})(typeof window !== 'undefined' ? window : globalThis)
