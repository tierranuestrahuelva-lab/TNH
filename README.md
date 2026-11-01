# Web vinos (/TNH/vinos/)

El código fuente React original no está en el repo; la web publicada se modifica con `tools/patch.py` sobre el build de gh-pages/vinos.

- `python3 tools/patch.py <carpeta_vinos>`: pedidos por WhatsApp o email + contactos (aplicar sobre el build ANTERIOR al parche).
- `python3 tests/pedidos.py <url>`: pruebas (cesta, WhatsApp, email, árbitro de símbolos, contactos, móvil 390px y escritorio 1366px, sin errores JS).
