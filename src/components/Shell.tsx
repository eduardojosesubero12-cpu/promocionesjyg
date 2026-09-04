import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, CalendarDays, Camera, ChevronDown, ChevronRight, FileText, GraduationCap,
  LayoutDashboard, Menu, MessageSquare, Moon, Package, Plug, QrCode, Receipt, ScanLine, School,
  Search, Settings, ShoppingBag, Sun, UserCog, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Route } from "../lib/store";
import { MODULOS_GRUPOS, ROL_LABEL, fmtBs, fmtHaceSegundos, estudianteTotales } from "../lib/data";
import { useNow } from "./ui";

/* Iniciales seguras: nunca falla aunque el nombre venga vacío o indefinido */
const iniciales = (nombre?: string | null) => {
  const n = (nombre || "").trim();
  if (!n) return "?";
  return n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
};

/* Un icono propio para cada módulo (nítidos y consistentes en expandido y colapsado) */
const ICONOS_MODULO: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, clientes: Users, escuelas: School, docentes: GraduationCap,
  estudiantes: UserCog, ventas: ShoppingBag, paquetes: Package, cotizaciones: FileText,
  mensajes: MessageSquare, sesiones: Camera, agenda: CalendarDays, produccion: BarChart3,
  qr: QrCode, facturas: Receipt, ocr: ScanLine, reportes: BarChart3, usuarios: Users,
  config: Settings, integraciones: Plug,
};

export const ROUTE_TITLE: Record<Route, string> = {
  dashboard: "Dashboard", clientes: "Clientes", escuelas: "Escuelas", docentes: "Profesores",
  estudiantes: "Estudiantes", ventas: "Ventas · Pedidos", paquetes: "Paquetes", cotizaciones: "Cotizaciones",
  mensajes: "Mensajes", sesiones: "Sesiones Fotográficas", agenda: "Agenda / Calendario",
  produccion: "Producción", qr: "Tarjetas QR", facturas: "Facturación", ocr: "Escáner Inteligente",
  reportes: "Reportes", usuarios: "Usuarios", config: "Configuración", integraciones: "Integraciones",
};
const SECCION_DE: Record<Route, string> = {
  dashboard: "Inicio", clientes: "CRM", escuelas: "CRM", docentes: "CRM", estudiantes: "CRM",
  ventas: "CRM", paquetes: "CRM", cotizaciones: "CRM", mensajes: "CRM", sesiones: "Operaciones",
  agenda: "Operaciones", produccion: "Operaciones", qr: "Operaciones", facturas: "Operaciones",
  ocr: "Operaciones", reportes: "Administración", usuarios: "Administración", config: "Sistema", integraciones: "Sistema",
};

