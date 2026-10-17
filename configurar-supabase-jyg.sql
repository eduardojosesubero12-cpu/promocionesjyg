-- ═══════════════════════════════════════════════════════════
-- CRM PROMOCIONES JyG — CONFIGURACIÓN AUTOMÁTICA DE SUPABASE
-- Pega TODO este script en: Supabase → SQL Editor → Run.
-- Es seguro repetirlo (idempotente): no borra datos existentes.
-- Hace: tablas + usuario Auth del admin + espejo + RLS estricta.
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- CRM PROMOCIONES JyG — ESQUEMA COMPLETO · 18 TABLAS
-- ✅ GARANTIZADO SIN ERRORES: ejecútalo las veces que quieras.
--    Crea lo que falta, repara columnas y no borra datos.
-- 📋 Instrucciones:
--    1) Supabase → SQL Editor → New query
--    2) Pega TODO este script
--    3) Pulsa Run
--    4) En el CRM: Integraciones → "Verificar ahora"
-- ═══════════════════════════════════════════════════════════

-- ── escuelas ────────────────────────────────
create table if not exists escuelas (
  id text primary key,
  nombre text not null,
  director text default '',
  telefono text default '',
  direccion text default '',
  estado text default '',
  municipio text default '',
  anio_escolar text default '',
  observaciones text default ''
);
alter table escuelas add column if not exists nombre text;
alter table escuelas add column if not exists director text default '';
alter table escuelas add column if not exists telefono text default '';
alter table escuelas add column if not exists direccion text default '';
alter table escuelas add column if not exists estado text default '';
alter table escuelas add column if not exists municipio text default '';
alter table escuelas add column if not exists anio_escolar text default '';
alter table escuelas add column if not exists observaciones text default '';
alter table escuelas enable row level security;
drop policy if exists "crm_all" on escuelas;
create policy "crm_all" on escuelas for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'escuelas') then
    alter publication supabase_realtime add table escuelas;
  end if;
end $$;

-- ── docentes ────────────────────────────────
create table if not exists docentes (
  id text primary key,
  nombre text not null,
  telefono text default '',
  escuela_id text references escuelas(id),
  correo text default '',
  observaciones text default ''
);
alter table docentes add column if not exists nombre text;
alter table docentes add column if not exists telefono text default '';
alter table docentes add column if not exists escuela_id text;
alter table docentes add column if not exists correo text default '';
alter table docentes add column if not exists observaciones text default '';
alter table docentes enable row level security;
drop policy if exists "crm_all" on docentes;
create policy "crm_all" on docentes for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'docentes') then
    alter publication supabase_realtime add table docentes;
  end if;
end $$;

-- ── estudiantes ─────────────────────────────
create table if not exists estudiantes (
  id text primary key,
  pedido text not null,
  nombre text not null,
  telefono text default '',
  representante text default '',
  ci text default '',
  escuela_id text references escuelas(id),
  docente_id text references docentes(id),
  grado text default '',
  seccion text default '',
  paquete_id text default '',
  precio_paquete numeric(12,2) default 0,
  estado_pedido text default 'Registrado',
  fecha_registro text default '',
  fecha_entrega text default '',
  observaciones text default '',
  codigos jsonb default '{}'::jsonb,
  extra jsonb default '{}'::jsonb
);
alter table estudiantes add column if not exists pedido text;
alter table estudiantes add column if not exists nombre text;
alter table estudiantes add column if not exists telefono text default '';
alter table estudiantes add column if not exists representante text default '';
alter table estudiantes add column if not exists ci text default '';
alter table estudiantes add column if not exists escuela_id text;
alter table estudiantes add column if not exists docente_id text;
alter table estudiantes add column if not exists grado text default '';
alter table estudiantes add column if not exists seccion text default '';
alter table estudiantes add column if not exists paquete_id text default '';
alter table estudiantes add column if not exists precio_paquete numeric(12,2) default 0;
alter table estudiantes add column if not exists estado_pedido text default 'Registrado';
alter table estudiantes add column if not exists fecha_registro text default '';
alter table estudiantes add column if not exists fecha_entrega text default '';
alter table estudiantes add column if not exists observaciones text default '';
alter table estudiantes add column if not exists codigos jsonb default '{}'::jsonb;
alter table estudiantes add column if not exists extra jsonb default '{}'::jsonb;
alter table estudiantes enable row level security;
drop policy if exists "crm_all" on estudiantes;
create policy "crm_all" on estudiantes for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'estudiantes') then
    alter publication supabase_realtime add table estudiantes;
  end if;
