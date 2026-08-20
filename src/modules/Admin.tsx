import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Check, Clock, Cloud, Copy, Database, Download, DownloadCloud, Euro, Eye, EyeOff,
  Globe, History, KeyRound, Package, Pencil, Plug, Plus, RefreshCw, ScanLine, School, ShieldCheck,
  Smartphone, Terminal, Trash2, Upload, UploadCloud, UserCog,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { PaqueteEscuela, Rol, Usuario } from "../lib/data";
import {
  API_DOLARES, SUPABASE_SQL, API_EUROS, DB_TABLES, OCR_CRED, PAQUETES, downloadFile, fmtBs, fmtFecha,
  fmtFechaHoraViva, fmtHaceSegundos, fmtHoraAgo, toCSV, todayISO, uid,
} from "../lib/data";
import { Badge, Field, Modal, SectionHead, useNow } from "../components/ui";

/* ================= USUARIOS ================= */

const ROL_LABEL: Record<Rol, string> = { admin: "Administrador", operador: "Operador", produccion: "Producción", cobranza: "Cobranza" };
const ROL_DESC: Record<Rol, string> = {
  admin: "Control total del sistema",
  operador: "Registra estudiantes y pagos",
  produccion: "Visualiza materiales y pedidos",
  cobranza: "Gestiona pagos y saldos",
};
const usuarioVacio = (): Usuario => ({ id: "", nombre: "", usuario: "", rol: "operador", activo: true });

