import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, Boxes, CalendarDays, Camera, ChevronRight, Clock, Contact,
  DollarSign, GraduationCap, LayoutDashboard, Menu, MessageSquare, Moon, Package, Plug, QrCode,
  Receipt, RefreshCw, ScanLine, School, Settings, ShoppingBag, Sun, Ticket, UserCog, Users, Wallet, X,
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
      { id: "facturas", label: "Facturación", icon: Ticket },
      { id: "ocr", label: "Escáner OCR", icon: ScanLine },
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
  const { route, setRoute, can, mobileNav, setMobileNav, db } = useApp();
  const secciones = useMemo(() => NAV.map((s) => ({ ...s, items: s.items.filter((i) => can(i.id)) })).filter((s) => s.items.length > 0), [can]);
  return (
    <>
      {mobileNav && <div className="fixed inset-0 z-[1900] lg:hidden" style={{ background: "rgba(10,17,30,.5)" }} onClick={() => setMobileNav(false)} />}
      <aside id="sidebar" className={mobileNav ? "show" : ""}>
        <div className="sidebar-logo">
          <span className="mark"><GraduationCap size={23} /></span>
          <div className="flex-1">
            <b>Promociones JyG</b>
            <small>CRM de Grados</small>
          </div>
          <button className="icon-btn lg:hidden" onClick={() => setMobileNav(false)}><X size={16} /></button>
        </div>
        <nav className="flex-1 pb-2">
          {secciones.map((s) => (
            <div key={s.section}>
              <div className="nav-section">{s.section}</div>
              {s.items.map((i) => (
                <button key={i.id} className={`nav-item ${route === i.id ? "active" : ""}`} onClick={() => setRoute(i.id)}>
                  <i.icon size={17} /> {i.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="font-display font-semibold" style={{ color: "var(--ink-soft)" }}>{db.config.empresa.nombre}</div>
          <div className="mt-0.5">RIF {db.config.empresa.rif} · {new Date().getFullYear()}</div>
        </div>
      </aside>
    </>
  );
}

function TasaChip() {
  const { tasa, refreshTasa, tasaLoading, setRoute } = useApp();
  const now = useNow(1000);
  return (
    <button onClick={() => setRoute("integraciones")} className="tasa-chip flex items-center gap-2.5 h-[38px] pl-2 pr-3 rounded-full border-none cursor-pointer transition-all hover:-translate-y-0.5" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)" }} title="Tasa del día · ve.dolarapi.com — clic para ver historial">
      <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--green-tint)", color: "var(--green)" }}>
        {tasaLoading ? <RefreshCw size={13} className="spin" /> : <DollarSign size={14} />}
      </span>
      <span className="tasa-chip-txt text-left leading-tight">
        <span className="block font-display font-bold text-[12.5px] tabular-nums" style={{ color: "var(--ink)" }}>{fmtBs(tasa.usd)}</span>
        <span className="block text-[9.5px] font-semibold tabular-nums" style={{ color: "var(--ink-faint)" }}>
          {tasa.apiOk ? `en vivo · ${fmtHaceSegundos(tasa.updated, now)}` : tasa.source === "manual" ? "tasa manual" : "última tasa"}
        </span>
      </span>
    </button>
  );
}

function Reloj() {
  const { completa } = useReloj();
  return (
    <span className="hidden md:flex items-center gap-1.5 text-[11.5px] font-semibold tabular-nums" style={{ color: "var(--ink-faint)" }} title="Hora local en vivo">
      <Clock size={13} /> {completa}
    </span>
  );
}

function Notificaciones() {
  const { alerts, setRoute } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn relative" onClick={() => setOpen((v) => !v)}>
        <Bell size={17} />
        {alerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center font-display font-bold text-[10px] text-white" style={{ background: "var(--red)" }}>{alerts.length}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[300px] card p-2 z-[1200] reveal" style={{ animationDuration: ".25s" }}>
          <div className="font-display font-semibold text-[13px] px-2 py-1.5" style={{ color: "var(--ink-soft)" }}>Alertas operativas</div>
          {alerts.length === 0 && <div className="text-[12.5px] px-2 py-3" style={{ color: "var(--ink-faint)" }}>Todo al día ✓</div>}
          {alerts.map((a) => (
            <button key={a.key} className="w-full flex items-center gap-3 p-2.5 rounded-xl border-none cursor-pointer text-left transition-colors" style={{ background: "transparent", color: "var(--ink)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); setRoute(a.route); }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[13px]" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>{a.title}</span>
              <span className="flex-1 text-[12.5px]">{a.desc}</span>
              <ChevronRight size={14} style={{ color: "var(--ink-faint)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, setUser, db } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const ROL_LABEL: Record<string, string> = { admin: "Administrador", operador: "Operador", produccion: "Producción", cobranza: "Cobranza" };
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2.5 border-none cursor-pointer bg-transparent p-1 pr-2 rounded-full transition-colors" onClick={() => setOpen((v) => !v)} style={{ color: "var(--ink)" }}>
        <span className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-[13px]" style={{ background: "linear-gradient(150deg, var(--blue), #0b2e52)", color: "#ffd970" }}>
          {user.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block font-display font-semibold text-[12.5px]">{user.nombre}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold-deep)" }}>{ROL_LABEL[user.rol]}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[230px] card p-2 z-[1200] reveal" style={{ animationDuration: ".25s" }}>
          <div className="font-display font-semibold text-[12px] uppercase tracking-wider px-2 py-1.5" style={{ color: "var(--ink-faint)" }}>Cambiar de usuario</div>
          {db.usuarios.filter((u) => u.activo).map((u) => (
            <button key={u.id} className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border-none cursor-pointer text-left" style={{ background: u.id === user.id ? "var(--blue-tint-2)" : "transparent", color: "var(--ink)" }} onClick={() => { setUser(u.id); setOpen(false); }}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[11px]" style={{ background: "var(--surface-2)", color: "var(--blue)" }}>{u.nombre[0]}</span>
              <span className="flex-1">
                <span className="block font-display font-semibold text-[12.5px]">{u.nombre}</span>
                <span className="block text-[10.5px]" style={{ color: "var(--ink-faint)" }}>{ROL_LABEL[u.rol]}</span>
              </span>
              {u.id === user.id && <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--green)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { route, setRoute, setMobileNav, dark, toggleDark, setOcrOpen, can, tasa, refreshTasa } = useApp();
  const permitido = can(route);
  const section = NAV.find((s) => s.items.some((i) => i.id === route))?.section || "";
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div id="content">
        <header id="topbar">
          <button className="icon-btn lg:hidden" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={18} /></button>
          <span className="font-display font-semibold text-[13px] hidden sm:block" style={{ color: "var(--ink-soft)" }}>{section} · <b style={{ color: "var(--blue)" }}>{ROUTE_TITLE[route]}</b></span>
          <div className="flex-1" />
          <Reloj />
          <TasaChip />
          <button className="icon-btn hidden md:inline-flex" title={`Tasa: ${fmtBs(tasa.usd)} — actualizar`} onClick={refreshTasa}><RefreshCw size={15} /></button>
          <Notificaciones />
          <button className="icon-btn" onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          <UserMenu />
        </header>
        <main>
          {permitido ? children : (
            <div className="page">
              <div className="card p-10 text-center max-w-[460px] mx-auto mt-16">
                <span className="w-16 h-16 rounded-2xl inline-flex items-center justify-center mb-4" style={{ background: "var(--red-tint)", color: "var(--red)" }}><Wallet size={28} /></span>
                <h2 className="font-display font-bold text-[20px] m-0">Acceso restringido</h2>
                <p className="text-[13.5px] mt-2" style={{ color: "var(--ink-soft)" }}>Tu rol no tiene permiso para ver este módulo. Cambia de usuario en el menú superior o contacta al administrador.</p>
                <button className="btn btn-primary mt-4" onClick={() => setRoute("dashboard")}>Ir al Dashboard</button>
              </div>
            </div>
          )}
        </main>
      </div>
      <button className="fab-ocr" onClick={() => setOcrOpen(true)} title="Escáner OCR · documentos y fotos con la IA de Google">
        <ScanLine size={26} />
      </button>
    </div>
  );
}
