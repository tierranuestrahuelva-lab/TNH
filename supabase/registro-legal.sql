-- Registro de jornada con rastro completo: los fichajes no se borran (se anulan con motivo),
-- toda alta/corrección/anulación queda en hor_fichajes_hist, y se guarda la hora original.
alter table hor_fichajes
  add column if not exists ts_original timestamptz,
  add column if not exists anulado boolean not null default false,
  add column if not exists motivo_anulacion text,
  add column if not exists editado_por text,
  add column if not exists editado_at timestamptz,
  add column if not exists registrado_at timestamptz default now();
alter table hor_empleados add column if not exists privacidad_at timestamptz;

create table if not exists hor_fichajes_hist (
  hid bigserial primary key,
  fichaje_id text not null,
  accion text not null,
  antes jsonb,
  despues jsonb,
  cuando timestamptz not null default now()
);
create index if not exists hor_fichajes_hist_fichaje on hor_fichajes_hist(fichaje_id);
alter table hor_fichajes_hist enable row level security;
drop policy if exists hist_leer on hor_fichajes_hist;
create policy hist_leer on hor_fichajes_hist for select to authenticated using (true);
revoke insert, update, delete, truncate on hor_fichajes_hist from anon, authenticated;
revoke truncate on hor_fichajes from anon, authenticated;

create or replace function hor_fichajes_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los fichajes no se pueden borrar: se anulan indicando el motivo' using errcode = 'P0001';
  elsif tg_op = 'INSERT' then
    new.registrado_at := now();
    new.ts_original := null;
    if new.anulado then raise exception 'Un fichaje nuevo no puede estar anulado' using errcode = 'P0001'; end if;
    insert into hor_fichajes_hist (fichaje_id, accion, despues) values (new.id, 'alta', to_jsonb(new));
    return new;
  end if;
  new.id := old.id;
  new.empleado_id := old.empleado_id;
  new.registrado_at := old.registrado_at;
  new.ts_original := coalesce(old.ts_original, case when new.ts is distinct from old.ts then old.ts end);
  if old.anulado then
    new.anulado := true;
    new.motivo_anulacion := old.motivo_anulacion;
  end if;
  if row(new.*) is not distinct from row(old.*) then return new; end if;
  if new.ts is distinct from old.ts or new.tipo is distinct from old.tipo then new.editado := true; end if;
  new.editado_at := now();
  insert into hor_fichajes_hist (fichaje_id, accion, antes, despues)
  values (new.id, case when new.anulado and not old.anulado then 'anulacion' else 'correccion' end, to_jsonb(old), to_jsonb(new));
  return new;
end $$;

drop trigger if exists hor_fichajes_auditar on hor_fichajes;
create trigger hor_fichajes_auditar before insert or update or delete on hor_fichajes
  for each row execute function hor_fichajes_auditar();

create or replace function hor_empleados_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from hor_fichajes where empleado_id = old.id) then
    raise exception 'Este empleado tiene fichajes: dalo de baja en lugar de borrarlo' using errcode = 'P0001';
  end if;
  return old;
end $$;
drop trigger if exists hor_empleados_proteger on hor_empleados;
create trigger hor_empleados_proteger before delete on hor_empleados
  for each row execute function hor_empleados_proteger();

