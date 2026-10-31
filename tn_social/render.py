"""Renderiza un pack de redes: python3 render.py pack.json  -> <pack_dir>/out/*.jpg + render_report.json"""
import json, sys, os, asyncio, pathlib
from jinja2 import Environment, FileSystemLoader
from playwright.async_api import async_playwright
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
B = (HERE/'brand').as_uri()
WA = (HERE/'brand/icons/whatsapp.svg').read_text()
SIZES = {'post': (1080, 1350), 'cuadrado': (1080, 1080), 'story': (1080, 1920)}
env = Environment(loader=FileSystemLoader(str(HERE)), autoescape=True)
tpl = env.get_template('plantilla.html.j2')

def prep_bottle(src, dst):
    """Recorta el fondo blanco de la foto oficial y la deja en JPG limpio."""
    im = Image.open(src).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
    g = im.convert('L').point(lambda v: 255 if v < 238 else 0)
    box = g.getbbox()
    if box:
        pad = 6; box = (max(0, box[0]-pad), max(0, box[1]-pad), min(im.width, box[2]+pad), min(im.height, box[3]+pad)); im = im.crop(box)
    im.save(dst, quality=95)
    return dst

def fix_imgs(s, pdir, cache):
    def one(p):
        if not p: return p
        p = str((pdir/p).resolve()) if not os.path.isabs(p) else p
        if p not in cache:
            d = pdir/'out'/'_img'; d.mkdir(parents=True, exist_ok=True)
            cache[p] = pathlib.Path(prep_bottle(p, d/(pathlib.Path(p).stem+'.jpg'))).as_uri()
        return cache[p]
    s = dict(s)
    if s.get('img'): s['img'] = one(s['img'])
    if s.get('imgs'): s['imgs'] = [one(x) for x in s['imgs']]
    if s.get('vinos'): s['vinos'] = [dict(v, img=one(v['img'])) for v in s['vinos']]
    return s

async def main(pack_path):
    pack_path = pathlib.Path(pack_path).resolve(); pdir = pack_path.parent
    pack = json.loads(pack_path.read_text()); out = pdir/'out'; out.mkdir(exist_ok=True)
    report, cache = {}, {}
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.popen('which google-chrome').read().strip() or None, args=['--allow-file-access-from-files'])
        for piece in pack['piezas']:
            fmt = piece['formato']; W, H = SIZES[fmt]
            ctx = await br.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
            pg = await ctx.new_page()
            for k, s in enumerate(piece['slides'], 1):
                s2 = fix_imgs(s, pdir, cache)
                if len(piece['slides']) > 1: s2.setdefault('pag', f"{k}/{len(piece['slides'])}")
                html = tpl.render(s=s2, B=B, W=W, H=H, story=(fmt == 'story'), aud=piece['audiencia'], wa=WA)
                f = out/f"{piece['id']}_{k}.html"; f.write_text(html)
                await pg.goto(f.as_uri()); fit = await pg.evaluate('window.__fit')
                jpg = out/f"{piece['id']}_{k}.jpg"
                await pg.screenshot(path=str(jpg), type='jpeg', quality=92, clip={'x': 0, 'y': 0, 'width': W, 'height': H})
                report[jpg.name] = dict(fit, w=W, h=H, formato=fmt)
                f.unlink()
            await ctx.close()
        await br.close()
    (pdir/'render_report.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
    for k, v in report.items(): print(k, 'zoom', v['shrink'], 'OVERFLOW' if v['overflow'] else '', 'broken' if v.get('broken') else '')

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1]))
