-- Cambios de horario pedidos por el empleado: horario pedido y horario anterior (para el historial)
alter table hor_solicitudes
  add column if not exists tramos jsonb,
  add column if not exists turno_antes jsonb;
