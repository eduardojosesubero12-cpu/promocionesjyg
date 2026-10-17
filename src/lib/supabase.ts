import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AdicionalItem, Cotizacion, CRMData, Estudiante, Pago, Usuario } from "./data";
import { DB_TABLES } from "./data";

/* Credenciales por defecto: del .env de build (VITE_* o NEXT_PUBLIC_*, ambos
   soportados para que el mismo cliente funcione en Vite local y en Vercel con
   variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY),
   y si no están, las del proyecto del equipo. Así la conexión nunca queda vacía. */
const _env = (k: string): string => {
  try { return String((import.meta as any).env?.[k] || "").trim(); } catch { return ""; }
};
const ENV_URL = _env("VITE_SUPABASE_URL") || _env("NEXT_PUBLIC_SUPABASE_URL") || "https://kdzofrxquzhtixzjtgmx.supabase.co";
const ENV_KEY = _env("VITE_SUPABASE_ANON_KEY") || _env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "sb_publishable_ibQlrVHQi9oqKd5iw3X3CA_fpSMjzFq";
export const SUPABASE_DEFAULTS = { url: ENV_URL, key: ENV_KEY };

/* Clave de almacenamiento de sesión Auth AISLADA por proyecto Supabase:
   así dos despliegues (producción Vercel + localhost) nunca comparten JWT. */
const storageKeyPara = (url: string) => `sb-${String(url || "").replace(/^https?:\/\//, "").split(".")[0]}-crm-auth`;

export const sbClient = (url?: string, key?: string, serviceKey?: string): SupabaseClient => {
  const u = url?.trim() || ENV_URL;
  /* PERSISTENCIA DE SESIÓN EN PRODUCCIÓN (Vercel): cuando se usa la anon key,
     el SDK guarda el JWT en localStorage y lo auto-refresca, de modo que al
     recargar la página la sesión sigue viva. Con service role (operaciones de
     admin) NO se persiste nada: es una verificación puntual sin sesión propia. */
  /* Sanear la service key: quitar espacios/retornos accidentales al copiarla
     (causa típica del error «requires a valid Bearer token»). */
  const svc = (serviceKey || "").trim().replace(/\s+/g, "");
  return createClient(u, svc || (key || "").trim() || ENV_KEY, {
    auth: {
      persistSession: !svc,
      autoRefreshToken: !svc,
      detectSessionInUrl: false,
      storageKey: storageKeyPara(u),
    },
  });
};

