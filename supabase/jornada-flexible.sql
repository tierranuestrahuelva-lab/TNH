-- Jornada flexible (comerciales): horas del día sin hora fija de entrada/salida
alter table hor_turnos
  add column if not exists horas numeric;
