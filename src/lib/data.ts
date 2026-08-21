/* =============== Promociones JyG · capa de datos =============== */

export interface Pago { id: string; fecha: string; monto: number; metodo: string; bs: boolean; tasa: number; usd: number; referencia: string; observacion: string; }
export interface AdicionalItem { producto: string; cantidad: number; precio: number; talla: string; }
export interface Codigos { carnetAlumno: string; carnetRep: string; firmaLibro: string; togaBirrete: string; fotoLibre: string; fotoAdicional: string; }
export interface Estudiante {
  id: string; pedido: string; nombre: string; telefono: string; representante: string; ci: string;
  escuelaId: string; docenteId: string; grado: string; seccion: string;
  paqueteId: string; precioPaquete: number; adicionales: AdicionalItem[]; pagos: Pago[];
  estadoPedido: string; fechaRegistro: string; fechaEntrega: string; observaciones: string; codigos: Codigos;
}
export interface Escuela { id: string; nombre: string; director: string; telefono: string; direccion: string; estado: string; municipio: string; anioEscolar: string; observaciones: string; }
export interface Docente { id: string; nombre: string; telefono: string; escuelaId: string; correo: string; observaciones: string; }
export interface Cotizacion { id: string; numero: string; fecha: string; cliente: string; telefono: string; escuela: string; paqueteId: string; adicionales: AdicionalItem[]; estado: "Pendiente" | "Aceptada" | "Rechazada"; nota: string; }
export interface Sesion { id: string; escuelaId: string; fecha: string; hora: string; fotografo: string; estado: "Agendada" | "Realizada"; fotos: number; nota: string; }
export interface Evento { id: string; fecha: string; hora: string; titulo: string; tipo: "sesion" | "entrega" | "cobranza" | "otro"; escuelaId?: string; }
export interface MensajeLog { id: string; fecha: string; destinatario: string; telefono: string; plantilla: string; texto: string; }
export type Rol = "admin" | "operador" | "produccion" | "cobranza";
export interface Usuario { id: string; nombre: string; usuario: string; rol: Rol; activo: boolean; }
export interface HistorialTasa { id: string; fecha: string; usd: number; euro: number; paralelo: number; fuente: "dolarapi" | "manual"; actualizado: number; }
export interface PaqueteEscuelaItem { nombre: string; cantidad: number; }
export interface PaqueteEscuela {
  id: string; escuelaId: string; nombre: string; tipoPaqueteId: string; precio: number;
  articulos: PaqueteEscuelaItem[]; nota: string; activo: boolean; creado: string;
}
export interface Config {
  empresa: { nombre: string; rif: string; telefono: string; direccion: string };
  metodos: { id: string; nombre: string; bs: boolean; activo: boolean }[];
  precios: number[];
  usarApi: boolean; usarTasaManual: boolean; tasaFallback: number; tasaManualUSD: number; tasaManualEUR: number;
  supabaseUrl: string; supabaseKey: string; autoSyncCloud: boolean;
}
export interface OcrDraft { nombre: string; ci: string; fecha: string; raw: string; }

/* Forma completa de la base del CRM */
export interface CRMData {
  escuelas: Escuela[]; docentes: Docente[]; estudiantes: Estudiante[];
  cotizaciones: Cotizacion[]; sesiones: Sesion[]; eventos: Evento[];
  mensajes: MensajeLog[]; usuarios: Usuario[]; historialTasas: HistorialTasa[];
  paquetesEscuelas: PaqueteEscuela[];
  config: Config; currentUserId: string; seqPedido: number; seqCot: number;
}

/* Mapa módulo → tabla de PostgreSQL en Supabase */
export const DB_TABLES: { tabla: string; modulo: string }[] = [
  { tabla: "escuelas", modulo: "Escuelas" },
  { tabla: "docentes", modulo: "Profesores" },
  { tabla: "estudiantes", modulo: "Estudiantes" },
  { tabla: "pagos", modulo: "Pagos y abonos" },
  { tabla: "adicionales_items", modulo: "Adicionales vendidos" },
  { tabla: "cotizaciones", modulo: "Cotizaciones" },
  { tabla: "cotizacion_items", modulo: "Ítems de cotización" },
  { tabla: "sesiones", modulo: "Sesiones fotográficas" },
  { tabla: "eventos", modulo: "Agenda" },
  { tabla: "mensajes", modulo: "Mensajes" },
  { tabla: "usuarios", modulo: "Usuarios" },
  { tabla: "historial_tasas", modulo: "Historial de tasas" },
  { tabla: "paquetes_escuelas", modulo: "Paquetes por escuela" },
  { tabla: "configuracion", modulo: "Configuración" },
];

