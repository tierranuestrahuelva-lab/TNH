# Gauntlet · Croquis del almacén

**Tarea.** Plano técnico interactivo de Nicheros, Almacén tienda y Nave con los vinos reales de Ubicaciones (Supabase), buscador, revisión de datos y propuesta de reorganización simulada.

**Método.** Construir → `tests/gauntlet.sh` (pruebas de uso `e2e.py` + `arbitro.py`) → corregir → repetir.
El árbitro no usa el código de la app: vuelve a leer `data.js` con su propio lector y compara hueco a hueco con lo que se dibuja; además ataca con datos basura y HTML metido en el buscador.

**Listón (todo tiene que salir OK).**
1. Los 535 artículos cargan; las 3 zonas se dibujan sin errores de JavaScript.
2. Los 291 huecos con vino aparecen, cada uno con exactamente sus vinos, y ninguno con vinos que no tocan.
3. Buscar por nombre, código, código de barras y hueco funciona; 25 vinos al azar iluminan todos sus huecos.
4. Revisar muestra los mismos códigos raros que el árbitro (4, 4LP, AD1A) y descarga CSV.
5. Propuesta de reorganización con 1, 2 y 3 vinos por hueco: color correcto por columna y nunca más del límite; CSV con los 262 vinos de nicheros.
6. Los datos originales no se modifican.
7. Enlaces directos `?loc=`, `?tab=`, `?zona=` funcionan; en móvil la página no se sale de pantalla.
8. Datos basura no rompen la app ni inventan huecos; el buscador no ejecuta HTML.

**Entregable.** https://tierranuestrahuelva-lab.github.io/TNH/croquis/ (carpeta `croquis/` de la rama gh-pages; fuente en la rama `croquis-src`).

Actualizar la foto de datos: `SUPABASE_ACCESS_TOKEN=… python3 scripts/build_data.py` (o botón «Actualizar» en la app con la contraseña del equipo).