const codV = () => ({ carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" });

/* El proyecto en Supabase puede tener un esquema antiguo (columnas extra como
   "apellido" NOT NULL, FK hacia estudiantes, otros nombres en usuarios).
   Estas funciones envían SOLO columnas que cualquier versión del esquema acepta
   y traducen los campos que fueron renombrados. */
const _splitNombre = (n: string) => { const p = String(n || "").trim().split(/\s+/); return { nombre: p.shift() || "Sin nombre", apellido: p.join(" ") }; };

/* Clave de cifrado para las contraseñas en tránsito hacia la nube.
   La columna de la BD queda con un valor cifrado AES-like (XOR + Base64),
   nunca la contraseña en texto plano. */
const CLOUD_PASS_KEY = "jyg-cloud-2026-k9";
const _b64e = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const _b64d = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
export function cifrarPass(pass: string): string {
  if (!pass) return "";
  try {
    let out = "";
    for (let i = 0; i < pass.length; i++) out += String.fromCharCode(pass.charCodeAt(i) ^ CLOUD_PASS_KEY.charCodeAt(i % CLOUD_PASS_KEY.length));
    return "enc:" + _b64e(out);
  } catch { return pass; }
}
export function descifrarPass(v: string): string {
  if (!v) return "";
  if (!v.startsWith("enc:")) return v; // hash antiguo o plain — se deja tal cual
  try {
    const raw = _b64d(v.slice(4));
    let out = "";
    for (let i = 0; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ CLOUD_PASS_KEY.charCodeAt(i % CLOUD_PASS_KEY.length));
    return out;
  } catch { return v; }
}

/* Detecta una vez por cliente si la tabla X tiene cierta columna (para enviarla o no) */
const cacheCol = new Map<string, Promise<boolean>>();
export function existeColumna(client: SupabaseClient, tabla: string, col: string): Promise<boolean> {
  const k = `${tabla}.${col}`;
  let p = cacheCol.get(k);
  if (!p) {
    p = client.from(tabla).select(col, { head: true, count: "exact" }).then(({ error }) => !error);
    cacheCol.set(k, p);
  }
  return p;
}

export async function dbToRows(client: SupabaseClient | null, db: CRMData): Promise<Record<string, any[]>> {
  const hayApellido = client ? await existeColumna(client, "estudiantes", "apellido") : false;
  const hashCol = client ? (await existeColumna(client, "usuarios", "password_hash") ? "password_hash" : "password") : "password";
  const usuarioCol = client ? await existeColumna(client, "usuarios", "usuario") : true;
  /* MODO AUTOMÁTICO: si el proyecto tiene Supabase Auth activo (service key),
     la contraseña vive SOLO en auth.users con salt+bcrypt gestionados por
     Supabase. La tabla espejo viaja SIN secreto — así ningún hash propio se
     expone vía PostgREST y no puede corromperse al sincronizar. */
  const authActiva = !!(db.config?.supabaseServiceKey || "").trim();
  return {
    escuelas: db.escuelas.map((e) => ({ id: e.id, nombre: e.nombre || "", director: e.director, telefono: e.telefono, direccion: e.direccion, estado: e.estado, municipio: e.municipio, anio_escolar: e.anioEscolar, observaciones: e.observaciones })),
    docentes: db.docentes.map((d) => ({ id: d.id, nombre: d.nombre || "", telefono: d.telefono, escuela_id: d.escuelaId || null, correo: d.correo, observaciones: d.observaciones })),
    estudiantes: db.estudiantes.map((e) => {
      const base: any = { id: e.id, pedido: e.pedido, telefono: e.telefono, representante: e.representante, ci: e.ci, escuela_id: e.escuelaId || null, docente_id: e.docenteId || null, grado: e.grado, seccion: e.seccion, paquete_id: e.paqueteId, precio_paquete: e.precioPaquete, estado_pedido: e.estadoPedido, fecha_registro: e.fechaRegistro, fecha_entrega: e.fechaEntrega || null, observaciones: e.observaciones, codigos: e.codigos, extra: { fechaNacimiento: e.fechaNacimiento, direccion: e.direccion, email: e.email, representanteCi: e.representanteCi, telefonoRepresentante: e.telefonoRepresentante, tallaCamisa: e.tallaCamisa, tallaAnillo: e.tallaAnillo, alergias: e.alergias, tutor2: e.tutor2, codigosExtra: e.codigosExtra, actualizado: e.actualizado } };
      if (hayApellido) { const s = _splitNombre(e.nombre); base.nombre = s.nombre; base.apellido = s.apellido; }
      else base.nombre = e.nombre || "Sin nombre";
      return base;
    }),
    pagos: db.estudiantes.flatMap((e) => e.pagos.map((p) => ({ id: p.id, estudiante_id: e.id, fecha: p.fecha, monto: p.monto, metodo: p.metodo, bs: p.bs, tasa: p.tasa, usd: p.usd, referencia: p.referencia, observacion: p.observacion }))),
    adicionales_items: db.estudiantes.flatMap((e) => e.adicionales.map((a, i) => ({ id: `${e.id}-ad-${i}`, estudiante_id: e.id, producto: a.producto, cantidad: a.cantidad, precio: a.precio, talla: a.talla }))),
    cotizaciones: db.cotizaciones.map((c) => ({ id: c.id, numero: c.numero, fecha: c.fecha, cliente: c.cliente, telefono: c.telefono, escuela: c.escuela, paquete_id: c.paqueteId, estado: c.estado, nota: c.nota })),
    cotizacion_items: db.cotizaciones.flatMap((c) => c.adicionales.map((a, i) => ({ id: `${c.id}-it-${i}`, cotizacion_id: c.id, producto: a.producto, cantidad: a.cantidad, precio: a.precio, talla: a.talla }))),
    sesiones: db.sesiones.map((s) => ({ id: s.id, escuela_id: s.escuelaId || null, fecha: s.fecha, hora: s.hora, fotografo: s.fotografo, estado: s.estado, fotos: s.fotos, nota: s.nota })),
    eventos: db.eventos.map((e) => ({ id: e.id, fecha: e.fecha, hora: e.hora, titulo: e.titulo, tipo: e.tipo, escuela_id: e.escuelaId || null })),
    mensajes: db.mensajes.map((m) => ({ id: m.id, fecha: m.fecha, destinatario: m.destinatario, telefono: m.telefono, plantilla: m.plantilla, texto: m.texto })),
    usuarios: db.usuarios.map((u) => { const r: any = { id: u.id, nombre: u.nombre, email: u.email || "", rol: u.rol, activo: u.activo, [hashCol]: authActiva ? "" : cifrarPass(u.password || "") }; if (usuarioCol) r.usuario = u.usuario; return r; }),
    historial_tasas: db.historialTasas.map((h) => ({ id: h.id, fecha: h.fecha, usd: h.usd, euro: h.euro, paralelo: h.paralelo, fuente: h.fuente, actualizado: h.actualizado })),
    paquetes_escuelas: db.paquetesEscuelas.map((p) => ({ id: p.id, escuela_id: p.escuelaId, nombre: p.nombre, tipo_paquete_id: p.tipoPaqueteId, precio: p.precio, articulos: p.articulos, nota: p.nota, activo: p.activo, creado: p.creado })),
    facturas: (db.facturas || []).map((f) => ({ id: f.id, numero: f.numero, estudiante_id: f.estudianteId, estudiante: f.estudiante, fecha: f.fecha, total: f.total, accion: f.accion })),
    tarjetas_qr: (db.tarjetas || []).map((t) => ({ id: t.id, fecha: t.fecha, estudiante_id: t.estudianteId, estudiante: t.estudiante, accion: t.accion, lote: t.lote })),
    escaneos_ocr: (db.escaneos || []).map((s) => ({ id: s.id, fecha: s.fecha, motor: s.motor, ok: s.ok, nombres: s.nombres, apellidos: s.apellidos, ci: s.ci })),
    registros_produccion: (db.produccionLogs || []).map((r) => ({ id: r.id, fecha: r.fecha, detalle: r.detalle, materiales: r.materiales, pedidos: r.pedidos })),
    configuracion: [{ id: "jyg", data: db.config, seq_pedido: db.seqPedido, seq_cot: db.seqCot, current_user_id: db.currentUserId }],
  };
}

export function rowsToDb(rows: Record<string, any[]>, base: CRMData): CRMData {
  const estudiantes: Estudiante[] = (rows.estudiantes || []).map((r) => {
    const x = r.extra || {};
    const nombreCompleto = [r.nombre || "", r.apellido || ""].filter(Boolean).join(" ") || x.nombreCompleto || "";
    return {
      id: r.id, pedido: r.pedido || "", nombre: nombreCompleto, telefono: r.telefono || x.telefono || "", representante: r.representante || r.representante_nombre || x.representante || "", ci: r.ci || "",
      escuelaId: r.escuela_id || "", docenteId: r.docente_id || "", grado: r.grado || "Bachiller", seccion: r.seccion || "A",
      paqueteId: r.paquete_id || "premium", precioPaquete: Number(r.precio_paquete) || 0,
      adicionales: (rows.adicionales_items || []).filter((a) => a.estudiante_id === r.id).map((a): AdicionalItem => ({ producto: a.producto, cantidad: Number(a.cantidad), precio: Number(a.precio), talla: a.talla || "" })),
      pagos: (rows.pagos || []).filter((p) => p.estudiante_id === r.id).map((p): Pago => ({ id: p.id, fecha: p.fecha, monto: Number(p.monto), metodo: p.metodo, bs: !!p.bs, tasa: Number(p.tasa), usd: Number(p.usd), referencia: p.referencia || "", observacion: p.observacion || "" })),
      estadoPedido: r.estado_pedido || "Registrado", fechaRegistro: r.fecha_registro || "", fechaEntrega: r.fecha_entrega || "", observaciones: r.observaciones || "",
      codigos: { ...codV(), ...(r.codigos || {}) },
      fechaNacimiento: x.fechaNacimiento || r.fecha_nacimiento || undefined, direccion: x.direccion, email: x.email, representanteCi: x.representanteCi,
      telefonoRepresentante: x.telefonoRepresentante || r.representante_telefono, tallaCamisa: x.tallaCamisa, tallaAnillo: x.tallaAnillo, alergias: x.alergias, tutor2: x.tutor2,
      codigosExtra: x.codigosExtra, actualizado: x.actualizado,
    };
  });
  const cotizaciones: Cotizacion[] = (rows.cotizaciones || []).map((c) => ({
    id: c.id, numero: c.numero, fecha: c.fecha || "", cliente: c.cliente || "", telefono: c.telefono || "", escuela: c.escuela || "",
    paqueteId: c.paquete_id || "premium", estado: c.estado || "Pendiente", nota: c.nota || "",
    adicionales: (rows.cotizacion_items || []).filter((i) => i.cotizacion_id === c.id).map((i): AdicionalItem => ({ producto: i.producto, cantidad: Number(i.cantidad), precio: Number(i.precio), talla: i.talla || "" })),
  }));
  const cfg = (rows.configuracion || [])[0];
  return {
    escuelas: (rows.escuelas || []).map((e) => ({ id: e.id, nombre: e.nombre || "", director: e.director || "", telefono: e.telefono || "", direccion: e.direccion || "", estado: e.estado || "", municipio: e.municipio || "", anioEscolar: e.anio_escolar || "", observaciones: e.observaciones || "" })),
    docentes: (rows.docentes || []).map((d) => ({ id: d.id, nombre: d.nombre || "", telefono: d.telefono || "", escuelaId: d.escuela_id || "", correo: d.correo || "", observaciones: d.observaciones || "" })),
    estudiantes, cotizaciones,
    sesiones: (rows.sesiones || []).map((s) => ({ id: s.id, escuelaId: s.escuela_id || "", fecha: s.fecha || "", hora: s.hora || "", fotografo: s.fotografo || "", estado: s.estado || "Agendada", fotos: Number(s.fotos) || 0, nota: s.nota || "" })),
    eventos: (rows.eventos || []).map((e) => ({ id: e.id, fecha: e.fecha || "", hora: e.hora || "", titulo: e.titulo || "", tipo: e.tipo || "otro", escuelaId: e.escuela_id || undefined })),
    mensajes: (rows.mensajes || []).map((m) => ({ id: m.id, fecha: m.fecha || "", destinatario: m.destinatario || "", telefono: m.telefono || "", plantilla: m.plantilla || "", texto: m.texto || "" })),
    /* Si la nube no tiene usuarios, se conservan los locales para que siempre exista un usuario activo */
    usuarios: (rows.usuarios || []).length > 0
      ? (rows.usuarios || []).map((u) => ({ id: u.id, nombre: u.nombre || "Usuario", usuario: u.usuario || "", email: u.email || "", password: descifrarPass(u.password || u.password_hash || ""), rol: u.rol || "operador", activo: u.activo !== false }))
      : base.usuarios,
    historialTasas: (rows.historial_tasas || []).map((h) => ({ id: h.id, fecha: h.fecha, usd: Number(h.usd), euro: Number(h.euro), paralelo: Number(h.paralelo), fuente: h.fuente || "dolarapi", actualizado: Number(h.actualizado) || 0 })),
    paquetesEscuelas: (rows.paquetes_escuelas || []).map((p) => ({ id: p.id, escuelaId: p.escuela_id || "", nombre: p.nombre || "", tipoPaqueteId: p.tipo_paquete_id || "personalizado", precio: Number(p.precio) || 0, articulos: p.articulos || [], nota: p.nota || "", activo: !!p.activo, creado: p.creado || "" })),
    facturas: (rows.facturas || []).map((f) => ({ id: f.id, numero: f.numero || "", estudianteId: f.estudiante_id || "", estudiante: f.estudiante || "", fecha: f.fecha || "", total: Number(f.total) || 0, accion: f.accion || "" })),
    tarjetas: (rows.tarjetas_qr || []).map((t) => ({ id: t.id, fecha: t.fecha || "", estudianteId: t.estudiante_id || "", estudiante: t.estudiante || "", accion: t.accion || "", lote: t.lote || "" })),
    escaneos: (rows.escaneos_ocr || []).map((s) => ({ id: s.id, fecha: s.fecha || "", motor: s.motor || "", ok: !!s.ok, nombres: s.nombres || "", apellidos: s.apellidos || "", ci: s.ci || "" })),
    produccionLogs: (rows.registros_produccion || []).map((r) => ({ id: r.id, fecha: r.fecha || "", detalle: r.detalle || "", materiales: Number(r.materiales) || 0, pedidos: Number(r.pedidos) || 0 })),
    config: cfg?.data ? { ...base.config, ...cfg.data } : base.config,
    currentUserId: cfg?.current_user_id || base.currentUserId,
    seqPedido: cfg?.seq_pedido ?? base.seqPedido, seqCot: cfg?.seq_cot ?? base.seqCot,
  };
}

/* Devuelve cuántas tablas existen y cuántas faltan (esquema antiguo),
   sin abortar: así el CRM sabe exactamente qué migrar. */
export async function probarConexion(client: SupabaseClient): Promise<{ tablas: number; filas: number; faltantes: string[] }> {
  let tablas = 0, filas = 0;
  const faltantes: string[] = [];
  for (const { tabla } of DB_TABLES) {
    const { count, error } = await client.from(tabla).select("id", { count: "exact", head: true });
    if (error) {
      if (/does not exist|schema cache|could not find the table/i.test(error.message)) { faltantes.push(tabla); continue; }
      throw new Error(`La tabla "${tabla}" no es accesible: ${error.message}`);
    }
    tablas++; filas += count || 0;
  }
  return { tablas, filas, faltantes };
}

const ORDEN = ["escuelas", "docentes", "estudiantes", "pagos", "adicionales_items", "cotizaciones", "cotizacion_items", "sesiones", "eventos", "mensajes", "usuarios", "historial_tasas", "paquetes_escuelas", "configuracion", "facturas", "tarjetas_qr", "escaneos_ocr", "registros_produccion"];

/* Columnas reales del proyecto en la nube (detectadas con un insert de prueba
   que se rechaza a propósito: el error lista TODAS las columnas desconocidas.
   Así soportamos esquemas antiguos sin enviar campos que PostgREST rechace). */
const cacheCols = new Map<string, Promise<string[] | null>>();
function _colsDesconocidas(msg: string): string[] {
  const m = msg.match(/Could not find the ([^.]+?) column/i);
  if (!m) return [];
  return [...m[1].matchAll(/'([\w]+)'/g)].map((x) => x[1]);
}
async function columnasNoValidas(client: SupabaseClient, tabla: string): Promise<string[] | null> {
  let p = cacheCols.get(tabla);
  if (!p) {
    p = client.from(tabla).insert([{ __crm_probe__: 1 }]).then(({ error }) => {
      if (!error) return [];
      const descon = _colsDesconocidas(error.message || "");
      /* Si el fallo es por otra causa (tabla inexistente, NOT NULL...), no filtramos */
      return descon.length > 0 ? ["__crm_probe__", ...descon] : null;
    });
    cacheCols.set(tabla, p);
  }
  const r = await p;
  if (r === null) cacheCols.delete(tabla); /* reintentar la detección en la próxima subida */
  return r;
}

const LOTE = 500; /* filas por petición: soporta miles de estudiantes sin agotar el cuerpo/timeout */

/* Inserta en lotes, quitando columnas inexistentes y satisfaciendo NOT NULLs ajenos al CRM. */
async function insertarSeguro(client: SupabaseClient, tabla: string, data: any[]): Promise<{ ok: boolean; error?: string }> {
  for (let i = 0; i < data.length; i += LOTE) {
    const r = await _insertarLote(client, tabla, data.slice(i, i + LOTE));
    if (!r.ok) return r;
  }
  return { ok: true };
}

async function _insertarLote(client: SupabaseClient, tabla: string, data: any[]): Promise<{ ok: boolean; error?: string }> {
  let restante = data;
  let ultimoErr = "";
  for (let intento = 0; intento < 10 && restante.length > 0; intento++) {
    const ins = await client.from(tabla).insert(restante);
    if (!ins.error) return { ok: true };
    ultimoErr = ins.error.message || "";
    const mNotNull = ultimoErr.match(/null value in column "?([\w]+)"? of relation/i);
    if (mNotNull) {
      const col = mNotNull[1];
      /* Satisfacer el NOT NULL con un valor inocuo según el nombre de la columna */
      const relleno = /correo|email/i.test(col) ? "sin-correo@jyg.local"
        : /telefono|phone/i.test(col) ? ""
        : /nombre/i.test(col) ? "Sin nombre"
        : "";
      restante = restante.map((r) => ({ ...r, [col]: r[col] ?? relleno }));
      continue;
    }
    const mFk = ultimoErr.match(/violates foreign key constraint "(\w+)"|foreign key constraint on table \w+ references (\w+)/i);
    if (mFk) {
      /* FK hacia una fila inexistente (p. ej. pagos → estudiantes con orden distinto):
         quitar la columna referenciada para no perder el registro */
      const ref = mFk[2];
      if (ref) {
        const colsRef = Object.keys(restante[0]).filter((k) => k.endsWith(`${ref.replace(/s$/, "")}_id`) || k === `${ref.slice(0, -1)}_id` || k === `${ref}_id`);
        if (colsRef.length > 0) { restante = restante.map((r) => { const c = { ...r }; colsRef.forEach((cr) => delete c[cr]); return c; }); continue; }
      }
      return { ok: false, error: ultimoErr };
    }
    return { ok: false, error: ultimoErr };
  }
  return restante.length === 0 ? { ok: true } : { ok: false, error: ultimoErr };
}

/* Sube todas las tablas. Es tolerante: si una tabla falla (p. ej. le falta
   una columna por un esquema antiguo), continúa con el resto y devuelve la
   lista de fallos para que el usuario ejecute la migración SQL.
   NUNCA deja la tabla vacía: guarda los datos actuales de la nube y los
   restaura si el insert falla, para no perder información. */
export async function subirTodo(client: SupabaseClient, db: CRMData, onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void): Promise<{ fallos: { tabla: string; error: string }[]; faltantes: string[] }> {
  const rows = await dbToRows(client, db);
  const fallos: { tabla: string; error: string }[] = [];
  const faltantes: string[] = [];
  for (const tabla of ORDEN) {
    onTabla?.(tabla, "busy");
    try {
      const data = rows[tabla] || [];
      /* ¿La tabla existe en la nube? */
      const probe = await client.from(tabla).select("id", { count: "exact", head: true });
      if (probe.error) {
        if (/does not exist|schema cache|could not find the table/i.test(probe.error.message)) { faltantes.push(tabla); onTabla?.(tabla, "err"); continue; }
        throw new Error(probe.error.message);
      }
      /* Filtrar columnas que la nube no conoce (esquema antiguo) */
      const invalidas = await columnasNoValidas(client, tabla);
      const mal = new Set(invalidas || []);
      const limpio = invalidas ? data.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !mal.has(k)))) : data;
      /* Copia de seguridad de lo que hay en la nube antes de reemplazarlo (paginada) */
      let prev: any[] = [];
      if (data.length > 0) {
        for (let d = 0; ; d += 1000) {
          const r = await client.from(tabla).select("*").range(d, d + 999);
          if (r.error) throw new Error(r.error.message);
          prev.push(...(r.data || []));
          if ((r.data || []).length < 1000) break;
        }
      }
      const del = await client.from(tabla).delete().neq("id", "");
      if (del.error) throw new Error(del.error.message);
      if (limpio.length > 0) {
        const ins = await insertarSeguro(client, tabla, limpio);
        if (!ins.ok) {
          /* Devolver lo que había en la nube para no perderlo */
          if (prev.length > 0) await insertarSeguro(client, tabla, prev);
          throw new Error(ins.error || "no se pudo escribir");
        }
      }
      onTabla?.(tabla, "ok", data.length);
    } catch (e: any) {
      const msg = e?.message || "desconocido";
      /* Tabla que no existe en Supabase (esquema antiguo): se omite, no se cuenta como fallo */
      if (/does not exist|schema cache|could not find the table|could not find the '.*' column/i.test(msg)) {
        faltantes.push(tabla);
        onTabla?.(tabla, "err");
        continue;
      }
      onTabla?.(tabla, "err");
      fallos.push({ tabla, error: msg });
    }
  }
  return { fallos, faltantes };
}

