import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCESOS_DEFAULT, SEED_CONFIG, SEED_COTIZACIONES, SEED_DOCENTES, SEED_ESCUELAS, SEED_ESTUDIANTES,
  SEED_EVENTOS, SEED_HISTORIAL, SEED_PAQUETES_ESCUELAS, SEED_SESIONES, SEED_USUARIOS,
  codigosCompletos, estudianteTotales, todayISO, uid,
} from "./data";
import type {
  Config, Cotizacion, CRMData, Docente, Escuela, Estudiante, Evento, HistorialTasa,
  MensajeLog, OcrDraft, PaqueteEscuela, Pago, Rol, Route, Sesion, Usuario,
} from "./data";
export type { Route, Rol };

interface DB extends CRMData {}
const KEY = "jyg-crm-db-v1";
const seedDB = (): DB => ({
  escuelas: SEED_ESCUELAS, docentes: SEED_DOCENTES, estudiantes: SEED_ESTUDIANTES,
  cotizaciones: SEED_COTIZACIONES, sesiones: SEED_SESIONES, eventos: SEED_EVENTOS,
  mensajes: [], usuarios: SEED_USUARIOS, historialTasas: SEED_HISTORIAL,
  paquetesEscuelas: SEED_PAQUETES_ESCUELAS, config: SEED_CONFIG,
  currentUserId: "u1", seqPedido: 2411, seqCot: 2403,
});
const loadDB = (): DB => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedDB();
    const d = JSON.parse(raw);
    const base = seedDB();
    return { ...base, ...d, config: { ...base.config, ...(d.config || {}) } };
  } catch { return seedDB(); }
};

interface Tasa { usd: number; eur: number; compra: number; venta: number; paralelo: number; updated: number; source: "api" | "manual" | "respaldo"; apiOk: boolean; fechaApi: string; }
interface ConfirmState { title: string; message: string; confirmText?: string; danger?: boolean; }
type ToastTone = "ok" | "warn" | "err";
interface Toast { id: string; text: string; tone: ToastTone; }

interface Ctx {
  db: DB; route: Route; param: any; setParam: (p: any) => void; setRoute: (r: Route, p?: any) => void;
  tasa: Tasa; tasaLoading: boolean; refreshTasa: () => void;
  ocrOpen: boolean; setOcrOpen: (v: boolean) => void; ocrDraft: OcrDraft | null; setOcrDraft: (d: OcrDraft | null) => void;
  user: Usuario; can: (r: Route) => boolean; setCurrentUser: (id: string) => void;
  setRolPermisos: (rol: Rol, rutas: string[]) => void; setRolActivo: (rol: Rol, activo: boolean) => void;
  confirm: (c: ConfirmState) => Promise<boolean>; confirmState: ConfirmState | null; resolveConfirm: (v: boolean) => void;
  success: (title?: string) => void; successState: { title: string } | null; closeSuccess: () => void;
  toast: (text: string, tone?: ToastTone) => void; toasts: Toast[];
  saveEscuela: (e: Escuela) => void; deleteEscuela: (id: string) => void;
  saveDocente: (d: Docente) => void; deleteDocente: (id: string) => void;
  saveEstudiante: (e: Estudiante) => void; deleteEstudiante: (id: string) => void;
  addPago: (estId: string, p: Pago) => void; deletePago: (estId: string, pagoId: string) => void;
  setPedidoEstado: (estId: string, estado: string) => void;
  saveCodigos: (estId: string, codigos: Estudiante["codigos"], extra?: Estudiante["codigosExtra"]) => void;
  saveCotizacion: (c: Cotizacion) => void; deleteCotizacion: (id: string) => void; convertirCotizacion: (id: string) => void;
  addMensaje: (m: MensajeLog) => void;
  saveSesion: (s: Sesion) => void; deleteSesion: (id: string) => void;
  saveEvento: (e: Evento) => void; deleteEvento: (id: string) => void;
  saveUsuario: (u: Usuario) => void; deleteUsuario: (id: string) => void;
  setConfig: (patch: Partial<Config>) => void;
  deleteTasaHistorial: (id: string) => void; clearTasaHistorial: () => void;
  savePaqueteEscuela: (p: PaqueteEscuela) => void; deletePaqueteEscuela: (id: string) => void;
  exportBackup: () => string; importBackup: (json: string) => boolean;
  testCloud: (url?: string, key?: string) => Promise<{ tablas: number; filas: number }>;
  syncToCloud: (onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void) => Promise<boolean>;
  restoreFromCloud: () => Promise<boolean>;
  syncInfo: { last: number; ok: boolean; msg: string } | null; syncing: boolean;
  alerts: { key: string; title: string; desc: string; route: Route }[];
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp fuera del provider");
  return c;
};
const upsert = <T extends { id: string }>(arr: T[], item: T) =>
  arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item];