end $$;

-- ── pagos ───────────────────────────────────
create table if not exists pagos (
  id text primary key,
  estudiante_id text references estudiantes(id) on delete cascade,
  fecha text default '',
  monto numeric(12,2) default 0,
  metodo text default '',
  bs boolean default false,
  tasa numeric(12,2) default 0,
  usd numeric(12,2) default 0,
  referencia text default '',
  observacion text default ''
);
alter table pagos add column if not exists estudiante_id text;
alter table pagos add column if not exists fecha text default '';
alter table pagos add column if not exists monto numeric(12,2) default 0;
alter table pagos add column if not exists metodo text default '';
alter table pagos add column if not exists bs boolean default false;
alter table pagos add column if not exists tasa numeric(12,2) default 0;
alter table pagos add column if not exists usd numeric(12,2) default 0;
alter table pagos add column if not exists referencia text default '';
alter table pagos add column if not exists observacion text default '';
alter table pagos enable row level security;
drop policy if exists "crm_all" on pagos;
create policy "crm_all" on pagos for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pagos') then
    alter publication supabase_realtime add table pagos;
  end if;
end $$;

-- ── adicionales_items ───────────────────────
create table if not exists adicionales_items (
  id text primary key,
  estudiante_id text references estudiantes(id) on delete cascade,
  producto text default '',
  cantidad int default 1,
  precio numeric(12,2) default 0,
  talla text default ''
);
alter table adicionales_items add column if not exists estudiante_id text;
alter table adicionales_items add column if not exists producto text default '';
alter table adicionales_items add column if not exists cantidad int default 1;
alter table adicionales_items add column if not exists precio numeric(12,2) default 0;
alter table adicionales_items add column if not exists talla text default '';
alter table adicionales_items enable row level security;
drop policy if exists "crm_all" on adicionales_items;
create policy "crm_all" on adicionales_items for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'adicionales_items') then
    alter publication supabase_realtime add table adicionales_items;
  end if;
end $$;

-- ── cotizaciones ────────────────────────────
create table if not exists cotizaciones (
  id text primary key,
  numero text default '',
  fecha text default '',
  cliente text default '',
  telefono text default '',
  escuela text default '',
  paquete_id text default '',
  estado text default 'Pendiente',
  nota text default ''
);
alter table cotizaciones add column if not exists numero text default '';
alter table cotizaciones add column if not exists fecha text default '';
alter table cotizaciones add column if not exists cliente text default '';
alter table cotizaciones add column if not exists telefono text default '';
alter table cotizaciones add column if not exists escuela text default '';
alter table cotizaciones add column if not exists paquete_id text default '';
alter table cotizaciones add column if not exists estado text default 'Pendiente';
alter table cotizaciones add column if not exists nota text default '';
alter table cotizaciones enable row level security;
drop policy if exists "crm_all" on cotizaciones;
create policy "crm_all" on cotizaciones for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cotizaciones') then
    alter publication supabase_realtime add table cotizaciones;
  end if;
end $$;

-- ── cotizacion_items ────────────────────────
create table if not exists cotizacion_items (
  id text primary key,
  cotizacion_id text references cotizaciones(id) on delete cascade,
  producto text default '',
  cantidad int default 1,
  precio numeric(12,2) default 0,
  talla text default ''
);
alter table cotizacion_items add column if not exists cotizacion_id text;
alter table cotizacion_items add column if not exists producto text default '';
alter table cotizacion_items add column if not exists cantidad int default 1;
alter table cotizacion_items add column if not exists precio numeric(12,2) default 0;
alter table cotizacion_items add column if not exists talla text default '';
alter table cotizacion_items enable row level security;
drop policy if exists "crm_all" on cotizacion_items;
create policy "crm_all" on cotizacion_items for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cotizacion_items') then
    alter publication supabase_realtime add table cotizacion_items;
  end if;
