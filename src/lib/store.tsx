import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCESOS_DEFAULT, SEED_CONFIG, SEED_COTIZACIONES, SEED_DOCENTES, SEED_ESCUELAS, SEED_ESTUDIANTES,
  SEED_EVENTOS, SEED_HISTORIAL, SEED_PAQUETES_ESCUELAS, SEED_SESIONES, SEED_USUARIOS,
  codigosCompletos, estudianteTotales, hashPass, todayISO, uid, verificarPass,
} from "./data";
import type {
  Config, Cotizacion, CRMData, Docente, Escuela, EscaneoLog, Estudiante, Evento, FacturaLog,
  HistorialTasa, MensajeLog, OcrDraft, PaqueteEscuela, Pago, ProduccionLog, Rol, Route,
  Sesion, TarjetaLog, Usuario,
} from "./data";
export type { Route, Rol };

interface DB extends CRMData {}
const KEY = "jyg-crm-db-v1";
const seedDB = (): DB => ({
  escuelas: SEED_ESCUELAS, docentes: SEED_DOCENTES, estudiantes: SEED_ESTUDIANTES,
  cotizaciones: SEED_COTIZACIONES, sesiones: SEED_SESIONES, eventos: SEED_EVENTOS,
  mensajes: [], usuarios: SEED_USUARIOS, historialTasas: SEED_HISTORIAL,
  paquetesEscuelas: SEED_PAQUETES_ESCUELAS, config: SEED_CONFIG,
  facturas: [], tarjetas: [], escaneos: [], produccionLogs: [],
  currentUserId: "u1", seqPedido: 2411, seqCot: 2403,
});
const loadDB = (): DB => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedDB();
    const d = JSON.parse(raw);
    const base = seedDB();
    const cfg = { ...base.config, ...(d.config || {}) };
    /* Garantiza la conexión Supabase aunque el navegador tuviera credenciales vacías guardadas */
    if (!cfg.supabaseUrl) cfg.supabaseUrl = base.config.supabaseUrl;
    if (!cfg.supabaseKey) cfg.supabaseKey = base.config.supabaseKey;
    const merged: DB = { ...base, ...d, config: cfg };
    /* Sanea colecciones: cualquier lista corrupta o vacía crítica vuelve a su valor base */
    (Object.keys(base) as (keyof DB)[]).forEach((k) => {
      if (Array.isArray(base[k]) && !Array.isArray(merged[k])) (merged as any)[k] = base[k];
    });
    if (merged.usuarios.length === 0) merged.usuarios = base.usuarios;
    return merged;
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
  sesion: Usuario | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
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
  logFactura: (f: Omit<FacturaLog, "id" | "fecha">) => void;
  logTarjeta: (t: Omit<TarjetaLog, "id" | "fecha">) => void;
  logEscaneo: (s: Omit<EscaneoLog, "id" | "fecha">) => void;
  logProduccion: (r: Omit<ProduccionLog, "id" | "fecha">) => void;
  exportBackup: () => string; importBackup: (json: string) => boolean;
  testCloud: (url?: string, key?: string) => Promise<{ tablas: number; filas: number; faltantes: string[] }>;
  syncToCloud: (onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void) => Promise<boolean>;
  restoreFromCloud: () => Promise<boolean>;
  syncInfo: { last: number; ok: boolean; msg: string } | null; syncing: boolean;
  rtEstado: "off" | "on" | "error";
  cloudStatus: { ok: boolean; tablas: number; filas: number; last: number; faltantes: string[] } | null;
  testCloudNow: () => Promise<void>;
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
  /* Sesión de usuario (persistida en el navegador) */
  const [sesion, setSesion] = useState<Usuario | null>(() => {
    try { const raw = localStorage.getItem("jyg-sesion"); return raw ? (JSON.parse(raw) as Usuario) : null; } catch { return null; }
  });
  const [syncInfo, setSyncInfo] = useState<{ last: number; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const confirmResolve = useRef<((v: boolean) => void) | null>(null);
  const dbRef = useRef(db);
  dbRef.current = db;
  /* Control de sincronización con la nube */
  const cloudReady = useRef(false);      /* se activa tras la carga inicial */
  const applyingRemote = useRef(false);  /* evita bucles: no re-subir lo que llegó de la nube */
  const rtTimer = useRef<any>(null);     /* debounce de eventos de tiempo real */
  const [rtEstado, setRtEstado] = useState<"off" | "on" | "error">("off");
  const [cloudStatus, setCloudStatus] = useState<{ ok: boolean; tablas: number; filas: number; last: number; faltantes: string[] } | null>(null);

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

  /* Auto-sincronización INSTANTÁNEA con Supabase (cada cambio local, con un
     debounce mínimo para agrupar mutaciones rápidas). No se ejecuta durante
     la carga inicial ni al aplicar datos que llegaron de la nube. */
  useEffect(() => {
    if (!cloudReady.current || applyingRemote.current) return;
    if (!db.config.autoSyncCloud || !db.config.supabaseUrl || !db.config.supabaseKey) return;
    const t = setTimeout(() => { void syncToCloud(); }, 600);
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

  /* ---------- Inicio de sesión (correo + contraseña) ---------- */
  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const u = dbRef.current.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { ok: false, error: "No existe un usuario con ese correo." };
    if (!u.activo) return { ok: false, error: "Este usuario está desactivado. Contacta al administrador." };
    const valida = await verificarPass(password, u.password || "");
    if (!valida) return { ok: false, error: "La contraseña es incorrecta." };
    /* Migración transparente: si la contraseña estaba en "plain:", la guardamos hasheada */
    if ((u.password || "").startsWith("plain:")) {
      const hash = await hashPass(password);
      mutate((d) => ({ ...d, usuarios: d.usuarios.map((x) => (x.id === u.id ? { ...x, password: hash } : x)) }));
    }
    setSesion(u);
    setDb((d) => ({ ...d, currentUserId: u.id }));
    setRouteState("dashboard");
    try { localStorage.setItem("jyg-sesion", JSON.stringify(u)); } catch { /* noop */ }
    return { ok: true };
  }, [mutate]);
  const logout = useCallback(() => {
    setSesion(null);
    try { localStorage.removeItem("jyg-sesion"); } catch { /* noop */ }
  }, []);

  const setConfig = useCallback((patch: Partial<Config>) => mutate((d) => ({ ...d, config: { ...d.config, ...patch } })), [mutate]);
  const deleteTasaHistorial = useCallback((id: string) => mutate((d) => ({ ...d, historialTasas: d.historialTasas.filter((x) => x.id !== id) })), [mutate]);
  const clearTasaHistorial = useCallback(() => mutate((d) => ({ ...d, historialTasas: [] })), [mutate]);
  const savePaqueteEscuela = useCallback((p: PaqueteEscuela) => mutate((d) => ({ ...d, paquetesEscuelas: upsert(d.paquetesEscuelas, p) })), [mutate]);
  const deletePaqueteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, paquetesEscuelas: d.paquetesEscuelas.filter((x) => x.id !== id) })), [mutate]);

  /* ---- Registro por módulo (una tabla por módulo, sincronizado a Supabase) ---- */
  const logFactura = useCallback((f: Omit<FacturaLog, "id" | "fecha">) => mutate((d) => ({
    ...d, facturas: [{ id: uid(), fecha: new Date().toISOString().slice(0, 10), ...f }, ...d.facturas].slice(0, 300),
  })), [mutate]);
  const logTarjeta = useCallback((t: Omit<TarjetaLog, "id" | "fecha">) => mutate((d) => ({
    ...d, tarjetas: [{ id: uid(), fecha: new Date().toISOString().slice(0, 10), ...t }, ...d.tarjetas].slice(0, 300),
  })), [mutate]);
  const logEscaneo = useCallback((s: Omit<EscaneoLog, "id" | "fecha">) => mutate((d) => ({
    ...d, escaneos: [{ id: uid(), fecha: new Date().toISOString().slice(0, 10), ...s }, ...d.escaneos].slice(0, 300),
  })), [mutate]);
  const logProduccion = useCallback((r: Omit<ProduccionLog, "id" | "fecha">) => mutate((d) => ({
    ...d, produccionLogs: [{ id: uid(), fecha: new Date().toISOString().slice(0, 10), ...r }, ...d.produccionLogs].slice(0, 300),
  })), [mutate]);
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
  /* Verificación de conexión silenciosa: mantiene el estado "Conectado" siempre actualizado */
  const testCloudNow = useCallback(async () => {
    const { supabaseUrl, supabaseKey } = dbRef.current.config;
    if (!supabaseUrl || !supabaseKey) { setCloudStatus(null); return; }
    try {
      const r = await testCloud(supabaseUrl, supabaseKey);
      setCloudStatus({ ok: true, tablas: r.tablas, filas: r.filas, faltantes: r.faltantes, last: Date.now() });
    } catch {
      setCloudStatus({ ok: false, tablas: 0, filas: 0, faltantes: [], last: Date.now() });
    }
  }, [testCloud]);
  /* Al abrir el CRM verifica la conexión y la re-verifica cada minuto */
  useEffect(() => {
    void testCloudNow();
    const iv = setInterval(() => void testCloudNow(), 60 * 1000);
    return () => clearInterval(iv);
  }, [testCloudNow]);
  const syncToCloud = useCallback(async (onTabla?: (t: string, s: "busy" | "ok" | "err", f?: number) => void) => {
    const client = await clienteSb();
    if (!client) { setSyncInfo({ last: Date.now(), ok: false, msg: "Configura la URL y la anon key de Supabase en Integraciones" }); return false; }
    setSyncing(true);
    try {
      const { subirTodo } = await import("./supabase");
      const { fallos, faltantes } = await subirTodo(client, dbRef.current, onTabla);
      if (fallos.length === 0) {
        setSyncInfo({
          last: Date.now(), ok: true,
          msg: faltantes.length === 0
            ? "Base de datos subida a Supabase (18 tablas)"
            : `Subida correcta · ${18 - faltantes.length}/18 tablas · faltan: ${faltantes.join(", ")}`,
        });
        void testCloudNow();
        return true;
      }
      setSyncInfo({
        last: Date.now(), ok: false,
        msg: `Subida parcial — fallaron: ${fallos.map((f) => f.tabla).join(", ")}`,
      });
      return false;
    } catch (e: any) {
      setSyncInfo({ last: Date.now(), ok: false, msg: "Error al subir: " + (e?.message || "desconocido") });
      return false;
    } finally { setSyncing(false); }
  }, [clienteSb]);
  /* Mezcla los datos de la nube con la configuración local (preserva credenciales de conexión) */
  const aplicarNube = useCallback((nuevo: DB) => {
    setDb((d) => ({
      ...nuevo,
      config: { ...nuevo.config, supabaseUrl: d.config.supabaseUrl, supabaseKey: d.config.supabaseKey, autoSyncCloud: d.config.autoSyncCloud },
      currentUserId: d.currentUserId,
    }));
  }, []);

  const restoreFromCloud = useCallback(async () => {
    const client = await clienteSb();
    if (!client) { setSyncInfo({ last: Date.now(), ok: false, msg: "Configura la URL y la anon key de Supabase" }); return false; }
    setSyncing(true);
    try {
      const { descargarTodo, rowsToDb } = await import("./supabase");
      const rows = await descargarTodo(client);
      const nuevo = rowsToDb(rows, dbRef.current);
      aplicarNube(nuevo);
      setSyncInfo({ last: Date.now(), ok: true, msg: "Base de datos restaurada desde Supabase" });
      return true;
    } catch (e: any) {
      setSyncInfo({ last: Date.now(), ok: false, msg: "Error al restaurar: " + (e?.message || "desconocido") });
      return false;
    } finally { setSyncing(false); }
  }, [clienteSb, aplicarNube]);

  /* ── Carga inicial: si la nube tiene datos, ganan; si está vacía, se sube la base local ── */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const cfg = dbRef.current.config;
      if (cfg.supabaseUrl && cfg.supabaseKey) {
        try {
          const client = await clienteSb();
          if (client) {
            const { descargarTodo, rowsToDb } = await import("./supabase");
            const rows = await descargarTodo(client);
            if (!cancelado) {
              applyingRemote.current = true;
              aplicarNube(rowsToDb(rows, dbRef.current));
              setSyncInfo({ last: Date.now(), ok: true, msg: "Datos leídos de Supabase al iniciar" });
              setTimeout(() => { applyingRemote.current = false; }, 800);
            }
          }
        } catch {
          /* Nube vacía o sin tablas → publicar la base local por primera vez */
          if (!cancelado) await syncToCloud();
        }
      }
      if (!cancelado) cloudReady.current = true;
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Tiempo real: los cambios hechos en otro dispositivo se reflejan al instante ── */
  useEffect(() => {
    let channel: any = null;
    (async () => {
      const cfg = dbRef.current.config;
      if (!cfg.supabaseUrl || !cfg.supabaseKey) return;
      try {
        const { sbClient } = await import("./supabase");
        const client = sbClient(cfg.supabaseUrl, cfg.supabaseKey);
        channel = client.channel("jyg-tiempo-real");
        channel.on("postgres_changes", { event: "*", schema: "public" }, () => {
          if (applyingRemote.current) return;
          clearTimeout(rtTimer.current);
          rtTimer.current = setTimeout(async () => {
            try {
              const { descargarTodo, rowsToDb } = await import("./supabase");
              const rows = await descargarTodo(client);
              applyingRemote.current = true;
              aplicarNube(rowsToDb(rows, dbRef.current));
              setSyncInfo({ last: Date.now(), ok: true, msg: "Actualizado en tiempo real desde Supabase" });
              setTimeout(() => { applyingRemote.current = false; }, 800);
            } catch { /* noop */ }
          }, 900);
        });
        channel.subscribe((status: string) => {
          if (status === "SUBSCRIBED") setRtEstado("on");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRtEstado("error");
        });
      } catch { setRtEstado("error"); }
    })();
    return () => { clearTimeout(rtTimer.current); try { channel?.unsubscribe(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* El usuario activo es el de la sesión iniciada (con sus datos frescos desde la BD, para que
     cambios de rol o desactivación se apliquen al instante). Si no hay sesión, un fallback seguro. */
  const user = useMemo<Usuario>(() => {
    if (sesion) return db.usuarios.find((u) => u.id === sesion.id) || sesion;
    return db.usuarios.find((u) => u.id === db.currentUserId) || db.usuarios.find((u) => u.activo) || db.usuarios[0] || SEED_USUARIOS[0];
  }, [sesion, db.usuarios, db.currentUserId]);

  /* Si el usuario con sesión fue eliminado o desactivado por un administrador, se cierra su sesión */
  useEffect(() => {
    if (!sesion) return;
    const actual = db.usuarios.find((u) => u.id === sesion.id);
    if (db.usuarios.length > 0 && (!actual || !actual.activo)) {
      setSesion(null);
      try { localStorage.removeItem("jyg-sesion"); } catch { /* noop */ }
    }
  }, [sesion, db.usuarios]);
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
    user, can, setCurrentUser, sesion, login, logout, setRolPermisos, setRolActivo,
    confirm, confirmState, resolveConfirm, success, successState, closeSuccess, toast, toasts,
    saveEscuela, deleteEscuela, saveDocente, deleteDocente,
    saveEstudiante, deleteEstudiante, addPago, deletePago, setPedidoEstado, saveCodigos,
    saveCotizacion, deleteCotizacion, convertirCotizacion, addMensaje,
    saveSesion, deleteSesion, saveEvento, deleteEvento,
    saveUsuario, deleteUsuario, setConfig, deleteTasaHistorial, clearTasaHistorial,
    savePaqueteEscuela, deletePaqueteEscuela,
    logFactura, logTarjeta, logEscaneo, logProduccion,
    exportBackup, importBackup, testCloud, syncToCloud, restoreFromCloud, syncInfo, syncing, rtEstado,
    cloudStatus, testCloudNow,
    alerts,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
