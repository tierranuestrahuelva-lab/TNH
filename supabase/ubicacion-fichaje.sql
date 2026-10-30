-- Ubicación guardada solo en el momento de fichar (puestos configurados en la app).
alter table hor_fichajes
  add column if not exists lat double precision,
  add column if not exists lon double precision,
  add column if not exists precision_m integer,
  add column if not exists lugar text,
  add column if not exists distancia_m integer,
  add column if not exists fuera_zona boolean,
  add column if not exists geo_error text;

create or replace function hor_fichajes_geo_fija() returns trigger language plpgsql as $$
begin
  if (new.lat, new.lon, new.precision_m, new.lugar, new.distancia_m, new.fuera_zona, new.geo_error)
     is distinct from (old.lat, old.lon, old.precision_m, old.lugar, old.distancia_m, old.fuera_zona, old.geo_error) then
    raise exception 'La ubicación de un fichaje no se puede modificar';
  end if;
  return new;
end $$;

drop trigger if exists hor_fichajes_geo_fija on hor_fichajes;
create trigger hor_fichajes_geo_fija before update on hor_fichajes for each row execute function hor_fichajes_geo_fija();