/* ============================================================
   USUARIOS — guardado INSTANTÁNEO y en caliente (sin borrar la tabla)
   Se hace upsert fila por fila con merge: si la nube ya tiene el
   usuario, se actualizan sus campos; así un cambio de correo o
   contraseña queda disponible al instante para todo el equipo.
   ============================================================ */
export async function subirUsuarioInmediato(client: SupabaseClient, u: Usuario): Promise<{ ok: boolean; error?: string }> {
  const hashCol = await existeColumna(client, "usuarios", "password_hash") ? "password_hash" : "password";
  const usuarioCol = await existeColumna(client, "usuarios", "usuario");
  let fila: any = { id: u.id, nombre: u.nombre || "Usuario", email: u.email || "", rol: u.rol, activo: u.activo, [hashCol]: cifrarPass(u.password || "") };
  if (usuarioCol) fila.usuario = u.usuario || "";
  /* Quitar columnas que el esquema de la nube no conoce */
  const invalidas = await columnasNoValidas(client, "usuarios");
  if (invalidas) fila = Object.fromEntries(Object.entries(fila).filter(([k]) => !invalidas.includes(k)));
  /* Merge con lo que ya existe en la nube (no pisamos campos que no enviamos) */
  const { data: existente } = await client.from("usuarios").select("*").eq("id", u.id).maybeSingle();
  const merged = existente ? { ...existente, ...fila } : fila;
  const r = await client.from("usuarios").upsert([merged], { onConflict: "id" });
  return { ok: !r.error, error: r.error?.message };
}

