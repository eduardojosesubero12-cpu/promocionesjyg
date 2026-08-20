import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Config, Cotizacion, Docente, Escuela, Estudiante, Evento, HistorialTasa,
  MensajeLog, OcrDraft, Pago, Rol, Sesion, Usuario,
} from "./data";
import {
  API_DOLARES, API_EUROS, SEED_CONFIG, SEED_COTIZACIONES, SEED_DOCENTES, SEED_ESCUELAS,
  SEED_ESTUDIANTES, SEED_EVENTOS, SEED_HISTORIAL, SEED_SESIONES, SEED_USUARIOS,
  estudianteTotales, todayISO, uid,
} from "./data";

export type Route =
  | "dashboard" | "clientes" | "escuelas" | "docentes" | "estudiantes" | "ventas" | "cotizaciones"
  | "paquetes" | "mensajes" | "sesiones" | "agenda" | "produccion" | "qr" | "ocr"
  | "reportes" | "usuarios" | "config" | "integraciones";

export const ACCESS: Record<Rol, Route[]> = {
  admin: ["dashboard", "clientes", "escuelas", "docentes", "estudiantes", "ventas", "cotizaciones", "paquetes", "mensajes", "sesiones", "agenda", "produccion", "qr", "ocr", "reportes", "usuarios", "config", "integraciones"],
  operador: ["dashboard", "clientes", "escuelas", "docentes", "estudiantes", "ventas", "cotizaciones", "paquetes", "mensajes", "qr", "ocr"],
  produccion: ["dashboard", "paquetes", "produccion", "qr", "sesiones"],
  cobranza: ["dashboard", "clientes", "estudiantes", "ventas", "reportes", "mensajes"],
};

export const ROUTE_TITLE: Record<Route, string> = {
  dashboard: "Dashboard", clientes: "Clientes", escuelas: "Escuelas", docentes: "Profesores",
  estudiantes: "Estudiantes", ventas: "Ventas", cotizaciones: "Cotizaciones", paquetes: "Paquetes",
  mensajes: "Mensajes", sesiones: "Sesiones Fotográficas", agenda: "Agenda / Calendario",
  produccion: "Producción", qr: "Tarjetas QR", ocr: "Escáner OCR", reportes: "Reportes",
  usuarios: "Usuarios", config: "Configuración", integraciones: "Integraciones",
};

interface DB {
  escuelas: Escuela[]; docentes: Docente[]; estudiantes: Estudiante[]; cotizaciones: Cotizacion[];
  sesiones: Sesion[]; eventos: Evento[]; mensajes: MensajeLog[]; usuarios: Usuario[];
  historialTasas: HistorialTasa[]; config: Config; currentUserId: string;
  seqPedido: number; seqCot: number;
}

interface Tasa {
  usd: number; eur: number; compra: number; venta: number; paralelo: number;
  updated: number; source: "api" | "manual" | "respaldo"; apiOk: boolean; fechaApi: string;
}

interface ConfirmOpts { title: string; message: string; confirmText?: string; danger?: boolean; }
interface ToastItem { id: string; text: string; tone: "ok" | "warn" | "err" }

const seedDB = (): DB => ({
  escuelas: SEED_ESCUELAS, docentes: SEED_DOCENTES, estudiantes: SEED_ESTUDIANTES,
  cotizaciones: SEED_COTIZACIONES, sesiones: SEED_SESIONES, eventos: SEED_EVENTOS,
  mensajes: [], usuarios: SEED_USUARIOS, historialTasas: SEED_HISTORIAL, config: SEED_CONFIG,
  currentUserId: "u1", seqPedido: 2411, seqCot: 303,
});

