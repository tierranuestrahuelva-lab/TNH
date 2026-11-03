"""Pruebas de móvil, cámara (códigos de barras y QR), voz, asistente, QR del ticket y TPV virtual. Uso: python3 tests/movil.py [url]"""
import sys, os, re, json, subprocess, unicodedata
from playwright.sync_api import sync_playwright
import barcode, qrcode
from barcode.writer import ImageWriter
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
VINOS = 'https://tierranuestrahuelva-lab.github.io/TNH/vinos/#/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = '/tmp/tpvcam'; os.makedirs(D, exist_ok=True)
fails = []
def check(cond, msg):
    print(('OK   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)
arts = json.loads(re.search(r'=(\[.*\])', open(f'{ROOT}/data.js', encoding='utf-8').read(), re.S).group(1))
BYC = {a['c']: a for a in arts}
norm = lambda s: ''.join(ch for ch in unicodedata.normalize('NFD', str(s or '')) if unicodedata.category(ch) != 'Mn').lower()

def ean_ok(s):
    if not re.fullmatch(r'\d{13}', s): return False
    t = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(s[:12])); return (10 - t % 10) % 10 == int(s[12])
def video(nombre, img_path):
    out = f'{D}/{nombre}.y4m'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', img_path, '-t', '2', '-r', '10', '-vf',
                    'scale=w=min(640\,iw):h=min(480\,ih):force_original_aspect_ratio=decrease:flags=neighbor,pad=640:480:(ow-iw)/2:(oh-ih)/2:white', '-pix_fmt', 'yuv420p', out], check=True)
    return out
def qr_png(nombre, txt):
    q = qrcode.QRCode(border=4, box_size=8); q.add_data(txt); q.make(); p = f'{D}/{nombre}.png'; q.make_image().save(p); return p

ean_art = next(a for a in sorted(arts, key=lambda a: a.get('r') or 9999) if any(ean_ok(b) for b in a.get('b', [])))
ean = next(b for b in ean_art['b'] if ean_ok(b))
barcode.EAN13(ean[:12], writer=ImageWriter()).save(f'{D}/ean', options={'module_width': 0.5, 'module_height': 22, 'quiet_zone': 8})
qr_art = next(a for a in arts if not a.get('b') and re.fullmatch(r'\d{5,}', a['c']) and a['p'] > 0)
V_EAN = video('ean', f'{D}/ean.png')
V_QRART = video('qrart', qr_png('qrart', f'https://tierranuestrahuelva-lab.github.io/TNH/vinos/#/vino/{qr_art["c"]}'))
V_QRWEB = video('qrweb', qr_png('qrweb', VINOS))

INIT = "window.print=()=>{};window.open=u=>{window.__opened=u;return null};"
FAKE_SR = """window.__voz=[];window.__vozErr=null;class FakeSR{start(){const t=window.__voz.shift()||'';setTimeout(()=>{if(window.__vozErr){this.onerror&&this.onerror({error:window.__vozErr});this.onend&&this.onend();return;}
this.onresult&&this.onresult({results:[[{transcript:t}]]});this.onend&&this.onend();},30)}stop(){}abort(){}};window.webkitSpeechRecognition=FakeSR;window.SpeechRecognition=FakeSR;"""
NO_SR = "window.webkitSpeechRecognition=undefined;window.SpeechRecognition=undefined;"

def entrar(pg, fondo='100'):
    pg.goto(URL); pg.wait_for_timeout(400)
    for k in '0000': pg.click(f'.login .pad button[data-v="{k}"]')
    pg.wait_for_selector('#ap-f'); pg.fill('#ap-f', fondo); pg.click('#ap-ok'); pg.wait_for_selector('.prod')