export async function eliminarUsuarioInmediato(client: SupabaseClient, id: string): Promise<{ ok: boolean; error?: string }> {
  const r = await client.from("usuarios").delete().eq("id", id);
  return { ok: !r.error, error: r.error?.message };
}

/* ============================================================
   AUTENTICACIÓN NATIVA SUPABASE (supabase.auth)
   Cada miembro del equipo JyG queda registrado como usuario real
   de Supabase Auth: la validación de credenciales ocurre en el
   servidor con bcrypt y el login emite un JWT propio.
   La tabla pública "usuarios" sigue existiendo como espejo para
   roles/estado — pero NUNCA contiene contraseñas (se envía "" a
   password_hash, que solo guarda el cifrado local legacy).
   ============================================================ */
const PASS_META_KEY = "jyg-pass-meta"; /* { [userId]: { updatedAt: epochMs } } */
export function metaPass(userId: string): { updatedAt: number } | null {
  try {
    const all = JSON.parse(localStorage.getItem(PASS_META_KEY) || "{}");
    return all[userId] || null;
  } catch { return null; }
}
export function registrarPassCambio(userId: string) {
  try {
    const all = JSON.parse(localStorage.getItem(PASS_META_KEY) || "{}");
    all[userId] = { updatedAt: Date.now() };
    localStorage.setItem(PASS_META_KEY, JSON.stringify(all));
  } catch { /* noop */ }
}

