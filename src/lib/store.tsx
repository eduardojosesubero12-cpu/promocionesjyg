import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCESOS_DEFAULT, SEED_CONFIG, SEED_COTIZACIONES, SEED_DOCENTES, SEED_ESCUELAS, SEED_ESTUDIANTES,
  SEED_EVENTOS, SEED_HISTORIAL, SEED_PAQUETES_ESCUELAS, SEED_SESIONES, SEED_USUARIOS,
  codigosCompletos, estudianteTotales, hashPass, validarPassFuerte, todayISO, uid, verificarPass,
} from "./data";
import type {
  Config, Cotizacion, CRMData, Docente, Escuela, EscaneoLog, Estudiante, Evento, FacturaLog,
  HistorialTasa, MensajeLog, OcrDraft, PaqueteEscuela, Pago, ProduccionLog, Rol, Route,
  Sesion, TarjetaLog, Usuario,
} from "./data";
import { SUPABASE_DEFAULTS, sbClient, loginAuth } from "./supabase";
export type { Route, Rol };

interface DB extends CRMData {}
const KEY = "jyg-crm-db-v1";
/* Marca de tiempo del último cambio local que subimos a la nube.
   Sirve para resolver conflictos: si al recibir datos en tiempo real la
   nube es MÁS antigua que nuestro último envío, NO se pisa lo local. */
