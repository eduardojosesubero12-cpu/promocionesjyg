import React, { useRef, useState } from "react";
import {
  AlertTriangle, Check, Clock, Cloud, Copy, Database, Download, DownloadCloud, Euro, Eye, EyeOff,
  Globe, History, KeyRound, Package, Pencil, Plug, Plus, RefreshCw, ScanLine, ShieldCheck,
  Smartphone, Terminal, Trash2, Upload, UploadCloud, UserCog, X,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { PaqueteEscuela, Usuario } from "../lib/data";
import {
  API_DOLARES, API_EUROS, DB_TABLES, OCR_CRED, PAQUETES, SUPABASE_SQL, downloadFile, fmtBs, fmtFecha,
  fmtFechaHoraViva, fmtHaceSegundos, todayISO, toCSV, uid,
} from "../lib/data";
import { Badge, Field, Modal, SectionHead, useNow } from "../components/ui";

/* ================= USUARIOS ================= */
const ROL_LABEL: Record<string, string> = { admin: "Administrador", operador: "Operador", produccion: "Producción", cobranza: "Cobranza" };
const ROL_DESC: Record<string, string> = { admin: "Control total", operador: "Registra estudiantes y pagos", produccion: "Materiales y pedidos", cobranza: "Pagos y saldos" };

export function Usuarios() {
  const { db, saveUsuario, deleteUsuario, confirm, success, toast } = useApp();
  const [form, setForm] = useState<Usuario | null>(null);

  const guardar = async () => {
    if (!form || !form.nombre.trim()) { toast("El nombre es obligatorio", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveUsuario({ ...form, id: form.id || uid(), usuario: form.usuario || form.nombre.toLowerCase().split(" ")[0] });
    success();
    setForm(null);
  };
  const eliminar = async (u: Usuario) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {db.usuarios.map((u, i) => (
          <div key={u.id} className="card p-5 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 55}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-[15px]" style={{ background: "linear-gradient(150deg, var(--blue), #0b2e52)", color: "#ffd970" }}>{u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
              <div className="flex gap-1">
                <button className="icon-btn" onClick={() => setForm(u)}><Pencil size={14} /></button>
                <button className="icon-btn danger" onClick={() => eliminar(u)}><Trash2 size={14} /></button>
              </div>
            </div>
            <h3 className="font-display font-bold text-[15px] m-0">{u.nombre}</h3>
            <p className="text-[11.5px] m-0 mb-2" style={{ color: "var(--ink-faint)" }}>@{u.usuario}</p>
            <Badge tone={u.rol === "admin" ? "gold" : u.rol === "cobranza" ? "red" : u.rol === "produccion" ? "green" : "blue"}>{ROL_LABEL[u.rol]}</Badge>
            <p className="text-[11.5px] mt-2 mb-0" style={{ color: "var(--ink-soft)" }}>{ROL_DESC[u.rol]}</p>
            <button className="btn btn-xs mt-3" style={{ background: u.activo ? "var(--green-tint)" : "var(--red-tint)", color: u.activo ? "var(--green)" : "var(--red)" }} onClick={() => saveUsuario({ ...u, activo: !u.activo })}>
              {u.activo ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar usuario" : "Nuevo usuario"}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" required className="col-span-2"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus /></Field>
            <Field label="Usuario"><input className="input" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></Field>
            <Field label="Rol">
              <select className="select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Usuario["rol"] })}>
                {Object.entries(ROL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-[12px] mt-3 mb-0" style={{ color: "var(--ink-faint)" }}>{ROL_DESC[form.rol]}.</p>
        </Modal>
      )}
      <span className="hidden"><UserCog size={1} /></span>
    </div>
  );
}

/* ================= CONFIGURACIÓN ================= */
const peVacio = (): PaqueteEscuela => ({ id: "", escuelaId: "", nombre: "", tipoPaqueteId: "premium", precio: 40, articulos: PAQUETES.premium.incluye.map((n) => ({ nombre: n, cantidad: 1 })), nota: "", activo: true, creado: todayISO() });

export function Configuracion() {
  const { db, setConfig, confirm, success, toast, tasa, refreshTasa, setRoute, aplicarTasaManual, setOcrOpen, savePaqueteEscuela, deletePaqueteEscuela } = useApp();
  const nowCfg = useNow(1000);
  const [emp, setEmp] = useState({ ...db.config.empresa });
  const [fallback, setFallback] = useState(String(db.config.tasaManualUSD || db.config.tasaFallback));
  const [nuevoMetodo, setNuevoMetodo] = useState("");
  const [nuevoEsBs, setNuevoEsBs] = useState(false);
  const [verClaveOcr, setVerClaveOcr] = useState(false);
  const [pe, setPe] = useState<PaqueteEscuela | null>(null);
  const [nuevoArt, setNuevoArt] = useState("");

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

  const guardarPe = async () => {
    if (!pe) return;
    if (!pe.nombre.trim() || !pe.escuelaId) { toast("Completa nombre y escuela", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    savePaqueteEscuela({ ...pe, id: pe.id || uid() });
    success();
    setPe(null);
  };
  const eliminarPe = async (p: PaqueteEscuela) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará "${p.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePaqueteEscuela(p.id);
    toast("Paquete eliminado", "warn");
  };
  const cambiarTipo = (tipo: string) => {
    if (!pe) return;
    const base = PAQUETES[tipo];
    setPe({ ...pe, tipoPaqueteId: tipo, precio: base ? base.precioBase : pe.precio, articulos: base ? base.incluye.map((n) => ({ nombre: n, cantidad: 1 })) : pe.articulos });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Configuración</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Empresa, tasa del día, OCR, paquetes por escuela y métodos de pago</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Empresa */}
        <div className="card p-5">
          <SectionHead title="Datos de la empresa" desc="Aparecen en tickets y credenciales" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" className="col-span-2"><input className="input" value={emp.nombre} onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} /></Field>
            <Field label="RIF"><input className="input" value={emp.rif} onChange={(e) => setEmp({ ...emp, rif: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={emp.telefono} onChange={(e) => setEmp({ ...emp, telefono: e.target.value })} /></Field>
            <Field label="Dirección" className="col-span-2"><input className="input" value={emp.direccion} onChange={(e) => setEmp({ ...emp, direccion: e.target.value })} /></Field>
          </div>
          <button className="btn btn-primary btn-sm mt-4" onClick={guardarEmpresa}><Check size={14} /> Sí, Guardar</button>
        </div>

        {/* Tasa */}
        <div className="card p-5">
          <SectionHead title="Tasa del día" desc={`Integración con ve.dolarapi.com · ${fmtFechaHoraViva(tasa.updated, nowCfg)}`} />
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="p-3 rounded-xl flex-1 min-w-[130px]" style={{ background: "var(--blue-tint-2)" }}>
              <div className="text-[10px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Dólar oficial</div>
              <div className="font-display font-bold text-[19px]" style={{ color: "var(--blue)" }}>{fmtBs(tasa.usd)}</div>
            </div>
            {tasa.eur > 0 && (
              <div className="p-3 rounded-xl flex-1 min-w-[130px]" style={{ background: "var(--gold-tint)" }}>
                <div className="text-[10px] font-display font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--ink-faint)" }}><Euro size={10} /> Euro</div>
                <div className="font-display font-bold text-[19px]" style={{ color: "var(--gold-deep)" }}>{fmtBs(tasa.eur)}</div>
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={refreshTasa}><RefreshCw size={13} /> Actualizar</button>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] font-semibold cursor-pointer mb-3" style={{ color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={db.config.usarApi && !db.config.usarTasaManual} onChange={toggleApi} /> Usar tasa automática de DolarAPI
          </label>
          <div className="flex gap-2 items-end">
            <Field label="Tasa manual (Bs por $1)"><input type="number" className="input" value={fallback} onChange={(e) => setFallback(e.target.value)} /></Field>
            <button className="btn btn-soft" onClick={guardarTasa}><Check size={14} /> Aplicar</button>
          </div>
          <button className="btn btn-ghost btn-xs mt-3" onClick={() => setRoute("integraciones")}><History size={12} /> Ver historial diario en Integraciones</button>
        </div>

        {/* Cuenta de servicio OCR */}
        <div className="card p-5" style={{ borderLeft: "4px solid var(--gold)" }}>
          <SectionHead title="Cuenta de servicio OCR" desc="Credenciales de la IA de Google Cloud Vision" actions={<Badge tone="green" dot>Cuenta conectada</Badge>} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <Globe size={14} style={{ color: "var(--blue)" }} />
              <span className="truncate flex-1 text-[12.5px]">{OCR_CRED.correo}</span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Copiar correo" onClick={() => copiar(OCR_CRED.correo, "Correo")}><Copy size={13} /></button>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <Database size={14} style={{ color: "var(--blue)" }} />
              <span className="truncate flex-1 text-[12.5px]">ID único: <b className="font-display">{OCR_CRED.id}</b></span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Copiar ID" onClick={() => copiar(OCR_CRED.id, "ID único")}><Copy size={13} /></button>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <KeyRound size={14} style={{ color: "var(--gold-deep)" }} />
              <span className="truncate flex-1 font-display tracking-wide text-[12.5px]">{verClaveOcr ? OCR_CRED.clave : "••••••••••••••••••••••••"}</span>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title={verClaveOcr ? "Ocultar clave" : "Mostrar clave"} onClick={() => setVerClaveOcr((v) => !v)}>{verClaveOcr ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              <button className="icon-btn" style={{ width: 30, height: 30 }} title="Copiar clave" onClick={() => copiar(OCR_CRED.clave, "CLAVE")}><Copy size={13} /></button>
            </div>
          </div>
          <p className="text-[11.5px] mt-3 mb-3" style={{ color: "var(--ink-faint)" }}>La CLAVE queda oculta en el escáner y en el resto del sistema por seguridad.</p>
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
                <button className="btn btn-xs" style={{ background: m.activo ? "var(--green-tint)" : "var(--red-tint)", color: m.activo ? "var(--green)" : "var(--red)" }} onClick={() => setConfig({ metodos: db.config.metodos.map((x) => (x.id === m.id ? { ...x, activo: !x.activo } : x)) })}>
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
      </div>

      {/* Paquetes por escuela */}
      <div className="card p-5 mt-5" style={{ borderLeft: "4px solid var(--gold)" }}>
        <SectionHead title="Paquetes por Escuela" desc="Asigna paquetes con nombre propio, tipo y artículos editables a cada plantel"
          actions={<button className="btn btn-gold btn-sm" onClick={() => setPe(peVacio())}><Plus size={14} /> Asignar paquete</button>} />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {db.escuelas.map((es) => {
            const suyos = db.paquetesEscuelas.filter((p) => p.escuelaId === es.id);
            return (
              <div key={es.id} className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-display font-bold text-[13.5px] truncate">{es.nombre}</span>
                  <button className="btn btn-soft btn-xs" onClick={() => setPe({ ...peVacio(), escuelaId: es.id })}><Plus size={11} /> Agregar</button>
                </div>
                {suyos.length === 0 && <p className="text-[12px] m-0 py-2" style={{ color: "var(--ink-faint)" }}>Sin paquetes asignados.</p>}
                <div className="flex flex-col gap-2">
                  {suyos.map((p) => {
                    const tipo = PAQUETES[p.tipoPaqueteId];
                    return (
                      <div key={p.id} className="p-3 rounded-lg transition-all hover:shadow-[var(--shadow-sm)]" style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", opacity: p.activo ? 1 : 0.55 }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tipo?.color || "var(--slate)" }} />
                          <span className="font-display font-semibold text-[13px] flex-1 truncate">{p.nombre}</span>
                          <Badge tone={p.tipoPaqueteId === "lujo" ? "gold" : p.tipoPaqueteId === "premium" ? "green" : p.tipoPaqueteId === "basico" ? "blue" : "slate"}>{tipo?.nombre || "Propio"}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{p.articulos.length} artículos · <b className="font-display" style={{ color: "var(--blue)" }}>${p.precio}</b></span>
                          <div className="flex gap-1">
                            <button className="btn btn-xs" style={{ background: p.activo ? "var(--green-tint)" : "var(--red-tint)", color: p.activo ? "var(--green)" : "var(--red)" }} onClick={() => savePaqueteEscuela({ ...p, activo: !p.activo })}>{p.activo ? "Activo" : "Inactivo"}</button>
                            <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setPe(p)}><Pencil size={13} /></button>
                            <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => eliminarPe(p)}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {p.nota && <p className="text-[11px] italic m-0 mt-1.5" style={{ color: "var(--ink-faint)" }}>{p.nota}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Respaldo */}
      <div className="card p-5 mt-5">
        <SectionHead title="Respaldo de datos" desc="Exporta o importa toda la base del CRM en JSON" actions={<Database size={19} style={{ color: "var(--ink-faint)" }} />} />
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-soft" onClick={() => { downloadFile(`respaldo-jyg-${todayISO()}.json`, JSON.stringify(db, null, 2), "application/json"); toast("Respaldo descargado", "ok"); }}><Download size={15} /> Exportar respaldo</button>
          <ImportBtn />
        </div>
      </div>

      {/* Editor de paquete por escuela */}
      {pe && (
        <Modal open onClose={() => setPe(null)} size="lg" title={pe.id ? `Editar "${pe.nombre}"` : "Asignar paquete a escuela"}
          footer={<><button className="btn btn-ghost" onClick={() => setPe(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardarPe}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Escuela" required className="col-span-2">
              <select className="select" value={pe.escuelaId} onChange={(e) => setPe({ ...pe, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Nombre del paquete" required className="col-span-2">
              <input className="input" placeholder="Ej: Paquete VIP San Agustín" value={pe.nombre} onChange={(e) => setPe({ ...pe, nombre: e.target.value })} />
            </Field>
            <Field label="Tipo base" hint="Al elegir, se cargan sus artículos y precio">
              <select className="select" value={pe.tipoPaqueteId} onChange={(e) => cambiarTipo(e.target.value)}>
                <option value="basico">Básico</option><option value="premium">Premium</option><option value="lujo">Lujo</option><option value="personalizado">Personalizado</option>
              </select>
            </Field>
            <Field label="Precio negociado ($)"><input type="number" min={1} className="input" value={pe.precio} onChange={(e) => setPe({ ...pe, precio: Number(e.target.value) || 0 })} /></Field>
          </div>

          <div className="card p-4 mt-4" style={{ background: "var(--surface-2)" }}>
            <SectionHead title={`Artículos incluidos (${pe.articulos.length})`} desc="Edita cantidades, agrega o quita líneas" />
            <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
              {pe.articulos.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="input" style={{ height: 34, flex: 1 }} value={a.nombre} onChange={(e) => setPe({ ...pe, articulos: pe.articulos.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)) })} />
                  <input type="number" min={1} className="input" style={{ height: 34, width: 70 }} value={a.cantidad} onChange={(e) => setPe({ ...pe, articulos: pe.articulos.map((x, j) => (j === i ? { ...x, cantidad: Number(e.target.value) || 1 } : x)) })} />
                  <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => setPe({ ...pe, articulos: pe.articulos.filter((_, j) => j !== i) })}><X size={13} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2.5">
              <input className="input" style={{ flex: 1 }} placeholder="Nuevo artículo (ej: Taza con logo)" value={nuevoArt} onChange={(e) => setNuevoArt(e.target.value)} />
              <button className="btn btn-soft btn-sm" onClick={() => { if (!nuevoArt.trim()) return; setPe({ ...pe, articulos: [...pe.articulos, { nombre: nuevoArt.trim(), cantidad: 1 }] }); setNuevoArt(""); }}><Plus size={13} /> Agregar</button>
            </div>
          </div>
          <Field label="Nota / acuerdo" className="mt-4"><textarea className="textarea" value={pe.nota} onChange={(e) => setPe({ ...pe, nota: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

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
  const [verClave, setVerClave] = useState(false);
  const [manualUsd, setManualUsd] = useState(String(db.config.tasaManualUSD));
  const [manualEur, setManualEur] = useState(String(db.config.tasaManualEUR));
  const [sbUrl, setSbUrl] = useState(db.config.supabaseUrl);
  const [sbKey, setSbKey] = useState(db.config.supabaseKey);
  const [verKey, setVerKey] = useState(false);
  const [pingState, setPingState] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [pingInfo, setPingInfo] = useState<{ tablas: number; filas: number } | null>(null);
  const [verSql, setVerSql] = useState(false);
  const [tabSync, setTabSync] = useState<Record<string, "idle" | "busy" | "ok" | "err">>({});

  const dias = [...db.historialTasas].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-14);
  const hoy = dias[dias.length - 1];
  const ayer = dias[dias.length - 2];
  const variacion = hoy && ayer && ayer.usd > 0 ? ((hoy.usd - ayer.usd) / ayer.usd) * 100 : 0;

  const guardarManual = async () => {
    const u = Number(manualUsd), e = Number(manualEur) || +(u * 1.09).toFixed(2);
    if (!u || u <= 0) { toast("Tasa USD inválida", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `La tasa ${fmtBs(u)} quedará como manual y en el historial de hoy.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    aplicarTasaManual(u, e);
    success();
  };

  const guardarCredenciales = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la URL y la anon key antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ supabaseUrl: sbUrl.trim(), supabaseKey: sbKey.trim() });
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
    const ok = await confirm({ title: "¿Subir la base completa a Supabase?", message: "Las tablas en la nube quedarán idénticas al CRM (se reemplaza su contenido).", confirmText: "Sí, Subir" });
    if (!ok) return;
    setTabSync({});
    await syncToCloud((tabla, estado) => setTabSync((v) => ({ ...v, [tabla]: estado })));
  };
  const bajar = async () => {
    const ok = await confirm({ title: "¿Restaurar desde Supabase?", message: "Los datos locales actuales se reemplazarán por los de la nube.", confirmText: "Sí, Restaurar", danger: true });
    if (!ok) return;
    if (await restoreFromCloud()) success("Base restaurada desde Supabase");
  };
  const limpiarHistorial = async () => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: "Se borrará todo el historial de tasas guardado.", confirmText: "Eliminar", danger: true });
    if (!ok) return;
    clearTasaHistorial();
    toast("Historial limpio", "warn");
  };
  const exportarHistorial = () => {
    downloadFile(`historial-tasas-${todayISO()}.csv`, toCSV(["Fecha", "USD", "EUR", "Paralelo", "Fuente"], dias.map((d) => [d.fecha, d.usd.toFixed(4), d.euro.toFixed(4), d.paralelo.toFixed(4), d.fuente])));
    toast("Historial exportado", "ok");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Integraciones</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>APIs externas, base de datos Supabase e historial diario de tasas</p>
        </div>
      </div>

      {/* APIs de tasa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {[{ nombre: "Dólar oficial", url: API_DOLARES, v: fmtBs(tasa.usd), ic: Globe }, { nombre: "Euro oficial", url: API_EUROS, v: tasa.eur > 0 ? fmtBs(tasa.eur) : "—", ic: Euro }].map((a, i) => (
          <div key={a.url} className="card p-5 reveal" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><a.ic size={19} /></span>
              <div className="flex-1">
                <h3 className="font-display font-bold text-[15px] m-0">{a.nombre}</h3>
                <code className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{a.url}</code>
              </div>
              <Badge tone={tasa.apiOk ? "green" : "amber"} dot>{tasa.apiOk ? "En línea" : "Sin conexión"}</Badge>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-display font-bold text-[24px]" style={{ color: "var(--blue)" }}>{a.v}</span>
              <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{tasa.fechaApi ? `Ref: ${tasa.fechaApi.slice(0, 10)}` : ""}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Supabase */}
      <div className="card mb-6 overflow-hidden reveal">
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap" style={{ background: "linear-gradient(135deg, #1b2b23, #0f1d17)", color: "#e7f5ec" }}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(62,207,142,.16)", color: "#3ecf8e" }}><Database size={22} /></span>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-display font-bold text-[17px] m-0">Base de datos · Supabase (PostgreSQL)</h3>
            <p className="text-[12px] m-0" style={{ color: "rgba(231,245,236,.65)" }}>Una tabla por cada módulo del CRM · 14 tablas sincronizables</p>
          </div>
          <span className="badge" style={{ background: "#3ecf8e", color: "#0b3d26" }}>★ RECOMENDADA</span>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <Field label="URL del proyecto" hint="La encuentras en Supabase → Settings → API">
              <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="https://xxxx.supabase.co" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
            </Field>
            <Field label="Anon key (pública)" className="mt-3">
              <div className="flex gap-2">
                <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} type={verKey ? "text" : "password"} placeholder="eyJhbGciOi…" value={sbKey} onChange={(e) => setSbKey(e.target.value)} />
                <button className="icon-btn" onClick={() => setVerKey((v) => !v)} title={verKey ? "Ocultar" : "Mostrar"}>{verKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            <div className="flex gap-2 flex-wrap mt-3">
              <button className="btn btn-primary btn-sm" onClick={guardarCredenciales}><Check size={14} /> Guardar</button>
              <button className="btn btn-ghost btn-sm" onClick={probar} disabled={pingState === "busy"}>
                <Plug size={14} className={pingState === "busy" ? "spin" : ""} />
                {pingState === "busy" ? "Probando…" : pingState === "ok" ? `Conectada ✓ (${pingInfo?.tablas} tablas)` : "Probar conexión"}
              </button>
              <button className="btn btn-gold btn-xs" onClick={() => setVerSql((v) => !v)}><Terminal size={12} /> {verSql ? "Ocultar esquema SQL" : "Ver esquema SQL"}</button>
            </div>
            <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t" style={{ borderColor: "var(--border-soft)" }}>
              <button className="btn btn-soft btn-sm" onClick={subir} disabled={syncing}><UploadCloud size={14} /> {syncing ? "Sincronizando…" : "Subir base completa"}</button>
              <button className="btn btn-ghost btn-sm" onClick={bajar} disabled={syncing || !db.config.supabaseUrl}><DownloadCloud size={14} /> Restaurar desde Supabase</button>
            </div>
            <label className="flex items-center gap-2.5 text-[12.5px] font-semibold cursor-pointer mt-3" style={{ color: "var(--ink-soft)" }}>
              <input type="checkbox" disabled={!db.config.supabaseUrl} checked={db.config.autoSyncCloud} onChange={(e) => { setConfig({ autoSyncCloud: e.target.checked }); toast(e.target.checked ? "Auto-sincronización activada" : "Auto-sincronización apagada", "ok"); }} />
              Sincronizar automáticamente tras cada cambio (2.5 s)
            </label>
            <div className="mt-3 p-3 rounded-xl text-[12px] flex items-start gap-2" style={{ background: syncInfo ? (syncInfo.ok ? "var(--green-tint)" : "var(--red-tint)") : "var(--surface-2)", color: syncInfo ? (syncInfo.ok ? "var(--green)" : "var(--red)") : "var(--ink-faint)" }}>
              <Cloud size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                {syncInfo ? <><b>{syncInfo.msg}</b><br /><span className="tabular-nums" style={{ opacity: .75 }}>{fmtFechaHoraViva(syncInfo.last, nowInt)} · {fmtHaceSegundos(syncInfo.last, nowInt)}</span></> : "Aún no hay sincronizaciones. El CRM funciona sin conexión; Supabase es tu base central en línea."}
              </span>
            </div>
          </div>
          <div>
            <SectionHead title="Mapa de tablas" desc="Cada módulo del CRM → su tabla en PostgreSQL" />
            <div className="grid grid-cols-2 gap-1.5 max-h-[230px] overflow-y-auto pr-1">
              {DB_TABLES.map((t) => {
                const st = tabSync[t.tabla] || "idle";
                const filas = t.tabla === "estudiantes" ? db.estudiantes.length : t.tabla === "escuelas" ? db.escuelas.length : t.tabla === "pagos" ? db.estudiantes.reduce((s, e) => s + e.pagos.length, 0) : t.tabla === "docentes" ? db.docentes.length : t.tabla === "paquetes_escuelas" ? db.paquetesEscuelas.length : null;
                return (
                  <span key={t.tabla} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-colors" style={{ background: st === "ok" ? "var(--green-tint)" : "var(--surface-2)", border: `1px solid ${st === "ok" ? "var(--green)" : st === "err" ? "var(--red)" : "var(--border-soft)"}` }}>
                    {st === "busy" ? <RefreshCw size={11} className="spin" style={{ color: "var(--blue)" }} /> : st === "ok" ? <Check size={11} style={{ color: "var(--green)" }} /> : st === "err" ? <AlertTriangle size={11} style={{ color: "var(--red)" }} /> : <Database size={11} style={{ color: "var(--ink-faint)" }} />}
                    <span className="font-display font-semibold flex-1 truncate" style={{ color: st === "err" ? "var(--red)" : "var(--ink-soft)" }}>{t.tabla}</span>
                    {filas !== null && <b className="tabular-nums" style={{ color: "var(--blue)" }}>{filas}</b>}
                  </span>
                );
              })}
            </div>
            {verSql && (
              <div className="relative mt-3 rounded-xl overflow-hidden" style={{ background: "#0b1626", border: "1px solid #1d3350" }}>
                <div className="flex items-center justify-between px-3.5 py-2" style={{ background: "#0e1d33" }}>
                  <span className="flex items-center gap-2 text-[11px] font-display font-semibold" style={{ color: "#7fa3cf" }}><Terminal size={13} /> esquema.sql · Supabase → SQL Editor</span>
                  <button className="btn btn-xs" style={{ background: "rgba(62,207,142,.15)", color: "#3ecf8e", border: "1px solid rgba(62,207,142,.4)" }} onClick={() => { navigator.clipboard?.writeText(SUPABASE_SQL).then(() => toast("Esquema SQL copiado", "ok")).catch(() => toast("No se pudo copiar", "err")); }}><Copy size={12} /> Copiar</button>
                </div>
                <pre className="m-0 p-4 overflow-x-auto text-[10.5px] leading-relaxed" style={{ color: "#a8c6e8", fontFamily: "ui-monospace, Menlo, monospace", maxHeight: 210 }}>{SUPABASE_SQL}</pre>
              </div>
            )}
            <div className="mt-3 text-[11.5px] flex flex-col gap-1" style={{ color: "var(--ink-faint)" }}>
              <span>1. Crea un proyecto gratis en <b>supabase.com</b></span>
              <span>2. SQL Editor → pega el esquema → Run</span>
              <span>3. Settings → API → copia URL y anon key aquí</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de tasas */}
      <div className="card p-5 mb-6">
        <SectionHead title="Historial diario de tasas" desc="Se guarda un registro por día, automáticamente al consultar la API o al aplicar tasa manual"
          actions={
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={exportarHistorial}><Download size={14} /> CSV</button>
              <button className="btn btn-danger btn-sm" onClick={limpiarHistorial}><Trash2 size={14} /> Limpiar</button>
            </div>
          } />
        {hoy && (
          <div className="flex items-center gap-4 flex-wrap mb-4 p-4 rounded-xl" style={{ background: "var(--surface-2)" }}>
            <div>
              <div className="text-[10.5px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>Cierre de hoy</div>
              <div className="font-display font-bold text-[22px] tabular-nums">{fmtBs(hoy.usd)}</div>
            </div>
            <Badge tone={variacion >= 0 ? "green" : "red"}>{variacion >= 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(2)}% vs ayer</Badge>
            <Badge tone={hoy.fuente === "dolarapi" ? "blue" : "amber"} dot>{hoy.fuente === "dolarapi" ? "ve.dolarapi.com" : "manual"}</Badge>
            <button className="btn btn-soft btn-sm ml-auto" onClick={refreshTasa} disabled={tasaLoading}><RefreshCw size={13} className={tasaLoading ? "spin" : ""} /> Actualizar hoy</button>
          </div>
        )}
        <TasaChart data={dias} />
        <div className="overflow-x-auto mt-4">
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>USD (Bs)</th><th>EUR (Bs)</th><th>Fuente</th><th>Registrada</th><th></th></tr></thead>
            <tbody>
              {[...dias].reverse().map((d) => (
                <tr key={d.id}>
                  <td className="font-display font-semibold text-[13px]">{fmtFecha(d.fecha)}</td>
                  <td className="font-display font-bold tabular-nums" style={{ color: "var(--blue)" }}>{fmtBs(d.usd)}</td>
                  <td className="tabular-nums">{d.euro > 0 ? fmtBs(d.euro) : "—"}</td>
                  <td><Badge tone={d.fuente === "dolarapi" ? "blue" : "amber"} dot>{d.fuente === "dolarapi" ? "DolarAPI" : "Manual"}</Badge></td>
                  <td className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{d.actualizado ? fmtFechaHoraViva(d.actualizado, nowInt) : "—"}</td>
                  <td><button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={async () => { const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: fmtFecha(d.fecha), confirmText: "Eliminar", danger: true }); if (ok) deleteTasaHistorial(d.id); }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OCR */}
      <div className="card p-5">
        <SectionHead title="Motor OCR" desc="Tesseract.js (español) con la marca de Google Cloud Vision — corre en el navegador"
          actions={<button className="btn btn-gold btn-sm" onClick={() => setOcrOpen(true)}><ScanLine size={14} /> Abrir escáner</button>} />
        <div className="flex items-center gap-3 flex-wrap text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          <Badge tone="green" dot>Cuenta activa</Badge>
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} style={{ color: "var(--green)" }} /> {OCR_CRED.correo.split("@")[0]}@•••</span>
          <span className="flex items-center gap-1.5"><KeyRound size={14} style={{ color: "var(--gold-deep)" }} /> CLAVE gestionada en Configuración</span>
          <span className="flex items-center gap-1.5"><Smartphone size={14} style={{ color: "var(--blue)" }} /> Fotos con permisos de cámara del dispositivo</span>
        </div>
      </div>
      <span className="hidden"><Clock size={1} /><Package size={1} /></span>
    </div>
  );
}

function TasaChart({ data }: { data: { fecha: string; usd: number }[] }) {
  if (data.length < 2) return <p className="text-[12.5px]" style={{ color: "var(--ink-faint)" }}>Sin historial suficiente para graficar.</p>;
  const W = 720, H = 150, P = 12;
  const vals = data.map((d) => d.usd);
  const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(0.01, max - min);
  const x = (i: number) => P + (i * (W - P * 2)) / (data.length - 1);
  const y = (v: number) => P + (H - P * 2) * (1 - (v - min) / span);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 150, display: "block" }}>
        <defs>
          <linearGradient id="tasaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={P} x2={W - P} y1={P + (H - P * 2) * f} y2={P + (H - P * 2) * f} stroke="var(--border-soft)" strokeDasharray="4 5" />)}
        <polygon points={area} fill="url(#tasaGrad)" />
        <polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === vals.length - 1 ? 4.5 : 2.5} fill={i === vals.length - 1 ? "var(--gold)" : "var(--blue)"} />)}
      </svg>
      <div className="flex justify-between text-[10.5px] font-semibold px-1" style={{ color: "var(--ink-faint)" }}>
        <span>{fmtFecha(data[0].fecha)}</span>
        <span>mín {fmtBs(min)} · máx {fmtBs(max)}</span>
        <span>{fmtFecha(data[data.length - 1].fecha)}</span>
      </div>
    </div>
  );
}