export type ResultadoAuth = { ok: boolean; error?: string; requiereCambio?: boolean };

/* Crear / actualizar al usuario en Supabase Auth.
   - Si no existe aún: signUp con la contraseña dada (queda verificado por
     el admin, sin correo) y se escribe además la fila espejo en "usuarios".
   - Si ya existe: compara la marca de tiempo de la última clave conocida
     contra updated_at de auth.users; si la nube es MÁS nueva, el cambio
     ocurrió en otro dispositivo → devuelve requiereCambio (sin pisar). */
export async function upsertAuthUser(
  client: SupabaseClient,
  u: Usuario,
  passPlana: string,
  opts: { crearFila?: boolean } = {},
): Promise<ResultadoAuth> {
  const email = (u.email || "").trim();
  if (!email) return { ok: false, error: "El usuario debe tener un correo válido." };
  let existente: any = null;
  try {
    const { data: lista } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    existente = (lista?.users || []).find((x: any) => (x.email || "").toLowerCase() === email.toLowerCase()) || null;
  } catch (e: any) {
    return { ok: false, error: `No hay acceso a supabase.auth (service role): ${e?.message || e}` };
  }
  if (!existente) {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password: passPlana,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, usuario: u.usuario, rol: u.rol },
    });
    if (error) return { ok: false, error: error.message };
    if (opts.crearFila) {
      /* Espejo en la tabla pública SIN contraseña (la clave vive en Auth) */
      const hashCol = await existeColumna(client, "usuarios", "password_hash") ? "password_hash" : "password";
      const usuarioCol = await existeColumna(client, "usuarios", "usuario");
      let fila: any = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo, [hashCol]: "" };
      if (usuarioCol) fila.usuario = u.usuario || "";
      const invalidas = await columnasNoValidas(client, "usuarios");
      if (invalidas) fila = Object.fromEntries(Object.entries(fila).filter(([k]) => !invalidas.includes(k)));
      await client.from("usuarios").upsert([fila], { onConflict: "id" });
    }
    registrarPassCambio(u.id);
    return { ok: true };
  }
  /* ¿Alguien cambió la clave en OTRO dispositivo más recientemente? */
  const meta = metaPass(u.id);
  const cloudMs = existente.updated_at ? new Date(existente.updated_at).getTime() : 0;
  if (meta && cloudMs && cloudMs > meta.updatedAt + 2000) {
    return { ok: false, requiereCambio: true, error: "La contraseña fue cambiada recientemente desde otro dispositivo. Vuelve a sincronizar los datos antes de asignar una nueva clave." };
  }
  const { error } = await client.auth.admin.updateUserById(existente.id, { password: passPlana });
  if (error) return { ok: false, error: error.message };
  registrarPassCambio(u.id);
  return { ok: true };
}