const upsertHoy = (hist: HistorialTasa[], v: { usd: number; euro: number; paralelo: number; fuente: "dolarapi" | "manual" }): HistorialTasa[] => {
  const hoy = todayISO();
  const existe = hist.some((h) => h.fecha === hoy);
  const next = existe ? hist.map((h) => (h.fecha === hoy ? { ...h, ...v, actualizado: Date.now() } : h)) : [...hist, { id: uid(), fecha: hoy, ...v, actualizado: Date.now() }];
  return [...next].sort((a, b) => a.fecha.localeCompare(b.fecha));
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [route, setRouteState] = useState<Route>("dashboard");
  const [param, setParam] = useState<any>(null);
  const [tasa, setTasa] = useState<Tasa>({ usd: db.config.tasaManualUSD || db.config.tasaFallback, eur: db.config.tasaManualEUR || 0, compra: 0, venta: 0, paralelo: 0, updated: Date.now(), source: "respaldo", apiOk: false, fechaApi: "" });
  const [tasaLoading, setTasaLoading] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [successState, setSuccessState] = useState<{ title: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncInfo, setSyncInfo] = useState<{ last: number; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const confirmResolve = useRef<((v: boolean) => void) | null>(null);
  const dbRef = useRef(db);
  dbRef.current = db;

  /* Persistencia */
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* noop */ }
  }, [db]);

  /* Tasa del día: ve.dolarapi.com (USD y EUR) */
  const refreshTasa = useCallback(async () => {
    if (!dbRef.current.config.usarApi || dbRef.current.config.usarTasaManual) return;
    setTasaLoading(true);
    try {
      const [rU, rE] = await Promise.all([fetch("https://ve.dolarapi.com/v1/dolares"), fetch("https://ve.dolarapi.com/v1/euros")]);
      const jU: any[] = await rU.json(); const jE: any[] = await rE.json();
      const usd = Array.isArray(jU) ? jU[0] : jU; const eur = Array.isArray(jE) ? jE[0] : jE;
      if (!usd?.promedio) throw new Error("sin datos");
      const u = Number(usd.promedio), e = Number(eur?.promedio || 0);
      setTasa({ usd: u, eur: e, compra: Number(usd.compra || 0), venta: Number(usd.venta || 0), paralelo: u, updated: Date.now(), source: "api", apiOk: true, fechaApi: usd.fechaActualizacion || "" });
      if (dbRef.current.config.historialAuto) setDb((d) => ({ ...d, historialTasas: upsertHoy(d.historialTasas, { usd: u, euro: e, paralelo: u, fuente: "dolarapi" }) }));
    } catch {
      setTasa((t) => ({ ...t, source: "respaldo", apiOk: false, updated: t.updated }));
    } finally { setTasaLoading(false); }
  }, []);
  useEffect(() => { void refreshTasa(); }, [refreshTasa]);
  useEffect(() => { const iv = setInterval(() => void refreshTasa(), 5 * 60 * 1000); return () => clearInterval(iv); }, [refreshTasa]);

  /* Auto-sincronización con Supabase */
  useEffect(() => {
    if (!db.config.autoSyncCloud || !db.config.supabaseUrl || !db.config.supabaseKey) return;
    const t = setTimeout(() => { void syncToCloud(); }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const mutate = useCallback((fn: (d: DB) => DB) => setDb(fn), []);
  const setRoute = useCallback((r: Route, p?: any) => { setRouteState(r); setParam(p ?? null); window.scrollTo(0, 0); }, []);

  const confirm = useCallback((c: ConfirmState) => {
    setConfirmState(c);
    return new Promise<boolean>((res) => { confirmResolve.current = res; });
  }, []);
  const resolveConfirm = useCallback((v: boolean) => { confirmResolve.current?.(v); confirmResolve.current = null; setConfirmState(null); }, []);
  const success = useCallback((title?: string) => setSuccessState({ title: title || "Registro guardado correctamente" }), []);
  const closeSuccess = useCallback(() => setSuccessState(null), []);
  const toast = useCallback((text: string, tone: ToastTone = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  /* CRUD */
  const saveEscuela = useCallback((e: Escuela) => mutate((d) => ({ ...d, escuelas: upsert(d.escuelas, e) })), [mutate]);
  const deleteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, escuelas: d.escuelas.filter((x) => x.id !== id) })), [mutate]);
  const saveDocente = useCallback((x: Docente) => mutate((d) => ({ ...d, docentes: upsert(d.docentes, x) })), [mutate]);
  const deleteDocente = useCallback((id: string) => mutate((d) => ({ ...d, docentes: d.docentes.filter((x) => x.id !== id) })), [mutate]);
  const saveEstudiante = useCallback((e: Estudiante) => {
    mutate((d) => {
      const existe = d.estudiantes.some((x) => x.id === e.id);
      const est = { ...e, actualizado: Date.now() };
      return { ...d, estudiantes: existe ? d.estudiantes.map((x) => (x.id === e.id ? est : x)) : [...d.estudiantes, est], seqPedido: existe ? d.seqPedido : d.seqPedido + 1 };
    });
  }, [mutate]);
  const deleteEstudiante = useCallback((id: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.filter((x) => x.id !== id) })), [mutate]);
  const addPago = useCallback((estId: string, p: Pago) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((x) => (x.id === estId ? { ...x, pagos: [...x.pagos, p] } : x)) })), [mutate]);
  const deletePago = useCallback((estId: string, pagoId: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.map((x) => (x.id === estId ? { ...x, pagos: x.pagos.filter((p) => p.id !== pagoId) } : x)) })), [mutate]);
  const setPedidoEstado = useCallback((estId: string, estado: string) => mutate((d) => ({
    ...d,
    estudiantes: d.estudiantes.map((x) => (x.id === estId ? { ...x, estadoPedido: estado, fechaEntrega: estado === "Entregado" ? todayISO() : x.fechaEntrega } : x)),
  })), [mutate]);
  const saveCodigos = useCallback((estId: string, codigos: Estudiante["codigos"], extra?: Estudiante["codigosExtra"]) => mutate((d) => ({
    ...d,
    estudiantes: d.estudiantes.map((x) => (x.id === estId ? { ...x, codigos, codigosExtra: extra ?? x.codigosExtra, actualizado: Date.now() } : x)),
  })), [mutate]);
  const saveCotizacion = useCallback((c: Cotizacion) => mutate((d) => ({ ...d, cotizaciones: upsert(d.cotizaciones, c), seqCot: d.seqCot + 1 })), [mutate]);
  const deleteCotizacion = useCallback((id: string) => mutate((d) => ({ ...d, cotizaciones: d.cotizaciones.filter((x) => x.id !== id) })), [mutate]);
  const convertirCotizacion = useCallback((id: string) => {
    mutate((d) => {
      const c = d.cotizaciones.find((x) => x.id === id);
      if (!c) return d;
      const n = d.seqPedido;
      const nuevo: Estudiante = {
        id: "e-" + uid(), pedido: `P-${n}`, nombre: c.cliente, telefono: c.telefono, representante: c.cliente, ci: "",
        escuelaId: d.escuelas.find((e) => e.nombre === c.escuela)?.id || "", docenteId: "", grado: "Bachiller", seccion: "A",
        paqueteId: c.paqueteId, precioPaquete: ({ basico: 28, premium: 45, lujo: 80 } as any)[c.paqueteId] || 45,
        adicionales: c.adicionales, pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "",
        observaciones: "Creado desde " + c.numero, codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
      };
      return { ...d, estudiantes: [...d.estudiantes, nuevo], cotizaciones: d.cotizaciones.map((x) => (x.id === id ? { ...x, estado: "Aceptada" as const } : x)), seqPedido: n + 1 };
    });
  }, [mutate]);
  const addMensaje = useCallback((m: MensajeLog) => mutate((d) => ({ ...d, mensajes: [m, ...d.mensajes].slice(0, 200) })), [mutate]);
  const saveSesion = useCallback((s: Sesion) => mutate((d) => ({ ...d, sesiones: upsert(d.sesiones, s) })), [mutate]);
  const deleteSesion = useCallback((id: string) => mutate((d) => ({ ...d, sesiones: d.sesiones.filter((x) => x.id !== id) })), [mutate]);
  const saveEvento = useCallback((e: Evento) => mutate((d) => ({ ...d, eventos: upsert(d.eventos, e) })), [mutate]);
  const deleteEvento = useCallback((id: string) => mutate((d) => ({ ...d, eventos: d.eventos.filter((x) => x.id !== id) })), [mutate]);
  const saveUsuario = useCallback((u: Usuario) => mutate((d) => ({ ...d, usuarios: upsert(d.usuarios, u) })), [mutate]);
  const deleteUsuario = useCallback((id: string) => mutate((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== id) })), [mutate]);
  const setConfig = useCallback((patch: Partial<Config>) => mutate((d) => ({ ...d, config: { ...d.config, ...patch } })), [mutate]);
  const deleteTasaHistorial = useCallback((id: string) => mutate((d) => ({ ...d, historialTasas: d.historialTasas.filter((x) => x.id !== id) })), [mutate]);
  const clearTasaHistorial = useCallback(() => mutate((d) => ({ ...d, historialTasas: [] })), [mutate]);
  const savePaqueteEscuela = useCallback((p: PaqueteEscuela) => mutate((d) => ({ ...d, paquetesEscuelas: upsert(d.paquetesEscuelas, p) })), [mutate]);
  const deletePaqueteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, paquetesEscuelas: d.paquetesEscuelas.filter((x) => x.id !== id) })), [mutate]);
  const setRolPermisos = useCallback((rol: Rol, rutas: string[]) => mutate((d) => ({
    ...d, config: { ...d.config, rolesPermisos: { ...(d.config.rolesPermisos || {}), [rol]: rutas } as Record<Rol, string[]> },
  })), [mutate]);
  const setRolActivo = useCallback((rol: Rol, activo: boolean) => mutate((d) => ({
    ...d, config: { ...d.config, rolesActivos: { ...(d.config.rolesActivos || {}), [rol]: activo } as Record<Rol, boolean> },
  })), [mutate]);

  const exportBackup = useCallback(() => JSON.stringify(dbRef.current, null, 2), []);
  const importBackup = useCallback((json: string) => {
    try {
      const d = JSON.parse(json);
      if (!d || !Array.isArray(d.estudiantes) || !d.config) return false;
      setDb({ ...seedDB(), ...d, config: { ...seedDB().config, ...d.config } });
      return true;
    } catch { return false; }
  }, []);

  /* Supabase (carga perezosa del SDK) */
  const clienteSb = useCallback(async (urlArg?: string, keyArg?: string) => {
    const url = urlArg || dbRef.current.config.supabaseUrl;
    const key = keyArg || dbRef.current.config.supabaseKey;
    if (!url || !key) return null;
    const { sbClient } = await import("./supabase");
    return sbClient(url, key);
  }, []);
  const testCloud = useCallback(async (urlArg?: string, keyArg?: string) => {
    const client = await clienteSb(urlArg, keyArg);
    if (!client) throw new Error("Faltan la URL del proyecto y la anon key de Supabase");
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
      setSyncInfo({ last: Date.now(), ok: true, msg: "Base de datos subida a Supabase (14 tablas)" });
      return true;
    } catch (e: any) {
      setSyncInfo({ last: Date.now(), ok: false, msg: "Error al subir: " + (e?.message || "desconocido") });
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
      setSyncInfo({ last: Date.now(), ok: false, msg: "Error al restaurar: " + (e?.message || "desconocido") });
      return false;
    } finally { setSyncing(false); }
  }, [clienteSb]);

  const user = useMemo(() => db.usuarios.find((u) => u.id === db.currentUserId) || db.usuarios[0], [db.usuarios, db.currentUserId]);
  const setCurrentUser = useCallback((id: string) => setDb((d) => ({ ...d, currentUserId: id })), []);
  const can = useCallback((r: Route) => {
    const rol = user?.rol || "admin";
    if (db.config.rolesActivos && db.config.rolesActivos[rol] === false) return false;
    const rutas = db.config.rolesPermisos?.[rol] ?? ACCESOS_DEFAULT[rol];
    return rutas.includes(r);
  }, [user, db.config.rolesPermisos, db.config.rolesActivos]);

  const alerts = useMemo(() => {
    const a: { key: string; title: string; desc: string; route: Route }[] = [];
    const sinPago = db.estudiantes.filter((e) => e.pagos.length === 0).length;
    if (sinPago) a.push({ key: "pagos", title: `${sinPago} estudiantes sin abonos`, desc: "Gestiona los pagos pendientes", route: "estudiantes" });
    const sinFotos = db.estudiantes.filter((e) => !codigosCompletos(e) && e.estadoPedido !== "Entregado").length;
    if (sinFotos) a.push({ key: "fotos", title: `${sinFotos} pedidos sin códigos de fotografía`, desc: "Asigna los códigos para producción", route: "produccion" });
    const listos = db.estudiantes.filter((e) => e.estadoPedido === "Empaque").length;
    if (listos) a.push({ key: "listos", title: `${listos} pedidos listos para entregar`, desc: "En Empaque, espera de entrega", route: "ventas" });
    const saldo = db.estudiantes.reduce((s, e) => s + estudianteTotales(e).saldo, 0);
    if (saldo > 0) a.push({ key: "saldo", title: `Por cobrar ${"$" + saldo.toFixed(2)}`, desc: "Saldo pendiente de la temporada", route: "reportes" });
    return a;
  }, [db.estudiantes]);

  const value: Ctx = {
    db, route, param, setParam, setRoute,
    tasa, tasaLoading, refreshTasa,
    ocrOpen, setOcrOpen, ocrDraft, setOcrDraft,
    user, can, setCurrentUser, setRolPermisos, setRolActivo,
    confirm, confirmState, resolveConfirm, success, successState, closeSuccess, toast, toasts,
    saveEscuela, deleteEscuela, saveDocente, deleteDocente,
    saveEstudiante, deleteEstudiante, addPago, deletePago, setPedidoEstado, saveCodigos,
    saveCotizacion, deleteCotizacion, convertirCotizacion, addMensaje,
    saveSesion, deleteSesion, saveEvento, deleteEvento,
    saveUsuario, deleteUsuario, setConfig, deleteTasaHistorial, clearTasaHistorial,
    savePaqueteEscuela, deletePaqueteEscuela,
    exportBackup, importBackup, testCloud, syncToCloud, restoreFromCloud, syncInfo, syncing,
    alerts,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
