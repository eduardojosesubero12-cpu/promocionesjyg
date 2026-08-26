import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Config, Cotizacion, Docente, Escuela, Estudiante, Evento, HistorialTasa,
  MensajeLog, OcrDraft, Pago, Rol, Sesion, Usuario, PaqueteEscuela,
} from "./data";
import {
  ACCESOS_DEFAULT, API_DOLARES, API_EUROS, SEED_CONFIG, SEED_COTIZACIONES, SEED_DOCENTES, SEED_ESCUELAS,
  SEED_ESTUDIANTES, SEED_EVENTOS, SEED_HISTORIAL, SEED_PAQUETES_ESCUELAS, SEED_SESIONES, SEED_USUARIOS,
  todayISO, uid,
} from "./data";

export type Route =
  | "dashboard" | "clientes" | "escuelas" | "docentes" | "estudiantes" | "ventas" | "cotizaciones"
  | "paquetes" | "mensajes" | "sesiones" | "agenda" | "produccion" | "qr" | "ocr" | "facturas"
  | "reportes" | "usuarios" | "config" | "integraciones";

export const ACCESS: Record<Rol, Route[]> = {
  admin: ["dashboard", "clientes", "escuelas", "docentes", "estudiantes", "ventas", "cotizaciones", "paquetes", "mensajes", "sesiones", "agenda", "produccion", "qr", "ocr", "facturas", "reportes", "usuarios", "config", "integraciones"],
  operador: ["dashboard", "clientes", "escuelas", "docentes", "estudiantes", "ventas", "cotizaciones", "paquetes", "mensajes", "qr", "ocr", "facturas"],
  produccion: ["dashboard", "paquetes", "produccion", "qr", "sesiones"],
  cobranza: ["dashboard", "clientes", "estudiantes", "ventas", "facturas", "reportes", "mensajes"],
};
export const ROUTE_TITLE: Record<Route, string> = {
  dashboard: "Dashboard", clientes: "Clientes", escuelas: "Escuelas", docentes: "Profesores",
  estudiantes: "Estudiantes", ventas: "Ventas", cotizaciones: "Cotizaciones", paquetes: "Paquetes",
  mensajes: "Mensajes", sesiones: "Sesiones Fotográficas", agenda: "Agenda / Calendario",
  produccion: "Producción", qr: "Tarjetas QR", ocr: "Escáner OCR", facturas: "Facturación",
  reportes: "Reportes", usuarios: "Usuarios", config: "Configuración", integraciones: "Integraciones",
};
export const SECTION_OF: Record<Route, string> = {
  dashboard: "Inicio", clientes: "CRM", escuelas: "CRM", docentes: "CRM", estudiantes: "CRM",
  ventas: "CRM", cotizaciones: "CRM", paquetes: "CRM", mensajes: "CRM", sesiones: "Operaciones",
  agenda: "Operaciones", produccion: "Operaciones", qr: "Operaciones", ocr: "Operaciones",
  facturas: "Operaciones", reportes: "Administración", usuarios: "Administración",
  config: "Sistema", integraciones: "Sistema",
};

interface DB {
  escuelas: Escuela[]; docentes: Docente[]; estudiantes: Estudiante[]; cotizaciones: Cotizacion[];
  sesiones: Sesion[]; eventos: Evento[]; mensajes: MensajeLog[]; usuarios: Usuario[];
  historialTasas: HistorialTasa[]; paquetesEscuelas: PaqueteEscuela[]; config: Config;
  currentUserId: string; seqPedido: number; seqCot: number;
}
interface Tasa { usd: number; eur: number; compra: number; venta: number; paralelo: number; updated: number; source: "api" | "manual" | "respaldo"; apiOk: boolean; fechaApi: string; }
interface ConfirmOpts { title: string; message: string; confirmText?: string; danger?: boolean; }
interface ToastItem { id: string; text: string; tone: "ok" | "warn" | "err" }

