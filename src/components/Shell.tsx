import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, Boxes, CalendarDays, Camera, ChevronRight, Clock, Contact,
  GraduationCap, LayoutDashboard, Menu, MessageSquare, Moon, Package, Plug, QrCode, Receipt,
  RefreshCw, ScanLine, School, Search, Settings, ShoppingBag, Sun, Ticket, UserCog, Users, Wallet, X,
} from "lucide-react";
import { useApp, ACCESS, ROUTE_TITLE } from "../lib/store";
import type { Route } from "../lib/store";
import { fmtBs, fmtFechaHoraViva, fmtHaceSegundos } from "../lib/data";
import { useNow, useReloj } from "./ui";

const NAV: { section: string; items: { id: Route; label: string; icon: any }[] }[] = [
  { section: "Principal", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "CRM",
    items: [
      { id: "clientes", label: "Clientes", icon: Contact },
      { id: "escuelas", label: "Escuelas", icon: School },
      { id: "docentes", label: "Profesores", icon: Users },
      { id: "estudiantes", label: "Estudiantes", icon: GraduationCap },
      { id: "ventas", label: "Ventas", icon: ShoppingBag },
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
      { id: "config", label: "Configuración", icon: Settings },
      { id: "integraciones", label: "Integraciones", icon: Plug },
    ],
  },
];

