"""Pruebas de la web /vinos/: pedidos por WhatsApp y email, contactos, sin overflow. Uso: python3 tests/pedidos.py [url]"""
import sys, re, urllib.parse as up
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8770/vinos/'
fails = []
def check(c, m):
    print(('OK   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((390, 844), (1366, 860)):
        ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); pg.set_default_timeout(8000); errs = []; navs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        cdp = ctx.new_cdp_session(pg); cdp.send('Page.enable')
        cdp.on('Page.frameRequestedNavigation', lambda e: navs.append(e['url']))
        pg.route(re.compile(r'https://wa\.me/.*'), lambda r: (navs.append(r.request.url), r.fulfill(body='ok')))
        pg.goto(URL + '#/tienda'); pg.wait_for_timeout(1500)
        if pg.locator('button:has-text("Sí, soy mayor de edad")').count(): pg.click('button:has-text("Sí, soy mayor de edad")'); pg.wait_for_timeout(400)
        if pg.locator('aside[role=status] button').count(): pg.locator('aside[role=status] button').first.click(); pg.wait_for_timeout(300)
        btn = pg.locator('button[aria-label^="Añadir "][aria-label$=" a la cesta"]').first
        check(btn.count() == 1, f'[{w}px] hay botón para añadir a la cesta')
        btn.click(); pg.wait_for_timeout(500)
        if pg.locator('[aria-label="Tu cesta"]').count() == 0:
            pg.locator('header button[aria-label*="esta" i]').first.click(); pg.wait_for_timeout(400)
        check(pg.locator('[aria-label="Tu cesta"]').count() == 1, f'[{w}px] se abre la cesta')
        check('WhatsApp o por email' in pg.inner_text('[aria-label="Tu cesta"]'), f'[{w}px] la cesta avisa de que se confirma por WhatsApp o email')
        pg.click('button:has-text("Finalizar pedido")'); pg.wait_for_timeout(300)
        form = pg.locator('[aria-label="Tu cesta"] form')
        inputs = form.locator('input:visible'); 
        for i in range(inputs.count()):
            t = inputs.nth(i).get_attribute('type') or 'text'
            if t in ('text', 'tel', 'email', None): inputs.nth(i).fill('699000000' if t == 'tel' else 'Ana & Luis #1? 50%')
        form.locator('textarea').fill('Timbre 2ºB\nNo llamar antes de las 10 & gracias')
        pg.screenshot(path=f'shots/cesta-{w}.png')
        check(pg.locator('button:has-text("Enviar pedido por email")').count() == 1 and pg.locator('button:has-text("Enviar pedido por WhatsApp")').count() == 1, f'[{w}px] dos botones: WhatsApp y email')
        sw = pg.evaluate('document.documentElement.scrollWidth'); check(sw <= w, f'[{w}px] la cesta no se sale por los lados ({sw}px)')
        navs.clear(); pg.click('button:has-text("Enviar pedido por email")'); pg.wait_for_timeout(800)
        m = [u for u in navs if u.startswith('mailto:')]
        body = up.unquote(m[0]) if m else ''
        check(bool(m) and m[0].startswith('mailto:tnh@tierranuestrahuelva.es?subject='), f'[{w}px] email de pedido va a tnh@tierranuestrahuelva.es')
        check('Ana & Luis #1? 50%' in body and 'Timbre 2ºB\nNo llamar antes de las 10 & gracias' in body, f'[{w}px] árbitro: símbolos (& # ? %) y saltos de línea llegan intactos al email')
        check('Total:' in body and 'Ana & Luis' in body and '×' in body and 'WhatsApp' not in body.split('Total:')[1], f'[{w}px] el email lleva nombre, vinos y total')
        navs.clear(); pg.click('button:has-text("Enviar pedido por WhatsApp")'); pg.wait_for_timeout(800)
        wa = [u for u in navs if 'wa.me/34699414559' in u]
        check(bool(wa) and 'Total' in up.unquote(wa[0]), f'[{w}px] WhatsApp de pedido va al 699 414 559 con el total')
        pg.goto(URL + '#/contacto'); pg.wait_for_timeout(800)
        hrefs = pg.eval_on_selector_all('a', 'as => as.map(a => a.getAttribute("href"))')
        for need in ('tel:+34959541579', 'mailto:tnh@tierranuestrahuelva.es', 'https://wa.me/34699414559', 'tel:+34959541578', 'mailto:enrique@tierranuestrahuelva.es', 'tel:+34616769861', 'mailto:maribel@tierranuestrahuelva.es'):
            check(hrefs.count(need) >= 2, f'[{w}px] contacto y pie de página enlazan {need}')
        pg.screenshot(path=f'shots/contacto-{w}.png', full_page=True)
        sw = pg.evaluate('document.documentElement.scrollWidth'); check(sw <= w, f'[{w}px] contacto no se sale por los lados ({sw}px)')
        pg.goto(URL + '#/legal/condiciones'); pg.wait_for_timeout(500)
        check('WhatsApp o por email' in pg.inner_text('main'), f'[{w}px] condiciones mencionan WhatsApp o email')
        check(not errs, f'[{w}px] sin errores de JavaScript ' + '; '.join(errs[:2]))
        ctx.close()
    b.close()
print('\nRESULTADO:', 'TODO OK' if not fails else f'{len(fails)} FALLOS'); sys.exit(1 if fails else 0)