/* =============== Catálogos =============== */
export const API_DOLARES = "https://ve.dolarapi.com/v1/dolares";
export const API_EUROS = "https://ve.dolarapi.com/v1/euros";
export const OCR_CRED = { correo: "ocr-esca@thermal-scene-505819-t0.iam.gserviceaccount.com", id: "104968516099790647092", clave: "a1d27bff3a54da57c82e09ab6aed9ecd6d3e3901" };

export interface Paquete { id: string; nombre: string; precioBase: number; color: string; incluye: string[]; materiales: Record<string, number>; }
export const PAQUETES: Record<string, Paquete> = {
  basico: {
    id: "basico", nombre: "Básico", precioBase: 20, color: "#2f7ac2",
    incluye: ["8x12 Diploma", "Medalla", "4 Fotos Carnet", "1 Foto 6x8 Toga y Birrete"],
    materiales: { "Foto 8x12": 1, "Medalla": 1, "Foto carnet": 4, "Foto 6x8": 1 },
  },
  premium: {
    id: "premium", nombre: "Premium", precioBase: 40, color: "#0aaa67",
    incluye: ["1 Foto 8x12 Afiche", "1 Medalla", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola Diseñada", "1 Foto 10x15 Compañeros", "1 Foto Libre/Familiar", "1 Llavero"],
    materiales: { "Foto 8x12": 1, "Medalla": 1, "Foto carnet": 8, "Carnet Alumno": 4, "Carnet Representante": 4, "Estola": 1, "Foto 10x15": 1, "Foto 6x8": 1, "Llavero": 1 },
  },
  lujo: {
    id: "lujo", nombre: "Lujo", precioBase: 60, color: "#c98f00",
    incluye: ["1 Afiche 30x40", "1 Diploma 8x12", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola", "1 Foto 6x8 Compañeros", "1 Foto 6x8 Firma Libro", "1 Foto Libre/Familiar", "1 Llavero"],
    materiales: { "Afiche 30x40": 1, "Foto 8x12": 1, "Foto carnet": 8, "Carnet Alumno": 4, "Carnet Representante": 4, "Estola": 1, "Foto 6x8": 2, "Foto 10x15": 1, "Llavero": 1, "Medalla": 1 },
  },
};

export const ADICIONALES: { nombre: string; precio: number; conTalla: boolean; material?: string }[] = [
  { nombre: "Taza", precio: 8, conTalla: false },
  { nombre: "Franela", precio: 12, conTalla: true, material: "Franela" },
  { nombre: "Jersey", precio: 18, conTalla: true, material: "Jersey" },
  { nombre: "Chemisse Piqué", precio: 25, conTalla: true, material: "Chemisse" },
  { nombre: "Chemisse Sublimada", precio: 18, conTalla: true, material: "Chemisse" },
  { nombre: "Llavero", precio: 3.5, conTalla: false, material: "Llavero" },
  { nombre: "Estola", precio: 8, conTalla: true, material: "Estola" },
  { nombre: "Montura Vidrio 8x10", precio: 25, conTalla: false },
  { nombre: "Montura Vidrio 8x12", precio: 25, conTalla: false },
  { nombre: "Montura Vidrio 30x40", precio: 35, conTalla: false },
  { nombre: "Montura Vidrio 35x45", precio: 48, conTalla: false },
  { nombre: "Montura Laqueada 8x12", precio: 10, conTalla: false },
  { nombre: "Montura Laqueada 30x40", precio: 15, conTalla: false },
  { nombre: "Afiche Laqueado 30x40", precio: 30, conTalla: false },
  { nombre: "Fotobook", precio: 45, conTalla: false },
  { nombre: "Anillo", precio: 15, conTalla: true, material: "Anillo" },
  { nombre: "Álbum 8x10", precio: 10, conTalla: false },
  { nombre: "Álbum 6x8", precio: 8, conTalla: false },
];
export const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];
export const PRECIOS_BASE = [20, 22, 28, 30, 35, 40, 45, 48, 55, 60, 80, 110, 145];
export const GRADOS = ["Preescolar", "Sexto Grado", "Bachiller", "Técnicos"];
export const SECCIONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "U"];
export const ESTADOS_PEDIDO = ["Registrado", "Producción", "Impresión", "Empaque", "Entregado"];
export const METODOS_DEFAULT = [
  { id: "m1", nombre: "Divisas $", bs: false, activo: true },
  { id: "m2", nombre: "Pago Móvil", bs: true, activo: true },
  { id: "m3", nombre: "Zelle", bs: false, activo: true },
  { id: "m4", nombre: "Efectivo Bs", bs: true, activo: true },
  { id: "m5", nombre: "Trueque", bs: false, activo: true },
];
export const PLANTILLAS_MENSAJE = [
  { id: "p1", nombre: "Recordatorio de saldo", cuerpo: "Hola {{representante}}, le saluda Promociones JyG 🎓. Le recordamos que el saldo pendiente de {{estudiante}} es de {{saldo}}. Puede abonar por Pago Móvil, Zelle o divisas. ¡Gracias!" },
  { id: "p2", nombre: "Cotización de paquete", cuerpo: "Hola {{representante}} 👋. El paquete {{paquete}} para {{estudiante}} en {{escuela}} tiene un precio de {{precio}} e incluye: {{incluye}}. ¿Le reservamos el cupo?" },
  { id: "p3", nombre: "Pedido listo para entrega", cuerpo: "¡Buenas noticias, {{representante}}! 🎉 El paquete de {{estudiante}} está listo para entregar. Escríbanos para coordinar la entrega. Promociones JyG." },
];

