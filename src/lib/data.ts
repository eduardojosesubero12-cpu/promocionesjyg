/* ============================================================
   PROMOCIONES JyG — Tipos, catálogos, helpers y semillas
   ============================================================ */

export type Rol = "admin" | "operador" | "produccion" | "cobranza";
export type Route =
  | "dashboard" | "clientes" | "escuelas" | "docentes" | "estudiantes" | "ventas" | "paquetes"
  | "cotizaciones" | "mensajes" | "sesiones" | "agenda" | "produccion" | "qr" | "facturas"
  | "ocr" | "reportes" | "usuarios" | "config" | "integraciones";

export interface Pago { id: string; fecha: string; monto: number; metodo: string; bs: boolean; tasa: number; usd: number; referencia: string; observacion: string; }
export interface AdicionalItem { producto: string; cantidad: number; precio: number; talla: string; }
export interface CodigoExtra { id: string; label: string; codigo: string; }
export interface Estudiante {
  id: string; pedido: string; nombre: string; telefono: string; representante: string; ci: string;
  escuelaId: string; docenteId: string; grado: string; seccion: string; paqueteId: string;
  precioPaquete: number; adicionales: AdicionalItem[]; pagos: Pago[];
  estadoPedido: string; fechaRegistro: string; fechaEntrega: string; observaciones: string;
  codigos: { carnetAlumno: string; carnetRep: string; firmaLibro: string; togaBirrete: string; fotoLibre: string; fotoAdicional: string };
  fechaNacimiento?: string; direccion?: string; email?: string; representanteCi?: string;
  telefonoRepresentante?: string; tallaCamisa?: string; tallaAnillo?: string; alergias?: string; tutor2?: string;
  codigosExtra?: CodigoExtra[]; actualizado?: number;
}
export interface Escuela { id: string; nombre: string; director: string; telefono: string; direccion: string; estado: string; municipio: string; anioEscolar: string; observaciones: string; }
export interface Docente { id: string; nombre: string; telefono: string; escuelaId: string; correo: string; observaciones: string; }
export interface Cotizacion { id: string; numero: string; fecha: string; cliente: string; telefono: string; escuela: string; paqueteId: string; adicionales: AdicionalItem[]; estado: "Pendiente" | "Aceptada" | "Rechazada"; nota: string; }
export interface Sesion { id: string; escuelaId: string; fecha: string; hora: string; fotografo: string; estado: "Agendada" | "Realizada"; fotos: number; nota: string; }
export interface Evento { id: string; fecha: string; hora: string; titulo: string; tipo: "sesion" | "entrega" | "cobranza" | "otro"; escuelaId?: string; }
export interface MensajeLog { id: string; fecha: string; destinatario: string; telefono: string; plantilla: string; texto: string; }
export interface Usuario { id: string; nombre: string; usuario: string; rol: Rol; activo: boolean; }
export interface HistorialTasa { id: string; fecha: string; usd: number; euro: number; paralelo: number; fuente: "dolarapi" | "manual"; actualizado: number; }
export interface PaqueteEscuelaArticulo { nombre: string; cantidad: number; }
export interface PaqueteEscuela { id: string; escuelaId: string; nombre: string; tipoPaqueteId: string; precio: number; articulos: PaqueteEscuelaArticulo[]; nota: string; activo: boolean; creado: string; }
export interface Config {
  empresa: { nombre: string; rif: string; direccion: string; telefono: string };
  preciosPaquetes: number[];
  usarApi: boolean; usarTasaManual: boolean; tasaFallback: number; tasaManualUSD: number; tasaManualEUR: number;
  historialAuto: boolean; supabaseUrl: string; supabaseKey: string; autoSyncCloud: boolean;
  rolesPermisos?: Record<Rol, string[]>;
  rolesActivos?: Record<Rol, boolean>;
  /* Motor de escaneo IA — Qwen vía OpenRouter (se guarda en Supabase con la config) */
  openRouterKey?: string;
  openRouterModel?: string;
  /* Catálogos editables (persisten hasta que se editen) */
  adicionales?: CatAdicional[];
  grados?: string[];
  secciones?: string[];
  tallas?: string[];
}
export interface CatAdicional { nombre: string; precio: number; talla: "" | "letras" | "numerica"; }
export interface OcrDraft { ci: string; nombres: string; apellidos: string; fecha: string; raw?: string; }
export interface CRMData {
  escuelas: Escuela[]; docentes: Docente[]; estudiantes: Estudiante[]; cotizaciones: Cotizacion[];
  sesiones: Sesion[]; eventos: Evento[]; mensajes: MensajeLog[]; usuarios: Usuario[];
  historialTasas: HistorialTasa[]; paquetesEscuelas: PaqueteEscuela[]; config: Config;
  currentUserId: string; seqPedido: number; seqCot: number;
}

/* ============================================================
   CATÁLOGOS
   ============================================================ */
export const GRADOS = ["Preescolar", "Sexto Grado", "Bachiller", "Técnicos"];
export const SECCIONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "U"];
export const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];
export const ESTADOS_PEDIDO = ["Registrado", "Producción", "Impresión", "Empaque", "Entregado"];