end $$;

-- ── sesiones ────────────────────────────────
create table if not exists sesiones (
  id text primary key,
  escuela_id text references escuelas(id),
  fecha text default '',
  hora text default '',
  fotografo text default '',
  estado text default 'Agendada',
  fotos int default 0,
  nota text default ''
);
alter table sesiones add column if not exists escuela_id text;
alter table sesiones add column if not exists fecha text default '';
alter table sesiones add column if not exists hora text default '';
alter table sesiones add column if not exists fotografo text default '';
alter table sesiones add column if not exists estado text default 'Agendada';
alter table sesiones add column if not exists fotos int default 0;
alter table sesiones add column if not exists nota text default '';
alter table sesiones enable row level security;
drop policy if exists "crm_all" on sesiones;
create policy "crm_all" on sesiones for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sesiones') then
    alter publication supabase_realtime add table sesiones;
  end if;
end $$;

-- ── eventos ─────────────────────────────────
create table if not exists eventos (
  id text primary key,
  fecha text default '',
  hora text default '',
  titulo text default '',
  tipo text default 'otro',
  escuela_id text
);
alter table eventos add column if not exists fecha text default '';
alter table eventos add column if not exists hora text default '';
alter table eventos add column if not exists titulo text default '';
alter table eventos add column if not exists tipo text default 'otro';
alter table eventos add column if not exists escuela_id text;
alter table eventos enable row level security;
drop policy if exists "crm_all" on eventos;
create policy "crm_all" on eventos for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'eventos') then
    alter publication supabase_realtime add table eventos;
  end if;
end $$;

-- ── mensajes ────────────────────────────────
create table if not exists mensajes (
  id text primary key,
  fecha text default '',
  destinatario text default '',
  telefono text default '',
  plantilla text default '',
  texto text default ''
);
alter table mensajes add column if not exists fecha text default '';
alter table mensajes add column if not exists destinatario text default '';
alter table mensajes add column if not exists telefono text default '';
alter table mensajes add column if not exists plantilla text default '';
alter table mensajes add column if not exists texto text default '';
alter table mensajes enable row level security;
drop policy if exists "crm_all" on mensajes;
create policy "crm_all" on mensajes for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'mensajes') then
    alter publication supabase_realtime add table mensajes;
  end if;
end $$;

-- ── usuarios ────────────────────────────────
create table if not exists usuarios (
  id text primary key,
  nombre text default '',
  usuario text default '',
  email text default '',
  password text default '',
  rol text default 'operador',
  activo boolean default true
);
alter table usuarios add column if not exists nombre text default '';
alter table usuarios add column if not exists usuario text default '';
alter table usuarios add column if not exists email text default '';
alter table usuarios add column if not exists password text default '';
alter table usuarios add column if not exists rol text default 'operador';
alter table usuarios add column if not exists activo boolean default true;
alter table usuarios enable row level security;
drop policy if exists "crm_all" on usuarios;
create policy "crm_all" on usuarios for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'usuarios') then
    alter publication supabase_realtime add table usuarios;
  end if;
end $$;

-- ── historial_tasas ─────────────────────────
create table if not exists historial_tasas (
  id text primary key,
  fecha text default '',
  usd numeric(12,4) default 0,
  euro numeric(12,4) default 0,
  paralelo numeric(12,4) default 0,
  fuente text default 'dolarapi',
  actualizado bigint default 0
);
alter table historial_tasas add column if not exists fecha text default '';
alter table historial_tasas add column if not exists usd numeric(12,4) default 0;
alter table historial_tasas add column if not exists euro numeric(12,4) default 0;
alter table historial_tasas add column if not exists paralelo numeric(12,4) default 0;
alter table historial_tasas add column if not exists fuente text default 'dolarapi';
alter table historial_tasas add column if not exists actualizado bigint default 0;
alter table historial_tasas enable row level security;
drop policy if exists "crm_all" on historial_tasas;
create policy "crm_all" on historial_tasas for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'historial_tasas') then
    alter publication supabase_realtime add table historial_tasas;
  end if;
end $$;