/* =============== Helpers =============== */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const nfUSD = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtUSD = (n: number) => "$" + nfUSD.format(Math.round(n * 100) / 100);
export const fmtBs = (n: number) => "Bs. " + nfBs.format(Math.round(n * 100) / 100);
export const fmtFecha = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtHoraAgo = (ts: number) => {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
};
export const fmtHaceSegundos = (ts: number, now = Date.now()) => {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h`;
};
export const fmtFechaHoraViva = (ts: number, now = Date.now()) => {
  const d = new Date(ts);
  const hh = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  const dd = d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
  return d.toDateString() === new Date(now).toDateString() ? `hoy · ${hh}` : `${dd} · ${hh}`;
};

export interface Totales { total: number; abonado: number; saldo: number; estadoPago: string; partes: number; }
export const estudianteTotales = (e: Estudiante): Totales => {
  const total = e.precioPaquete + e.adicionales.reduce((s, a) => s + a.cantidad * a.precio, 0);
  const abonado = e.pagos.reduce((s, p) => s + p.usd, 0);
  const saldo = Math.max(0, Math.round((total - abonado) * 100) / 100);
  let estadoPago = "Pagado Completo";
  if (total > 0 && saldo > 0.009) {
    const frac = abonado / total;
    estadoPago = e.pagos.length === 0 ? "Sin Abonos" : frac < 1 / 3 ? "Primera Parte" : frac < 2 / 3 ? "Segunda Parte" : "Tercera Parte";
  }
  return { total, abonado: Math.round(abonado * 100) / 100, saldo, estadoPago, partes: e.pagos.length };
};
export const codigosCompletos = (e: Estudiante) => Object.values(e.codigos).every((c) => c.trim() !== "");

export function computeProduccion(estudiantes: Estudiante[]) {
  const materiales: Record<string, number> = {};
  const combos: Record<string, number> = {};
  const adicionales: Record<string, { cantidad: number; tallas: Record<string, number> }> = {};
  const add = (m: string, q: number) => { materiales[m] = (materiales[m] || 0) + q; };
  for (const e of estudiantes) {
    const p = PAQUETES[e.paqueteId];
    if (p) { combos[p.id] = (combos[p.id] || 0) + 1; for (const [m, q] of Object.entries(p.materiales)) add(m, q); }
    for (const a of e.adicionales) {
      const cat = ADICIONALES.find((x) => x.nombre === a.producto);
      if (!adicionales[a.producto]) adicionales[a.producto] = { cantidad: 0, tallas: {} };
      adicionales[a.producto].cantidad += a.cantidad;
      if (a.talla) adicionales[a.producto].tallas[a.talla] = (adicionales[a.producto].tallas[a.talla] || 0) + a.cantidad;
      if (cat?.material) add(cat.material, a.cantidad);
    }
  }
  return { materiales, combos, adicionales };
}
export const ORDEN_MATERIALES = ["Afiche 30x40", "Foto 8x12", "Foto 6x8", "Foto 10x15", "Foto carnet", "Medalla", "Estola", "Llavero", "Carnet Alumno", "Carnet Representante"];

export function cobrosSemanales(estudiantes: Estudiante[]): { label: string; total: number }[] {
  const out: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let total = 0;
    for (const e of estudiantes) for (const p of e.pagos) if (p.fecha === iso) total += p.usd;
    out.push({ label: d.toLocaleDateString("es-VE", { weekday: "short" }), total });
  }
  return out;
}

export const waLink = (tel: string, texto: string) => {
  let d = (tel || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "58" + d.slice(1);
  if (d.length === 10) d = "58" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
};
export const normalizePhone = (tel: string) => {
  let d = (tel || "").replace(/\D/g, "");
  if (d.startsWith("58")) d = "0" + d.slice(2);
  if (d.length === 11) return `${d.slice(0, 4)}-${d.slice(4, 7)}.${d.slice(7, 9)}.${d.slice(9)}`;
  return tel;
};
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (c: string | number) => `"${String(c).split('"').join('""')}"`;
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
}
export function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/* =============== OCR: extracción de campos venezolanos =============== */
export function parseOcr(raw: string): OcrDraft {
  const txt = (raw || "").toUpperCase();
  let nombre = "", ci = "", fecha = "";
  const mCi = txt.match(/V[\-.\s]?0?(\d{5,9})/) || txt.match(/(\d{6,9})/);
  if (mCi) ci = "V-" + mCi[1].padStart(8, "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const mNom = raw.match(/([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' ]{4,40})/g) || [];
  const basura = /REPUBLICA|BOLIVARIANA|VENEZUELA|CÉDULA|CEDULA|IDENTIDAD|REGISTRO|CIVIL|ACTA|NACIMIENTO|MINISTERIO|SERVICIO|ADMINISTRATIVO|SAIME|MUNICIPIO|ESTADO|DISTRITO|PARROQUIA|CARACAS|JUNTA|NACIONAL|FECHA|FIRMA|SELLO|GOBERNACION|ALCALDIA|INSCRITO|PRESENTADO|OTORGADA|NUMERO|NÚMERO|TOMO|FOLIO|EXPEDIENTE|MATRICULA|MATRÍCULA/;
  for (const c of mNom) { const limpio = c.trim(); if (limpio.length >= 6 && !basura.test(limpio)) { nombre = limpio.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()); break; } }
  const mF = raw.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/);
  if (mF) fecha = `${mF[3]}-${mF[2]}-${mF[1]}`;
  return { nombre, ci, fecha, raw };
}