/* Login real contra Supabase Auth (bcrypt en servidor + JWT).
   Mantiene la sesión Auth ACTIVA (persistida en localStorage con clave
   aislada por proyecto) para que en Vercel/producción el token JWT y su
   auto-refresh sobrevivan a recargas — requisito de persistencia de sesión. */
export async function loginAuth(client: SupabaseClient, email: string, password: string): Promise<ResultadoAuth> {
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (/invalid login credentials|email or password/.test(msg)) return { ok: false, error: "incorrectas" };
      if (/rate limit/.test(msg)) return { ok: false, error: "demasiados intentos, espera unos minutos" };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "fallo de red" };
  }
}

/* Crear en Supabase Auth un usuario con la contraseña EXACTA del espejo
   local (email_confirm: true → puede iniciar sesión de inmediato, sin pasar
   por el correo de confirmación). Reservado para reparaciones puntuales;
   la reparación automática del login usa forzarPassAuth (crea o actualiza). */
export async function crearAuthUserConPass(
  client: SupabaseClient,
  u: Usuario,
  passPlana: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await client.auth.admin.createUser({
      email: u.email,
      password: passPlana,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, usuario: u.usuario, rol: u.rol },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "fallo de red" };
  }
}

/* Cierre de sesión Auth al salir del CRM (elimina el JWT persistido). */
export async function logoutAuth(client: SupabaseClient): Promise<void> {
  try { await client.auth.signOut(); } catch { /* noop */ }
}

