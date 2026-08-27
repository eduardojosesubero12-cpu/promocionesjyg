import React, { useState } from "react";
import {
  AlertTriangle, Briefcase, Check, Clock, Cloud, Cog, Copy, Database, Download, Euro, Eye, EyeOff,
  Factory, Globe, History, Home, KeyRound, Lock, Pencil, Plug, Plus, RefreshCw, ScanLine, Server,
  ShieldCheck, Trash2, Upload, UploadCloud, UserRound, Users, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { PaqueteEscuela, Rol, Usuario } from "../lib/data";
import {
  ACCESOS_DEFAULT, API_DOLARES, API_EUROS, DB_TABLES, MODULOS_GRUPOS, OCR_CRED, PAQUETES,
  ROL_DESC, ROL_LABEL, ROLES_INFO, SUPABASE_SQL, TODOS_MODULOS,
  downloadFile, fmtBs, fmtFecha, fmtFechaHoraViva, fmtHaceSegundos, fmtUSD, toCSV, todayISO, uid,
} from "../lib/data";
import { Badge, Field, Modal, SectionHead, useNow } from "../components/ui";

/* Iconos por nombre (catálogo de roles y módulos) */
const ICONOS: Record<string, any> = {
  shield: ShieldCheck, user: UserRound, factory: Factory, wallet: Wallet,
  home: Home, briefcase: Briefcase, cog: Cog, lock: Lock, server: Server,
};

/* Switch reutilizable (tamaños: grande para rol, pequeño para módulo) */
function Switch({ on, onToggle, size = "sm", label }: { on: boolean; onToggle: () => void; size?: "sm" | "lg"; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`sw ${size === "lg" ? "sw-lg" : ""} ${on ? "on" : ""}`}
    >
      <span className="sw-knob" />
    </button>
  );
}