/* =============== Semillas =============== */
const E = (id: string, nombre: string, director: string, telefono: string, municipio: string, estado: string): Escuela =>
  ({ id, nombre, director, telefono, direccion: `${municipio}, ${estado}`, estado, municipio, anioEscolar: "2025-2026", observaciones: "" });
export const SEED_ESCUELAS: Escuela[] = [
  E("es1", "U.E. Colegio San Agustín", "María Rodríguez", "0414-555.10.20", "Valencia", "Carabobo"),
  E("es2", "Liceo Bolivariano Los Samanes", "Pedro Gómez", "0424-555.33.44", "Maracay", "Aragua"),
  E("es3", "U.E. Nuestra Señora del Rosario", "Carmen Díaz", "0412-555.78.90", "Guacara", "Carabobo"),
];
export const SEED_DOCENTES: Docente[] = [
  { id: "do1", nombre: "Laura Martínez", telefono: "0414-111.22.33", escuelaId: "es1", correo: "laura.m@correo.com", observaciones: "6to grado A" },
  { id: "do2", nombre: "José Hernández", telefono: "0424-222.33.44", escuelaId: "es2", correo: "jose.h@correo.com", observaciones: "5to año" },
  { id: "do3", nombre: "Ana Torres", telefono: "0412-333.44.55", escuelaId: "es3", correo: "ana.t@correo.com", observaciones: "Preescolar" },
];