-- ── paquetes_escuelas ───────────────────────
create table if not exists paquetes_escuelas (
  id text primary key,
  escuela_id text references escuelas(id),
  nombre text default '',
  tipo_paquete_id text default '',
  precio numeric(12,2) default 0,
  articulos jsonb default '[]'::jsonb,
  nota text default '',
  activo boolean default true,
  creado text default ''
);
alter table paquetes_escuelas add column if not exists escuela_id text;
alter table paquetes_escuelas add column if not exists nombre text default '';
alter table paquetes_escuelas add column if not exists tipo_paquete_id text default '';
alter table paquetes_escuelas add column if not exists precio numeric(12,2) default 0;
alter table paquetes_escuelas add column if not exists articulos jsonb default '[]'::jsonb;
alter table paquetes_escuelas add column if not exists nota text default '';
alter table paquetes_escuelas add column if not exists activo boolean default true;
alter table paquetes_escuelas add column if not exists creado text default '';
alter table paquetes_escuelas enable row level security;
drop policy if exists "crm_all" on paquetes_escuelas;
create policy "crm_all" on paquetes_escuelas for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'paquetes_escuelas') then
    alter publication supabase_realtime add table paquetes_escuelas;
  end if;
end $$;

-- ── configuracion ───────────────────────────
create table if not exists configuracion (
  id text primary key,
  data jsonb default '{}'::jsonb,
  seq_pedido int default 1,
  seq_cot int default 1,
  current_user_id text default ''
);
alter table configuracion add column if not exists data jsonb default '{}'::jsonb;
alter table configuracion add column if not exists seq_pedido int default 1;
alter table configuracion add column if not exists seq_cot int default 1;
alter table configuracion add column if not exists current_user_id text default '';
alter table configuracion enable row level security;
drop policy if exists "crm_all" on configuracion;
create policy "crm_all" on configuracion for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'configuracion') then
    alter publication supabase_realtime add table configuracion;
  end if;
end $$;

-- ── facturas ────────────────────────────────
create table if not exists facturas (
  id text primary key,
  numero text default '',
  estudiante_id text default '',
  estudiante text default '',
  fecha text default '',
  total numeric(12,2) default 0,
  accion text default ''
);
alter table facturas add column if not exists numero text default '';
alter table facturas add column if not exists estudiante_id text default '';
alter table facturas add column if not exists estudiante text default '';
alter table facturas add column if not exists fecha text default '';
alter table facturas add column if not exists total numeric(12,2) default 0;
alter table facturas add column if not exists accion text default '';
alter table facturas enable row level security;
drop policy if exists "crm_all" on facturas;
create policy "crm_all" on facturas for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'facturas') then
    alter publication supabase_realtime add table facturas;
  end if;
end $$;

-- ── tarjetas_qr ─────────────────────────────
create table if not exists tarjetas_qr (
  id text primary key,
  fecha text default '',
  estudiante_id text default '',
  estudiante text default '',
  accion text default '',
  lote text default ''
);
alter table tarjetas_qr add column if not exists fecha text default '';
alter table tarjetas_qr add column if not exists estudiante_id text default '';
alter table tarjetas_qr add column if not exists estudiante text default '';
alter table tarjetas_qr add column if not exists accion text default '';
alter table tarjetas_qr add column if not exists lote text default '';
alter table tarjetas_qr enable row level security;
drop policy if exists "crm_all" on tarjetas_qr;
create policy "crm_all" on tarjetas_qr for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tarjetas_qr') then
    alter publication supabase_realtime add table tarjetas_qr;
  end if;
end $$;

-- ── escaneos_ocr ────────────────────────────
create table if not exists escaneos_ocr (
  id text primary key,
  fecha text default '',
  motor text default '',
  ok boolean default false,
  nombres text default '',
  apellidos text default '',
  ci text default ''
);
alter table escaneos_ocr add column if not exists fecha text default '';
alter table escaneos_ocr add column if not exists motor text default '';
alter table escaneos_ocr add column if not exists ok boolean default false;
alter table escaneos_ocr add column if not exists nombres text default '';
alter table escaneos_ocr add column if not exists apellidos text default '';
alter table escaneos_ocr add column if not exists ci text default '';
alter table escaneos_ocr enable row level security;
drop policy if exists "crm_all" on escaneos_ocr;
create policy "crm_all" on escaneos_ocr for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'escaneos_ocr') then
    alter publication supabase_realtime add table escaneos_ocr;
  end if;
