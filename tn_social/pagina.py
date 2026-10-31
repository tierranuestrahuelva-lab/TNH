"""Genera la página de entrega (un solo HTML, imágenes incrustadas) de un pack."""
import base64, html, json, sys
from pathlib import Path

DIAS = {'2026-11-02':'Lunes 2','2026-11-03':'Martes 3','2026-11-04':'Miércoles 4','2026-11-05':'Jueves 5',
        '2026-11-06':'Viernes 6','2026-11-07':'Sábado 7','2026-11-08':'Domingo 8'}

def b64(p): return 'data:image/jpeg;base64,' + base64.b64encode(Path(p).read_bytes()).decode()

def main(pack_path):
    pdir = Path(pack_path).parent
    p = json.loads(Path(pack_path).read_text())
    ex = json.loads((pdir/'extras.json').read_text()) if (pdir/'extras.json').exists() else {}
    e = html.escape
    cards = []
    for pz in p['piezas']:
        imgs = sorted((pdir/'out').glob(pz['id'] + '_*.jpg'))
        story = pz['formato'] == 'story'
        txt = pz['caption'] + ('\n\n' + ' '.join(pz.get('hashtags', [])) if pz.get('hashtags') else '')
        ims = ''.join(f'<a download="{i.name}" href="{b64(i)}"><img class="{"st" if story else "po"}" src="{b64(i)}"></a>' for i in imgs)
        cards.append(f'''<section class="card"><div class="meta"><b>{e(DIAS.get(pz["fecha"], pz["fecha"]))} · {e(pz.get("hora",""))}</b>
<span class="tag {pz["audiencia"]}">{"Hostelería" if pz["audiencia"]=="horeca" else "Tienda"}</span><span class="tag">{"Historia" if story else ("Carrusel" if len(imgs)>1 else "Publicación")}</span>
<span class="redes">{e(" · ".join(pz.get("redes",[])))}</span></div>
<div class="imgs">{ims}</div><p class="hint">Mantén pulsada la imagen (móvil) o haz clic (ordenador) para guardarla.</p>
{f'<div class="txt"><pre>{e(txt)}</pre><button onclick="cp(this)">Copiar texto</button></div>' if pz.get("caption") else ""}
{f'<p class="nota">📌 {e(pz["notas"])}</p>' if pz.get("notas") else ""}</section>''')
    cal = ''.join(f'<div class="sem"><h3>{e(s["semana"])} <small>{e(s["estado"])}</small></h3><ul>' + ''.join(f'<li>{e(t)}</li>' for t in s['temas']) + '</ul></div>' for s in ex.get('calendario', []))
    resp = ''.join(f'<div class="txt"><h4>{e(r["caso"])}</h4><pre>{e(r["texto"])}</pre><button onclick="cp(this)">Copiar</button></div>' for r in ex.get('respuestas', []))
    ads = ''.join(f'''<div class="ad"><h3>{e(a["nombre"])}</h3><dl><dt>Cuándo</dt><dd>{e(a["cuando"])}</dd><dt>Objetivo</dt><dd>{e(a["objetivo"])}</dd>
<dt>A quién</dt><dd>{e(a["publico"])}</dd><dt>Presupuesto</dt><dd>{e(a["presupuesto"])}</dd><dt>Imagen</dt><dd>{e(a["creatividad"])}</dd>
<dt>Título</dt><dd>{e(a["titulo"])}</dd><dt>Botón</dt><dd>{e(a["boton"])}</dd></dl><div class="txt"><pre>{e(a["texto_principal"])}</pre><button onclick="cp(this)">Copiar texto</button></div></div>''' for a in ex.get('anuncios', []))
    lis = lambda k: '<ul class="reglas">' + ''.join(f'<li>{e(x)}</li>' for x in ex.get(k, [])) + '</ul>'
    logo = 'data:image/svg+xml;base64,' + base64.b64encode((Path(__file__).parent/'brand/logo-blanco.svg').read_bytes()).decode()
    out = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redes Tierra Nuestra · {e(str(p["pack"]))}</title><style>