const pago = (dias: number, monto: number, metodo: string, bs: boolean, tasa: number, ref: string): Pago => {
  const d = new Date(); d.setDate(d.getDate() - dias);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { id: uid(), fecha: iso, monto, metodo, bs, tasa, usd: bs ? +(monto / tasa).toFixed(2) : monto, referencia: ref, observacion: "" };
};
let nPed = 2400;
const est = (nombre: string, ci: string, escuelaId: string, docenteId: string, grado: string, seccion: string, paqueteId: string, dias: number, pagosArr: Pago[], tel = "0414-555.00.00"): Estudiante => ({
  id: uid(), pedido: `P-${++nPed}`, nombre, telefono: tel, representante: nombre.split(" ")[0] === "María" ? "Carmen Pérez" : "Luis González", ci,
  escuelaId, docenteId, grado, seccion, paqueteId, precioPaquete: PAQUETES[paqueteId].precioBase,
  adicionales: [], pagos: pagosArr, estadoPedido: pagosArr.length >= 2 ? "Producción" : "Registrado",
  fechaRegistro: pago(dias, 0, "", false, 1, "").fecha, fechaEntrega: "", observaciones: "",
  codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
});
export const SEED_ESTUDIANTES: Estudiante[] = [
  est("María Fernanda López", "V-27.456.123", "es1", "do1", "Sexto Grado", "A", "premium", 32, [pago(30, 20, "Pago Móvil", true, 332, "000123456"), pago(12, 15, "Divisas $", false, 341, "")]),
  est("Carlos Eduardo Ruiz", "V-26.789.456", "es1", "do1", "Sexto Grado", "A", "lujo", 28, [pago(26, 30, "Zelle", false, 330, "ZL-8842")]),
  est("Valentina Herrera", "V-28.123.789", "es2", "do2", "Bachiller", "B", "lujo", 25, [pago(24, 60, "Divisas $", false, 329, "")], "0424-777.88.99"),
  est("Diego Alejandro Mora", "V-27.999.000", "es2", "do2", "Bachiller", "A", "basico", 20, [pago(18, 10, "Pago Móvil", true, 336, "000654321"), pago(6, 10, "Pago Móvil", true, 344, "000654888")]),
  est("Sofía Isabel Ramírez", "V-29.321.654", "es3", "do3", "Preescolar", "A", "basico", 15, []),
  est("Gabriel Andrés Silva", "V-26.555.111", "es3", "do3", "Preescolar", "B", "premium", 10, [pago(9, 40, "Efectivo Bs", true, 338, "")], "0412-321.65.98"),
];
export const SEED_COTIZACIONES: Cotizacion[] = [
  { id: uid(), numero: "COT-0301", fecha: todayISO(), cliente: "Roberto Medina", telefono: "0414-200.30.40", escuela: "U.E. Colegio San Agustín", paqueteId: "premium", adicionales: [{ producto: "Taza", cantidad: 2, precio: 8, talla: "" }], estado: "Pendiente", nota: "Interesado en 15 cupos para 6to grado." },
  { id: uid(), numero: "COT-0302", fecha: todayISO(), cliente: "Yolanda Castro", telefono: "0424-900.10.20", escuela: "Liceo Bolivariano Los Samanes", paqueteId: "lujo", adicionales: [], estado: "Aceptada", nota: "" },
];
const h = (dias: number, usd: number): HistorialTasa => {
  const d = new Date(); d.setDate(d.getDate() - dias);
  return { id: uid(), fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, usd, euro: +(usd * 1.085).toFixed(2), paralelo: +(usd * 1.06).toFixed(2), fuente: "dolarapi", actualizado: d.getTime() };
};
export const SEED_HISTORIAL: HistorialTasa[] = [
  h(14, 326.1), h(13, 327.4), h(12, 328.0), h(11, 329.5), h(10, 331.2), h(9, 332.8), h(8, 333.1),
  h(7, 335.0), h(6, 336.9), h(5, 338.4), h(4, 340.1), h(3, 341.7), h(2, 343.9), h(1, 346.2), h(0, 348.5),
].map((x, i) => ({ ...x, euro: +(x.usd * 1.085).toFixed(2), id: "sh" + i }));
export const SEED_USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Gerencia JyG", usuario: "admin", rol: "admin", activo: true },
  { id: "u2", nombre: "Gabriela R.", usuario: "gabriela", rol: "operador", activo: true },
  { id: "u3", nombre: "Taller Foto", usuario: "produccion", rol: "produccion", activo: true },
  { id: "u4", nombre: "Cobranza", usuario: "cobranza", rol: "cobranza", activo: true },
];
export const SEED_SESIONES: Sesion[] = [
  { id: uid(), escuelaId: "es1", fecha: todayISO(), hora: "09:00", fotografo: "Pedro Lugo", estado: "Agendada", fotos: 0, nota: "Toga y birrete en el patio central." },
  { id: uid(), escuelaId: "es2", fecha: todayISO(), hora: "14:30", fotografo: "Marta Silva", estado: "Realizada", fotos: 184, nota: "" },
];
export const SEED_EVENTOS: Evento[] = [
  { id: uid(), fecha: todayISO(), hora: "09:00", titulo: "Sesión San Agustín", tipo: "sesion", escuelaId: "es1" },
  { id: uid(), fecha: todayISO(), hora: "16:00", titulo: "Entrega Los Samanes", tipo: "entrega", escuelaId: "es2" },
];
export const SEED_CONFIG: Config = {
  empresa: { nombre: "Promociones JyG", rif: "J-40123456-7", telefono: "0414-555.00.01", direccion: "Valencia, Edo. Carabobo" },
  metodos: METODOS_DEFAULT, precios: [...PRECIOS_BASE],
  usarApi: true, usarTasaManual: false, tasaFallback: 348.5, tasaManualUSD: 348.5, tasaManualEUR: 384.2,
  supabaseUrl: "", supabaseKey: "", autoSyncCloud: false,
};
const artDe = (tipo: "basico" | "premium" | "lujo", extra?: PaqueteEscuelaItem[]): PaqueteEscuelaItem[] => [
  ...PAQUETES[tipo].incluye.map((nombre) => ({ nombre, cantidad: 1 })),
  ...(extra || []),
];
export const SEED_PAQUETES_ESCUELAS: PaqueteEscuela[] = [
  { id: "pe1", escuelaId: "es1", nombre: "Paquete Premium San Agustín", tipoPaqueteId: "premium", precio: 45, articulos: artDe("premium", [{ nombre: "Taza con logo del colegio", cantidad: 1 }]), nota: "Acuerdo con la directiva 2025-2026.", activo: true, creado: todayISO() },
  { id: "pe2", escuelaId: "es2", nombre: "Lujo Promo Los Samanes", tipoPaqueteId: "lujo", precio: 60, articulos: artDe("lujo"), nota: "", activo: true, creado: todayISO() },
  { id: "pe3", escuelaId: "es3", nombre: "Básico Preescolar Rosario", tipoPaqueteId: "basico", precio: 22, articulos: artDe("basico"), nota: "Precio especial preescolar.", activo: true, creado: todayISO() },
];