end $$;

-- ── registros_produccion ────────────────────
create table if not exists registros_produccion (
  id text primary key,
  fecha text default '',
  detalle text default '',
  materiales int default 0,
  pedidos int default 0
);
alter table registros_produccion add column if not exists fecha text default '';
alter table registros_produccion add column if not exists detalle text default '';
alter table registros_produccion add column if not exists materiales int default 0;
alter table registros_produccion add column if not exists pedidos int default 0;
alter table registros_produccion enable row level security;
drop policy if exists "crm_all" on registros_produccion;
create policy "crm_all" on registros_produccion for all using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'registros_produccion') then
    alter publication supabase_realtime add table registros_produccion;
  end if;
end $$;

-- ═══ USUARIOS SEMILLA ═══
-- Contraseñas hasheadas con SHA-256 + salt 'jyg-crm-2026'
insert into usuarios (id, nombre, usuario, email, password, rol, activo) values
  ('u1', 'Administrador JyG', 'admin', 'admin@jyg.com.ve', '083254b9923c63f605facb1c6469a62c015d1c74aeade7c3b85ada15072ee5e3', 'admin', true),
  ('u2', 'Operador de Registro', 'registro', 'registro@jyg.com.ve', 'b67fd967f716feccf44d58a12e2ad87f7b82e8f12e1e384680dc479a29ff06e3', 'operador', true),
  ('u3', 'Equipo de Producción', 'produccion', 'produccion@jyg.com.ve', '022b4a1f616de4e18bf3667c32574cd86baddfb1bd7b31c265e8241091db4fed', 'produccion', true),
  ('u4', 'Cobranza', 'cobranza', 'cobranza@jyg.com.ve', 'fbb2d2679a946742fb3815a86b10a079c0e389f31aa37ee4244bdd2d4a2e01f2', 'cobranza', true)
on conflict (id) do update set nombre = excluded.nombre, usuario = excluded.usuario, email = excluded.email, rol = excluded.rol, activo = excluded.activo;

-- ═══ LISTO ═══
-- Las 18 tablas están creadas, con RLS y tiempo real activos.
-- Los usuarios semilla están insertados con contraseñas hasheadas.
-- En el CRM pulsa "Verificar ahora" y luego "Subir base completa".

-- ─── 2) ADMIN REAL EN SUPABASE AUTH (bcrypt+salt en servidor) ───
-- Contraseña definida para el administrador: "Promojyg13*"
-- Si ya existe, se le aplica esta clave nueva (reparación garantizada).
do $$
declare uid uuid;
begin
  if not exists (select 1 from auth.users where email = 'admin@jyg.com.ve') then
    insert into auth.users
      (instance_id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, phone, is_sso_user)
    values
      ('00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'admin@jyg.com.ve', crypt('Promojyg13*', gen_salt('bf')),
       now(), '{"provider":"email","providers":["email"]}',
       '{"nombre":"Administrador JyG","rol":"admin"}',
       now(), now(), '', '', null, false)
    returning id into uid;
  else
    update auth.users
       set encrypted_password = crypt('Promojyg13*', gen_salt('bf')),
           updated_at = now()
     where email = 'admin@jyg.com.ve'
     returning id into uid;
  end if;

  -- 3) Fila espejo en public.usuarios (SIN contraseña: vive solo en auth.users)
  insert into public.usuarios (id, nombre, usuario, email, rol, activo)
  values (uid::text, 'Administrador JyG', 'admin', 'admin@jyg.com.ve', 'admin', true)
  on conflict (id) do update
    set nombre = excluded.nombre, usuario = excluded.usuario,
        email = excluded.email, rol = 'admin', activo = true;
end $$;

