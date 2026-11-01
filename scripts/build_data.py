"""Genera data.js con la foto actual de la nube (proyecto Supabase UBICACIONES).
Uso: SUPABASE_ACCESS_TOKEN=sbp_... python3 scripts/build_data.py"""
import json, os, urllib.request, datetime, pathlib
REF = 'zxrrwwmxbvdlkalqzzau'
SQL = """select a.c, a.n, coalesce(a.u,'') u, coalesce(a.v,'') v, coalesce(a.b,'{}') b,
 coalesce(w.tipo,'') t, coalesce(w.denominacion,'') d, coalesce(w.bodega,'') bo
 from articulos a left join wa_articulos w on trim(w.codigo)=trim(a.c) order by a.n"""
req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query',
    data=json.dumps({'query': SQL}).encode(), method='POST',
    headers={'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json',
             'User-Agent': 'croquis-tn'})
rows = json.load(urllib.request.urlopen(req))
arts = [{k: r[k] for k in ('c', 'n', 'u', 'v', 'b', 't', 'd', 'bo')} for r in rows]
for a in arts:
    a['c'] = a['c'].strip(); a['b'] = [x for x in a['b'] if x]
out = pathlib.Path(__file__).resolve().parent.parent / 'data.js'
stamp = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M')
out.write_text('window.CQ_DATA=' + json.dumps({'generado': stamp, 'articulos': arts}, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(len(arts), 'artículos →', out)
