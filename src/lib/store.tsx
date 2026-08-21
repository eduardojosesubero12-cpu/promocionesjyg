import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Config, Cotizacion, Docente, Escuela, Estudiante, Evento, HistorialTasa,
  MensajeLog, OcrDraft, Pago, PaqueteEscuela, Rol, Sesion, Usuario, CRMData,
} from "./data";
import {
  API_DOLARES, API_EUROS, SEED_CONFIG, SEED_COTIZACIONES, SEED_DOCENTES, SEED_ESCUELAS,
  SEED_ESTUDIANTES, SEED_EVENTOS, SEED_HISTORIAL, SEED_PAQUETES_ESCUELAS, SEED_SESIONES, SEED_USUARIOS,
  estudianteTotales, todayISO, uid,
} from "./data";
/* La capa de Supabase se carga bajo demanda (dynamic import) para no engordar el arranque del CRM */

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

interface DB {
  escuelas: Escuela[]; docentes: Docente[]; estudiantes: Estudiante[]; cotizaciones: Cotizacion[];
  sesiones: Sesion[]; eventos: Evento[]; mensajes: MensajeLog[]; usuarios: Usuario[];
  historialTasas: HistorialTasa[]; paquetesEscuelas: PaqueteEscuela[];
  config: Config; currentUserId: string; seqPedido: number; seqCot: number;
}

interface Tasa { usd: number; eur: number; compra: number; venta: number; paralelo: number; updated: number; source: "api" | "manual" | "respaldo"; apiOk: boolean; fechaApi: string; }
interface ConfirmOpts { title: string; message: string; confirmText?: string; danger?: boolean; }
interface ToastItem { id: string; text: string; tone: "ok" | "warn" | "err" }

const seedDB = (): DB => ({
  escuelas: SEED_ESCUELAS, docentes: SEED_DOCENTES, estudiantes: SEED_ESTUDIANTES,
  cotizaciones: SEED_COTIZACIONES, sesiones: SEED_SESIONES, eventos: SEED_EVENTOS,
  mensajes: [], usuarios: SEED_USUARIOS, historialTasas: SEED_HISTORIAL,
  paquetesEscuelas: SEED_PAQUETES_ESCUELAS, config: SEED_CONFIG,
  currentUserId: "u1", seqPedido: 2411, seqCot: 303,
});

/* Carga DEFENSIVA: completa cualquier campo ausente con semillas (evita pantalla en blanco con datos viejos) */
const loadDB = (): DB => {
  const base = seedDB();
  try {
    const raw = localStorage.getItem("jyg-db-v3");
    if (!raw) return base;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.estudiantes) || !d.config) return base;
    return {
      escuelas: Array.isArray(d.escuelas) ? d.escuelas : base.escuelas,
      docentes: Array.isArray(d.docentes) ? d.docentes : base.docentes,
      estudiantes: d.estudiantes,
      cotizaciones: Array.isArray(d.cotizaciones) ? d.cotizaciones : base.cotizaciones,
      sesiones: Array.isArray(d.sesiones) ? d.sesiones : base.sesiones,
      eventos: Array.isArray(d.eventos) ? d.eventos : base.eventos,
      mensajes: Array.isArray(d.mensajes) ? d.mensajes : base.mensajes,
      usuarios: Array.isArray(d.usuarios) && d.usuarios.length ? d.usuarios : base.usuarios,
      historialTasas: Array.isArray(d.historialTasas) && d.historialTasas.length ? d.historialTasas : base.historialTasas,
      paquetesEscuelas: Array.isArray(d.paquetesEscuelas) ? d.paquetesEscuelas : base.paquetesEscuelas,
      config: { ...base.config, ...(d.config || {}) },
      currentUserId: d.currentUserId || base.currentUserId,
      seqPedido: typeof d.seqPedido === "number" ? d.seqPedido : base.seqPedido,
      seqCot: typeof d.seqCot === "number" ? d.seqCot : base.seqCot,
    };
  } catch { return base; }
};

