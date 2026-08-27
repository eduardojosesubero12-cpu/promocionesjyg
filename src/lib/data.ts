/* ============================================================
   PROMOCIONES JyG — capa de datos: tipos, catálogos, semillas,
   helpers de cálculo y formato.
   ============================================================ */

export type Rol = "admin" | "operador" | "produccion" | "cobranza";

export interface Escuela {
  id: string; nombre: string; director: string; telefono: string; direccion: string;
  estado: string; municipio: string; anioEscolar: string; observaciones: string;
}
export interface Docente {
  id: string; nombre: string; telefono: string; escuelaId: string; correo: string; observaciones: string;
}
export interface Pago {
  id: string; fecha: string; monto: number; metodo: string; bs: boolean;
  tasa: number; usd: number; referencia: string; observacion: string;
}
export interface AdicionalItem { producto: string; cantidad: number; precio: number; talla: string; }
export interface Estudiante {
  id: string; pedido: string; nombre: string; telefono: string; representante: string; ci: string;
  escuelaId: string; docenteId: string; grado: string; seccion: string; paqueteId: string;
  precioPaquete: number; adicionales: AdicionalItem[]; pagos: Pago[];
  estadoPedido: string; fechaRegistro: string; fechaEntrega: string; observaciones: string;
  codigos: { carnetAlumno: string; carnetRep: string; firmaLibro: string; togaBirrete: string; fotoLibre: string; fotoAdicional: string };
}
export interface Cotizacion {
  id: string; numero: string; fecha: string; cliente: string; telefono: string; escuela: string;
  paqueteId: string; adicionales: AdicionalItem[]; estado: "Pendiente" | "Aceptada" | "Rechazada"; nota: string;
}
export interface Sesion {
  id: string; escuelaId: string; fecha: string; hora: string; fotografo: string;
  estado: "Agendada" | "Realizada"; fotos: number; nota: string;
}
export interface Evento { id: string; fecha: string; hora: string; titulo: string; tipo: "sesion" | "entrega" | "cobranza" | "otro"; escuelaId?: string; }
export interface MensajeLog { id: string; fecha: string; destinatario: string; telefono: string; plantilla: string; texto: string; }
export interface Usuario { id: string; nombre: string; usuario: string; rol: Rol; activo: boolean; }
export interface HistorialTasa { id: string; fecha: string; usd: number; euro: number; paralelo: number; fuente: "dolarapi" | "manual"; actualizado: number; }
export interface PaqueteEscuelaArticulo { nombre: string; cantidad: number; }
export interface PaqueteEscuela {
  id: string; escuelaId: string; nombre: string; tipoPaqueteId: string; precio: number;
  articulos: PaqueteEscuelaArticulo[]; nota: string; activo: boolean; creado: string;
}
export interface Config {
  empresa: { nombre: string; rif: string; direccion: string; telefono: string };
  preciosPaquetes: number[];
  usarApi: boolean; usarTasaManual: boolean; tasaFallback: number; tasaManualUSD: number; tasaManualEUR: number;
  historialAuto: boolean; supabaseUrl: string; supabaseKey: string; autoSyncCloud: boolean;
  /* Roles y accesos editables (persisten hasta que se editen) */
  rolesPermisos?: Record<Rol, string[]>;
  rolesActivos?: Record<Rol, boolean>;
}
export interface OcrDraft { nombre: string; ci: string; fecha: string; raw?: string; }
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

