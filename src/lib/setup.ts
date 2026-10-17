/* ============================================================
   CONFIGURACIÓN AUTOMÁTICA DE SUPABASE — CRM JyG
   Genera un único script SQL idempotente que hace TODO lo que
   el proyecto necesita, ejecutable una sola vez en Supabase →
   SQL Editor:
     1) Crea/repara las 18 tablas (sin borrar datos)
     2) Registra al admin (admin@jyg.com.ve) en auth.users con
        bcrypt + salt gestionados por Supabase (hash en servidor)
     3) Inserta la fila espejo en "usuarios" SIN contraseña
     4) Activa RLS ESTRICTA por rol (políticas crm_rol/crm_es_activo)
     5) Habilita tiempo real
   ============================================================ */
import { SUPABASE_SCHEMA_SEGURO, SUPABASE_RLS_ESTRICTO_SQL } from "./data";

export const SETUP_ADMIN_EMAIL = "admin@jyg.com.ve";
export const SETUP_ADMIN_PASS = "Promojyg13*";

/* En SQL literal ($$...$$), los apóstrofos simples son seguros; solo hay que
   escapar barras invertidas y comillas dobles del hash bcrypt. */
const sqlStr = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export const SUPABASE_SETUP_AUTOMATICO_SQL = `-- ═══════════════════════════════════════════════════════════
-- CRM PROMOCIONES JyG — CONFIGURACIÓN AUTOMÁTICA DE SUPABASE
-- Pega TODO este script en: Supabase → SQL Editor → Run.
-- Es seguro repetirlo (idempotente): no borra datos existentes.
-- Hace: tablas + usuario Auth del admin + espejo + RLS estricta.
-- ═══════════════════════════════════════════════════════════

${SUPABASE_SCHEMA_SEGURO}

-- ─── 2) ADMIN REAL EN SUPABASE AUTH (bcrypt+salt en servidor) ───
-- Contraseña definida para el administrador: "${SETUP_ADMIN_PASS}"
-- Si ya existe, se le aplica esta clave nueva (reparación garantizada).
do $$
declare uid uuid;
begin
  if not exists (select 1 from auth.users where email = '${SETUP_ADMIN_EMAIL}') then
    insert into auth.users
      (instance_id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, phone, is_sso_user)
    values
      ('00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       '${SETUP_ADMIN_EMAIL}', crypt('${sqlStr(SETUP_ADMIN_PASS)}', gen_salt('bf')),
       now(), '{"provider":"email","providers":["email"]}',
       '{"nombre":"Administrador JyG","rol":"admin"}',
       now(), now(), '', '', null, false)
    returning id into uid;
  else
    update auth.users
       set encrypted_password = crypt('${sqlStr(SETUP_ADMIN_PASS)}', gen_salt('bf')),
           updated_at = now()
     where email = '${SETUP_ADMIN_EMAIL}'
     returning id into uid;
  end if;

  -- 3) Fila espejo en public.usuarios (SIN contraseña: vive solo en auth.users)
  insert into public.usuarios (id, nombre, usuario, email, rol, activo)
  values (uid::text, 'Administrador JyG', 'admin', '${SETUP_ADMIN_EMAIL}', 'admin', true)
  on conflict (id) do update
    set nombre = excluded.nombre, usuario = excluded.usuario,
        email = excluded.email, rol = 'admin', activo = true;
end $$;

-- ─── 4) RLS ESTRICTA POR ROL (Supabase Auth + JWT) ───
${SUPABASE_RLS_ESTRICTO_SQL}

-- ═══ LISTO ═══
-- Entra al CRM con:  ${SETUP_ADMIN_EMAIL}  /  ${SETUP_ADMIN_PASS}
-- Luego crea al resto del equipo en Administración → Equipo JyG
-- y usa «Sincronizar con Supabase Auth» (requiere service key).`;