const loadDB = (): DB => {
  try {
    const raw = localStorage.getItem("jyg-db-v3");
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.estudiantes && d.config) {
        if (!Array.isArray(d.historialTasas)) d.historialTasas = SEED_HISTORIAL;
        return d as DB;
      }
    }
  } catch { /* noop */ }
  return seedDB();
};

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
  user: Usuario; setUser: (id: string) => void; can: (r: Route) => boolean;
  dark: boolean; toggleDark: () => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  mobileNav: boolean; setMobileNav: (v: boolean) => void;
  tasa: Tasa; refreshTasa: () => void; tasaLoading: boolean;
  aplicarTasaManual: (usd: number, eur: number) => void;
  deleteTasaHistorial: (id: string) => void; clearTasaHistorial: () => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>; success: (msg?: string) => void;
  toast: (text: string, tone?: ToastItem["tone"]) => void;
  ocrOpen: boolean; setOcrOpen: (v: boolean) => void;
  ocrDraft: OcrDraft | null; setOcrDraft: (d: OcrDraft | null) => void;
  saveEscuela: (e: Escuela) => void; deleteEscuela: (id: string) => void;
  saveDocente: (d: Docente) => void; deleteDocente: (id: string) => void;
  saveEstudiante: (e: Estudiante) => void; deleteEstudiante: (id: string) => void;
  addPago: (estId: string, p: Omit<Pago, "id">) => void; deletePago: (estId: string, pagoId: string) => void;
  setPedidoEstado: (estId: string, estado: string) => void;
  saveCodigos: (estId: string, c: Estudiante["codigos"]) => void;
  saveCotizacion: (c: Cotizacion) => void; deleteCotizacion: (id: string) => void; convertirCotizacion: (id: string) => void;
  saveSesion: (s: Sesion) => void; deleteSesion: (id: string) => void;
  saveEvento: (e: Evento) => void; deleteEvento: (id: string) => void;
  addMensaje: (m: MensajeLog) => void;
  saveUsuario: (u: Usuario) => void; deleteUsuario: (id: string) => void;
  setConfig: (patch: Partial<Config>) => void;
  exportBackup: () => string; importBackup: (json: string) => boolean;
  syncInfo: { last: number; ok: boolean; msg: string } | null; syncing: boolean;
  testCloud: (url: string) => Promise<boolean>; syncToCloud: (url?: string) => Promise<boolean>; restoreFromCloud: () => Promise<boolean>;
  alerts: { key: string; title: string; desc: string; route: Route }[];
}

