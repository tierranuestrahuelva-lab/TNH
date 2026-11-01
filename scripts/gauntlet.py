"""Gauntlet del TPV: pasa el recorrido completo y el árbitro y genera gauntlet/informe.html. Uso: python3 scripts/gauntlet.py"""
import html, os, re, subprocess, sys, time
from datetime import datetime
from zoneinfo import ZoneInfo
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.makedirs('gauntlet', exist_ok=True); os.makedirs('/tmp/tpvshots', exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
casos = []
try:
    for capa, f in (('Recorrido completo', 'tests/e2e.py'), ('Árbitro', 'tests/arbitro.py')):
        r = subprocess.run([sys.executable, f, 'http://127.0.0.1:8766/'], capture_output=True, text=True); out = r.stdout
        if r.stderr.strip(): print(r.stderr[-1500:])
        print(out)
        lineas = [l for l in out.splitlines() if l.startswith(('OK   ', 'FAIL '))]
        if 'RESULTADO' not in out: lineas.append(f'FAIL {f} se interrumpió')
        casos += [(capa, l[5:], l.startswith('OK')) for l in lineas]
finally:
    srv.terminate()
reqs = re.findall(r'^- \*\*([A-Z]+-\d+)\*\* (.+)$', open('docs/ESPECIFICACIONES.md', encoding='utf-8').read(), re.M)
por = {r: [] for r, _ in reqs}
for c in casos:
    for code in re.findall(r'[A-Z]+-\d+', c[1].split(' ')[0]): por.setdefault(code, []).append(c)
fallan = [c for c in casos if not c[2]]; sin = [r for r, _ in reqs if not por[r]]
ok = bool(casos) and not fallan and not sin
e = html.escape
fila = lambda r, t: (lambda cs, f: f'<tr><td><b>{r}</b></td><td>{e(t.replace("**", ""))}</td><td>{len(cs)}</td><td><span class="{"gris" if not cs else "rojo" if f else "verde"}">{"Sin prueba" if not cs else f"{f} fallo(s)" if f else "Pasa"}</span></td></tr>')(por[r], sum(1 for c in por[r] if not c[2]))
open('gauntlet/informe.html', 'w', encoding='utf-8').write(f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gauntlet · TPV</title>
<style>body{{font:15px system-ui;margin:0;background:#faf7f9;color:#2b1a24}}main{{max-width:980px;margin:auto;padding:24px}}h1{{color:#830040}}
.liston{{padding:18px 22px;border-radius:18px;color:#fff;font-size:20px;font-weight:600;background:{"#15803d" if ok else "#b91c1c"}}}
.kpi{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}}.kpi div{{background:#fff;border-radius:14px;padding:14px;box-shadow:0 1px 4px #0001}}.kpi b{{font-size:26px;display:block}}
table{{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px #0001}}td,th{{padding:8px 10px;border-top:1px solid #f1e6ec;text-align:left;vertical-align:top}}th{{background:#f6eaf1;font-size:12px;text-transform:uppercase}}
.verde,.rojo,.gris{{padding:2px 8px;border-radius:8px;font-size:13px;white-space:nowrap}}.verde{{background:#dcfce7;color:#166534}}.rojo{{background:#fee2e2;color:#991b1b}}.gris{{background:#eee;color:#555}}</style>
<main><h1>Gauntlet · TPV Tierra Nuestra</h1><p>{datetime.now(ZoneInfo("Europe/Madrid")).strftime("%d/%m/%Y %H:%M")}</p>
<div class="liston">{"✔ Listón superado: se puede publicar" if ok else "✘ No pasa el listón: no publicar"}</div>
<div class="kpi"><div><b>{len(casos) - len(fallan)}/{len(casos)}</b>Pruebas que pasan</div><div><b>{len(reqs) - len(sin)}/{len(reqs)}</b>Requisitos con prueba</div><div><b>{sum(1 for c in casos if c[0] == "Árbitro")}</b>Pruebas del árbitro</div></div>
<h2>Requisitos</h2><table><tr><th>Código</th><th>Qué se exige</th><th>Pruebas</th><th>Estado</th></tr>{"".join(fila(r, t) for r, t in reqs)}</table>
{"<h2>Fallos</h2><ul>" + "".join(f"<li>{e(c[0])} · {e(c[1])}</li>" for c in fallan) + "</ul>" if fallan else ""}
<h2>Todas las pruebas</h2><table><tr><th>Capa</th><th>Prueba</th><th>Resultado</th></tr>{"".join(f'<tr><td>{e(c[0])}</td><td>{e(c[1])}</td><td><span class="{"verde" if c[2] else "rojo"}">{"Pasa" if c[2] else "Falla"}</span></td></tr>' for c in casos)}</table></main>''')
print(f'Gauntlet: pruebas {len(casos) - len(fallan)}/{len(casos)} · requisitos sin prueba: {", ".join(sin) or "ninguno"}')
print('LISTÓN SUPERADO' if ok else 'NO PASA EL LISTÓN')
sys.exit(0 if ok else 1)
