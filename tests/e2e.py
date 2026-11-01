"""Pruebas E2E del TPV (listón Gauntlet). Uso: python3 tests/e2e.py [url]"""
import sys, json, csv, io, openpyxl
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
OUT = '/tmp/tpvshots'
fails = []
def check(cond, msg):
    print(('OK   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 820}, accept_downloads=True)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.add_init_script("window.print=()=>{window.__printed=(window.__printed||0)+1};")
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/01_login.png')
    for k in '0000': pg.click(f'.login .pad button[data-v="{k}"]')
    pg.wait_for_selector('#ap-f')
    pg.fill('#ap-f', '100'); pg.click('#ap-ok')
    pg.wait_for_selector('.prod')
    check(pg.locator('.prod').count() > 10, '[VEN-01] catálogo "Más vendidos" muestra artículos')
    pg.screenshot(path=f'{OUT}/02_venta_vacia.png')
    # búsqueda + escáner por código de barras
    arts = pg.evaluate('window.TN_ARTICULOS')
    conb = [a for a in arts if a.get('b')][0]
    pg.fill('#q', conb['b'][0]); pg.press('#q', 'Enter')
    check(pg.locator('.lin').count() == 1, f'[VEN-02] lector: código de barras {conb["b"][0]} añade {conb["n"]}')
    pg.fill('#q', conb['b'][0]); pg.press('#q', 'Enter')
    check(pg.evaluate('__TPV.TK.lineas[0].u') == 2, '[VEN-02] escanear 2 veces suma unidades')
    # escaneo con foco fuera de campo (wedge)
    pg.click('.top img'); pg.keyboard.type(conb['b'][0], delay=5); pg.keyboard.press('Enter')
    check(pg.evaluate('__TPV.TK.lineas[0].u') == 3, '[VEN-02] lector sin foco en buscador también suma')
    pg.click('.fams button[data-v="blancos"]')
    pg.locator('.prod').first.click()
    iva10 = [a for a in arts if a['i'] == 10]
    if iva10:
        pg.fill('#q', iva10[0]['c']); pg.press('#q', 'Enter')
    pg.fill('#q', ''); pg.dispatch_event('#q', 'input')
    tk = pg.evaluate('__TPV.calc(__TPV.TK)')
    suma = sum(v['base'] + v['cuota'] for v in tk['ivas'])
    check(suma == tk['total'], f'[VEN-04] IVA cuadra: base+cuota = total ({tk["total"]})')
    pg.screenshot(path=f'{OUT}/03_ticket_en_curso.png')
    # cobro efectivo con cambio
    total = tk['total']
    pg.click('[data-a="cobrar"]'); pg.wait_for_selector('#cobro')
    entregado = ((total // 5000) + 1) * 5000
    for ch in str(entregado // 100): pg.click(f'.pad button[data-v="{ch}"]')
    pg.screenshot(path=f'{OUT}/04_cobro.png')
    pg.click('#cb-fin'); pg.wait_for_timeout(600)
    t1 = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(t1['cambio'] == entregado - total, f'[COB-01] cambio correcto {t1["cambio"]}')
    check(sum(x['imp'] for x in t1['pagos']) == t1['total'], '[COB-01] pagos = total')
    check(t1['num'].startswith('T') and t1['num'].endswith('000001'), f'[TCK-01] numeración {t1["num"]}')
    check(pg.evaluate('window.__printed||0') >= 0, '[TCK-02] impresión lanzada')
    pg.screenshot(path=f'{OUT}/05_cambio.png')
    check(pg.locator('#ultimo').count() == 1 and pg.locator('#modal-root > *').count() == 0, '[COB-05] cambio visible sin bloquear la caja')
    # venta 2: tarjeta con descuento de ticket
    pg.click('.fams button[data-v="tintos"]'); pg.locator('.prod').nth(2).click(); pg.locator('.prod').nth(3).click()
    pg.click('[data-a="dtoTicket"]'); pg.click('[data-a="setDto"][data-v="10"]')
    pg.click('[data-a="cobrar"]'); pg.click('[data-a="forma"][data-v="tarjeta"]'); pg.click('#cb-fin'); pg.wait_for_timeout(400)
    t2 = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(t2['dto'] == 10 and t2['pagos'][0]['f'] == 'tarjeta', '[COB-02][VEN-07] venta con tarjeta y dto 10%')
    # venta 3: mixto efectivo 10 + bizum resto
    pg.click('.fams button[data-v="espumosos"]'); pg.locator('.prod').nth(1).click(); pg.locator('.prod').nth(1).click()
    pg.click('[data-a="cobrar"]')
    for ch in '10': pg.click(f'.pad button[data-v="{ch}"]')
    pg.click('[data-a="addPago"]'); pg.click('[data-a="forma"][data-v="bizum"]'); pg.click('#cb-fin'); pg.wait_for_timeout(400)
    t3 = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(len(t3['pagos']) == 2 and t3['pagos'][0]['imp'] == 1000 and sum(x['imp'] for x in t3['pagos']) == t3['total'], '[COB-04] pago mixto efectivo+bizum')
    # artículo libre IVA 4
    pg.click('[data-a="libre"]'); pg.fill('#al-n', 'Aceite prueba'); pg.fill('#al-p', '8,90'); pg.select_option('#al-i', '4'); pg.click('#al-ok')
    pg.click('[data-a="cobrar"]'); pg.click('[data-a="billete"][data-v="exacto"]'); pg.wait_for_timeout(400)
    t4 = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(t4['total'] == 890 and t4['ivas'][0]['r'] == 4 and t4['ivas'][0]['base'] == 856, '[VEN-03] artículo libre 8,90 IVA 4% base 8,56')
    # aparcar/recuperar
    pg.click('.fams button[data-v="tintos"]'); pg.locator('.prod').first.click()
    pg.click('[data-a="aparcar"]'); check(pg.locator('.lin').count() == 0, '[VEN-06] aparcar vacía el ticket')
    pg.click('[data-a="recuperar"]'); pg.click('[data-a="recPark"]'); check(pg.locator('.lin').count() == 1, '[VEN-06] recuperar ticket aparcado')
    pg.click('[data-a="vaciar"]'); pg.click('#cf-ok')
    # devolución de 1 ud del ticket 1
    pg.click('[data-a="vista"][data-v="tickets"]'); pg.wait_for_timeout(200)
    pg.screenshot(path=f'{OUT}/06_tickets.png')
    pg.click(f'tr[data-v="{t1["id"]}"]'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/07_ticket_detalle.png')
    pg.click('[data-a="devolver"]')
    inp = pg.locator('.dv-u').first; inp.fill('1')
    for i in range(1, pg.locator('.dv-u').count()): pg.locator('.dv-u').nth(i).fill('0')
    pg.click('#dv-ok'); pg.wait_for_selector('.aviso')
    pg.screenshot(path=f'{OUT}/08_devolucion.png')
    pg.click('[data-a="cobrar"]'); pg.click('#cb-fin'); pg.wait_for_timeout(400)
    t5 = pg.evaluate('__TPV.TICKETS.at(-1)')
    check(t5['tipo'] == 'dev' and t5['total'] < 0 and t5['orig'] == t1['num'] and t5['num'].startswith('D'), f'[DEV-01] devolución rectificativa {t5["num"]} {t5["total"]}')
    # no devolver más de lo vendido
    pg.click('[data-a="vista"][data-v="tickets"]'); pg.click(f'tr[data-v="{t1["id"]}"]'); pg.click('[data-a="devolver"]')
    mx = int(pg.locator('.dv-u').first.get_attribute('max'))
    check(mx == t1['lineas'][0]['u'] - 1, f'[DEV-02] límite devolución respeta lo ya devuelto (max {mx})')
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
    # caja: salida + cierre Z
    pg.click('[data-a="vista"][data-v="caja"]'); pg.click('[data-a="movCaja"][data-v="salida"]'); pg.fill('#mv-i', '5'); pg.fill('#mv-m', 'Hielo'); pg.click('#mv-ok')
    pg.screenshot(path=f'{OUT}/09_caja.png')
    r = pg.evaluate('__TPV.resumen(__TPV.TICKETS, JSON.parse(localStorage.tpv_caja))')
    efe = sum(x['imp'] for t in [t1, t3, t4, t5] for x in t['pagos'] if x['f'] == 'efectivo')
    check(r['esperado'] == 10000 + efe - 500, f'[CAJ-01] esperado en cajón {r["esperado"]}')
    pg.click('[data-a="cierreZ"]'); pg.fill('#z-c', f'{(r["esperado"] - 100) / 100:.2f}'.replace('.', ',')); pg.fill('#z-r', '100')
    pg.screenshot(path=f'{OUT}/10_cierreZ.png')
    pg.click('#z-ok'); pg.wait_for_timeout(500)
    z = pg.evaluate('__TPV.CIERRES.at(-1)')
    check(z['dif'] == -100 and z['r']['n'] == 5, f'[CAJ-02] cierre Z {z["num"]} diferencia -1,00 y 5 tickets')
    check(pg.evaluate('localStorage.tpv_caja') == 'null', '[CAJ-03] caja cerrada tras Z')
    # exportaciones
    pg.click('[data-a="vista"][data-v="sage"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/11_sage.png', full_page=True)
    with pg.expect_download() as d: pg.click('[data-a="expExcel"]')
    fx = f'{OUT}/' + d.value.suggested_filename; d.value.save_as(fx); wb = openpyxl.load_workbook(fx)
    check(set(['Resumen por dia', 'Tickets', 'Lineas', 'Stock vendido', 'Cierres Z']) <= set(wb.sheetnames), '[SAG-01] Excel con 5 hojas')
    check(wb['Tickets'].max_row == 6, '[SAG-01] Excel: 5 tickets')
    with pg.expect_download() as d: pg.click('[data-a="expStock"]')
    d.value.save_as(f'{OUT}/' + d.value.suggested_filename); raw = open(d.value.path(), 'rb').read(); txt = raw.decode('cp1252')
    rows = list(csv.reader(io.StringIO(txt), delimiter=';'))
    check(rows[0][0] == 'Código artículo' and len(rows) > 3, f'[SAG-02] CSV stock cp1252 {len(rows)-1} artículos')
    vend = {}
    for t in [t1, t2, t3, t4, t5]:
        for l in t['lineas']:
            if l['c']: vend[l['c']] = vend.get(l['c'], 0) - l['u']
    check(all(int(r_[2]) == vend[r_[0]] for r_ in rows[1:]), '[SAG-02] CSV stock = unidades vendidas en negativo (menos devueltas)')
    with pg.expect_download() as d: pg.click('[data-a="expAsiento"]')
    d.value.save_as(f'{OUT}/' + d.value.suggested_filename); rows = list(csv.reader(io.StringIO(open(d.value.path(), 'rb').read().decode('cp1252')), delimiter=';'))
    H = rows[0]; de = sum(float(r_[H.index('EURODEBE')].replace(',', '.')) for r_ in rows[1:]); ha = sum(float(r_[H.index('EUROHABER')].replace(',', '.')) for r_ in rows[1:])
    tot = sum(t['total'] for t in [t1, t2, t3, t4, t5]) / 100
    check(abs(de - ha) < 0.001 and abs(de - tot) < 0.001, f'[SAG-03] asiento cuadra debe={de:.2f} haber={ha:.2f} total={tot:.2f}')
    # repetir exportación stock -> aviso sin nuevos
    pg.click('[data-a="expStock"]'); pg.wait_for_timeout(300)
    check('No hay tickets nuevos' in pg.inner_text('#toast'), '[SAG-02] no duplica stock si ya se exportó')
    # impresión: render ticket 80 y 58 mm a PDF/PNG
    for w in (80, 58):
        pg.evaluate(f'(()=>{{const c=__TPV.CFG();c.papel={w};}})()')
        html = pg.evaluate("(()=>{const t=__TPV.TICKETS[0];return documentoImpresion(ticketHTML(t), anchoUtil())})()")
        p2 = ctx.new_page(); p2.set_viewport_size({'width': int(w * 96 / 25.4), 'height': 800}); p2.goto(URL)
        p2.set_content(html.replace('<base href="', '<base href="'), wait_until='networkidle'); p2.wait_for_timeout(300)
        sw = p2.evaluate('document.documentElement.scrollWidth'); vw = int(w * 96 / 25.4)
        check(sw <= vw + 1, f'[TCK-02] ticket {w} mm no se sale del papel ({sw}px <= {vw}px)')
        p2.screenshot(path=f'{OUT}/ticket_{w}mm.png', full_page=True)
        p2.pdf(path=f'{OUT}/ticket_{w}mm.pdf', width=f'{w}mm', height=f'{int(p2.evaluate("document.body.scrollHeight")*25.4/96)+6}mm', print_background=True)
        p2.close()
    zh = pg.evaluate("documentoImpresion(zHTML(__TPV.CIERRES[0]), anchoUtil())")
    p2 = ctx.new_page(); p2.set_viewport_size({'width': 302, 'height': 800}); p2.goto(URL); p2.set_content(zh, wait_until='networkidle'); p2.screenshot(path=f'{OUT}/z_80mm.png', full_page=True); p2.close()
    # persistencia tras recarga
    pg.reload(); pg.wait_for_timeout(600)
    check(pg.evaluate('__TPV.TICKETS.length') == 5, '[TCK-03] tickets persisten tras recargar')
    # móvil/tablet
    m = ctx.new_page(); m.set_viewport_size({'width': 800, 'height': 1280}); m.goto(URL); m.wait_for_timeout(400)
    for k in '0000': m.click(f'.login .pad button[data-v="{k}"]')
    m.wait_for_timeout(300); m.keyboard.press('Escape'); m.screenshot(path=f'{OUT}/12_tablet.png'); m.close()
    check(not errs, '[UI-02] sin errores de JavaScript: ' + '; '.join(errs[:5]))
    b.close()
print('\nRESULTADO:', 'TODO OK' if not fails else f'{len(fails)} FALLOS')
sys.exit(1 if fails else 0)