/* Desactivar/eliminar también en Auth para que nadie entre con un JWT viejo. */
export async function desactivarAuthUser(client: SupabaseClient, email: string): Promise<void> {
  try {
    const { data: lista } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const x = (lista?.users || []).find((u: any) => (u.email || "").toLowerCase() === (email || "").toLowerCase());
    if (x) await client.auth.admin.deleteUser(x.id);
  } catch { /* noop: la fila espejo + RLS siguen bloqueando el acceso */ }
}

/* ¿Existe este correo como usuario real de Supabase Auth? */
export async function existeEnAuth(client: SupabaseClient, email: string): Promise<boolean> {
  try {
    const { data: lista } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    return (lista?.users || []).some((u: any) => (u.email || "").toLowerCase() === (email || "").toLowerCase());
  } catch { return false; }
}

/* ============================================================
   SINCRONIZACIÓN MASIVA AUTOMÁTICA → Supabase Auth
   El cliente SOLO envía la contraseña en texto plano por HTTPS;
   Supabase la intercepta, aplica salt + bcrypt y guarda el hash
   AISLADO en su esquema interno auth.users. Nunca se sube un hash
   propio a la tabla pública "usuarios" cuando Auth está activo.

   ⚠️ DIAGNÓSTICO PREVIO OBLIGATORIO: los endpoints de administración
   (auth/v1/admin/*) exigen como Bearer UNA service_role key VÁLIDA para
   ESTE proyecto. Si se llama con la anon key —o con una service key de
   OTRO proyecto, caducada o mal copiada— Supabase responde
   "This endpoint requires a valid Bearer token". Antes de recorrer los
   usuarios se hace UNA sola verificación barata; si falla, se aborta con
   UN mensaje claro (en vez de repetir el mismo error por cada usuario).
   ============================================================ */
export type SyncAuthResultado = { creados: number; actualizados: number; omitidos: number; errores: string[] };

/* Verifica que el cliente tenga REALMENTE permisos de administración
   (service role válida). Devuelve null si todo está bien, o un mensaje
   de error accionable explicando las causas más comunes. */
export async function diagnosticarServiceRole(client: SupabaseClient): Promise<string | null> {
  try {
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) return null;
    const msg = String(error.message || "").toLowerCase();
    if (/bearer|invalid.*token|jwt/.test(msg)) {
      return "La Service Role Key NO es válida para este proyecto (Supabase respondió: «requires a valid Bearer token»). Causas típicas: 1) pegaste la ANON key donde va la service key; 2) la service key es de OTRO proyecto o fue ROTADA (regenerada) en Supabase; 3) quedó un espacio al inicio o final al copiarla. Consíguela en Supabase → Project Settings → API → service_role (secret), pégala completa en Configuración y vuelve a guardar.";
    }
    return `Supabase rechazó la verificación de la service role: ${error.message}`;
  } catch (e: any) {
    return `No hay acceso a supabase.auth (service role): ${e?.message || e}`;
  }
}

