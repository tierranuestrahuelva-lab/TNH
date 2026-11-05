"""Gauntlet de la Guía de vinos: recorrido + cámara (vídeo falso) + voz (falsa) + asistente + árbitro → gauntlet/informe.html
Uso: python3 tests/gauntlet.py"""
import os, re, json, subprocess, sys, time, html
from datetime import datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
import barcode, qrcode
from barcode.writer import ImageWriter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
D = '/tmp/guiacam'; os.makedirs(D, exist_ok=True); os.makedirs('gauntlet', exist_ok=True)
URL = 'http://127.0.0.1:8771/'
arts = json.loads(re.search(r'=(\[.*\]);', open('data.js', encoding='utf-8').read(), re.S).group(1))
casos = []
def check(cond, msg): print(('OK   ' if cond else 'FAIL ') + msg); casos.append((msg, bool(cond)))
def ean_ok(s):
    if not re.fullmatch(r'\d{13}', s): return False
    t = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(s[:12])); return (10 - t % 10) % 10 == int(s[12])
def video(n, img):
    out = f'{D}/{n}.y4m'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', img, '-t', '2', '-r', '10', '-vf', 'scale=w=min(640\\,iw):h=min(480\\,ih):force_original_aspect_ratio=decrease:flags=neighbor,pad=640:480:(ow-iw)/2:(oh-ih)/2:white', '-pix_fmt', 'yuv420p', out], check=True); return out
