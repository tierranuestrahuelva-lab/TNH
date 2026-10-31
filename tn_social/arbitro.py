"""El árbitro del método Gauntlet: python3 arbitro.py pack.json
Revisa cada pieza con la lista de control de Tierra Nuestra y da una nota sobre 10.
Listón: 10/10 en todas las piezas antes de enseñarlas a Tierra."""
import json, sys, re, pathlib, subprocess
from PIL import Image
SIZES = {'post': (1080, 1350), 'cuadrado': (1080, 1080), 'story': (1080, 1920)}
TELS_OK = {'699 414 559', '959 541 579', '+34 699 414 559', '+34 959 541 579'}
EMAIL_OK = {'tnh@tierranuestrahuelva.es'}
BODEGAS_FUERA = ['olivares e hijos', 'álvaro palacios', 'dominio de es', 'eguren', 'entresierras', 'faustino', 'campillo', 'le fleq',
                 'libre y salvaje', 'joaquín tardío', 'marqués de griñón', 'paco & lola', 'rebola', 'aldeanueva', 'paco garcía', 'acontia', 'no usar']
# Publicidad de alcohol (Ley 34/1988 y normas de Meta): sin menores, salud, conducción, éxito social/sexual ni consumo excesivo
PROHIBIDO = [r'\bsalud(able)?\b', r'\bcura\b', r'medicin', r'adelgaz', r'\bconduc', r'\bmenor(es)?\b', r'\bniñ[oa]s?\b', r'emborrach',
             r'barra libre', r'bebe m[aá]s', r'sin l[ií]mite', r'\bsexy\b', r'ligar', r'\béxito\b', r'deport', r'energ[ií]a',
             r'tarifa', r'coste', r'precio de compra', r'distribuidor']
TU = r'\b(te|tu|tus|ti|contigo|pídelo|ven|elige|vota|toca|escríbenos|cuéntanos|llévate)\b'
USTED = r'\b(usted|su|sus|le|solicite|contacte|cuéntenos|deslice|responda|reserve|pida|regale)\b'
USTED_FUERTE = r'\b(usted|solicite|contacte|cuéntenos|deslice|responda|reserve|pida|regale|escríbanos|consúltenos)\b'
REDES_OK = ('Instagram', 'Facebook')

def textos(piece):
    out = [piece.get('caption', '')]
    for s in piece['slides']:
        for k in ('kicker', 'titulo', 'sub', 'texto', 'nombre', 'linea', 'cta', 'banda_txt', 'pie'):
            if s.get(k): out.append(re.sub('<[^>]+>', ' ', s[k]))
        out += s.get('puntos', []) + s.get('chips', [])
        if s.get('banda') is not False and not s.get('banda_txt'):
            out.append('WhatsApp 699 414 559' if piece['audiencia'] == 'horeca' else 'Pídelo por WhatsApp 699 414 559')
        out += [x['t'] + ' ' + x['d'] for x in s.get('items', [])]
        out += [v['nombre'] + ' ' + v['linea'] + ' ' + v.get('uso', '') for v in s.get('vinos', [])]
    return '\n'.join(out)

def ortografia(t):
    palabras = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+", re.sub(r'#\w+|\S+@\S+|https?://\S+', ' ', t))
    r = subprocess.run(['hunspell', '-d', 'es_ES', '-l'], input='\n'.join(palabras), capture_output=True, text=True)
    return sorted(set(r.stdout.split()))