/* ============ USUARIOS — Roles y accesos del equipo JyG ============ */
export function Usuarios() {
  const { db, saveUsuario, deleteUsuario, confirm, success, toast, user: yo, setRolPermisos, setRolActivo } = useApp();
  const [form, setForm] = useState<Usuario | null>(null);
  const [selRol, setSelRol] = useState<Rol>("admin");
  const [guardado, setGuardado] = useState(false);

  /* Accesos actuales del rol seleccionado (editados o por defecto) */
  const accesosSel = db.config.rolesPermisos?.[selRol] ?? (ACCESOS_DEFAULT[selRol] as string[]);
  const rolSel = ROLES_INFO.find((r) => r.id === selRol)!;
  const rolSelActivo = db.config.rolesActivos?.[selRol] !== false;

  const flashGuardado = () => { setGuardado(true); setTimeout(() => setGuardado(false), 1400); };

  const toggleModulo = (ruta: string) => {
    const nuevo = accesosSel.includes(ruta) ? accesosSel.filter((r) => r !== ruta) : [...accesosSel, ruta];
    setRolPermisos(selRol, nuevo);
    flashGuardado();
  };
  const marcarTodos = (on: boolean) => {
    setRolPermisos(selRol, on ? [...TODOS_MODULOS] : []);
    flashGuardado();
  };
  const toggleRol = async (rol: Rol, activo: boolean) => {
    if (!activo) {
      const afectados = db.usuarios.filter((u) => u.rol === rol && u.activo).length;
      const ok = await confirm({
        title: "¿Está seguro de desactivar este rol?",
        message: afectados > 0
          ? `${afectados} usuario(s) con el rol "${ROL_LABEL[rol]}" perderán el acceso al sistema.`
          : `El rol "${ROL_LABEL[rol]}" quedará sin acceso al sistema.`,
        confirmText: "Desactivar", danger: true,
      });
      if (!ok) return;
    }
    setRolActivo(rol, activo);
    toast(activo ? `Rol ${ROL_LABEL[rol]} activado` : `Rol ${ROL_LABEL[rol]} desactivado`, activo ? "ok" : "warn");
  };

  const guardarUsuario = async () => {
    if (!form || !form.nombre.trim()) { toast("El nombre es obligatorio", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveUsuario({ ...form, id: form.id || uid(), usuario: form.usuario || form.nombre.toLowerCase().split(" ")[0] });
    success();
    setForm(null);
  };
  const eliminarUsuario = async (u: Usuario) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará al usuario "${u.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteUsuario(u.id);
    toast("Usuario eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Usuarios</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Roles y accesos del equipo JyG</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({ id: "", nombre: "", usuario: "", rol: "operador", activo: true })}><Plus size={16} /> Nuevo usuario</button>
      </div>

      {/* ---------- Sesión actual ---------- */}
      <div className="sess-card reveal">
        <span className="user-avatar">{yo.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="font-display fw-bold" style={{ fontSize: 15 }}>{yo.nombre}</span>
            <Badge tone="blue">Sesión actual</Badge>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
            @{yo.usuario} · <b style={{ color: "var(--ink-soft)" }}>{ROL_LABEL[yo.rol]}</b> ·{" "}
            {db.config.rolesActivos?.[yo.rol] === false
              ? <span style={{ color: "var(--danger)" }}>rol desactivado</span>
              : <>{(db.config.rolesPermisos?.[yo.rol] ?? (ACCESOS_DEFAULT[yo.rol] as string[])).length} módulos activos</>}
          </div>
        </div>
        <ShieldCheck size={26} style={{ color: "var(--jyg-gold-deep)", flexShrink: 0 }} />
      </div>

      {/* ---------- Panel de roles (switch on/off por rol) ---------- */}
      <SectionHead
        title="Roles del equipo"
        desc="Activa o desactiva un rol con su switch · haz clic en la tarjeta para editar sus accesos"
        actions={guardado ? <Badge tone="green" dot>Guardado</Badge> : undefined}
      />
      <div className="row g-3 mb-4">
        {ROLES_INFO.map((r, i) => {
          const Ico = ICONOS[r.icon];
          const activo = db.config.rolesActivos?.[r.id] !== false;
          const rutas = db.config.rolesPermisos?.[r.id] ?? (ACCESOS_DEFAULT[r.id] as string[]);
          const usuariosRol = db.usuarios.filter((u) => u.rol === r.id).length;
          const seleccionado = selRol === r.id;
          return (
            <div key={r.id} className="col-12 col-md-6 col-xl-3">
              <div
                className={`rol-card reveal ${seleccionado ? "sel" : ""} ${activo ? "" : "off"}`}
                style={{ animationDelay: `${i * 60}ms`, ...(seleccionado ? { borderColor: r.color } : {}) }}
                onClick={() => setSelRol(r.id)}
                role="button"
                tabIndex={0}
              >
                <div className="d-flex align-items-start justify-content-between w-100">
                  <span className="rol-ic" style={{ background: `color-mix(in srgb, ${r.color} 14%, transparent)`, color: r.color }}>
                    <Ico size={21} />
                  </span>
                  <Switch size="lg" on={activo} onToggle={() => toggleRol(r.id, !activo)} label={`Activar rol ${r.label}`} />
                </div>
                <div className="font-display fw-bold mt-2" style={{ fontSize: 15.5, color: activo ? "var(--ink)" : "var(--ink-faint)" }}>{r.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 1, lineHeight: 1.35 }}>{r.desc}</div>
                <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
                  <span className="rol-stat"><Users size={12} /> {usuariosRol}</span>
                  <span className="rol-stat"><Check size={12} /> {activo ? rutas.length : 0} módulos</span>
                  {seleccionado && <Badge tone="blue" className="ms-auto">Editando</Badge>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Matriz de accesos del rol seleccionado ---------- */}
      <div className="card p-4 mb-4 reveal" style={{ borderTop: `3px solid ${rolSel.color}` }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="rol-ic" style={{ background: `color-mix(in srgb, ${rolSel.color} 14%, transparent)`, color: rolSel.color, width: 34, height: 34 }}>
              {React.createElement(ICONOS[rolSel.icon], { size: 17 })}
            </span>
            <div>
              <div className="font-display fw-bold" style={{ fontSize: 15.5 }}>Accesos de {rolSel.label}</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                {rolSelActivo ? `${accesosSel.length} de ${TODOS_MODULOS.length} módulos permitidos` : "Rol desactivado — sin acceso"}
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-soft btn-sm" onClick={() => marcarTodos(true)} disabled={!rolSelActivo}>Marcar todos</button>
            <button className="btn btn-ghost btn-sm" onClick={() => marcarTodos(false)} disabled={!rolSelActivo}>Quitar todos</button>
          </div>
        </div>

        <div className={rolSelActivo ? "" : "perm-disabled"}>
          {MODULOS_GRUPOS.map((g) => {
            const GIco = ICONOS[g.icon];
            const activosGrupo = g.items.filter((m) => accesosSel.includes(m.ruta)).length;
            return (
              <div key={g.seccion} className="perm-group">
                <div className="perm-group-head">
                  <span className="d-flex align-items-center gap-2">
                    <GIco size={14} style={{ color: rolSel.color }} />
                    <span className="font-display fw-semibold" style={{ fontSize: 12.5 }}>{g.seccion}</span>
                  </span>
                  <span className="perm-count tabular-nums">{activosGrupo}/{g.items.length}</span>
                </div>
                <div className="perm-rows">
                  {g.items.map((m) => {
                    const on = accesosSel.includes(m.ruta);
                    return (
                      <div key={m.ruta} className={`perm-row ${on ? "on" : ""}`} onClick={() => rolSelActivo && toggleModulo(m.ruta)} role="button" tabIndex={0}>
                        <span className="perm-dot" style={{ background: on ? rolSel.color : "var(--line)" }} />
                        <span className="flex-grow-1" style={{ fontSize: 13, fontWeight: on ? 600 : 500, color: on ? "var(--ink)" : "var(--ink-faint)" }}>{m.label}</span>
                        <Switch on={on} onToggle={() => toggleModulo(m.ruta)} label={`Permiso ${m.label}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Equipo ---------- */}
      <SectionHead title="Equipo JyG" desc={`${db.usuarios.length} usuarios registrados`} />
      <div className="row g-3">
        {db.usuarios.map((u, i) => (
          <div key={u.id} className="col-12 col-md-6 col-xl-4">
            <div className="user-card reveal h-100" style={{ animationDelay: `${i * 55}ms` }}>
              <span className={`user-avatar ${u.activo ? "" : "inactivo"}`}>{u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
              <div className="user-info">
                <div className="u-nombre">{u.nombre}{u.id === yo.id && <Badge tone="blue" className="ms-2">Tú</Badge>}</div>
                <div className="u-login">@{u.usuario} · <Badge tone={u.rol === "admin" ? "gold" : u.rol === "cobranza" ? "red" : u.rol === "produccion" ? "green" : "blue"}>{ROL_LABEL[u.rol]}</Badge></div>
              </div>
              <div className="user-actions">
                <Switch on={u.activo} onToggle={() => { saveUsuario({ ...u, activo: !u.activo }); toast(u.activo ? "Usuario desactivado" : "Usuario activado", "ok"); }} label={`Activar ${u.nombre}`} />
                <button className="icon-btn" title="Editar" onClick={() => setForm(u)}><Pencil size={15} /></button>
                <button className="icon-btn danger" title="Eliminar" onClick={() => eliminarUsuario(u)}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar usuario" : "Nuevo usuario"}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardarUsuario}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="row g-3">
            <Field label="Nombre" required className="col-12"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus /></Field>
            <Field label="Usuario" className="col-md-6"><input className="input" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></Field>
            <Field label="Rol" className="col-md-6">
              <select className="select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Usuario["rol"] })}>
                {ROLES_INFO.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
          </div>
          <p className="mt-3 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{ROL_DESC[form.rol]}.</p>
        </Modal>
      )}
    </div>
  );
}

/* ============ CONFIGURACIÓN ============ */
const peVacio = (): PaqueteEscuela => ({ id: "", escuelaId: "", nombre: "", tipoPaqueteId: "premium", precio: 40, articulos: PAQUETES.premium.incluye.map((n) => ({ nombre: n, cantidad: 1 })), nota: "", activo: true, creado: todayISO() });

export function Configuracion() {
  const { db, setConfig, confirm, success, toast, tasa, refreshTasa, setRoute, savePaqueteEscuela, deletePaqueteEscuela, setOcrOpen, exportBackup, importBackup } = useApp();
  const [emp, setEmp] = useState({ ...db.config.empresa });
  const [fallback, setFallback] = useState(String(db.config.tasaManualUSD || db.config.tasaFallback));
  const [verClaveOcr, setVerClaveOcr] = useState(false);
  const [peForm, setPeForm] = useState<PaqueteEscuela | null>(null);

  const guardarEmpresa = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Se actualizarán los datos de la empresa en facturas y tickets.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ empresa: emp });
    success();
  };
  const guardarTasa = async () => {
    const n = Number(fallback);
    if (!n || n <= 0) { toast("Tasa inválida", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `La tasa manual ${fmtBs(n)} por $1 quedará registrada en el historial.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ usarApi: false, usarTasaManual: true, tasaManualUSD: n, tasaFallback: n });
    refreshTasa();
    success();
  };
  const toggleApi = () => {
    const irApi = db.config.usarTasaManual || !db.config.usarApi;
    setConfig({ usarApi: irApi, usarTasaManual: false });
    if (irApi) { toast("Consultando ve.dolarapi.com…", "ok"); refreshTasa(); }
    else toast("Usando tasa manual", "warn");
  };
  const copiar = (texto: string, que: string) => {
    navigator.clipboard?.writeText(texto).then(() => toast(`${que} copiado al portapapeles`, "ok")).catch(() => toast("No se pudo copiar", "err"));
  };
  const guardarPe = async () => {
    if (!peForm || !peForm.nombre.trim() || !peForm.escuelaId) { toast("Completa nombre y escuela", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    savePaqueteEscuela({ ...peForm, id: peForm.id || uid(), creado: peForm.creado || todayISO() });
    success();
    setPeForm(null);
  };
  const eliminarPe = async (p: PaqueteEscuela) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará "${p.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePaqueteEscuela(p.id);
    toast("Paquete eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Sistema</div>
          <h1>Configuración</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Empresa, tasa del día, cuenta OCR y paquetes por escuela</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Empresa */}
        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Datos de la empresa" desc="Aparecen en el ticket de facturación" />
            <div className="row g-3">
              <Field label="Nombre" className="col-md-6"><input className="input" value={emp.nombre} onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} /></Field>
              <Field label="RIF" className="col-md-6"><input className="input" value={emp.rif} onChange={(e) => setEmp({ ...emp, rif: e.target.value })} /></Field>
              <Field label="Teléfono" className="col-md-6"><input className="input" value={emp.telefono} onChange={(e) => setEmp({ ...emp, telefono: e.target.value })} /></Field>
              <Field label="Dirección" className="col-md-6"><input className="input" value={emp.direccion} onChange={(e) => setEmp({ ...emp, direccion: e.target.value })} /></Field>
            </div>
            <button className="btn btn-primary btn-sm mt-3" onClick={guardarEmpresa}><Check size={14} /> Guardar empresa</button>
          </div>
        </div>

        {/* Tasa */}
        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Tasa del día" desc={`Actual: ${fmtBs(tasa.usd)} · fuente ${tasa.source}`} />
            <label className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--ink-soft)" }}>
              <input type="checkbox" checked={db.config.usarApi && !db.config.usarTasaManual} onChange={toggleApi} /> Usar tasa automática de DolarAPI
            </label>
            <div className="d-flex gap-2 align-items-end">
              <Field label="Tasa manual (Bs por $1)" className="flex-grow-1">
                <input type="number" className="input" value={fallback} onChange={(e) => setFallback(e.target.value)} />
              </Field>
              <button className="btn btn-primary" onClick={guardarTasa}><Check size={15} /> Aplicar</button>
            </div>
            <p className="mt-2 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              APIs: <a href={API_DOLARES} target="_blank" rel="noreferrer" style={{ color: "var(--jyg-navy)" }}>dolares</a> · <a href={API_EUROS} target="_blank" rel="noreferrer" style={{ color: "var(--jyg-navy)" }}>euros</a>
            </p>
          </div>
        </div>

        {/* Cuenta OCR */}
        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Cuenta de servicio OCR" desc="Credenciales de Google Cloud Vision" actions={<Badge tone="green" dot>Conectada</Badge>} />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2">
                <span className="flex-grow-1 text-truncate" style={{ color: "var(--ink-soft)" }}>{OCR_CRED.correo}</span>
                <button className="icon-btn" title="Copiar" onClick={() => copiar(OCR_CRED.correo, "Correo")}><Copy size={14} /></button>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="flex-grow-1 text-truncate tabular-nums" style={{ color: "var(--ink-soft)" }}>ID: {OCR_CRED.id}</span>
                <button className="icon-btn" title="Copiar" onClick={() => copiar(OCR_CRED.id, "ID")}><Copy size={14} /></button>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="flex-grow-1 text-truncate tabular-nums" style={{ color: "var(--ink-soft)" }}>{verClaveOcr ? OCR_CRED.clave : "•".repeat(28)}</span>
                <button className="icon-btn" title={verClaveOcr ? "Ocultar" : "Mostrar"} onClick={() => setVerClaveOcr(!verClaveOcr)}>{verClaveOcr ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button className="icon-btn" title="Copiar" onClick={() => copiar(OCR_CRED.clave, "Clave")}><Copy size={14} /></button>
              </div>
            </div>
            <button className="btn btn-soft btn-sm mt-3" onClick={() => setOcrOpen(true)}><ScanLine size={14} /> Abrir escáner OCR</button>
          </div>
        </div>

        {/* Respaldo */}
        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Respaldo local" desc="Exporta o restaura la base en este navegador" />
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-primary btn-sm" onClick={() => { downloadFile(`respaldo-jyg-${todayISO()}.json`, exportBackup(), "application/json"); toast("Respaldo descargado", "ok"); }}><Download size={14} /> Exportar JSON</button>
              <label className="btn btn-ghost btn-sm mb-0" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Restaurar…
                <input type="file" accept="application/json" className="d-none" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const ok = await confirm({ title: "¿Restaurar respaldo?", message: "Se reemplazarán los datos actuales por los del archivo.", confirmText: "Sí, Restaurar" });
                  if (!ok) { e.target.value = ""; return; }
                  const r = new FileReader();
                  r.onload = () => { if (importBackup(r.result as string)) success("Respaldo restaurado"); else toast("Archivo inválido", "err"); };
                  r.readAsText(f); e.target.value = "";
                }} />
              </label>
            </div>
            <p className="mt-2 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>Para respaldo en la nube usa Supabase en Integraciones.</p>
          </div>
        </div>
      </div>

      {/* Paquetes por escuela */}
      <div className="card p-4 mt-4">
        <SectionHead title="Paquetes por Escuela" desc="Asigna paquetes personalizados con nombre, tipo, precio y artículos a cada plantel" actions={<button className="btn btn-primary btn-sm" onClick={() => setPeForm(peVacio())}><Plus size={14} /> Asignar paquete</button>} />
        {db.paquetesEscuelas.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Aún no hay paquetes asignados a escuelas.</p>
        ) : (
          db.escuelas.map((es) => {
            const pkgs = db.paquetesEscuelas.filter((p) => p.escuelaId === es.id);
            if (!pkgs.length) return null;
            return (
              <div key={es.id} className="mb-3">
                <div className="font-display fw-semibold mb-2" style={{ fontSize: 13.5, color: "var(--jyg-navy)" }}>{es.nombre}</div>
                <div className="row g-3">
                  {pkgs.map((p) => (
                    <div key={p.id} className="col-12 col-md-6 col-xl-4">
                      <div className="card p-3 h-100 card-lift" style={{ background: "var(--card-bg-2)" }}>
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="font-display fw-bold" style={{ fontSize: 14 }}>{p.nombre}</span>
                          <Badge tone={p.tipoPaqueteId === "lujo" ? "gold" : p.tipoPaqueteId === "premium" ? "green" : p.tipoPaqueteId === "basico" ? "blue" : "slate"}>{p.tipoPaqueteId}</Badge>
                        </div>
                        <div className="font-display fw-bold tabular-nums mt-1" style={{ color: "var(--jyg-gold-deep)", fontSize: 18 }}>{fmtUSD(p.precio)}</div>
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {p.articulos.slice(0, 5).map((a, i) => <Badge key={i} tone="slate">{a.cantidad}× {a.nombre}</Badge>)}
                          {p.articulos.length > 5 && <Badge tone="slate">+{p.articulos.length - 5}</Badge>}
                        </div>
                        {p.nota && <p className="fst-italic mt-2 mb-0" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{p.nota}</p>}
                        <div className="d-flex gap-1 mt-2">
                          <button className="btn btn-xs" style={{ background: p.activo ? "var(--tint-ok)" : "var(--tint-danger)", color: p.activo ? "var(--ok)" : "var(--danger)" }} onClick={() => { savePaqueteEscuela({ ...p, activo: !p.activo }); }}>{p.activo ? "Activo" : "Inactivo"}</button>
                          <button className="icon-btn ms-auto" title="Editar" onClick={() => setPeForm(p)}><Pencil size={14} /></button>
                          <button className="icon-btn danger" title="Eliminar" onClick={() => eliminarPe(p)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {peForm && (
        <Modal open onClose={() => setPeForm(null)} title={peForm.id ? "Editar paquete" : "Asignar paquete a escuela"}
          footer={<><button className="btn btn-ghost" onClick={() => setPeForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardarPe}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="row g-3">
            <Field label="Nombre del paquete" required className="col-md-6"><input className="input" value={peForm.nombre} onChange={(e) => setPeForm({ ...peForm, nombre: e.target.value })} autoFocus /></Field>
            <Field label="Escuela" required className="col-md-6">
              <select className="select" value={peForm.escuelaId} onChange={(e) => setPeForm({ ...peForm, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Tipo de paquete" className="col-md-6">
              <select className="select" value={peForm.tipoPaqueteId} onChange={(e) => {
                const t = e.target.value;
                const base = PAQUETES[t];
                setPeForm({ ...peForm, tipoPaqueteId: t, precio: base ? base.precioBase : peForm.precio, articulos: base ? base.incluye.map((n) => ({ nombre: n, cantidad: 1 })) : peForm.articulos });
              }}>
                {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                <option value="personalizado">Personalizado</option>
              </select>
            </Field>
            <Field label="Precio negociado (USD)" className="col-md-6"><input type="number" className="input" value={peForm.precio} onChange={(e) => setPeForm({ ...peForm, precio: Number(e.target.value) || 0 })} /></Field>
            <Field label="Nota / acuerdo" className="col-12"><input className="input" value={peForm.nota} onChange={(e) => setPeForm({ ...peForm, nota: e.target.value })} /></Field>
          </div>
          <div className="card p-3 mt-3" style={{ background: "var(--card-bg-2)" }}>
            <SectionHead title="Artículos incluidos" />
            {peForm.articulos.map((a, i) => (
              <div key={i} className="d-flex align-items-center gap-2 py-1" style={{ fontSize: 13 }}>
                <input type="number" min={1} className="input" style={{ width: 70, height: 34 }} value={a.cantidad} onChange={(e) => setPeForm({ ...peForm, articulos: peForm.articulos.map((x, j) => (j === i ? { ...x, cantidad: Number(e.target.value) || 1 } : x)) })} />
                <span className="flex-grow-1">{a.nombre}</span>
                <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => setPeForm({ ...peForm, articulos: peForm.articulos.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </Modal>
      )}
      <span className="d-none"><ShieldCheck size={1} /><Globe size={1} /><Euro size={1} /></span>
    </div>
  );
}

/* ============ INTEGRACIONES (Supabase + historial de tasas) ============ */
export function Integraciones() {
  const { db, tasa, refreshTasa, tasaLoading, testCloud, syncToCloud, restoreFromCloud, syncInfo, syncing, setConfig, confirm, success, toast, deleteTasaHistorial, clearTasaHistorial } = useApp();
  const nowInt = useNow(1000);
  const [url, setUrl] = useState(db.config.supabaseUrl);
  const [key, setKey] = useState(db.config.supabaseKey);
  const [verKey, setVerKey] = useState(false);
  const [pingState, setPingState] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [pingInfo, setPingInfo] = useState<{ tablas: number; filas: number } | null>(null);
  const [verSql, setVerSql] = useState(false);
  const [tablaEstado, setTablaEstado] = useState<Record<string, "busy" | "ok" | "err">>({});

  const guardarCreds = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Se guardarán la URL y la anon key de Supabase.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ supabaseUrl: url.trim(), supabaseKey: key.trim() });
    success();
  };
  const probar = async () => {
    if (!url.trim() || !key.trim()) { toast("Pega la URL del proyecto y la anon key", "warn"); return; }
    setPingState("busy");
    try {
      const info = await testCloud(url.trim(), key.trim());
      setPingInfo(info); setPingState("ok");
      toast(`Conectado: ${info.tablas} tablas · ${info.filas} filas en Supabase`, "ok");
    } catch (e: any) {
      setPingState("fail");
      toast(e.message || "No se pudo conectar", "err");
    }
  };
  const subir = async () => {
    const ok = await confirm({ title: "¿Subir la base de datos a Supabase?", message: "Se reemplazará el contenido de las 14 tablas con los datos del CRM.", confirmText: "Sí, Subir" });
    if (!ok) return;
    setTablaEstado({});
    const r = await syncToCloud((t, s) => setTablaEstado((v) => ({ ...v, [t]: s })));
    if (r) success("Base de datos subida a Supabase");
  };
  const bajar = async () => {
    const ok = await confirm({ title: "¿Restaurar desde Supabase?", message: "Los datos del CRM se reemplazarán por los de la nube.", confirmText: "Sí, Restaurar", danger: true });
    if (!ok) return;
    const r = await restoreFromCloud();
    if (r) success("Base de datos restaurada desde Supabase");
  };
  const exportarHist = () => {
    downloadFile(`historial-tasas-${todayISO()}.csv`, toCSV(["Fecha", "USD", "Euro", "Paralelo", "Fuente"], db.historialTasas.map((h) => [h.fecha, h.usd.toFixed(4), h.euro.toFixed(4), h.paralelo.toFixed(4), h.fuente])));
    toast("Historial exportado", "ok");
  };
  const borrarHist = async () => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: "Se vaciará todo el historial de tasas.", confirmText: "Eliminar", danger: true });
    if (!ok) return;
    clearTasaHistorial();
    toast("Historial vaciado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Sistema</div>
          <h1>Integraciones</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Base de datos en Supabase y tasa del día con historial diario</p>
        </div>
        <button className="btn btn-ghost" onClick={() => void refreshTasa()} disabled={tasaLoading}><RefreshCw size={15} className={tasaLoading ? "spin" : ""} /> Actualizar tasa</button>
      </div>

      {/* ============ BASE DE DATOS EN SUPABASE (organizada en pasos) ============ */}

      {/* Encabezado con estado de conexión */}
      <div className="card overflow-hidden mb-4">
        <div className="p-4 d-flex align-items-center gap-3 flex-wrap" style={{ background: "linear-gradient(135deg, var(--jyg-navy), #0a2a4d)", color: "#fff" }}>
          <span className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 46, height: 46, background: "rgba(255,217,112,0.18)", color: "#ffd970" }}><Cloud size={23} /></span>
          <div className="flex-grow-1" style={{ minWidth: 200 }}>
            <h3 className="font-display fw-bold m-0" style={{ fontSize: 17, color: "#fff" }}>Base de datos en Supabase</h3>
            <p style={{ fontSize: 12, margin: "2px 0 0", color: "rgba(255,255,255,0.72)" }}>Una tabla por módulo · PostgreSQL en la nube · respaldo en línea del CRM</p>
          </div>
          <span className={`sb-status ${db.config.supabaseUrl ? (pingState === "ok" ? "ok" : "warn") : "off"}`}>
            <span className={`rounded-circle ${db.config.supabaseUrl ? "pulse-dot" : ""}`} style={{ width: 8, height: 8, background: db.config.supabaseUrl ? "var(--ok)" : "var(--ink-faint)" }} />
            {db.config.supabaseUrl ? (pingState === "ok" ? "Conectada" : "Configurada") : "Sin configurar"}
          </span>
        </div>

        {/* Resumen rápido: 3 hitos */}
        <div className="row g-3 p-4" style={{ background: "var(--card-bg-2)" }}>
          {[
            { n: "1", t: "Conectar", d: "URL + anon key", done: !!db.config.supabaseUrl, ic: <Plug size={15} /> },
            { n: "2", t: "Crear esquema", d: `${DB_TABLES.length} tablas SQL`, done: pingState === "ok", ic: <Database size={15} /> },
            { n: "3", t: "Sincronizar", d: "Subir / restaurar", done: !!syncInfo?.ok, ic: <UploadCloud size={15} /> },
          ].map((s) => (
            <div key={s.n} className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: "var(--card-bg)", border: "1px solid var(--line-soft)" }}>
                <span className={`sb-step-num ${s.done ? "done" : ""}`}>{s.done ? <Check size={15} /> : s.ic}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="sb-step-title" style={{ fontSize: 13.5 }}>Paso {s.n} · {s.t}</div>
                  <div className="sb-step-desc">{s.d}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row g-4">
        {/* PASO 1 · Conexión */}
        <div className="col-12 col-lg-5">
          <div className="card sb-step p-4 h-100">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className={`sb-step-num ${db.config.supabaseUrl ? "done" : ""}`}>{db.config.supabaseUrl ? <Check size={15} /> : "1"}</span>
              <div>
                <div className="sb-step-title">Conectar el proyecto</div>
                <div className="sb-step-desc">Pega la URL y la anon key de Supabase.</div>
              </div>
            </div>
            <Field label="URL del proyecto" hint="https://xxxx.supabase.co">
              <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <Field label="Anon key" className="mt-3">
              <div className="d-flex gap-1">
                <input type={verKey ? "text" : "password"} className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} value={key} onChange={(e) => setKey(e.target.value)} />
                <button className="icon-btn" onClick={() => setVerKey(!verKey)} title={verKey ? "Ocultar" : "Mostrar"}>{verKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <button className="btn btn-primary btn-sm" onClick={guardarCreds}><Check size={14} /> Guardar credenciales</button>
              <button className="btn btn-ghost btn-sm" onClick={probar} disabled={pingState === "busy"}>
                <Plug size={14} className={pingState === "busy" ? "spin" : ""} />
                {pingState === "busy" ? "Probando…" : pingState === "ok" ? "Conectada ✓" : pingState === "fail" ? "Reintentar" : "Probar conexión"}
              </button>
            </div>
            {pingInfo && pingState === "ok" && <p className="mt-2 mb-0" style={{ fontSize: 12, color: "var(--ok)" }}>{pingInfo.tablas} tablas accesibles · {pingInfo.filas} filas en la nube</p>}
            <p className="mt-3 mb-0 p-3 rounded-3" style={{ fontSize: 12, color: "var(--ink-soft)", background: "var(--card-bg-2)" }}>
              Encuentra estos datos en Supabase → <b>Settings → API</b> (Project URL y anon public key). La clave es un secreto: nunca la subas al código.
            </p>
          </div>
        </div>

        {/* PASO 2 · Esquema SQL */}
        <div className="col-12 col-lg-7">
          <div className="card sb-step p-4 h-100">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className={`sb-step-num ${pingState === "ok" ? "done" : ""}`}>{pingState === "ok" ? <Check size={15} /> : "2"}</span>
              <div className="flex-grow-1">
                <div className="sb-step-title">Crear el esquema SQL</div>
                <div className="sb-step-desc">Ejecuta este SQL en Supabase → SQL Editor para crear las {DB_TABLES.length} tablas.</div>
              </div>
              <button className="btn btn-gold btn-sm" onClick={() => setVerSql(!verSql)}><Database size={13} /> {verSql ? "Ocultar" : "Ver SQL"}</button>
            </div>

            {verSql && (
              <div className="position-relative rounded-3 overflow-hidden mb-3" style={{ background: "#0b1626", border: "1px solid #1d3350" }}>
                <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ background: "#0e1d33" }}>
                  <span className="d-flex align-items-center gap-2 font-display fw-semibold" style={{ fontSize: 11, color: "#7fa3cf" }}><Database size={13} /> esquema.sql · una tabla por módulo</span>
                  <button className="btn btn-xs" style={{ background: "rgba(255,217,112,0.15)", color: "#ffd970", border: "1px solid rgba(255,217,112,0.4)" }} onClick={() => { navigator.clipboard?.writeText(SUPABASE_SQL).then(() => toast("SQL copiado", "ok")).catch(() => undefined); }}><Copy size={12} /> Copiar</button>
                </div>
                <pre className="m-0 p-3 overflow-auto" style={{ color: "#a8c6e8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, maxHeight: 220 }}>{SUPABASE_SQL}</pre>
              </div>
            )}

            <div className="font-display fw-semibold text-uppercase mb-2" style={{ fontSize: 11, letterSpacing: 1, color: "var(--ink-faint)" }}>Mapa de tablas</div>
            <div className="row g-2">
              {DB_TABLES.map((t) => {
                const st = tablaEstado[t.tabla];
                const bg = st === "ok" ? "var(--tint-ok)" : st === "err" ? "var(--tint-danger)" : st === "busy" ? "var(--tint-warn)" : "var(--card-bg-2)";
                return (
                  <div key={t.tabla} className="col-6 col-sm-4">
                    <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: bg, fontSize: 11.5, transition: "background .3s" }}>
                      <Database size={12} style={{ color: "var(--jyg-navy)", flexShrink: 0 }} />
                      <span className="flex-grow-1 text-truncate fw-semibold">{t.label}</span>
                      {st === "busy" && <RefreshCw size={11} className="spin" />}
                      {st === "ok" && <Check size={12} style={{ color: "var(--ok)" }} />}
                      {st === "err" && <AlertTriangle size={12} style={{ color: "var(--danger)" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PASO 3 · Sincronización */}
      <div className="card sb-step p-4 mt-4">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-5">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className={`sb-step-num ${syncInfo?.ok ? "done" : ""}`}>{syncInfo?.ok ? <Check size={15} /> : "3"}</span>
              <div>
                <div className="sb-step-title">Sincronizar datos</div>
                <div className="sb-step-desc">Sube el CRM a la nube o restáuralo desde ella.</div>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-primary btn-sm" onClick={subir} disabled={syncing || !db.config.supabaseUrl}><UploadCloud size={14} /> {syncing ? "Subiendo…" : "Subir base completa"}</button>
              <button className="btn btn-ghost btn-sm" onClick={bajar} disabled={syncing || !db.config.supabaseUrl}><Download size={14} /> Restaurar desde la nube</button>
            </div>
            <div className="mt-3 p-3 rounded-3 d-flex align-items-start gap-2" style={{ fontSize: 12, background: syncInfo ? (syncInfo.ok ? "var(--tint-ok)" : "var(--tint-danger)") : "var(--card-bg-2)", color: syncInfo ? (syncInfo.ok ? "var(--ok)" : "var(--danger)") : "var(--ink-faint)" }}>
              <Cloud size={14} className="mt-1 flex-shrink-0" />
              <span>
                {syncInfo ? <><b>{syncInfo.msg}</b><br /><span className="tabular-nums" style={{ opacity: 0.75 }}>{fmtFechaHoraViva(syncInfo.last, nowInt)} · {fmtHaceSegundos(syncInfo.last, nowInt)}</span></> : "Aún no hay sincronizaciones. El CRM guarda todo en este navegador; la nube es tu respaldo en línea."}
              </span>
            </div>
          </div>
          <div className="col-12 col-lg-7">
            <div className="p-3 rounded-3 h-100" style={{ background: "var(--card-bg-2)", fontSize: 12.5, color: "var(--ink-soft)" }}>
              <b className="font-display" style={{ color: "var(--ink)" }}>¿Y cuando JyG crezca?</b>
              <p className="mt-1 mb-0">Supabase soporta multi-sucursal, reportes SQL y una app propia. Como el CRM exporta/importa JSON, migrar de un dispositivo a otro —o a un plan superior— es directo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de tasas */}
      <div className="card p-4">
        <SectionHead title="Historial diario de tasas" desc="Registro automático de la tasa del día" actions={
          <div className="d-flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={exportarHist}><Download size={14} /> CSV</button>
            <button className="btn btn-danger btn-sm" onClick={borrarHist}><Trash2 size={14} /> Vaciar</button>
          </div>
        } />
        <div className="table-responsive" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>USD (Bs)</th><th>Euro (Bs)</th><th>Paralelo</th><th>Fuente</th><th></th></tr></thead>
            <tbody>
              {[...db.historialTasas].reverse().map((h) => (
                <tr key={h.id}>
                  <td className="font-display fw-semibold" style={{ fontSize: 12.5 }}><History size={12} className="me-1" style={{ color: "var(--ink-faint)" }} />{fmtFecha(h.fecha)}</td>
                  <td className="tabular-nums fw-bold" style={{ color: "var(--jyg-navy)" }}>{fmtBs(h.usd)}</td>
                  <td className="tabular-nums" style={{ fontSize: 12.5 }}>{fmtBs(h.euro)}</td>
                  <td className="tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{h.paralelo ? fmtBs(h.paralelo) : "—"}</td>
                  <td><Badge tone={h.fuente === "dolarapi" ? "blue" : "amber"}>{h.fuente}</Badge></td>
                  <td><button className="icon-btn danger" style={{ width: 30, height: 30 }} title="Eliminar" onClick={() => deleteTasaHistorial(h.id)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 mb-0 d-flex align-items-center gap-1" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          <Clock size={12} /> Tasa actual: <b className="tabular-nums">{fmtBs(tasa.usd)}</b> · Euro <b className="tabular-nums">{fmtBs(tasa.eur)}</b> · {fmtHaceSegundos(tasa.updated, nowInt)}
        </p>
      </div>
      <span className="d-none"><KeyRound size={1} /><Globe size={1} /></span>
    </div>
  );
}
