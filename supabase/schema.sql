-- =====================================================================
-- OficiosSincelejo · Esquema de base de datos para Supabase
-- Cópialo completo en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- ---------- Tablas ----------
create table if not exists public.tecnicos (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  nombre         text not null check (char_length(nombre) between 5 and 80),
  whatsapp       text not null check (whatsapp ~ '^573[0-9]{9}$'),
  oficio         text not null check (oficio in ('plomeria','electricidad','aire','pintura','carpinteria','cerrajeria','refrigeracion','construccion')),
  barrios        text[] not null default '{}' check (cardinality(barrios) between 1 and 20),
  anios          int not null default 0 check (anios between 0 and 60),
  tarifa         int not null default 0 check (tarifa between 0 and 2000000),
  descripcion    text not null default '' check (char_length(descripcion) <= 300),
  fotos          text[] not null default '{}' check (cardinality(fotos) <= 6),
  consentimiento boolean not null default false,
  estado         text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  verificado     boolean not null default false
);

create table if not exists public.resenas (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  tecnico_id  uuid not null references public.tecnicos(id) on delete cascade,
  autor       text not null check (char_length(autor) between 2 and 60),
  estrellas   int not null check (estrellas between 1 and 5),
  texto       text not null default '' check (char_length(texto) <= 400),
  estado      text not null default 'publicada' check (estado in ('publicada','oculta'))
);

-- Cada clic al botón de WhatsApp (métrica H2 del MVP)
create table if not exists public.contactos (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  tecnico_id  uuid not null references public.tecnicos(id) on delete cascade,
  barrio      text check (barrio is null or char_length(barrio) <= 40)
);

create index if not exists tecnicos_estado_idx on public.tecnicos (estado);
create index if not exists resenas_tecnico_idx on public.resenas (tecnico_id);
create index if not exists contactos_tecnico_idx on public.contactos (tecnico_id, created_at);

-- ---------- Seguridad por filas (RLS) ----------
-- Visitante (anon): ve técnicos aprobados y reseñas publicadas; puede registrarse,
-- dejar reseñas y registrar contactos. Administrador (usuario con sesión): todo.
alter table public.tecnicos  enable row level security;
alter table public.resenas   enable row level security;
alter table public.contactos enable row level security;

drop policy if exists "ver tecnicos aprobados" on public.tecnicos;
create policy "ver tecnicos aprobados" on public.tecnicos
  for select to anon, authenticated using (estado = 'aprobado' or auth.role() = 'authenticated');

drop policy if exists "registrar tecnico" on public.tecnicos;
create policy "registrar tecnico" on public.tecnicos
  for insert to anon, authenticated
  with check (estado = 'pendiente' and verificado = false and consentimiento = true);

drop policy if exists "admin edita tecnicos" on public.tecnicos;
create policy "admin edita tecnicos" on public.tecnicos
  for update to authenticated using (true) with check (true);

drop policy if exists "admin borra tecnicos" on public.tecnicos;
create policy "admin borra tecnicos" on public.tecnicos
  for delete to authenticated using (true);

drop policy if exists "ver resenas publicadas" on public.resenas;
create policy "ver resenas publicadas" on public.resenas
  for select to anon, authenticated using (estado = 'publicada' or auth.role() = 'authenticated');

drop policy if exists "crear resena" on public.resenas;
create policy "crear resena" on public.resenas
  for insert to anon, authenticated
  with check (estado = 'publicada'
    and exists (select 1 from public.tecnicos t where t.id = tecnico_id and t.estado = 'aprobado'));

drop policy if exists "admin modera resenas" on public.resenas;
create policy "admin modera resenas" on public.resenas
  for update to authenticated using (true) with check (true);

drop policy if exists "registrar contacto" on public.contactos;
create policy "registrar contacto" on public.contactos
  for insert to anon, authenticated
  with check (exists (select 1 from public.tecnicos t where t.id = tecnico_id and t.estado = 'aprobado'));

drop policy if exists "admin ve contactos" on public.contactos;
create policy "admin ve contactos" on public.contactos
  for select to authenticated using (true);

-- ---------- Fotos (Storage) ----------
-- Bucket público de solo imágenes, máximo 5 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "subir fotos de tecnicos" on storage.objects;
create policy "subir fotos de tecnicos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'tecnicos');

drop policy if exists "ver fotos" on storage.objects;
create policy "ver fotos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'fotos');

drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

-- =====================================================================
-- Monetización (plan destacado, publicidad y pagos)
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