function Sidebar() {
  const { route, setRoute, can, mobileNav, setMobileNav, collapsed } = useApp();
  return (
    <aside id="sidebar" className={mobileNav ? "show" : ""}>
      <div className="sidebar-logo">
        <span className="mark"><GraduationCap size={24} /></span>
        <div>
          <b>Promociones JyG</b>
          <small>CRM de Grados</small>
        </div>
        <button className="icon-btn ml-auto" style={{ display: mobileNav ? "inline-flex" : "none" }} onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={17} /></button>
      </div>
      <nav style={{ paddingBottom: 8 }}>
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(i.id));
          if (!items.length) return null;
          return (
            <div key={g.section}>
              <div className="nav-section">{g.section}</div>
              {items.map((i) => (
                <button key={i.id} className={`nav-item ${route === i.id ? "active" : ""}`} onClick={() => setRoute(i.id)} title={i.label}>
                  <i.icon size={17} style={{ flexShrink: 0 }} />
                  <span style={collapsed ? { display: "none" } : undefined}>{i.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <b style={{ color: "var(--ink-soft)" }}>Promociones JyG</b> · Paquetes de grado<br />
        Tasa en vivo vía ve.dolarapi.com
      </div>
    </aside>
  );
}

function GlobalSearch() {
  const { db, setRoute } = useApp();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocus(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return db.estudiantes.filter((e) => [e.nombre, e.ci, e.telefono, e.representante, e.pedido].some((v) => v.toLowerCase().includes(t))).slice(0, 7);
  }, [q, db.estudiantes]);

  return (
    <div ref={boxRef} className="relative flex-1 max-w-[430px] hidden md:block">
      <div className="flex items-center gap-2 h-[38px] px-3.5 rounded-full border transition-colors" style={{ background: "var(--surface-2)", borderColor: focus ? "var(--blue-500)" : "var(--border)" }}>
        <Search size={15} style={{ color: "var(--ink-faint)" }} />
        <input
          className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }}
          placeholder="Buscar estudiante, cédula, pedido…" value={q}
          onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)}
        />
      </div>
      {focus && results.length > 0 && (
        <div className="card absolute left-0 right-0 top-[46px] overflow-hidden z-[1200]" style={{ boxShadow: "var(--shadow-lg)" }}>
          {results.map((e) => (
            <button key={e.id} className="w-full text-left px-4 py-2.5 border-none cursor-pointer flex items-center gap-3 transition-colors hover:bg-[var(--surface-2)]" style={{ background: "var(--surface)", color: "var(--ink)" }}
              onClick={() => { setRoute("estudiantes", { open: e.id }); setQ(""); }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-[11px]" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>{e.nombre[0]}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-semibold text-[13px] truncate">{e.nombre}</span>
                <span className="block text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.pedido} · {e.ci || "S/C"}</span>
              </span>
              <ChevronRight size={15} style={{ color: "var(--ink-faint)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TasaChip() {
  const { tasa, refreshTasa, tasaLoading } = useApp();
  const now = useNow(1000);
  return (
    <button onClick={refreshTasa} className="tasa-chip flex items-center gap-2.5 h-[38px] pl-3 pr-2 rounded-full border cursor-pointer transition-all hover:-translate-y-px" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }} title={`Tasa del día · actualizada ${fmtFechaHoraViva(tasa.updated, now)} — clic para refrescar`}>
      <span className="pulse-dot rounded-full" style={{ width: 8, height: 8, background: tasa.source === "api" ? "var(--green)" : "var(--amber)", flexShrink: 0 }} />
      <span className="tasa-chip-txt text-left leading-tight">
        <span className="block font-display font-bold text-[12.5px]" style={{ color: "var(--ink)" }}>{fmtBs(tasa.usd)} <span style={{ color: "var(--ink-faint)" }}>/ $1</span></span>
        <span className="block text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-faint)" }}>
          {tasa.eur ? `€ ${fmtBs(tasa.eur).replace("Bs. ", "")} · ` : ""}{fmtHaceSegundos(tasa.updated, now)}
        </span>
      </span>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tasaLoading ? "spin" : ""}`} style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>
        <RefreshCw size={13} />
      </span>
    </button>
  );
}

function LiveClock() {
  const { completa } = useReloj(true, 1000);
  return (
    <div className="hidden lg:flex items-center gap-2 h-[38px] px-3.5 rounded-full border" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }} title="Fecha y hora local en tiempo real">
      <Clock size={14} style={{ color: "var(--blue)" }} />
      <span className="font-display font-semibold text-[12px] tabular-nums" style={{ color: "var(--ink-soft)" }}>{completa}</span>
    </div>
  );
}

function Notifications() {
  const { alerts, setRoute } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = alerts.reduce((s, a) => s + (parseInt(a.title) || 0), 0);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const icons: Record<string, any> = { pagos: Wallet, fotos: Camera, entrega: Boxes };
  const colors: Record<string, string> = { pagos: "var(--amber)", fotos: "var(--red)", entrega: "var(--green)" };
  return (
    <div ref={ref} className="relative">
      <button className="icon-btn relative" onClick={() => setOpen((v) => !v)} aria-label="Notificaciones">
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--red)", color: "#fff", border: "2px solid var(--surface)" }}>
            {total}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 top-[46px] w-[320px] overflow-hidden z-[1200]" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="px-4 py-3 font-display font-bold text-[13.5px] border-b" style={{ borderColor: "var(--border-soft)" }}>Alertas del sistema</div>
          {alerts.length === 0 ? (
            <p className="px-4 py-5 text-[12.5px] m-0" style={{ color: "var(--ink-faint)" }}>Todo al día — sin alertas pendientes 🎉</p>
          ) : (
            alerts.map((a) => {
              const Ic = icons[a.key] || Bell;
              return (
                <button key={a.key} className="w-full text-left px-4 py-3 border-none cursor-pointer flex items-center gap-3 transition-colors hover:bg-[var(--surface-2)]" style={{ background: "var(--surface)", color: "var(--ink)" }} onClick={() => { setRoute(a.route); setOpen(false); }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-2)", color: colors[a.key] }}><Ic size={17} /></span>
                  <span className="flex-1">
                    <span className="block font-display font-bold text-[14px]">{a.title}</span>
                    <span className="block text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{a.desc}</span>
                  </span>
                  <ChevronRight size={15} style={{ color: "var(--ink-faint)" }} />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { db, user, setUser, can, setRoute, route } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (user && !can(route)) setRoute("dashboard");
  }, [user, can, route, setRoute]);
  const rolLabel: Record<string, string> = { admin: "Administrador", operador: "Operador", produccion: "Producción", cobranza: "Cobranza" };
  return (
    <div ref={ref} className="relative">
      <button className="flex items-center gap-2.5 border cursor-pointer rounded-full pl-1.5 pr-3 py-1 transition-all hover:shadow-[var(--shadow-sm)]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={() => setOpen((v) => !v)}>
        <span className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[12px]" style={{ background: "linear-gradient(150deg, var(--gold), var(--gold-deep))", color: "#3b2c00" }}>
          {user?.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block font-display font-semibold text-[12.5px]" style={{ color: "var(--ink)" }}>{user?.nombre}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gold-deep)" }}>{rolLabel[user?.rol || "admin"]}</span>
        </span>
      </button>
      {open && (
        <div className="card absolute right-0 top-[50px] w-[240px] overflow-hidden z-[1200]" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="px-4 py-2.5 text-[10.5px] font-display font-semibold uppercase tracking-wider border-b" style={{ color: "var(--ink-faint)", borderColor: "var(--border-soft)" }}>Cambiar de usuario</div>
          {db.usuarios.filter((u) => u.activo).map((u) => (
            <button key={u.id} className="w-full text-left px-4 py-2.5 border-none cursor-pointer flex items-center gap-2.5 transition-colors hover:bg-[var(--surface-2)]" style={{ background: u.id === user?.id ? "var(--blue-tint-2)" : "var(--surface)", color: "var(--ink)" }} onClick={() => { setUser(u.id); setOpen(false); }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[10.5px]" style={{ background: "var(--surface-2)", color: "var(--blue)" }}>{u.nombre[0]}</span>
              <span className="flex-1">
                <span className="block font-display font-semibold text-[12.5px]">{u.nombre}</span>
                <span className="block text-[10.5px]" style={{ color: "var(--ink-faint)" }}>{rolLabel[u.rol]}</span>
              </span>
              {u.id === user?.id && <span className="w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { route, collapsed, setCollapsed, mobileNav, setMobileNav, dark, toggleDark, can, setOcrOpen, setRoute, user } = useApp();
  const allowed = ACCESS[user?.rol || "admin"];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        (document.querySelector<HTMLInputElement>("input[placeholder*='Buscar']"))?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div>
      <Sidebar />
      {mobileNav && <div className="overlay" style={{ zIndex: 1900, padding: 0 }} onMouseDown={() => setMobileNav(false)} />}
      <div id="content">
        <nav id="topbar">
          <button className="icon-btn" onClick={() => (window.innerWidth <= 1080 ? setMobileNav(true) : setCollapsed(!collapsed))} aria-label="Menú">
            {mobileNav ? <X size={19} /> : <Menu size={19} />}
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2.5">
            <LiveClock />
            <TasaChip />
            <Notifications />
            <button className="icon-btn" onClick={toggleDark} aria-label="Tema">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <ProfileMenu />
          </div>
        </nav>

        {allowed.includes(route) && can(route) ? (
          <main key={route}>{children}</main>
        ) : (
          <main className="page">
            <div className="card max-w-[520px] mx-auto mt-16 p-10 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>
                <UserCog size={26} />
              </div>
              <h2 className="font-display" style={{ fontSize: 21, margin: "0 0 8px" }}>Acceso restringido</h2>
              <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: "0 0 20px" }}>
                Tu rol <b>{ROUTE_TITLE[route]}</b> no tiene permiso para este módulo. Cambia de usuario o vuelve al panel.
              </p>
              <button className="btn btn-primary" onClick={() => setRoute("dashboard")}>Ir al Dashboard</button>
            </div>
          </main>
        )}
      </div>

      <button className="fab-ocr" onClick={() => setOcrOpen(true)} title="Escáner OCR inteligente — subir documento o tomar foto" aria-label="Escáner OCR">
        <ScanLine size={26} />
      </button>
    </div>
  );
}