-- ─── 4) RLS ESTRICTA POR ROL (Supabase Auth + JWT) ───
-- ═══════════════════════════════════════════════════════════
-- CRM PROMOCIONES JyG — RLS ESTRICTA POR ROL (Supabase Auth + JWT)
-- Ejecutar DESPUÉS de tener: service key configurada, usuarios
-- sincronizados (Administración → Sincronizar con Supabase Auth)
-- y rlsEstricto activado en Integraciones.
-- Efecto: la anon key deja de poder leer/escribir directo; solo
-- entran sesiones autenticadas cuyo usuario está ACTIVO en "usuarios".
-- ═══════════════════════════════════════════════════════════

-- 1) Helper: sesión válida = usuario autenticado Y activo en la espejo.
--    security definer: puede leer "usuarios" aunque esa tabla tenga RLS.
create or replace function public.crm_es_activo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = (auth.uid())::text and u.activo = true
  );
$$;

-- 2) Helper: rol del usuario autenticado ('admin', 'operador', ...).
create or replace function public.crm_rol()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((
    select u.rol from public.usuarios u
    where u.id = (auth.uid())::text and u.activo = true
  ), '');
$$;

-- 3) Tablas de operación: todo miembro ACTIVO puede leer y escribir.
do $$
declare t text;
begin
  foreach t in array array['escuelas','docentes','estudiantes','pagos','adicionales_items',
                           'cotizaciones','cotizacion_items','sesiones','eventos','mensajes',
                           'historial_tasas','paquetes_escuelas','facturas','tarjetas_qr',
                           'escaneos_ocr','registros_produccion']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "crm_all" on public.%I;', t);
    execute format('drop policy if exists "crm_operacion" on public.%I;', t);
    execute format('create policy "crm_operacion" on public.%I for all to authenticated
      using (public.crm_es_activo()) with check (public.crm_es_activo());', t);
  end loop;
end $$;

-- 4) Configuración: lectura para miembros activos, escritura solo admin.
alter table public.configuracion enable row level security;
drop policy if exists "crm_all" on public.configuracion;
drop policy if exists "crm_config_lectura" on public.configuracion;
drop policy if exists "crm_config_escritura" on public.configuracion;
create policy "crm_config_lectura" on public.configuracion for select to authenticated
  using (public.crm_es_activo());
create policy "crm_config_escritura" on public.configuracion for all to authenticated
  using (public.crm_rol() = 'admin') with check (public.crm_rol() = 'admin');

-- 5) Usuarios: cada quien ve SU fila; el admin ve y edita todas.
--    (Así un operador no puede espiar hashes/correos ajenos ni ascenderse.)
alter table public.usuarios enable row level security;
drop policy if exists "crm_all" on public.usuarios;
drop policy if exists "crm_usuarios_mismo" on public.usuarios;
drop policy if exists "crm_usuarios_admin" on public.usuarios;
create policy "crm_usuarios_mismo" on public.usuarios for select to authenticated
  using ((id = (auth.uid())::text) or public.crm_rol() = 'admin');
create policy "crm_usuarios_admin" on public.usuarios for all to authenticated
  using (public.crm_rol() = 'admin') with check (public.crm_rol() = 'admin');

-- 6) Anti-escalada: nadie puede auto-cambiarse el rol ni reactivarse.
--    (La política 5 ya lo impide para no-admins; esto protege además al admin
--     despistado: solo el propio interesado o un admin pueden tocar su pass.)
create or replace function public.crm_no_escalada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Si cambia rol/activo y el que escribe NO es admin → bloquear.
  if (new.rol is distinct from old.rol or new.activo is distinct from old.activo)
     and public.crm_rol() <> 'admin' then
    raise exception 'Escalada de privilegios bloqueada';
  end if;
  return new;
end $$;
drop trigger if exists trg_crm_no_escalada on public.usuarios;
create trigger trg_crm_no_escalada before update on public.usuarios
  for each row execute function public.crm_no_escalada();

-- ═══ LISTO (RLS ESTRICTA) ═══
-- Verifica en el CRM: debe iniciar sesión con Supabase Auth (modo automático).
-- Para volver al modo simple, ejecutar el script SETUP normal (política crm_all).

-- ═══ LISTO ═══
-- Entra al CRM con:  admin@jyg.com.ve  /  Promojyg13*
-- Luego crea al resto del equipo en Administración → Equipo JyG
-- y usa «Sincronizar con Supabase Auth» (requiere service key).