ean_art = next(a for a in sorted(arts, key=lambda a: a.get('r') or 9999) if any(ean_ok(b) for b in a.get('b', [])))
ean = next(b for b in ean_art['b'] if ean_ok(b))
barcode.EAN13(ean[:12], writer=ImageWriter()).save(f'{D}/ean', options={'module_width': 0.5, 'module_height': 22, 'quiet_zone': 8})
qr_art = next(a for a in arts if a.get('s') and not a.get('b'))
q = qrcode.QRCode(border=4, box_size=6); q.add_data(f'https://tierranuestrahuelva-lab.github.io/TNH/vinos/#/vino/{qr_art["s"]}'); q.make(); q.make_image().save(f'{D}/qr.png')
V_EAN, V_QR = video('ean', f'{D}/ean.png'), video('qr', f'{D}/qr.png')
FAKE_SR = """window.__voz=[];class FakeSR{start(){const t=window.__voz.shift()||'';setTimeout(()=>{this.onresult&&this.onresult({results:[[{transcript:t}]]});this.onend&&this.onend();},30)}stop(){}abort(){}};window.webkitSpeechRecognition=FakeSR;window.SpeechRecognition=FakeSR;window.__dicho=[];window.speechSynthesis&&(window.speechSynthesis.speak=u=>window.__dicho.push(u.text));"""
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8771', '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
def nueva(b, w, h, **kw):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=w < 900, **kw); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.add_init_script(FAKE_SR); pg.goto(URL); pg.wait_for_selector('.card'); return ctx, pg, errs
desborde = lambda pg: pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
ficha = lambda pg: pg.evaluate("(document.querySelector('.velo .ficha h1')||{}).textContent||''")
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, n in ((390, 844, 'móvil'), (820, 1180, 'tablet'), (1366, 860, 'PC')):
        ctx, pg, errs = nueva(b, w, h)
        check(pg.locator('.card').count() >= 40 and desborde(pg), f'[UI] {n} {w}px: catálogo con tarjetas y sin desbordes laterales')
        pg.click('.card >> nth=0'); pg.wait_for_selector('.velo .ficha')
        check(desborde(pg) and pg.locator('.velo .precio').count() > 0, f'[UI] {n}: la ficha se abre, con precio y sin desbordes')
        pg.screenshot(path=f'gauntlet/{n}-ficha.png'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.screenshot(path=f'gauntlet/{n}-catalogo.png')
        check(not errs, f'[UI] {n}: sin errores de JavaScript {errs[:2]}'); ctx.close()
    ctx, pg, errs = nueva(b, 390, 844)
    tot = len(arts)
    check(pg.evaluate('__G.A.length') == tot and tot > 1000, f'[DATOS] {tot} artículos cargados')
    check(all(a['p'] > 0 and a['n'] for a in arts), '[DATOS] todos con nombre y precio PVP > 0')
    pg.fill('#q', 'ramon bilbao crianza'); pg.wait_for_timeout(400)
    first = pg.locator('.card .nom').first.text_content()
    check('ramon bilbao' in first.lower() and 'crianza' in first.lower(), f'[BUS] busca sin tildes ni mayúsculas: «ramon bilbao crianza» → {first}')
    pg.fill('#q', 'zalema'); pg.wait_for_timeout(400)
    check(pg.locator('.card').count() >= 5, '[BUS] busca por uva (zalema)')
    pg.fill('#q', ''); pg.wait_for_timeout(300)
    pg.fill('#q', ean); pg.press('#q', 'Enter'); pg.wait_for_selector('.velo .ficha')
    check(ficha(pg) == ean_art['n'], f'[COD] pistola lectora / código tecleado {ean} abre {ean_art["n"]}')
    t = pg.locator('.velo').inner_text()
    for etiqueta in ('PVP tienda', 'Bodega / proveedor', 'Código'): check(etiqueta.lower() in t.lower(), f'[FICHA] la ficha muestra «{etiqueta}»')
    hrefs = pg.eval_on_selector_all('.velo .enlaces a', 'xs => xs.map(x => x.href)')
    check(any('/TNH/vinos/#/vino/' in x for x in hrefs) and any('wa.me' in x for x in hrefs), '[ENL] enlaces a la ficha web y WhatsApp')
    check(pg.locator('.velo .qr svg').count() == 1, '[ENL] QR de la ficha web para el cliente')
    pg.wait_for_timeout(600); pg.click('.velo #b-fav'); pg.wait_for_timeout(200); pg.keyboard.press('Escape'); pg.goto(URL + '#/favoritos'); pg.wait_for_timeout(400)
    check(pg.locator('.grid .card').count() == 1, '[FAV] el favorito se guarda y aparece en Favoritos')
    pg.goto(URL); pg.wait_for_selector('.card')
    pg.click('[data-a="fam"][data-v="blancos"]'); pg.wait_for_timeout(200)
    check(pg.evaluate("__G.A.filter(a=>a.f==='blancos').length") == int(pg.locator('#cuenta b').text_content()), '[FIL] la familia Blancos filtra bien')
    pg.click('[data-a="filtros"]'); pg.select_option('#f-dop', 'Rueda'); pg.fill('#f-max', '10'); pg.click('#f-ok'); pg.wait_for_timeout(300)
    ok = pg.evaluate("__G.A.filter(a=>a.f==='blancos'&&a.d==='Rueda'&&a.p<=1000).length") == int(pg.locator('#cuenta b').text_content())
    check(ok, '[FIL] filtros D.O. Rueda + hasta 10 € cuadran con los datos')
    # voz
    pg.evaluate("window.__voz.push('verdejo')"); pg.click('#b-mic'); pg.wait_for_timeout(500)
    check(pg.input_value('#q') == 'verdejo' and pg.locator('.card').count() > 0, '[VOZ] el micrófono del buscador escribe y busca')
    pg.evaluate("window.__voz.push('tinto para carne de menos de 15 euros')"); pg.click('#b-mic'); pg.wait_for_timeout(600)
    r = pg.evaluate('window.__ultima')
    check('#/asistente' in pg.url and r and r['arts'] and all(a['p'] <= 1500 and a['f'] in ('tintos', 'formatos') for a in r['arts']), '[VOZ] una pregunta por voz va al asistente y respeta tipo y precio')
    check(pg.evaluate('window.__dicho.length') >= 1, '[VOZ] el asistente lee la respuesta en voz alta')
    # asistente
    def ia(qs): return pg.evaluate('q => __G.responder(q)', qs)
    r = ia('blanco de Huelva para pescado'); check(r['arts'] and all(a['f'] == 'blancos' and 'Condado' in (a.get('d') or '') for a in r['arts']), '[IA] «blanco de Huelva para pescado» → blancos D.O. Condado de Huelva')
    r = ia('fino para el jamón'); check(r['arts'] and all(a['f'] == 'generosos' and 'fino' in a['n'].lower() for a in r['arts']), '[IA] «fino para el jamón» → solo finos (no «Tinto Fino»)')
    r = ia('espumoso para celebrar'); check(r['arts'] and all(a['f'] == 'espumosos' for a in r['arts']), '[IA] «espumoso para celebrar» → espumosos')
    r = ia('champagne entre 30 y 60 euros'); check(r['arts'] and all('champagne' in ((a.get('d') or '') + a['n']).lower() and 3000 <= a['p'] <= 6000 for a in r['arts']), '[IA] champagne entre 30 y 60 € respeta rango')
    r = ia('¿Cuánto cuesta el Tio Pepe?'); check(r['arts'] and 'tio pepe' in r['arts'][0]['n'].lower() and '€' in r['texto'], f'[IA] precio de un vino concreto → {r["arts"][0]["n"] if r["arts"] else "-"}')
    r = ia('¿qué uva lleva el Pago de Carraovejas?'); check(r['arts'] and 'carraovejas' in r['arts'][0]['n'].lower() and r['arts'][0].get('f') != 'formatos', f'[IA] uva de un vino concreto (formato normal) → {r["arts"][0]["n"] if r["arts"] else "-"}')
    r = ia('¿Diferencia entre crianza y reserva?'); check('36 meses' in r['texto'], '[IA] explica crianza / reserva')
    r = ia('regalo especial de unos 40 euros'); check(r['arts'] and all(3000 <= a['p'] <= 5000 for a in r['arts']), '[IA] regalo de unos 40 € → entre 30 y 50 €')
    r = ia('rosado para arroz'); check(r['arts'] and all(a['f'] in ('rosados',) for a in r['arts']), '[IA] rosado para arroz')
    r = ia('ginebra'); check(r['arts'] and all('gin' in ((a.get('y') or '') + (a.get('d') or '') + a['n']).lower() for a in r['arts']), '[IA] ginebras')
    r = ia('xyzzy'); check(not r['arts'] and 'Por ejemplo' in r['texto'], '[IA] si no entiende, lo dice y da ejemplos (no se inventa)')
    pg.goto(URL + '#/asistente'); pg.wait_for_selector('#ia-q'); pg.fill('#ia-q', 'blanco para pescado'); pg.press('#ia-q', 'Enter'); pg.wait_for_timeout(400); pg.wait_for_timeout(300); pg.click('.msg.ia .card >> nth=-1'); pg.wait_for_selector('.velo .ficha')
    check(True, '[IA] tocar una recomendación abre su ficha'); pg.screenshot(path='gauntlet/móvil-asistente.png')
    # árbitro: datos de la ficha coinciden con data.js para 25 artículos al azar
    import random; random.seed(7); malos = []
    for a in random.sample(arts, 25):
        pg.goto(URL + '#/vino/' + a['c']); pg.wait_for_selector('.velo .ficha')
        try: pg.wait_for_function('n => (document.querySelector(".velo .ficha h1")||{}).textContent === n', arg=a['n'], timeout=5000)
        except Exception: pass
        t = pg.locator('.velo').inner_text()
        if a['n'] not in t or (f"{a['p']/100:.2f}".replace('.', ',') + ' €') not in t: malos.append(a['c'])
        pg.goto('about:blank')
    check(not malos, f'[ARB] árbitro: nombre y precio de 25 fichas al azar coinciden con el catálogo {malos}')
    check(not errs, f'[UI] recorrido sin errores de JavaScript {errs[:2]}'); ctx.close(); b.close()
    for vid, art, n in ((V_EAN, ean_art, 'EAN-13'), (V_QR, qr_art, 'QR de la web')):
        b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={vid}'])
        ctx, pg, errs = nueva(b, 390, 844, permissions=['camera'])
        pg.click('#b-cam')
        try: pg.wait_for_selector('.velo .ficha', timeout=20000)
        except Exception: pass
        check(ficha(pg) == art['n'], f'[CAM] la cámara lee el {n} y abre la ficha de {art["n"]} (lector {pg.evaluate("window.__camLector")})')
        check(pg.evaluate("[...document.querySelectorAll('video')].every(v=>!v.srcObject||v.srcObject.getTracks().every(t=>t.readyState==='ended'))"), f'[CAM] tras leer el {n} la cámara se apaga')
        check(not errs, f'[CAM] sin errores {errs[:2]}'); b.close()
finally:
    srv.terminate()
ok = all(c[1] for c in casos); e = html.escape
open('gauntlet/informe.html', 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gauntlet · Guía de vinos</title>
<style>body{{font:15px system-ui;margin:0;background:#faf7f9;color:#2b1a24}}main{{max-width:980px;margin:auto;padding:24px}}h1{{color:#830040}}.l{{padding:18px 22px;border-radius:18px;color:#fff;font-size:20px;font-weight:600;background:{"#15803d" if ok else "#b91c1c"}}}
table{{width:100%;border-collapse:collapse;background:#fff}}td{{padding:7px 10px;border-top:1px solid #f1e6ec}}.v{{color:#166534}}.r{{color:#991b1b;font-weight:600}}</style>
<main><h1>Gauntlet · Guía de vinos para la tienda</h1><p>{datetime.now(ZoneInfo("Europe/Madrid")).strftime("%d/%m/%Y %H:%M")}</p><div class="l">{"✔ Listón superado" if ok else "✘ No pasa el listón"} · {sum(c[1] for c in casos)}/{len(casos)} pruebas</div><br>
<table>{"".join(f'<tr><td>{e(m)}</td><td class="{"v" if k else "r"}">{"Pasa" if k else "Falla"}</td></tr>' for m, k in casos)}</table></main>''')
print(f'RESULTADO {sum(c[1] for c in casos)}/{len(casos)}')
