import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, Boxes, CalendarDays, Camera, ChevronDown, ChevronRight, Contact, DollarSign,
  GraduationCap, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Package, Plug, QrCode,
  Receipt, ScanLine, School, Search, Settings, Sun, Ticket, UserCog, Users, Wallet, X,
} from "lucide-react";
import { useApp, ROUTE_TITLE, SECTION_OF, type Route } from "../lib/store";
import { fmtBs, fmtHaceSegundos, fmtUSD, estudianteTotales } from "../lib/data";
import { useNow } from "./ui";

const MENU: { section: string; items: { id: Route; label: string; icon: any }[] }[] = [
  { section: "", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "CRM",
    items: [
      { id: "clientes", label: "Clientes", icon: Contact },
      { id: "escuelas", label: "Escuelas", icon: School },
      { id: "docentes", label: "Profesores", icon: Users },
      { id: "estudiantes", label: "Estudiantes", icon: GraduationCap },
      { id: "ventas", label: "Ventas", icon: Wallet },
      { id: "paquetes", label: "Paquetes", icon: Package },
      { id: "cotizaciones", label: "Cotizaciones", icon: Receipt },
      { id: "mensajes", label: "Mensajes", icon: MessageSquare },
    ],
  },
  {
    section: "Operaciones",
    items: [
      { id: "sesiones", label: "Sesiones Fotográficas", icon: Camera },
      { id: "agenda", label: "Agenda / Calendario", icon: CalendarDays },
      { id: "produccion", label: "Producción", icon: Boxes },
      { id: "qr", label: "Tarjetas QR", icon: QrCode },
      { id: "ocr", label: "Escáner OCR", icon: ScanLine },
      { id: "facturas", label: "Facturación", icon: Ticket },
    ],
  },
  {
    section: "Administración",
    items: [
      { id: "reportes", label: "Reportes", icon: BarChart3 },
      { id: "usuarios", label: "Usuarios", icon: UserCog },
    ],
  },
  {
    section: "Sistema",
    items: [
      { id: "config", label: "Configuración", icon: Settings },
      { id: "integraciones", label: "Integraciones", icon: Plug },
    ],
  },
];

function MenuList({ onGo, mini }: { onGo: (r: Route) => void; mini?: boolean }) {
  const { route, can, setCurrentUser, db, user } = useApp();
  return (
    <nav className="jyg-nav py-2">
      {MENU.map((g) => {
        const visibles = g.items.filter((i) => can(i.id));
        if (!visibles.length) return null;
        return (
          <div key={g.section || "top"}>
            {g.section && <div className="nav-section">{g.section}</div>}
            {visibles.map((i) => (
              <a
                key={i.id}
                href="#"
                title={i.label}
                className={`nav-link ${route === i.id ? "active" : ""}`}
                onClick={(e) => { e.preventDefault(); onGo(i.id); }}
              >
                <i.icon size={17} />
                <span>{i.label}</span>
              </a>
            ))}
          </div>
        );
      })}
      <div className="nav-section">Cuenta</div>
      <a
        href="#"
        title="Cambiar usuario"
        className="nav-link logout"
        onClick={(e) => {
          e.preventDefault();
          const otros = db.usuarios.filter((u) => u.id !== user.id && u.activo);
          if (otros.length) { setCurrentUser(otros[0].id); }
        }}
      >
        <LogOut size={17} />
        <span>Cambiar usuario</span>
      </a>
    </nav>
  );
}

function BrandMark() {
  return (
    <div className="jyg-brand">
      <span className="mark"><GraduationCap size={22} /></span>
      <span>
        <b>Promociones JyG</b>
        <small>CRM de Grados</small>
      </span>
    </div>
  );
}

