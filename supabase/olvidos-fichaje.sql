-- Fichajes olvidados: el trabajador pide añadir un fichaje (tipo y hora); el encargado/a lo aprueba
alter table hor_solicitudes
  add column if not exists fichaje jsonb;
