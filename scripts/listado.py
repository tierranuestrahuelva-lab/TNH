"""Convierte data/listado.xlsx (LISTADO COMPLETO PVP de Sage) en scripts/tpv_data.js (mismo formato que el TPV).
Conserva códigos de barras (scripts/barcodes.json) y ranking de ventas del tpv_data.js anterior. Luego: python3 scripts/build_data.py"""
import json, re, os, openpyxl
H = os.path.dirname(os.path.abspath(__file__))
def fam(t, n):
    t = (t or '').strip().lower()
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
FUERA = ('servicios', 'cursos', 'cenas', 'regalos propaganda')
src = open(os.path.join(H, 'tpv_data.js'), encoding='utf-8').read()
rank = {a['c']: a['r'] for a in json.loads(src[src.index('=') + 1:].rstrip().rstrip(';')) if a.get('r')}
bc = json.load(open(os.path.join(H, 'barcodes.json')))
rows = list(openpyxl.load_workbook(os.path.join(H, '..', 'data', 'listado.xlsx'), read_only=True, data_only=True).worksheets[0].iter_rows(values_only=True))
assert rows[0][:3] == ('Artículo', 'Nombre artículo', 'PVP (1)'), rows[0]
out, vistos = [], set()
for r in rows[1:]:
    c = str(r[0] or '').strip(); n = re.sub(r'\s+', ' ', str(r[1] or '')).strip(); p = r[2]; t = re.sub(r'\s+', ' ', str(r[7] or '')).strip()
    if not c or c in vistos or not n or 'NO USAR' in n.upper() or not isinstance(p, (int, float)) or p <= 0 or t.lower().startswith(FUERA): continue
    vistos.add(c)
    iva = r[8] if isinstance(r[8], (int, float)) and r[8] else 0.21
    a = {'c': c, 'n': n, 'p': round(p * 100), 'i': round(iva * 100), 'f': fam(t, n)}
    for k, col in (('d', 10), ('v', 13), ('o', 9), ('z', 12)):
        x = re.sub(r'\s+', ' ', str(r[col] or '')).strip()
        if x and x.upper() not in ('NINGUNA', 'NINGUNO', 'VARIOS', '-'): a[k] = x
    if t: a['y'] = t
    try:
        vol = float(str(r[11]).replace(',', '.'))
        if vol > 0: a['vol'] = vol
    except Exception: pass
    if bc.get(c): a['b'] = bc[c]
    if c in rank: a['r'] = rank[c]
    out.append(a)
open(os.path.join(H, 'tpv_data.js'), 'w', encoding='utf-8').write('window.TN_ARTICULOS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(out), 'artículos', Counter(a['f'] for a in out))
