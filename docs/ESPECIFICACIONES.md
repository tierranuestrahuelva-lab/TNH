# Horarios Tierra Nuestra · Especificaciones

Cada requisito tiene un código. Las pruebas automáticas llevan ese código en su nombre
(`[FIC-01] …`), y el informe del gauntlet (`npm run gauntlet`) dice cuáles pasan.

**Listón para publicar:** compila sin errores, el 100 % de las pruebas pasan (unitarias,
de pantalla en móvil y en ordenador, y las del árbitro) y ninguna pantalla se sale por los
lados en un móvil.

## ACC · Acceso
- **ACC-01** La pantalla «¿Quién eres?» muestra solo al personal activo (las bajas no salen).
- **ACC-02** Con un PIN equivocado sale «PIN incorrecto» y no se entra.
- **ACC-03** Con el PIN correcto, el empleado entra directo a «Fichar» y el encargado a «Hoy».
- **ACC-04** Cambiar el PIN exige el PIN actual y un PIN nuevo de 4 a 6 cifras repetido dos veces.

## FIC · Fichar (empleado)
- **FIC-01** Secuencia completa: entrada → pausa → vuelta de pausa → salida. El estado cambia a
  «Estás trabajando», «Estás en pausa», «Jornada terminada».
- **FIC-02** Cada fichaje pide confirmación; «Cancelar» no registra nada.
- **FIC-03** Los fichajes de hoy salen en una línea de tiempo con su hora.
- **FIC-04** Las horas trabajadas de un día salen de los fichajes: se descuentan las pausas;
  si el día sigue abierto, cuenta hasta ahora.
- **FIC-05** Si un día pasado quedó sin fichar la salida, sus horas se cuentan solo hasta el
  final de ese día (nunca siguen sumando en días posteriores) y se marca «falta salida».
- **FIC-06** El total de la semana en «Fichar» es la suma de los días calculados según FIC-04/05.

## REG · Registro de jornada (art. 34.9 ET)
- **REG-01** El encargado no puede corregir, añadir ni anular un fichaje sin escribir el motivo.
- **REG-02** Al corregir una hora se guarda la hora original, quién y cuándo lo cambió.
- **REG-03** Los fichajes no se borran: se anulan con motivo y siguen visibles tachados.
- **REG-04** Las horas anuladas no cuentan como trabajadas.
- **REG-05** El empleado ve su propio registro («Mi registro») pero no puede corregirlo.
- **REG-06** El Excel del registro lleva cabecera con empresa y CIF, se abre bien en Excel
  español (separador `;`, acentos correctos) y no se rompe con comas, comillas o saltos de línea.

## CUA · Cuadrante y avisos legales
- **CUA-01** Un turno que pasa de medianoche (22:00–02:00) cuenta 4 h, no negativo.
- **CUA-02** Aviso de error si un día supera el máximo de horas (por defecto 9 h).
- **CUA-03** Aviso de error si entre dos jornadas hay menos de 12 h de descanso.
- **CUA-04** Aviso de error si alguien no tiene ningún día libre en la semana.
- **CUA-05** Aviso si alguien supera las horas de su contrato y si trabaja en festivo.
- **CUA-06** Aviso informativo de pausa de 15 min si un tramo seguido pasa de 6 h.
- **CUA-07** «Tienda sin cubrir»: detecta los huecos del horario de apertura sin nadie asignado.
- **CUA-08** El calendario de turnos se exporta al móvil (.ics) con hora de fin posterior a la de
  inicio, también en turnos que pasan de medianoche.

## SAB · Sábados alternos
- **SAB-01** La rueda reparte los sábados por turnos entre las personas elegidas, en orden, y
  vuelve a empezar al terminar la lista.
- **SAB-02** Con 2 personas por sábado no se repite nadie el mismo sábado.
- **SAB-03** Compensación: «tarde libre» quita los tramos de tarde, «mañana libre» los de
  mañana, «día entero» deja el día libre y «no se compensa» no toca nada.

## AUS · Ausencias y solicitudes
- **AUS-01** El empleado envía una solicitud y queda «pendiente».
- **AUS-02** Al aprobar vacaciones/permiso/baja se marca cada día natural en el cuadrante.

## GEO · Ubicación al fichar
- **GEO-01** Solo se pide ubicación a los puestos configurados (por defecto Repartidor/a y Comercial).
- **GEO-02** Dentro del radio del sitio de trabajo → «En Almacén».
- **GEO-03** Repartidor/a fuera del radio al fichar la entrada → «Fuera de zona». Un comercial nunca sale «fuera de zona».
- **GEO-04** Si el móvil deniega o no da la ubicación, el fichaje se guarda igualmente con el
  motivo («sin ubicación»); nunca se bloquea fichar.
- **GEO-05** Las pausas no marcan «fuera de zona».
- **GEO-06** El repartidor puede fichar la salida donde termine (último reparto, casa o tienda): se guarda la ubicación, sin «fuera de zona».
- **GEO-07** En los puestos con «Avisar salida tarde», una salida fichada más de `margen_salida` minutos (15 por defecto) después del fin del turno sale en «Fichajes a revisar».
- **GEO-08** Los puestos con «Horario libre» (Comercial por defecto) no generan avisos de retraso ni de «sin fichar».

## DAT · Datos
- **DAT-01** Todo lo que la app escribe en la base de datos son columnas que existen (si no,
  la cola de guardado se atasca).
- **DAT-02** Las pruebas nunca tocan la nube: corren en «Solo en este dispositivo».

## FEC · Fechas
- **FEC-01** Sumar días funciona en los cambios de hora (marzo y octubre).
- **FEC-02** La semana empieza en lunes; el domingo pertenece a la semana anterior.
- **FEC-03** Meses de 28/29/30/31 días y número de semana ISO correctos.

## UI · Móvil
- **UI-01** Ninguna pantalla (encargado y empleado) tiene desplazamiento horizontal en un móvil de 390 px.
- **UI-02** Ninguna pantalla muestra errores de JavaScript al abrirse.
