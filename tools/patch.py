"""Parche sobre el build publicado de /vinos/: pedidos por WhatsApp o email + directorio de contacto."""
import glob, sys
B = sys.argv[1] if len(sys.argv) > 1 else 'vinos'
idx = glob.glob(f'{B}/assets/index-*.js')[0]; edi = glob.glob(f'{B}/assets/Editorial-*.js')[0]
def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:80]); return s.replace(a, b)
s = open(idx, encoding='utf-8').read()
CONT = [('Tienda', [('tel:+34959541579', '959 541 579'), ('mailto:tnh@tierranuestrahuelva.es', 'tnh@tierranuestrahuelva.es')]),
        ('WhatsApp y pedidos tienda', [('https://wa.me/34699414559', '+34 699 414 559'), ('mailto:tnh@tierranuestrahuelva.es?subject=Pedido', 'Pedidos por email: tnh@tierranuestrahuelva.es')]),
        ('Oficinas', [('tel:+34959541578', '959 541 578'), ('mailto:enrique@tierranuestrahuelva.es', 'enrique@tierranuestrahuelva.es')]),
        ('Dirección', [('tel:+34616769861', '616 769 861'), ('mailto:maribel@tierranuestrahuelva.es', 'maribel@tierranuestrahuelva.es')])]
# 1. checkout: WhatsApp o email
s = rep(s, "window.location.href=`https://wa.me/34699414559?text=${encodeURIComponent(c)}`},_=g[0]",
        "e.nativeEvent?.submitter?.value===`email`?window.location.href=`mailto:tnh@tierranuestrahuelva.es?subject=${encodeURIComponent(`Pedido web · ${p.name}`)}&body=${encodeURIComponent(c.replace(`Te confirmo el pedido por WhatsApp.`,`Quedo a la espera de vuestra confirmación.`))}`:window.location.href=`https://wa.me/34699414559?text=${encodeURIComponent(c)}`},_=g[0]")
s = rep(s, "type:`submit`,className:`btn-primary w-full`,children:[`Continuar por WhatsApp · `,ee(s)]})",
        "type:`submit`,value:`whatsapp`,className:`btn-primary w-full`,children:[`Enviar pedido por WhatsApp · `,ee(s)]}),(0,C.jsx)(`button`,{type:`submit`,value:`email`,className:`btn-ghost w-full`,children:`Enviar pedido por email`}),(0,C.jsx)(`p`,{className:`text-center text-[11px] text-ink-500`,children:`WhatsApp pedidos: 699 414 559 · Email: tnh@tierranuestrahuelva.es`})")
s = rep(s, "forma de pago (efectivo, tarjeta o Bizum) por WhatsApp.`", "forma de pago (efectivo, tarjeta o Bizum) por WhatsApp o por email.`")
# 2. pie de página
a = s.index("(0,C.jsx)(`p`,{children:(0,C.jsx)(`a`,{href:`tel:959541579`,className:`hover:text-white`")
b = s.index("(0,C.jsx)(`p`,{children:(0,C.jsx)(`a`,{href:`https://www.instagram.com/tierranuestra.es/`")
lk = lambda h, t, cl: f"(0,C.jsx)(`a`,{{href:`{h}`,className:`{cl}`,children:`{t}`}})"
pie = ",".join(f"(0,C.jsxs)(`p`,{{className:`leading-snug`,children:[(0,C.jsx)(`span`,{{className:`block text-[11px] uppercase tracking-[.14em] text-white/55`,children:`{t}`}}),{','.join(lk(h, x, 'block hover:text-white') for h, x in ls)}]}})" for t, ls in CONT) + ","
s = s[:a] + pie + s[b:]
# 3. página de contacto
a = s.index("(0,C.jsxs)(`dl`,{className:`mt-10 space-y-6 text-sm`")
b = s.index(",(0,C.jsx)(`form`,{onSubmit:t=>{t.preventDefault();let n=`Nombre:")
dd = lambda ls: ",".join(lk(h, x, 'block text-ink-800 hover:text-wine-700') for h, x in ls)
grupos = [("Dirección de la tienda", None)] + CONT
items = ["(0,C.jsxs)(`div`,{children:[(0,C.jsx)(`dt`,{className:`eyebrow`,children:`Tienda`}),(0,C.jsx)(`dd`,{className:`mt-1 text-ink-800`,children:`C/ Fernando el Católico, 34 · 21003 Huelva`})]})"]
items += [f"(0,C.jsxs)(`div`,{{children:[(0,C.jsx)(`dt`,{{className:`eyebrow`,children:`{t}`}}),(0,C.jsxs)(`dd`,{{className:`mt-1 space-y-0.5`,children:[{dd(ls)}]}})]}})" for t, ls in CONT]
items[1] = items[1].replace("children:`Tienda`", "children:`Teléfono y email de la tienda`")
s = s[:a] + "(0,C.jsxs)(`dl`,{className:`mt-10 grid gap-6 text-sm sm:grid-cols-2`,children:[" + ",".join(items) + "]})]})" + s[b:]
open(idx, 'w', encoding='utf-8').write(s)
e = open(edi, encoding='utf-8').read()
e = rep(e, "La compra se confirma con el equipo por WhatsApp.`", "La compra se confirma con el equipo por WhatsApp (+34 699 414 559) o por email (tnh@tierranuestrahuelva.es).`")
e = rep(e, "según se confirme por WhatsApp.", "según se confirme por WhatsApp o por email.")
e = rep(e, "`Teléfono: 959 541 579 · Email: tnh@tierranuestrahuelva.es.`", "`Tienda: 959 541 579 · tnh@tierranuestrahuelva.es · WhatsApp y pedidos: 699 414 559. Oficinas: 959 541 578 · enrique@tierranuestrahuelva.es. Dirección: 616 769 861 · maribel@tierranuestrahuelva.es.`")
open(edi, 'w', encoding='utf-8').write(e)
print('parche aplicado')
s = open(idx, encoding='utf-8').read()
s = rep(s, "Al continuar se abrirá WhatsApp con el resumen.", "Al continuar se abrirá WhatsApp o tu correo con el resumen.")
open(idx, 'w', encoding='utf-8').write(s)
# nombres nuevos para que los navegadores no usen la versión vieja guardada
import os, re
for old in (idx, edi):
    new = old.replace('.js', 'p.js')
    os.rename(old, new); o, n = os.path.basename(old), os.path.basename(new)
    for f in glob.glob(f'{B}/assets/*.js') + [f'{B}/index.html']:
        t = open(f, encoding='utf-8').read()
        if o in t: open(f, 'w', encoding='utf-8').write(t.replace(o, n))
print('renombrado')
