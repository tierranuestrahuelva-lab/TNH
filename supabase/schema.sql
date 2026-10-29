-- Horarios Tierra Nuestra (tablas con prefijo hor_ en el proyecto compartido)
create table if not exists hor_empleados (
  id text primary key, nombre text not null, puesto text, color text,
  horas_semana numeric default 40, coste_hora numeric, pin text, telefono text, email text,
  centro text, vacaciones_anuales int default 30, activo boolean default true,
  orden int default 0, updated_at timestamptz default now()
);
create table if not exists hor_turnos (
  id text primary key, empleado_id text not null, fecha date not null,
  tipo text not null default 'trabajo', tramos jsonb not null default '[]'::jsonb,
  centro text, nota text, updated_at timestamptz default now()
);
create index if not exists hor_turnos_fecha on hor_turnos(fecha);
create table if not exists hor_fichajes (
  id text primary key, empleado_id text not null, ts timestamptz not null,
  tipo text not null, nota text, editado boolean default false, created_at timestamptz default now()
);
create index if not exists hor_fichajes_ts on hor_fichajes(ts);
create table if not exists hor_solicitudes (
  id text primary key, empleado_id text not null, tipo text not null,
  desde date, hasta date, motivo text, estado text default 'pendiente', respuesta text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists hor_config (clave text primary key, valor jsonb, updated_at timestamptz default now());

do $$
declare t text;
begin
  foreach t in array array['hor_empleados','hor_turnos','hor_fichajes','hor_solicitudes','hor_config'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists equipo_todo on %I', t);
    execute format('create policy equipo_todo on %I for all to authenticated using (true) with check (true)', t);
    execute format('alter table %I replica identity full', t);
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename=t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
