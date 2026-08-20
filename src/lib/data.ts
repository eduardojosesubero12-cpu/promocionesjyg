/* =============== Tipos =============== */
export type Rol = "admin" | "operador" | "produccion" | "cobranza";

export interface Escuela {
  id: string; nombre: string; director: string; telefono: string; direccion: string;
  estado: string; municipio: string; anioEscolar: string; observaciones: string;
}
export interface Docente { id: string; nombre: string; telefono: string; escuelaId: string; correo: string; observaciones: string; }

export interface Pago {
  id: string; fecha: string; monto: number; metodo: string; bs: boolean;
  tasa: number; usd: number; referencia: string; observacion: string;
}
export interface AdicionalItem { producto: string; cantidad: number; precio: number; talla: string; }

export interface Estudiante {
  id: string; nombre: string; telefono: string; representante: string; ci: string;
  escuelaId: string; docenteId: string; grado: string; seccion: string;
  paqueteId: string; precioPaquete: number; adicionales: AdicionalItem[];
  pagos: Pago[]; estadoPedido: string; fechaRegistro: string; fechaEntrega: string;
  pedido: string; observaciones: string;
  codigos: { carnetAlumno: string; carnetRep: string; firmaLibro: string; togaBirrete: string; fotoLibre: string; fotoAdicional: string };
}

export interface Cotizacion {
  id: string; numero: string; fecha: string; cliente: string; telefono: string; escuela: string;
  paqueteId: string; adicionales: AdicionalItem[]; estado: "Pendiente" | "Aceptada" | "Rechazada"; nota: string;
}
export interface Sesion { id: string; escuelaId: string; fecha: string; hora: string; fotografo: string; estado: "Agendada" | "Realizada"; fotos: number; nota: string; }
export interface Evento { id: string; fecha: string; hora: string; titulo: string; tipo: "sesion" | "entrega" | "cobranza" | "otro"; escuelaId?: string; }
export interface MensajeLog { id: string; fecha: string; destinatario: string; telefono: string; plantilla: string; texto: string; }
export interface Usuario { id: string; nombre: string; usuario: string; rol: Rol; activo: boolean; }
export interface HistorialTasa { id: string; fecha: string; usd: number; euro: number; paralelo: number; fuente: "dolarapi" | "manual"; actualizado: number; }

export interface Config {
  empresa: { nombre: string; rif: string; telefono: string; direccion: string };
  preciosPaquetes: number[];
  metodos: { id: string; nombre: string; bs: boolean; activo: boolean }[];
  usarApi: boolean; usarTasaManual: boolean; tasaFallback: number; tasaManualUSD: number; tasaManualEUR: number; historialAuto: boolean;
  supabaseUrl: string; supabaseKey: string; autoSyncCloud: boolean;
}

export interface OcrDraft { nombre: string; ci: string; fecha: string; raw: string; }

/* Forma completa de la base del CRM (la usa el sincronizador de Supabase) */
export interface CRMData {
  escuelas: Escuela[]; docentes: Docente[]; estudiantes: Estudiante[];
  cotizaciones: Cotizacion[]; sesiones: Sesion[]; eventos: Evento[];
  mensajes: MensajeLog[]; usuarios: Usuario[]; historialTasas: HistorialTasa[];
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
  { tabla: "configuracion", modulo: "Configuración" },
];

/* =============== Constantes =============== */
export const GRADOS = ["Preescolar", "Sexto Grado", "Bachiller", "Técnicos"];
export const SECCIONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "U"];
export const ESTADOS_PEDIDO = ["Registrado", "Producción", "Impresión", "Empaque", "Entregado"];
export const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

