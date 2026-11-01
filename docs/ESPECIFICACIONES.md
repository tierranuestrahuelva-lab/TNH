# TPV Tierra Nuestra · Especificaciones (Gauntlet)

Cada requisito tiene un código. Las pruebas lo llevan en su nombre (`[VEN-04] …`) y `python3 scripts/gauntlet.py` genera `gauntlet/informe.html` diciendo cuáles pasan.

**Listón para publicar:** el 100 % de las pruebas pasan (recorrido completo + árbitro), cada requisito tiene al menos una prueba, ninguna pantalla se sale por los lados a 390, 800 ni 1366 px y no hay errores de JavaScript.

## Venta
- **VEN-01** La pantalla de venta muestra el catálogo («Más vendidos» al empezar).
- **VEN-02** El lector de códigos de barras añade el artículo; escanear otra vez suma unidades, aunque el cursor no esté en el buscador.
- **VEN-03** Artículo libre con descripción, precio, unidades y tipo de IVA elegido (21, 10, 4 o 0 %).
- **VEN-04** En todo ticket (también devoluciones): suma de líneas = base + IVA = total, al céntimo.
- **VEN-05** No se puede cobrar una venta con unidades negativas (eso solo es posible en una devolución).
- **VEN-06** Aparcar un ticket deja la caja libre; recuperarlo lo devuelve tal cual.
- **VEN-07** Descuentos por línea y en todo el ticket.

## Cobro
- **COB-01** Efectivo: se calcula bien el cambio y lo cobrado = total.
- **COB-02** Cobro con tarjeta.
- **COB-03** Con tarjeta o Bizum no se puede cobrar más del pendiente.
- **COB-04** Pago mixto (por ejemplo, 10 € en efectivo y el resto por Bizum).
- **COB-05** El cambio queda a la vista sin bloquear la siguiente venta.
- **COB-06** Los importes se entienden escritos a la española: «1.250» son mil doscientos cincuenta euros, «8,90» y «8.90» son 8,90 €.

## Tickets
- **TCK-01** Numeración correlativa por serie y año, sin huecos ni repetidos (T26-000001…).
- **TCK-02** El ticket se imprime en papel de 80 y 58 mm sin salirse.
- **TCK-03** Los tickets siguen ahí después de recargar la página.
- **TCK-04** Nombres con símbolos (`<`, `&`, comillas) no rompen el ticket.

## Devoluciones
- **DEV-01** Una devolución es una factura rectificativa (serie D), con importe negativo y referencia al ticket original.
- **DEV-02** No se pueden devolver más unidades de las vendidas, contando las ya devueltas.
- **DEV-03** Devolviendo por partes nunca se devuelve ni un céntimo más (ni menos) de lo que se cobró.

## Caja
- **CAJ-01** Esperado en el cajón = fondo + efectivo cobrado + entradas − salidas.
- **CAJ-02** El cierre Z guarda lo contado, la diferencia y el número de tickets.
- **CAJ-03** Tras el cierre Z la caja queda cerrada.

## Sage 50 / gestoría
- **SAG-01** Excel de ventas con 5 hojas y todos los tickets del periodo.
- **SAG-02** CSV de stock (cp1252, «;») con las unidades vendidas en negativo, menos las devueltas; no se repite si ya se exportó.
- **SAG-03** El asiento cuadra (debe = haber = total), también en un día con solo devoluciones.

## Pantallas
- **UI-01** Ninguna pantalla se sale por los lados en móvil (390 px), tablet (800 px) ni ordenador (1366 px).
- **UI-02** Sin errores de JavaScript.