export function Usuarios() {
  const { db, saveUsuario, deleteUsuario, confirm, success, toast } = useApp();
  const [form, setForm] = useState<Usuario | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "Nombre obligatorio";
    if (!form.usuario.trim()) er.usuario = "Usuario obligatorio";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveUsuario({ ...form, id: form.id || uid() });
    success();
    setForm(null);
  };

  const eliminar = async (u: Usuario) => {
    if (u.id === db.currentUserId) { toast("No puedes eliminar el usuario activo", "err"); return; }
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará al usuario "${u.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteUsuario(u.id);
    toast("Registro eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Usuarios</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Roles y permisos del equipo JyG</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(usuarioVacio()); }}><Plus size={16} /> Nuevo usuario</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {(Object.keys(ROL_LABEL) as Rol[]).map((r, i) => (
          <div key={r} className="card p-4 reveal" style={{ animationDelay: `${i * 60}ms`, borderTop: "4px solid var(--blue)" }}>
            <div className="font-display font-bold text-[14.5px]">{ROL_LABEL[r]}</div>
            <div className="text-[11.5px] mb-2" style={{ color: "var(--ink-faint)" }}>{ROL_DESC[r]}</div>
            <Badge tone="blue" dot>{db.usuarios.filter((u) => u.rol === r).length} usuario(s)</Badge>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Login</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {db.usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-[12px]" style={{ background: "linear-gradient(150deg, var(--gold), var(--gold-deep))", color: "#3b2c00" }}>
                        {u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div className="font-display font-semibold text-[13.5px]">{u.nombre}{u.id === db.currentUserId && <Badge tone="green">Tú</Badge>}</div>
                    </div>
                  </td>
                  <td className="text-[13px]" style={{ color: "var(--ink-soft)" }}>@{u.usuario}</td>
                  <td><Badge tone={u.rol === "admin" ? "gold" : "blue"}>{ROL_LABEL[u.rol]}</Badge></td>
                  <td><Badge tone={u.activo ? "green" : "red"} dot>{u.activo ? "Activo" : "Inactivo"}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="icon-btn" onClick={() => { setErrs({}); setForm(u); }}><Pencil size={15} /></button>
                      <button className="icon-btn danger" onClick={() => eliminar(u)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar usuario" : "Nuevo usuario"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" required error={errs.nombre} className="col-span-2">
              <input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
            </Field>
            <Field label="Usuario (login)" required error={errs.usuario}>
              <input className={`input ${errs.usuario ? "err" : ""}`} value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
            </Field>
            <Field label="Rol">
              <select className="select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
                {(Object.keys(ROL_LABEL) as Rol[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label="Estado" className="col-span-2">
              <select className="select" value={form.activo ? "1" : "0"} onChange={(e) => setForm({ ...form, activo: e.target.value === "1" })}>
                <option value="1">Activo</option><option value="0">Inactivo</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= CONFIGURACIÓN ================= */

export function Configuracion() {
  const { db, setConfig, confirm, success, toast, tasa, refreshTasa, setRoute, aplicarTasaManual, setOcrOpen, savePaqueteEscuela, deletePaqueteEscuela } = useApp();
  const nowCfg = useNow(1000);
  const [emp, setEmp] = useState({ ...db.config.empresa });
  const [fallback, setFallback] = useState(String(db.config.tasaManualUSD || db.config.tasaFallback));
  const [nuevoMetodo, setNuevoMetodo] = useState("");
  const [nuevoEsBs, setNuevoEsBs] = useState(false);
  const [verClaveOcr, setVerClaveOcr] = useState(false);
  const [editPaq, setEditPaq] = useState<PaqueteEscuela | null>(null);

  /* ---- Paquetes por escuela ---- */
  const TIPOS_PAQUETE = [
    ...Object.values(PAQUETES).map((p) => ({ id: p.id, nombre: p.nombre, color: p.color })),
    { id: "personalizado", nombre: "Personalizado", color: "var(--slate)" },
  ];

  const nuevoPaquete = (escuelaId = ""): PaqueteEscuela => ({
    id: "", escuelaId, nombre: "", tipoPaqueteId: "premium", precio: 40,
    articulos: [], nota: "", activo: true, creado: todayISO(),
  });

  const guardarPaquete = async () => {
    if (!editPaq) return;
    if (!editPaq.nombre.trim()) { toast("Escribe el nombre del paquete", "err"); return; }
    if (!editPaq.escuelaId) { toast("Selecciona la escuela", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    savePaqueteEscuela({ ...editPaq, id: editPaq.id || uid() });
    success("Paquete asignado correctamente");
    setEditPaq(null);
  };

  const eliminarPaquete = async (p: PaqueteEscuela) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará el paquete "${p.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePaqueteEscuela(p.id);
    toast("Paquete eliminado", "warn");
  };

  const cambiarArticulos = (i: number, campo: "nombre" | "cantidad", valor: string) => {
    if (!editPaq) return;
    const arts = [...editPaq.articulos];
    arts[i] = { ...arts[i], [campo]: campo === "cantidad" ? Number(valor) || 1 : valor };
    setEditPaq({ ...editPaq, articulos: arts });
  };

  const desdeTipo = (tipoId: string) => {
    const p = PAQUETES[tipoId];
    if (!p || !editPaq) return;
    setEditPaq({
      ...editPaq,
      articulos: p.incluye.map((nombre) => ({ nombre, cantidad: 1 })),
      precio: editPaq.precio || p.precioBase,
    });
  };

  /* Agrupar paquetes por escuela */
  const paquetesPorEscuela = db.escuelas.map((e) => ({
    escuela: e,
    paquetes: db.paquetesEscuelas.filter((p) => p.escuelaId === e.id),
  })).filter((g) => g.paquetes.length > 0 || db.escuelas.length > 0);

  const copiar = (texto: string, que: string) => {
    navigator.clipboard?.writeText(texto).then(() => toast(`${que} copiado al portapapeles`, "ok")).catch(() => toast("No se pudo copiar", "err"));
  };

  const guardarEmpresa = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ empresa: emp });
    success();
  };

  const guardarTasa = async () => {
    const n = Number(fallback);
    if (!n || n <= 0) { toast("Tasa inválida", "err"); return; }
    const eur = db.config.tasaManualEUR || +(n * 1.1).toFixed(2);
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `La tasa manual ${fmtBs(n)} por $1 se usará para convertir pagos en bolívares y quedará en el historial diario.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    aplicarTasaManual(n, eur);
    success();
  };

  const toggleApi = async () => {
    const irApi = db.config.usarTasaManual || !db.config.usarApi;
    setConfig({ usarApi: irApi, usarTasaManual: false });
    if (irApi) { toast("Consultando ve.dolarapi.com…", "ok"); refreshTasa(); }
    else toast("Usando tasa manual", "warn");
  };

  const agregarMetodo = async () => {
    if (!nuevoMetodo.trim()) { toast("Escribe el nombre del método", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ metodos: [...db.config.metodos, { id: uid(), nombre: nuevoMetodo, bs: nuevoEsBs, activo: true }] });
    success();
    setNuevoMetodo(""); setNuevoEsBs(false);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Configuración</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Datos de la empresa, tasa del día y métodos de pago</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Empresa */}
        <div className="card p-5">
          <SectionHead title="Datos de la empresa" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" className="col-span-2"><input className="input" value={emp.nombre} onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} /></Field>
            <Field label="RIF"><input className="input" value={emp.rif} onChange={(e) => setEmp({ ...emp, rif: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={emp.telefono} onChange={(e) => setEmp({ ...emp, telefono: e.target.value })} /></Field>
            <Field label="Dirección" className="col-span-2"><input className="input" value={emp.direccion} onChange={(e) => setEmp({ ...emp, direccion: e.target.value })} /></Field>
          </div>
          <button className="btn btn-primary mt-4" onClick={guardarEmpresa}><Check size={15} /> Sí, Guardar</button>
        </div>

        {/* Tasa */}
        <div className="card p-5">
          <SectionHead title="Tasa del día" desc="Se aplica a todos los abonos en bolívares" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3.5 rounded-xl" style={{ background: "var(--blue-tint-2)" }}>
              <div className="text-[10.5px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--blue)" }}>Dólar oficial</div>
              <div className="font-display font-bold text-[20px]" style={{ color: "var(--blue)" }}>{fmtBs(tasa.usd)} <span className="text-[12px] font-semibold">/ $1</span></div>
            </div>
            <div className="p-3.5 rounded-xl" style={{ background: "var(--gold-tint)" }}>
              <div className="text-[10.5px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--gold-deep)" }}>Euro oficial</div>
              <div className="font-display font-bold text-[20px]" style={{ color: "var(--gold-deep)" }}>{tasa.eur > 0 ? `${fmtBs(tasa.eur)} / €1` : "—"}</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: "var(--surface-2)" }}>
            <Badge tone={tasa.source === "api" ? "green" : "amber"} dot>
              {tasa.source === "api" ? "API ve.dolarapi.com activa" : db.config.usarTasaManual ? "Tasa manual activa" : "Tasa de respaldo"}
            </Badge>
            <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>Actualizada {fmtFechaHoraViva(tasa.updated, nowCfg)} · {fmtHaceSegundos(tasa.updated, nowCfg)}</span>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <Field label="Tasa manual (Bs por $1)"><input type="number" min={0} step="0.01" className="input" style={{ width: 160 }} value={fallback} onChange={(e) => setFallback(e.target.value)} /></Field>
            <button className="btn btn-primary" onClick={guardarTasa}>Guardar tasa manual</button>
            <button className="btn btn-soft" onClick={toggleApi}>{db.config.usarTasaManual || !db.config.usarApi ? "Usar API" : "Pausar API"}</button>
          </div>
          <button className="btn btn-ghost btn-sm mt-3" onClick={() => setRoute("integraciones")}><History size={13} /> Ver historial diario de tasas</button>
        </div>

        {/* Cuenta de servicio OCR */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><ScanLine size={21} /></div>
            <Badge tone="green" dot>Cuenta conectada</Badge>
          </div>
          <SectionHead title="Cuenta de servicio OCR" desc="Credenciales de Google Cloud Vision que usa el escáner — visibles solo aquí" />
          <div className="flex flex-col gap-2 text-[12.5px]">
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <ShieldCheck size={14} style={{ color: "var(--green)" }} />
              <span className="truncate flex-1 font-semibold">{OCR_CRED.email}</span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Copiar correo" onClick={() => copiar(OCR_CRED.email, "Correo")}><Copy size={13} /></button>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <Database size={14} style={{ color: "var(--blue)" }} />
              <span className="truncate flex-1">ID único: <b className="font-display">{OCR_CRED.id}</b></span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Copiar ID" onClick={() => copiar(OCR_CRED.id, "ID único")}><Copy size={13} /></button>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <KeyRound size={14} style={{ color: "var(--gold-deep)" }} />
              <span className="truncate flex-1 font-display tracking-wide">{verClaveOcr ? OCR_CRED.clave : "••••••••••••••••••••••••"}</span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title={verClaveOcr ? "Ocultar clave" : "Mostrar clave"} onClick={() => setVerClaveOcr((v) => !v)}>{verClaveOcr ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Copiar clave" onClick={() => copiar(OCR_CRED.clave, "CLAVE")}><Copy size={13} /></button>
            </div>
          </div>
          <p className="text-[11.5px] mt-3 mb-3" style={{ color: "var(--ink-faint)" }}>
            La CLAVE queda oculta en el escáner y en el resto del sistema por seguridad.
          </p>
          <button className="btn btn-gold btn-sm" onClick={() => setOcrOpen(true)}><ScanLine size={14} /> Abrir escáner OCR</button>
        </div>

        {/* Métodos de pago */}
        <div className="card p-5">
          <SectionHead title="Métodos de pago" desc="Configurables — marca si el método es en bolívares" />
          <div className="flex flex-col gap-2 mb-4">
            {db.config.metodos.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <span className="font-display font-semibold text-[13.5px] flex-1">{m.nombre}</span>
                <Badge tone={m.bs ? "amber" : "green"}>{m.bs ? "Bs (usa tasa)" : "USD"}</Badge>
                <button className="btn btn-xs" style={{ background: m.activo ? "var(--green-tint)" : "var(--red-tint)", color: m.activo ? "var(--green)" : "var(--red)" }}
                  onClick={() => setConfig({ metodos: db.config.metodos.map((x) => (x.id === m.id ? { ...x, activo: !x.activo } : x)) })}>
                  {m.activo ? "Activo" : "Inactivo"}
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Nuevo método (ej: Binance)" value={nuevoMetodo} onChange={(e) => setNuevoMetodo(e.target.value)} />
            <label className="flex items-center gap-2 text-[12.5px] font-semibold cursor-pointer" style={{ color: "var(--ink-soft)" }}>
              <input type="checkbox" checked={nuevoEsBs} onChange={(e) => setNuevoEsBs(e.target.checked)} /> En Bs
            </label>
            <button className="btn btn-primary" onClick={agregarMetodo}><Plus size={15} /> Agregar</button>
          </div>
        </div>

        {/* Respaldo */}
        <div className="card p-5">
          <SectionHead title="Respaldo de datos" desc="Exporta o importa toda la base del CRM en JSON" actions={<Database size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-soft" onClick={() => { downloadFile(`respaldo-jyg-${todayISO()}.json`, useAppExport(db), "application/json"); toast("Respaldo descargado", "ok"); }}><Download size={15} /> Exportar respaldo</button>
            <ImportBtn />
          </div>
          <p className="text-[12px] mt-3 mb-0" style={{ color: "var(--ink-faint)" }}>
            Incluye escuelas, docentes, estudiantes, pagos, cotizaciones, historial de tasas y configuración.
          </p>
        </div>
      </div>

      {/* ============ PAQUETES POR ESCUELA ============ */}
      <div className="card mt-6 overflow-hidden reveal">
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: "linear-gradient(135deg, var(--gold-deep), #8a6200)", color: "#fff" }}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}><Package size={22} /></span>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-display font-bold text-[17px] m-0">Paquetes por Escuela</h3>
            <p className="text-[12px] m-0" style={{ color: "rgba(255,255,255,0.78)" }}>Asigna paquetes negociados con nombre propio, tipo y artículos editables a cada escuela</p>
          </div>
          <button className="btn" style={{ background: "#fff", color: "var(--gold-deep)" }} onClick={() => setEditPaq(nuevoPaquete())}><Plus size={15} /> Asignar paquete</button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {paquetesPorEscuela.map(({ escuela, paquetes }) => (
            <div key={escuela.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-soft)" }}>
              <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: "var(--surface-2)" }}>
                <School size={16} style={{ color: "var(--blue)" }} />
                <span className="font-display font-semibold text-[13.5px] flex-1">{escuela.nombre}</span>
                <Badge tone={paquetes.length ? "gold" : "slate"}>{paquetes.length} {paquetes.length === 1 ? "paquete" : "paquetes"}</Badge>
                <button className="btn btn-xs btn-soft" onClick={() => setEditPaq(nuevoPaquete(escuela.id))}><Plus size={12} /> Agregar</button>
              </div>

              {paquetes.length === 0 ? (
                <p className="px-4 py-3 text-[12.5px] m-0" style={{ color: "var(--ink-faint)" }}>Aún no hay paquetes asignados a esta escuela.</p>
              ) : (
                <div className="flex flex-col">
                  {paquetes.map((p, idx) => {
                    const tipo = TIPOS_PAQUETE.find((t) => t.id === p.tipoPaqueteId) || TIPOS_PAQUETE[TIPOS_PAQUETE.length - 1];
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3 flex-wrap transition-colors hover:bg-[var(--surface-2)]" style={{ borderTop: idx > 0 ? "1px solid var(--border-soft)" : "none" }}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tipo.color, opacity: p.activo ? 1 : 0.3 }} />
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-display font-semibold text-[14px]" style={{ color: p.activo ? "var(--ink)" : "var(--ink-faint)" }}>{p.nombre}</div>
                          <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-faint)" }}>
                            {p.articulos.length} artículos · {p.nota ? `“${p.nota}”` : "sin nota"}
                          </div>
                        </div>
                        <Badge tone="blue">{tipo.nombre}</Badge>
                        <span className="font-display font-bold text-[15px]" style={{ color: "var(--green)" }}>${p.precio}</span>
                        <button className="btn btn-xs" style={{ background: p.activo ? "var(--green-tint)" : "var(--red-tint)", color: p.activo ? "var(--green)" : "var(--red)" }}
                          onClick={() => savePaqueteEscuela({ ...p, activo: !p.activo })}>
                          {p.activo ? "Activo" : "Inactivo"}
                        </button>
                        <div className="flex gap-1">
                          <button className="icon-btn" title="Editar" onClick={() => setEditPaq({ ...p, articulos: [...p.articulos] })}><Pencil size={14} /></button>
                          <button className="icon-btn danger" title="Eliminar" onClick={() => eliminarPaquete(p)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {db.escuelas.length === 0 && (
            <p className="text-center text-[13px] py-4 m-0" style={{ color: "var(--ink-faint)" }}>Registra escuelas para poder asignarles paquetes.</p>
          )}
        </div>
      </div>

      {/* Modal editor de paquete */}
      {editPaq && (
        <Modal open onClose={() => setEditPaq(null)} size="lg" title={editPaq.id ? "Editar paquete" : "Asignar paquete a escuela"}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditPaq(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardarPaquete}><Check size={15} /> Sí, Guardar</button>
          </>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre del paquete" required>
              <input className="input" placeholder="Ej: Paquete VIP San Agustín" value={editPaq.nombre} onChange={(e) => setEditPaq({ ...editPaq, nombre: e.target.value })} />
            </Field>
            <Field label="Escuela" required>
              <select className="select" value={editPaq.escuelaId} onChange={(e) => setEditPaq({ ...editPaq, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Tipo de paquete" hint="Al elegir un tipo se cargan sus artículos base">
              <select className="select" value={editPaq.tipoPaqueteId} onChange={(e) => { setEditPaq({ ...editPaq, tipoPaqueteId: e.target.value }); desdeTipo(e.target.value); }}>
                {TIPOS_PAQUETE.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Field>
            <Field label="Precio negociado (USD)">
              <input type="number" min={0} step="0.5" className="input" value={editPaq.precio} onChange={(e) => setEditPaq({ ...editPaq, precio: Number(e.target.value) || 0 })} />
            </Field>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-semibold text-[13px]">Artículos incluidos ({editPaq.articulos.length})</span>
              <button className="btn btn-xs btn-soft" onClick={() => setEditPaq({ ...editPaq, articulos: [...editPaq.articulos, { nombre: "", cantidad: 1 }] })}><Plus size={12} /> Agregar artículo</button>
            </div>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {editPaq.articulos.length === 0 && <p className="text-[12.5px] m-0" style={{ color: "var(--ink-faint)" }}>Sin artículos. Agrega uno o elige un tipo de paquete arriba.</p>}
              {editPaq.articulos.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="input" style={{ flex: 1 }} placeholder="Nombre del artículo" value={a.nombre} onChange={(e) => cambiarArticulos(i, "nombre", e.target.value)} />
                  <input type="number" min={1} className="input" style={{ width: 76 }} value={a.cantidad} onChange={(e) => cambiarArticulos(i, "cantidad", e.target.value)} />
                  <button className="icon-btn danger" title="Quitar" onClick={() => setEditPaq({ ...editPaq, articulos: editPaq.articulos.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Nota / acuerdo" className="mt-4">
            <textarea className="textarea" placeholder="Ej: Acuerdo con la directiva 2025-2026" value={editPaq.nota} onChange={(e) => setEditPaq({ ...editPaq, nota: e.target.value })} />
          </Field>
        </Modal>
      )}

      <span className="hidden"><RefreshCw size={1} /></span>
    </div>
  );
}

const useAppExport = (db: any) => JSON.stringify(db, null, 2);

function ImportBtn() {
  const { importBackup, toast, success } = useApp();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept=".json" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const txt = await f.text();
        if (importBackup(txt)) { success("Respaldo importado"); } else toast("El archivo no es un respaldo válido", "err");
        e.target.value = "";
      }} />
      <button className="btn btn-ghost" onClick={() => ref.current?.click()}><Upload size={15} /> Importar respaldo</button>
    </>
  );
}

/* ================= INTEGRACIONES ================= */

export function Integraciones() {
  const { db, tasa, refreshTasa, tasaLoading, aplicarTasaManual, deleteTasaHistorial, clearTasaHistorial, confirm, success, toast, setConfig, setOcrOpen, syncInfo, syncing, testCloud, syncToCloud, restoreFromCloud } = useApp();
  const nowInt = useNow(1000);
  const [sbUrl, setSbUrl] = useState(db.config.supabaseUrl);
  const [sbKey, setSbKey] = useState(db.config.supabaseKey);
  const [verKey, setVerKey] = useState(false);
  const [pingState, setPingState] = useState<"idle" | "ok" | "fail" | "busy">("idle");
  const [pingInfo, setPingInfo] = useState<{ tablas: number; filas: number } | null>(null);
  const [verCodigo, setVerCodigo] = useState(false);
  const [prog, setProg] = useState<Record<string, "idle" | "busy" | "ok" | "err">>({});

  /* Cantidad de filas locales por tabla (para el mapa) */
  const filasLocales = useMemo(() => {
    const d = db as any;
    return {
      escuelas: d.escuelas.length, docentes: d.docentes.length, estudiantes: d.estudiantes.length,
      pagos: d.estudiantes.reduce((s: number, e: any) => s + e.pagos.length, 0),
      adicionales_items: d.estudiantes.reduce((s: number, e: any) => s + e.adicionales.length, 0),
      cotizaciones: d.cotizaciones.length,
      cotizacion_items: d.cotizaciones.reduce((s: number, c: any) => s + c.adicionales.length, 0),
      sesiones: d.sesiones.length, eventos: d.eventos.length, mensajes: d.mensajes.length,
      usuarios: d.usuarios.length, historial_tasas: d.historialTasas.length, configuracion: 1,
    } as Record<string, number>;
  }, [db]);

  const guardarCredenciales = async () => {
    const u = sbUrl.trim(); const k = sbKey.trim();
    if (u && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(u)) {
      toast("La URL debe ser la de tu proyecto: https://xxxx.supabase.co", "err");
      return;
    }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: u ? "Se usarán estas credenciales para conectar con Supabase." : "Se desactivará la conexión con la base de datos.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ supabaseUrl: u, supabaseKey: k, autoSyncCloud: u && k ? db.config.autoSyncCloud : false });
    setPingState("idle");
    success();
  };

  const probar = async () => {
    const u = sbUrl.trim(); const k = sbKey.trim();
    if (!u || !k) { toast("Pega la URL del proyecto y la anon key", "warn"); return; }
    setPingState("busy");
    try {
      const info = await testCloud(u, k);
      setPingInfo(info);
      setPingState("ok");
      toast(`Conectado: ${info.tablas} tablas · ${info.filas} filas en Supabase`, "ok");
    } catch (e: any) {
      setPingState("fail");
      toast(e.message || "No se pudo conectar", "err");
    }
  };

  const subir = async () => {
    const okc = await confirm({ title: "¿Subir toda la base de datos?", message: "Las 13 tablas de Supabase se reemplazarán con los datos actuales del CRM.", confirmText: "Sí, Subir" });
    if (!okc) return;
    setProg(Object.fromEntries(DB_TABLES.map((t) => [t.tabla, "idle"])));
    const ok = await syncToCloud((tabla, estado) => setProg((p) => ({ ...p, [tabla]: estado })));
    if (ok) success("Base de datos subida a Supabase");
  };

  const bajar = async () => {
    const ok = await confirm({ title: "¿Restaurar desde Supabase?", message: "Los datos actuales de este navegador se reemplazarán por los de la base de datos.", confirmText: "Sí, Restaurar" });
    if (!ok) return;
    const r = await restoreFromCloud();
    if (r) success("Base de datos restaurada");
  };
  const [verClave, setVerClave] = useState(false);
  const [manualUsd, setManualUsd] = useState(String(db.config.tasaManualUSD));
  const [manualEur, setManualEur] = useState(String(db.config.tasaManualEUR));

  const testApi = async () => {
    toast("Probando conexión con ve.dolarapi.com…", "ok");
    refreshTasa();
    setTimeout(() => {
      toast(tasa.apiOk || tasa.usd > 0 ? `Conexión OK · tasa ${fmtBs(tasa.usd)}` : "Sin respuesta — usando respaldo", tasa.usd > 0 ? "ok" : "warn");
    }, 1800);
  };

  const guardarManual = async () => {
    const u = Number(manualUsd), e = Number(manualEur);
    if (!u || u <= 0) { toast("Tasa USD inválida", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Se activará la tasa manual ${fmtBs(u)} y se guardará en el historial de hoy.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    aplicarTasaManual(u, e > 0 ? e : +(u * 1.1).toFixed(2));
    success();
  };

  const activarApi = async () => {
    const ok = await confirm({ title: "¿Activar tasa automática?", message: "El CRM consultará ve.dolarapi.com/v1/dolares y /v1/euros al iniciar y cada 5 minutos, guardando un registro diario.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ usarApi: true, usarTasaManual: false });
    toast("Consultando ve.dolarapi.com…", "ok");
    refreshTasa();
    success();
  };

  const limpiarHistorial = async () => {
    const ok = await confirm({
      title: "¿Está seguro de eliminar este registro?",
      message: `Se borrará todo el historial diario (${db.historialTasas.length} registros).`,
      confirmText: "Eliminar", danger: true,
    });
    if (!ok) return;
    clearTasaHistorial();
    toast("Historial borrado", "warn");
  };

  const exportarHistorial = () => {
    if (db.historialTasas.length === 0) { toast("No hay registros para exportar", "warn"); return; }
    const rows = [...db.historialTasas].sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((h) => [h.fecha, h.usd.toFixed(2), h.euro.toFixed(2), h.paralelo ? h.paralelo.toFixed(2) : "—", h.fuente]);
    downloadFile(`historial-tasas-${todayISO()}.csv`, toCSV(["Fecha", "USD (Bs)", "EUR (Bs)", "Paralelo", "Fuente"], rows));
    toast("Historial exportado", "ok");
  };

  const historial = useMemo(() => [...db.historialTasas].sort((a, b) => a.fecha.localeCompare(b.fecha)), [db.historialTasas]);
  const ultimos14 = historial.slice(-14);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Integraciones</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Base de datos en <b>Supabase</b> · tasa del día vía ve.dolarapi.com · OCR con la IA de Google · WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={tasa.source === "api" ? "green" : tasa.source === "manual" ? "amber" : "slate"} dot>
            {tasa.source === "api" ? "API conectada" : tasa.source === "manual" ? "Tasa manual" : "Tasa de respaldo"}
          </Badge>
          <span className="text-[11.5px] tabular-nums" style={{ color: "var(--ink-faint)" }}>
            <Clock size={12} className="inline mr-1" style={{ verticalAlign: "-2px" }} />
            Sincronizada {fmtFechaHoraViva(tasa.updated, nowInt)} · {fmtHaceSegundos(tasa.updated, nowInt)}
          </span>
          <button className="btn btn-primary" onClick={testApi} disabled={tasaLoading}>
            <RefreshCw size={15} className={tasaLoading ? "spin" : ""} /> Actualizar tasa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Dólar */}
        <div className="card p-5 reveal">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><Globe size={21} /></div>
            <Badge tone={tasa.apiOk ? "green" : "amber"} dot>{tasa.apiOk ? "En línea" : tasa.source === "manual" ? "En pausa" : "Sin conexión"}</Badge>
          </div>
          <h3 className="font-display font-bold text-[16px] m-0">Dólar — ve.dolarapi.com/v1/dolares</h3>
          <p className="text-[12px] mt-0.5 mb-3" style={{ color: "var(--ink-faint)" }}>fetch('https://ve.dolarapi.com/v1/dolares')</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <div className="text-[10px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Compra</div>
              <div className="font-display font-bold text-[16px]">{tasa.compra ? fmtBs(tasa.compra) : "—"}</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <div className="text-[10px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Venta</div>
              <div className="font-display font-bold text-[16px]">{tasa.venta ? fmtBs(tasa.venta) : "—"}</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--blue-tint-2)" }}>
              <div className="text-[10px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--blue)" }}>Promedio (tasa del día)</div>
              <div className="font-display font-bold text-[18px]" style={{ color: "var(--blue)" }}>{fmtBs(tasa.usd)}</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <div className="text-[10px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Paralelo</div>
              <div className="font-display font-bold text-[16px]">{tasa.paralelo ? fmtBs(tasa.paralelo) : "—"}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11.5px] mt-3" style={{ color: "var(--ink-faint)" }}>
            <span className="flex items-center gap-1"><Clock size={12} /> {tasa.fechaApi ? fmtFecha(tasa.fechaApi.slice(0, 10)) + " · BCV" : "Sin datos de la API"}</span>
            <button className="btn btn-soft btn-xs" onClick={testApi} disabled={tasaLoading}><RefreshCw size={11} className={tasaLoading ? "spin" : ""} /> Probar</button>
          </div>
        </div>

        {/* Euro */}
        <div className="card p-5 reveal" style={{ animationDelay: "60ms" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--gold-tint)", color: "var(--gold-deep)" }}><Euro size={21} /></div>
            <Badge tone={tasa.apiOk && tasa.eur > 0 ? "green" : "amber"} dot>{tasa.apiOk && tasa.eur > 0 ? "En línea" : tasa.source === "manual" ? "En pausa" : "Sin conexión"}</Badge>
          </div>
          <h3 className="font-display font-bold text-[16px] m-0">Euro — ve.dolarapi.com/v1/euros</h3>
          <p className="text-[12px] mt-0.5 mb-3" style={{ color: "var(--ink-faint)" }}>fetch('https://ve.dolarapi.com/v1/euros')</p>
          <div className="p-4 rounded-xl mb-3" style={{ background: "var(--gold-tint)" }}>
            <div className="text-[10px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--gold-deep)" }}>Euro oficial (tasa del día)</div>
            <div className="font-display font-bold text-[22px]" style={{ color: "var(--gold-deep)" }}>{tasa.eur > 0 ? fmtBs(tasa.eur) : "—"}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-soft)" }}>Bs por €1 · referencia BCV</div>
          </div>
          <p className="text-[12px] m-0" style={{ color: "var(--ink-faint)" }}>
            Autorefresco cada 5 minutos · cada consulta del día se guarda en el historial diario con fecha y hora.
          </p>
        </div>
      </div>

      {/* ============ BASE DE DATOS — SUPABASE ============ */}
      <div className="card mb-6 overflow-hidden reveal">
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: "linear-gradient(135deg, #1c2b24, #123524 55%, #0e4028)", color: "#fff" }}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(62,207,142,0.16)" }}>
            <svg width="24" height="24" viewBox="0 0 109 113" fill="none" aria-hidden="true">
              <path d="M63.7 0 7.6 62.9c-2 2.2-.4 5.8 2.6 5.8h31l-5.7 42.9c-.4 3.2 3.6 5 5.7 2.6l56.5-63.5c2-2.2.4-5.8-2.6-5.8h-31L69.7 1.6c.4-3.1-3.6-4.9-6-1.6z" fill="#3ECF8E" />
            </svg>
          </span>
          <div className="flex-1 min-w-[230px]">
            <h3 className="font-display font-bold text-[17px] m-0">Base de datos · Supabase <span className="text-[12px] font-semibold" style={{ color: "#3ECF8E" }}>(PostgreSQL)</span></h3>
            <p className="text-[12px] m-0" style={{ color: "rgba(255,255,255,0.72)" }}>Cada módulo del CRM vive en su propia tabla · sincronización completa en la nube</p>
          </div>
          <span className="badge" style={{ background: "#3ECF8E", color: "#0b3d24" }}>⚡ BASE ACTIVA</span>
        </div>

        {/* Flujo de arquitectura */}
        <div className="px-5 pt-5 pb-2 flex items-center justify-center gap-2 flex-wrap">
          {[
            { t: "CRM JyG", s: "caché local en tu navegador", c: "var(--blue)" },
            { t: "Supabase", s: "PostgreSQL en la nube · REST API", c: "#3ECF8E" },
            { t: "13 tablas", s: "una por cada módulo del CRM", c: "var(--gold-deep)" },
          ].map((n, i) => (
            <React.Fragment key={n.t}>
              {i > 0 && (
                <span className="flex items-center font-display font-bold text-[15px]" style={{ color: "var(--ink-faint)" }}>
                  <span className="pulse-dot">⇄</span>
                </span>
              )}
              <span className="px-3.5 py-2 rounded-xl text-center transition-transform hover:scale-105" style={{ background: "var(--surface-2)", border: `1.5px solid ${n.c}` }}>
                <span className="block font-display font-bold text-[12.5px]" style={{ color: n.c }}>{n.t}</span>
                <span className="block text-[10px]" style={{ color: "var(--ink-faint)" }}>{n.s}</span>
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
          {/* Consola de conexión */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-display font-semibold text-[13px] uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Conexión</span>
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: db.config.supabaseUrl && db.config.supabaseKey ? "#16a36a" : "var(--ink-faint)" }}>
                <span className={`w-2 h-2 rounded-full ${db.config.supabaseUrl && db.config.supabaseKey ? "pulse-dot" : ""}`} style={{ background: db.config.supabaseUrl && db.config.supabaseKey ? "#3ECF8E" : "var(--border)" }} />
                {db.config.supabaseUrl && db.config.supabaseKey ? "Conectada" : "Sin configurar"}
              </span>
            </div>
            <Field label="URL del proyecto" hint="https://xxxx.supabase.co — la encuentras en Settings → API">
              <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="https://abcdefgh.supabase.co" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
            </Field>
            <Field label="Anon key (pública)" hint="La clave anon de Settings → API (no es la service_role)">
              <div className="flex gap-2">
                <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} type={verKey ? "text" : "password"} placeholder="eyJhbGciOiJIUzI1NiIs…" value={sbKey} onChange={(e) => setSbKey(e.target.value)} />
                <button className="icon-btn" style={{ flexShrink: 0 }} onClick={() => setVerKey((v) => !v)} title={verKey ? "Ocultar" : "Mostrar"}>{verKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            <div className="flex gap-2 flex-wrap mt-3">
              <button className="btn btn-primary btn-sm" onClick={guardarCredenciales}><Check size={14} /> Guardar credenciales</button>
              <button className="btn btn-ghost btn-sm" onClick={probar} disabled={pingState === "busy"}>
                <Plug size={14} className={pingState === "busy" ? "spin" : ""} />
                {pingState === "busy" ? "Probando…" : pingState === "ok" ? "Conectado ✓" : pingState === "fail" ? "Reintentar" : "Probar conexión"}
              </button>
            </div>
            {pingState === "ok" && pingInfo && (
              <p className="text-[12px] mt-2 mb-0 flex items-center gap-1.5" style={{ color: "#16a36a" }}>
                <Database size={13} /> {pingInfo.tablas} tablas accesibles · {pingInfo.filas} filas totales en la nube
              </p>
            )}

            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-soft)" }}>
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-soft btn-sm" onClick={subir} disabled={syncing || !db.config.supabaseUrl}><UploadCloud size={14} /> {syncing ? "Subiendo…" : "Subir base completa"}</button>
                <button className="btn btn-ghost btn-sm" onClick={bajar} disabled={syncing || !db.config.supabaseUrl}><DownloadCloud size={14} /> Restaurar desde Supabase</button>
              </div>
              <label className="flex items-center gap-2.5 text-[12.5px] font-semibold cursor-pointer mt-3" style={{ color: "var(--ink-soft)" }}>
                <input type="checkbox" disabled={!db.config.supabaseUrl || !db.config.supabaseKey} checked={db.config.autoSyncCloud} onChange={(e) => { setConfig({ autoSyncCloud: e.target.checked }); toast(e.target.checked ? "Auto-sincronización activada (cada cambio)" : "Auto-sincronización apagada", "ok"); }} />
                Sincronizar automáticamente tras cada cambio (2.5 s)
              </label>
              <div className="mt-3 p-3 rounded-xl text-[12px] flex items-start gap-2" style={{ background: syncInfo ? (syncInfo.ok ? "var(--green-tint)" : "var(--red-tint)") : "var(--surface-2)", color: syncInfo ? (syncInfo.ok ? "var(--green)" : "var(--red)") : "var(--ink-faint)" }}>
                <Cloud size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {syncInfo ? <><b>{syncInfo.msg}</b><br /><span className="tabular-nums" style={{ opacity: 0.75 }}>{fmtFechaHoraViva(syncInfo.last, nowInt)} · {fmtHaceSegundos(syncInfo.last, nowInt)}</span></> : "Aún no hay sincronizaciones. El CRM sigue guardando todo en este navegador; Supabase es tu base de datos en línea."}
                </span>
              </div>
            </div>
          </div>

          {/* Activación + esquema SQL + mapa de tablas */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-display font-semibold text-[13px] uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Activar en 4 pasos</span>
              <button className="btn btn-gold btn-xs" onClick={() => setVerCodigo((v) => !v)}><Terminal size={12} /> {verCodigo ? "Ocultar esquema" : "Ver esquema SQL"}</button>
            </div>
            <ol className="m-0 pl-0 flex flex-col gap-2" style={{ listStyle: "none", counterReset: "paso" }}>
              {[
                "Crea un proyecto gratis en supabase.com (con tu cuenta de Google).",
                "Ve a SQL Editor → New query → pega el esquema que está abajo → Run.",
                "En Settings → API copia la “URL” del proyecto y la “anon public key”.",
                "Pégalas aquí, guarda y presiona “Probar conexión”. ¡Listo!",
              ].map((p, i) => (
                <li key={i} className="flex gap-3 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-[11px] flex-shrink-0" style={{ background: "rgba(62,207,142,0.15)", color: "#16a36a" }}>{i + 1}</span>
                  <span className="pt-0.5">{p}</span>
                </li>
              ))}
            </ol>

            {verCodigo && (
              <div className="relative mt-3 rounded-xl overflow-hidden" style={{ background: "#0b1626", border: "1px solid #1d3350" }}>
                <div className="flex items-center justify-between px-3.5 py-2" style={{ background: "#0e1d33" }}>
                  <span className="flex items-center gap-2 text-[11px] font-display font-semibold" style={{ color: "#7fa3cf" }}><Terminal size={13} /> esquema_jyg.sql · Supabase</span>
                  <button className="btn btn-xs" style={{ background: "rgba(62,207,142,0.15)", color: "#3ECF8E", border: "1px solid rgba(62,207,142,0.4)" }}
                    onClick={() => { navigator.clipboard?.writeText(SUPABASE_SQL).then(() => toast("Esquema SQL copiado al portapapeles", "ok")).catch(() => toast("No se pudo copiar", "err")); }}>
                    <Copy size={12} /> Copiar
                  </button>
                </div>
                <pre className="m-0 p-4 overflow-x-auto text-[11px] leading-relaxed" style={{ color: "#a8c6e8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", maxHeight: 260 }}>
                  {SUPABASE_SQL}
                </pre>
              </div>
            )}

            {/* Mapa de tablas */}
            <div className="mt-4 p-3.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-semibold text-[12px] uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Mapa de tablas (13)</span>
                <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>filas locales → Supabase</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DB_TABLES.map((t) => {
                  const estado = prog[t.tabla];
                  const borderColor = estado === "ok" ? "#3ECF8E" : estado === "err" ? "var(--red)" : estado === "busy" ? "var(--gold)" : "var(--border)";
                  return (
                    <span key={t.tabla} className="px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 transition-all" style={{ background: "var(--surface)", border: `1.2px solid ${borderColor}` }}>
                      <span className="text-[11px] truncate" style={{ color: "var(--ink-soft)" }} title={t.modulo}>{t.tabla}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {estado === "busy" && <span className="spin inline-flex" style={{ color: "var(--gold)" }}><RefreshCw size={11} /></span>}
                        {estado === "ok" && <span style={{ color: "#16a36a" }}><Check size={12} /></span>}
                        {estado === "err" && <span style={{ color: "var(--red)" }}><AlertTriangle size={12} /></span>}
                        <span className="font-display font-bold text-[11px] tabular-nums" style={{ color: "var(--blue)" }}>{filasLocales[t.tabla] ?? 0}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial diario */}
      <div className="card p-5 mb-6">
        <SectionHead title="Historial diario de tasas" desc={`${historial.length} registros guardados · uno por día`}
          actions={
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={exportarHistorial}><Download size={14} /> CSV</button>
              <button className="btn btn-danger btn-sm" onClick={limpiarHistorial}><Trash2 size={14} /> Limpiar</button>
            </div>
          } />
        {ultimos14.length >= 2 && <TasaChart data={ultimos14} />}
        <div className="overflow-x-auto mt-3">
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>USD (Bs)</th><th>EUR (Bs)</th><th>Paralelo</th><th>Fuente</th><th>Actualizado</th><th></th></tr></thead>
            <tbody>
              {[...historial].reverse().slice(0, 30).map((h) => (
                <tr key={h.id}>
                  <td className="font-display font-semibold text-[13px]">{fmtFecha(h.fecha)}{h.fecha === todayISO() && <Badge tone="green">Hoy</Badge>}</td>
                  <td className="font-display font-bold" style={{ color: "var(--blue)" }}>{fmtBs(h.usd)}</td>
                  <td className="text-[13px]">{h.euro ? fmtBs(h.euro) : "—"}</td>
                  <td className="text-[13px]">{h.paralelo ? fmtBs(h.paralelo) : "—"}</td>
                  <td><Badge tone={h.fuente === "dolarapi" ? "blue" : "amber"} dot>{h.fuente === "dolarapi" ? "DolarAPI" : "Manual"}</Badge></td>
                  <td className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{fmtHoraAgo(h.actualizado)}</td>
                  <td>
                    <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={async () => {
                      const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará la tasa del ${fmtFecha(h.fecha)}.`, confirmText: "Eliminar", danger: true });
                      if (!ok) return;
                      deleteTasaHistorial(h.id);
                      toast("Registro eliminado", "warn");
                    }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {historial.length === 0 && <p className="text-[13px] py-4 m-0 text-center" style={{ color: "var(--ink-faint)" }}>Sin registros — activa la API o guarda una tasa manual para empezar el historial.</p>}
      </div>

      {/* Configuración de fuente + otras integraciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className="card p-5">
          <SectionHead title="Fuente de la tasa" />
          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-xl flex items-center gap-3" style={{ background: db.config.usarApi && !db.config.usarTasaManual ? "var(--green-tint)" : "var(--surface-2)" }}>
              <Globe size={18} style={{ color: "var(--blue)" }} />
              <div className="flex-1">
                <div className="font-display font-semibold text-[13.5px]">Automática (DolarAPI)</div>
                <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>Consulta oficial + paralelo y euros, con registro diario</div>
              </div>
              <button className="btn btn-xs" style={{ background: db.config.usarApi && !db.config.usarTasaManual ? "var(--green)" : "var(--surface)", color: db.config.usarApi && !db.config.usarTasaManual ? "#fff" : "var(--ink-soft)", border: "1px solid var(--border)" }} onClick={activarApi}>Activar</button>
            </div>
            <div className="p-3.5 rounded-xl" style={{ background: db.config.usarTasaManual ? "var(--amber-tint)" : "var(--surface-2)" }}>
              <div className="flex items-center gap-3 mb-2">
                <Pencil size={16} style={{ color: "var(--amber)" }} />
                <div className="flex-1">
                  <div className="font-display font-semibold text-[13.5px]">Tasa manual</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>Útil si la API no está disponible</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input type="number" step="0.01" className="input" style={{ width: 120 }} placeholder="USD Bs" value={manualUsd} onChange={(e) => setManualUsd(e.target.value)} />
                <input type="number" step="0.01" className="input" style={{ width: 120 }} placeholder="EUR Bs" value={manualEur} onChange={(e) => setManualEur(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={guardarManual}>Guardar</button>
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-[12.5px] font-semibold cursor-pointer" style={{ color: "var(--ink-soft)" }}>
              <input type="checkbox" checked={db.config.historialAuto} onChange={(e) => setConfig({ historialAuto: e.target.checked })} />
              Guardar automáticamente la tasa de cada día en el historial
            </label>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="card p-5" style={{ animationDelay: "120ms" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--green-tint)", color: "#1f9d55" }}><Smartphone size={21} /></div>
            <Badge tone="green" dot>Enlaces wa.me activos</Badge>
          </div>
          <h3 className="font-display font-bold text-[16px] m-0">WhatsApp Business</h3>
          <p className="text-[12.5px] mt-1 mb-3" style={{ color: "var(--ink-soft)" }}>
            Recordatorios de saldo, cotizaciones y entregas se envían directo al WhatsApp del representante con los datos del estudiante y la tasa del día.
          </p>
          <div className="p-3 rounded-xl text-[12px]" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>
            <Plug size={13} className="inline mr-1.5" style={{ color: "#1f9d55" }} />
            Los números venezolanos se normalizan automáticamente al formato internacional (58).
          </div>
        </div>
      </div>
      <span className="hidden"><UserCog size={1} /></span>
    </div>
  );
}

/* Gráfica del historial */
function TasaChart({ data }: { data: { fecha: string; usd: number; euro: number }[] }) {
  const W = 900, H = 190, P = 34;
  const vals = data.map((d) => d.usd);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(0.01, max - min);
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => P * 0.6 + (H - P * 1.4) * (1 - (v - min) / span);
  const pts = data.map((d, i) => `${x(i)},${y(d.usd)}`).join(" ");
  const area = `${P},${H - P * 0.7} ${pts} ${x(data.length - 1)},${H - P * 0.7}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 190 }} aria-hidden="true">
        <defs>
          <linearGradient id="gradTasa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={P * 0.6 + (H - P * 1.4) * f} y2={P * 0.6 + (H - P * 1.4) * f} stroke="var(--border-soft)" strokeDasharray="4 5" />
        ))}
        <polygon points={area} fill="url(#gradTasa)" />
        <polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={d.fecha}>
            <circle cx={x(i)} cy={y(d.usd)} r="4" fill="var(--surface)" stroke="var(--blue)" strokeWidth="2.2">
              <title>{fmtFecha(d.fecha)} · {fmtBs(d.usd)}</title>
            </circle>
            {i % Math.ceil(data.length / 7) === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fontFamily="Poppins" fill="var(--ink-faint)">
                {new Date(d.fecha + "T12:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex gap-4 justify-center text-[11.5px] font-semibold" style={{ color: "var(--ink-faint)" }}>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: "var(--blue)" }} />USD (Bs)</span>
        <span>Mín {fmtBs(min)} · Máx {fmtBs(max)} · Último {fmtBs(vals[vals.length - 1])}</span>
      </div>
    </div>
  );
}