export async function sincronizarAuthMasivo(
  client: SupabaseClient,
  usuarios: Usuario[],
  opts: { limpiarEspejo?: boolean } = {},
): Promise<SyncAuthResultado> {
  const res: SyncAuthResultado = { creados: 0, actualizados: 0, omitidos: 0, errores: [] };
  /* Un solo diagnóstico antes del bucle: si la service key no sirve, abortar
     ya con mensaje claro (evita N errores repetidos del mismo tipo). */
  const diag = await diagnosticarServiceRole(client);
  if (diag) return { ...res, errores: [diag] };
  let lista: any[] = [];
  try {
    const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    lista = data?.users || [];
  } catch (e: any) {
    return { ...res, errores: [`Sin acceso a supabase.auth (service role): ${e?.message || e}`] };
  }
  const hashCol = await existeColumna(client, "usuarios", "password_hash") ? "password_hash" : "password";
  for (const u of usuarios) {
    const email = (u.email || "").trim().toLowerCase();
    if (!email) { res.omitidos++; continue; } /* sin correo no puede haber Auth real */
    /* La contraseña local viaja descifrada solo por HTTPS hacia Auth */
    const passPlana = descifrarPass(u.password || "");
    if (!passPlana) { res.omitidos++; continue; }
    const existente = lista.find((x: any) => (x.email || "").toLowerCase() === email);
    try {
      if (existente) {
        const { error } = await client.auth.admin.updateUserById(existente.id, {
          password: passPlana,
          user_metadata: { nombre: u.nombre, usuario: u.usuario, rol: u.rol },
        });
        if (error) { res.errores.push(`${u.nombre}: ${error.message}`); continue; }
        registrarPassCambio(u.id);
        res.actualizados++;
      } else {
        const { error } = await client.auth.admin.createUser({
          email, password: passPlana, email_confirm: true,
          user_metadata: { nombre: u.nombre, usuario: u.usuario, rol: u.rol },
        });
        if (error) { res.errores.push(`${u.nombre}: ${error.message}`); continue; }
        registrarPassCambio(u.id);
        res.creados++;
      }
      /* Fuente de verdad = auth.users: la tabla espejo queda SIN secreto */
      if (opts.limpiarEspejo) {
        const invalidas = await columnasNoValidas(client, "usuarios");
        const fila: any = { id: u.id, [hashCol]: "" };
        const limpio = Object.fromEntries(Object.entries(fila).filter(([k]) => !invalidas.includes(k)));
        await client.from("usuarios").update(limpio).eq("id", u.id);
      }
    } catch (e: any) {
      res.errores.push(`${u.nombre}: ${e?.message || e}`);
    }
  }
  return res;
}

/* Cambio directo de clave en supabase.auth sin conocer la anterior
   (requiere service role — solo lo usa el flujo de recuperación).
   Si el usuario no existe todavía en Auth, se crea con la nueva clave. */
export async function forzarPassAuth(client: SupabaseClient, email: string, passPlana: string, meta?: { nombre?: string; usuario?: string; rol?: string }): Promise<ResultadoAuth> {
  const correo = (email || "").trim();
  if (!correo) return { ok: false, error: "Falta el correo del usuario." };
  let existente: any = null;
  try {
    const { data: lista } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    existente = (lista?.users || []).find((x: any) => (x.email || "").toLowerCase() === correo.toLowerCase()) || null;
  } catch (e: any) {
    return { ok: false, error: `Sin acceso a supabase.auth (service role): ${e?.message || e}` };
  }
  if (existente) {
    const { error } = await client.auth.admin.updateUserById(existente.id, { password: passPlana });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await client.auth.admin.createUser({
    email: correo, password: passPlana, email_confirm: true,
    user_metadata: { nombre: meta?.nombre, usuario: meta?.usuario, rol: meta?.rol },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function descargarTodo(client: SupabaseClient): Promise<Record<string, any[]>> {
  const rows: Record<string, any[]> = {};
  for (const { tabla } of DB_TABLES) {
    /* Paginado de 1000 en 1000: PostgREST corta la respuesta sin "range",
       así que sin esto solo bajarían los primeros 1000 registros por tabla. */
    const todos: any[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await client.from(tabla).select("*").range(desde, desde + 999);
      if (error) throw new Error(`${tabla}: ${error.message}`);
      const lote = data || [];
      todos.push(...lote);
      if (lote.length < 1000) break;
    }
    rows[tabla] = todos;
  }
  if ((rows.estudiantes?.length || 0) + (rows.escuelas?.length || 0) + (rows.configuracion?.length || 0) === 0)
    throw new Error("La base de datos en Supabase está vacía. Sube primero los datos del CRM.");
  return rows;
}
