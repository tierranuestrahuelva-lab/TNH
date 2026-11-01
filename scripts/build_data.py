"""Genera data.js (catálogo del TPV) desde TNH/data/catalog.xlsx + códigos de barras.
Solo PVP 1 (tienda). Ventas -> solo ranking (nunca cifras reales)."""
import json, re, openpyxl, os
HERE = os.path.dirname(os.path.abspath(__file__))
TNH = os.path.expanduser('~/repos/TNH/data')

def fam(t, n):
    t = (t or '').strip().lower(); n = (n or '').lower()
    if t.startswith('tinto dulce') or 'dulce natural' in t or t.startswith('generosos'): return 'generosos'
    if t.startswith('tinto'): return 'tintos'
    if t.startswith('blanco'): return 'blancos'
    if t.startswith('rosado'): return 'rosados'
    if t.startswith('espumoso'): return 'espumosos'
    if any(k in t for k in ('licor', 'ginebra', 'ron', 'whisk', 'brandy', 'vodka', 'cognac')): return 'destilados'
    if t.startswith('magnum') or t.startswith('botellas peq'): return 'formatos'
    if any(k in t for k in ('cesta', 'cajas madera', 'regalos', 'selecciones club')): return 'regalo'
    if t.startswith('gastronom') or t.startswith('aceites'): return 'gourmet'
    if any(k in t for k in ('cristaler', 'accesorios', 'soportes')): return 'accesorios'
    return 'otros'

wb = openpyxl.load_workbook(os.path.join(TNH, 'catalog.xlsx'), read_only=True, data_only=True)
rows = list(wb['Tarifas de artículos'].iter_rows(values_only=True))[1:]
bc = json.load(open(os.path.join(HERE, 'barcodes.json')))
rank = {}
try:
    vw = openpyxl.load_workbook(os.path.join(TNH, 'ventas.xlsx'), read_only=True)
    tot = {}
    for r in list(vw.worksheets[0].iter_rows(values_only=True))[1:]:
        if r[0] and isinstance(r[2], (int, float)):
            k = str(r[0]).strip(); tot[k] = tot.get(k, 0) + r[2]
    for i, k in enumerate(sorted(tot, key=lambda k: -tot[k])): rank[k] = i + 1
except Exception as e:
    print('sin ventas', e)

out = []
for r in rows:
    c = str(r[0] or '').strip(); n = re.sub(r'\s+', ' ', str(r[1] or '')).strip()
    p = r[4]
    if not c or not n or 'NO USAR' in n.upper() or not isinstance(p, (int, float)) or p <= 0: continue
    iva = r[3] if isinstance(r[3], (int, float)) else 0.21
    a = {'c': c, 'n': n, 'p': round(p * 100), 'i': round(iva * 100), 'f': fam(r[8], n)}
    if bc.get(c): a['b'] = bc[c]
    if c in rank and rank[c] <= 400: a['r'] = rank[c]
    out.append(a)
open(os.path.join(HERE, '..', 'data.js'), 'w').write('window.TN_ARTICULOS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(out), Counter(a['f'] for a in out), sum(1 for a in out if 'b' in a), sum(1 for a in out if 'r' in a))
