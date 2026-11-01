(function () {
  'use strict';
  const NUBE = { url: 'https://zxrrwwmxbvdlkalqzzau.supabase.co', anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cnJ3d214YnZkbGthbHF6emF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzkxODQsImV4cCI6MjEwODg1NTE4NH0.IZltQVDiXx6QAYSwt5Lt6wGA8U0YRNlKvrICaTEUYh0', email: 'equipo@tierranuestra.es' };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GR = Object.fromEntries(CQ.GRUPOS.map(g => [g.id, g]));
  const ZONA = { nichero: 'Nicheros', almacen: 'Almacén tienda', nave: 'Nave' };
  const app = $('#app');

  function cargarDatos() {
    const base = { ...window.CQ_DATA, origen: 'foto' };
    try {
      const n = JSON.parse(localStorage.getItem('cq_nube') || 'null');
      if (n && n.articulos && n.generado >= base.generado) return { ...n, origen: 'nube' };
    } catch (e) { /* datos locales dañados: se usa la foto */ }
    return base;
  }
  let DATA = cargarDatos();
  let M = CQ.construir(DATA.articulos);
  const S = { tab: 'plano', zona: 'nichero', q: '', off: new Set(), nombres: false, zoom: 1, sel: null, sug: 0,
    porHueco: 2, orden: 'tipo', soloCambian: true, lq: '', lg: '', lorden: 'n' };

  const fecha = s => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
  const locChip = l => `<span class="loc ${l.zona}" data-ir="${l.zona}:${esc(l.hueco)}" title="${ZONA[l.zona]}">${esc(l.texto)}</span>`;
  const colorHueco = arts => {
    if (!arts.length) return null;
    const c = {}; arts.forEach(a => c[a.g] = (c[a.g] || 0) + 1);
    return GR[Object.keys(c).sort((x, y) => c[y] - c[x])[0]].color;
  };
  function describir(k) {
    const [zona, hueco] = k.split(':');
    const H = M.huecos.get(k), i = H ? H.info : CQ.leerCodigo(hueco.replace('-', ''), zona === 'nave' ? 'v' : 'u') || {};
    if (zona === 'nichero') { const col = hueco[0], n = +hueco.slice(1), pl = CQ.PLAN_NICHEROS[col];
      return `Nichero · columna ${col} (${GR[CQ.COLOR_COLUMNA[col]].nombre.toLowerCase()}) · nº ${n}${n > pl ? ' · fuera del plan (previsto hasta ' + col + pl + ')' : ''}`; }
    if (zona === 'almacen') {
      if (i.especial) return `Almacén tienda · zona ${i.z} (${CQ.ZONAS_ALMACEN[i.z]})${i.est ? ' · estantería ' + i.est : ''} · ${i.especial}`;
      return `Almacén tienda · zona ${i.z} (${CQ.ZONAS_ALMACEN[i.z]}) · estantería ${i.est} · altura ${i.alt} · posición ${i.pos}`;
    }
    return `Nave · rack ${i.rack} · columna ${i.col} · altura ${i.alt}${i.alt === 0 ? ' (suelo)' : ''}`;
  }

  /* ---------- dibujo SVG ---------- */
  function contextoResaltado() {
    const hits = new Set();
    if (S.q.trim()) for (const a of CQ.buscar(M, S.q)) for (const l of a.locs) hits.add(l.zona + ':' + l.hueco);
    return hits;
  }
  function celda(k, x, y, w, h, etiqueta, ctx, extra) {
    const arts = (ctx.mapa ? ctx.mapa.get(k) : (M.huecos.get(k) || {}).arts) || [];
    const cls = ['h'];
    if (!arts.length) cls.push('vacio');
    if (extra) cls.push('extra');
    if (ctx.hits && S.q.trim()) cls.push(ctx.hits.has(k) ? 'hit' : 'dim');
    else if (arts.length && arts.every(a => S.off.has(a.g))) cls.push('dim');
    if (S.sel === k && !ctx.mapa) cls.push('sel');
    const fill = colorHueco(arts) || 'none';
    let t = `<g class="${cls.join(' ')}" data-k="${esc(k)}" data-n="${arts.length}"><title>${esc(etiqueta)}${arts.length ? ' — ' + esc(arts.map(a => a.n).join(' · ')) : ' — vacío'}</title>`;
    t += `<rect class="halo" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="#fff" opacity="0"/>`;
    t += `<rect class="c" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" fill-opacity="${arts.length ? .88 : 1}"/>`;
    t += `<text x="${x + 5}" y="${y + 13}" font-size="11" font-family="FiraC" fill="${arts.length ? '#fff' : '#7f97ad'}" letter-spacing=".5">${esc(etiqueta)}</text>`;
    if (arts.length > 1) t += `<circle cx="${x + w - 9}" cy="${y + 9}" r="7" fill="rgba(0,0,0,.35)"/><text x="${x + w - 9}" y="${y + 12.5}" font-size="10" text-anchor="middle" fill="#fff" font-family="Fira" font-weight="600">${arts.length}</text>`;
    if (S.nombres && arts.length && h >= 34) {
      const max = Math.max(6, Math.floor((w - 8) / 5.6));
      const nm = arts[0].n.length > max ? arts[0].n.slice(0, max - 1) + '…' : arts[0].n;
      t += `<text x="${x + 5}" y="${y + h - 7}" font-size="9.5" fill="#fff" font-family="Fira">${esc(nm)}</text>`;
    }
    return t + '</g>';
  }
  function marco(w, h, zonaTxt, sub) {
    const cw = 380, ch = 74, cx = w - cw - 16, cy = h - ch - 16;
    return `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="rgba(190,215,240,.55)" stroke-width="1.5"/>
<rect x="11" y="11" width="${w - 22}" height="${h - 22}" fill="none" stroke="rgba(190,215,240,.25)"/>
<g class="cajetin" font-family="FiraC" fill="#e8eef4">
<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="#0f2133" stroke="rgba(190,215,240,.6)"/>
<line x1="${cx}" y1="${cy + 30}" x2="${cx + cw}" y2="${cy + 30}" stroke="rgba(190,215,240,.4)"/>
<line x1="${cx + 250}" y1="${cy + 30}" x2="${cx + 250}" y2="${cy + ch}" stroke="rgba(190,215,240,.4)"/>
<text x="${cx + 10}" y="${cy + 21}" font-size="15" letter-spacing="1.5">TIERRA NUESTRA HUELVA · CROQUIS DE ALMACÉN</text>
<text x="${cx + 10}" y="${cy + 49}" font-size="13" letter-spacing="1">ZONA: ${esc(zonaTxt.toUpperCase())}</text>
<text x="${cx + 10}" y="${cy + 66}" font-size="10.5" fill="#9fb3c6">${esc(sub)}</text>
<text x="${cx + 260}" y="${cy + 49}" font-size="10.5" fill="#9fb3c6">DATOS</text>
<text x="${cx + 260}" y="${cy + 65}" font-size="11">${esc(fecha(DATA.generado))}</text>
</g>`;
  }
  const rotulo = (x, y, t, size = 14, color = '#e8eef4', extra = '') => `<text x="${x}" y="${y}" font-family="FiraC" font-size="${size}" fill="${color}" letter-spacing="1.2" ${extra}>${esc(t)}</text>`;

  function svgNicheros(ctx) {
    const cw = 62, chh = 40, gap = 5, porFila = 4, pad = 14, cab = 46, sep = 26;
    let x = 30, y0 = 70, body = '', hMax = 0, wMax = 0;
    for (const col of Object.keys(CQ.PLAN_NICHEROS)) {
      if (col === 'E') { x = 30; y0 += hMax + 24; hMax = 0; }
      const N = M.nicheros[col], filas = Math.ceil(N.max / porFila);
      const mw = pad * 2 + porFila * cw + (porFila - 1) * gap, mh = cab + filas * (chh + gap) - gap + pad;
      const color = GR[N.color].color;
      body += `<rect x="${x}" y="${y0}" width="${mw}" height="${mh}" rx="8" fill="rgba(20,42,64,.85)" stroke="rgba(190,215,240,.45)"/>`;
      body += `<rect x="${x}" y="${y0}" width="${mw}" height="6" rx="3" fill="${color}"/>`;
      body += rotulo(x + pad, y0 + 34, 'COLUMNA ' + col, 18);
      body += rotulo(x + mw - pad, y0 + 34, GR[N.color].nombre.toUpperCase() + ' · ' + N.plan + (N.max > N.plan ? '+' + (N.max - N.plan) : ''), 11.5, '#9fb3c6', 'text-anchor="end"');
      for (let n = 1; n <= N.max; n++) {
        const i = n - 1, cx = x + pad + (i % porFila) * (cw + gap), cy = y0 + cab + Math.floor(i / porFila) * (chh + gap);
        const cod = col + String(n).padStart(2, '0');
        body += celda('nichero:' + cod, cx, cy, cw, chh, cod, ctx, n > N.plan);
      }
      x += mw + sep; hMax = Math.max(hMax, mh); wMax = Math.max(wMax, x);
    }
    const w = Math.max(wMax + 4, 900), h = y0 + hMax + 130;
    const tit = rotulo(30, 48, ctx.mapa ? 'NICHEROS · PROPUESTA (TIPO → D.O. → A-Z)' : 'NICHEROS · PARED DE BOTELLEROS (máx. 22 botellas por hueco)', 20);
    const nota = rotulo(30, h - 60, 'Borde naranja discontinuo = hueco usado que no estaba en el plan inicial. Esquema orientativo, sin escala.', 12, '#9fb3c6');
    return { w, h, body: tit + body + nota + marco(w, h, ctx.mapa ? 'Nicheros · propuesta' : 'Nicheros', 'Columnas A,C,D,E,F tintos · B blancos · G rosados') };
  }

  function svgEstanteria(z, E, x, y, ctx) {
    const cw = 44, chh = 32, gap = 4, pad = 8, cab = 26;
    const w = pad * 2 + E.pos.length * (cw + gap) - gap, alts = E.altMax + 1, h = cab + alts * (chh + gap) - gap + pad + 16;
    let t = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="rgba(20,42,64,.85)" stroke="rgba(190,215,240,.45)"/>`;
    t += rotulo(x + pad, y + 18, 'EST. ' + E.est, 13);
    for (let a = E.altMax; a >= 0; a--) E.pos.forEach((p, j) => {
      const cx = x + pad + j * (cw + gap), cy = y + cab + (E.altMax - a) * (chh + gap);
      const cod = z + E.est + a + p;
      t += celda('almacen:' + cod, cx, cy, cw, chh, cod, ctx);
    });
    t += `<line x1="${x + 4}" y1="${y + h - 10}" x2="${x + w - 4}" y2="${y + h - 10}" stroke="rgba(190,215,240,.6)" stroke-width="2"/>`;
    return { w, h, t };
  }
  function svgZonaAlmacen(z, x, y, ctx, minW) {
    const Z = M.almacen[z], ests = Object.values(Z.est).sort((a, b) => a.est.localeCompare(b.est));
    let cx = x + 14, cy = y + 40, body = '', hFila = 0, xMax = x, alto = 0;
    ests.forEach((E, i) => {
      if (i && i % 6 === 0) { cy += hFila + 12; cx = x + 14; hFila = 0; }
      const r = svgEstanteria(z, E, cx, cy, ctx); body += r.t; cx += r.w + 10; hFila = Math.max(hFila, r.h); xMax = Math.max(xMax, cx);
    });
    for (const k of Z.especiales) {
      const H = M.huecos.get(k);
      body += celda(k, cx, cy, 96, 44, H.info.texto, ctx); cx += 106; hFila = Math.max(hFila, 44); xMax = Math.max(xMax, cx);
    }
    alto = cy - y - 40 + Math.max(hFila, 30);
    if (!ests.length && !Z.especiales.length) body += rotulo(x + 14, y + 74, 'Sin huecos registrados todavía', 12, '#9fb3c6');
    const titulo = 'ZONA ' + z + ' · ' + CQ.ZONAS_ALMACEN[z];
    const w = Math.max(xMax - x + 4, minW || 0, titulo.length * 9 + 30), h = alto + 56;
    const caja = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="rgba(131,0,64,.10)" stroke="#B771A0" stroke-dasharray="7 4"/>` +
      rotulo(x + 14, y + 26, 'ZONA ' + z + ' · ' + CQ.ZONAS_ALMACEN[z].toUpperCase(), 15, '#f1d6e6');
    return { w, h, t: caja + body };
  }
  function svgAlmacen(ctx) {
    const z4 = svgZonaAlmacen(4, 30, 70, ctx);
    const prepY = 70 + z4.h + 18;
    const anchoMax = Math.max(z4.w + 30, 900);
    let x = 30, yF = prepY + 76, fila = '', hB = 0, xMax = 0;
    for (const z of [3, 2, 1]) {
      let r = svgZonaAlmacen(z, x, yF, ctx);
      if (x > 30 && x + r.w > anchoMax + 30) { x = 30; yF += hB + 18; hB = 0; r = svgZonaAlmacen(z, x, yF, ctx); }
      fila += r.t; x += r.w + 18; hB = Math.max(hB, r.h); xMax = Math.max(xMax, x);
    }
    const w = Math.max(z4.w + 60, xMax + 12, 900);
    const prep = `<rect x="30" y="${prepY}" width="${w - 60}" height="58" rx="10" fill="rgba(255,209,102,.08)" stroke="#ffd166" stroke-dasharray="4 4"/>` +
      rotulo(w / 2, prepY + 35, 'PREPARACIÓN DE PEDIDOS', 17, '#ffd166', 'text-anchor="middle"');
    const h = yF + hB + 140;
    const nota = rotulo(30, h - 60, 'Código: zona · estantería · altura · posición (ej. 4N0B = zona 4, est. N, altura 0, posición B). Distribución orientativa, sin escala.', 12, '#9fb3c6');
    return { w, h, body: rotulo(30, 48, 'ALMACÉN TIENDA · ESTANTERÍAS EN ALZADO', 20) + z4.t + prep + fila + nota + marco(w, h, 'Almacén tienda', 'Zona 4 junto a preparación · zonas 1-3 enfrente') };
  }
  function svgNave(ctx) {
    const cw = 104, chh = 40, gap = 6, pad = 14;
    let y = 70, body = '', wMax = 0;
    const racks = Object.values(M.nave).sort((a, b) => a.rack - b.rack);
    racks.forEach((R, idx) => {
      const w = pad * 2 + 70 + R.cols.length * (cw + gap) - gap, h = 40 + (R.altMax + 1) * (chh + gap) + 24;
      body += `<rect x="30" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(20,42,64,.85)" stroke="rgba(190,215,240,.45)"/>`;
      body += rotulo(30 + pad, y + 26, 'RACK ' + R.rack, 17);
      R.cols.forEach((c, j) => body += rotulo(30 + pad + 70 + j * (cw + gap) + cw / 2, y + 26, 'COL. ' + c, 12, '#9fb3c6', 'text-anchor="middle"'));
      for (let a = R.altMax; a >= 0; a--) {
        const cy = y + 40 + (R.altMax - a) * (chh + gap);
        body += rotulo(30 + pad, cy + 25, a === 0 ? 'Suelo 0' : 'Altura ' + a, 11.5, '#9fb3c6');
        R.cols.forEach((c, j) => { const cod = R.rack + c + a; body += celda('nave:' + cod, 30 + pad + 70 + j * (cw + gap), cy, cw, chh, cod, ctx); });
      }
      body += `<line x1="34" y1="${y + h - 12}" x2="${30 + w - 4}" y2="${y + h - 12}" stroke="rgba(190,215,240,.7)" stroke-width="3"/>`;
      y += h;
      wMax = Math.max(wMax, w);
      if (idx < racks.length - 1) { body += `<rect x="30" y="${y + 10}" width="${w}" height="40" fill="rgba(255,209,102,.06)" stroke="#ffd166" stroke-dasharray="4 4"/>` + rotulo(30 + w / 2, y + 36, 'PASILLO', 14, '#ffd166', 'text-anchor="middle"'); y += 60; }
    });
    const w = Math.max(wMax + 60, 1000), h = y + 150;
    return { w, h, body: rotulo(30, 48, 'NAVE · RACKS DE PALETS (solo referencias de máxima rotación)', 20) + body + rotulo(30, h - 60, 'Código: rack · columna · altura (0 = suelo). Ej. 2B4 = rack 2, columna B, altura 4.', 12, '#9fb3c6') + marco(w, h, 'Nave', 'Palés de alta rotación') };
  }
  function svgZona(zona, ctx) {
    const r = zona === 'nichero' ? svgNicheros(ctx) : zona === 'almacen' ? svgAlmacen(ctx) : svgNave(ctx);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.w} ${r.h}" style="width:${Math.round(S.zoom * 100)}%;min-width:${Math.round(r.w * .45 * S.zoom)}px" data-zona="${zona}" role="img" aria-label="Plano ${ZONA[zona]}">${r.body}</svg>`;
  }

  /* ---------- vistas ---------- */
  function cabecera() {
    const rv = M.revisar, pend = rv.raros.length + rv.normalizados.length + rv.fueraColumna.length;
    const tabs = [['plano', 'Plano'], ['lista', 'Buscar'], ['revisar', 'Revisar' + (pend ? `<span class="bdg">${pend}</span>` : '')], ['reorg', 'Reorganizar']];
    return `<header class="top"><img src="assets/logo-white.svg" alt="Tierra Nuestra"><div class="tit"><b>Croquis del almacén</b><span>Nicheros · Almacén tienda · Nave</span></div>
<nav>${tabs.map(([id, t]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}">${t}</button>`).join('')}</nav>
<div class="datos"><span id="sello">Datos ${DATA.origen === 'nube' ? 'de la nube' : 'de la foto'} · ${esc(fecha(DATA.generado))}</span><button class="btn" data-act="nube">Actualizar</button></div></header>`;
  }
  function statsZona(zona) {
    const hs = [...M.huecos.values()].filter(h => h.zona === zona), arts = new Set(); hs.forEach(h => h.arts.forEach(a => arts.add(a)));
    return { huecos: hs.length, arts: arts.size };
  }
  function vistaPlano() {
    const zonas = ['nichero', 'almacen', 'nave'].map(z => { const s = statsZona(z); return `<button data-zona="${z}" class="${S.zona === z ? 'on' : ''}"><b>${ZONA[z]}</b><small>${s.arts} vinos · ${s.huecos} huecos</small></button>`; }).join('');
    const ley = CQ.GRUPOS.map(g => `<button class="chip ${S.off.has(g.id) ? 'off' : ''}" data-grupo="${g.id}"><i style="background:${g.color}"></i>${g.nombre}</button>`).join('');
    return `<section class="plano"><div class="barra">
<div class="zonas">${zonas}</div>
<div class="buscador"><input id="q" type="search" autocomplete="off" placeholder="Buscar vino, código, código de barras o hueco (ej. F07)" value="${esc(S.q)}"><span class="nres" id="nres"></span><div id="sugs"></div></div>
<div class="leyenda">${ley}</div>
<div class="acciones"><button class="btn sm ${S.nombres ? 'on' : ''}" data-act="nombres" title="Ver nombres en el plano">Nombres</button><button class="btn sm" data-act="zoom-" title="Alejar">−</button><button class="btn sm" data-act="zoom+" title="Acercar">+</button><button class="btn sm" data-act="imprimir">Imprimir</button></div>
</div><div class="cuerpo"><div class="lienzo" id="lienzo"></div><aside class="detalle" id="detalle"></aside></div></section>`;
  }
  function pintarPlano() {
    const ctx = { hits: contextoResaltado() };
    $('#lienzo').innerHTML = svgZona(S.zona, ctx);
    const res = S.q.trim() ? CQ.buscar(M, S.q) : [];
    $('#nres').textContent = S.q.trim() ? res.length + (res.length === 1 ? ' vino' : ' vinos') : '';
    pintarSugs(res);
    pintarDetalle();
  }
  function pintarSugs(res) {
    const el = $('#sugs');
    if (!S.q.trim() || document.activeElement !== $('#q') || !res.length) { el.innerHTML = ''; return; }
    S.sug = Math.min(S.sug, Math.min(res.length, 8) - 1);
    el.innerHTML = `<div class="sugs">${res.slice(0, 8).map((a, i) => `<button data-sug="${i}" class="${i === S.sug ? 'act' : ''}"><i class="g" style="width:10px;height:10px;border-radius:3px;background:${GR[a.g].color}"></i><span>${esc(a.n)}<br><small style="color:#9fb3c6">${esc(a.c)}${a.dc ? ' · ' + esc(a.dc) : ''}</small></span><span class="locs">${a.locs.map(locChip).join('') || '<small>sin ubicación</small>'}</span></button>`).join('')}</div>`;
    el._res = res;
  }
  function irA(k) {
    const zona = k.split(':')[0];
    S.tab = 'plano'; S.zona = zona; S.sel = k;
    render();
    requestAnimationFrame(() => {
      const g = $(`#lienzo [data-k="${CSS.escape(k)}"]`);
      if (g) { const r = g.getBoundingClientRect(), L = $('#lienzo'), lr = L.getBoundingClientRect();
        L.scrollBy({ left: r.left - lr.left - lr.width / 2 + r.width / 2, top: r.top - lr.top - lr.height / 2 + r.height / 2, behavior: 'smooth' }); }
    });
  }
  function pintarDetalle() {
    const el = $('#detalle'); if (!el) return;
    if (!S.sel) {
      const hs = [...M.huecos.values()].filter(h => h.zona === S.zona), arts = new Set(); hs.forEach(h => h.arts.forEach(a => arts.add(a)));
      const por = {}; arts.forEach(a => por[a.g] = (por[a.g] || 0) + 1); const mx = Math.max(1, ...Object.values(por));
      el.innerHTML = `<div class="caps" style="color:#9fb3c6;font-size:12px">Resumen</div><h2>${ZONA[S.zona]}</h2>
<div class="tarjetas"><div class="tarjeta"><b>${arts.size}</b><small>vinos ubicados</small></div><div class="tarjeta"><b>${hs.length}</b><small>huecos ocupados</small></div></div>
<div class="barras">${CQ.GRUPOS.filter(g => por[g.id]).map(g => `<div class="fila"><span>${g.nombre}</span><div class="b"><span style="width:${por[g.id] / mx * 100}%;background:${g.color}"></span></div><span class="num">${por[g.id]}</span></div>`).join('')}</div>
<p class="ayuda">Toca un hueco del plano para ver qué vinos hay. Usa el buscador para encontrar un vino: su hueco se ilumina. Las leyendas de colores sirven de filtro.</p>`;
      return;
    }
    const H = M.huecos.get(S.sel), cod = S.sel.split(':')[1], arts = H ? H.arts : [];
    const texto = H ? H.info.texto : cod;
    el.innerHTML = `<div class="caps" style="color:#9fb3c6;font-size:12px">${ZONA[S.sel.split(':')[0]]}</div><h2 id="sel-cod">${esc(texto)}</h2><div class="que">${esc(describir(S.sel))}</div>
${arts.length ? arts.map(a => `<div class="vino" data-c="${esc(a.c)}"><i style="background:${GR[a.g].color}"></i><div><b>${esc(a.n)}</b><small>${esc(a.c)} · ${esc(a.t || GR[a.g].nombre)}${a.dc ? ' · ' + esc(a.dc) : ''}</small><div>${a.locs.map(l => (l.zona + ':' + l.hueco === S.sel ? '' : locChip(l))).join('')}</div></div></div>`).join('') : '<p class="ayuda">Hueco vacío: no hay ningún vino apuntado aquí.</p>'}
<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><a class="btn sm" href="../ubicaciones/?loc=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Abrir en Ubicaciones</a><button class="btn sm" data-act="cerrar">Cerrar</button></div>`;
  }

  function vistaLista() {
    let arts = S.lq.trim() ? CQ.buscar(M, S.lq) : M.articulos.slice();
    if (S.lg) arts = arts.filter(a => a.g === S.lg);
    const k = S.lorden;
    arts.sort((x, y) => k === 'd' ? (x.dc || '~').localeCompare(y.dc || '~', 'es') || x.n.localeCompare(y.n, 'es') : k === 't' ? x.ot - y.ot || x.n.localeCompare(y.n, 'es') : x.n.localeCompare(y.n, 'es', { numeric: true }));
    const col = (a, z) => a.locs.filter(l => l.zona === z).map(locChip).join('') || '<span style="color:#55708a">—</span>';
    return `<div class="vista"><h1>Todos los vinos ubicados</h1>
<div class="filtros"><div class="buscador" style="max-width:520px"><input id="lq" type="search" placeholder="Nombre, código, código de barras, D.O. o hueco" value="${esc(S.lq)}"></div>
<select id="lg"><option value="">Todos los tipos</option>${CQ.GRUPOS.map(g => `<option value="${g.id}" ${S.lg === g.id ? 'selected' : ''}>${g.nombre}</option>`).join('')}</select>
<span class="ayuda" id="lcnt">${arts.length} vinos</span></div>
<table class="tabla" id="tlista"><thead><tr><th data-lorden="n">Vino</th><th data-lorden="t" class="ocm">Tipo</th><th data-lorden="d" class="ocm">D.O.</th><th>Nichero</th><th>Almacén</th><th>Nave</th></tr></thead><tbody>
${arts.map(a => `<tr><td><i class="g" style="background:${GR[a.g].color}"></i>${esc(a.n)}<br><small style="color:#9fb3c6">${esc(a.c)}</small></td><td class="ocm">${esc(a.t || '—')}</td><td class="ocm">${esc(a.dc || '—')}</td><td>${col(a, 'nichero')}</td><td>${col(a, 'almacen')}</td><td>${col(a, 'nave')}</td></tr>`).join('')}
</tbody></table></div>`;
  }

  const SECCIONES = [
    ['raros', 'Códigos que no entiendo', 'No siguen ningún formato conocido. Corrígelos en la app Ubicaciones.', r => [r.a.n, r.a.c, r.raw], ['Vino', 'Código', 'Escrito']],
    ['normalizados', 'Códigos escritos de otra forma', 'Minúsculas, espacios o códigos de Nave en la columna de nicheros/almacén. El croquis ya los entiende; conviene dejarlos limpios.', r => [r.a.n, r.a.c, r.raw, r.leido], ['Vino', 'Código', 'Escrito', 'Leído como']],
    ['fueraColumna', 'Vino en una columna de otro color', 'Columnas A,C,D,E,F son de tintos, B de blancos y G de rosados.', r => [r.a.n, r.a.c, r.hueco, GR[r.es].nombre, GR[r.esperado].nombre], ['Vino', 'Código', 'Hueco', 'Es', 'Columna de']],
    ['fueraPlan', 'Nicheros fuera del plan inicial', 'Huecos con número mayor que el previsto o con “S”. Puede que el mueble tenga más huecos: confírmalo y ajusto el plano.', r => [r.a.n, r.a.c, r.hueco, r.plan], ['Vino', 'Código', 'Hueco', 'Plan']],
    ['noMercancia', 'No es vino suelto', 'Estuches, cajas, copas, aceite… Están ubicados, pero quizá no deban ocupar hueco de vino.', r => [r.a.n, r.a.c, r.a.t, r.a.locs.map(l => l.texto).join(' / ')], ['Artículo', 'Código', 'Tipo', 'Ubicación']],
    ['sinTipo', 'Sin tipo en el catálogo', 'No aparecen en el catálogo de artículos; el color se ha deducido por el nombre.', r => [r.a.n, r.a.c, GR[r.a.g].nombre, r.a.locs.map(l => l.texto).join(' / ')], ['Vino', 'Código', 'Deducido', 'Ubicación']],
  ];
  function vistaRevisar() {
    const r = M.revisar;
    return `<div class="vista"><h1>Revisar datos</h1><p class="ayuda">Control de calidad de las ubicaciones (${M.articulos.length} vinos, ${M.huecos.size} huecos). Nada de esto cambia tus datos: es una lista para corregir con calma.</p>
<div style="margin:8px 0"><button class="btn sm" data-csv="todo">Descargar todo (Excel/CSV)</button></div>
${SECCIONES.map(([k, t, ayuda, fila, cols]) => `<details class="seccion" data-sec="${k}" ${r[k].length && (k === 'raros' || k === 'fueraColumna') ? 'open' : ''}><summary><b>${t}</b><span class="cnt ${r[k].length ? '' : 'ok'}">${r[k].length || '✓'}</span></summary><div class="dentro"><p class="ayuda">${ayuda}</p>
${r[k].length ? `<table class="tabla"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${r[k].map(x => `<tr>${fila(x).map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><div style="margin-top:8px"><button class="btn sm" data-csv="${k}">Descargar esta lista</button></div>` : '<p class="ayuda">Todo correcto.</p>'}</div></details>`).join('')}</div>`;
  }

  function propuesta() { return CQ.proponer(M, { porHueco: S.porHueco, orden: S.orden }); }
  function vistaReorg() {
    const P = propuesta(), mapa = new Map();
    for (const f of P.filas) if (f.hasta && /^[A-G]\d{2}$/.test(f.hasta)) { const k = 'nichero:' + f.hasta; if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(f.a); }
    const filas = S.soloCambian ? P.filas.filter(f => f.cambia) : P.filas;
    const ordenTxt = { tipo: 'Tipo → D.O. → A-Z', do: 'D.O. → A-Z', az: 'Solo A-Z' };
    return `<div class="vista"><h1>Reorganizar nicheros</h1>
<p class="ayuda">Propuesta para ordenar los nicheros por color (A,C,D,E,F tintos · B blancos · G rosados) y dentro de cada color por tipo (joven → roble → crianza → reserva), denominación de origen y orden alfabético. <b>Es solo una simulación: no cambia nada</b> en Ubicaciones ni en Sage.</p>
<div class="filtros"><label>Vinos por hueco <select id="porHueco">${[1, 2, 3].map(n => `<option ${S.porHueco === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
<label>Orden <select id="orden">${Object.entries(ordenTxt).map(([k, t]) => `<option value="${k}" ${S.orden === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
<button class="btn sm" data-csv="reorg">Descargar lista de cambios</button><button class="btn sm" data-act="imprimir">Imprimir</button></div>
<div class="tarjetas" id="reorg-stats"><div class="tarjeta"><b>${P.total}</b><small>vinos en nicheros</small></div><div class="tarjeta"><b>${P.mueve}</b><small>cambian de hueco</small></div><div class="tarjeta"><b>${P.total - P.mueve}</b><small>se quedan igual</small></div><div class="tarjeta"><b>${P.noCaben.length}</b><small>no caben</small></div><div class="tarjeta"><b>${P.aAlmacen.length}</b><small>mejor en almacén zona 1</small></div></div>
<div class="lienzo" style="border-radius:12px;max-height:none">${svgZona('nichero', { mapa })}</div>
<div class="filtros"><label><input type="checkbox" id="soloCambian" ${S.soloCambian ? 'checked' : ''}> Ver solo los que cambian</label></div>
<table class="tabla" id="treorg"><thead><tr><th>Vino</th><th class="ocm">Tipo</th><th class="ocm">D.O.</th><th>Ahora</th><th></th><th>Propuesto</th></tr></thead><tbody>
${filas.map(f => `<tr><td><i class="g" style="background:${GR[f.a.g].color}"></i>${esc(f.a.n)}</td><td class="ocm">${esc(f.a.t || GR[f.a.g].nombre)}</td><td class="ocm">${esc(f.a.dc || '—')}</td><td>${f.desde.map(h => `<span class="loc nichero" data-ir="nichero:${h}">${h}</span>`).join('')}</td><td class="flecha">→</td><td><b>${esc(f.hasta || 'No cabe')}</b></td></tr>`).join('')}
</tbody></table></div>`;
  }

  /* ---------- CSV ---------- */
  function descargarCSV(nombre, cab, filas) {
    const q = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const txt = '\ufeff' + [cab, ...filas].map(f => f.map(q).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csv(k) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (k === 'reorg') { const P = propuesta(); return descargarCSV(`reorganizar-nicheros-${hoy}.csv`, ['Código', 'Vino', 'Tipo', 'D.O.', 'Ahora', 'Propuesto', 'Cambia'], P.filas.map(f => [f.a.c, f.a.n, f.a.t, f.a.dc, f.desde.join(' / '), f.hasta || 'No cabe', f.cambia ? 'Sí' : 'No'])); }
    const secs = k === 'todo' ? SECCIONES : SECCIONES.filter(s => s[0] === k);
    const filas = [];
    for (const [id, t, , fila] of secs) for (const x of M.revisar[id]) filas.push([t, ...fila(x)]);
    descargarCSV(`revisar-ubicaciones-${k}-${hoy}.csv`, ['Apartado', 'Nombre', 'Código', 'Dato 1', 'Dato 2', 'Dato 3'], filas);
  }

  /* ---------- nube ---------- */
  function modalNube() {
    $('#modal-root').innerHTML = `<div class="modal-fondo" data-act="cerrar-modal"><form class="modal" id="fnube"><h3>Actualizar desde la nube</h3><p class="ayuda">Trae las ubicaciones al momento desde la app Ubicaciones. Usa la misma contraseña del equipo.</p>
<input id="pw" type="password" placeholder="Contraseña del equipo" autocomplete="current-password" required><div class="err" id="perr"></div>
<div class="pie"><button type="button" class="btn" data-act="cerrar-modal">Cancelar</button><button class="btn vino" id="pok">Actualizar</button></div></form></div>`;
    $('#pw').focus();
  }
  async function actualizarNube(pw) {
    const h = { apikey: NUBE.anon, 'Content-Type': 'application/json' };
    const r = await fetch(NUBE.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: h, body: JSON.stringify({ email: NUBE.email, password: pw }) });
    if (!r.ok) throw new Error(r.status === 400 ? 'Contraseña incorrecta' : 'No se pudo entrar (' + r.status + ')');
    const tok = (await r.json()).access_token, ah = { apikey: NUBE.anon, Authorization: 'Bearer ' + tok };
    const get = async p => { const x = await fetch(NUBE.url + '/rest/v1/' + p, { headers: { ...ah, Range: '0-9999' } }); if (!x.ok) throw new Error('Error leyendo datos (' + x.status + ')'); return x.json(); };
    const [arts, cat] = await Promise.all([get('articulos?select=c,n,u,v,b'), get('wa_articulos?select=codigo,tipo,denominacion,bodega')]);
    const porCod = new Map(cat.map(c => [String(c.codigo).trim(), c]));
    const lista = arts.map(a => { const c = porCod.get(String(a.c).trim()) || {}; return { c: a.c, n: a.n, u: a.u || '', v: a.v || '', b: a.b || [], t: c.tipo || '', d: c.denominacion || '', bo: c.bodega || '' }; });
    const now = new Date(), gen = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    const d = { generado: gen, articulos: lista };
    localStorage.setItem('cq_nube', JSON.stringify(d));
    DATA = { ...d, origen: 'nube' }; M = CQ.construir(DATA.articulos);
    return lista.length;
  }

  /* ---------- render y eventos ---------- */
  function render() {
    const vistas = { plano: vistaPlano, lista: vistaLista, revisar: vistaRevisar, reorg: vistaReorg };
    app.innerHTML = cabecera() + vistas[S.tab]();
    if (S.tab === 'plano') pintarPlano();
  }
  app.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-zona],[data-grupo],[data-act],[data-k],[data-ir],[data-sug],[data-csv],[data-lorden]');
    if (!t) { if (!e.target.closest('.buscador')) { const s = $('#sugs'); if (s) s.innerHTML = ''; } return; }
    if (t.dataset.tab) { S.tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.zona) { S.zona = t.dataset.zona; S.sel = null; render(); return; }
    if (t.dataset.grupo) { const g = t.dataset.grupo; S.off.has(g) ? S.off.delete(g) : S.off.add(g); t.classList.toggle('off'); pintarPlano(); return; }
    if (t.dataset.ir) { e.stopPropagation(); irA(t.dataset.ir); return; }
    if (t.dataset.sug != null) { const a = $('#sugs')._res[+t.dataset.sug]; elegirArticulo(a); return; }
    if (t.dataset.k) { S.sel = S.sel === t.dataset.k ? null : t.dataset.k; pintarPlano(); return; }
    if (t.dataset.csv) { csv(t.dataset.csv); return; }
    if (t.dataset.lorden) { S.lorden = t.dataset.lorden; render(); return; }
    const act = t.dataset.act;
    if (act === 'nombres') { S.nombres = !S.nombres; t.classList.toggle('on'); pintarPlano(); }
    else if (act === 'zoom+') { S.zoom = Math.min(4, S.zoom * 1.3); pintarPlano(); }
    else if (act === 'zoom-') { S.zoom = Math.max(.5, S.zoom / 1.3); pintarPlano(); }
    else if (act === 'imprimir') window.print();
    else if (act === 'cerrar') { S.sel = null; pintarPlano(); }
    else if (act === 'nube') modalNube();
  });
  function elegirArticulo(a) {
    if (!a) return;
    const l = a.locs.find(l => l.zona === S.zona) || a.locs[0];
    const s = $('#sugs'); if (s) s.innerHTML = '';
    if (l) irA(l.zona + ':' + l.hueco); else toast('Este vino no tiene ubicación');
  }
  app.addEventListener('input', e => {
    if (e.target.id === 'q') { S.q = e.target.value; S.sug = 0; pintarPlano(); }
    if (e.target.id === 'lq') { S.lq = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#lq'); i.focus(); i.setSelectionRange(pos, pos); }
  });
  app.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'lg') { S.lg = e.target.value; render(); }
    if (id === 'porHueco') { S.porHueco = +e.target.value; render(); }
    if (id === 'orden') { S.orden = e.target.value; render(); }
    if (id === 'soloCambian') { S.soloCambian = e.target.checked; render(); }
  });
  app.addEventListener('keydown', e => {
    if (e.target.id !== 'q') return;
    const res = $('#sugs')._res || [], n = Math.min(res.length, 8);
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); S.sug = (S.sug + 1) % n; pintarSugs(res); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); S.sug = (S.sug - 1 + n) % n; pintarSugs(res); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const loc = e.target.value.toUpperCase().replace(/\s+/g, '');
      const k = ['nichero', 'almacen', 'nave'].map(z => z + ':' + loc).find(k => M.huecos.has(k));
      if (k) { irA(k); return; }
      if (res.length) elegirArticulo(res[S.sug] || res[0]); else toast('No encuentro nada con “' + e.target.value + '”');
    } else if (e.key === 'Escape') { S.q = ''; e.target.value = ''; pintarPlano(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && S.tab === 'plano' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && S.sel && document.activeElement.tagName !== 'INPUT') { S.sel = null; pintarPlano(); }
  });
  $('#modal-root').addEventListener('click', e => { if (e.target.dataset.act === 'cerrar-modal') $('#modal-root').innerHTML = ''; });
  $('#modal-root').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#pok'); b.disabled = true; b.textContent = 'Actualizando…'; $('#perr').textContent = '';
    try { const n = await actualizarNube($('#pw').value); $('#modal-root').innerHTML = ''; render(); toast(n + ' vinos actualizados desde la nube'); }
    catch (err) { $('#perr').textContent = err.message === 'Failed to fetch' ? 'Sin conexión. Prueba de nuevo.' : err.message; b.disabled = false; b.textContent = 'Actualizar'; }
  });

  // enlaces directos: ?loc=F07 · ?q=texto · ?tab=revisar · ?zona=nave
  const P = new URLSearchParams(location.search);
  if (P.get('tab') && ['plano', 'lista', 'revisar', 'reorg'].includes(P.get('tab'))) S.tab = P.get('tab');
  if (P.get('zona') && ZONA[P.get('zona')]) S.zona = P.get('zona');
  if (P.get('q')) S.q = P.get('q');
  render();
  if (P.get('loc')) {
    const loc = CQ.leerCodigo(P.get('loc'), 'u') || CQ.leerCodigo(P.get('loc'), 'v');
    if (loc) irA(loc.zona + ':' + loc.hueco);
  }
  window.__CQ = { get M() { return M; }, S, render, irA };
})();