export const PAQUETES: Record<string, { id: string; nombre: string; precioBase: number; color: string; incluye: string[] }> = {
  basico: {
    id: "basico", nombre: "Básico", precioBase: 20, color: "#2f7ac2",
    incluye: ["8x12 Diploma", "Medalla", "4 Fotos Carnet", "1 Foto 6x8 Toga y Birrete"],
  },
  premium: {
    id: "premium", nombre: "Premium", precioBase: 40, color: "#0aaa67",
    incluye: ["1 Foto 8x12 Afiche", "1 Medalla", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola Diseñada", "1 Foto 10x15 Compañeros", "1 Foto Libre/Familiar", "1 Llavero"],
  },
  lujo: {
    id: "lujo", nombre: "Lujo", precioBase: 60, color: "#c98f00",
    incluye: ["1 Afiche 30x40", "1 Diploma 8x12", "8 Fotos Carnet", "4 Carnet Alumno", "4 Carnet Representante", "1 Estola", "1 Foto 6x8 Compañeros", "1 Foto 6x8 Firma Libro", "1 Foto Libre/Familiar", "1 Llavero"],
  },
};

export const ADICIONALES: { nombre: string; precio: number; talla: boolean; tallaNumerica?: boolean }[] = [
  { nombre: "Taza", precio: 8, talla: false },
  { nombre: "Franela", precio: 12, talla: true },
  { nombre: "Jersey", precio: 18, talla: true },
  { nombre: "Chemisse Piqué", precio: 25, talla: true },
  { nombre: "Chemisse Sublimada", precio: 18, talla: true },
  { nombre: "Llavero", precio: 3.5, talla: false },
  { nombre: "Estola", precio: 8, talla: true },
  { nombre: "Montura Vidrio 8x10", precio: 25, talla: false },
  { nombre: "Montura Vidrio 8x12", precio: 25, talla: false },
  { nombre: "Montura Vidrio 30x40", precio: 35, talla: false },
  { nombre: "Montura Vidrio 35x45", precio: 48, talla: false },
  { nombre: "Montura Laqueada 8x12", precio: 10, talla: false },
  { nombre: "Montura Laqueada 30x40", precio: 15, talla: false },
  { nombre: "Afiche Laqueado 30x40", precio: 30, talla: false },
  { nombre: "Fotobook", precio: 45, talla: false },
  { nombre: "Anillo", precio: 15, talla: true, tallaNumerica: true },
  { nombre: "Álbum 8x10", precio: 10, talla: false },
  { nombre: "Álbum 6x8", precio: 8, talla: false },
];

export const ORDEN_MATERIALES = ["Afiche 30x40", "Foto 8x12", "Foto 6x8", "Foto 10x15", "Fotos Carnet", "Medalla", "Estola", "Llavero"];

const MAT_POR_PAQUETE: Record<string, Record<string, number>> = {
  basico: { "Foto 8x12": 1, Medalla: 1, "Fotos Carnet": 4, "Foto 6x8": 1 },
  premium: { "Foto 8x12": 1, Medalla: 1, "Fotos Carnet": 8, Estola: 1, "Foto 10x15": 1, Llavero: 1 },
  lujo: { "Afiche 30x40": 1, "Foto 8x12": 1, "Fotos Carnet": 8, Estola: 1, "Foto 6x8": 2, Llavero: 1 },
};

export const API_DOLARES = "https://ve.dolarapi.com/v1/dolares";
export const API_EUROS = "https://ve.dolarapi.com/v1/euros";

export const OCR_CRED = {
  correo: "ocr-esca@thermal-scene-505819-t0.iam.gserviceaccount.com",
  id: "104968516099790647092",
  /* ⚠️ La clave es un secreto: se guarda en el navegador desde Configuración, no en el código. */
  clave: "",
};

export const PLANTILLAS_MENSAJE = [
  { id: "saldo", nombre: "Recordatorio de saldo", cuerpo: "Hola {{representante}}, le saluda Promociones JyG 🎓. Le recordamos que el paquete de {{estudiante}} tiene un saldo pendiente de {{saldo}}. Puede cancelar por Pago Móvil o Zelle. ¡Gracias!" },
  { id: "entrega", nombre: "Pedido listo para entrega", cuerpo: "Hola {{representante}}, ¡buenas noticias! 🎉 El paquete de {{estudiante}} ya está listo para entregar. Por favor preséntese con su comprobante. ¡Felicidades!" },
  { id: "oferta", nombre: "Oferta de paquete", cuerpo: "Hola {{representante}}, en Promociones JyG tenemos el paquete {{paquete}} que incluye: {{incluye}}… Todo por {{precio}}. ¡Reserve el cupo de {{estudiante}} hoy!" },
  { id: "bienvenida", nombre: "Bienvenida", cuerpo: "Hola {{representante}}, bienvenido(a) a Promociones JyG 🎓. Ya registramos a {{estudiante}} de {{escuela}}. Cualquier duda estamos a la orden." },
];

export const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", operador: "Operador", produccion: "Producción", cobranza: "Cobranza" };
export const ROL_DESC: Record<Rol, string> = {
  admin: "Control total del sistema: configuración, usuarios, reportes e integraciones.",
  operador: "Registra estudiantes, escuelas y profesores, y gestiona cotizaciones.",
  produccion: "Visualiza materiales, cola de producción y sesiones fotográficas.",
  cobranza: "Gestiona pagos, abonos, saldos y facturación.",
};

/* ============================================================
   ROLES Y ACCESOS — catálogo editable desde Usuarios
   ============================================================ */
export const ROLES_INFO: { id: Rol; label: string; desc: string; icon: string; color: string }[] = [
  { id: "admin", label: "Administrador", desc: "Control total del sistema", icon: "shield", color: "#104172" },
  { id: "operador", label: "Operador", desc: "Registra estudiantes y pagos", icon: "user", color: "#2f7ac2" },
  { id: "produccion", label: "Producción", desc: "Materiales, pedidos y fotos", icon: "factory", color: "#c98f00" },
  { id: "cobranza", label: "Cobranza", desc: "Pagos, saldos y reportes", icon: "wallet", color: "#e28800" },
];

export const MODULOS_GRUPOS: { seccion: string; icon: string; items: { ruta: string; label: string }[] }[] = [
  { seccion: "Principal", icon: "home", items: [{ ruta: "dashboard", label: "Dashboard" }] },
  {
    seccion: "CRM", icon: "briefcase", items: [
      { ruta: "clientes", label: "Clientes" },
      { ruta: "escuelas", label: "Escuelas" },
      { ruta: "docentes", label: "Profesores" },
      { ruta: "estudiantes", label: "Estudiantes" },
      { ruta: "ventas", label: "Ventas · Pedidos" },
      { ruta: "paquetes", label: "Paquetes" },
      { ruta: "cotizaciones", label: "Cotizaciones" },
      { ruta: "mensajes", label: "Mensajes" },
    ],
  },
  {
    seccion: "Operaciones", icon: "cog", items: [
      { ruta: "sesiones", label: "Sesiones Fotográficas" },
      { ruta: "agenda", label: "Agenda / Calendario" },
      { ruta: "produccion", label: "Producción" },
      { ruta: "qr", label: "Tarjetas QR" },
      { ruta: "ocr", label: "Escáner Inteligente" },
      { ruta: "facturas", label: "Facturación" },
    ],
  },
  {
    seccion: "Administración", icon: "lock", items: [
      { ruta: "reportes", label: "Reportes" },
      { ruta: "usuarios", label: "Usuarios" },
    ],
  },
  {
    seccion: "Sistema", icon: "server", items: [
      { ruta: "config", label: "Configuración" },
      { ruta: "integraciones", label: "Integraciones" },
    ],
  },
];

export const TODOS_MODULOS: string[] = MODULOS_GRUPOS.flatMap((g) => g.items.map((i) => i.ruta));

/* Accesos por defecto de cada rol (base de la matriz editable) */
export const ACCESOS_DEFAULT: Record<Rol, string[]> = {
  admin: [...TODOS_MODULOS],
  operador: ["dashboard", "clientes", "escuelas", "docentes", "estudiantes", "ventas", "paquetes", "cotizaciones", "mensajes", "qr", "ocr", "facturas"],
  produccion: ["dashboard", "paquetes", "produccion", "qr", "sesiones", "agenda"],
  cobranza: ["dashboard", "clientes", "estudiantes", "ventas", "facturas", "reportes", "mensajes"],
};

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
  direccion text default '', estado text default '', municipio text default '',
  anio_escolar text default '', observaciones text default ''
);
create table if not exists docentes (
  id text primary key, nombre text not null, telefono text default '',
  escuela_id text references escuelas(id) on delete set null, correo text default '', observaciones text default ''
);
create table if not exists estudiantes (
  id text primary key, pedido text not null, nombre text not null, telefono text default '',
  representante text default '', ci text default '',
  escuela_id text references escuelas(id) on delete set null,
  docente_id text references docentes(id) on delete set null,
  grado text default 'Bachiller', seccion text default 'A', paquete_id text default 'premium',
  precio_paquete numeric(12,2) default 0, estado_pedido text default 'Registrado',
  fecha_registro text default '', fecha_entrega text default '', observaciones text default '',
  codigos jsonb default '{}'::jsonb
);
create table if not exists pagos (
  id text primary key, estudiante_id text not null references estudiantes(id) on delete cascade,
  fecha text default '', monto numeric(12,2) default 0, metodo text default '',
  bs boolean default false, tasa numeric(12,4) default 0, usd numeric(12,2) default 0,
  referencia text default '', observacion text default ''
);
create table if not exists adicionales_items (
  id text primary key, estudiante_id text not null references estudiantes(id) on delete cascade,
  producto text default '', cantidad int default 1, precio numeric(12,2) default 0, talla text default ''
);
create table if not exists cotizaciones (
  id text primary key, numero text default '', fecha text default '', cliente text default '',
  telefono text default '', escuela text default '', paquete_id text default 'premium',
  estado text default 'Pendiente', nota text default ''
);
create table if not exists cotizacion_items (
  id text primary key, cotizacion_id text not null references cotizaciones(id) on delete cascade,
  producto text default '', cantidad int default 1, precio numeric(12,2) default 0, talla text default ''
);
create table if not exists sesiones (
  id text primary key, escuela_id text references escuelas(id) on delete set null,
  fecha text default '', hora text default '', fotografo text default '',
  estado text default 'Agendada', fotos int default 0, nota text default ''
);
create table if not exists eventos (
  id text primary key, fecha text default '', hora text default '', titulo text default '',
  tipo text default 'otro', escuela_id text references escuelas(id) on delete set null
);
create table if not exists mensajes (
  id text primary key, fecha text default '', destinatario text default '', telefono text default '',
  plantilla text default '', texto text default ''
);
create table if not exists usuarios (
  id text primary key, nombre text not null, usuario text default '', rol text default 'operador', activo boolean default true
);
create table if not exists historial_tasas (
  id text primary key, fecha text default '', usd numeric(12,4) default 0, euro numeric(12,4) default 0,
  paralelo numeric(12,4) default 0, fuente text default 'dolarapi', actualizado bigint default 0
);
create table if not exists paquetes_escuelas (
  id text primary key, escuela_id text not null references escuelas(id) on delete cascade,
  nombre text not null, tipo_paquete_id text default 'personalizado', precio numeric(12,2) default 0,
  articulos jsonb default '[]'::jsonb, nota text default '', activo boolean default true, creado text default ''
);
create table if not exists configuracion (
  id text primary key, data jsonb default '{}'::jsonb,
  seq_pedido int default 1, seq_cot int default 1, current_user_id text default ''
);
create index if not exists idx_pagos_est on pagos(estudiante_id);
create index if not exists idx_adic_est on adicionales_items(estudiante_id);
alter table escuelas enable row level security;
alter table docentes enable row level security;
alter table estudiantes enable row level security;
alter table pagos enable row level security;
alter table adicionales_items enable row level security;
alter table cotizaciones enable row level security;
alter table cotizacion_items enable row level security;
alter table sesiones enable row level security;
alter table eventos enable row level security;
alter table mensajes enable row level security;
alter table usuarios enable row level security;
alter table historial_tasas enable row level security;
alter table paquetes_escuelas enable row level security;
alter table configuracion enable row level security;
-- Políticas abiertas para la anon key (ajustar en producción)
create policy "anon_all" on escuelas for all using (true) with check (true);
create policy "anon_all" on docentes for all using (true) with check (true);
create policy "anon_all" on estudiantes for all using (true) with check (true);
create policy "anon_all" on pagos for all using (true) with check (true);
create policy "anon_all" on adicionales_items for all using (true) with check (true);
create policy "anon_all" on cotizaciones for all using (true) with check (true);
create policy "anon_all" on cotizacion_items for all using (true) with check (true);
create policy "anon_all" on sesiones for all using (true) with check (true);
create policy "anon_all" on eventos for all using (true) with check (true);
create policy "anon_all" on mensajes for all using (true) with check (true);
create policy "anon_all" on usuarios for all using (true) with check (true);
create policy "anon_all" on historial_tasas for all using (true) with check (true);
create policy "anon_all" on paquetes_escuelas for all using (true) with check (true);
create policy "anon_all" on configuracion for all using (true) with check (true);`;

/* ============================================================
   HELPERS
   ============================================================ */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtUSD = (n: number) => "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtBs = (n: number) => "Bs " + (Math.round(n * 100) / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtFecha = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtFechaHoraViva = (ts: number, now?: number) => {
  const d = new Date(ts);
  const hoy = new Date(now || Date.now()).toDateString();
  const hora = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === hoy ? `hoy · ${hora}` : `${fmtFecha(d.toISOString().slice(0, 10))} · ${hora}`;
};
export const fmtHaceSegundos = (ts: number, now?: number) => {
  const s = Math.max(0, Math.floor(((now || Date.now()) - ts) / 1000));
  if (s < 5) return "ahora mismo";
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h ${m % 60} min`;
};
export const fmtHoraAgo = (ts: number) => fmtHaceSegundos(ts);

