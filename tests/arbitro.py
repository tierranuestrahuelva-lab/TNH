"""Ronda del árbitro del TPV: casos rebuscados para intentar romper la caja. Uso: python3 tests/arbitro.py [url]"""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
fails = []
def check(cond, msg):
    print(('OK   ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def entrar(pg, fondo='100'):
    pg.add_init_script("window.print=()=>{};")
    pg.goto(URL); pg.wait_for_timeout(400)
    for k in '0000': pg.click(f'.login .pad button[data-v="{k}"]')
    pg.wait_for_selector('#ap-f'); pg.fill('#ap-f', fondo); pg.click('#ap-ok'); pg.wait_for_selector('.prod')

def libre(pg, nombre, precio, uds='1', iva='21'):
    pg.click('[data-a="libre"]'); pg.fill('#al-n', nombre); pg.fill('#al-p', precio); pg.fill('#al-u', uds); pg.select_option('#al-i', iva); pg.click('#al-ok')

def cobrar_exacto(pg):
    pg.click('[data-a="cobrar"]'); pg.click('#cb-fin'); pg.wait_for_timeout(300)

def devolver(pg, tid, uds):
    pg.click('[data-a="vista"][data-v="tickets"]'); pg.click(f'tr[data-v="{tid}"]'); pg.click('[data-a="devolver"]')
    pg.locator('.dv-u').first.fill(str(uds)); pg.click('#dv-ok'); pg.wait_for_selector('.aviso')
    cobrar_exacto(pg)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 820}, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    entrar(pg)

    casos = {'1.250': 125000, '1.250,50': 125050, '12.345.678': 1234567800, '8.90': 890, '8,9': 890, '8,90 €': 890, '12': 1200, '0,05': 5, ' 3 ': 300}
    for txt, cents in casos.items():
        v = pg.evaluate(f'parseEur({txt!r})')
        check(v == cents, f'[COB-06] "{txt}" se entiende como {cents/100:.2f} € (sale {v})')
    check(pg.evaluate("isNaN(parseEur('abc')) && isNaN(parseEur(''))"), '[COB-06] texto sin número no se acepta')

    # devoluciones por partes nunca devuelven más de lo cobrado
    libre(pg, 'Chapa regalo', '0,05', '2'); pg.click('[data-a="dtoTicket"]'); pg.click('[data-a="setDto"][data-v="10"]')
    cobrar_exacto(pg)
    t = pg.evaluate('__TPV.TICKETS.at(-1)')
    devolver(pg, t['id'], 1); devolver(pg, t['id'], 1)
    dev = pg.evaluate(f'__TPV.TICKETS.filter(x => x.orig === {t["num"]!r}).map(x => x.total)')
    check(len(dev) == 2 and -sum(dev) == t['total'], f'[DEV-03] dos devoluciones parciales suman exactamente lo cobrado ({t["total"]} → {dev})')

    libre(pg, 'Vino a granel', '3,33', '3'); pg.click('[data-a="dtoTicket"]'); pg.click('[data-a="setDto"][data-v="15"]')
    cobrar_exacto(pg)
    t = pg.evaluate('__TPV.TICKETS.at(-1)')
    for _ in range(3): devolver(pg, t['id'], 1)
    dev = pg.evaluate(f'__TPV.TICKETS.filter(x => x.orig === {t["num"]!r}).map(x => x.total)')
    check(-sum(dev) == t['total'], f'[DEV-03] devolver de una en una 3 uds con dto devuelve lo cobrado ({t["total"]} → {dev})')
    ivas_ok = pg.evaluate('__TPV.TICKETS.every(t => t.ivas.reduce((s, v) => s + v.base + v.cuota, 0) === t.total && t.lineas.reduce((s, l) => s + l.tot, 0) === t.total)')
    check(ivas_ok, '[VEN-04] en todos los tickets (también devoluciones) líneas = base + IVA = total')

    # asiento de un día con solo devoluciones / con devoluciones con tarjeta
    devs = pg.evaluate('__TPV.TICKETS.filter(t => t.tipo === "dev")')
    try:
        ap = pg.evaluate('t => __TPV.lineasAsiento(t)', devs)
        check(sum(a['debe'] for a in ap) == sum(a['haber'] for a in ap) and all(a['debe'] >= 0 and a['haber'] >= 0 for a in ap), '[SAG-03] asiento de un día solo con devoluciones cuadra y sin importes negativos')
    except Exception as e:
        check(False, f'[SAG-03] asiento solo devoluciones: {e}')

    # unidades negativas en venta normal
    libre(pg, 'Prueba', '1,00'); pg.evaluate('TK.lineas[0].u = -1; saveTK()')
    pg.click('[data-a="cobrar"]')
    check('solo se permiten en devoluciones' in pg.inner_text('#toast') and pg.locator('#cobro').count() == 0, '[VEN-05] no se puede cobrar una venta con unidades negativas')
    pg.evaluate('TK = nuevoTK(); saveTK(); renderTicket()')

    # tarjeta no puede cobrar más del pendiente
    libre(pg, 'Prueba', '10'); pg.click('[data-a="cobrar"]'); pg.click('[data-a="forma"][data-v="tarjeta"]')
    for ch in '20': pg.click(f'#cobro .pad button[data-v="{ch}"]')
    pg.click('#cb-fin'); pg.wait_for_timeout(200)
    check(pg.locator('#cobro').count() == 1 and 'no se puede cobrar más' in pg.inner_text('#toast'), '[COB-03] con tarjeta no se cobra más del total')
    pg.keyboard.press('Escape'); pg.evaluate('TK = nuevoTK(); saveTK(); renderTicket()')

    # textos peligrosos en el ticket
    h = pg.evaluate("ticketHTML({...__TPV.TICKETS[0], cliente: {nombre: '<img src=x onerror=alert(1)>', nif: 'B1', dir: ''}, lineas: [{...__TPV.TICKETS[0].lineas[0], n: '<b>Rioja</b> & \"Cía\"'}]})")
    check('<img src=x' not in h and '<b>Rioja' not in h, '[TCK-04] nombres de cliente/artículo con símbolos no rompen el ticket')

    # numeración correlativa sin huecos ni repetidos
    nums = pg.evaluate('__TPV.TICKETS.filter(t => t.serie === __TPV.TICKETS[0].serie).map(t => t.n)')
    check(nums == list(range(1, len(nums) + 1)), f'[TCK-01] numeración correlativa sin huecos ({nums})')
    check(not errs, '[UI-02] sin errores de JavaScript: ' + '; '.join(errs[:3]))

    # pantallas en móvil, tablet y ordenador
    for w, hgt in ((390, 844), (800, 1280), (1366, 820)):
        c2 = b.new_context(viewport={'width': w, 'height': hgt}); m = c2.new_page(); e2 = []
        m.on('pageerror', lambda e: e2.append(str(e)))
        entrar(m)
        malas = []
        for v in ('venta', 'tickets', 'caja', 'sage', 'articulos', 'ajustes'):
            sel = f'[data-a="vista"][data-v="{v}"]'
            if m.locator(sel).count() == 0: malas.append(v + ' (sin botón)'); continue
            m.locator(sel).first.click(); m.wait_for_timeout(250)
            if m.locator('#modal-root .pad').count():
                for k in '1234': m.click(f'#modal-root .pad button[data-v="{k}"]')
                m.wait_for_timeout(250)
            sw = m.evaluate('document.documentElement.scrollWidth')
            if sw > w: malas.append(f'{v} ({sw}px)')
        check(not malas, f'[UI-01] a {w}px ninguna pantalla se sale por los lados' + (': ' + ', '.join(malas) if malas else ''))
        check(not e2, f'[UI-02] a {w}px sin errores de JavaScript ' + '; '.join(e2[:3]))
        c2.close()
    b.close()
print('\nRESULTADO:', 'TODO OK' if not fails else f'{len(fails)} FALLOS')
sys.exit(1 if fails else 0)