const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB);
  const [route, setRouteState] = useState<Route>("dashboard");
  const [param, setParam] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("jyg-theme") === "dark"; } catch { return false; } });
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft | null>(null);
  const [tasaLoading, setTasaLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [swalSuccess, setSwalSuccess] = useState<{ msg: string; until: number } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tasa, setTasa] = useState<Tasa>({
    usd: SEED_CONFIG.tasaFallback, eur: SEED_CONFIG.tasaManualEUR, compra: SEED_CONFIG.tasaFallback,
    venta: SEED_CONFIG.tasaFallback, paralelo: 0, updated: Date.now() - 3600_000, source: "respaldo", apiOk: false, fechaApi: "",
  });
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    try { localStorage.setItem("jyg-db-v3", JSON.stringify(db)); } catch { /* noop */ }
  }, [db]);

  const mutate = useCallback((fn: (d: DB) => DB) => setDb((d) => fn(d)), []);

  /* ---------- Tasa del día (ve.dolarapi.com) ---------- */
  const refreshTasa = useCallback(async () => {
    const cfg = dbRef.current.config;
    if (cfg.usarTasaManual) {
      setTasa({ usd: cfg.tasaManualUSD, eur: cfg.tasaManualEUR, compra: cfg.tasaManualUSD, venta: cfg.tasaManualUSD, paralelo: 0, updated: Date.now(), source: "manual", apiOk: false, fechaApi: "" });
      return;
    }
    if (!cfg.usarApi) {
      setTasa({ usd: cfg.tasaFallback, eur: +(cfg.tasaFallback * 1.102).toFixed(2), compra: cfg.tasaFallback, venta: cfg.tasaFallback, paralelo: 0, updated: Date.now(), source: "respaldo", apiOk: false, fechaApi: "" });
      return;
    }
    setTasaLoading(true);
    try {
      const [rUsd, rEur] = await Promise.all([
        fetch(API_DOLARES).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(API_EUROS).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      /* Formato: [{ moneda, fuente, nombre, compra, venta, promedio, fechaActualizacion }] */
      const pick = (arr: any, moneda: string) => {
        if (!Array.isArray(arr)) return null;
        const item = arr.find((x: any) => String(x?.moneda || "").toUpperCase() === moneda) || arr.find((x: any) => String(x?.fuente || "").toLowerCase() === "oficial") || arr[0];
        if (!item) return null;
        const prom = Number(item.promedio ?? item.venta ?? item.compra);
        if (!isFinite(prom) || prom <= 0) return null;
        return {
          prom: +prom.toFixed(2),
          compra: Number(item.compra) || +prom.toFixed(2),
          venta: Number(item.venta) || +prom.toFixed(2),
          paralelo: (() => { const p = arr.find((x: any) => String(x?.fuente || "").toLowerCase() === "paralelo"); const pv = Number(p?.promedio ?? p?.venta); return isFinite(pv) && pv > 0 ? +pv.toFixed(2) : 0; })(),
          fecha: String(item.fechaActualizacion || ""),
        };
      };
      const u = pick(rUsd, "USD");
      const e = pick(rEur, "EUR");
      if (u) {
        setTasa({ usd: u.prom, eur: e?.prom || 0, compra: u.compra, venta: u.venta, paralelo: u.paralelo, updated: Date.now(), source: "api", apiOk: true, fechaApi: u.fecha });
        setDb((d) => ({
          ...d,
          config: { ...d.config, tasaFallback: u.prom },
          historialTasas: d.config.historialAuto ? upsertHoy(d.historialTasas, { usd: u.prom, euro: e?.prom || 0, paralelo: u.paralelo, fuente: "dolarapi" }) : d.historialTasas,
        }));
      } else {
        setTasa((t) => ({ ...t, updated: Date.now(), source: "respaldo", apiOk: false }));
      }
    } finally {
      setTasaLoading(false);
    }
  }, []);

  useEffect(() => { void refreshTasa(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    const iv = setInterval(() => void refreshTasa(), 5 * 60_000);
    const onVis = () => { if (!document.hidden) void refreshTasa(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [refreshTasa]);

  const aplicarTasaManual = useCallback((usd: number, eur: number) => {
    setTasa({ usd, eur, compra: usd, venta: usd, paralelo: 0, updated: Date.now(), source: "manual", apiOk: false, fechaApi: "" });
    setDb((d) => ({
      ...d,
      config: { ...d.config, usarTasaManual: true, usarApi: false, tasaManualUSD: usd, tasaManualEUR: eur, tasaFallback: usd },
      historialTasas: upsertHoy(d.historialTasas, { usd, euro: eur, paralelo: 0, fuente: "manual" }),
    }));
  }, []);

  /* ---------- Confirmaciones / toasts ---------- */
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })), []);
  const success = useCallback((msg = "Registro guardado correctamente") => {
    setSwalSuccess({ msg, until: Date.now() + 1700 });
    setTimeout(() => setSwalSuccess(null), 1750);
  }, []);
  const toast = useCallback((text: string, tone: ToastItem["tone"] = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  /* ---------- Acciones ---------- */
  const setRoute = useCallback((r: Route, p?: any) => { setRouteState(r); setParam(p || null); setMobileNav(false); window.scrollTo({ top: 0 }); }, []);

  const saveEscuela = useCallback((e: Escuela) => mutate((d) => ({ ...d, escuelas: d.escuelas.some((x) => x.id === e.id) ? d.escuelas.map((x) => (x.id === e.id ? e : x)) : [...d.escuelas, e] })), [mutate]);
  const deleteEscuela = useCallback((id: string) => mutate((d) => ({ ...d, escuelas: d.escuelas.filter((x) => x.id !== id) })), [mutate]);
  const saveDocente = useCallback((t: Docente) => mutate((d) => ({ ...d, docentes: d.docentes.some((x) => x.id === t.id) ? d.docentes.map((x) => (x.id === t.id ? t : x)) : [...d.docentes, t] })), [mutate]);
  const deleteDocente = useCallback((id: string) => mutate((d) => ({ ...d, docentes: d.docentes.filter((x) => x.id !== id) })), [mutate]);

  const saveEstudiante = useCallback((e: Estudiante) => mutate((d) => {
    const existe = d.estudiantes.some((x) => x.id === e.id);
    let seq = d.seqPedido;
    const est = existe ? e : { ...e, pedido: e.pedido || `PD-${seq++}` };
    return { ...d, estudiantes: existe ? d.estudiantes.map((x) => (x.id === e.id ? est : x)) : [est, ...d.estudiantes], seqPedido: seq };
  }), [mutate]);
  const deleteEstudiante = useCallback((id: string) => mutate((d) => ({ ...d, estudiantes: d.estudiantes.filter((x) => x.id !== id) })), [mutate]);

  const addPago = useCallback((estId: string, p: Omit<Pago, "id">) => mutate((d) => ({
    ...d,
    estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, pagos: [...e.pagos, { ...p, id: uid() }] } : e)),
  })), [mutate]);
  const deletePago = useCallback((estId: string, pagoId: string) => mutate((d) => ({
    ...d,
    estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, pagos: e.pagos.filter((p) => p.id !== pagoId) } : e)),
  })), [mutate]);
  const setPedidoEstado = useCallback((estId: string, estado: string) => mutate((d) => ({
    ...d,
    estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, estadoPedido: estado, fechaEntrega: estado === "Entregado" ? (e.fechaEntrega || todayISO()) : e.fechaEntrega } : e)),
  })), [mutate]);
  const saveCodigos = useCallback((estId: string, c: Estudiante["codigos"]) => mutate((d) => ({
    ...d, estudiantes: d.estudiantes.map((e) => (e.id === estId ? { ...e, codigos: c } : e)),
  })), [mutate]);

  const saveCotizacion = useCallback((c: Cotizacion) => mutate((d) => {
    const existe = d.cotizaciones.some((x) => x.id === c.id);
    let seq = d.seqCot;
    const cot = existe ? c : { ...c, numero: c.numero || `COT-0${seq++}` };
    return { ...d, cotizaciones: existe ? d.cotizaciones.map((x) => (x.id === c.id ? cot : x)) : [cot, ...d.cotizaciones], seqCot: seq };
  }), [mutate]);
  const deleteCotizacion = useCallback((id: string) => mutate((d) => ({ ...d, cotizaciones: d.cotizaciones.filter((x) => x.id !== id) })), [mutate]);
  const convertirCotizacion = useCallback((id: string) => mutate((d) => {
    const c = d.cotizaciones.find((x) => x.id === id);
    if (!c) return d;
    const seq = d.seqPedido;
    const nuevo: Estudiante = {
      id: uid(), nombre: c.cliente, telefono: c.telefono, representante: c.cliente, ci: "",
      escuelaId: d.escuelas.find((e) => e.nombre === c.escuela)?.id || d.escuelas[0]?.id || "", docenteId: "",
      grado: "Sexto Grado", seccion: "A", paqueteId: c.paqueteId,
      precioPaquete: d.config.preciosPaquetes.includes(0) ? 0 : (PAQ_BASE[c.paqueteId] || 40),
      adicionales: c.adicionales, pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(),
      fechaEntrega: "", pedido: `PD-${seq}`, observaciones: `Convertida de ${c.numero}`, codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
    };
    return {
      ...d, seqPedido: seq + 1,
      estudiantes: [nuevo, ...d.estudiantes],
      cotizaciones: d.cotizaciones.map((x) => (x.id === id ? { ...x, estado: "Aceptada" as const } : x)),
    };
  }), [mutate]);

  const saveSesion = useCallback((s: Sesion) => mutate((d) => ({ ...d, sesiones: d.sesiones.some((x) => x.id === s.id) ? d.sesiones.map((x) => (x.id === s.id ? s : x)) : [...d.sesiones, s] })), [mutate]);
  const deleteSesion = useCallback((id: string) => mutate((d) => ({ ...d, sesiones: d.sesiones.filter((x) => x.id !== id) })), [mutate]);
  const saveEvento = useCallback((e: Evento) => mutate((d) => ({ ...d, eventos: d.eventos.some((x) => x.id === e.id) ? d.eventos.map((x) => (x.id === e.id ? e : x)) : [...d.eventos, e] })), [mutate]);
  const deleteEvento = useCallback((id: string) => mutate((d) => ({ ...d, eventos: d.eventos.filter((x) => x.id !== id) })), [mutate]);
  const addMensaje = useCallback((m: MensajeLog) => mutate((d) => ({ ...d, mensajes: [m, ...d.mensajes] })), [mutate]);
  const saveUsuario = useCallback((u: Usuario) => mutate((d) => ({ ...d, usuarios: d.usuarios.some((x) => x.id === u.id) ? d.usuarios.map((x) => (x.id === u.id ? u : x)) : [...d.usuarios, u] })), [mutate]);
  const deleteUsuario = useCallback((id: string) => mutate((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== id) })), [mutate]);
  const setConfig = useCallback((patch: Partial<Config>) => mutate((d) => ({ ...d, config: { ...d.config, ...patch } })), [mutate]);
  const deleteTasaHistorial = useCallback((id: string) => setDb((d) => ({ ...d, historialTasas: d.historialTasas.filter((h) => h.id !== id) })), []);
  const clearTasaHistorial = useCallback(() => setDb((d) => ({ ...d, historialTasas: [] })), []);

  const exportBackup = useCallback(() => JSON.stringify(dbRef.current, null, 2), []);
  const importBackup = useCallback((json: string) => {
    try {
      const d = JSON.parse(json);
      if (!d || !Array.isArray(d.estudiantes) || !d.config) return false;
      setDb({ ...seedDB(), ...d });
      return true;
    } catch { return false; }
  }, []);

  /* ---------- Base de datos en la nube (Google Sheets vía Apps Script) ---------- */
  const [syncInfo, setSyncInfo] = useState<{ last: number; ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const testCloud = useCallback(async (url: string): Promise<boolean> => {
    try {
      const r = await fetch(`${url}?action=ping`);
      const j = await r.json();
      return !!j.ok;
    } catch { return false; }
  }, []);

  const syncToCloud = useCallback(async (urlArg?: string): Promise<boolean> => {
    const url = urlArg || dbRef.current.config.appsScriptUrl;
    if (!url) { setSyncInfo({ last: Date.now(), ok: false, msg: "Falta la URL de la Aplicación web de Apps Script" }); return false; }
    setSyncing(true);
    try {
      const r = await fetch(url, { method: "POST", body: JSON.stringify(dbRef.current) });
      const j = await r.json();
      const ok = !!j.ok;
      setSyncInfo({ last: Date.now(), ok, msg: ok ? `Respaldo guardado en Google Sheets (fila ${j.fila ?? "—"})` : "El servidor respondió un error" });
      return ok;
    } catch {
      setSyncInfo({ last: Date.now(), ok: false, msg: "No se pudo conectar con Apps Script (revisa la URL y el despliegue)" });
      return false;
    } finally { setSyncing(false); }
  }, []);

  const restoreFromCloud = useCallback(async (): Promise<boolean> => {
    const url = dbRef.current.config.appsScriptUrl;
    if (!url) { setSyncInfo({ last: Date.now(), ok: false, msg: "Falta la URL de la Aplicación web" }); return false; }
    setSyncing(true);
    try {
      const r = await fetch(`${url}?action=cargar`);
      const j = await r.json();
      if (!j.ok || !j.datos) { setSyncInfo({ last: Date.now(), ok: false, msg: "La hoja no tiene respaldos todavía" }); return false; }
      const d = typeof j.datos === "string" ? JSON.parse(j.datos) : j.datos;
      if (!d || !Array.isArray(d.estudiantes) || !d.config) { setSyncInfo({ last: Date.now(), ok: false, msg: "El respaldo de la nube está dañado" }); return false; }
      setDb({ ...seedDB(), ...d });
      setSyncInfo({ last: Date.now(), ok: true, msg: "Base de datos restaurada desde Google Sheets" });
      return true;
    } catch {
      setSyncInfo({ last: Date.now(), ok: false, msg: "Error al leer la nube" });
      return false;
    } finally { setSyncing(false); }
  }, []);

  /* Auto-sincronización: 2.5 s después de cada cambio, si está activada */
  useEffect(() => {
    if (!db.config.autoSync || !db.config.appsScriptUrl) return;
    const t = setTimeout(() => { syncToCloud(); }, 2500);
    return () => clearTimeout(t);
  }, [db, db.config.autoSync, db.config.appsScriptUrl, syncToCloud]);



  const toggleDark = useCallback(() => setDark((v) => !v), []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("jyg-theme", dark ? "dark" : "light"); } catch { /* noop */ }
  }, [dark]);

  const user = db.usuarios.find((u) => u.id === db.currentUserId) || db.usuarios[0];
  const can = useCallback((r: Route) => ACCESS[user?.rol || "admin"].includes(r), [user]);

  /* Alertas */
  const alerts = useMemo(() => {
    const pend = db.estudiantes.filter((e) => estudianteTotales(e).saldo > 0.009).length;
    const sinFoto = db.estudiantes.filter((e) => e.estadoPedido !== "Entregado" && !Object.values(e.codigos).every((c) => c.trim() !== "")).length;
    const listos = db.estudiantes.filter((e) => e.estadoPedido === "Empaque").length;
    const out: Ctx["alerts"] = [];
    if (pend) out.push({ key: "pagos", title: `${pend}`, desc: "estudiantes con pagos pendientes", route: "estudiantes" });
    if (sinFoto) out.push({ key: "fotos", title: `${sinFoto}`, desc: "pedidos sin códigos de fotografía", route: "produccion" });
    if (listos) out.push({ key: "entrega", title: `${listos}`, desc: "pedidos listos para entregar", route: "ventas" });
    return out;
  }, [db.estudiantes]);

  const ctx: Ctx = {
    db, route, param, setParam, setRoute, user, setUser: (id) => mutate((d) => ({ ...d, currentUserId: id })), can,
    dark, toggleDark, collapsed, setCollapsed, mobileNav, setMobileNav,
    tasa, refreshTasa: () => void refreshTasa(), tasaLoading,
    aplicarTasaManual, deleteTasaHistorial, clearTasaHistorial,
    confirm, success, toast, ocrOpen, setOcrOpen, ocrDraft, setOcrDraft,
    saveEscuela, deleteEscuela, saveDocente, deleteDocente, saveEstudiante, deleteEstudiante,
    addPago, deletePago, setPedidoEstado, saveCodigos,
    saveCotizacion, deleteCotizacion, convertirCotizacion,
    saveSesion, deleteSesion, saveEvento, deleteEvento, addMensaje,
    saveUsuario, deleteUsuario, setConfig, exportBackup, importBackup,
    syncInfo, syncing, testCloud, syncToCloud, restoreFromCloud, alerts,
  };

  return (
    <AppCtx.Provider value={ctx}>
      {children}
      <ConfirmLayer state={confirmState} setState={setConfirmState} />
      <SuccessLayer swal={swalSuccess} />
      <ToastLayer toasts={toasts} />
    </AppCtx.Provider>
  );
}