export const waLink = (telefono: string, texto: string) => {
  let num = telefono.replace(/\D/g, "");
  if (num.startsWith("0")) num = "58" + num.slice(1);
  else if (num.startsWith("0414") || num.startsWith("0424") || num.startsWith("0412") || num.startsWith("0416") || num.startsWith("0426")) num = "58" + num.slice(1);
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
};
export const normalizePhone = (t: string) => {
  let n = t.replace(/\D/g, "");
  if (n.startsWith("0")) n = "58" + n.slice(1);
  return n;
};

export const toCSV = (headers: string[], rows: (string | number)[][]) =>
  "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${String(c).split('"').join('""')}"`).join(";")).join("\n");
export const downloadFile = (nombre: string, contenido: string, tipo = "text/csv;charset=utf-8") => {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/* Totales de un estudiante: total, abonado (en USD), saldo y estado de pago */
export function estudianteTotales(e: Estudiante) {
  const adicionales = e.adicionales.reduce((s, a) => s + a.cantidad * a.precio, 0);
  const total = (e.precioPaquete || 0) + adicionales;
  const abonado = e.pagos.reduce((s, p) => s + p.usd, 0);
  const saldo = Math.max(0, total - abonado);
  const partes = e.pagos.length;
  let estadoPago = "Sin Abonos";
  if (saldo <= 0.009 && total > 0) estadoPago = "Pagado Completo";
  else if (partes >= 3) estadoPago = "Tercera Parte";
  else if (partes === 2) estadoPago = "Segunda Parte";
  else if (partes === 1) estadoPago = "Primera Parte";
  return { total, abonado, saldo, partes, estadoPago };
}

/* Materiales requeridos por la cola de producción */
export function computeProduccion(estudiantes: Estudiante[]) {
  const materiales: Record<string, number> = {};
  const combos: Record<string, number> = {};
  const adicionales: Record<string, { cantidad: number; tallas: Record<string, number> }> = {};
  const add = (k: string, n: number) => { materiales[k] = (materiales[k] || 0) + n; };

  for (const e of estudiantes) {
    combos[e.paqueteId] = (combos[e.paqueteId] || 0) + 1;
    const mat = MAT_POR_PAQUETE[e.paqueteId] || {};
    for (const [k, n] of Object.entries(mat)) add(k, n);
    for (const a of e.adicionales) {
      if (!adicionales[a.producto]) adicionales[a.producto] = { cantidad: 0, tallas: {} };
      adicionales[a.producto].cantidad += a.cantidad;
      if (a.talla) adicionales[a.producto].tallas[a.talla] = (adicionales[a.producto].tallas[a.talla] || 0) + a.cantidad;
    }
  }
  return { materiales, combos, adicionales };
}

export const codigosCompletos = (e: Estudiante) => Object.values(e.codigos).every((c) => c.trim() !== "");

/* Cobros de los últimos 7 días (para la gráfica del dashboard) */
export function cobrosSemanales(estudiantes: Estudiante[]) {
  const dias: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const total = estudiantes.reduce((s, e) => s + e.pagos.filter((p) => p.fecha === iso).reduce((x, p) => x + p.usd, 0), 0);
    dias.push({ label: d.toLocaleDateString("es-VE", { weekday: "short" }), total });
  }
  return dias;
}

