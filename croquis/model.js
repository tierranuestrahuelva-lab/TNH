/* Modelo del croquis: lee ubicaciones, normaliza códigos, monta huecos y propuestas. Sin DOM. */
(function (g) {
  'use strict';
  const PLAN_NICHEROS = { A: 28, B: 21, C: 28, D: 21, E: 14, F: 18, G: 4 };
  const COLOR_COLUMNA = { A: 'tinto', B: 'blanco', C: 'tinto', D: 'tinto', E: 'tinto', F: 'tinto', G: 'rosado' };
  const ZONAS_ALMACEN = { 1: 'Generosos, espumosos y licores', 2: 'Poca rotación y material', 3: 'Vinos caros · zona fría', 4: 'Alta rotación' };
  const GRUPOS = [
    { id: 'tinto', nombre: 'Tintos', color: '#a3154f' },
    { id: 'blanco', nombre: 'Blancos', color: '#d9b84a' },
    { id: 'rosado', nombre: 'Rosados', color: '#e98aa8' },
    { id: 'espumoso', nombre: 'Espumosos', color: '#6fb3c9' },
    { id: 'generoso', nombre: 'Generosos y dulces', color: '#b0702a' },
    { id: 'otro', nombre: 'Otros / no vino', color: '#8a8f99' },
  ];
  const ORDEN_TIPO = ['Tinto 0Meses', 'Tinto 3-9Meses', 'Tinto =<12Meses', 'Tinto >12Meses', 'Blanco Joven', 'Blanco Crianza', 'Blanco Dulce', 'Rosado', 'Espumoso'];
  const RE_NO_MERC_TIPO = /cristaler|soporte|cajas? madera|accesorio|cesta|aceite|gastronom|material|promoci/i;
  const RE_NO_MERC_NOMBRE = /no usar|transporte|\bportes\b|comisi[oó]n|ventas varias|\bpromo\b/i;

  const sinAcentos = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function grupoDe(a) {
    const t = a.t || '', n = a.n || '';
    if (RE_NO_MERC_TIPO.test(t) || RE_NO_MERC_NOMBRE.test(n)) return 'otro';
    if (/generos|licor|brandy|cognac|\bron\b|ginebra|whisk/i.test(t)) return 'generoso';
    if (/^espumoso/i.test(t)) return 'espumoso';
    if (/^tinto/i.test(t)) return 'tinto';
    if (/^blanco/i.test(t)) return 'blanco';
    if (/^rosado/i.test(t)) return 'rosado';
    if (/sidra/i.test(t)) return 'otro';
    const s = sinAcentos(n);
    if (/champagne|\bcava\b|\bbrut\b|espumoso|frizzante|cremant|prosecco|ancestral/.test(s)) return 'espumoso';
    if (/\bfino\b|manzanilla|oloroso|amontillado|palo cortado|\bpx\b|pedro xim|oporto|moscatel|\bdulce\b|vermut|licor/.test(s)) return 'generoso';
    if (/rosado|\brose\b/.test(s)) return 'rosado';
    if (/blanco|\bblanc\b/.test(s)) return 'blanco';
    if (/tinto|\bnegre\b/.test(s)) return 'tinto';
    return 'otro';
  }
  const noMercancia = a => RE_NO_MERC_TIPO.test(a.t || '') || RE_NO_MERC_NOMBRE.test(a.n || '');
  function ordenTipo(t) {
    const i = ORDEN_TIPO.findIndex(p => (t || '').startsWith(p));
    return i < 0 ? 99 : i;
  }
  const doCorta = d => (d || '').replace(/,?\s*(DOP|DOCa|DOQ|VT\/IGP|IGP|DO)\.?\s*$/i, '').trim();

  /* Lee un trozo de código de ubicación. campo: 'u' (nichero/almacén) o 'v' (nave). */
  function leerCodigo(raw, campo) {
    const t = (raw || '').toUpperCase().replace(/\s+/g, '');
    let m;
    if (campo === 'u' && (m = t.match(/^([A-G])(\d{1,2})(S?)$/))) {
      const n = +m[2];
      return { zona: 'nichero', hueco: m[1] + String(n).padStart(2, '0'), col: m[1], num: n, extra: m[3], texto: m[1] + String(n).padStart(2, '0') + m[3] };
    }
    if (campo === 'u' && (m = t.match(/^([1-4])([A-Z])(\d)([A-Z])([PS]?)$/)))
      return { zona: 'almacen', hueco: m[1] + m[2] + m[3] + m[4], z: +m[1], est: m[2], alt: +m[3], pos: m[4], extra: m[5], texto: m[1] + m[2] + m[3] + m[4] + m[5] };
    if (campo === 'u' && (m = t.match(/^([1-4])([A-Z]?)(SUELO|PASILLO)$/))) {
      const esp = m[3] === 'SUELO' ? 'Suelo' : 'Pasillo';
      return { zona: 'almacen', hueco: m[1] + m[2] + '-' + m[3], z: +m[1], est: m[2] || '', especial: esp, extra: '', texto: m[1] + m[2] + ' ' + esp };
    }
    if ((m = t.match(/^(\d)([A-Z])(\d)$/)))
      return { zona: 'nave', hueco: m[1] + m[2] + m[3], rack: +m[1], col: m[2], alt: +m[3], extra: '', texto: m[1] + m[2] + m[3], desdeU: campo === 'u' };
    return null;
  }

  function prepararArticulo(a) {
    const art = { c: String(a.c || '').trim(), n: (a.n || '').trim(), u: a.u || '', v: a.v || '', b: a.b || [], t: a.t || '', d: a.d || '', bo: a.bo || '' };
    art.g = grupoDe(art); art.noMerc = noMercancia(art); art.dc = doCorta(art.d); art.ot = ordenTipo(art.t);
    art.locs = []; art.raros = []; art.normalizados = [];
    for (const campo of ['u', 'v']) {
      const s = art[campo];
      if (!s || !s.trim()) continue;
      const trozos = s.split('/').map(x => x.trim()).filter(Boolean);
      for (const tr of trozos) {
        const l = leerCodigo(tr, campo);
        if (!l) { art.raros.push({ campo, raw: tr }); continue; }
        art.locs.push(l);
        if (tr !== l.texto) art.normalizados.push({ campo, raw: tr, leido: l.texto });
        if (l.desdeU) art.normalizados.push({ campo, raw: tr, leido: l.texto + ' (Nave)' });
      }
      const limpio = trozos.join(' / ');
      if (s.trim() !== limpio && trozos.length > 1) art.normalizados.push({ campo, raw: s.trim(), leido: limpio, separador: true });
    }
    art.busq = sinAcentos([art.n, art.c, art.b.join(' '), art.locs.map(l => l.texto).join(' '), art.dc, art.bo].join(' '));
    return art;
  }

  function construir(lista) {
    const articulos = lista.map(prepararArticulo).sort((x, y) => x.n.localeCompare(y.n, 'es', { numeric: true }));
    const huecos = new Map(); // clave zona:hueco -> {zona, hueco, info, arts:[]}
    for (const a of articulos) for (const l of a.locs) {
      const k = l.zona + ':' + l.hueco;
      if (!huecos.has(k)) huecos.set(k, { k, zona: l.zona, hueco: l.hueco, info: l, arts: [] });
      const h = huecos.get(k);
      if (!h.arts.includes(a)) h.arts.push(a);
    }
    // Estructura de nicheros: columnas A-G con el mayor entre plan y lo usado
    const nicheros = {};
    for (const col of Object.keys(PLAN_NICHEROS)) nicheros[col] = { col, plan: PLAN_NICHEROS[col], max: PLAN_NICHEROS[col], color: COLOR_COLUMNA[col] };
    for (const h of huecos.values()) if (h.zona === 'nichero') nicheros[h.info.col].max = Math.max(nicheros[h.info.col].max, h.info.num);
    // Almacén tienda: zonas 1-4 > estanterías > alturas x posiciones
    const almacen = {};
    for (const z of [1, 2, 3, 4]) almacen[z] = { z, nombre: ZONAS_ALMACEN[z], est: {}, especiales: [] };
    for (const h of huecos.values()) if (h.zona === 'almacen') {
      const i = h.info, Z = almacen[i.z];
      if (i.especial) { Z.especiales.push(h.k); continue; }
      const e = Z.est[i.est] || (Z.est[i.est] = { est: i.est, altMax: 1, pos: new Set(['A', 'B']) });
      e.altMax = Math.max(e.altMax, i.alt); e.pos.add(i.pos);
    }
    for (const Z of Object.values(almacen)) for (const e of Object.values(Z.est)) e.pos = [...e.pos].sort();
    // Nave: racks > columnas x alturas (0 = suelo)
    const nave = {};
    for (const h of huecos.values()) if (h.zona === 'nave') {
      const i = h.info, R = nave[i.rack] || (nave[i.rack] = { rack: i.rack, cols: new Set(), altMax: 4 });
      R.cols.add(i.col); R.altMax = Math.max(R.altMax, i.alt);
    }
    for (const R of Object.values(nave)) {
      const ult = [...R.cols].sort().pop().charCodeAt(0);
      R.cols = []; for (let c = 65; c <= ult; c++) R.cols.push(String.fromCharCode(c));
    }
    return { articulos, huecos, nicheros, almacen, nave, revisar: revisar(articulos, huecos) };
  }

  function revisar(articulos, huecos) {
    const r = { normalizados: [], raros: [], noMercancia: [], fueraColumna: [], fueraPlan: [], sinTipo: [], naveEnU: [] };
    for (const a of articulos) {
      for (const x of a.normalizados) r.normalizados.push({ a, ...x });
      for (const x of a.raros) r.raros.push({ a, ...x });
      if (a.noMerc) r.noMercancia.push({ a });
      if (!a.t) r.sinTipo.push({ a });
      for (const l of a.locs) {
        if (l.zona === 'nichero') {
          const esperado = COLOR_COLUMNA[l.col];
          if (a.g !== esperado) r.fueraColumna.push({ a, hueco: l.texto, esperado, es: a.g });
          if (l.num > PLAN_NICHEROS[l.col] || l.extra) r.fueraPlan.push({ a, hueco: l.texto, plan: l.col + '01–' + l.col + String(PLAN_NICHEROS[l.col]).padStart(2, '0') });
        }
        if (l.desdeU) r.naveEnU.push({ a, hueco: l.texto });
      }
    }
    return r;
  }

  /* Propuesta de reorganización de nicheros: tipo → D.O. → A-Z. No cambia nada, solo calcula. */
  function proponer(M, opts) {
    const porHueco = Math.max(1, opts && opts.porHueco || 2), orden = opts && opts.orden || 'tipo';
    const destinoCols = { tinto: ['A', 'C', 'D', 'E', 'F'], blanco: ['B'], rosado: ['G'] };
    const enNicho = M.articulos.filter(a => a.locs.some(l => l.zona === 'nichero'));
    const cmp = (x, y) => {
      if (orden === 'tipo' && x.ot !== y.ot) return x.ot - y.ot;
      if (orden !== 'az') { const d = (x.dc || '~').localeCompare(y.dc || '~', 'es'); if (d) return d; }
      return x.n.localeCompare(y.n, 'es', { numeric: true });
    };
    const filas = [], noCaben = [], aAlmacen = [];
    for (const g of ['tinto', 'blanco', 'rosado']) {
      const lista = enNicho.filter(a => a.g === g).sort(cmp);
      const huecosLibres = [];
      for (const col of destinoCols[g]) for (let n = 1; n <= M.nicheros[col].max; n++) huecosLibres.push(col + String(n).padStart(2, '0'));
      lista.forEach((a, i) => {
        const hasta = huecosLibres[Math.floor(i / porHueco)];
        const desde = a.locs.filter(l => l.zona === 'nichero').map(l => l.hueco);
        if (!hasta) { noCaben.push(a); filas.push({ a, desde, hasta: null, cambia: true }); return; }
        filas.push({ a, desde, hasta, cambia: !(desde.length === 1 && desde[0] === hasta) });
      });
    }
    for (const a of enNicho) if (!destinoCols[a.g]) {
      aAlmacen.push(a);
      filas.push({ a, desde: a.locs.filter(l => l.zona === 'nichero').map(l => l.hueco), hasta: a.g === 'otro' ? 'Revisar' : 'Almacén zona 1', cambia: true });
    }
    return { filas, noCaben, aAlmacen, porHueco, orden, total: enNicho.length, mueve: filas.filter(f => f.cambia).length };
  }

  function buscar(M, q) {
    const p = sinAcentos(q).trim().split(/\s+/).filter(Boolean);
    if (!p.length) return [];
    const loc = (q || '').toUpperCase().replace(/\s+/g, '');
    return M.articulos.filter(a => p.every(w => a.busq.includes(w)) || a.locs.some(l => l.texto === loc || l.hueco === loc));
  }

  g.CQ = { PLAN_NICHEROS, COLOR_COLUMNA, ZONAS_ALMACEN, GRUPOS, grupoDe, leerCodigo, prepararArticulo, construir, proponer, buscar, sinAcentos };
})(typeof window !== 'undefined' ? window : globalThis);