const seedDB = (): DB => ({
  escuelas: SEED_ESCUELAS, docentes: SEED_DOCENTES, estudiantes: SEED_ESTUDIANTES,
  cotizaciones: SEED_COTIZACIONES, sesiones: SEED_SESIONES, eventos: SEED_EVENTOS,
  mensajes: [], usuarios: SEED_USUARIOS, historialTasas: SEED_HISTORIAL,
  paquetesEscuelas: SEED_PAQUETES_ESCUELAS, config: SEED_CONFIG,
  currentUserId: "u1", seqPedido: 2405, seqCot: 302,
});

const KEY = "jyg-crm-db-v1";
const upsertHoy = (hist: HistorialTasa[], v: { usd: number; euro: number; paralelo: number; fuente: HistorialTasa["fuente"] }): HistorialTasa[] => {
  const hoy = todayISO();
  const existe = hist.some((h) => h.fecha === hoy);
  const next = existe
    ? hist.map((h) => (h.fecha === hoy ? { ...h, ...v, actualizado: Date.now() } : h))
    : [...hist, { id: uid(), fecha: hoy, ...v, actualizado: Date.now() }];
  return [...next].sort((a, b) => a.fecha.localeCompare(b.fecha));
};

interface Ctx {
  db: DB; route: Route; param: any; setParam: (p: any) => void; setRoute: (r: Route, p?: any) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  mobileNav: boolean; setMobileNav: (v: boolean) => void;
  dark: boolean; toggleDark: () => void;
  user: Usuario; can: (r: Route) => boolean; setCurrentUser: (id: string) => void;
  setRolPermisos: (rol: Rol, rutas: string[]) => void; setRolActivo: (rol: Rol, activo: boolean) => void;
  tasa: Tasa; tasaLoading: boolean; refreshTasa: () => void;
  ocrOpen: boolean; setOcrOpen: (v: boolean) => void;
  ocrDraft: OcrDraft | null; setOcrDraft: (d: OcrDraft | null) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  confirmState: (ConfirmOpts & { resolve: (v: boolean) => void }) | null; resolveConfirm: (v: boolean) => void;
  success: (t?: string) => void;
  successState: { title: string; close: () => void } | null;
  toasts: ToastItem[]; toast: (t: string, tone?: "ok" | "warn" | "err") => void;
  saveEscuela: (e: Escuela) => void; deleteEscuela: (id: string) => void;
  saveDocente: (d: Docente) => void; deleteDocente: (id: string) => void;
  saveEstudiante: (e: Estudiante) => void; deleteEstudiante: (id: string) => void;
  addPago: (estId: string, p: Pago) => void; deletePago: (estId: string, pagoId: string) => void;
  setPedidoEstado: (estId: string, estado: string) => void;
  saveCodigos: (estId: string, codigos: Estudiante["codigos"]) => void;
  saveCotizacion: (c: Cotizacion) => void; deleteCotizacion: (id: string) => void; convertirCotizacion: (id: string) => void;
  saveSesion: (s: Sesion) => void; deleteSesion: (id: string) => void;
  saveEvento: (e: Evento) => void; deleteEvento: (id: string) => void;
  addMensaje: (m: MensajeLog) => void;
  saveUsuario: (u: Usuario) => void; deleteUsuario: (id: string) => void;
  setConfig: (patch: Partial<Config>) => void;
  deleteTasaHistorial: (id: string) => void; clearTasaHistorial: () => void;
  savePaqueteEscuela: (p: PaqueteEscuela) => void; deletePaqueteEscuela: (id: string) => void;
  exportBackup: () => string; importBackup: (json: string) => boolean;
  syncInfo: { last: number; ok: boolean; msg: string } | null; syncing: boolean;
  testCloud: (urlArg?: string, keyArg?: string) => Promise<{ tablas: number; filas: number }>;
  syncToCloud: (onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void) => Promise<boolean>;
  restoreFromCloud: () => Promise<boolean>;
  alerts: { key: string; title: string; desc: string; route: Route }[];
}

