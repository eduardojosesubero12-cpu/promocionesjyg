import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AdicionalItem, Cotizacion, CRMData, Estudiante, Pago } from "./data";
import { DB_TABLES } from "./data";

export const sbClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const codV = () => ({ carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" });

export function dbToRows(db: CRMData): Record<string, any[]> {
  return {
    escuelas: db.escuelas.map((e) => ({ id: e.id, nombre: e.nombre, director: e.director, telefono: e.telefono, direccion: e.direccion, estado: e.estado, municipio: e.municipio, anio_escolar: e.anioEscolar, observaciones: e.observaciones })),
    docentes: db.docentes.map((d) => ({ id: d.id, nombre: d.nombre, telefono: d.telefono, escuela_id: d.escuelaId || null, correo: d.correo, observaciones: d.observaciones })),
    estudiantes: db.estudiantes.map((e) => ({ id: e.id, pedido: e.pedido, nombre: e.nombre, telefono: e.telefono, representante: e.representante, ci: e.ci, escuela_id: e.escuelaId || null, docente_id: e.docenteId || null, grado: e.grado, seccion: e.seccion, paquete_id: e.paqueteId, precio_paquete: e.precioPaquete, estado_pedido: e.estadoPedido, fecha_registro: e.fechaRegistro, fecha_entrega: e.fechaEntrega || null, observaciones: e.observaciones, codigos: e.codigos, extra: { fechaNacimiento: e.fechaNacimiento, direccion: e.direccion, email: e.email, representanteCi: e.representanteCi, telefonoRepresentante: e.telefonoRepresentante, tallaCamisa: e.tallaCamisa, tallaAnillo: e.tallaAnillo, alergias: e.alergias, tutor2: e.tutor2, codigosExtra: e.codigosExtra, actualizado: e.actualizado } })),
    pagos: db.estudiantes.flatMap((e) => e.pagos.map((p) => ({ id: p.id, estudiante_id: e.id, fecha: p.fecha, monto: p.monto, metodo: p.metodo, bs: p.bs, tasa: p.tasa, usd: p.usd, referencia: p.referencia, observacion: p.observacion }))),
    adicionales_items: db.estudiantes.flatMap((e) => e.adicionales.map((a, i) => ({ id: `${e.id}-ad-${i}`, estudiante_id: e.id, producto: a.producto, cantidad: a.cantidad, precio: a.precio, talla: a.talla }))),
    cotizaciones: db.cotizaciones.map((c) => ({ id: c.id, numero: c.numero, fecha: c.fecha, cliente: c.cliente, telefono: c.telefono, escuela: c.escuela, paquete_id: c.paqueteId, estado: c.estado, nota: c.nota })),
    cotizacion_items: db.cotizaciones.flatMap((c) => c.adicionales.map((a, i) => ({ id: `${c.id}-it-${i}`, cotizacion_id: c.id, producto: a.producto, cantidad: a.cantidad, precio: a.precio, talla: a.talla }))),
    sesiones: db.sesiones.map((s) => ({ id: s.id, escuela_id: s.escuelaId || null, fecha: s.fecha, hora: s.hora, fotografo: s.fotografo, estado: s.estado, fotos: s.fotos, nota: s.nota })),
    eventos: db.eventos.map((e) => ({ id: e.id, fecha: e.fecha, hora: e.hora, titulo: e.titulo, tipo: e.tipo, escuela_id: e.escuelaId || null })),
    mensajes: db.mensajes.map((m) => ({ id: m.id, fecha: m.fecha, destinatario: m.destinatario, telefono: m.telefono, plantilla: m.plantilla, texto: m.texto })),
    usuarios: db.usuarios.map((u) => ({ id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol, activo: u.activo })),
    historial_tasas: db.historialTasas.map((h) => ({ id: h.id, fecha: h.fecha, usd: h.usd, euro: h.euro, paralelo: h.paralelo, fuente: h.fuente, actualizado: h.actualizado })),
    paquetes_escuelas: db.paquetesEscuelas.map((p) => ({ id: p.id, escuela_id: p.escuelaId, nombre: p.nombre, tipo_paquete_id: p.tipoPaqueteId, precio: p.precio, articulos: p.articulos, nota: p.nota, activo: p.activo, creado: p.creado })),
    configuracion: [{ id: "jyg", data: db.config, seq_pedido: db.seqPedido, seq_cot: db.seqCot, current_user_id: db.currentUserId }],
  };
}

export function rowsToDb(rows: Record<string, any[]>, base: CRMData): CRMData {
  const estudiantes: Estudiante[] = (rows.estudiantes || []).map((r) => {
    const x = r.extra || {};
    return {
      id: r.id, pedido: r.pedido, nombre: r.nombre, telefono: r.telefono || "", representante: r.representante || "", ci: r.ci || "",
      escuelaId: r.escuela_id || "", docenteId: r.docente_id || "", grado: r.grado || "Bachiller", seccion: r.seccion || "A",
      paqueteId: r.paquete_id || "premium", precioPaquete: Number(r.precio_paquete) || 0,
      adicionales: (rows.adicionales_items || []).filter((a) => a.estudiante_id === r.id).map((a): AdicionalItem => ({ producto: a.producto, cantidad: Number(a.cantidad), precio: Number(a.precio), talla: a.talla || "" })),
      pagos: (rows.pagos || []).filter((p) => p.estudiante_id === r.id).map((p): Pago => ({ id: p.id, fecha: p.fecha, monto: Number(p.monto), metodo: p.metodo, bs: !!p.bs, tasa: Number(p.tasa), usd: Number(p.usd), referencia: p.referencia || "", observacion: p.observacion || "" })),
      estadoPedido: r.estado_pedido || "Registrado", fechaRegistro: r.fecha_registro || "", fechaEntrega: r.fecha_entrega || "", observaciones: r.observaciones || "",
      codigos: { ...codV(), ...(r.codigos || {}) },
      fechaNacimiento: x.fechaNacimiento, direccion: x.direccion, email: x.email, representanteCi: x.representanteCi,
      telefonoRepresentante: x.telefonoRepresentante, tallaCamisa: x.tallaCamisa, tallaAnillo: x.tallaAnillo, alergias: x.alergias, tutor2: x.tutor2,
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
    escuelas: (rows.escuelas || []).map((e) => ({ id: e.id, nombre: e.nombre, director: e.director || "", telefono: e.telefono || "", direccion: e.direccion || "", estado: e.estado || "", municipio: e.municipio || "", anioEscolar: e.anio_escolar || "", observaciones: e.observaciones || "" })),
    docentes: (rows.docentes || []).map((d) => ({ id: d.id, nombre: d.nombre, telefono: d.telefono || "", escuelaId: d.escuela_id || "", correo: d.correo || "", observaciones: d.observaciones || "" })),
    estudiantes, cotizaciones,
    sesiones: (rows.sesiones || []).map((s) => ({ id: s.id, escuelaId: s.escuela_id || "", fecha: s.fecha || "", hora: s.hora || "", fotografo: s.fotografo || "", estado: s.estado || "Agendada", fotos: Number(s.fotos) || 0, nota: s.nota || "" })),
    eventos: (rows.eventos || []).map((e) => ({ id: e.id, fecha: e.fecha || "", hora: e.hora || "", titulo: e.titulo || "", tipo: e.tipo || "otro", escuelaId: e.escuela_id || undefined })),
    mensajes: (rows.mensajes || []).map((m) => ({ id: m.id, fecha: m.fecha || "", destinatario: m.destinatario || "", telefono: m.telefono || "", plantilla: m.plantilla || "", texto: m.texto || "" })),
    usuarios: (rows.usuarios || []).map((u) => ({ id: u.id, nombre: u.nombre, usuario: u.usuario || "", rol: u.rol || "operador", activo: !!u.activo })),
    historialTasas: (rows.historial_tasas || []).map((h) => ({ id: h.id, fecha: h.fecha, usd: Number(h.usd), euro: Number(h.euro), paralelo: Number(h.paralelo), fuente: h.fuente || "dolarapi", actualizado: Number(h.actualizado) || 0 })),
    paquetesEscuelas: (rows.paquetes_escuelas || []).map((p) => ({ id: p.id, escuelaId: p.escuela_id || "", nombre: p.nombre, tipoPaqueteId: p.tipo_paquete_id || "personalizado", precio: Number(p.precio) || 0, articulos: p.articulos || [], nota: p.nota || "", activo: !!p.activo, creado: p.creado || "" })),
    config: cfg?.data ? { ...base.config, ...cfg.data } : base.config,
    currentUserId: cfg?.current_user_id || base.currentUserId,
    seqPedido: cfg?.seq_pedido ?? base.seqPedido, seqCot: cfg?.seq_cot ?? base.seqCot,
  };
}

export async function probarConexion(client: SupabaseClient): Promise<{ tablas: number; filas: number }> {
  let tablas = 0, filas = 0;
  for (const { tabla } of DB_TABLES) {
    const { count, error } = await client.from(tabla).select("id", { count: "exact", head: true });
    if (error) throw new Error(`La tabla "${tabla}" no existe o no es accesible: ${error.message}`);
    tablas++; filas += count || 0;
  }
  return { tablas, filas };
}

const ORDEN = ["escuelas", "docentes", "estudiantes", "pagos", "adicionales_items", "cotizaciones", "cotizacion_items", "sesiones", "eventos", "mensajes", "usuarios", "historial_tasas", "paquetes_escuelas", "configuracion"];
export async function subirTodo(client: SupabaseClient, db: CRMData, onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void): Promise<void> {
  const rows = dbToRows(db);
  for (const tabla of ORDEN) {
    onTabla?.(tabla, "busy");
    try {
      const del = await client.from(tabla).delete().neq("id", "");
      if (del.error) throw new Error(del.error.message);
      const data = rows[tabla] || [];
      if (data.length > 0) {
        const ins = await client.from(tabla).insert(data);
        if (ins.error) throw new Error(ins.error.message);
      }
      onTabla?.(tabla, "ok", data.length);
    } catch (e: any) { onTabla?.(tabla, "err"); throw new Error(`${tabla}: ${e.message}`); }
  }
}

export async function descargarTodo(client: SupabaseClient): Promise<Record<string, any[]>> {
  const rows: Record<string, any[]> = {};
  for (const { tabla } of DB_TABLES) {
    const { data, error } = await client.from(tabla).select("*");
    if (error) throw new Error(`${tabla}: ${error.message}`);
    rows[tabla] = data || [];
  }
  if ((rows.estudiantes?.length || 0) + (rows.escuelas?.length || 0) + (rows.configuracion?.length || 0) === 0)
    throw new Error("La base de datos en Supabase está vacía. Sube primero los datos del CRM.");
  return rows;
}
