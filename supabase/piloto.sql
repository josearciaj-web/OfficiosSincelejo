-- OficiosSincelejo · Registro del piloto de validación (H1, H3 y H4 de la Tabla 6).
-- Correr una vez en el SQL Editor de Supabase, después de schema.sql y monetizacion.sql.
-- Solo el equipo (usuario autenticado) puede leer y escribir estos registros.

create table if not exists public.piloto (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  tipo        text not null check (tipo in ('convocatoria','precio','servicio')),
  nombre      text not null check (char_length(nombre) between 3 and 80),
  tecnico_id  uuid references public.tecnicos(id) on delete set null,
  acepta      boolean,
  precio      int check (precio is null or precio between 0 and 1000000),
  cantidad    int not null default 0 check (cantidad between 0 and 100),
  nota        text check (nota is null or char_length(nota) <= 200)
);

alter table public.piloto enable row level security;

drop policy if exists "admin gestiona piloto" on public.piloto;
create policy "admin gestiona piloto" on public.piloto
  for all to authenticated using (true) with check (true);

create index if not exists piloto_tipo_idx on public.piloto (tipo, created_at);