export const PAQUETES: Record<string, { id: string; nombre: string; color: string; precioBase: number; incluye: string[] }> = {
  basico: {
    id: "basico", nombre: "Básico", color: "#2f7ac2", precioBase: 20,
    incluye: ["8x12 Diploma", "Medalla", "4 Fotos Carnet", "1 Foto 6x8 Toga y Birrete"],
  },
  premium: {
    id: "premium", nombre: "Premium", color: "#104172", precioBase: 40,
    incluye: ["1 Foto 8x12 Afiche", "1 Medalla", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola Diseñada", "1 Foto 10x15 Compañeros", "1 Foto Libre/Familiar", "1 Llavero"],
  },
  lujo: {
    id: "lujo", nombre: "Lujo", color: "#c98f00", precioBase: 60,
    incluye: ["1 Afiche 30x40", "1 Diploma 8x12", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola", "1 Foto 6x8 Compañeros", "1 Foto 6x8 Firma Libro", "1 Foto Libre/Familiar", "1 Llavero"],
  },
};

export const ADICIONALES: { nombre: string; precio: number; conTalla: boolean; tallaNumerica?: boolean }[] = [
  { nombre: "Taza", precio: 8, conTalla: false },
  { nombre: "Franela", precio: 12, conTalla: true },
  { nombre: "Jersey", precio: 18, conTalla: true },
  { nombre: "Chemisse Piqué", precio: 25, conTalla: true },
  { nombre: "Chemisse Sublimada", precio: 18, conTalla: true },
  { nombre: "Llavero", precio: 3.5, conTalla: false },
  { nombre: "Estola", precio: 8, conTalla: true },
  { nombre: "Montura Vidrio 8x10", precio: 25, conTalla: false },
  { nombre: "Montura Vidrio 8x12", precio: 25, conTalla: false },
  { nombre: "Montura Vidrio 30x40", precio: 35, conTalla: false },
  { nombre: "Montura Vidrio 35x45", precio: 48, conTalla: false },
  { nombre: "Montura Laqueada 8x12", precio: 10, conTalla: false },
  { nombre: "Montura Laqueada 30x40", precio: 15, conTalla: false },
  { nombre: "Afiche Laqueado 30x40", precio: 30, conTalla: false },
  { nombre: "Fotobook", precio: 45, conTalla: false },
  { nombre: "Anillo", precio: 15, conTalla: true, tallaNumerica: true },
  { nombre: "Álbum 8x10", precio: 10, conTalla: false },
  { nombre: "Álbum 6x8", precio: 8, conTalla: false },
];

export const PRECIOS_PAQUETE = [20, 22, 28, 30, 35, 40, 45, 48, 55, 60, 80, 110, 145];

export const CODIGO_PREFIJOS: [keyof Estudiante["codigos"], string][] = [
  ["carnetAlumno", "Código Carnet Alumno"],
  ["carnetRep", "Código Carnet Representante"],
  ["firmaLibro", "Código Firma Libro"],
  ["togaBirrete", "Código Toga y Birrete"],
  ["fotoLibre", "Código Foto Libre"],
  ["fotoAdicional", "Código Foto Adicional"],
];

/* Materiales que aporta cada paquete */
const MATERIALES_PAQUETE: Record<string, Record<string, number>> = {
  basico: { "Foto 8x12": 1, Medalla: 1, "Foto Carnet": 4, "Foto 6x8": 1 },
  premium: { "Foto 8x12": 1, Medalla: 1, "Foto Carnet": 8, Estola: 1, "Foto 10x15": 1, "Foto 6x8": 1, Llavero: 1, "Carnet Alumno": 4, "Carnet Representante": 4 },
  lujo: { "Afiche 30x40": 1, "Foto 8x12": 1, "Foto Carnet": 8, Estola: 1, "Foto 6x8": 2, Llavero: 1, "Carnet Alumno": 4, "Carnet Representante": 4 },
};
export const ORDEN_MATERIALES = ["Afiche 30x40", "Foto 8x12", "Foto 6x8", "Foto 10x15", "Foto Carnet", "Medalla", "Estola", "Llavero", "Carnet Alumno", "Carnet Representante"];

export const API_DOLARES = "https://ve.dolarapi.com/v1/dolares";
export const API_EUROS = "https://ve.dolarapi.com/v1/euros";
export const OCR_CRED = {
  email: "ocr-esca@thermal-scene-505819-t0.iam.gserviceaccount.com",
  id: "104968516099790647092",
  clave: "a1d27bff3a54da57c82e09ab6aed9ecd6d3e3901",
};

export const PLANTILLAS_MENSAJE = [
  { id: "saldo", nombre: "Recordatorio de saldo", cuerpo: "Hola {{representante}}, le saluda Promociones JyG 🎓. Le recordamos que el paquete {{paquete}} de {{estudiante}} tiene un saldo pendiente de {{saldo}}. ¡Gracias por confiar en nosotros!" },
  { id: "cotizacion", nombre: "Cotización de paquete", cuerpo: "Hola {{representante}}, le saluda Promociones JyG 🎓. El paquete {{paquete}} para {{estudiante}} ({{escuela}}) tiene un precio de {{precio}} e incluye: {{incluye}}. ¿Le gustaría reservarlo?" },
  { id: "entrega", nombre: "Pedido listo para entrega", cuerpo: "¡Buenas noticias {{representante}}! 🎉 El pedido de {{estudiante}} está listo para entregar. Puede pasar a retirarlo cuando guste. Promociones JyG 🎓." },
];

/* =============== Helpers =============== */
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const todayISO = () => new Date().toISOString().slice(0, 10);

const nfUSD = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtUSD = (n: number) => "$" + nfUSD.format(Math.round(n * 100) / 100);
export const fmtBs = (n: number) => "Bs. " + nfBs.format(Math.round(n * 100) / 100);
export const fmtNum = (n: number) => new Intl.NumberFormat("es-VE").format(n);

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
  return `hace ${Math.floor(m / 60)} h`;
};
export const fmtFechaHoraViva = (ts: number, now = Date.now()) => {
  const d = new Date(ts);
  const hh = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  const dd = d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
  const hoy = new Date(now).toDateString();
  return d.toDateString() === hoy ? `hoy · ${hh}` : `${dd} · ${hh}`;
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
  const combos: Record<string, number> = { basico: 0, premium: 0, lujo: 0 };
  const adicionales: Record<string, { cantidad: number; tallas: Record<string, number> }> = {};
  for (const e of estudiantes) {
    combos[e.paqueteId] = (combos[e.paqueteId] || 0) + 1;
    const mat = MATERIALES_PAQUETE[e.paqueteId] || {};
    for (const [m, q] of Object.entries(mat)) materiales[m] = (materiales[m] || 0) + q;
    for (const a of e.adicionales) {
      if (!adicionales[a.producto]) adicionales[a.producto] = { cantidad: 0, tallas: {} };
      adicionales[a.producto].cantidad += a.cantidad;
      if (a.talla) adicionales[a.producto].tallas[a.talla] = (adicionales[a.producto].tallas[a.talla] || 0) + a.cantidad;
    }
  }
  return { materiales, combos, adicionales };
}

export function cobrosSemanales(estudiantes: Estudiante[]) {
  const dias: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    let total = 0;
    for (const e of estudiantes) for (const p of e.pagos) if (p.fecha === iso) total += p.usd;
    dias.push({ label: d.toLocaleDateString("es-VE", { weekday: "short" }), total });
  }
  return dias;
}