const upsertHoy = (hist: HistorialTasa[], v: { usd: number; euro: number; paralelo: number; fuente: HistorialTasa["fuente"] }): HistorialTasa[] => {
  const hoy = todayISO();
  const existe = hist.some((x) => x.fecha === hoy);
  const next = existe
    ? hist.map((x) => (x.fecha === hoy ? { ...x, ...v, actualizado: Date.now() } : x))
    : [...hist, { id: uid(), fecha: hoy, ...v, actualizado: Date.now() }];
  return [...next].sort((a, b) => a.fecha.localeCompare(b.fecha));
};

interface Ctx {
  db: DB; route: Route; param: any; setParam: (p: any) => void;
  setRoute: (r: Route, p?: any) => void;
  user: Usuario; setUser: (id: string) => void; can: (r: Route) => boolean;
  dark: boolean; toggleDark: () => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  mobileNav: boolean; setMobileNav: (v: boolean) => void;
  tasa: Tasa; refreshTasa: () => void; tasaLoading: boolean;
  aplicarTasaManual: (usd: number, eur: number) => void;
  deleteTasaHistorial: (id: string) => void; clearTasaHistorial: () => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  confirmState: (ConfirmOpts & { key: number }) | null; resolveConfirm: (v: boolean) => void;
  success: (title?: string) => void; successState: { title: string; key: number; close: () => void } | null;
  toast: (text: string, tone?: ToastItem["tone"]) => void; toasts: ToastItem[];
  ocrOpen: boolean; setOcrOpen: (v: boolean) => void;
  ocrDraft: OcrDraft | null; setOcrDraft: (d: OcrDraft | null) => void;
  saveEscuela: (e: Escuela) => void; deleteEscuela: (id: string) => void;
  saveDocente: (d: Docente) => void; deleteDocente: (id: string) => void;
  saveEstudiante: (e: Estudiante) => void; deleteEstudiante: (id: string) => void;
  addPago: (estId: string, p: Pago) => void; deletePago: (estId: string, pagoId: string) => void;
  setPedidoEstado: (estId: string, estado: string) => void;
  saveCodigos: (estId: string, c: Estudiante["codigos"]) => void;
  saveCotizacion: (c: Cotizacion) => void; deleteCotizacion: (id: string) => void; convertirCotizacion: (id: string) => void;
  saveSesion: (s: Sesion) => void; deleteSesion: (id: string) => void;
  saveEvento: (e: Evento) => void; deleteEvento: (id: string) => void;
  addMensaje: (m: MensajeLog) => void;
  saveUsuario: (u: Usuario) => void; deleteUsuario: (id: string) => void;
  setConfig: (patch: Partial<Config>) => void;
  savePaqueteEscuela: (p: PaqueteEscuela) => void; deletePaqueteEscuela: (id: string) => void;
  exportBackup: () => string; importBackup: (json: string) => boolean;
  syncInfo: { last: number; ok: boolean; msg: string } | null; syncing: boolean;
  testCloud: (urlArg?: string, keyArg?: string) => Promise<{ tablas: number; filas: number }>;
  syncToCloud: (onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void) => Promise<boolean>;
  restoreFromCloud: () => Promise<boolean>;
  alerts: { key: string; title: string; desc: string; route: Route }[];
}

