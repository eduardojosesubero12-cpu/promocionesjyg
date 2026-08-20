import React, { useMemo, useRef, useState } from "react";
import {
  Check, Clock, Cloud, Copy, Database, Download, DownloadCloud, Euro, Eye, EyeOff,
  Globe, History, KeyRound, Pencil, Plug, Plus, RefreshCw, ScanLine, ShieldCheck, Smartphone,
  Terminal, Trash2, Upload, UploadCloud, UserCog,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Rol, Usuario } from "../lib/data";
import {
  API_DOLARES, APPS_SCRIPT_CODE, API_EUROS, OCR_CRED, downloadFile, fmtBs, fmtFecha, fmtFechaHoraViva,
  fmtHaceSegundos, fmtHoraAgo, toCSV, todayISO, uid,
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
  const { db, setConfig, confirm, success, toast, tasa, refreshTasa, setRoute, aplicarTasaManual, setOcrOpen } = useApp();
  const nowCfg = useNow(1000);
  const [emp, setEmp] = useState({ ...db.config.empresa });
  const [fallback, setFallback] = useState(String(db.config.tasaManualUSD || db.config.tasaFallback));
  const [nuevoMetodo, setNuevoMetodo] = useState("");
  const [nuevoEsBs, setNuevoEsBs] = useState(false);
  const [verClaveOcr, setVerClaveOcr] = useState(false);

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
  const [urlAS, setUrlAS] = useState(db.config.appsScriptUrl);
  const [pingState, setPingState] = useState<"idle" | "ok" | "fail" | "busy">("idle");
  const [verCodigo, setVerCodigo] = useState(false);

  const guardarUrl = async () => {
    const u = urlAS.trim();
    if (u && !/^https:\/\/script\.google\.com\/macros\/s\//.test(u)) {
      toast("La URL debe ser de una Aplicación web de Apps Script (…/macros/s/…/exec)", "err");
      return;
    }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: u ? "Se usará esta URL como base de datos en la nube." : "Se desactivará la sincronización con la nube.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ appsScriptUrl: u, autoSync: u ? db.config.autoSync : false });
    setPingState("idle");
    success();
  };

  const probar = async () => {
    const u = urlAS.trim();
    if (!u) { toast("Pega primero la URL de la Aplicación web", "warn"); return; }
    setPingState("busy");
    const ok = await testCloud(u);
    setPingState(ok ? "ok" : "fail");
    toast(ok ? "Conexión exitosa con Google Sheets" : "No se pudo conectar — revisa el despliegue", ok ? "ok" : "err");
  };

  const subir = async () => {
    const ok = await syncToCloud(urlAS.trim() || undefined);
    if (ok && urlAS.trim() !== db.config.appsScriptUrl) setConfig({ appsScriptUrl: urlAS.trim() });
    if (ok) success("Datos respaldados en Google Sheets");
  };

  const bajar = async () => {
    const ok = await confirm({ title: "¿Restaurar desde la nube?", message: "Los datos actuales de este navegador se reemplazarán por el último respaldo de Google Sheets.", confirmText: "Sí, Restaurar" });
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
            Tasa del día vía ve.dolarapi.com con <b>historial diario</b> · OCR con la IA de Google · WhatsApp
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

      {/* ============ BASE DE DATOS EN LA NUBE ============ */}
      <div className="card mb-6 overflow-hidden reveal">
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: "linear-gradient(135deg, var(--blue), #0a2a4d)", color: "#fff" }}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,217,112,0.18)", color: "#ffd970" }}><Cloud size={22} /></span>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-display font-bold text-[17px] m-0">Base de datos en la nube</h3>
            <p className="text-[12px] m-0" style={{ color: "rgba(255,255,255,0.72)" }}>Recomendación para JyG: <b>Google Sheets + Apps Script</b> — gratis, sin servidores y ya vives en el ecosistema Google (OCR, Codigo.gs)</p>
          </div>
          <span className="badge" style={{ background: "var(--gold)", color: "#3b2c00" }}>★ RECOMENDADA</span>
        </div>

        {/* Flujo de arquitectura */}
        <div className="px-5 pt-5 pb-2 flex items-center justify-center gap-2 flex-wrap">
          {[
            { t: "CRM JyG", s: "caché local en tu navegador", c: "var(--blue)" },
            { t: "Apps Script", s: "Aplicación web (gratis)", c: "var(--gold-deep)" },
            { t: "Google Sheets", s: "hoja CRM_JyG · respaldos fechados", c: "var(--green)" },
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
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: db.config.appsScriptUrl ? "var(--green)" : "var(--ink-faint)" }}>
                <span className={`w-2 h-2 rounded-full ${db.config.appsScriptUrl ? "pulse-dot" : ""}`} style={{ background: db.config.appsScriptUrl ? "var(--green)" : "var(--border)" }} />
                {db.config.appsScriptUrl ? "Configurada" : "Sin configurar"}
              </span>
            </div>
            <Field label="URL de la Aplicación web (Apps Script)" hint="…/macros/s/XXXX/exec — termina en /exec">
              <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="https://script.google.com/macros/s/…/exec" value={urlAS} onChange={(e) => setUrlAS(e.target.value)} />
            </Field>
            <div className="flex gap-2 flex-wrap mt-3">
              <button className="btn btn-primary btn-sm" onClick={guardarUrl}><Check size={14} /> Guardar URL</button>
              <button className="btn btn-ghost btn-sm" onClick={probar} disabled={pingState === "busy"}>
                <Plug size={14} className={pingState === "busy" ? "spin" : ""} />
                {pingState === "busy" ? "Probando…" : pingState === "ok" ? "Conectada ✓" : pingState === "fail" ? "Reintentar" : "Probar conexión"}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-soft)" }}>
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-soft btn-sm" onClick={subir} disabled={syncing}><UploadCloud size={14} /> {syncing ? "Subiendo…" : "Subir datos a la nube"}</button>
                <button className="btn btn-ghost btn-sm" onClick={bajar} disabled={syncing || !db.config.appsScriptUrl}><DownloadCloud size={14} /> Restaurar desde la nube</button>
              </div>
              <label className="flex items-center gap-2.5 text-[12.5px] font-semibold cursor-pointer mt-3" style={{ color: "var(--ink-soft)" }}>
                <input type="checkbox" disabled={!db.config.appsScriptUrl} checked={db.config.autoSync} onChange={(e) => { setConfig({ autoSync: e.target.checked }); toast(e.target.checked ? "Auto-sincronización activada (cada cambio)" : "Auto-sincronización apagada", "ok"); }} />
                Sincronizar automáticamente tras cada cambio (2.5 s)
              </label>
              <div className="mt-3 p-3 rounded-xl text-[12px] flex items-start gap-2" style={{ background: syncInfo ? (syncInfo.ok ? "var(--green-tint)" : "var(--red-tint)") : "var(--surface-2)", color: syncInfo ? (syncInfo.ok ? "var(--green)" : "var(--red)") : "var(--ink-faint)" }}>
                <Cloud size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {syncInfo ? <><b>{syncInfo.msg}</b><br /><span className="tabular-nums" style={{ opacity: 0.75 }}>{fmtFechaHoraViva(syncInfo.last, nowInt)} · {fmtHaceSegundos(syncInfo.last, nowInt)}</span></> : "Aún no hay sincronizaciones. El CRM sigue guardando todo en este navegador; la nube es tu respaldo en línea."}
                </span>
              </div>
            </div>
          </div>

          {/* Activación en 4 pasos + código */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-display font-semibold text-[13px] uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Activar en 4 pasos</span>
              <button className="btn btn-gold btn-xs" onClick={() => setVerCodigo((v) => !v)}><Terminal size={12} /> {verCodigo ? "Ocultar código" : "Ver Codigo.gs"}</button>
            </div>
            <ol className="m-0 pl-0 flex flex-col gap-2" style={{ listStyle: "none", counterReset: "paso" }}>
              {[
                "Crea una Hoja de cálculo de Google nueva (será tu base de datos).",
                "Menú Extensiones → Apps Script y borra el contenido del archivo Codigo.gs.",
                "Pega el código que está abajo (crea solo la hoja CRM_JyG al primer uso).",
                "Implementar → Nueva implementación → Aplicación web · acceso: “Cualquier persona” → copia la URL /exec y pégala aquí.",
              ].map((p, i) => (
                <li key={i} className="flex gap-3 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-[11px] flex-shrink-0" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>{i + 1}</span>
                  <span className="pt-0.5">{p}</span>
                </li>
              ))}
            </ol>

            {verCodigo && (
              <div className="relative mt-3 rounded-xl overflow-hidden" style={{ background: "#0b1626", border: "1px solid #1d3350" }}>
                <div className="flex items-center justify-between px-3.5 py-2" style={{ background: "#0e1d33" }}>
                  <span className="flex items-center gap-2 text-[11px] font-display font-semibold" style={{ color: "#7fa3cf" }}><Terminal size={13} /> Codigo.gs · Google Apps Script</span>
                  <button className="btn btn-xs" style={{ background: "rgba(255,217,112,0.15)", color: "#ffd970", border: "1px solid rgba(255,217,112,0.4)" }}
                    onClick={() => { navigator.clipboard?.writeText(APPS_SCRIPT_CODE).then(() => toast("Codigo.gs copiado al portapapeles", "ok")).catch(() => toast("No se pudo copiar", "err")); }}>
                    <Copy size={12} /> Copiar
                  </button>
                </div>
                <pre className="m-0 p-4 overflow-x-auto text-[11px] leading-relaxed" style={{ color: "#a8c6e8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", maxHeight: 240 }}>
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>
            )}

            {/* Escalabilidad */}
            <div className="mt-4 p-3.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <div className="font-display font-semibold text-[12px] uppercase tracking-wider mb-2" style={{ color: "var(--ink-faint)" }}>¿Y cuando JyG crezca?</div>
              <div className="flex flex-col gap-1.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                <span><b style={{ color: "var(--gold-deep)" }}>Ahora · Google Sheets</b> — gratis, respaldo con fecha, ideal hasta ~2.000 estudiantes.</span>
                <span><b style={{ color: "var(--blue)" }}>Luego · Firebase</b> — si quieres sincronización en tiempo real entre varios teléfonos y laptops.</span>
                <span><b style={{ color: "var(--green)" }}>Después · Supabase (PostgreSQL)</b> — multi-sucursal, reportes SQL y app propia. El CRM exporta/importa JSON, así que migrar es directo.</span>
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