/* Parser OCR básico para C.I. / partidas venezolanas */
export function parseOcr(texto: string): OcrDraft {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  let ci = "";
  const mCi = texto.match(/V-?\s?(\d{1,3}([.\s]\d{3})*)/i);
  if (mCi) ci = "V-" + mCi[1].replace(/[.\s]/g, "");
  let nombre = "";
  for (const l of lineas) {
    if (/nombre/i.test(l)) {
      nombre = l.replace(/^.*nombre[^:]*:?\s*/i, "").trim();
      break;
    }
  }
  if (!nombre) {
    const cand = lineas.find((l) => /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,}$/.test(l) && !/rep[uú]blica|ministerio|registro|acta/i.test(l));
    if (cand) nombre = cand;
  }
  let fecha = "";
  const mF = texto.match(/(\d{2}[/-]\d{2}[/-]\d{4})/);
  if (mF) fecha = mF[1];
  return { nombre: nombre || "", ci, fecha };
}

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

const cod = () => ({ carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" });
export const SEED_ESTUDIANTES: Estudiante[] = [
  { id: "st1", pedido: "P-2401", nombre: "Gabriela Fernández", telefono: "0414-777.11.11", representante: "Rosa Fernández", ci: "V-28.456.123", escuelaId: "es1", docenteId: "do1", grado: "Bachiller", seccion: "A", paqueteId: "premium", precioPaquete: 40, adicionales: [{ producto: "Taza", cantidad: 1, precio: 8, talla: "" }], pagos: [{ id: "pg1", fecha: todayISO(), monto: 20, metodo: "Pago Móvil", bs: false, tasa: 348.5, usd: 20, referencia: "123456", observacion: "" }], estadoPedido: "Producción", fechaRegistro: todayISO(), fechaEntrega: "", observaciones: "", codigos: { ...cod(), carnetAlumno: "CA-2401" } },
  { id: "st2", pedido: "P-2402", nombre: "Alejandro Rojas", telefono: "0424-777.22.22", representante: "Miguel Rojas", ci: "V-27.889.456", escuelaId: "es1", docenteId: "do1", grado: "Bachiller", seccion: "B", paqueteId: "lujo", precioPaquete: 60, adicionales: [], pagos: [{ id: "pg2", fecha: todayISO(), monto: 30, metodo: "Zelle", bs: false, tasa: 348.5, usd: 30, referencia: "Z-9988", observacion: "" }], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "", observaciones: "", codigos: cod() },
  { id: "st3", pedido: "P-2403", nombre: "Valentina Torres", telefono: "0412-777.33.33", representante: "Luisa Torres", ci: "V-29.111.789", escuelaId: "es2", docenteId: "do2", grado: "Sexto Grado", seccion: "A", paqueteId: "basico", precioPaquete: 20, adicionales: [], pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "", observaciones: "", codigos: cod() },
  { id: "st4", pedido: "P-2404", nombre: "Sebastián Medina", telefono: "0416-777.44.44", representante: "Carlos Medina", ci: "V-28.777.321", escuelaId: "es3", docenteId: "do3", grado: "Bachiller", seccion: "C", paqueteId: "premium", precioPaquete: 40, adicionales: [{ producto: "Franela", cantidad: 1, precio: 12, talla: "M" }], pagos: [{ id: "pg4", fecha: todayISO(), monto: 52, metodo: "Pago Móvil", bs: false, tasa: 348.5, usd: 52, referencia: "778899", observacion: "Pago completo" }], estadoPedido: "Entregado", fechaRegistro: todayISO(), fechaEntrega: todayISO(), observaciones: "", codigos: cod() },
];
export const SEED_COTIZACIONES: Cotizacion[] = [
  { id: "co1", numero: "COT-0301", fecha: todayISO(), cliente: "Dra. Elena Vargas", telefono: "0414-888.11.22", escuela: "U.E. Simón Bolívar", paqueteId: "premium", adicionales: [], estado: "Pendiente", nota: "Interesada en 3 cupos" },
];
export const SEED_SESIONES: Sesion[] = [
  { id: "se1", escuelaId: "es1", fecha: todayISO(), hora: "09:00", fotografo: "Estudio Luz", estado: "Agendada", fotos: 0, nota: "Toma de toga y birrete" },
];
export const SEED_EVENTOS: Evento[] = [
  { id: "ev1", fecha: todayISO(), hora: "10:00", titulo: "Entrega paquetes Liceo Andrés Bello", tipo: "entrega", escuelaId: "es2" },
];
export const SEED_USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Jesús García", usuario: "admin", rol: "admin", activo: true },
  { id: "u2", nombre: "María Paredes", usuario: "operador1", rol: "operador", activo: true },
  { id: "u3", nombre: "Pedro Fuentes", usuario: "produccion1", rol: "produccion", activo: true },
  { id: "u4", nombre: "Laura Díaz", usuario: "cobranza1", rol: "cobranza", activo: true },
];

const hist = (dias: number, base: number) =>
  Array.from({ length: dias }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (dias - 1 - i));
    return {
      id: "ht" + i, fecha: d.toISOString().slice(0, 10),
      usd: +(base + i * 0.35).toFixed(2), euro: +((base + i * 0.35) * 1.09).toFixed(2),
      paralelo: +(base + i * 0.35 + 12).toFixed(2), fuente: "dolarapi" as const, actualizado: d.getTime(),
    };
  });
export const SEED_HISTORIAL: HistorialTasa[] = hist(15, 345.8);

export const SEED_PAQUETES_ESCUELAS: PaqueteEscuela[] = [
  { id: "pe1", escuelaId: "es1", nombre: "Paquete VIP Simón Bolívar", tipoPaqueteId: "premium", precio: 38, articulos: PAQUETES.premium.incluye.map((n) => ({ nombre: n, cantidad: 1 })), nota: "Descuento por volumen", activo: true, creado: todayISO() },
];

export const SEED_CONFIG: Config = {
  empresa: { nombre: "Promociones JyG", rif: "J-40123456-7", direccion: "Av. Bolívar, Centro Comercial Plaza, Local 12, Valencia", telefono: "0414-555.00.00" },
  preciosPaquetes: [20, 22, 28, 30, 35, 40, 45, 48, 55, 60, 80, 110, 145],
  usarApi: true, usarTasaManual: false, tasaFallback: 348.5, tasaManualUSD: 348.5, tasaManualEUR: 384.2,
  historialAuto: true, supabaseUrl: "", supabaseKey: "", autoSyncCloud: false,
};
