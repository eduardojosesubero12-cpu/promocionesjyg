import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AdicionalItem, Cotizacion, CRMData, Estudiante, Pago, Usuario } from "./data";
import { DB_TABLES } from "./data";

/* Credenciales por defecto: del .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
   y, si no están, las del proyecto del equipo. Así la conexión nunca queda vacía. */
const ENV_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://kdzofrxquzhtixzjtgmx.supabase.co";
const ENV_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_ibQlrVHQi9oqKd5iw3X3CA_fpSMjzFq";
export const SUPABASE_DEFAULTS = { url: ENV_URL, key: ENV_KEY };
export const sbClient = (url?: string, key?: string): SupabaseClient =>
  createClient(url?.trim() || ENV_URL, key?.trim() || ENV_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

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
    usuarios: db.usuarios.map((u) => { const r: any = { id: u.id, nombre: u.nombre, email: u.email || "", rol: u.rol, activo: u.activo, [hashCol]: cifrarPass(u.password || "") }; if (usuarioCol) r.usuario = u.usuario; return r; }),
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