/* Buscador global con Ctrl+K */
function GlobalSearch() {
  const { db, setRoute } = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return db.estudiantes.filter((e) => [e.nombre, e.ci, e.pedido, e.representante].some((v) => (v || "").toLowerCase().includes(t))).slice(0, 7);
  }, [q, db.estudiantes]);
  const ir = (id: string) => { setRoute("estudiantes", { open: id }); setOpen(false); setQ(""); setMobile(false); };
  const box = (
    <div className="position-relative flex-grow-1" style={{ maxWidth: 430 }}>
      <div className="search-box" style={{ maxWidth: "none" }}>
        <Search size={15} className="search-ic" />
        <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar estudiante, cédula, pedido…  (Ctrl+K)" />
        {q && <button className="tool-search-clear" onClick={() => { setQ(""); setOpen(false); }} aria-label="Limpiar"><X size={11} /></button>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="search-drop">
          {resultados.length === 0 ? (
            <div className="px-3 py-3" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Sin resultados para “{q}”</div>
          ) : resultados.map((e) => {
            const t = estudianteTotales(e);
            return (
              <button key={e.id} className="search-item" onClick={() => ir(e.id)}>
                <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 34, height: 34, background: "var(--tint-navy-2)", color: "var(--jyg-navy)", fontSize: 12, flexShrink: 0 }}>{iniciales(e.nombre).slice(0, 1)}</span>
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 12.5 }}>{e.nombre}</span>
                  <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.pedido} · {e.ci || "S/C"} · saldo {t.saldo > 0 ? "$" + t.saldo.toFixed(2) : "pagado"}</span>
                </span>
                <ChevronRight size={14} style={{ color: "var(--ink-faint)" }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
  return (
    <>
      <span className="d-none d-md-flex flex-grow-1" style={{ minWidth: 0 }}>{box}</span>
      <button className="nav-tile d-md-none" onClick={() => setMobile(!mobile)} aria-label="Buscar"><Search size={16} /></button>
      {mobile && <div className="position-fixed d-md-none" style={{ top: 60, left: 0, right: 0, zIndex: 1300, padding: "8px 12px", background: "var(--card-bg)", borderBottom: "1px solid var(--line-soft)" }}>{box}</div>}
    </>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.setAttribute("data-bs-theme", next ? "dark" : "light");
    try { localStorage.setItem("jyg-theme", next ? "dark" : "light"); } catch { /* noop */ }
  };
  return (
    <button className="nav-tile" onClick={toggle} title={dark ? "Modo claro" : "Modo oscuro"} aria-label="Cambiar tema">
      {dark ? <Sun size={16} style={{ color: "var(--jyg-gold)" }} /> : <Moon size={16} />}
    </button>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { db, route, setRoute, can, user, setCurrentUser, alerts, setOcrOpen, tasa, refreshTasa, tasaLoading } = useApp();
  const [mini, setMini] = useState(false);
  const [movil, setMovil] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const now = useNow(1000);
  const permitido = can(route);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 6);
    h(); window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  /* estado inicial responsive + ajuste en resize */
  useEffect(() => {
    const h = () => { if (window.innerWidth > 991) setMovil(false); };
    h(); window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const go = (r: Route) => { setRoute(r); setMovil(false); setBellOpen(false); setProfOpen(false); };

  const sidebar = (
    <>
      <div className="brand">
        <span className="mark"><GraduationCap size={23} /></span>
        <span className="brand-txt"><b>Promociones JyG</b><small>CRM de Grados</small></span>
        <button className="icon-btn d-lg-none ms-auto" style={{ width: 30, height: 30 }} onClick={() => setMovil(false)} aria-label="Cerrar"><X size={15} /></button>
      </div>
      {MODULOS_GRUPOS.map((g) => {
        const visibles = g.items.filter((i) => can(i.ruta as Route));
        if (visibles.length === 0) return null;
        return (
          <div key={g.seccion}>
            <div className="side-label">{g.seccion}</div>
            {visibles.map((i) => {
              const Ic = ICONOS_MODULO[i.ruta] || LayoutDashboard;
              return (
                <button key={i.ruta} className={`nav-item ${route === i.ruta ? "active" : ""}`} onClick={() => go(i.ruta as Route)} data-title={i.label} aria-label={i.label}>
                  <Ic size={19} />
                  <span>{i.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="mt-auto" />
      <div className="user-card">
        <span className="av">{iniciales(user?.nombre)}</span>
        <span className="user-txt">
          <b>{user?.nombre || "Usuario"}</b>
          <small><span className="live" />{ROL_LABEL[user?.rol] || user?.rol || ""}</small>
        </span>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar escritorio (colapsable) */}
      <aside className={`jyg-sidebar-col d-none d-lg-flex ${mini ? "mini" : ""}`}>{sidebar}</aside>
      {/* Sidebar móvil (deslizable) */}
      {movil && <div className="sidebar-veil" onClick={() => setMovil(false)} />}
      <aside className={`jyg-sidebar-col d-lg-none ${movil ? "show" : ""}`}>{sidebar}</aside>

      <div id="content" className={mini ? "mini" : ""}>
        <header className={`jyg-topbar ${scrolled ? "scrolled" : ""}`}>
          <button className="nav-tile d-lg-none" onClick={() => setMovil(true)} aria-label="Abrir menú"><Menu size={17} /></button>
          <button className="nav-tile d-none d-lg-inline-flex" onClick={() => setMini(!mini)} title={mini ? "Expandir menú" : "Colapsar menú"} aria-label="Alternar menú"><Menu size={17} /></button>

          <div className="d-none d-sm-flex align-items-center gap-2" style={{ minWidth: 0 }}>
            <span className="crumb" style={{ margin: 0 }}>{SECCION_DE[route]}</span>
            <ChevronRight size={13} style={{ color: "var(--ink-faint)" }} />
            <span className="font-display fw-semibold text-truncate" style={{ fontSize: 13.5, color: "var(--ink)" }}>{ROUTE_TITLE[route]}</span>
          </div>

          <GlobalSearch />

          <div className="topbar-right">
            {/* Tasa del día en vivo */}
            <button className="d-none d-xl-flex align-items-center gap-2 rounded-pill border-0 px-3" onClick={() => void refreshTasa()} title="Clic para actualizar la tasa (ve.dolarapi.com)" style={{ height: 38, background: "var(--tint-gold)", color: "var(--jyg-gold-deep)", cursor: "pointer", fontFamily: "var(--poppins)" }}>
              <span className={`d-inline-block ${tasaLoading ? "spin" : "pulse-dot"}`} style={{ width: 7, height: 7, borderRadius: 99, background: tasa.apiOk ? "var(--ok)" : "var(--warn)" }} />
              <span className="fw-bold tabular-nums" style={{ fontSize: 13 }}>{tasaLoading ? "…" : fmtBs(tasa.usd)}<span style={{ opacity: 0.7, fontSize: 10 }}> /$</span></span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>{fmtHaceSegundos(tasa.updated, now)}</span>
            </button>

            <ThemeToggle />
            <span className="vr-sep d-none d-sm-block" />

            <div className="position-relative">
              <button className="nav-tile" onClick={() => { setBellOpen(!bellOpen); setProfOpen(false); }} aria-label="Notificaciones">
                <Bell size={16} />
                {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
              </button>
              {bellOpen && (
                <div className="search-drop" style={{ right: 0, left: "auto", width: 310 }}>
                  <div className="px-3 py-2 font-display fw-semibold" style={{ fontSize: 12.5, borderBottom: "1px solid var(--line-soft)" }}>Alertas operativas</div>
                  {alerts.length === 0 ? (
                    <div className="px-3 py-3" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Todo al día, sin alertas 🎉</div>
                  ) : alerts.map((a) => (
                    <button key={a.key} className="search-item" onClick={() => go(a.route)}>
                      <span className="flex-grow-1" style={{ minWidth: 0 }}>
                        <span className="d-block font-display fw-semibold" style={{ fontSize: 12.5 }}>{a.title}</span>
                        <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{a.desc}</span>
                      </span>
                      <ChevronRight size={14} style={{ color: "var(--ink-faint)" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="position-relative">
              <button className="avatar-btn" onClick={() => { setProfOpen(!profOpen); setBellOpen(false); }} aria-label="Perfil">
                <span className="av">{iniciales(user?.nombre)}</span>
                <span className="d-none d-sm-block text-start">
                  <span className="d-block font-display fw-semibold" style={{ fontSize: 12.5, lineHeight: 1.1 }}>{user?.nombre || "Usuario"}</span>
                  <span className="d-block" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{ROL_LABEL[user?.rol] || user?.rol || ""}</span>
                </span>
                <ChevronDown size={13} style={{ color: "var(--ink-faint)" }} />
              </button>
              {profOpen && (
                <div className="search-drop" style={{ right: 0, left: "auto", width: 250 }}>
                  <div className="px-3 py-2 font-display fw-semibold" style={{ fontSize: 12.5, borderBottom: "1px solid var(--line-soft)" }}>Cambiar usuario</div>
                  {db.usuarios.filter((u) => u.activo).map((u) => (
                    <button key={u.id} className="search-item" onClick={() => { setCurrentUser(u.id); setProfOpen(false); }}>
                      <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 30, height: 30, background: u.id === user.id ? "var(--jyg-navy)" : "var(--tint-navy-2)", color: u.id === user.id ? "#ffd970" : "var(--jyg-navy)", fontSize: 11, flexShrink: 0 }}>{iniciales(u.nombre)}</span>
                      <span className="flex-grow-1" style={{ minWidth: 0 }}>
                        <span className="d-block font-display fw-semibold" style={{ fontSize: 12.5 }}>{u.nombre}</span>
                        <span className="d-block" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{ROL_LABEL[u.rol]}</span>
                      </span>
                      {u.id === user.id && <span className="dot" style={{ background: "var(--ok)" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main>
          {permitido ? children : (
            <div className="page">
              <div className="card p-5 text-center" style={{ maxWidth: 480, margin: "60px auto" }}>
                <h3 className="font-display fw-bold">Acceso restringido</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Tu rol <b>{ROL_LABEL[user?.rol] || user?.rol}</b> no tiene permiso para ver este módulo.</p>
                <button className="btn btn-primary" onClick={() => setRoute("dashboard")}>Ir al Dashboard</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Botón flotante del escáner */}
      <button className="fab-ocr" onClick={() => setOcrOpen(true)} title="Escáner Inteligente — C.I. y partida de nacimiento" aria-label="Escáner">
        <ScanLine size={26} />
        <span className="fab-tip">Escanear C.I. / Partida</span>
      </button>
    </>
  );
}