/* Chip de tasa en vivo */
function TasaChip() {
  const { tasa, tasaLoading, refreshTasa, setRoute } = useApp();
  const now = useNow(1000);
  return (
    <button
      className="tasa-chip"
      onClick={() => setRoute("integraciones")}
      title={`Tasa del día · ${tasa.apiOk ? "ve.dolarapi.com" : "tasa de respaldo"} · actualizada ${fmtHaceSegundos(tasa.updated, now)}`}
    >
      <span className="tasa-ic"><DollarSign size={13} /></span>
      <span className="tasa-chip-txt text-start">
        <b className="tabular-nums">{tasaLoading ? "…" : fmtBs(tasa.usd)}</b>
        <small>tasa del día {tasa.eur > 0 && `· € ${fmtBs(tasa.eur).replace("Bs ", "")}`}</small>
      </span>
    </button>
  );
}

/* Buscador global con Ctrl+K */
function GlobalSearch() {
  const { db, setRoute } = useApp();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); }
      if (e.key === "Escape") { setFocus(false); ref.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return db.estudiantes.filter((e) => [e.nombre, e.ci, e.pedido, e.representante].some((v) => v.toLowerCase().includes(t))).slice(0, 7);
  }, [q, db.estudiantes]);

  return (
    <div className="search-box">
      <Search size={15} className="search-ic" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder="Buscar estudiante, pedido, cédula…"
        aria-label="Buscar"
      />
      {q ? (
        <button className="search-clear" onClick={() => setQ("")} aria-label="Limpiar"><X size={11} /></button>
      ) : (
        <span className="kbd d-none d-md-inline">Ctrl K</span>
      )}
      {focus && q && (
        <div className="search-drop">
          {resultados.length === 0 ? (
            <div className="px-3 py-3" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Sin resultados para “{q}”</div>
          ) : (
            resultados.map((e) => {
              const t = estudianteTotales(e);
              return (
                <button key={e.id} className="search-item" onClick={() => { setRoute("estudiantes", { open: e.id }); setQ(""); }}>
                  <span className="search-av">{e.nombre[0]}</span>
                  <span className="flex-grow-1" style={{ minWidth: 0 }}>
                    <span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</span>
                    <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.pedido} · {e.ci || "S/C"} · saldo {fmtUSD(t.saldo)}</span>
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--ink-faint)" }} />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { dark, toggleDark } = useApp();
  return (
    <button className={`theme-pill ${dark ? "on" : ""}`} onClick={toggleDark} role="switch" aria-checked={dark} aria-label="Cambiar tema" title={dark ? "Modo claro" : "Modo oscuro"}>
      <Sun size={11} className="tp-ic tp-sun" />
      <Moon size={11} className="tp-ic tp-moon" />
      <span className="theme-knob">{dark ? <Moon size={11} /> : <Sun size={11} />}</span>
    </button>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { route, setRoute, can, collapsed, setCollapsed, mobileNav, setMobileNav, setOcrOpen, user, alerts } = useApp();
  const permitido = can(route);
  const [scrolled, setScrolled] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (r: Route) => { setRoute(r); setMobileNav(false); };

  return (
    <>
      {/* Sidebar escritorio / tablet */}
      <aside className={`jyg-sidebar-col d-none d-lg-flex ${collapsed ? "mini" : ""}`}>
        <div className="p-3 border-bottom" style={{ borderColor: "var(--line-soft)" }}><BrandMark /></div>
        <MenuList onGo={go} mini={collapsed} />
        <div className="sidebar-foot">Promociones JyG · {new Date().getFullYear()}</div>
      </aside>

      {/* Offcanvas móvil */}
      <div className={`offcanvas offcanvas-start d-lg-none ${mobileNav ? "show" : ""}`} tabIndex={-1} style={{ visibility: mobileNav ? "visible" : "hidden", width: 280 }}>
        <div className="offcanvas-header border-bottom" style={{ borderColor: "var(--line-soft)" }}>
          <BrandMark />
          <button type="button" className="btn-close" onClick={() => setMobileNav(false)} aria-label="Cerrar" />
        </div>
        <div className="offcanvas-body d-flex flex-column p-0">
          <MenuList onGo={go} />
        </div>
      </div>
      {mobileNav && <div className="offcanvas-backdrop fade show d-lg-none" onClick={() => setMobileNav(false)} />}

      {/* Contenido */}
      <div id="content" className={collapsed ? "mini" : ""}>
        <header className={`jyg-topbar sticky-top d-flex ${scrolled ? "scrolled" : ""}`}>
          <div className="topbar-inner">
            <button
              className={`nav-tile ${collapsed ? "active" : ""}`}
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Colapsar menú"
              title={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              <Menu size={18} />
            </button>
            <button className="nav-tile d-lg-none" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={18} /></button>

            <div className="topbar-crumb d-none d-md-flex">
              <span className="crumb-chip">{SECTION_OF[route]}</span>
              <ChevronRight size={13} style={{ color: "var(--ink-faint)" }} />
              <span className="crumb-page">{ROUTE_TITLE[route]}</span>
            </div>

            <GlobalSearch />

            <div className="topbar-right">
              <TasaChip />
              <ThemeToggle />
              <span className="vr-sep" />

              <div className="position-relative">
                <button className="nav-tile" onClick={() => { setBellOpen(!bellOpen); setProfOpen(false); }} aria-label="Notificaciones">
                  <Bell size={17} />
                  {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
                </button>
                {bellOpen && (
                  <div className="search-drop" style={{ right: 0, left: "auto", width: 300 }}>
                    <div className="px-3 py-2 font-display fw-semibold" style={{ fontSize: 12.5, borderBottom: "1px solid var(--line-soft)" }}>Alertas</div>
                    {alerts.length === 0 ? (
                      <div className="px-3 py-3" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Todo al día, sin alertas.</div>
                    ) : (
                      alerts.map((a) => (
                        <button key={a.key} className="search-item" onClick={() => { go(a.route); setBellOpen(false); }}>
                          <span className="flex-grow-1" style={{ minWidth: 0 }}>
                            <span className="d-block font-display fw-semibold" style={{ fontSize: 12.5 }}>{a.title}</span>
                            <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{a.desc}</span>
                          </span>
                          <ChevronRight size={14} style={{ color: "var(--ink-faint)" }} />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="position-relative">
                <button className="avatar-btn" onClick={() => { setProfOpen(!profOpen); setBellOpen(false); }} aria-label="Perfil">
                  <span className="av">{user.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                  <span className="d-none d-sm-block text-start">
                    <span className="d-block font-display fw-semibold" style={{ fontSize: 12.5, lineHeight: 1.1 }}>{user.nombre}</span>
                    <span className="d-block" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{user.rol}</span>
                  </span>
                  <ChevronDown size={13} style={{ color: "var(--ink-faint)" }} />
                </button>
                {profOpen && (
                  <div className="search-drop" style={{ right: 0, left: "auto", width: 220 }}>
                    <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--line-soft)" }}>
                      <span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{user.nombre}</span>
                      <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>@{user.usuario}</span>
                    </div>
                    <button className="search-item" onClick={() => { go("config"); setProfOpen(false); }}><Settings size={14} /> Configuración</button>
                    <button className="search-item" onClick={() => { go("usuarios"); setProfOpen(false); }}><UserCog size={14} /> Usuarios</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main>
          {permitido ? (
            children
          ) : (
            <div className="page">
              <div className="card p-5 text-center" style={{ maxWidth: 480, margin: "60px auto" }}>
                <h3 className="font-display fw-bold">Acceso restringido</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
                  Tu rol <b>{user.rol}</b> no tiene permiso para ver este módulo.
                </p>
                <button className="btn btn-primary" onClick={() => setRoute("dashboard")}>Ir al Dashboard</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Botón flotante OCR */}
      <button className="fab-ocr" onClick={() => setOcrOpen(true)} title="Escáner OCR inteligente — C.I. y partida de nacimiento" aria-label="Escáner OCR">
        <ScanLine size={24} />
        <span className="fab-tip">Escanear C.I. / Partida</span>
      </button>
    </>
  );
}
