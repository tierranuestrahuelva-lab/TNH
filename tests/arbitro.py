"""Árbitro independiente: vuelve a leer data.js con su PROPIO parser (no usa model.js)
y compara hueco a hueco con lo que pinta la app. Uso: python3 tests/arbitro.py [url]"""
import sys, json, re, pathlib, random
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8766/'
raw = pathlib.Path(__file__).resolve().parent.parent.joinpath('data.js').read_text(encoding='utf-8')
arts = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])['articulos']
esperado, raros = {}, []
for a in arts:
    for campo in ('u', 'v'):
        for tr in [t.strip() for t in (a[campo] or '').split('/') if t.strip()]:
            t = re.sub(r'\s+', '', tr.upper()); k = None
            if campo == 'u' and re.fullmatch(r'[A-G]\d{1,2}S?', t): k = 'nichero:' + t[0] + t[1:].rstrip('S').zfill(2)
            elif campo == 'u' and re.fullmatch(r'[1-4][A-Z]\d[A-Z][PS]?', t): k = 'almacen:' + t[:4]
            elif campo == 'u' and re.fullmatch(r'[1-4][A-Z]?(SUELO|PASILLO)', t): k = 'almacen:' + re.sub(r'(SUELO|PASILLO)$', r'-\1', t)
            elif re.fullmatch(r'\d[A-Z]\d', t): k = 'nave:' + t
            if k: esperado.setdefault(k, set()).add(a['c'].strip())
            else: raros.append(tr)
fails = []
def check(c, m):
    print(('OK   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    pg = p.chromium.launch().new_page(viewport={'width': 1440, 'height': 900})
    pg.goto(URL); pg.wait_for_timeout(500)
    pintado = {}
    for z in ('nichero', 'almacen', 'nave'):
        pg.click(f'[data-zona="{z}"]'); pg.wait_for_timeout(150)
        for k, n in pg.evaluate('[...document.querySelectorAll("#lienzo [data-k]")].map(g=>[g.dataset.k,+g.dataset.n])'):
            check(k not in pintado, f'hueco {k} dibujado una sola vez') if k in pintado else None
            pintado[k] = n
    app = pg.evaluate('Object.fromEntries([...__CQ.M.huecos.values()].map(h=>[h.k,h.arts.map(a=>a.c)]))')
    falta = [k for k in esperado if k not in pintado]
    check(not falta, f'todos los huecos con vino aparecen en el plano ({len(esperado)}) {falta[:5]}')
    mal = [k for k in esperado if pintado.get(k) != len(esperado[k]) or set(app.get(k, [])) != esperado[k]]
    check(not mal, f'cada hueco tiene exactamente sus vinos {mal[:5]}')
    sobran = [k for k, n in pintado.items() if n and k not in esperado]
    check(not sobran, f'ningún hueco muestra vinos que no tocan {sobran[:5]}')
    check(sorted(raros) == sorted(pg.evaluate('__CQ.M.revisar.raros.map(r=>r.raw)')), f'mismos códigos raros: {raros}')
    # búsqueda al azar: cada vino encontrado por su código ilumina sus huecos
    random.seed(7)
    for a in random.sample([a for a in arts if a['u'] or a['v']], 25):
        pg.click('[data-zona="nichero"]'); pg.fill('#q', a['c']); pg.wait_for_timeout(60)
        ks = {k for k, cs in esperado.items() if a['c'].strip() in cs}
        hits = set()
        for z in ('nichero', 'almacen', 'nave'):
            pg.click(f'[data-zona="{z}"]')
            hits |= set(pg.evaluate('[...document.querySelectorAll("#lienzo .h.hit")].map(g=>g.dataset.k)'))
        check(ks <= hits, f'buscar {a["c"]} ilumina {sorted(ks)}')
    # propuesta: color correcto por columna, sin huecos repetidos por encima del límite, orden A-Z dentro de cada tipo/DO
    for por in (1, 2, 3):
        P = pg.evaluate(f'(()=>{{const P=CQ.proponer(__CQ.M,{{porHueco:{por}}});return P.filas.map(f=>({{g:f.a.g,h:f.hasta,ot:f.a.ot,d:f.a.dc,n:f.a.n}}))}})()')
        col = {'A': 'tinto', 'C': 'tinto', 'D': 'tinto', 'E': 'tinto', 'F': 'tinto', 'B': 'blanco', 'G': 'rosado'}
        malc = [f for f in P if f['h'] and re.fullmatch(r'[A-G]\d\d', f['h']) and col[f['h'][0]] != f['g']]
        cnt = {}
        for f in P:
            if f['h'] and re.fullmatch(r'[A-G]\d\d', f['h']): cnt[f['h']] = cnt.get(f['h'], 0) + 1
        check(not malc and max(cnt.values()) <= por, f'propuesta {por}/hueco: colores correctos y máx. {por} por hueco')
    # ataque: datos basura no rompen el modelo ni inventan huecos
    r = pg.evaluate('''(()=>{const basura=["","  ","///","a01","A1","a 01 s","Z99","9Z9Z","4n0b","2c suelo","<img src=x>","1A4/1A4","A01/A01/A01",null,undefined,"🍷"];
      const L=basura.map((u,i)=>({c:"T"+i,n:"Prueba "+i,u:u,v:basura[(i+3)%basura.length],b:[],t:"",d:"",bo:""}));
      const M=CQ.construir(L);return {h:[...M.huecos.keys()].sort(),raros:M.revisar.raros.length,vacio:CQ.construir([]).huecos.size>=0}})()''')
    check('nichero:A01' in r['h'] and 'almacen:4N0B' in r['h'] and not any('Z99' in k or '<' in k for k in r['h']), f'datos basura: no rompe y no inventa huecos ({len(r["h"])} huecos, {r["raros"]} raros)')
    pg.fill('#q', '<img src=x onerror=alert(1)>'); pg.wait_for_timeout(100)
    check(pg.locator('#sugs img, #app img[src="x"]').count() == 0, 'el buscador no ejecuta HTML metido a mano')
print('\n' + ('ÁRBITRO: TODO OK' if not fails else f'ÁRBITRO: {len(fails)} FALLOS'))
sys.exit(1 if fails else 0)