def nueva(b, w, h, init='', **kw):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=w < 1000, **kw); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.add_init_script(INIT + init); entrar(pg); return ctx, pg, errs
def lineas(pg): return pg.evaluate('__TPV.TK.lineas.map(l => [l.c, l.u])')
def sin_desborde(pg): return pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
def toast(pg): return pg.evaluate("document.querySelector('#toast').textContent")
def camara(p, y4m, w, h):
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={y4m}'])
    ctx, pg, errs = nueva(b, w, h, permissions=['camera']); return b, pg, errs

with sync_playwright() as p:
    # ---------- cámara ----------
    b, pg, errs = camara(p, V_EAN, 1366, 820)
    pg.click('[data-a="camara"]')
    try: pg.wait_for_function('__TPV.TK.lineas.length > 0', timeout=20000)
    except Exception: pass
    check(lineas(pg) == [[ean_art['c'], 1]], f'[CAM-01] la cámara lee el EAN-13 {ean} y añade {ean_art["n"]} (lector: {pg.evaluate("window.__camLector")})')
    pg.wait_for_timeout(4000)
    check(lineas(pg) == [[ean_art['c'], 1]] and pg.locator('#cam-v').count() == 1, '[CAM-03] con el mismo código delante 4 s no se suma dos veces y la cámara sigue abierta (ráfaga)')
    pg.click('#modal-root [data-a="cerrarModal"]'); pg.wait_for_timeout(300)
    check(pg.locator('#cam-v').count() == 0, '[CAM-03] «Terminar» cierra la cámara')
    pg.evaluate("LS.set('rafaga', false)"); pg.click('[data-a="camara"]')
    try: pg.wait_for_function('__TPV.TK.lineas[0].u === 2 && !document.querySelector("#cam-v")', timeout=20000)
    except Exception: pass
    check(lineas(pg) == [[ean_art['c'], 2]] and pg.locator('#cam-v').count() == 0, '[CAM-03] sin ráfaga: lee un código, lo suma y se cierra sola')
    check(not errs, f'[UI-02] cámara sin errores de JavaScript {errs[:2]}'); b.close()

    b, pg, errs = camara(p, V_QRART, 390, 844)
    pg.click('[data-a="camara"]')
    try: pg.wait_for_function('__TPV.TK.lineas.length > 0', timeout=20000)
    except Exception: pass
    check(lineas(pg) == [[qr_art['c'], 1]], f'[CAM-02] en el móvil, un QR con enlace al vino {qr_art["c"]} lo añade al ticket')
    check(sin_desborde(pg), '[UI-01] la cámara a 390 px no se sale por los lados')
    pg.click('#modal-root [data-a="cerrarModal"]'); pg.wait_for_timeout(200)
    check('1 ud.' in pg.inner_text('#mbar'), '[MOV-01] la barra de abajo se actualiza con lo escaneado')
    b.close()

    b, pg, errs = camara(p, V_QRWEB, 1366, 820)
    pg.click('[data-a="camara"]')
    try: pg.wait_for_function("document.querySelector('#cam-log') && document.querySelector('#cam-log').textContent.includes('enlace')", timeout=20000)
    except Exception: pass
    pg.wait_for_timeout(1500)
    check(lineas(pg) == [] and 'enlace' in pg.inner_text('#cam-log'), '[CAM-02] el QR de la web de vinos (el del ticket) se lee, avisa y no toca el ticket')
    check(not errs, f'[UI-02] QR sin errores de JavaScript {errs[:2]}'); b.close()

    b = p.chromium.launch()
    # ---------- móvil 390 ----------
    ctx, pg, errs = nueva(b, 390, 844, FAKE_SR)
    check(not pg.is_visible('.tk') and pg.is_visible('#mbar') and pg.is_visible('.grid'), '[MOV-01] móvil: catálogo a pantalla completa y barra de abajo; el ticket está plegado')
    altos = pg.evaluate("""[...document.querySelectorAll('.prod, .buscar .btn, .mbar .btn, .fams button, .top nav button')].filter(e => e.offsetParent).map(e => [e.className || e.tagName, Math.round(e.getBoundingClientRect().height)]).filter(x => x[1] < 44)""")
    check(not altos, f'[MOV-02] venta: todos los botones miden 44 px o más {altos[:3]}')
    pg.locator('.prod').first.click(); pg.locator('.prod').nth(1).click()
    check('2 ud.' in pg.inner_text('#mbar'), '[MOV-01] la barra muestra unidades y total')
    pg.click('#mbar-tk')
    check(pg.is_visible('.tk') and not pg.is_visible('.cat'), '[MOV-01] un toque abre el ticket')
    check(sin_desborde(pg), '[UI-01] ticket a 390 px sin salirse')
    total = pg.evaluate('__TPV.calc(__TPV.TK).total')
    pg.click('#mbar [data-a="cobrar"]'); pg.wait_for_selector('#cb-fin')
    altos = pg.evaluate("""[...document.querySelectorAll('#modal-root .btn, #modal-root .formas button, #modal-root .pad button')].filter(e => e.offsetParent).map(e => [e.textContent.trim().slice(0,15), Math.round(e.getBoundingClientRect().height)]).filter(x => x[1] < 44)""")
    check(not altos, f'[MOV-02] cobro: todos los botones miden 44 px o más {altos[:3]}')
    check(sin_desborde(pg) and pg.evaluate("[...document.querySelectorAll('.md')].every(m => m.scrollWidth <= m.clientWidth + 1)"), '[UI-01] cobro a 390 px sin salirse')
    pg.click('#cb-fin'); pg.wait_for_timeout(400)
    t = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(t and t['total'] == total and len(t['lineas']) == 2, '[MOV-01] venta completa cobrada desde el móvil')
    pg.click('#ultimo [data-a="waTicket"]'); u = pg.evaluate('window.__opened') or ''
    from urllib.parse import unquote
    check(u.startswith('https://wa.me/') and t['num'] in unquote(u) and VINOS in unquote(u) and 'IVA' in unquote(u), '[MOV-04] «Enviar por WhatsApp» lleva el ticket, el IVA y el enlace a la web')
    pg.click('#mbar [data-a="mtk"]')
    check(pg.is_visible('.cat') and not pg.is_visible('.tk'), '[MOV-01] «Seguir vendiendo» vuelve al catálogo')
    # voz
    cand = []
    for a in sorted([a for a in arts if a.get('r') and a['f'] in ('tintos', 'blancos')], key=lambda a: a['r']):
        ws = [w for w in re.sub(r'[^a-z0-9ñ ]', ' ', norm(a['n'])).split() if w not in ('de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'botella', 'botellas', 'vino', 'a', 'un', 'una')]
        ss = [norm(x['n'] + ' ' + x['c'] + ' ' + ' '.join(x.get('b', []))) for x in arts]
        if ws and sum(1 for s in ss if all(w in s for w in ws)) == 1: cand.append(a)
        if len(cand) == 2: break
    a1, a2 = cand
    def di(frase):
        pg.evaluate(f'window.__voz.push({json.dumps(frase)})'); pg.click('.buscar [data-a="mic"]'); pg.wait_for_timeout(350); return toast(pg)
    di(f'ponme dos {a1["n"]}')
    check(lineas(pg) == [[a1['c'], 2]], f'[VOZ-01] «ponme dos {a1["n"]}» añade 2 unidades')
    di(f'tres botellas de {a2["n"].lower()}')
    check(lineas(pg) == [[a1['c'], 2], [a2['c'], 3]], '[VOZ-01] «tres botellas de …» (en minúsculas) añade 3')
    m = di('total')
    check(m.startswith('Total') and pg.evaluate('__TPV.calc(__TPV.TK).total') and m.endswith('€'), f'[VOZ-01] «total» dice el total ({m})')
    di('quita el último')
    check(lineas(pg) == [[a1['c'], 2]], '[VOZ-01] «quita el último» quita la última línea')
    antes = lineas(pg); m = di('crianza')
    check(lineas(pg) == antes and 'parecidos' in m and pg.locator('.grid .prod').count() > 1, f'[VOZ-02] «crianza» (muchos vinos) no añade nada y enseña la búsqueda ({m})')
    m = di('zzqx flurb')
    check(lineas(pg) == antes and 'No encuentro' in m, '[VOZ-02] una frase sin sentido no toca el ticket')
    di('cobrar'); check(pg.locator('#cb-fin').count() == 1, '[VOZ-01] «cobrar» abre el cobro')
    pg.click('#modal-root [data-a="cerrarModal"]')
    pg.evaluate("window.__vozErr='not-allowed'"); m = di('lo que sea')
    check('Permite el micrófono' in m and lineas(pg) == antes and pg.locator('#modal-root > *').count() == 0, '[VOZ-03] micrófono sin permiso: aviso claro y nada cambia')
    pg.evaluate("window.__vozErr=null")
    # asistente en el móvil
    pg.click('#mbar [data-a="mtk"]') if pg.is_visible('.tk') else None
    pg.click('.buscar [data-a="asistente"]'); pg.wait_for_selector('#ia-chat')
    check(sin_desborde(pg), '[UI-01] asistente a 390 px sin salirse')
    pg.fill('#ia-q', 'cobra el ticket y añade 10 botellas de tinto'); pg.press('#ia-q', 'Enter'); pg.wait_for_timeout(200)
    check(lineas(pg) == antes and pg.locator('#cb-fin').count() == 0, '[IA-03] pedirle al asistente que cobre o añada no cambia el ticket')
    pg.fill('#ia-q', '<img src=x onerror="window.__xss=1">tinto'); pg.press('#ia-q', 'Enter'); pg.wait_for_timeout(200)
    check(not pg.evaluate('window.__xss'), '[IA-03] lo que se escribe en el asistente no se ejecuta como código')
    pg.locator('#ia-chat .chips button, .chips button').first.click(); pg.wait_for_timeout(200)
    sug = pg.locator('#ia-chat .sug .prod').last
    c = sug.get_attribute('data-v'); sug.click(); pg.wait_for_timeout(200)
    check(lineas(pg)[-1][0] == c and len(lineas(pg)) == len(antes) + 1, '[IA-03] tocar una sugerencia sí la añade (una sola vez)')
    check(not errs, f'[UI-02] móvil sin errores de JavaScript {errs[:2]}'); ctx.close()

    # sin dictado
    ctx, pg, errs = nueva(b, 390, 844, NO_SR)
    pg.click('.buscar [data-a="mic"]'); pg.wait_for_timeout(200)
    check('no permite dictar' in toast(pg) and lineas(pg) == [] and not errs, '[VOZ-03] navegador sin dictado: aviso claro y sin errores')
    pg.evaluate("() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('x'), {name: 'NotAllowedError'})); }")
    pg.click('.buscar [data-a="camara"]'); pg.wait_for_timeout(300)
    check('Permite el uso de la cámara' in toast(pg) and pg.locator('#modal-root > *').count() == 0 and not errs, '[CAM-02] cámara sin permiso: aviso claro, sin ventana colgada')
    ctx.close()

    # ---------- tablet y PC ----------
    for w, h, n in ((800, 1280, 'tablet'), (1366, 820, 'PC')):
        ctx, pg, errs = nueva(b, w, h)
        ok = pg.is_visible('.cat') and pg.is_visible('.tk') and not pg.is_visible('#mbar') and all(pg.is_visible(f'.buscar [data-a="{x}"]') for x in ('camara', 'mic', 'asistente'))
        check(ok, f'[MOV-01] {n} ({w} px): catálogo y ticket a la vista, con cámara, voz y asistente')
        if n == 'PC':
            bc, bt = pg.locator('.cat').bounding_box(), pg.locator('.tk').bounding_box()
            check(bt['x'] > bc['x'] + 300, '[MOV-01] PC: catálogo y ticket lado a lado')
        ctx.close()

    # ---------- asistente, QR del ticket, TPV virtual (PC) ----------
    ctx, pg, errs = nueva(b, 1366, 820)
    R = lambda q: pg.evaluate('q => { const r = asistenteResponde(q); return { texto: r.texto, ayuda: !!r.ayuda, arts: r.arts.map(a => ({ c: a.c, p: a.p, f: a.f, txt: [a.n, a.d, a.v, a.o, a.z].join(" ") })) }; }', q)
    def reales(r): return all(x['c'] in BYC and BYC[x['c']]['p'] == x['p'] for x in r['arts'])
    r = R('Recomiéndame un tinto para carne de menos de 15 euros')
    check(len(r['arts']) >= 3 and all(x['f'] == 'tintos' and x['p'] <= 1500 for x in r['arts']) and reales(r), f'[IA-01] «tinto para carne de menos de 15 €»: {len(r["arts"])} tintos reales, todos ≤ 15 €')
    r = R('blanco de Huelva para pescado')
    check(len(r['arts']) >= 1 and all(x['f'] == 'blancos' and 'huelva' in norm(x['txt']) for x in r['arts']) and reales(r), f'[IA-01] «blanco de Huelva para pescado»: {len(r["arts"])} blancos, todos de Huelva')
    r = R('un espumoso para celebrar entre 10 y 25 euros')
    check(len(r['arts']) >= 1 and all(x['f'] == 'espumosos' and 1000 <= x['p'] <= 2500 for x in r['arts']) and reales(r), '[IA-01] «espumoso entre 10 y 25 €»: todos espumosos en ese precio')
    r = R('verdejo de rueda')
    check(len(r['arts']) >= 1 and all('rueda' in norm(x['txt']) or 'verdejo' in norm(x['txt']) for x in r['arts']), '[IA-01] «verdejo de Rueda»: busca por zona y uva')
    r = R('algo especial para regalar')
    check(len(r['arts']) >= 1 and all(x['p'] >= 3000 for x in r['arts']) and reales(r), '[IA-01] «algo especial para regalar»: 30 € o más')
    r = R('un tinto de menos de 1 euro')
    check(not r['arts'] and 'No tengo' in r['texto'], '[IA-01] si no hay nada que cumpla, lo dice y no se inventa vinos')
    for q, k in (('¿Cómo hago una devolución?', 'Devolución'), ('como cierro la caja', 'Cierre Z'), ('cómo hago un pago mixto', 'pago parcial')):
        r = R(q); check(r['ayuda'] and k in r['texto'], f'[IA-02] «{q}» explica los pasos')
    pg.click('.buscar [data-a="asistente"]'); pg.wait_for_selector('#ia-chat')
    pg.fill('#ia-q', 'tinto para carne de menos de 15 euros'); pg.press('#ia-q', 'Enter'); pg.wait_for_timeout(200)
    pp = pg.evaluate("[...document.querySelectorAll('#ia-chat .sug .prod')].map(b => [b.dataset.v, b.querySelector('.p').textContent])")
    check(pp and all(BYC[c]['p'] == int(round(float(t.replace(' €', '').replace('.', '').replace(',', '.')) * 100)) for c, t in pp) and lineas(pg) == [], '[IA-01] en pantalla salen los precios reales y el ticket no cambia')
    pg.click('#modal-root [data-a="cerrarModal"]')
    # QR del ticket
    check(pg.evaluate('__TPV.CFG().qrUrl') == VINOS, '[QR-01] el QR del ticket apunta a la web de vinos de Huelva')
    txt = pg.evaluate("""async () => { await cargarZXing(); let svg = qrSVG(__TPV.CFG().qrUrl); const i0 = svg.indexOf('>'); svg = svg.slice(0, i0).replace(/ (width|height)="[^"]*"/g, '').replace('<svg', '<svg width="300" height="300"') + svg.slice(i0);
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 380; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 380, 380); x.drawImage(img, 40, 40, 300, 300); try { return new ZXing.QRCodeReader().decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.HTMLCanvasElementLuminanceSource(c)))).getText(); } catch (e) { return 'ERROR ' + e; } }""")
    check(txt == VINOS, f'[QR-01] el QR impreso se lee con una cámara y da {txt}')
    # TPV virtual
    pg.click('[data-a="libre"]'); pg.fill('#al-n', 'Prueba virtual'); pg.fill('#al-p', '10'); pg.fill('#al-u', '1'); pg.click('#al-ok')
    pg.click('[data-a="cobrar"]'); pg.click('[data-a="forma"][data-v="virtual"]')
    pg.evaluate('addPago(99999)'); check(pg.evaluate('CB.pagos.length') == 0, '[PAG-01] con TPV virtual no se cobra más del pendiente')
    pg.click('#cb-fin'); pg.wait_for_timeout(300)
    t = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(t['pagos'] == [{'f': 'virtual', 'imp': 1000}], '[PAG-01] ticket cobrado con TPV virtual')
    for pap in (80, 58):
        h = pg.evaluate(f'(() => {{ __TPV.CFG().papel = {pap}; return __TPV.ticketHTML(__TPV.TICKETS.at(-1)); }})()')
        check('class="qr"' in h and '<svg' in h.split('class="qr"')[1][:200] and 'TPV virtual' in h, f'[QR-01] ticket de {pap} mm con QR y forma de cobro «TPV virtual»')
    r = pg.evaluate('__TPV.resumen(__TPV.TICKETS)')
    check(r['formas']['virtual'] == 1000 and r['formas']['efectivo'] == 0, '[PAG-01] el resumen de caja suma 10,00 € en TPV virtual y nada en efectivo')
    z = pg.evaluate('__TPV.zHTML({ r: __TPV.resumen(__TPV.TICKETS), fecha: new Date().toISOString(), apertura: new Date().toISOString(), op: "x", fondo: 0, movs: [] })')
    check('TPV virtual' in z and '10,00' in z, '[PAG-01] el cierre Z muestra el TPV virtual')
    ap = json.dumps(pg.evaluate('__TPV.lineasAsiento(__TPV.TICKETS)'))
    check('572000000' in ap and '570000000' not in ap, '[PAG-01] el asiento lo lleva a la cuenta del banco, no a caja')
    check(pg.evaluate("tratarCodigo(__TPV.TICKETS.at(-1).num).tipo") == 'ticket', '[CAM-02] el número de un ticket leído abre ese ticket')
    # migración del enlace antiguo
    pg.evaluate("LS.set('cfg', Object.assign(LS.get('cfg', {}), { qrUrl: 'https://tierranuestra.es' }))"); pg.reload(); pg.wait_for_timeout(500)
    check(pg.evaluate("JSON.parse(localStorage.getItem('tpv_cfg')||'{}').qrUrl !== undefined") and pg.evaluate("CFG.qrUrl") == VINOS, '[QR-02] una caja con el enlace antiguo pasa sola al nuevo')
    # instalar como app
    mf = pg.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
    ic = {i['sizes'] for i in mf['icons']}
    check(mf['display'] == 'standalone' and {'192x192', '512x512'} <= ic and pg.locator('link[rel="apple-touch-icon"]').count() == 1, '[MOV-03] se instala como app (Android, iPhone/iPad y PC)')
    sw = open(f'{ROOT}/sw.js', encoding='utf-8').read()
    check(all(f in sw for f in ('movil.js', 'assets/zxing.min.js', 'data.js', 'app.js')), '[MOV-03] funciona sin conexión: la cámara y el asistente están en la caché')
    check(not errs, f'[UI-02] PC sin errores de JavaScript {errs[:2]}')
    b.close()
print('\nRESULTADO:', 'TODO OK' if not fails else f'{len(fails)} FALLOS'); sys.exit(1 if fails else 0)