def main(pack_path):
    pack_path = pathlib.Path(pack_path).resolve(); pdir = pack_path.parent
    pack = json.loads(pack_path.read_text())
    rr = json.loads((pdir/'render_report.json').read_text())
    web = {p['id']: p for p in json.loads((pathlib.Path(__file__).parent/'datos'/'web_products.json').read_text())}
    dic_ok = set(json.loads((pathlib.Path(__file__).parent/'datos'/'palabras_ok.json').read_text()))
    total_ok = True; resumen = []
    for pc in pack['piezas']:
        checks = []
        def c(nombre, ok, detalle=''): checks.append((nombre, bool(ok), detalle))
        t = textos(pc); tl = t.lower(); cap = pc.get('caption', '')
        # 1 imágenes: existen, tamaño exacto, sin desbordes, letra sin encoger de más, zona segura en historias
        W, H = SIZES[pc['formato']]; prob = []
        for k in range(1, len(pc['slides'])+1):
            f = pdir/'out'/f"{pc['id']}_{k}.jpg"
            if not f.exists(): prob.append(f'falta {f.name}'); continue
            if Image.open(f).size != (W, H): prob.append(f'{f.name} tamaño {Image.open(f).size}')
            r = rr.get(f.name, {})
            if r.get('overflow'): prob.append(f'{f.name} texto no cabe')
            if r.get('shrink', 1) < 0.85: prob.append(f'{f.name} letra encogida {r["shrink"]}')
            if r.get('broken'): prob.append(f'{f.name} imagen rota')
            if pc['formato'] == 'story':
                for cls, top, bot in r.get('keys', []):
                    if top < 200 or bot > H - 250: prob.append(f'{f.name} {cls} fuera de zona segura ({top}-{bot})')
        c('Imágenes correctas (tamaño, sin cortes, zona segura)', not prob, '; '.join(prob))
        # 2 texto de publicación
        if pc['formato'] != 'story':
            primera = cap.split('\n')[0]
            c('Texto: gancho en la 1ª línea (≤125 letras) y total ≤2.200', cap and len(primera) <= 125 and len(cap) + 60 <= 2200, f'{len(primera)} / {len(cap)}')
            n = len(pc.get('hashtags', []))
            c('3 a 5 hashtags, con #Huelva y #TierraNuestra', 3 <= n <= 5 and '#Huelva' in pc['hashtags'] and '#TierraNuestra' in pc['hashtags'], str(n))
            c('Llamada a la acción con contacto', re.search(r'699 414 559|959 541 579|tnh@', cap) or re.search(r'coment', cap.lower()), '')
        else:
            c('Historia: llamada a la acción o etiqueta indicada', any(s.get('cta') for s in pc['slides']) or pc.get('notas'), '')
        # 3 sin precios
        c('Sin precios (salvo permiso expreso)', pc.get('permite_precio') or not re.search(r'€|\beuros?\b|\d+[,.]\d{2}\b', tl), '')
        # 4 datos de contacto correctos
        tels = set(re.findall(r'(?:\+34 )?\d{3} \d{3} \d{3}', t)); mails = set(re.findall(r'[\w.]+@[\w.]+\w', t))
        c('Teléfonos y e-mail oficiales', tels <= TELS_OK and mails <= EMAIL_OK, f'{tels - TELS_OK} {mails - EMAIL_OK}')
        # 5 publicidad responsable de alcohol y nada interno
        malos = [p for p in PROHIBIDO if re.search(p, tl)]
        c('Publicidad responsable (sin menores, salud, conducción, excesos) y sin datos internos', not malos, ', '.join(malos))
        # 6 bodegas excluidas
        fuera = [b for b in BODEGAS_FUERA if b in tl]
        c('Sin bodegas excluidas', not fuera, ', '.join(fuera))
        # 7 productos reales de tierranuestra.es y en stock
        mal = [i for i in pc.get('producto_ids', []) if i not in web or (pc['tipo'] != 'navidad' and not web[i]['is_in_stock'])]
        c('Vinos reales de la web y con stock', not mal, str(mal))
        # 8 fotos oficiales (solo carpeta fotos/ descargada de tierranuestra.es o webs oficiales)
        imgs = [s.get('img') for s in pc['slides'] if s.get('img')] + [i for s in pc['slides'] for i in s.get('imgs', [])] + [v['img'] for s in pc['slides'] for v in s.get('vinos', [])]
        c('Fotos de fuente oficial (carpeta fotos/)', all(str(i).startswith('fotos/') for i in imgs), '')
        # 9 tono según público
        tu = len(re.findall(TU, tl)); us = len(re.findall(USTED, tl))
        ok_tono = (us >= 1 and tu == 0) if pc['audiencia'] == 'horeca' else tu >= 1 and not re.search(USTED_FUERTE, tl)
        c('Tono correcto (hostelería/empresa = usted; tienda = tú)', ok_tono, f'tú={tu} usted={us}')
        # 10 ortografía
        err = [w for w in ortografia(t) if w.lower() not in dic_ok and w not in dic_ok]
        c('Ortografía (corrector es_ES + lista de nombres propios)', not err, ', '.join(err))
        nota = sum(ok for _, ok, _ in checks); tot = len(checks)
        resumen.append((pc['id'], nota, tot)); total_ok &= nota == tot
        print(f"\n== {pc['id']}  {nota}/{tot}")
        for n, ok, d in checks:
            if not ok: print(f'   FALLA  {n}  {d}')
    print('\nRESUMEN'); [print(f'  {i}: {n}/{t}') for i, n, t in resumen]
    print('LISTÓN SUPERADO' if total_ok else 'NO SUPERA EL LISTÓN: corregir y repetir')
    return 0 if total_ok else 1

if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