const Ctx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fuera de AppProvider");
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.estudiantes) && d.config) return { ...seedDB(), ...d };
      }
    } catch { /* noop */ }
    return seedDB();
  });
  const dbRef = useRef(db);
  dbRef.current = db;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* noop */ } }, [db]);

  const [route, setRouteState] = useState<Route>("dashboard");
  const [param, setParam] = useState<any>(null);
  const setRoute = useCallback((r: Route, p?: any) => { setRouteState(r); setParam(p ?? null); window.scrollTo({ top: 0 }); }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggleDark = useCallback(() => {
    setDark((v) => {
      const nv = !v;
      document.documentElement.classList.toggle("dark", nv);
      document.documentElement.setAttribute("data-bs-theme", nv ? "dark" : "light");
      try { localStorage.setItem("jyg-theme", nv ? "dark" : "light"); } catch { /* noop */ }
      return nv;
    });
  }, []);

  const user = useMemo(() => db.usuarios.find((u) => u.id === db.currentUserId) || db.usuarios[0], [db.usuarios, db.currentUserId]);
  /* Accesos: se leen de config.rolesPermisos (editables); si no, defaults. Si el rol está desactivado, sin acceso. */
  const can = useCallback((r: Route) => {
    const rol = user.rol;
    if (db.config.rolesActivos && db.config.rolesActivos[rol] === false) return false;
    const rutas = db.config.rolesPermisos?.[rol] ?? (ACCESS[rol] as string[]) ?? ACCESOS_DEFAULT[rol];
    return rutas.includes(r);
  }, [user, db.config.rolesPermisos, db.config.rolesActivos]);
  const setCurrentUser = useCallback((id: string) => setDb((d) => ({ ...d, currentUserId: id })), []);

  /* ---- Tasa en vivo ---- */
  const [tasa, setTasa] = useState<Tasa>({ usd: db.config.tasaFallback, eur: db.config.tasaManualEUR, compra: 0, venta: 0, paralelo: 0, updated: Date.now(), source: "respaldo", apiOk: false, fechaApi: "" });
  const [tasaLoading, setTasaLoading] = useState(false);

  const refreshTasa = useCallback(async () => {
    const cfg = dbRef.current.config;
    if (cfg.usarTasaManual) {
      setTasa({ usd: cfg.tasaManualUSD, eur: cfg.tasaManualEUR, compra: 0, venta: 0, paralelo: 0, updated: Date.now(), source: "manual", apiOk: false, fechaApi: "" });
      return;
    }
    if (!cfg.usarApi) {
      setTasa({ usd: cfg.tasaFallback, eur: cfg.tasaManualEUR, compra: 0, venta: 0, paralelo: 0, updated: Date.now(), source: "respaldo", apiOk: false, fechaApi: "" });
      return;
    }
    setTasaLoading(true);
    try {
      const [rUsd, rEur] = await Promise.all([fetch(API_DOLARES), fetch(API_EUROS)]);
      const jUsd: any[] = await rUsd.json();
      const jEur: any[] = await rEur.json();
      const usd = (Array.isArray(jUsd) ? jUsd : [jUsd]).find((x) => (x.moneda || x.casa) === "USD") || jUsd[0] || {};
      const eur = (Array.isArray(jEur) ? jEur : [jEur]).find((x) => (x.moneda || x.casa) === "EUR") || jEur[0] || {};
      const usdVal = usd.promedio || usd.venta || 0;
      const eurVal = eur.promedio || eur.venta || 0;
      if (!usdVal) throw new Error("sin datos");
      const fechaApi = usd.fechaActualizacion || usd.fechaActualiza || "";
      setTasa({ usd: usdVal, eur: eurVal, compra: usd.compra || 0, venta: usd.venta || 0, paralelo: 0, updated: Date.now(), source: "api", apiOk: true, fechaApi });
      setDb((d) => ({ ...d, historialTasas: upsertHoy(d.historialTasas, { usd: usdVal, euro: eurVal, paralelo: 0, fuente: "dolarapi" }) }));
    } catch {
      setTasa((t) => ({ ...t, source: "respaldo", apiOk: false }));
    } finally { setTasaLoading(false); }
  }, []);

  useEffect(() => { void refreshTasa(); const iv = setInterval(() => void refreshTasa(), 5 * 60 * 1000); return () => clearInterval(iv); }, [refreshTasa]);

  /* ---- OCR ---- */
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft | null>(null);

  /* ---- Confirm / success / toasts ---- */
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })), []);
  const resolveConfirm = useCallback((v: boolean) => { confirmState?.resolve(v); setConfirmState(null); }, [confirmState]);

  const [successState, setSuccessState] = useState<{ title: string; close: () => void } | null>(null);
  const success = useCallback((t?: string) => {
    const item = { title: t || "Registro guardado correctamente", close: () => setSuccessState(null) };
    setSuccessState(item);
    setTimeout(() => setSuccessState((s) => (s === item ? null : s)), 1800);
  }, []);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = useCallback((text: string, tone: "ok" | "warn" | "err" = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  /* ---- Mutadores ---- */
  const mutate = useCallback((fn: (d: DB) => DB) => setDb((d) => fn(d)), []);
  const upsert = <T extends { id: string }>(arr: T[], item: T): T[] => arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item];

  const saveEscuela = useCallback((e: Escuela) => mutate((d) => ({ ...d, escuelas: upsert(d.escuelas, e) })), [mutate]);
  const deleteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, escuelas: d.escuelas.filter((x) => x.id !== id) })), [mutate]);
  const saveDocente = useCallback((e: Docente) => mutate((d) => ({ ...d, docentes: upsert(d.docentes, e) })), [mutate]);
  const deleteDocente = useCallback((id: string) => mutate((d) => ({ ...d, docentes: d.docentes.filter((x) => x.id !== id) })), [mutate]);
  const saveEstudiante = useCallback((e: Estudiante) => mutate((d) => {
    const existe = d.estudiantes.some((x) => x.id === e.id);
    return {
      ...d,
      estudiantes: upsert(d.estudiantes, { ...e, id: e.id || uid() }),
      seqPedido: existe ? d.seqPedido : d.seqPedido + 1,
    };
  }), [mutate]);
  const deleteEstudiante = useCallback((id: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.filter((x) => x.id !== id) })), [mutate]);
  const addPago = useCallback((estId: string, p: Pago) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, pagos: [...e.pagos, p] } : e)) })), [mutate]);
  const deletePago = useCallback((estId: string, pagoId: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, pagos: e.pagos.filter((x) => x.id !== pagoId) } : e)) })), [mutate]);
  const setPedidoEstado = useCallback((estId: string, estado: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, estadoPedido: estado, fechaEntrega: estado === "Entregado" ? todayISO() : e.fechaEntrega } : e)) })), [mutate]);
  const saveCodigos = useCallback((estId: string, codigos: Estudiante["codigos"]) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, codigos } : e)) })), [mutate]);
  const saveCotizacion = useCallback((c: Cotizacion) => mutate((d) => {
    const existe = d.cotizaciones.some((x) => x.id === c.id);
    return { ...d, cotizaciones: upsert(d.cotizaciones, c), seqCot: existe ? d.seqCot : d.seqCot + 1 };
  }), [mutate]);
  const deleteCotizacion = useCallback((id: string) => mutate((d) => ({ ...d, cotizaciones: d.cotizaciones.filter((x) => x.id !== id) })), [mutate]);
  const convertirCotizacion = useCallback((id: string) => mutate((d) => {
    const c = d.cotizaciones.find((x) => x.id === id);
    if (!c) return d;
    const escuela = d.escuelas.find((e) => e.nombre === c.escuela);
    const nuevo: Estudiante = {
      id: uid(), pedido: `P-${d.seqPedido}`, nombre: c.cliente, telefono: c.telefono, representante: c.cliente, ci: "",
      escuelaId: escuela?.id || "", docenteId: "", grado: "Bachiller", seccion: "A", paqueteId: c.paqueteId,
      precioPaquete: ( { basico: 20, premium: 40, lujo: 60 } as Record<string, number>)[c.paqueteId] || 40,
      adicionales: c.adicionales, pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "",
      observaciones: `Convertida de ${c.numero}`, codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
    };
    return {
      ...d,
      estudiantes: [...d.estudiantes, nuevo],
      cotizaciones: d.cotizaciones.map((x) => (x.id === id ? { ...x, estado: "Aceptada" as const } : x)),
      seqPedido: d.seqPedido + 1,
    };
  }), [mutate]);
  const saveSesion = useCallback((s: Sesion) => mutate((d) => ({ ...d, sesiones: upsert(d.sesiones, s) })), [mutate]);
  const deleteSesion = useCallback((id: string) => mutate((d) => ({ ...d, sesiones: d.sesiones.filter((x) => x.id !== id) })), [mutate]);
  const saveEvento = useCallback((e: Evento) => mutate((d) => ({ ...d, eventos: upsert(d.eventos, e) })), [mutate]);
  const deleteEvento = useCallback((id: string) => mutate((d) => ({ ...d, eventos: d.eventos.filter((x) => x.id !== id) })), [mutate]);
  const addMensaje = useCallback((m: MensajeLog) => mutate((d) => ({ ...d, mensajes: [m, ...d.mensajes] })), [mutate]);
  const saveUsuario = useCallback((u: Usuario) => mutate((d) => ({ ...d, usuarios: upsert(d.usuarios, u) })), [mutate]);
  const deleteUsuario = useCallback((id: string) => mutate((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== id) })), [mutate]);
  const deleteTasaHistorial = useCallback((id: string) => mutate((d) => ({ ...d, historialTasas: d.historialTasas.filter((x) => x.id !== id) })), [mutate]);
  const clearTasaHistorial = useCallback(() => mutate((d) => ({ ...d, historialTasas: [] })), [mutate]);
  const setConfig = useCallback((patch: Partial<Config>) => mutate((d) => ({ ...d, config: { ...d.config, ...patch } })), [mutate]);

  /* ---- Edición de roles y accesos (persistente) ---- */
  const setRolPermisos = useCallback((rol: Rol, rutas: string[]) => mutate((d) => ({
    ...d,
    config: { ...d.config, rolesPermisos: { ...(d.config.rolesPermisos || {}), [rol]: rutas } as Record<Rol, string[]> },
  })), [mutate]);
  const setRolActivo = useCallback((rol: Rol, activo: boolean) => mutate((d) => ({
    ...d,
    config: { ...d.config, rolesActivos: { ...(d.config.rolesActivos || {}), [rol]: activo } as Record<Rol, boolean> },
  })), [mutate]);
  const savePaqueteEscuela = useCallback((p: PaqueteEscuela) => mutate((d) => ({ ...d, paquetesEscuelas: upsert(d.paquetesEscuelas, p) })), [mutate]);
  const deletePaqueteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, paquetesEscuelas: d.paquetesEscuelas.filter((x) => x.id !== id) })), [mutate]);

  const exportBackup = useCallback(() => JSON.stringify(dbRef.current), []);
  const importBackup = useCallback((json: string) => {
    try {
      const d = JSON.parse(json);
      if (!d || !Array.isArray(d.estudiantes) || !d.config) return false;
      setDb({ ...seedDB(), ...d });
      return true;
    } catch { return false; }
  }, []);

  /* ---- Nube (Supabase, carga diferida) ---- */
  const [syncInfo, setSyncInfo] = useState<{ last: number; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const clienteSb = useCallback(async (urlArg?: string, keyArg?: string) => {
    const c = dbRef.current.config;
    const url = urlArg || c.supabaseUrl;
    const key = keyArg || c.supabaseKey;
    if (!url || !key) return null;
    const { sbClient } = await import("./supabase");
    return sbClient(url, key);
  }, []);
  const testCloud = useCallback(async (urlArg?: string, keyArg?: string) => {
    const client = await clienteSb(urlArg, keyArg);
    if (!client) throw new Error("Faltan la URL del proyecto o la anon key de Supabase");
    const { probarConexion } = await import("./supabase");
    return probarConexion(client);
  }, [clienteSb]);
  const syncToCloud = useCallback(async (onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void) => {
    const client = await clienteSb();
    if (!client) { setSyncInfo({ last: Date.now(), ok: false, msg: "Configura la URL y la anon key de Supabase en Integraciones" }); return false; }
    setSyncing(true);
    try {
      const { subirTodo } = await import("./supabase");
      await subirTodo(client, dbRef.current, onTabla);
      setSyncInfo({ last: Date.now(), ok: true, msg: "Base de datos subida a Supabase (14 tablas sincronizadas)" });
      return true;
    } catch (e: any) {
      setSyncInfo({ last: Date.now(), ok: false, msg: `Error al subir: ${e.message}` });
      return false;
    } finally { setSyncing(false); }
  }, [clienteSb]);
  const restoreFromCloud = useCallback(async () => {
    const client = await clienteSb();
    if (!client) { setSyncInfo({ last: Date.now(), ok: false, msg: "Configura la URL y la anon key de Supabase" }); return false; }
    setSyncing(true);
    try {
      const { descargarTodo, rowsToDb } = await import("./supabase");
      const rows = await descargarTodo(client);
      const nuevo = rowsToDb(rows, dbRef.current);
      setDb({ ...seedDB(), ...nuevo });
      setSyncInfo({ last: Date.now(), ok: true, msg: "Base de datos restaurada desde Supabase" });
      return true;
    } catch (e: any) {
      setSyncInfo({ last: Date.now(), ok: false, msg: `Error al restaurar: ${e.message}` });
      return false;
    } finally { setSyncing(false); }
  }, [clienteSb]);

  /* ---- Alertas del dashboard / notificaciones ---- */
  const alerts = useMemo(() => {
    const a: { key: string; title: string; desc: string; route: Route }[] = [];
    const pendientes = db.estudiantes.filter((e) => {
      const t = e.pagos.reduce((s, p) => s + p.usd, 0);
      return e.precioPaquete + e.adicionales.reduce((s, x) => s + x.cantidad * x.precio, 0) - t > 0.009;
    }).length;
    if (pendientes > 0) a.push({ key: "pagos", title: "Pagos pendientes", desc: `${pendientes} estudiantes con saldo por cobrar`, route: "facturas" });
    const sinFoto = db.estudiantes.filter((e) => e.estadoPedido !== "Entregado" && Object.values(e.codigos).some((c) => !c)).length;
    if (sinFoto > 0) a.push({ key: "fotos", title: "Pedidos sin fotografías", desc: `${sinFoto} pedidos con códigos de foto incompletos`, route: "produccion" });
    const listos = db.estudiantes.filter((e) => e.estadoPedido === "Empaque").length;
    if (listos > 0) a.push({ key: "entrega", title: "Listos para entregar", desc: `${listos} pedidos en empaque esperando entrega`, route: "ventas" });
    return a;
  }, [db.estudiantes]);

  const value: Ctx = {
    db, route, param, setParam, setRoute, collapsed, setCollapsed, mobileNav, setMobileNav,
    dark, toggleDark, user, can, setCurrentUser, tasa, tasaLoading, refreshTasa,
    ocrOpen, setOcrOpen, ocrDraft, setOcrDraft, confirm, confirmState, resolveConfirm,
    success, successState, toasts, toast,
    saveEscuela, deleteEscuela, saveDocente, deleteDocente, saveEstudiante, deleteEstudiante,
    addPago, deletePago, setPedidoEstado, saveCodigos, saveCotizacion, deleteCotizacion, convertirCotizacion,
    saveSesion, deleteSesion, saveEvento, deleteEvento, addMensaje, saveUsuario, deleteUsuario,
    setConfig, deleteTasaHistorial, clearTasaHistorial, savePaqueteEscuela, deletePaqueteEscuela, exportBackup, importBackup,
    setRolPermisos, setRolActivo,
    syncInfo, syncing, testCloud, syncToCloud, restoreFromCloud, alerts,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
