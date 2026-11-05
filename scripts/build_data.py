"""Genera data.js de la Guía de vinos para la tienda.
Base: catálogo del TPV (PVP 1 tienda + códigos de barras + ranking) y fichas de la web /vinos/ (foto, texto, estilo, ficha PDF).
Uso: python3 scripts/build_data.py  (tpv_data.js = data.js del TPV, catalog.json = /vinos/catalog.json de gh-pages)"""
import json, re, os
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, 'tpv_data.js'), encoding='utf-8').read()
tpv = json.loads(src[src.index('=') + 1:].rstrip().rstrip(';'))
web = {i['id'] - 10000000: i for i in json.load(open(os.path.join(H, 'catalog.json'), encoding='utf-8')) if i['id'] >= 10000000}
PEQ = {'de', 'del', 'la', 'las', 'los', 'y', 'el', 'en', 'd´', 'i'}
SIGLAS = {'AOC', 'DOC', 'DOCG', 'IGT', 'IGP', 'VT', 'DOP', 'UK', 'USA', 'PX', 'VORS', 'VOS', 'IG'}
def tit(s):
    out = []
    for i, w in enumerate(re.split(r'(\s+|-|/)', s)):
        u = w.upper().strip('.')
        if u in SIGLAS: out.append(u)
        elif i and w.lower() in PEQ: out.append(w.lower())
        else: out.append(w[:1].upper() + w[1:].lower())
    return ''.join(out)
def do_(d):
    if not d: return None
    d = re.sub(r',?\s*(DOP|DOCa|D\.O\.)\.?$', '', d.strip(), flags=re.I).strip()
    d = d.replace('JEREZ-XERES-SHERRY-MANZ.', 'JEREZ-XÉRÈS-SHERRY Y MANZANILLA').replace('RIAS BAIXAS', 'RÍAS BAIXAS').replace('CASTILLA Y LEON', 'CASTILLA Y LEÓN').replace('VINO DE MESA / SIN', 'VINO DE MESA / SIN DOP')
    return tit(d) if d.isupper() or d.upper() == d else d
def prov(o):
    if not o: return None
    o = re.sub(r'\s*\(?[\d.\-/]{3,}\)?\s*$', '', o).strip(' ,')
    return o or None
out = []
for a in tpv:
    r = {'c': a['c'], 'n': a['n'], 'p': a['p'], 'f': a['f']}
    if a.get('y'): r['y'] = a['y']
    d = do_(a.get('d'))
    if d: r['d'] = d
    if a.get('o'): r['o'] = prov(a['o'])
    if a.get('z'): r['z'] = a['z']
    if a.get('b'): r['b'] = a['b']
    if a.get('r'): r['r'] = a['r']
    w = web.get(int(a['c'])) if a['c'].isdigit() else None
    uvas = a.get('v')
    if w:
        if w.get('uva'): uvas = ', '.join(w['uva'])
        if w.get('slug'): r['s'] = w['slug']
        if w.get('img'): r['im'] = 1
        t = (w.get('desc') or w.get('short') or '').strip()
        if t: r['t'] = re.sub(r'\s+', ' ', t)
        for k, kk in (('estilo', 'e'), ('grado', 'g'), ('formato', 'fm'), ('anada', 'an'), ('puntos', 'pu')):
            if w.get(k): r[kk] = w[k]
        if w.get('sellos'): r['se'] = w['sellos']
        if w.get('fichaPdf'): r['fi'] = 1
        if w.get('novedad'): r['nv'] = 1
        if w.get('bodega') and not r.get('o'): r['o'] = prov(w['bodega'])
    if not r.get('fm'):
        m = re.search(r'(\d+(?:[.,]\d+)?)\s?(cl|l|lt|ml)\b', a['n'], re.I)
        if m: r['fm'] = m.group(1) + ' ' + m.group(2).lower()
        elif re.search(r'magnum', a['n'], re.I): r['fm'] = '150 cl'
    if not r.get('an'):
        m = re.search(r'\b(19[5-9]\d|20[0-3]\d)\b', a['n'])
        if m: r['an'] = m.group(1)
    if uvas: r['v'] = uvas
    if int(a['c']) >= 3751800 if a['c'].isdigit() else False: r['nv'] = 1
    out.append({k: v for k, v in r.items() if v not in (None, '', [])})
open(os.path.join(H, '..', 'data.js'), 'w', encoding='utf-8').write('window.GUIA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(out), 'arts ·', sum('im' in x for x in out), 'fotos ·', sum('t' in x for x in out), 'textos ·', sum('b' in x for x in out), 'con código barras ·', sum('s' in x for x in out), 'con enlace web')
print(Counter(x.get('d') for x in out).most_common(40))