export const PAQUETES: Record<string, { id: string; nombre: string; precioBase: number; incluye: string[]; color: string }> = {
  basico: { id: "basico", nombre: "Básico", precioBase: 28, color: "#2f7ac2", incluye: ["8x12 Diploma", "Medalla", "4 Fotos Carnet", "1 Foto 6x8 Toga y Birrete"] },
  premium: { id: "premium", nombre: "Premium", precioBase: 45, color: "#0aaa67", incluye: ["1 Foto 8x12 Afiche", "1 Medalla", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola Diseñada", "1 Foto 10x15 Compañeros", "1 Foto Libre/Familiar", "1 Llavero"] },
  lujo: { id: "lujo", nombre: "Lujo", precioBase: 80, color: "#c98f00", incluye: ["1 Afiche 30x40", "1 Diploma 8x12", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola", "1 Foto 6x8 Compañeros", "1 Foto 6x8 Firma Libro", "1 Foto Libre/Familiar", "1 Llavero"] },
};

export const ADICIONALES: CatAdicional[] = [
  { nombre: "Taza", precio: 8, talla: "" }, { nombre: "Franela", precio: 12, talla: "letras" },
  { nombre: "Jersey", precio: 18, talla: "letras" }, { nombre: "Chemisse Piqué", precio: 25, talla: "letras" },
  { nombre: "Chemisse Sublimada", precio: 18, talla: "letras" }, { nombre: "Llavero", precio: 3.5, talla: "" },
  { nombre: "Estola", precio: 8, talla: "letras" }, { nombre: "Montura Vidrio 8x10", precio: 25, talla: "" },
  { nombre: "Montura Vidrio 8x12", precio: 25, talla: "" }, { nombre: "Montura Vidrio 30x40", precio: 35, talla: "" },
  { nombre: "Montura Vidrio 35x45", precio: 48, talla: "" }, { nombre: "Montura Laqueada 8x12", precio: 10, talla: "" },
  { nombre: "Montura Laqueada 30x40", precio: 15, talla: "" }, { nombre: "Afiche Laqueado 30x40", precio: 30, talla: "" },
  { nombre: "Fotobook", precio: 45, talla: "" }, { nombre: "Anillo", precio: 15, talla: "numerica" },
  { nombre: "Álbum 8x10", precio: 10, talla: "" }, { nombre: "Álbum 6x8", precio: 8, talla: "" },
];
export const getAdicionales = (c: Config) => (c.adicionales?.length ? c.adicionales : ADICIONALES);
export const getGrados = (c: Config) => (c.grados?.length ? c.grados : GRADOS);
export const getSecciones = (c: Config) => (c.secciones?.length ? c.secciones : SECCIONES);
export const getTallas = (c: Config) => (c.tallas?.length ? c.tallas : TALLAS);

export const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", operador: "Operador", produccion: "Producción", cobranza: "Cobranza" };
export const ROL_DESC: Record<Rol, string> = {
  admin: "Control total del sistema: configuración, usuarios, reportes e integraciones.",
  operador: "Registra estudiantes, escuelas y profesores, y gestiona cotizaciones.",
  produccion: "Visualiza materiales, cola de producción y sesiones fotográficas.",
  cobranza: "Gestiona pagos, abonos, saldos y facturación.",
};
export const ROLES_INFO: { id: Rol; label: string; desc: string; icon: string; color: string }[] = [
  { id: "admin", label: "Administrador", desc: "Control total del sistema", icon: "shield-fill-check", color: "#104172" },
  { id: "operador", label: "Operador", desc: "Registra estudiantes y pagos", icon: "person-badge", color: "#2f7ac2" },
  { id: "produccion", label: "Producción", desc: "Materiales, pedidos y fotos", icon: "tools", color: "#c98f00" },
  { id: "cobranza", label: "Cobranza", desc: "Pagos, saldos y reportes", icon: "wallet2", color: "#e28800" },
];
export const MODULOS_GRUPOS: { seccion: string; icon: string; items: { ruta: string; label: string }[] }[] = [
  { seccion: "Principal", icon: "speedometer2", items: [{ ruta: "dashboard", label: "Dashboard" }] },
  { seccion: "CRM", icon: "briefcase", items: [
    { ruta: "clientes", label: "Clientes" }, { ruta: "escuelas", label: "Escuelas" },
    { ruta: "docentes", label: "Profesores" }, { ruta: "estudiantes", label: "Estudiantes" },
    { ruta: "ventas", label: "Ventas · Pedidos" }, { ruta: "paquetes", label: "Paquetes" },
    { ruta: "cotizaciones", label: "Cotizaciones" }, { ruta: "mensajes", label: "Mensajes" },
  ] },
  { seccion: "Operaciones", icon: "gear-wide-connected", items: [
    { ruta: "sesiones", label: "Sesiones Fotográficas" }, { ruta: "agenda", label: "Agenda / Calendario" },
    { ruta: "produccion", label: "Producción" }, { ruta: "qr", label: "Tarjetas QR" },
    { ruta: "ocr", label: "Escáner Inteligente" }, { ruta: "facturas", label: "Facturación" },
  ] },
  { seccion: "Administración", icon: "shield-lock", items: [
    { ruta: "reportes", label: "Reportes" }, { ruta: "usuarios", label: "Usuarios" },
  ] },
  { seccion: "Sistema", icon: "hdd-rack", items: [
    { ruta: "config", label: "Configuración" }, { ruta: "integraciones", label: "Integraciones" },
  ] },
];
export const TODOS_MODULOS: string[] = MODULOS_GRUPOS.flatMap((g) => g.items.map((i) => i.ruta));
export const ACCESOS_DEFAULT: Record<Rol, string[]> = {
  admin: [...TODOS_MODULOS],
  operador: ["dashboard", "clientes", "escuelas", "docentes", "estudiantes", "ventas", "paquetes", "cotizaciones", "mensajes", "qr", "ocr", "facturas"],
  produccion: ["dashboard", "paquetes", "produccion", "qr", "sesiones", "agenda"],
  cobranza: ["dashboard", "clientes", "estudiantes", "ventas", "facturas", "reportes", "mensajes"],
};

/* ============================================================
   HELPERS
   ============================================================ */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fmtUSD = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const fmtBs = (n: number) => "Bs " + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtFecha = (iso: string) => { if (!iso) return "—"; const d = new Date(iso + "T12:00"); return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" }); };
export const fmtHoraAgo = (ts: number) => { const s = Math.max(0, Math.floor((Date.now() - ts) / 1000)); if (s < 60) return `hace ${s}s`; const m = Math.floor(s / 60); if (m < 60) return `hace ${m}min`; return `hace ${Math.floor(m / 60)}h`; };
export const fmtHaceSegundos = (ts: number, ahora: number) => { const s = Math.max(0, Math.floor((ahora - ts) / 1000)); if (s < 60) return `hace ${s} s`; const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`; return `hace ${Math.floor(m / 60)} h`; };
export const fmtFechaHoraViva = (ts: number, ahora: number) => { const d = new Date(ts); const hoy = new Date(ahora).toDateString() === d.toDateString(); return (hoy ? "hoy · " : d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" }) + " · ") + d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }); };
export const normalizePhone = (p: string) => p.replace(/\D/g, "");
export const waLink = (tel: string, texto: string) => `https://wa.me/58${normalizePhone(tel).replace(/^0/, "")}?text=${encodeURIComponent(texto)}`;
export const toCSV = (headers: string[], rows: (string | number)[][]) =>
  "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${String(c).split('"').join('""')}"`).join(";")).join("\n");
export const downloadFile = (nombre: string, contenido: string, tipo = "text/csv") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo + ";charset=utf-8" }));
  a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
};

export const estudianteTotales = (e: Estudiante) => {
  const extras = e.adicionales.reduce((s, a) => s + a.cantidad * a.precio, 0);
  const total = e.precioPaquete + extras;
  const abonado = e.pagos.reduce((s, p) => s + p.usd, 0);
  const saldo = Math.max(0, total - abonado);
  const partes = e.pagos.length;
  const estadoPago = saldo <= 0.009 ? "Pagado Completo" : partes === 0 ? "Sin Abonos" : partes === 1 ? "Primera Parte" : partes === 2 ? "Segunda Parte" : "Tercera Parte";
  return { total, abonado, saldo, partes, estadoPago };
};

export const codigosCompletos = (e: Estudiante) => Object.values(e.codigos).every((c) => c.trim() !== "");

/* Materiales que aporta cada paquete (para Producción) */
export const MATERIALES_POR_PAQUETE: Record<string, Record<string, number>> = {
  basico: { "Foto 8x12": 1, "Medalla": 1, "Foto Carnet": 4, "Foto 6x8": 1 },
  premium: { "Foto 8x12": 1, "Medalla": 1, "Foto Carnet": 8, "Carnet Alumno": 4, "Carnet Representante": 4, "Estola": 1, "Foto 10x15": 1, "Foto 6x8": 1, "Llavero": 1 },
  lujo: { "Afiche 30x40": 1, "Foto 8x12": 1, "Foto Carnet": 8, "Carnet Alumno": 4, "Carnet Representante": 4, "Estola": 1, "Foto 6x8": 2, "Llavero": 1 },
};
export const ORDEN_MATERIALES = ["Afiche 30x40", "Foto 8x12", "Foto 6x8", "Foto 10x15", "Foto Carnet", "Carnet Alumno", "Carnet Representante", "Medalla", "Estola", "Llavero"];
export function computeProduccion(estudiantes: Estudiante[]) {
  const materiales: Record<string, number> = {};
  const combos: Record<string, number> = {};
  const adicionales: Record<string, { cantidad: number; tallas: Record<string, number> }> = {};
  for (const e of estudiantes) {
    combos[e.paqueteId] = (combos[e.paqueteId] || 0) + 1;
    const mat = MATERIALES_POR_PAQUETE[e.paqueteId] || {};
    for (const [m, c] of Object.entries(mat)) materiales[m] = (materiales[m] || 0) + c;
    for (const a of e.adicionales) {
      if (!adicionales[a.producto]) adicionales[a.producto] = { cantidad: 0, tallas: {} };
      adicionales[a.producto].cantidad += a.cantidad;
      if (a.talla) adicionales[a.producto].tallas[a.talla] = (adicionales[a.producto].tallas[a.talla] || 0) + a.cantidad;
    }
  }
  return { materiales, combos, adicionales };
}
export function cobrosSemanales(estudiantes: Estudiante[]) {
  const dias: { label: string; total: number; abonos: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    let total = 0, abonos = 0;
    for (const e of estudiantes) for (const p of e.pagos) if (p.fecha === iso) { total += p.usd; abonos++; }
    dias.push({ label: d.toLocaleDateString("es-VE", { weekday: "short" }), total, abonos });
  }
  return dias;
}

/* ============================================================
   ESCÁNER IA — Qwen vía OpenRouter (la key se guarda en Supabase)
   ============================================================ */
export const OPENROUTER_MODELOS: { id: string; nombre: string; desc: string; recomendado?: boolean }[] = [
  { id: "qwen/qwen3-vl-30b-a3b-instruct", nombre: "Qwen3-VL 30B", desc: "Mejor precisión/costo para cédulas", recomendado: true },
  { id: "qwen/qwen3-vl-8b-instruct", nombre: "Qwen3-VL 8B", desc: "Muy económico, documentos nítidos" },
  { id: "qwen/qwen2.5-vl-72b-instruct", nombre: "Qwen2.5-VL 72B", desc: "Máxima precisión, fotos difíciles" },
  { id: "qwen/qwen2.5-vl-7b-instruct", nombre: "Qwen2.5-VL 7B", desc: "Uso general equilibrado" },
];
export async function extractWithQwen(imageDataUrl: string, key: string, model: string): Promise<OcrDraft> {
  const prompt = [
    "Eres un extractor de datos de documentos de identidad venezolanos (cédula C.I. y partida de nacimiento).",
    "Lee la imagen y extrae exactamente estos campos. Si un campo no aparece, déjalo vacío.",
    "Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma:",
    '{"cedula":"V-00000000","nombres":"...","apellidos":"...","nacimiento":"AAAA-MM-DD"}',
    "La cédula debe incluir el prefijo V- o E- y los dígitos. Nombres y apellidos por separado.",
  ].join(" ");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, temperature: 0,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageDataUrl } }] }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `OpenRouter respondió ${res.status}`);
  }
  const json = await res.json();
  const texto: string = json?.choices?.[0]?.message?.content ?? "";
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const ini = limpio.indexOf("{"); const fin = limpio.lastIndexOf("}");
  if (ini === -1 || fin === -1) return { ci: "", nombres: "", apellidos: "", fecha: "", raw: texto };
  try {
    const d = JSON.parse(limpio.slice(ini, fin + 1));
    return { ci: (d.cedula || "").trim(), nombres: (d.nombres || "").trim(), apellidos: (d.apellidos || "").trim(), fecha: (d.nacimiento || "").trim(), raw: texto };
  } catch { return { ci: "", nombres: "", apellidos: "", fecha: "", raw: texto }; }
}
/* Respaldo sin API key: OCR local (Tesseract) con separación heurística de nombres/apellidos */
export function parseOcrLocal(texto: string): OcrDraft {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  let ci = "";
  const mCi = texto.match(/([VE])-?\s?(\d{1,3}([.\s]\d{3})*)/i);
  if (mCi) ci = `${mCi[1].toUpperCase()}-${mCi[2].replace(/[.\s]/g, "")}`;
  let fecha = "";
  const mFecha = texto.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (mFecha) fecha = mFecha[1].replace(/\//g, "-");
  let nombre = "";
  for (const l of lineas) { if (/nombre/i.test(l) && l.length > 6) { nombre = l.replace(/^.*nombre[^:]*:?\s*/i, "").trim(); break; } }
  if (!nombre) {
    let mejor = 0;
    for (const l of lineas) {
      const palabras = l.split(/\s+/).filter((p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/i.test(p));
      if (palabras.length > mejor) { mejor = palabras.length; nombre = palabras.join(" "); }
    }
  }
  const palabras = nombre.split(/\s+/).filter(Boolean);
  let nombres = nombre, apellidos = "";
  if (palabras.length >= 2) { const corte = Math.ceil(palabras.length / 2); nombres = palabras.slice(0, corte).join(" "); apellidos = palabras.slice(corte).join(" "); }
  return { ci, nombres, apellidos, fecha, raw: texto };
}
export const ocrNombreCompleto = (d: OcrDraft) => [d.nombres, d.apellidos].filter(Boolean).join(" ").trim();

/* ============================================================
   PORTAL DEL ESTUDIANTE — enlace corto + HTML autocontenido
   ============================================================ */
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const slugEstudiante = (e: Estudiante) => `${e.pedido.toLowerCase()}-${slugify(e.nombre)}`.slice(0, 60);
export const portalUrl = (e: Estudiante) => `${window.location.origin}${window.location.pathname}#/p/${slugEstudiante(e)}.jyg`;
export interface PortalData {
  pedido: string; nombre: string; ci: string; telefono: string; representante: string;
  escuela: string; docente: string; grado: string; seccion: string; anio: string;
  paquete: string; precioPaquete: number; incluye: string[];
  adicionales: AdicionalItem[]; pagos: Pago[]; total: number; abonado: number; saldo: number;
  estadoPago: string; estadoPedido: string; codigos: [string, string][]; tasa: number; empresa: string; actualizado: string;
}
export const buildPortalData = (est: Estudiante, escuela: string, docente: string, empresa: string, tasa: number): PortalData => {
  const t = estudianteTotales(est);
  const pk = PAQUETES[est.paqueteId];
  const extras = est.codigosExtra || [];
  const base: [string, string][] = ([
    ["Carnet Alumno", est.codigos.carnetAlumno], ["Carnet Representante", est.codigos.carnetRep],
    ["Firma Libro", est.codigos.firmaLibro], ["Toga y Birrete", est.codigos.togaBirrete],
    ["Foto Libre", est.codigos.fotoLibre], ["Foto Adicional", est.codigos.fotoAdicional],
  ] as [string, string][]).filter(([, v]) => v);
  return {
    pedido: est.pedido, nombre: est.nombre, ci: est.ci || "S/C", telefono: est.telefono || "—",
    representante: est.representante || "—", escuela, docente, grado: est.grado, seccion: est.seccion,
    anio: String(new Date().getFullYear()), paquete: pk ? pk.nombre : "—", precioPaquete: est.precioPaquete,
    incluye: pk ? pk.incluye : [], adicionales: est.adicionales, pagos: est.pagos,
    total: t.total, abonado: t.abonado, saldo: t.saldo, estadoPago: t.estadoPago, estadoPedido: est.estadoPedido,
    codigos: [...base, ...extras.map((x) => [x.label, x.codigo] as [string, string])],
    tasa, empresa, actualizado: new Date().toLocaleString("es-VE"),
  };
};
export const generarPortalHtml = (pd: PortalData, qrLink: string): string => {
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=4&data=${encodeURIComponent(qrLink)}`;
  const pct = Math.min(100, Math.round((pd.abonado / Math.max(0.01, pd.total)) * 100));
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Portal · ${pd.nombre} · ${pd.grado} "${pd.seccion}" · ${pd.escuela}</title>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Lato',sans-serif;background:radial-gradient(900px 420px at 85% -8%,rgba(207,232,255,.12),transparent 60%),radial-gradient(700px 380px at -8% 12%,rgba(245,179,1,.1),transparent 60%),#0c1a2c;color:#e8eef8;min-height:100vh}.top{max-width:900px;margin:0 auto;padding:26px 20px 10px;display:flex;align-items:center;gap:12px}.logo{width:44px;height:44px;border-radius:13px;background:linear-gradient(150deg,#104172,#0b2e52);display:flex;align-items:center;justify-content:center;color:#f5b301;font-size:22px}.top b{font-family:'Poppins';font-size:16px;display:block;line-height:1.1}.top small{font-size:9.5px;letter-spacing:2px;text-transform:uppercase;opacity:.55;font-weight:700}.seal{margin-left:auto;color:#f5b301;font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border:1.5px dashed rgba(245,179,1,.5);padding:7px 14px;border-radius:99px;background:rgba(245,179,1,.08)}main{max-width:900px;margin:0 auto;padding:14px 20px 40px}.ticket{display:flex;background:linear-gradient(160deg,#12304f,#0e2440 55%,#0c1a2c);border:1px solid rgba(207,232,255,.14);border-radius:20px;overflow:hidden;box-shadow:0 24px 55px -18px rgba(0,0,0,.6)}.stub{width:230px;flex-shrink:0;padding:24px 20px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;background:rgba(0,0,0,.18);border-right:2px dashed rgba(207,232,255,.25)}.ped{font-family:'Poppins';font-weight:800;font-size:19px;color:#f5b301;letter-spacing:1px}.nm{font-family:'Poppins';font-weight:700;font-size:15px}.gr{font-size:12.5px;color:#cfe0f5}.stub img{border:6px solid #fff;border-radius:12px;background:#fff;margin-top:6px}.esc{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5;font-weight:700}.estado{margin-top:6px;font-size:10px;font-weight:700;padding:5px 12px;border-radius:99px;background:rgba(245,179,1,.15);color:#f5b301}.cuerpo{flex:1;padding:26px 28px;min-width:0}h2{font-family:'Poppins';font-weight:800;font-size:24px;letter-spacing:-.5px}.sub{font-size:13px;color:#9fb0c8;margin:4px 0 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:18px}.row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(207,232,255,.1);font-size:13px}.row span{color:#9fb0c8}.row b{font-family:'Poppins';text-align:right}.sect{font-family:'Poppins';font-weight:700;font-size:13px;color:#f5b301;text-transform:uppercase;letter-spacing:1.2px;margin:22px 0 8px;display:flex;align-items:center;gap:8px}.sect::after{content:"";flex:1;height:1px;background:rgba(245,179,1,.25)}.inc{display:flex;flex-wrap:wrap;gap:8px}.chip{font-size:12px;background:rgba(207,232,255,.08);border:1px solid rgba(207,232,255,.15);padding:5px 12px;border-radius:99px;color:#cfe0f5}.pago{display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,.2);border:1px solid rgba(207,232,255,.1);border-radius:11px;padding:9px 13px;font-size:12.5px;margin-bottom:7px}.pago b{font-family:'Poppins'}.pago .m{color:#9fb0c8;font-size:11px}.saldo{display:flex;justify-content:space-between;align-items:baseline;background:linear-gradient(120deg,rgba(245,179,1,.16),rgba(245,179,1,.05));border:1px solid rgba(245,179,1,.35);border-radius:13px;padding:14px 16px;margin-top:12px}.saldo .v{font-family:'Poppins';font-weight:800;font-size:22px;color:#f5b301}.barra{height:9px;border-radius:99px;background:rgba(207,232,255,.12);overflow:hidden;margin-top:10px}.barra i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#f5b301,#ffc94d)}.cod{display:flex;flex-wrap:wrap;gap:8px}.cod .c{font-size:11.5px;background:rgba(207,232,255,.08);border:1px solid rgba(207,232,255,.15);padding:5px 12px;border-radius:99px;color:#cfe0f5}.cod .c b{color:#f5b301}.foot{text-align:center;font-size:11.5px;color:#9fb0c8;margin-top:26px;line-height:1.6}@media(max-width:760px){.ticket{flex-direction:column}.stub{width:100%;border-right:none;border-bottom:2px dashed rgba(207,232,255,.25)}.grid{grid-template-columns:1fr}.cuerpo{padding:22px 20px}}</style></head><body>
<div class="top"><span class="logo">&#127891;</span><div><b>${pd.empresa}</b><small>Portal del Graduando</small></div><span class="seal">&#128274; Solo consulta</span></div>
<main><div class="ticket"><div class="stub"><span class="ped">${pd.pedido}</span><span class="nm">${pd.nombre}</span><span class="gr">${pd.grado} "${pd.seccion}"</span><img src="${qrImg}" width="110" height="110" alt="QR"/><span class="esc">Escanea para verificar</span><span class="estado">${pd.estadoPedido}</span></div>
<div class="cuerpo"><h2>${pd.nombre}</h2><p class="sub">${pd.escuela} · ${pd.grado} "${pd.seccion}" · Promoción ${pd.anio}</p>
<div class="grid"><div class="row"><span>Cédula</span><b>${pd.ci}</b></div><div class="row"><span>Teléfono</span><b>${pd.telefono}</b></div><div class="row"><span>Representante</span><b>${pd.representante}</b></div><div class="row"><span>Docente</span><b>${pd.docente}</b></div><div class="row"><span>Paquete</span><b>${pd.paquete}</b></div><div class="row"><span>Precio paquete</span><b>$${pd.precioPaquete.toFixed(2)}</b></div></div>
<div class="sect">Contenido del paquete</div><div class="inc">${pd.incluye.map((i) => `<span class="chip">${i}</span>`).join("")}</div>
${pd.adicionales.length ? `<div class="sect">Artículos adicionales</div>${pd.adicionales.map((a) => `<div class="pago"><span>${a.cantidad}× ${a.producto}${a.talla ? ` (${a.talla})` : ""}</span><b>$${(a.cantidad * a.precio).toFixed(2)}</b></div>`).join("")}` : ""}
<div class="sect">Estado de cuenta</div>
${pd.pagos.length ? pd.pagos.map((p) => `<div class="pago"><div><b>${p.bs ? "Bs " + p.monto.toFixed(2) : "$" + p.usd.toFixed(2)}</b><div class="m">${p.metodo} · ${fmtFecha(p.fecha)} · tasa ${p.tasa.toFixed(2)} Bs/$</div></div><b>$${p.usd.toFixed(2)}</b></div>`).join("") : `<div class="pago"><span>Sin abonos registrados</span></div>`}
<div class="saldo"><div><b style="font-family:'Poppins'">${pd.saldo <= 0.009 ? "PAGADO COMPLETO" : "Saldo pendiente"}</b><div class="m" style="color:#9fb0c8;font-size:11px">Total $${pd.total.toFixed(2)} · Abonado $${pd.abonado.toFixed(2)} · Tasa Bs ${pd.tasa.toFixed(2)}/$</div></div><span class="v">$${pd.saldo.toFixed(2)}</span></div>
<div class="barra"><i style="width:${pct}%"></i></div>
${pd.codigos.length ? `<div class="sect">Códigos de fotografía</div><div class="cod">${pd.codigos.map(([c, v]) => `<span class="c">${c} <b>${v}</b></span>`).join("")}</div>` : ""}
<div class="foot">${pd.empresa} · Generado el ${pd.actualizado}<br/>Válido para la entrega del paquete de grado · Consulta de solo lectura</div></div></div></main></body></html>`;
};

/* ============================================================
   SUPABASE — tablas y esquema
   ============================================================ */
export const DB_TABLES = [
  { tabla: "escuelas", label: "Escuelas" }, { tabla: "docentes", label: "Docentes" },
  { tabla: "estudiantes", label: "Estudiantes" }, { tabla: "pagos", label: "Pagos / Abonos" },
  { tabla: "adicionales_items", label: "Adicionales" }, { tabla: "cotizaciones", label: "Cotizaciones" },
  { tabla: "cotizacion_items", label: "Items de cotización" }, { tabla: "sesiones", label: "Sesiones" },
  { tabla: "eventos", label: "Agenda" }, { tabla: "mensajes", label: "Mensajes" },
  { tabla: "usuarios", label: "Usuarios" }, { tabla: "historial_tasas", label: "Historial de tasas" },
  { tabla: "paquetes_escuelas", label: "Paquetes por escuela" }, { tabla: "configuracion", label: "Configuración" },
];
export const SUPABASE_SQL = `-- Esquema CRM Promociones JyG · una tabla por módulo
create table if not exists escuelas (
  id text primary key, nombre text not null, director text default '', telefono text default '',
  direccion text default '', estado text default '', municipio text default '', anio_escolar text default '', observaciones text default ''
);
create table if not exists docentes (
  id text primary key, nombre text not null, telefono text default '', escuela_id text references escuelas(id),
  correo text default '', observaciones text default ''
);
create table if not exists estudiantes (
  id text primary key, pedido text not null, nombre text not null, telefono text default '', representante text default '',
  ci text default '', escuela_id text references escuelas(id), docente_id text references docentes(id),
  grado text default '', seccion text default '', paquete_id text default '', precio_paquete numeric(12,2) default 0,
  estado_pedido text default 'Registrado', fecha_registro text default '', fecha_entrega text default '',
  observaciones text default '', codigos jsonb default '{}'::jsonb, extra jsonb default '{}'::jsonb
);
create table if not exists pagos (
  id text primary key, estudiante_id text references estudiantes(id) on delete cascade,
  fecha text default '', monto numeric(12,2) default 0, metodo text default '', bs boolean default false,
  tasa numeric(12,2) default 0, usd numeric(12,2) default 0, referencia text default '', observacion text default ''
);
create table if not exists adicionales_items (
  id text primary key, estudiante_id text references estudiantes(id) on delete cascade,
  producto text default '', cantidad int default 1, precio numeric(12,2) default 0, talla text default ''
);
create table if not exists cotizaciones (
  id text primary key, numero text default '', fecha text default '', cliente text default '', telefono text default '',
  escuela text default '', paquete_id text default '', estado text default 'Pendiente', nota text default ''
);
create table if not exists cotizacion_items (
  id text primary key, cotizacion_id text references cotizaciones(id) on delete cascade,
  producto text default '', cantidad int default 1, precio numeric(12,2) default 0, talla text default ''
);
create table if not exists sesiones (
  id text primary key, escuela_id text references escuelas(id), fecha text default '', hora text default '',
  fotografo text default '', estado text default 'Agendada', fotos int default 0, nota text default ''
);
create table if not exists eventos (
  id text primary key, fecha text default '', hora text default '', titulo text default '', tipo text default 'otro', escuela_id text
);
create table if not exists mensajes (
  id text primary key, fecha text default '', destinatario text default '', telefono text default '', plantilla text default '', texto text default ''
);
create table if not exists usuarios (
  id text primary key, nombre text default '', usuario text default '', rol text default 'operador', activo boolean default true
);
create table if not exists historial_tasas (
  id text primary key, fecha text default '', usd numeric(12,4) default 0, euro numeric(12,4) default 0,
  paralelo numeric(12,4) default 0, fuente text default 'dolarapi', actualizado bigint default 0
);
create table if not exists paquetes_escuelas (
  id text primary key, escuela_id text references escuelas(id), nombre text default '', tipo_paquete_id text default '',
  precio numeric(12,2) default 0, articulos jsonb default '[]'::jsonb, nota text default '', activo boolean default true, creado text default ''
);
create table if not exists configuracion (
  id text primary key, data jsonb default '{}'::jsonb, seq_pedido int default 1, seq_cot int default 1, current_user_id text default ''
);
-- Habilita RLS con una política de lectura/escritura para la anon key
alter table escuelas enable row level security; alter table docentes enable row level security;
alter table estudiantes enable row level security; alter table pagos enable row level security;
alter table adicionales_items enable row level security; alter table cotizaciones enable row level security;
alter table cotizacion_items enable row level security; alter table sesiones enable row level security;
alter table eventos enable row level security; alter table mensajes enable row level security;
alter table usuarios enable row level security; alter table historial_tasas enable row level security;
alter table paquetes_escuelas enable row level security; alter table configuracion enable row level security;
create policy "crm_all" on escuelas for all using (true) with check (true);
create policy "crm_all" on docentes for all using (true) with check (true);
create policy "crm_all" on estudiantes for all using (true) with check (true);
create policy "crm_all" on pagos for all using (true) with check (true);
create policy "crm_all" on adicionales_items for all using (true) with check (true);
create policy "crm_all" on cotizaciones for all using (true) with check (true);
create policy "crm_all" on cotizacion_items for all using (true) with check (true);
create policy "crm_all" on sesiones for all using (true) with check (true);
create policy "crm_all" on eventos for all using (true) with check (true);
create policy "crm_all" on mensajes for all using (true) with check (true);
create policy "crm_all" on usuarios for all using (true) with check (true);
create policy "crm_all" on historial_tasas for all using (true) with check (true);
create policy "crm_all" on paquetes_escuelas for all using (true) with check (true);
create policy "crm_all" on configuracion for all using (true) with check (true);`;

/* ============================================================
   SEMILLAS
   ============================================================ */
export const SEED_ESCUELAS: Escuela[] = [
  { id: "es1", nombre: "U.E. Simón Bolívar", director: "María Rodríguez", telefono: "0414-555.10.20", direccion: "Av. Principal, Sector Centro", estado: "Carabobo", municipio: "Valencia", anioEscolar: "2025-2026", observaciones: "" },
  { id: "es2", nombre: "Liceo Andrés Bello", director: "José Pérez", telefono: "0424-555.33.44", direccion: "Calle Miranda, N° 45", estado: "Carabobo", municipio: "Naguanagua", anioEscolar: "2025-2026", observaciones: "" },
  { id: "es3", nombre: "Colegio Santa María", director: "Carmen López", telefono: "0412-555.55.66", direccion: "Urb. La Alegría, Av. 3", estado: "Aragua", municipio: "Maracay", anioEscolar: "2025-2026", observaciones: "Entrega en junio" },
];
export const SEED_DOCENTES: Docente[] = [
  { id: "do1", nombre: "Prof. Luis González", telefono: "0414-111.22.33", escuelaId: "es1", correo: "luis.gonzalez@correo.com", observaciones: "" },
  { id: "do2", nombre: "Prof. Ana Martínez", telefono: "0424-222.33.44", escuelaId: "es2", correo: "ana.martinez@correo.com", observaciones: "" },
  { id: "do3", nombre: "Prof. Pedro Sánchez", telefono: "0412-333.44.55", escuelaId: "es3", correo: "pedro.sanchez@correo.com", observaciones: "" },
];
const mkEst = (n: number, nombre: string, ci: string, escuelaId: string, docenteId: string, grado: string, seccion: string, paqueteId: string, precio: number, pagos: number[], extra: AdicionalItem[] = []): Estudiante => ({
  id: "e" + n, pedido: "P-24" + String(n).padStart(2, "0"), nombre, telefono: "0414-555.00." + String(10 + n),
  representante: "Representante de " + nombre.split(" ")[0], ci, escuelaId, docenteId, grado, seccion,
  paqueteId, precioPaquete: precio, adicionales: extra,
  pagos: pagos.map((usd, i) => ({ id: "pg" + n + "-" + i, fecha: new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString().slice(0, 10), monto: +(usd * 352.4).toFixed(2), metodo: i % 2 ? "Pago Móvil" : "Divisas $", bs: i % 2 === 1, tasa: 352.4, usd, referencia: i % 2 ? "00" + (123456 + n) : "", observacion: "" })),
  estadoPedido: n % 3 === 0 ? "Producción" : n % 4 === 0 ? "Empaque" : "Registrado",
  fechaRegistro: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10), fechaEntrega: "", observaciones: "",
  codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
});
export const SEED_ESTUDIANTES: Estudiante[] = [
  mkEst(1, "Gabriela Pérez", "V-27456123", "es1", "do1", "Bachiller", "A", "premium", 45, [20, 15]),
  mkEst(2, "José Ramírez", "V-26891234", "es1", "do1", "Bachiller", "B", "basico", 28, [10]),
  mkEst(3, "María Fernanda Torres", "V-28112456", "es2", "do2", "Sexto Grado", "A", "lujo", 80, [30, 25, 25]),
  mkEst(4, "Carlos Mendoza", "V-27788345", "es2", "do2", "Bachiller", "A", "premium", 45, [], [{ producto: "Franela", cantidad: 2, precio: 12, talla: "L" }, { producto: "Taza", cantidad: 1, precio: 8, talla: "" }]),
  mkEst(5, "Ana Sofía Rojas", "V-28334567", "es3", "do3", "Preescolar", "U", "basico", 28, [28]),
  mkEst(6, "Luis Alejandro Gil", "V-26554321", "es3", "do3", "Técnicos", "A", "lujo", 80, [40], [{ producto: "Anillo", cantidad: 1, precio: 15, talla: "18" }]),
  mkEst(7, "Valentina Herrera", "V-27998877", "es1", "do1", "Sexto Grado", "B", "premium", 45, [22, 23]),
  mkEst(8, "Diego Castillo", "V-28445566", "es2", "do2", "Bachiller", "C", "basico", 28, []),
];
export const SEED_COTIZACIONES: Cotizacion[] = [
  { id: "c1", numero: "COT-2401", fecha: todayISO(), cliente: "Rosa Medina", telefono: "0414-777.88.99", escuela: "U.E. Simón Bolívar", paqueteId: "premium", adicionales: [{ producto: "Fotobook", cantidad: 1, precio: 45, talla: "" }], estado: "Pendiente", nota: "Esperando confirmación de la directora" },
  { id: "c2", numero: "COT-2402", fecha: todayISO(), cliente: "Miguel Duarte", telefono: "0424-321.65.98", escuela: "Liceo Andrés Bello", paqueteId: "lujo", adicionales: [], estado: "Aceptada", nota: "" },
];
export const SEED_SESIONES: Sesion[] = [
  { id: "s1", escuelaId: "es1", fecha: todayISO(), hora: "09:00", fotografo: "Estudio Luz", estado: "Agendada", fotos: 0, nota: "Toga y birrete en el patio central" },
  { id: "s2", escuelaId: "es2", fecha: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), hora: "14:30", fotografo: "Estudio Luz", estado: "Agendada", fotos: 0, nota: "" },
];
export const SEED_EVENTOS: Evento[] = [
  { id: "ev1", fecha: todayISO(), hora: "16:00", titulo: "Entrega de paquetes — U.E. Simón Bolívar", tipo: "entrega", escuelaId: "es1" },
  { id: "ev2", fecha: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), hora: "10:00", titulo: "Ruta de cobranza — Valencia centro", tipo: "cobranza" },
];
export const SEED_USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Eduardo Subero", usuario: "eduardo", rol: "admin", activo: true },
  { id: "u2", nombre: "Génesis Marín", usuario: "genesis", rol: "operador", activo: true },
  { id: "u3", nombre: "Luis Rodríguez", usuario: "luis", rol: "produccion", activo: true },
  { id: "u4", nombre: "Karla Díaz", usuario: "karla", rol: "cobranza", activo: true },
];
const hist = (dias: number, base: number): HistorialTasa[] =>
  Array.from({ length: dias }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (dias - 1 - i));
    return { id: "h" + i, fecha: d.toISOString().slice(0, 10), usd: +(base + i * 0.35).toFixed(2), euro: +(base * 1.09 + i * 0.4).toFixed(2), paralelo: +(base + i * 0.35 + 12).toFixed(2), fuente: "dolarapi" as const, actualizado: d.getTime() };
  });