const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const dbRef = useRef(db);
  dbRef.current = db;
  const [route, setRouteState] = useState<Route>("dashboard");
  const [param, setParam] = useState<any>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { key: number }) | null>(null);
  const confirmResolver = useRef<((v: boolean) => void) | null>(null);
  const [successState, setSuccessState] = useState<{ title: string; key: number; close: () => void } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft | null>(null);
  const [tasaLoading, setTasaLoading] = useState(false);
  const [tasa, setTasa] = useState<Tasa>(() => {
    try {
      const raw = localStorage.getItem("jyg-tasa");
      if (raw) { const t = JSON.parse(raw); if (t && t.usd) return { ...t, apiOk: !!t.apiOk }; }
    } catch { /* noop */ }
    return { usd: dbRef.current.config.tasaManualUSD || 348.5, eur: dbRef.current.config.tasaManualEUR || 384.2, compra: 0, venta: 0, paralelo: 0, updated: Date.now(), source: "respaldo", apiOk: false, fechaApi: "" };
  });

  /* Persistencia */
  useEffect(() => { try { localStorage.setItem("jyg-db-v3", JSON.stringify(db)); } catch { /* noop */ } }, [db]);
  useEffect(() => { try { localStorage.setItem("jyg-tasa", JSON.stringify(tasa)); } catch { /* noop */ } }, [tasa]);

  const setRoute = useCallback((r: Route, p?: any) => {
    setRouteState(r); setParam(p ?? null); setMobileNav(false);
    window.scrollTo({ top: 0 });
  }, []);

  const mutate = useCallback((fn: (d: DB) => DB) => setDb((d) => fn(d)), []);

  const toggleDark = useCallback(() => {
    setDark((v) => {
      const nv = !v;
      document.documentElement.classList.toggle("dark", nv);
      try { localStorage.setItem("jyg-theme", nv ? "dark" : "light"); } catch { /* noop */ }
      return nv;
    });
  }, []);

  /* ---------- Alertas SweetAlert ---------- */
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((res) => {
    confirmResolver.current = res;
    setConfirmState({ ...o, key: Date.now() });
  }), []);
  const resolveConfirm = useCallback((v: boolean) => {
    setConfirmState(null);
    confirmResolver.current?.(v);
    confirmResolver.current = null;
  }, []);
  const success = useCallback((title = "Registro guardado correctamente") => {
    setSuccessState({ title, key: Date.now(), close: () => setSuccessState(null) });
  }, []);
  const toast = useCallback((text: string, tone: ToastItem["tone"] = "ok") => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /* ---------- Tasa del día (ve.dolarapi.com) con historial diario ---------- */
  const refreshTasa = useCallback(async () => {
    const cfg = dbRef.current.config;
    setTasaLoading(true);
    try {
      const extraer = (j: any, moneda: string) => {
        const arr = Array.isArray(j) ? j : [j];
        const it = arr.find((x: any) => (x.moneda || x.casa || "").toUpperCase().includes(moneda)) || arr[0];
        return {
          promedio: Number(it?.promedio ?? it?.venta ?? it?.compra ?? 0),
          compra: Number(it?.compra ?? 0), venta: Number(it?.venta ?? 0),
          fecha: it?.fechaActualizacion || it?.fecha || "",
        };
      };
      const [rU, rE] = await Promise.all([fetch(API_DOLARES), fetch(API_EUROS)]);
      if (!rU.ok) throw new Error("HTTP");
      const usd = extraer(await rU.json(), "USD");
      let euro = 0, fechaEur = "";
      try { if (rE.ok) { const e = extraer(await rE.json(), "EUR"); euro = e.promedio; fechaEur = e.fecha; } } catch { /* euro opcional */ }
      if (!usd.promedio) throw new Error("sin datos");
      setTasa({ usd: usd.promedio, eur: euro, compra: usd.compra, venta: usd.venta, paralelo: 0, updated: Date.now(), source: "api", apiOk: true, fechaApi: usd.fecha || fechaEur });
      setDb((d) => ({ ...d, historialTasas: upsertHoy(d.historialTasas, { usd: usd.promedio, euro, paralelo: 0, fuente: "dolarapi" }) }));
    } catch {
      setTasa((t) => ({ ...t, updated: Date.now(), source: cfg.usarTasaManual ? "manual" : "respaldo", apiOk: false }));
      toast("No se pudo consultar ve.dolarapi.com — usando última tasa conocida", "warn");
    } finally { setTasaLoading(false); }
  }, [toast]);

  useEffect(() => { void refreshTasa(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const iv = setInterval(() => void refreshTasa(), 5 * 60 * 1000); return () => clearInterval(iv); }, [refreshTasa]);

  const aplicarTasaManual = useCallback((usd: number, eur: number) => {
    setTasa({ usd, eur, compra: 0, venta: 0, paralelo: 0, updated: Date.now(), source: "manual", apiOk: false, fechaApi: "" });
    setConfig({ tasaManualUSD: usd, tasaManualEUR: eur, usarTasaManual: true, usarApi: false });
    setDb((d) => ({ ...d, historialTasas: upsertHoy(d.historialTasas, { usd, euro: eur, paralelo: 0, fuente: "manual" }) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteTasaHistorial = useCallback((id: string) => setDb((d) => ({ ...d, historialTasas: d.historialTasas.filter((x) => x.id !== id) })), []);
  const clearTasaHistorial = useCallback(() => setDb((d) => ({ ...d, historialTasas: [] })), []);

  /* ---------- CRUD ---------- */
  const upsert = <T extends { id: string }>(arr: T[], item: T): T[] => arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item];

  const saveEscuela = useCallback((e: Escuela) => mutate((d) => ({ ...d, escuelas: upsert(d.escuelas, e) })), [mutate]);
  const deleteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, escuelas: d.escuelas.filter((x) => x.id !== id) })), [mutate]);
  const saveDocente = useCallback((x: Docente) => mutate((d) => ({ ...d, docentes: upsert(d.docentes, x) })), [mutate]);
  const deleteDocente = useCallback((id: string) => mutate((d) => ({ ...d, docentes: d.docentes.filter((x) => x.id !== id) })), [mutate]);
  const saveEstudiante = useCallback((e: Estudiante) => mutate((d) => ({ ...d, estudiantes: upsert(d.estudiantes, e) })), [mutate]);
  const deleteEstudiante = useCallback((id: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.filter((x) => x.id !== id) })), [mutate]);
  const addPago = useCallback((estId: string, p: Pago) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, pagos: [...e.pagos, p] } : e)) })), [mutate]);
  const deletePago = useCallback((estId: string, pagoId: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, pagos: e.pagos.filter((p) => p.id !== pagoId) } : e)) })), [mutate]);
  const setPedidoEstado = useCallback((estId: string, estado: string) => mutate((d) => ({
    ...d,
    estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, estadoPedido: estado, fechaEntrega: estado === "Entregado" ? todayISO() : e.fechaEntrega } : e)),
  })), [mutate]);
  const saveCodigos = useCallback((estId: string, c: Estudiante["codigos"]) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, codigos: c } : e)) })), [mutate]);
  const saveCotizacion = useCallback((c: Cotizacion) => mutate((d) => ({ ...d, cotizaciones: upsert(d.cotizaciones, c) })), [mutate]);
  const deleteCotizacion = useCallback((id: string) => mutate((d) => ({ ...d, cotizaciones: d.cotizaciones.filter((x) => x.id !== id) })), [mutate]);
  const convertirCotizacion = useCallback((id: string) => {
    const c = dbRef.current.cotizaciones.find((x) => x.id === id);
    if (!c) return;
    const nuevo: Estudiante = {
      id: uid(), pedido: `P-${dbRef.current.seqPedido}`, nombre: c.cliente, telefono: c.telefono, representante: c.cliente, ci: "",
      escuelaId: "", docenteId: "", grado: "Bachiller", seccion: "A", paqueteId: c.paqueteId,
      precioPaquete: ({ basico: 20, premium: 40, lujo: 60 } as any)[c.paqueteId] || 40,
      adicionales: c.adicionales, pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "",
      observaciones: c.nota, codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
    };
    mutate((d) => ({ ...d, estudiantes: [...d.estudiantes, nuevo], cotizaciones: d.cotizaciones.map((x) => (x.id === id ? { ...x, estado: "Aceptada" } : x)), seqPedido: d.seqPedido + 1 }));
  }, [mutate]);
  const saveSesion = useCallback((s: Sesion) => mutate((d) => ({ ...d, sesiones: upsert(d.sesiones, s) })), [mutate]);
  const deleteSesion = useCallback((id: string) => mutate((d) => ({ ...d, sesiones: d.sesiones.filter((x) => x.id !== id) })), [mutate]);
  const saveEvento = useCallback((e: Evento) => mutate((d) => ({ ...d, eventos: upsert(d.eventos, e) })), [mutate]);
  const deleteEvento = useCallback((id: string) => mutate((d) => ({ ...d, eventos: d.eventos.filter((x) => x.id !== id) })), [mutate]);
  const addMensaje = useCallback((m: MensajeLog) => mutate((d) => ({ ...d, mensajes: [m, ...d.mensajes] })), [mutate]);
  const saveUsuario = useCallback((u: Usuario) => mutate((d) => ({ ...d, usuarios: upsert(d.usuarios, u) })), [mutate]);
  const deleteUsuario = useCallback((id: string) => mutate((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== id) })), [mutate]);
  const setConfig = useCallback((patch: Partial<Config>) => mutate((d) => ({ ...d, config: { ...d.config, ...patch } })), [mutate]);
  const savePaqueteEscuela = useCallback((p: PaqueteEscuela) => mutate((d) => ({ ...d, paquetesEscuelas: upsert(d.paquetesEscuelas, p) })), [mutate]);
  const deletePaqueteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, paquetesEscuelas: d.paquetesEscuelas.filter((x) => x.id !== id) })), [mutate]);

  const exportBackup = useCallback(() => JSON.stringify(dbRef.current, null, 2), []);
  const importBackup = useCallback((json: string) => {
    try {
      const d = JSON.parse(json);
      if (!d || !Array.isArray(d.estudiantes) || !d.config) return false;
      setDb({ ...seedDB(), ...d, config: { ...SEED_CONFIG, ...d.config } });
      return true;
    } catch { return false; }
  }, []);

  /* ---------- Supabase ---------- */
  const [syncInfo, setSyncInfo] = useState<{ last: number; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const clienteSb = useCallback(async (urlArg?: string, keyArg?: string) => {
    const c = dbRef.current.config;
    const url = urlArg || c.supabaseUrl, key = keyArg || c.supabaseKey;
    if (!url || !key) return null;
    const { sbClient: mk } = await import("./supabase");
    return mk(url, key);
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
  useEffect(() => {
    if (!db.config.autoSyncCloud || !db.config.supabaseUrl || !db.config.supabaseKey) return;
    const t = setTimeout(() => { void syncToCloud(); }, 2500);
    return () => clearTimeout(t);
  }, [db, syncToCloud]);

  const user = useMemo(() => db.usuarios.find((u) => u.id === db.currentUserId) || db.usuarios[0], [db.usuarios, db.currentUserId]);
  const can = useCallback((r: Route) => ACCESS[user?.rol || "admin"].includes(r), [user]);

  const alerts = useMemo(() => {
    const out: { key: string; title: string; desc: string; route: Route }[] = [];
    const pend = db.estudiantes.filter((e) => estudianteTotales(e).saldo > 0.009).length;
    const sinFoto = db.estudiantes.filter((e) => e.estadoPedido !== "Entregado" && Object.values(e.codigos).some((c) => !c.trim())).length;
    const listos = db.estudiantes.filter((e) => e.estadoPedido === "Empaque").length;
    if (pend) out.push({ key: "pagos", title: `${pend}`, desc: "estudiantes con pagos pendientes", route: "estudiantes" });
    if (sinFoto) out.push({ key: "fotos", title: `${sinFoto}`, desc: "pedidos sin códigos de fotografía", route: "produccion" });
    if (listos) out.push({ key: "entrega", title: `${listos}`, desc: "pedidos listos para entregar", route: "ventas" });
    return out;
  }, [db.estudiantes]);

  const ctx: Ctx = {
    db, route, param, setParam, setRoute,
    user, setUser: (id) => mutate((d) => ({ ...d, currentUserId: id })), can,
    dark, toggleDark, collapsed, setCollapsed, mobileNav, setMobileNav,
    tasa, refreshTasa: () => void refreshTasa(), tasaLoading,
    aplicarTasaManual, deleteTasaHistorial, clearTasaHistorial,
    confirm, confirmState, resolveConfirm, success, successState, toast, toasts,
    ocrOpen, setOcrOpen, ocrDraft, setOcrDraft,
    saveEscuela, deleteEscuela, saveDocente, deleteDocente, saveEstudiante, deleteEstudiante,
    addPago, deletePago, setPedidoEstado, saveCodigos,
    saveCotizacion, deleteCotizacion, convertirCotizacion,
    saveSesion, deleteSesion, saveEvento, deleteEvento, addMensaje,
    saveUsuario, deleteUsuario, setConfig, savePaqueteEscuela, deletePaqueteEscuela,
    exportBackup, importBackup,
    syncInfo, syncing, testCloud, syncToCloud, restoreFromCloud, alerts,
  };
  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>;
}