/* =============== Esquema Supabase (una tabla por módulo) =============== */
export const SUPABASE_SQL = `-- Promociones JyG · Ejecutar en Supabase → SQL Editor → Run
create table if not exists escuelas (
  id text primary key, nombre text not null, director text default '', telefono text default '',
  direccion text default '', estado text default '', municipio text default '',
  anio_escolar text default '', observaciones text default ''
);
create table if not exists docentes (
  id text primary key, nombre text not null, telefono text default '',
  escuela_id text references escuelas(id) on delete set null,
  correo text default '', observaciones text default ''
);
create table if not exists estudiantes (
  id text primary key, pedido text unique not null, nombre text not null, telefono text default '',
  representante text default '', ci text default '',
  escuela_id text references escuelas(id) on delete set null,
  docente_id text references docentes(id) on delete set null,
  grado text default 'Bachiller', seccion text default 'A',
  paquete_id text default 'premium', precio_paquete numeric(12,2) default 0,
  estado_pedido text default 'Registrado', fecha_registro text default '',
  fecha_entrega text default '', observaciones text default '', codigos jsonb default '{}'::jsonb
);
create table if not exists pagos (
  id text primary key, estudiante_id text not null references estudiantes(id) on delete cascade,
  fecha text not null, monto numeric(14,2) default 0, metodo text default '',
  bs boolean default false, tasa numeric(12,4) default 0, usd numeric(14,2) default 0,
  referencia text default '', observacion text default ''
);
create table if not exists adicionales_items (
  id text primary key, estudiante_id text not null references estudiantes(id) on delete cascade,
  producto text not null, cantidad int default 1, precio numeric(12,2) default 0, talla text default ''
);
create table if not exists cotizaciones (
  id text primary key, numero text not null, fecha text default '', cliente text default '',
  telefono text default '', escuela text default '', paquete_id text default 'premium',
  estado text default 'Pendiente', nota text default ''
);
create table if not exists cotizacion_items (
  id text primary key, cotizacion_id text not null references cotizaciones(id) on delete cascade,
  producto text not null, cantidad int default 1, precio numeric(12,2) default 0, talla text default ''
);
create table if not exists sesiones (
  id text primary key, escuela_id text references escuelas(id) on delete set null,
  fecha text default '', hora text default '', fotografo text default '',
  estado text default 'Agendada', fotos int default 0, nota text default ''
);
create table if not exists eventos (
  id text primary key, fecha text default '', hora text default '', titulo text not null,
  tipo text default 'otro', escuela_id text
);
create table if not exists mensajes (
  id text primary key, fecha text default '', destinatario text default '',
  telefono text default '', plantilla text default '', texto text default ''
);
create table if not exists usuarios (
  id text primary key, nombre text not null, usuario text default '',
  rol text default 'operador', activo boolean default true
);
create table if not exists historial_tasas (
  id text primary key, fecha text not null, usd numeric(12,4) default 0, euro numeric(12,4) default 0,
  paralelo numeric(12,4) default 0, fuente text default 'dolarapi', actualizado bigint default 0
);
create table if not exists paquetes_escuelas (
  id text primary key, escuela_id text not null references escuelas(id) on delete cascade,
  nombre text not null, tipo_paquete_id text default 'personalizado',
  precio numeric(12,2) default 0, articulos jsonb default '[]'::jsonb,
  nota text default '', activo boolean default true, creado text default ''
);
create table if not exists configuracion (
  id text primary key, data jsonb default '{}'::jsonb,
  seq_pedido int default 1, seq_cot int default 1, seq_cod int default 1, current_user_id text default ''
);
create index if not exists idx_estudiantes_escuela on estudiantes(escuela_id);
create index if not exists idx_estudiantes_pedido on estudiantes(pedido);
create index if not exists idx_pagos_estudiante on pagos(estudiante_id);
create index if not exists idx_adicionales_estudiante on adicionales_items(estudiante_id);
create index if not exists idx_cotizacion_items on cotizacion_items(cotizacion_id);
create index if not exists idx_paquetes_escuelas on paquetes_escuelas(escuela_id);
alter table escuelas enable row level security; alter table docentes enable row level security;
alter table estudiantes enable row level security; alter table pagos enable row level security;
alter table adicionales_items enable row level security; alter table cotizaciones enable row level security;
alter table cotizacion_items enable row level security; alter table sesiones enable row level security;
alter table eventos enable row level security; alter table mensajes enable row level security;
alter table usuarios enable row level security; alter table historial_tasas enable row level security;
alter table paquetes_escuelas enable row level security; alter table configuracion enable row level security;
do $$ declare t text;
begin
  foreach t in array array['escuelas','docentes','estudiantes','pagos','adicionales_items','cotizaciones','cotizacion_items','sesiones','eventos','mensajes','usuarios','historial_tasas','paquetes_escuelas','configuracion'] loop
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_all', t);
  end loop;
end $$;`;