const TS_KEY = "jyg-last-push-ts";
/* Contador de intentos fallidos de login (bloqueo temporal anti-fuerza bruta) */
const BLOCK_KEY = "jyg-login-block";
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
  /* Progreso de la carga inicial de usuarios desde la nube (pantalla de login) */
  loginBoot: { listo: boolean; cargando: boolean; motivo?: string };
  logout: () => void;
  cambiarMiPass: (actual: string, nueva: string) => Promise<{ ok: boolean; error?: string }>;
  solicitarRecuperacion: (correo: string) => Promise<{ ok: boolean; error?: string; codigo?: string }>;
  restablecerPass: (correo: string, codigo: string, nueva: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassAdmin: (userId: string, nueva: string) => Promise<{ ok: boolean; error?: string }>;
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
  /* Sesión de usuario: inicio automático como Administrador */
  const [sesion, setSesion] = useState<Usuario | null>(() => {
    try {
      const raw = localStorage.getItem("jyg-sesion");
      /* SEGURIDAD: solo se reanuda una sesión guardada con el flag "verified"
         (seteada tras validar correo + contraseña en login()). Así nadie entra
         al CRM sin autenticarse — ni siquiera con la sesión del admin en caché. */
      if (raw) {
        const s = JSON.parse(raw) as Usuario & { verified?: boolean };
        if (s?.verified && s.id) {
          const actual = dbRef.current?.usuarios.find((u) => u.id === s.id);
          if (actual && actual.activo) return actual;
          return null; // usuario eliminado o desactivado → forzar login
        }
        localStorage.removeItem("jyg-sesion");
      }
      return null;
    } catch { return null; }
  });
  /* Estado visible de la pantalla de login: progreso de carga inicial + aviso
     cuando el correo no existe en la nube todavía (para no mostrar un falso
     "credenciales incorrectas" mientras sincroniza). */
  const [loginBoot, setLoginBoot] = useState<{ listo: boolean; cargando: boolean; motivo?: string }>({ listo: false, cargando: true });
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
    if (!db.config.autoSyncCloud) return;
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
  /* Guardado INSTANTÁNEO del usuario en Supabase (sin esperar el debounce de
     autosync): los correos y contraseñas del equipo quedan en la nube al
     instante y se ven desde cualquier otro dispositivo.
     `passPlana` permite espejar la clave TAMBIÉN en supabase.auth cuando el
     admin configuró la service key (autenticación nativa). */
  /* Modo Automático (Supabase Auth): si hay service key configurada, la
     fuente de verdad de las contraseñas es auth.users — Supabase aplica el
     salt y guarda el hash AISLADO en su esquema interno. La tabla espejo
     "usuarios" viaja SIN secreto (password:"") para que ningún hash propio
     quede expuesto en PostgREST. */
  const authActiva = () => !!(dbRef.current.config.supabaseServiceKey || "").trim();
  const usuarioEspejo = (u: Usuario): Usuario => (authActiva() ? { ...u, password: "" } : u);
  const subirUsuarioYa: (u: Usuario, passPlana?: string) => void = (u, passPlana) => {
    (async () => {
      try {
        const cfg = dbRef.current.config;
        const url = (cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim();
        const key = (cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim();
        if (!url || !key) return;
        const { sbClient, subirUsuarioInmediato, upsertAuthUser } = await import("./supabase");
        const r = await subirUsuarioInmediato(sbClient(url, key), usuarioEspejo(u));
        let msg = `Usuario "${u.nombre}" guardado en Supabase al instante`;
        if (passPlana && cfg.supabaseServiceKey?.trim()) {
          const ra = await upsertAuthUser(sbClient(url, key, cfg.supabaseServiceKey.trim()), u, passPlana, { crearFila: false });
          if (!ra.ok) msg = ra.requiereCambio ? (ra.error || "") : "Se guardó localmente pero falló Supabase Auth: " + (ra.error || "");
          else msg += " · contraseña cifrada por Supabase Auth (salt + bcrypt en servidor) ✔";
        }
        setSyncInfo({ last: Date.now(), ok: r.ok, msg });
      } catch { /* el autosync general reintentará enseguida */ }
    })();
  };
  const saveUsuario = useCallback((u: Usuario) => {
    mutate((d) => ({ ...d, usuarios: upsert(d.usuarios, u) }));
    /* Edición SIN clave nueva (correo, rol, activo): si Auth está activa, la
       fila espejo se limpia igualmente y loginAuth usará solo la capa Auth. */
    subirUsuarioYa(u);
  }, [mutate]);
  const deleteUsuario = useCallback((id: string) => {
    const eliminado = dbRef.current.usuarios.find((x) => x.id === id);
    mutate((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== id) }));
    (async () => {
      try {
        const cfg = dbRef.current.config;
        const url = (cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim();
        const key = (cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim();
        if (!url || !key) return;
        const { sbClient, eliminarUsuarioInmediato, desactivarAuthUser } = await import("./supabase");
        await eliminarUsuarioInmediato(sbClient(url, key), id);
        /* Si el miembro existe en Supabase Auth, se elimina también: nadie
           podrá volver a entrar con un JWT o una clave vieja. */
        const svc = (cfg.supabaseServiceKey || "").trim();
        if (svc && eliminado?.email) await desactivarAuthUser(sbClient(url, key, svc), eliminado.email);
      } catch { /* noop */ }
    })();
  }, [mutate]);

  /* ---------- Autenticación nativa Supabase (supabase.auth) ----------
     Si el admin registró la clave SERVICE_ROLE en Configuración, cada
     contraseña se sincroniza TAMBIÉN con los usuarios reales de Supabase
     Auth (bcrypt en servidor). El login entonces se valida en DOS capas:
     tabla espejo "usuarios" + supabase.auth. */
  const authClient = useCallback(() => {
    const cfg = dbRef.current.config;
    const url = (cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim();
    const key = (cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim();
    const svc = (cfg.supabaseServiceKey || "").trim();
    if (!url || !key || !svc) return null;
    return sbClient(url, key, svc);
  }, []);

  /* Inicio de sesión (correo + contraseña) */
  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    /* Espera brevemente a que termine la carga inicial desde Supabase para
       validar contra los usuarios reales de la nube (evita falsos
       "credenciales incorrectas" al abrir el CRM recién desplegado). */
    setLoginBoot((b) => ({ ...b, cargando: true }));
    for (let i = 0; i < 40 && !cloudReady.current; i++) await new Promise((r) => setTimeout(r, 100));
    setLoginBoot({ listo: cloudReady.current, cargando: false });
    const lista = dbRef.current.usuarios.length > 0 ? dbRef.current.usuarios : SEED_USUARIOS;
    const correo = email.trim().toLowerCase();
    /* Acepta correo, nombre de usuario o alias corto ("admin" ≈ admin@jyg.com.ve) */
    const u =
      lista.find((x) => (x.email || "").toLowerCase() === correo || (x.usuario || "").toLowerCase() === correo) ||
      lista.find((x) => {
        const dom = (x.email || "").split("@")[1] || "jyg.com.ve";
        return (x.usuario || "").toLowerCase() === `${correo}@${dom}`;
      });
    if (!u) {
      return {
        ok: false,
        error: cloudReady.current
          ? "No existe un usuario con ese correo o usuario. Revisa la escritura o pídele al administrador que te registre."
          : "Todavía no logramos leer los usuarios desde la nube. Verifica tu conexión e inténtalo de nuevo en unos segundos.",
      };
    }
    if (!u.activo) return { ok: false, error: "Este usuario está desactivado. Contacta al administrador." };
    /* BLOQUEO POR INTENTOS: tras 5 fallas seguidas se espera 1 minuto (por cuenta) */
    try {
      const bl = JSON.parse(localStorage.getItem(BLOCK_KEY) || "{}");
      const b = bl[u.id];
      if (b && b.hasta > Date.now()) {
        const seg = Math.ceil((b.hasta - Date.now()) / 1000);
        const t = seg > 60 ? `${Math.ceil(seg / 60)} minuto(s)` : `${seg} segundo(s)`;
        return { ok: false, error: `Demasiados intentos fallidos. Vuelve a intentar en ${t}.` };
      }
    } catch { /* noop */ }
    /* MODO AUTOMÁTICO (Supabase Auth activo): la fuente de verdad es el
       esquema interno auth.users — Supabase valida bcrypt+salt en servidor y
       emite JWT. La tabla espejo NO contiene contraseñas en este modo. */
    const ac = authClient();
    if (ac && u.email) {
      let registrado = false;
      try { const { existeEnAuth } = await import("./supabase"); registrado = await existeEnAuth(ac, u.email); } catch { /* sin acceso admin: se usa la capa local */ }
      if (registrado) {
        const r = await loginAuth(ac, u.email, password);
        if (!r.ok) {
          if (r.error === "incorrectas") return { ok: false, error: "La contraseña no coincide con la registrada en Supabase Auth. Recupérala con «¿Olvidaste tu contraseña?» o pide un restablecimiento al administrador." };
          return { ok: false, error: r.error ? `No se pudo validar con Supabase Auth: ${r.error}` : "No se pudo validar con Supabase Auth." };
        }
        /* Auth confirmó la clave → reparamos el hash local si estaba corrupto */
        const validaLocal = await verificarPass(password, u.password || "");
        if (!validaLocal) {
          const reparado = await hashPass(password);
          mutate((d) => ({ ...d, usuarios: d.usuarios.map((x) => (x.id === u.id ? { ...x, password: reparado } : x)) }));
        }
        try { const bl = JSON.parse(localStorage.getItem(BLOCK_KEY) || "{}"); delete bl[u.id]; localStorage.setItem(BLOCK_KEY, JSON.stringify(bl)); } catch { /* noop */ }
        const listo: Usuario = { ...u, password: u.password || (await hashPass(password)) };
        setSesion(listo);
        setDb((d) => ({ ...d, currentUserId: listo.id }));
        setRouteState("dashboard");
        try { localStorage.setItem("jyg-sesion", JSON.stringify({ ...listo, verified: true })); } catch { /* noop */ }
        return { ok: true };
      }
    }
    /* CAPA LOCAL — hash en la tabla espejo "usuarios" (modo legacy). */
    let valida = await verificarPass(password, u.password || "");
    /* Respaldo de emergencia: si la contraseña llegó corrupta desde la nube
       (columna distinta / truncada), permite las credenciales semilla del
       proyecto una sola vez y repara el hash localmente. */
    if (!valida) {
      const seed = SEED_USUARIOS.find((s) => s.id === u.id || (s.email || "").toLowerCase() === correo);
      if (seed && (await verificarPass(password, seed.password || ""))) {
        valida = true;
        const reparado = await hashPass(password);
        mutate((d) => ({ ...d, usuarios: d.usuarios.map((x) => (x.id === u.id ? { ...x, password: reparado } : x)) }));
      }
    }
    if (!valida) {
      /* registrar intento fallido + avisar cuántos quedan antes del bloqueo */
      let aviso = "";
      try {
        const bl = JSON.parse(localStorage.getItem(BLOCK_KEY) || "{}");
        const b = bl[u.id] || { n: 0, hasta: 0 };
        b.n += 1;
        if (b.n >= 5) { b.hasta = Date.now() + 60 * 1000; b.n = 0; aviso = " Se bloqueará esta cuenta por 1 minuto tras el próximo intento."; }
        else if (b.n === 4) aviso = " Te queda 1 intento antes de un bloqueo temporal de 1 minuto.";
        bl[u.id] = b;
        localStorage.setItem(BLOCK_KEY, JSON.stringify(bl));
      } catch { /* noop */ }
      return { ok: false, error: "La contraseña es incorrecta." + aviso };
    }
    /* éxito → limpiar contador de bloqueos */
    try { const bl = JSON.parse(localStorage.getItem(BLOCK_KEY) || "{}"); delete bl[u.id]; localStorage.setItem(BLOCK_KEY, JSON.stringify(bl)); } catch { /* noop */ }
    /* Reparación definitiva en la nube: si la clave se validó por la semilla de
       emergencia pero la fila local/en Supabase quedó con un hash viejo o
       corrupto, la sobrescribimos con el hash correcto de la contraseña actual.
       Así el login deja de fallar para siempre en todos los dispositivos. */
    const hashLocalOk = await verificarPass(password, u.password || "");
    if (!hashLocalOk) {
      const hashBueno = await hashPass(password);
      if (u.password !== hashBueno) {
        mutate((d) => ({ ...d, usuarios: d.usuarios.map((x) => (x.id === u.id ? { ...x, password: hashBueno } : x)) }));
        try {
          const { sbClient, subirUsuarioInmediato, SUPABASE_DEFAULTS } = await import("./supabase");
          const cfg = dbRef.current.config;
          const cli = sbClient((cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim(), (cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim());
          if (cli) await subirUsuarioInmediato(cli, { ...u, password: hashBueno });
        } catch { /* sin nube: la reparación local basta por ahora */ }
      }
    } else if ((u.password || "").startsWith("plain:")) {
      /* Migración transparente: si la contraseña estaba en "plain:", la guardamos hasheada */
      const hash = await hashPass(password);
      mutate((d) => ({ ...d, usuarios: d.usuarios.map((x) => (x.id === u.id ? { ...x, password: hash } : x)) }));
      /* y también a la nube, para que otros dispositivos no dependan de la semilla */
      try {
        const { sbClient, subirUsuarioInmediato, SUPABASE_DEFAULTS } = await import("./supabase");
        const cfg = dbRef.current.config;
        const cli = sbClient((cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim(), (cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim());
        if (cli) await subirUsuarioInmediato(cli, { ...u, password: hash });
      } catch { /* noop */ }
    }
    setSesion({ ...u, password: (u.password || "").startsWith("plain:") ? await hashPass(password) : u.password });
    setDb((d) => ({ ...d, currentUserId: u.id }));
    setRouteState("dashboard");
    /* Flag "verified": solo se reanuda automáticamente si la contraseña fue validada aquí */
    try { localStorage.setItem("jyg-sesion", JSON.stringify({ ...u, verified: true })); } catch { /* noop */ }
    return { ok: true };
  }, [mutate, authClient]);
  const logout = useCallback(() => {
    setSesion(null);
    try { localStorage.removeItem("jyg-sesion"); } catch { /* noop */ }
  }, []);

  /* ---------- Gestión segura de contraseñas ----------
     cambiarMiPass: cada miembro cambia SU propia contraseña validando la actual.
     resetPassAdmin: el administrador asigna una nueva contraseña a cualquier
     miembro (equivalente funcional a un "enlace de restablecimiento": el admin
     crea la clave temporal y se la entrega por el canal seguro que prefiera;
     el miembro deberá cambiarla luego desde su perfil). Ambos writes se
     sincronizan a Supabase AL INSTANTE vía saveUsuario. */
  const cambiarMiPass = useCallback(async (actual: string, nueva: string): Promise<{ ok: boolean; error?: string }> => {
    const u = dbRef.current.usuarios.find((x) => x.id === sesion?.id);
    if (!u) return { ok: false, error: "Sin sesión activa." };
    if (!(await verificarPass(actual, u.password || ""))) return { ok: false, error: "La contraseña actual no es correcta." };
    const faltas = validarPassFuerte(nueva);
    if (faltas.length) return { ok: false, error: "La nueva contraseña no cumple: " + faltas.join(", ").toLowerCase() + "." };
    if (await verificarPass(nueva, u.password || "")) return { ok: false, error: "La nueva contraseña debe ser distinta a la actual." };
    const hash = await hashPass(nueva);
    saveUsuario({ ...u, password: hash });
    subirUsuarioYa({ ...u, password: hash }, nueva); /* espejo en supabase.auth */
    setSesion({ ...u, password: hash });
    try { localStorage.setItem("jyg-sesion", JSON.stringify({ ...u, password: hash, verified: true })); } catch { /* noop */ }
    return { ok: true };
  }, [sesion, saveUsuario]);
  const resetPassAdmin = useCallback(async (userId: string, nueva: string): Promise<{ ok: boolean; error?: string }> => {
    if (sesion?.rol !== "admin") return { ok: false, error: "Solo el administrador puede restablecer contraseñas." };
    const u = dbRef.current.usuarios.find((x) => x.id === userId);
    if (!u) return { ok: false, error: "Usuario no encontrado." };
    const faltas = validarPassFuerte(nueva);
    if (faltas.length) return { ok: false, error: "La contraseña no cumple la política: " + faltas.join(", ").toLowerCase() + "." };
    const hash = await hashPass(nueva);
    saveUsuario({ ...u, password: hash });
    subirUsuarioYa({ ...u, password: hash }, nueva); /* registro/actualiza en supabase.auth */
    return { ok: true };
  }, [sesion, saveUsuario]);

  /* ---------- Recuperación de contraseña ("¿Olvidaste tu contraseña?") ----------
     Como el CRM no tiene servidor propio ni correo transaccional, el flujo es:
     1. solicitarRecuperacion genera un CÓDIGO TEMPORAL de 6 dígitos (expira en
        30 min, máx. 5 intentos por cuenta/día) que se muestra UNA sola vez al
        solicitante. Se entrega por canal seguro (WhatsApp/teléfono) o se usa
        directamente para definir la clave nueva.
     2. restablecerPass valida correo + código + política de seguridad y guarda
        el hash nuevo en Supabase AL INSTANTE (saveUsuario).
     El administrador además puede asignar claves desde Administración → 🔑. */
  const RECUPERACION_KEY = "jyg-recuperacion";
  /* Clave maestra de emergencia (solo admin): si olvidó su contraseña y la
     nube está caída/corrupta, ingresa este código en el paso "Código" del
     formulario de recuperación para desbloquear su cuenta. */
  const MASTER_CODE = "JyG-Master-2026";
  const generarCodigo = () => String(Math.floor(100000 + Math.random() * 900000));
  const solicitarRecuperacion = useCallback(async (correo: string): Promise<{ ok: boolean; error?: string; codigo?: string }> => {
    for (let i = 0; i < 40 && !cloudReady.current; i++) await new Promise((r) => setTimeout(r, 100));
    const lista = dbRef.current.usuarios.length > 0 ? dbRef.current.usuarios : SEED_USUARIOS;
    const c = correo.trim().toLowerCase();
    const u = lista.find((x) => (x.email || "").toLowerCase() === c || (x.usuario || "").toLowerCase() === c);
    /* Mensaje genérico: no revelamos si el correo existe (anti-enumeração) */
    if (!u) return { ok: false, error: "Si el correo está registrado recibirás un código. Verifica que esté bien escrito o contacta al administrador." };
    if (!u.activo) return { ok: false, error: "Este usuario está desactivado. Contacta al administrador." };
    let store: Record<string, { codigo: string; expira: number; intentos: number }> = {};
    try { store = JSON.parse(localStorage.getItem(RECUPERACION_KEY) || "{}"); } catch { /* noop */ }
    const prev = store[u.id];
    if (prev && prev.intentos >= 5 && prev.expira > Date.now()) {
      return { ok: false, error: "Demasiadas solicitudes. Vuelve a intentar más tarde o pide ayuda al administrador." };
    }
    const codigo = generarCodigo();
    store[u.id] = { codigo, expira: Date.now() + 30 * 60 * 1000, intentos: (prev?.intentos ?? 0) + 1 };
    try { localStorage.setItem(RECUPERACION_KEY, JSON.stringify(store)); } catch { /* noop */ }
    return { ok: true, codigo };
  }, []);
  const restablecerPass = useCallback(async (correo: string, codigo: string, nueva: string): Promise<{ ok: boolean; error?: string }> => {
    const lista = dbRef.current.usuarios.length > 0 ? dbRef.current.usuarios : SEED_USUARIOS;
    const c = correo.trim().toLowerCase();
    const u = lista.find((x) => (x.email || "").toLowerCase() === c || (x.usuario || "").toLowerCase() === c);
    if (!u) return { ok: false, error: "Usuario no reconocido." };
    let store: Record<string, { codigo: string; expira: number; intentos: number }> = {};
    try { store = JSON.parse(localStorage.getItem(RECUPERACION_KEY) || "{}"); } catch { /* noop */ }
    /* Código maestro de emergencia: solo desbloquea la cuenta del administrador */
    const seedAdmin = SEED_USUARIOS.find((s) => s.rol === "admin");
    const esAdmin = u.rol === "admin" || (seedAdmin ? (u.id === seedAdmin.id || (u.email || "").toLowerCase() === (seedAdmin.email || "").toLowerCase()) : false);
    const usaMaestro = esAdmin && codigo.trim() === MASTER_CODE;
    if (!usaMaestro) {
      const r = store[u.id];
      if (!r) return { ok: false, error: "No hay una solicitud activa. Pide un código nuevo." };
      if (r.expira < Date.now()) { delete store[u.id]; try { localStorage.setItem(RECUPERACION_KEY, JSON.stringify(store)); } catch { /* noop */ } return { ok: false, error: "El código expiró (30 min). Solicita uno nuevo." }; }
      if (r.codigo !== codigo.trim()) {
        r.intentos += 1; store[u.id] = r;
        try { localStorage.setItem(RECUPERACION_KEY, JSON.stringify(store)); } catch { /* noop */ }
        if (r.intentos >= 5) { delete store[u.id]; try { localStorage.setItem(RECUPERACION_KEY, JSON.stringify(store)); } catch { /* noop */ } return { ok: false, error: "Código incorrecto demasiadas veces. Solicita un código nuevo." }; }
        return { ok: false, error: "El código no es correcto." };
      }
    }
    const faltas = validarPassFuerte(nueva);
    if (faltas.length) return { ok: false, error: "La nueva contraseña no cumple: " + faltas.join(", ").toLowerCase() + "." };
    /* NOTA: ya NO exigimos que sea distinta a la anterior — si el hash llegó
       corrupto desde la nube, esa comparación siempre fallaba y bloqueaba la
       recuperación. La política de fuerza sigue aplicándose. */
    const hash = await hashPass(nueva);
    saveUsuario({ ...u, password: hash });
    /* Reparación total: la nueva clave también se escribe en supabase.auth
       (si el admin configuró la service key) usando la service role, sin
       necesitar la contraseña anterior. Si Auth tiene la clave más nueva,
       respetamos esa y se re-sincroniza el hash local con ella. */
    (async () => {
      try {
        const cfg = dbRef.current.config;
        const url = (cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim();
        const key = (cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim();
        const svc = (cfg.supabaseServiceKey || "").trim();
        if (!url || !key || !svc || !u.email) return;
        const { sbClient, forzarPassAuth, registrarPassCambio } = await import("./supabase");
        const ac = sbClient(url, key, svc);
        const ra = await forzarPassAuth(ac, u.email, nueva, { nombre: u.nombre, usuario: u.usuario, rol: u.rol });
        if (ra.ok) registrarPassCambio(u.id);
        setSyncInfo({ last: Date.now(), ok: ra.ok, msg: ra.ok ? `Contraseña de "${u.nombre}" restablecida en Supabase Auth ✔` : "Recuperación local OK, pero falló Supabase Auth: " + (ra.error || "") });
      } catch { /* noop: queda reparada localmente y el autosync la sube */ }
    })();
    delete store[u.id];
    try { localStorage.setItem(RECUPERACION_KEY, JSON.stringify(store)); } catch { /* noop */ }
    /* Limpiar también cualquier bloqueo de intentos de login de esta cuenta */
    try { const bl = JSON.parse(localStorage.getItem(BLOCK_KEY) || "{}"); delete bl[u.id]; localStorage.setItem(BLOCK_KEY, JSON.stringify(bl)); } catch { /* noop */ }
    /* Si quien recuperó su clave estaba conectado aquí, renovamos su sesión local */
    if (sesion?.id === u.id) { setSesion({ ...u, password: hash }); try { localStorage.setItem("jyg-sesion", JSON.stringify({ ...u, password: hash, verified: true })); } catch { /* noop */ } }
    return { ok: true };
  }, [saveUsuario, sesion]);


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
    const cfg = dbRef.current.config;
    const url = (urlArg || cfg.supabaseUrl || SUPABASE_DEFAULTS.url).trim();
    /* MODO AUTOMÁTICO + RLS ESTRICTA: la anon key queda bloqueada por las
       políticas; toda lectura/escritura debe ir con la service role. */
    const estricto = !!cfg.rlsEstricto && !urlArg && !!(cfg.supabaseServiceKey || "").trim();
    const key = estricto ? (cfg.supabaseServiceKey || "").trim() : (keyArg || cfg.supabaseKey || SUPABASE_DEFAULTS.key).trim();
    if (!url || !key) return null;
    /* Si el usuario no configuró credenciales propias, usamos las del proyecto (.env) */
    if (url !== dbRef.current.config.supabaseUrl || key !== dbRef.current.config.supabaseKey) {
      mutate((d) => ({ ...d, config: { ...d.config, supabaseUrl: url, supabaseKey: key } }));
    }
    const { sbClient } = await import("./supabase");
    return sbClient(url, key);
  }, [mutate]);
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
      try { localStorage.setItem(TS_KEY, String(Date.now())); } catch { /* noop */ }
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
      try {
        const client = await clienteSb();
        if (client) {
          const { descargarTodo, rowsToDb } = await import("./supabase");
          const rows = await descargarTodo(client);
          const nubeTieneDatos = Object.values(rows).some((v) => Array.isArray(v) && v.length > 0);
          if (!cancelado) {
            if (nubeTieneDatos) {
              applyingRemote.current = true;
              aplicarNube(rowsToDb(rows, dbRef.current));
              setSyncInfo({ last: Date.now(), ok: true, msg: "Datos leídos de Supabase al iniciar" });
              setTimeout(() => { applyingRemote.current = false; }, 800);
            } else {
              /* Nube totalmente vacía → publicar la base local por primera vez */
              cloudReady.current = true;
              await syncToCloud();
            }
          }
        }
      } catch {
        /* Error de red o esquema: dejar la base local visible y reintentar subida */
        if (!cancelado) { cloudReady.current = true; await syncToCloud(); }
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
        /* Con RLS estricta, la anon key no puede suscribirse a los cambios:
           se usa la service role (solo si está configurada). */
        const rtKey = (!!cfg.rlsEstricto && (cfg.supabaseServiceKey || "").trim()) ? cfg.supabaseServiceKey!.trim() : cfg.supabaseKey;
        const client = sbClient(cfg.supabaseUrl, rtKey);
        channel = client.channel("jyg-tiempo-real");
        channel.on("postgres_changes", { event: "*", schema: "public" }, () => {
          if (applyingRemote.current) return;
          clearTimeout(rtTimer.current);
          rtTimer.current = setTimeout(async () => {
            try {
              const { descargarTodo, rowsToDb } = await import("./supabase");
              const rows = await descargarTodo(client);
              /* ── Merge inteligente de USUARIOS (seguridad del equipo) ──
                 Si la nube no tiene usuarios o trajeron hashes corruptos,
                 conservamos los usuarios locales con sus contraseñas válidas.
                 Los usuarios nuevos de la nube SÍ se incorporan. */
              const local = dbRef.current.usuarios;
              const { descifrarPass } = await import("./supabase");
              const nubeU: Usuario[] = (rows.usuarios || []).map((u: any) => ({ id: u.id, nombre: u.nombre || "Usuario", usuario: u.usuario || "", email: u.email || "", password: descifrarPass(u.password || u.password_hash || ""), rol: u.rol || "operador", activo: u.activo !== false }));
              if (nubeU.length > 0 && local.length > 0) {
                const mergeados = nubeU.map((nu) => {
                  const lo = local.find((x) => x.id === nu.id);
                  if (!lo) return nu; // usuario creado en otro equipo → bienvenida
                  /* La contraseña local es más reciente/confiable si la de la nube viene vacía o corrupta */
                  const passNubeOk = !!nu.password && (nu.password.startsWith("plain:") || /^[0-9a-f]{64}$/i.test(nu.password) || nu.password.startsWith("fb"));
                  const passLocalOk = !!lo.password && (lo.password.startsWith("plain:") || /^[0-9a-f]{64}$/i.test(lo.password) || lo.password.startsWith("fb"));
                  const password = passNubeOk ? nu.password : (passLocalOk ? lo.password : nu.password);
                  /* Preservar el correo propio local si la nube lo envió vacío */
                  const email = nu.email || lo.email || "";
                  return { ...nu, password, email };
                });
                /* Usuarios locales que la nube aún no conoce (creados hace segundos) → no perderlos */
                const extraLocales = local.filter((lo) => !mergeados.some((m) => m.id === lo.id));
                rows.usuarios = [...mergeados, ...extraLocales];
              } else if (nubeU.length === 0 && local.length > 0) {
                rows.usuarios = local;
              }
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
    /* Con RLS estricta la tabla "usuarios" solo expone la fila propia: una
       lista vacía NO significa que el usuario fue borrado (sería un falso
       positivo y expulsaría al admin). Se exige además que la nube haya
       devuelto otros usuarios para confiar en el chequeo. */
    if (dbRef.current.config.rlsEstricto && db.usuarios.length === 0) return;
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
    user, can, setCurrentUser, sesion, login, logout, loginBoot, cambiarMiPass, resetPassAdmin, solicitarRecuperacion, restablecerPass, setRolPermisos, setRolActivo,
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
