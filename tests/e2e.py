"""Pruebas de uso (Playwright). Uso: python3 tests/e2e.py [url]"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8766/'
raw = pathlib.Path(__file__).resolve().parent.parent.joinpath('data.js').read_text(encoding='utf-8')
ARTS = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])['articulos']
fails = []
def check(c, m):
    print(('OK   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL); pg.wait_for_timeout(500)
    antes = pg.evaluate('JSON.stringify(window.CQ_DATA)')
    check(pg.evaluate('__CQ.M.articulos.length') == len(ARTS), f'carga los {len(ARTS)} artículos de la foto')
    for z in ('nichero', 'almacen', 'nave'):
        pg.click(f'[data-zona="{z}"]'); pg.wait_for_timeout(150)
        n = pg.locator('#lienzo [data-k]').count()
        check(n > 10, f'zona {z}: se dibujan {n} huecos')
    # clic en un hueco -> ficha con sus vinos
    pg.click('[data-zona="nichero"]'); pg.click('#lienzo [data-k="nichero:F07"]'); pg.wait_for_timeout(150)
    f07 = [a for a in ARTS if 'F07' in a['u'].upper().replace(' ', '')]
    txt = pg.inner_text('.panel, aside')
    check('F07' in txt and all(a['c'].strip() in txt for a in f07), f'ficha F07 muestra sus {len(f07)} vinos')
    # búsquedas
    a = next(x for x in ARTS if x['u'] and x['b'])
    cb = str(x['b'][0] if False else a['b'][0])
    for etiqueta, q in (('nombre', a['n'][:14]), ('código', a['c']), ('código de barras', cb), ('hueco', 'F07')):
        pg.fill('#q', q); pg.wait_for_timeout(120)
        hits = pg.locator('#lienzo .h.hit, #sugs [data-sug]').count()
        check(hits > 0, f'buscar por {etiqueta} «{q}» encuentra resultados ({hits})')
    pg.fill('#q', 'zzzzqqq'); pg.wait_for_timeout(120)
    check(pg.locator('#lienzo .h.hit').count() == 0, 'búsqueda sin sentido no ilumina nada')
    pg.fill('#q', '')
    # filtro de color
    pg.click('[data-grupo="tinto"]'); pg.wait_for_timeout(120)
    check(pg.locator('[data-grupo="tinto"].off').count() == 1, 'el filtro Tintos se apaga y se enciende')
    pg.click('[data-grupo="tinto"]')
    # pestañas
    for tab in ('lista', 'revisar', 'reorg', 'plano'):
        pg.click(f'[data-tab="{tab}"]'); pg.wait_for_timeout(200)
        check(pg.locator(f'[data-tab="{tab}"].on, [data-tab="{tab}"][aria-current], [data-tab="{tab}"].activo').count() >= 0 and not errs, f'pestaña {tab} abre sin errores')
    pg.click('[data-tab="revisar"]'); pg.wait_for_timeout(200)
    t = pg.inner_text('main, #app')
    check('4LP' in t and 'AD1A' in t, 'Revisar enseña los códigos que no se entienden (4LP, AD1A)')
    with pg.expect_download() as d: pg.click('[data-csv="todo"]')
    contenido = pathlib.Path(d.value.path()).read_text(encoding='utf-8-sig')
    check(d.value.suggested_filename.endswith('.csv') and contenido.count('\n') >= 30, f'descarga CSV de incidencias ({contenido.count(chr(10))} líneas)')
    pg.click('[data-tab="reorg"]'); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click('[data-csv="reorg"]')
    filas = pathlib.Path(d.value.path()).read_text(encoding='utf-8-sig').strip().split('\n')
    check(len(filas) - 1 == pg.evaluate('__CQ.M.articulos.filter(a=>a.locs.some(l=>l.zona==="nichero")).length'), f'CSV de reorganización con {len(filas)-1} vinos')
    sel = pg.locator('select').first
    sel.select_option('1'); pg.wait_for_timeout(300)
    check(not errs, 'cambiar vinos por hueco recalcula sin errores')
    check(pg.evaluate('JSON.stringify(window.CQ_DATA)') == antes, 'los datos originales NO se modifican')
    # enlaces directos
    pg.goto(URL + '?loc=1A4'); pg.wait_for_timeout(400)
    check('1A4' in pg.inner_text('#app') and pg.locator('#lienzo .sel').count() >= 1, 'enlace ?loc=1A4 abre la Nave con el hueco marcado')
    pg.goto(URL + '?tab=revisar'); pg.wait_for_timeout(300)
    check('4LP' in pg.inner_text('#app'), 'enlace ?tab=revisar abre Revisar')
    # móvil
    m = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    m.on('pageerror', lambda e: errs.append(str(e)))
    for z in ('nichero', 'almacen', 'nave'):
        m.goto(URL + '?zona=' + z); m.wait_for_timeout(300)
        check(m.evaluate('document.documentElement.scrollWidth') <= 391, f'móvil {z}: la página no se sale de pantalla')
    check(not errs, f'sin errores de JavaScript {errs[:3]}')
print('\n' + ('E2E: TODO OK' if not fails else f'E2E: {len(fails)} FALLOS'))
sys.exit(1 if fails else 0)
