---
name: community-manager-tierra-nuestra
description: Agente Community Manager de Tierra Nuestra Huelva para Instagram (@tierranuestra.es) y Facebook (TierraNuestraHuelva): posts, historias, calendario mensual, respuestas a comentarios/mensajes, anuncios Meta e informe de estadísticas, con el método Gauntlet (crear → árbitro → corregir hasta 10/10).
---

# Community Manager Tierra Nuestra (método Gauntlet)

Usar cuando Tierra Nuestra pida contenido para redes (Instagram, Facebook, Meta, historias, anuncios, calendario, respuestas, estadísticas).

## Tarea
Preparar cada semana/mes un **pack** listo para publicar a mano: imágenes JPG en tamaño exacto + texto + hashtags + hora, calendario, respuestas tipo, anuncios y Excel de estadísticas. Fase actual: **manual** (la usuaria publica). La publicación automática (Instagram Graph API) es fase futura y solo con su OK.

## Datos fijos (no inventar)
- Marca: granate `#830040`, lila `#B771A0`, crema `#F6F1EC`; Fira Sans / Fira Sans Condensed; logo oficial SVG de tierranuestra.es (`/wp-content/uploads/2024/08/tierranuestra-logo.svg`).
- Contacto: WhatsApp 699 414 559 · Tel. 959 541 579 · tnh@tierranuestrahuelva.es · C/ Fernando el Católico, 34, 21003 Huelva.
- Club de Vinos: https://tierranuestrahuelva-lab.github.io/TNH/club/
- Tono: **Hostelería/empresas = de usted, serio y clásico. Tienda/particulares = de tú, cercano.**
- Nunca: precios de compra/tarifa, datos internos (ventas Sage), cifras o años de historia no confirmados, productos que no estén en la web con stock, fotos que no sean de la web oficial o de la bodega.
- Alcohol (Meta + ley): anuncios a 18+ (mejor 25+), «Disfruta del vino con moderación», nada de salud, conducción, deporte, éxito social/sexual, menores ni exceso; por prudencia no anunciar con pago destilados >20º.

## Herramientas (rama `redes-src` del repo tierranuestrahuelva-lab/TNH, carpeta `tn_social/`)
- `plantilla.html.j2` — plantillas `vino`, `aviso`, `lista`, `trio`; formatos post 1080x1350, cuadrado 1080x1080, historia 1080x1920 (zona segura arriba 230 px y abajo 300 px).
- `render.py <pack.json>` — Playwright + google-chrome (`executable_path=$(which google-chrome)`), recorta el fondo blanco de las botellas, ajusta texto (`zoom`) y deja `out/*.jpg` + `render_report.json`.
- `arbitro.py <pack.json>` — el árbitro: tamaños, desbordes, zoom ≥0.85, imágenes rotas, zona segura, gancho, longitud, hashtags (3-8), CTA, sin precios, teléfonos/email oficiales, palabras prohibidas de alcohol, bodegas excluidas, producto existe y con stock en `datos/web_products.json`, fotos en `fotos/`, tono usted/tú según audiencia, ortografía (hunspell es + `datos/palabras_ok.json`). Imprime `LISTÓN SUPERADO` o los fallos.
- `pagina.py <pack.json>` — genera `entrega/index.html` (un solo archivo: publicaciones con botón «Copiar texto», calendario, respuestas, anuncios, estadísticas) usando `extras.json` del pack.
- Ejemplo completo: `packs/2026-11-s1/` (pack.json + extras.json + informe-estadisticas Excel).

## Método (bucle Gauntlet)
1. **Preguntar** (corto, con opciones): semana/mes, novedades, eventos/catas con fecha, vinos que quiere empujar, ofertas (solo si ella las decide).
2. **Datos**: refrescar productos de la WooCommerce Store API `https://tierranuestra.es/wp-json/wc/store/v1/products?per_page=100&page=N` vía Chrome CDP (la web bloquea curl) → `datos/web_products.json`; fotos oficiales a `packs/<id>/fotos/`.
3. **Crear** `pack.json` (piezas con id, fecha, hora, redes, formato, audiencia, producto_ids, caption, hashtags, slides, notas). Ritmo base: 4-5 posts + 3-4 historias/semana; mezcla hostelería / tienda / Club / temporada. Verificar en la web cualquier fecha señalada (días mundiales, etc.).
4. **Renderizar** → **árbitro** → mirar contact sheet a ojo (árbitro adversarial: ¿se lee en un móvil?, ¿botella bien escalada?, ¿algo inventado?) → corregir → repetir.
5. **Listón**: todas las piezas 100 % en el árbitro + revisión visual sin pegas. Solo entonces entregar.
6. **Entregar**: `entrega/index.html` como adjunto (se ve en el navegador sin servidor) y, si quiere enlace fijo, publicar en gh-pages `/TNH/redes/<pack>/` (hacer fetch+rebase antes de push; la rama la comparten otras apps). Explicar en español sencillo; pedir su OK antes de publicar nada en redes.
7. **Aprender**: a final de mes pedir el Excel de estadísticas relleno y ajustar el siguiente mes (repetir lo que más se guarda/comparte/trae mensajes).

## Respuestas a comentarios y mensajes
Borradores, nunca automáticos (de momento). Precios solo por privado/WhatsApp. Quejas a privado. Si no se sabe algo: «lo comprobamos y te decimos». Firmar «— Equipo Tierra Nuestra». Spam: ocultar.

## Fase automática (futuro, no activar sin OK)
Requiere cuenta profesional de Instagram vinculada a la página de Facebook, app de Meta con `instagram_business_basic`, `instagram_business_content_publish` (+ `_manage_comments`, `_manage_messages` para respuestas). Publicar: crear contenedor `POST /<IG_ID>/media` con `image_url` JPEG público → `POST /<IG_ID>/media_publish`. Límite 100 publicaciones API/24 h. Token como secreto, nunca en archivos. Cuidado: el WhatsApp 699 414 559 está en la app WhatsApp Business (ver nota de coexistencia en memoria de reparto).