const PAQ_BASE: Record<string, number> = { basico: 20, premium: 40, lujo: 60 };

/* Capas UI de confirmación / éxito / toasts */
function ConfirmLayer({ state, setState }: { state: any; setState: (v: any) => void }) {
  if (!state) return null;
  const close = (v: boolean) => { state.resolve(v); setState(null); };
  return (
    <div className="overlay" style={{ zIndex: 5000 }}>
      <div className="modal" style={{ maxWidth: 420, textAlign: "center" }}>
        <div className="swal-icon" style={{ background: state.danger ? "var(--red-tint)" : "var(--blue-tint-2)", color: state.danger ? "var(--red)" : "var(--blue)" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {state.danger
              ? <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
              : <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>}
          </svg>
        </div>
        <h3 className="font-display" style={{ fontSize: 19, margin: "0 0 8px" }}>{state.title}</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: "0 26px 22px" }}>{state.message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", paddingBottom: 26 }}>
          <button className="btn btn-ghost" onClick={() => close(false)}>Cancelar</button>
          <button className="btn" style={{ background: state.danger ? "var(--red)" : "var(--green)", color: "#fff" }} onClick={() => close(true)}>
            {state.confirmText || "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessLayer({ swal }: { swal: { msg: string; until: number } | null }) {
  if (!swal) return null;
  return (
    <div className="overlay" style={{ zIndex: 5100, pointerEvents: "none" }}>
      <div className="modal" style={{ maxWidth: 400, textAlign: "center" }}>
        <div className="swal-icon" style={{ background: "var(--green-tint)", color: "var(--green)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="font-display" style={{ fontSize: 18, margin: "0 0 6px" }}>{swal.msg}</h3>
        <p style={{ color: "var(--ink-faint)", fontSize: 12.5, margin: 0, paddingBottom: 26 }}>La información quedó registrada en el sistema.</p>
      </div>
    </div>
  );
}

function ToastLayer({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;
  const colors: Record<string, string> = { ok: "var(--green)", warn: "var(--amber)", err: "var(--red)" };
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span style={{ width: 8, height: 8, borderRadius: 99, background: colors[t.tone], flexShrink: 0 }} />
          {t.text}
        </div>
      ))}
    </div>
  );
}