body{{margin:0;font-family:system-ui,-apple-system,"Fira Sans",sans-serif;background:#F6F1EC;color:#1d1a1b}}
header{{background:#830040;color:#fff;padding:18px 20px}}header img{{height:34px}}header h1{{font-weight:400;font-size:22px;margin:10px 0 0}}
nav{{position:sticky;top:0;background:#fff;display:flex;gap:4px;overflow-x:auto;padding:8px;box-shadow:0 2px 6px #0001;z-index:2}}
nav button{{border:0;background:#EBD9E4;color:#830040;padding:10px 14px;border-radius:20px;font-size:15px;white-space:nowrap;cursor:pointer}}nav button.on{{background:#830040;color:#fff}}
main{{max-width:980px;margin:auto;padding:16px}}.tab{{display:none}}.tab.on{{display:block}}
.card,.sem,.ad,.box{{background:#fff;border-radius:12px;padding:16px;margin:0 0 16px;box-shadow:0 1px 4px #0001}}
.meta{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}}.tag{{background:#EBD9E4;color:#830040;border-radius:12px;padding:2px 10px;font-size:13px}}.tag.horeca{{background:#830040;color:#fff}}
.redes{{color:#777;font-size:13px}}.imgs{{display:flex;gap:10px;overflow-x:auto}}.imgs img{{border-radius:6px;box-shadow:0 1px 4px #0003}}
img.po{{height:420px}}img.st{{height:520px}}.hint{{color:#888;font-size:12px;margin:6px 0}}
.txt{{background:#faf7f4;border:1px solid #eee;border-radius:8px;padding:10px;margin:10px 0}}.txt pre{{white-space:pre-wrap;font-family:inherit;margin:0 0 8px;font-size:15px}}
.txt h4{{margin:0 0 6px;color:#830040}}button{{font-family:inherit}}.txt button{{background:#830040;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}}
.nota{{background:#fff7e0;border-radius:8px;padding:8px 10px;font-size:14px}}h2{{color:#830040;font-weight:500}}h3 small{{color:#B771A0;font-weight:400}}
dl{{display:grid;grid-template-columns:110px 1fr;gap:4px 10px}}dt{{color:#830040;font-weight:600}}dd{{margin:0}}.reglas li{{margin:4px 0}}
@media(max-width:600px){{img.po{{height:300px}}img.st{{height:380px}}}}</style></head><body>
<header><img src="{logo}"><h1>Redes sociales · {e(str(p["pack"]))}</h1></header>
<nav><button class="on" onclick="go(0,this)">Publicaciones</button><button onclick="go(1,this)">Calendario</button><button onclick="go(2,this)">Respuestas</button><button onclick="go(3,this)">Anuncios</button><button onclick="go(4,this)">Estadísticas</button></nav>
<main><div class="tab on"><div class="box">Todo revisado por el «árbitro»: tamaños, textos sin cortes, sin precios, teléfonos correctos, fotos oficiales, tono y normas de alcohol de Meta. <b>Solo falta tu OK.</b></div>{"".join(cards)}</div>
<div class="tab"><h2>Calendario de noviembre</h2>{cal}</div>
<div class="tab"><h2>Respuestas listas para copiar</h2>{lis("reglas_respuesta")}{resp}</div>
<div class="tab"><h2>Anuncios en Meta (propuesta)</h2>{lis("reglas_anuncios")}{ads}</div>
<div class="tab"><h2>Informe de estadísticas</h2><div class="box">Usa el Excel <b>informe-estadisticas-noviembre.xlsx</b>: cada semana apunta el alcance, me gusta, comentarios, guardados, compartidos y mensajes de cada publicación (Instagram → publicación → <i>Ver estadísticas</i>). El Excel calcula solo qué funciona mejor, y si es mejor hostelería o tienda. A final de mes me lo pasas y preparo el siguiente mes con lo que mejor haya funcionado.</div></div></main>
<script>function go(i,b){{document.querySelectorAll('.tab').forEach((t,k)=>t.classList.toggle('on',k==i));document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));b.classList.add('on');scrollTo(0,0)}}
function cp(b){{const t=b.previousElementSibling.innerText;navigator.clipboard.writeText(t).then(()=>{{b.textContent='¡Copiado!';setTimeout(()=>b.textContent='Copiar',1500)}})}}</script></body></html>'''
    dst = pdir/'entrega'/'index.html'; dst.parent.mkdir(exist_ok=True); dst.write_text(out)
    print(dst, round(dst.stat().st_size/1e6, 1), 'MB')

if __name__ == '__main__':
    main(sys.argv[1])
