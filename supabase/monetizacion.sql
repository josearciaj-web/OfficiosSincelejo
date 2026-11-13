-- =====================================================================
-- OficiosSincelejo · Actualización: monetización
-- Plan destacado para técnicos, publicidad de ferreterías y registro de pagos.
-- Cópialo completo en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- ---------- Plan destacado ----------
-- Fecha hasta la que el técnico aparece de primero con la etiqueta "Destacado".
alter table public.tecnicos add column if not exists destacado_hasta date;

-- Un técnico nuevo no puede registrarse ya destacado.
drop policy if exists "registrar tecnico" on public.tecnicos;
create policy "registrar tecnico" on public.tecnicos
  for insert to anon, authenticated
  with check (estado = 'pendiente' and verificado = false and consentimiento = true and destacado_hasta is null);

-- ---------- Publicidad de ferreterías y distribuidores ----------
create table if not exists public.anuncios (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  negocio     text not null check (char_length(negocio) between 2 and 80),
  mensaje     text not null default '' check (char_length(mensaje) <= 160),
  whatsapp    text check (whatsapp is null or whatsapp ~ '^57[0-9]{10}$'),
  imagen      text check (imagen is null or imagen ~ '^https://'),
  activo      boolean not null default true,
  hasta       date not null
);
alter table public.anuncios enable row level security;

drop policy if exists "ver anuncios vigentes" on public.anuncios;
create policy "ver anuncios vigentes" on public.anuncios
  for select to anon, authenticated
  using ((activo and hasta >= current_date) or auth.role() = 'authenticated');

drop policy if exists "admin gestiona anuncios" on public.anuncios;
create policy "admin gestiona anuncios" on public.anuncios
  for all to authenticated using (true) with check (true);

-- ---------- Registro de pagos (ingresos) ----------
create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  tipo        text not null check (tipo in ('destacado','publicidad')),
  referencia  uuid,
  concepto    text not null check (char_length(concepto) <= 160),
  valor       int not null check (valor between 0 and 10000000),
  medio       text not null check (medio in ('Nequi','Daviplata','Transferencia','Efectivo')),
  meses       int not null default 1 check (meses between 1 and 12)
);
alter table public.pagos enable row level security;

drop policy if exists "admin gestiona pagos" on public.pagos;
create policy "admin gestiona pagos" on public.pagos
  for all to authenticated using (true) with check (true);

create index if not exists pagos_fecha_idx on public.pagos (created_at);

-- ---------- Imágenes de los anuncios ----------
drop policy if exists "admin sube imagenes de anuncios" on storage.objects;
create policy "admin sube imagenes de anuncios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'anuncios');