export const SEED_HISTORIAL: HistorialTasa[] = hist(15, 345.8);
export const SEED_PAQUETES_ESCUELAS: PaqueteEscuela[] = [
  { id: "pe1", escuelaId: "es1", nombre: "Paquete VIP Simón Bolívar", tipoPaqueteId: "premium", precio: 38, articulos: PAQUETES.premium.incluye.map((n) => ({ nombre: n, cantidad: 1 })), nota: "Descuento por volumen", activo: true, creado: todayISO() },
];
export const SEED_CONFIG: Config = {
  empresa: { nombre: "Promociones JyG", rif: "J-40123456-7", direccion: "Av. Bolívar, Centro Comercial Plaza, Local 12, Valencia", telefono: "0414-555.00.00" },
  preciosPaquetes: [20, 22, 28, 30, 35, 40, 45, 48, 55, 60, 80, 110, 145],
  usarApi: true, usarTasaManual: false, tasaFallback: 352.4, tasaManualUSD: 352.4, tasaManualEUR: 384.1,
  historialAuto: true, supabaseUrl: "", supabaseKey: "", autoSyncCloud: false,
  /* La API key se configura desde Configuración y se guarda en Supabase (nunca en el código) */
  openRouterKey: "", openRouterModel: OPENROUTER_MODELOS[0].id,
};