export const toCSV = (headers: string[], rows: (string | number)[][]) =>
  "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${String(c).split('"').join('""')}"`).join(";")).join("\n");

export function downloadFile(nombre: string, contenido: string, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

export const waLink = (telefono: string, texto: string) => {
  const num = (telefono || "").replace(/\D/g, "");
  const full = num.length === 10 ? "58" + num.slice(1) : num;
  return `https://wa.me/${full}?text=${encodeURIComponent(texto)}`;
};

export const parseOcr = (text: string): OcrDraft => {
  const raw = text || "";
  let ci = "";
  const ciM = raw.match(/\b([VvEe])\s*[-–.]?\s*(\d{1,3}(?:[.\s]\d{3})+|\d{6,9})\b/);
  if (ciM) ci = ciM[1].toUpperCase() + "-" + ciM[2].replace(/[.\s]/g, "");
  let nombre = "";
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const idx = lines.findIndex((l) => /(nombres?\s*(del|de)?\s*(alumno|estudiante|ni[ñn]o)|nombres?\s*:)/i.test(l));
  if (idx >= 0) {
    const after = lines[idx].split(/:/)[1]?.trim();
    nombre = after || lines[idx + 1] || "";
  }
  if (!nombre) {
    const caps = lines.filter((l) => /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.]{6,}$/.test(l));
    nombre = caps.find((l) => !/(REPUBLICA|VENEZUELA|MINISTERIO|CEDULA|IDENTIDAD|REGISTRO|CIVIL)/i.test(l)) || "";
  }
  let fecha = "";
  const fM = raw.match(/(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/);
  if (fM) fecha = fM[1];
  return { nombre: nombre.trim().slice(0, 70), ci, fecha, raw };
};

/* =============== Seeds =============== */
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

const codVacio = () => ({ carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" });
let codSeq = 2401;
const nextCod = () => `F-${codSeq++}`;
const codLleno = () => ({ carnetAlumno: nextCod(), carnetRep: nextCod(), firmaLibro: nextCod(), togaBirrete: nextCod(), fotoLibre: nextCod(), fotoAdicional: nextCod() });

const P = (fecha: string, monto: number, metodo: string, bs: boolean, tasa: number, referencia = ""): Pago => ({
  id: uid(), fecha, monto, metodo, bs, tasa, usd: bs ? +(monto / tasa).toFixed(2) : monto, referencia, observacion: "",
});

const Est = (p: Partial<Estudiante> & { nombre: string }): Estudiante => ({
  id: uid(), telefono: "", representante: "", ci: "", escuelaId: "es1", docenteId: "do1", grado: "Sexto Grado",
  seccion: "A", paqueteId: "premium", precioPaquete: 40, adicionales: [], pagos: [], estadoPedido: "Registrado",
  fechaRegistro: todayISO(), fechaEntrega: "", pedido: "", observaciones: "", codigos: codVacio(), ...p,
});

export const SEED_ESTUDIANTES: Estudiante[] = [
  Est({ nombre: "Sofía Pérez González", ci: "V-30.112.458", representante: "Carolina Pérez", telefono: "0414-901.20.31", escuelaId: "es1", docenteId: "do1", grado: "Sexto Grado", seccion: "A", paqueteId: "lujo", precioPaquete: 60, adicionales: [{ producto: "Taza", cantidad: 2, precio: 8, talla: "" }, { producto: "Franela", cantidad: 1, precio: 12, talla: "M" }], pagos: [P("2025-10-06", 20, "Divisas $", false, 342.1), P("2025-10-20", 5150, "Pago Móvil", true, 345.9, "000123456")], estadoPedido: "Producción", fechaRegistro: "2025-10-05", pedido: "PD-2401", codigos: codLleno() }),
  Est({ nombre: "Diego Ramírez Silva", ci: "V-30.224.871", representante: "Luis Ramírez", telefono: "0424-902.31.42", escuelaId: "es1", docenteId: "do1", grado: "Sexto Grado", seccion: "A", paqueteId: "premium", precioPaquete: 40, pagos: [P("2025-10-08", 40, "Zelle", false, 343.2, "ZL-8871")], estadoPedido: "Impresión", fechaRegistro: "2025-10-07", pedido: "PD-2402", codigos: codLleno() }),
  Est({ nombre: "Valeria Rojas Medina", ci: "V-31.005.342", representante: "María Rojas", telefono: "0412-903.42.53", escuelaId: "es2", docenteId: "do2", grado: "Bachiller", seccion: "B", paqueteId: "lujo", precioPaquete: 80, adicionales: [{ producto: "Fotobook", cantidad: 1, precio: 45, talla: "" }], pagos: [P("2025-10-10", 60, "Divisas $", false, 344.5)], estadoPedido: "Registrado", fechaRegistro: "2025-10-09", pedido: "PD-2403" }),
  Est({ nombre: "Gabriel Fernández L.", ci: "V-31.480.912", representante: "Gabriel Fernández", telefono: "0414-904.53.64", escuelaId: "es2", docenteId: "do2", grado: "Bachiller", seccion: "A", paqueteId: "premium", precioPaquete: 45, adicionales: [{ producto: "Jersey", cantidad: 1, precio: 18, talla: "L" }], pagos: [P("2025-09-28", 25, "Efectivo Bs", true, 338.4), P("2025-10-15", 20, "Divisas $", false, 346.0)], estadoPedido: "Empaque", fechaRegistro: "2025-09-27", pedido: "PD-2404", codigos: codLleno() }),
  Est({ nombre: "Mariana Castro Ruiz", representante: "Paola Ruiz", telefono: "0424-905.64.75", escuelaId: "es3", docenteId: "do3", grado: "Preescolar", seccion: "U", paqueteId: "basico", precioPaquete: 22, pagos: [P("2025-10-12", 22, "Pago Móvil", true, 345.1, "000789123")], estadoPedido: "Entregado", fechaRegistro: "2025-10-11", fechaEntrega: "2025-11-02", pedido: "PD-2405", codigos: codLleno() }),
  Est({ nombre: "Alejandro Silva Mora", ci: "V-32.118.730", representante: "Andreína Mora", telefono: "0412-906.75.86", escuelaId: "es1", docenteId: "do1", grado: "Sexto Grado", seccion: "B", paqueteId: "basico", precioPaquete: 20, adicionales: [{ producto: "Llavero", cantidad: 3, precio: 3.5, talla: "" }], pagos: [P("2025-10-18", 15, "Divisas $", false, 347.3)], estadoPedido: "Registrado", fechaRegistro: "2025-10-17", pedido: "PD-2406" }),
  Est({ nombre: "Isabella Torres Peña", ci: "V-30.871.559", representante: "Pedro Torres", telefono: "0414-907.86.97", escuelaId: "es3", docenteId: "do3", grado: "Preescolar", seccion: "A", paqueteId: "premium", precioPaquete: 40, pagos: [P("2025-10-02", 20, "Divisas $", false, 340.8), P("2025-10-22", 20, "Zelle", false, 348.6, "ZL-9012")], estadoPedido: "Impresión", fechaRegistro: "2025-10-01", pedido: "PD-2407", codigos: codLleno() }),
  Est({ nombre: "Sebastián Gil Herrera", representante: "Verónica Gil", telefono: "0424-908.97.08", escuelaId: "es2", docenteId: "do2", grado: "Técnicos", seccion: "C", paqueteId: "premium", precioPaquete: 48, adicionales: [{ producto: "Chemisse Piqué", cantidad: 1, precio: 25, talla: "XL" }], pagos: [], estadoPedido: "Registrado", fechaRegistro: "2025-10-24", pedido: "PD-2408" }),
  Est({ nombre: "Camila Mendoza V.", ci: "V-31.902.664", representante: "Ramón Mendoza", telefono: "0412-909.08.19", escuelaId: "es1", docenteId: "do1", grado: "Sexto Grado", seccion: "A", paqueteId: "lujo", precioPaquete: 60, adicionales: [{ producto: "Montura Laqueada 30x40", cantidad: 1, precio: 15, talla: "" }, { producto: "Anillo", cantidad: 1, precio: 15, talla: "18" }], pagos: [P("2025-10-05", 45, "Divisas $", false, 341.9), P("2025-10-19", 15400, "Pago Móvil", true, 347.8, "000456321")], estadoPedido: "Producción", fechaRegistro: "2025-10-04", pedido: "PD-2409" }),
  Est({ nombre: "Mateo López Duarte", ci: "V-32.554.208", representante: "Daniela Duarte", telefono: "0414-910.19.20", escuelaId: "es3", docenteId: "do3", grado: "Preescolar", seccion: "B", paqueteId: "basico", precioPaquete: 20, pagos: [P("2025-10-25", 10, "Efectivo Bs", true, 349.0)], estadoPedido: "Registrado", fechaRegistro: "2025-10-25", pedido: "PD-2410" }),
];

export const SEED_USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Administrador JyG", usuario: "admin", rol: "admin", activo: true },
  { id: "u2", nombre: "Carla Operadora", usuario: "operador", rol: "operador", activo: true },
  { id: "u3", nombre: "Taller Producción", usuario: "produccion", rol: "produccion", activo: true },
  { id: "u4", nombre: "Ana Cobranza", usuario: "cobranza", rol: "cobranza", activo: true },
];

export const SEED_CONFIG: Config = {
  empresa: { nombre: "Promociones JyG", rif: "J-40123456-7", telefono: "0414-555.00.11", direccion: "Valencia, Edo. Carabobo" },
  preciosPaquetes: [...PRECIOS_PAQUETE],
  metodos: [
    { id: "m1", nombre: "Divisas $", bs: false, activo: true },
    { id: "m2", nombre: "Pago Móvil", bs: true, activo: true },
    { id: "m3", nombre: "Zelle", bs: false, activo: true },
    { id: "m4", nombre: "Efectivo Bs", bs: true, activo: true },
    { id: "m5", nombre: "Trueque", bs: true, activo: true },
  ],
  usarApi: true, usarTasaManual: false, tasaFallback: 348.5, tasaManualUSD: 348.5, tasaManualEUR: 384.2, historialAuto: true,
  supabaseUrl: "", supabaseKey: "", autoSyncCloud: false,
};

/* =============== Esquema SQL para Supabase (un tabla por módulo) =============== */
export const SUPABASE_SQL = `-- ============================================================
-- CRM Promociones JyG — Esquema de base de datos (Supabase / PostgreSQL)
-- Un tabla por cada módulo. Pegar en: Supabase > SQL Editor > Run
-- ============================================================

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

create table if not exists docentes (
  id text primary key,
  nombre text not null,
  telefono text default '',
  escuela_id text references escuelas(id) on delete set null,
  correo text default '',
  observaciones text default ''
);

create table if not exists estudiantes (
  id text primary key,
  pedido text not null,
  nombre text not null,
  telefono text default '',
  representante text default '',
  ci text default '',
  escuela_id text references escuelas(id) on delete set null,
  docente_id text references docentes(id) on delete set null,
  grado text default 'Bachiller',
  seccion text default 'A',
  paquete_id text default 'premium',
  precio_paquete numeric(12,2) default 0,
  estado_pedido text default 'Registrado',
  fecha_registro text default '',
  fecha_entrega text default '',
  observaciones text default '',
  codigos jsonb default '{}'::jsonb
);

create table if not exists pagos (
  id text primary key,
  estudiante_id text not null references estudiantes(id) on delete cascade,
  fecha text not null,
  monto numeric(12,2) not null default 0,
  metodo text default '',
  bs boolean default false,
  tasa numeric(12,4) default 0,
  usd numeric(12,2) default 0,
  referencia text default '',
  observacion text default ''
);

create table if not exists adicionales_items (
  id text primary key,
  estudiante_id text not null references estudiantes(id) on delete cascade,
  producto text not null,
  cantidad int default 1,
  precio numeric(12,2) default 0,
  talla text default ''
);

create table if not exists cotizaciones (
  id text primary key,
  numero text not null,
  fecha text default '',
  cliente text default '',
  telefono text default '',
  escuela text default '',
  paquete_id text default 'premium',
  estado text default 'Pendiente',
  nota text default ''
);

create table if not exists cotizacion_items (
  id text primary key,
  cotizacion_id text not null references cotizaciones(id) on delete cascade,
  producto text not null,
  cantidad int default 1,
  precio numeric(12,2) default 0,
  talla text default ''
);

create table if not exists sesiones (
  id text primary key,
  escuela_id text references escuelas(id) on delete set null,
  fecha text default '',
  hora text default '',
  fotografo text default '',
  estado text default 'Agendada',
  fotos int default 0,
  nota text default ''
);

create table if not exists eventos (
  id text primary key,
  fecha text default '',
  hora text default '',
  titulo text default '',
  tipo text default 'otro',
  escuela_id text
);

create table if not exists mensajes (
  id text primary key,
  fecha text default '',
  destinatario text default '',
  telefono text default '',
  plantilla text default '',
  texto text default ''
);

create table if not exists usuarios (
  id text primary key,
  nombre text not null,
  usuario text default '',
  rol text default 'operador',
  activo boolean default true
);

create table if not exists historial_tasas (
  id text primary key,
  fecha text not null,
  usd numeric(12,4) default 0,
  euro numeric(12,4) default 0,
  paralelo numeric(12,4) default 0,
  fuente text default 'dolarapi',
  actualizado bigint default 0
);

create table if not exists configuracion (
  id text primary key,
  data jsonb default '{}'::jsonb,
  seq_pedido int default 1,
  seq_cot int default 1,
  seq_cod int default 1,
  current_user_id text default ''
);

-- Índices para consultas rápidas
create index if not exists idx_estudiantes_escuela on estudiantes(escuela_id);
create index if not exists idx_estudiantes_pedido on estudiantes(pedido);
create index if not exists idx_pagos_estudiante on pagos(estudiante_id);
create index if not exists idx_adicionales_estudiante on adicionales_items(estudiante_id);
create index if not exists idx_cotizacion_items on cotizacion_items(cotizacion_id);

-- Row Level Security: acceso abierto con la anon key.
-- En producción se recomienda restringir con Supabase Auth.
do $$
declare t text;
begin
  foreach t in array array['escuelas','docentes','estudiantes','pagos','adicionales_items','cotizaciones','cotizacion_items','sesiones','eventos','mensajes','usuarios','historial_tasas','configuracion']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "jyg_abierto" on %I', t);
    execute format('create policy "jyg_abierto" on %I for all using (true) with check (true)', t);
  end loop;
end $$;`;

/* Historial diario de tasas (últimos 15 días) */
export const SEED_HISTORIAL: HistorialTasa[] = (() => {
  const base = 336.5;
  const out: HistorialTasa[] = [];
  for (let i = 15; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const usd = +(base + (15 - i) * 0.85 + Math.sin(i * 1.7) * 1.4).toFixed(2);
    out.push({
      id: uid(), fecha: d.toISOString().slice(0, 10), usd, euro: +(usd * 1.101).toFixed(2),
      paralelo: +(usd * 1.06).toFixed(2), fuente: "dolarapi", actualizado: d.getTime() + 32400000,
    });
  }
  return out;
})();

export const SEED_COTIZACIONES: Cotizacion[] = [
  { id: uid(), numero: "COT-0301", fecha: "2025-10-20", cliente: "Rosa Delgado", telefono: "0414-771.20.08", escuela: "U.E. Colegio San Agustín", paqueteId: "premium", adicionales: [{ producto: "Taza", cantidad: 2, precio: 8, talla: "" }], estado: "Pendiente", nota: "Representante de 6to B — 12 cupos tentativos." },
  { id: uid(), numero: "COT-0302", fecha: "2025-10-26", cliente: "Franklin Salas", telefono: "0424-660.91.73", escuela: "Liceo Bolivariano Los Samanes", paqueteId: "lujo", adicionales: [], estado: "Aceptada", nota: "Grupo de bachilleres, 8 estudiantes." },
];

export const SEED_SESIONES: Sesion[] = [
  { id: uid(), escuelaId: "es1", fecha: (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })(), hora: "09:00", fotografo: "Carlos Mendoza", estado: "Agendada", fotos: 0, nota: "Toma de toga y birrete — patio central." },
  { id: uid(), escuelaId: "es2", fecha: "2025-10-18", hora: "10:30", fotografo: "Génesis Rivas", estado: "Realizada", fotos: 214, nota: "Carnet y firma de libro completados." },
];

export const SEED_EVENTOS: Evento[] = [
  { id: uid(), fecha: (() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })(), hora: "09:00", titulo: "Entrega de paquetes — San Agustín", tipo: "entrega", escuelaId: "es1" },
  { id: uid(), fecha: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })(), hora: "14:00", titulo: "Ruta de cobranza Maracay", tipo: "cobranza" },
];
