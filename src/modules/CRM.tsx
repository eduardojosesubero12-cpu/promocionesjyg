import React, { useEffect, useMemo, useState } from "react";
import { Banknote, Building2, Check, CreditCard, GraduationCap, Mail, MapPin, MessageSquare, Package, Phone, Plus, QrCode, School, Search, Send, Smartphone, Trash2, User, UserPlus, Users, Wallet } from "lucide-react";
import { useApp } from "../lib/store";
import type { Cotizacion, Docente, Escuela, Estudiante, Pago } from "../lib/data";
import { ADICIONALES, ESTADOS_PEDIDO, PAQUETES, getAdicionales, getGrados, getSecciones, getTallas, estudianteTotales, fmtBs, fmtFecha, fmtUSD, ocrNombreCompleto, todayISO, uid, waLink } from "../lib/data";
import { Badge, Bar, Column, DataTable, Drawer, EmptyState, Field, FilterSelect, FormFoot, FormSec, Modal, QR, RowActions, SearchInput, SectionHead, Toolbar, estadoPagoTone, estadoPedidoTone } from "../components/ui";

const escNombre = (db: any, id: string) => db.escuelas.find((e: Escuela) => e.id === id)?.nombre || "—";
const docNombre = (db: any, id: string) => db.docentes.find((d: Docente) => d.id === id)?.nombre || "—";

/* ============================================================
   ESCUELAS
   ============================================================ */
const escVacia = (): Escuela => ({ id: "", nombre: "", director: "", telefono: "", direccion: "", estado: "", municipio: "", anioEscolar: "2025-2026", observaciones: "" });
export function Escuelas() {
  const { db, saveEscuela, deleteEscuela, confirm, success, toast } = useApp();
  const [q, setQ] = useState(""); const [fEstado, setFEstado] = useState(""); const [form, setForm] = useState<Escuela | null>(null); const [errs, setErrs] = useState<Record<string, string>>({});
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.escuelas.filter((e) => (!t || [e.nombre, e.director, e.municipio].some((v) => v.toLowerCase().includes(t))) && (!fEstado || e.estado === fEstado));
  }, [db.escuelas, q, fEstado]);
  const estados = useMemo(() => [...new Set(db.escuelas.map((e) => e.estado).filter(Boolean))], [db.escuelas]);
  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "El nombre es obligatorio";
    setErrs(er); if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveEscuela({ ...form, id: form.id || "es-" + uid() }); success(); setForm(null);
  };
  const eliminar = async (e: Escuela) => {
    const n = db.estudiantes.filter((x) => x.escuelaId === e.id).length;
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: n > 0 ? `"${e.nombre}" tiene ${n} estudiantes asociados.` : `Se eliminará "${e.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return; deleteEscuela(e.id); toast("Registro eliminado", "warn");
  };
  const cols: Column<Escuela>[] = [
    { key: "nombre", header: "Escuela", sortable: true, sortValue: (e) => e.nombre, render: (e) => (<span className="d-flex align-items-center gap-2"><span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 34, height: 34, background: "var(--tint-navy-2)", color: "var(--jyg-navy)", flexShrink: 0 }}><School size={15} /></span><span><span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</span><span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.director || "Sin director"}</span></span></span>) },
    { key: "telefono", header: "Teléfono", sortValue: (e) => e.telefono, render: (e) => <span className="tabular-nums" style={{ fontSize: 12.5 }}>{e.telefono || "—"}</span> },
    { key: "ubicacion", header: "Ubicación", sortable: true, sortValue: (e) => e.municipio, render: (e) => <span style={{ fontSize: 12.5 }}>{e.municipio}, {e.estado}</span> },
    { key: "anio", header: "Año escolar", render: (e) => <Badge tone="blue">{e.anioEscolar}</Badge> },
    { key: "estudiantes", header: "Estudiantes", sortable: true, align: "right", sortValue: (e) => db.estudiantes.filter((x) => x.escuelaId === e.id).length, render: (e) => <b className="tabular-nums" style={{ color: "var(--jyg-navy)" }}>{db.estudiantes.filter((x) => x.escuelaId === e.id).length}</b> },
    { key: "acciones", header: "Acciones", align: "right", render: (e) => <RowActions onVer={() => setForm(e)} onEdit={() => setForm(e)} onDelete={() => eliminar(e)} /> },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Escuelas</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Planteles atendidos por Promociones JyG</p></div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(escVacia()); }}><Plus size={15} /> Nueva escuela</button>
      </div>
      <Toolbar count={lista.length} countLabel={lista.length === 1 ? "escuela" : "escuelas"}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar escuela, director…" />
        <FilterSelect value={fEstado} onChange={setFEstado} allLabel="Todos los estados" options={estados.map((s) => ({ v: s, l: s }))} />
      </Toolbar>
      <div className="card p-4">
        <DataTable columns={cols} rows={lista} rowKey={(e) => e.id} empty={<EmptyState icon={School} title="Sin escuelas" text="Registra el primer plantel para comenzar." />} />
      </div>
      {form && (
        <Modal open onClose={() => setForm(null)} size="lg" title={form.id ? "Editar escuela" : "Nueva escuela"}>
          <div className="f-grid">
            <FormSec icon={<School size={15} />}>Identificación del plantel</FormSec>
            <Field label="Nombre de la escuela" required error={errs.nombre} span="c-8"><input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus placeholder="U.E. Simón Bolívar" /></Field>
            <Field label="Director(a)" span="c-4"><input className="input" value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} placeholder="Nombre del director" /></Field>
            <Field label="Teléfono" span="c-4"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="0414-000.00.00" /></Field>
            <Field label="Municipio" span="c-4"><input className="input" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></Field>
            <Field label="Estado" span="c-4"><input className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="Carabobo" /></Field>
            <Field label="Año escolar" span="c-4"><input className="input" value={form.anioEscolar} onChange={(e) => setForm({ ...form, anioEscolar: e.target.value })} /></Field>
            <Field label="Dirección" span="c-8"><input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Av. / calle, sector" /></Field>
            <Field label="Observaciones" span="c-12"><textarea className="textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          </div>
          <FormFoot onCancel={() => setForm(null)} onSave={guardar} saveDisabled={!form.nombre.trim()} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   DOCENTES
   ============================================================ */
const docVacio = (): Docente => ({ id: "", nombre: "", telefono: "", escuelaId: "", correo: "", observaciones: "" });
export function Docentes() {
  const { db, saveDocente, deleteDocente, confirm, success, toast } = useApp();
  const [q, setQ] = useState(""); const [fEsc, setFEsc] = useState(""); const [form, setForm] = useState<Docente | null>(null); const [errs, setErrs] = useState<Record<string, string>>({});
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.docentes.filter((d) => (!t || [d.nombre, d.correo].some((v) => v.toLowerCase().includes(t))) && (!fEsc || d.escuelaId === fEsc));
  }, [db.docentes, q, fEsc]);
  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "El nombre es obligatorio";
    setErrs(er); if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveDocente({ ...form, id: form.id || "do-" + uid() }); success(); setForm(null);
  };
  const eliminar = async (d: Docente) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a "${d.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return; deleteDocente(d.id); toast("Registro eliminado", "warn");
  };
  const cols: Column<Docente>[] = [
    { key: "nombre", header: "Docente", sortable: true, sortValue: (d) => d.nombre, render: (d) => (<span className="d-flex align-items-center gap-2"><span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 34, height: 34, background: "var(--tint-ok)", color: "var(--ok)", fontSize: 12, flexShrink: 0 }}>{d.nombre.replace("Prof. ", "").split(" ").map((p) => p[0]).slice(0, 2).join("")}</span><span><span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{d.nombre}</span><span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{d.correo || "sin correo"}</span></span></span>) },
    { key: "escuela", header: "Escuela", sortable: true, sortValue: (d) => escNombre(db, d.escuelaId), render: (d) => <span style={{ fontSize: 12.5 }}>{escNombre(db, d.escuelaId)}</span> },
    { key: "telefono", header: "Teléfono", render: (d) => <span className="tabular-nums" style={{ fontSize: 12.5 }}>{d.telefono || "—"}</span> },
    { key: "estudiantes", header: "Estudiantes", sortable: true, align: "right", sortValue: (d) => db.estudiantes.filter((x) => x.docenteId === d.id).length, render: (d) => <b className="tabular-nums" style={{ color: "var(--jyg-navy)" }}>{db.estudiantes.filter((x) => x.docenteId === d.id).length}</b> },
    { key: "acciones", header: "Acciones", align: "right", render: (d) => <RowActions onVer={() => setForm(d)} onEdit={() => setForm(d)} onDelete={() => eliminar(d)} /> },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Profesores</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Docentes enlace de cada plantel</p></div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(docVacio()); }}><Plus size={15} /> Nuevo profesor</button>
      </div>
      <Toolbar count={lista.length} countLabel={lista.length === 1 ? "docente" : "docentes"}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar docente…" />
        <FilterSelect value={fEsc} onChange={setFEsc} allLabel="Todas las escuelas" options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} width={200} />
      </Toolbar>
      <div className="card p-4">
        <DataTable columns={cols} rows={lista} rowKey={(d) => d.id} empty={<EmptyState icon={GraduationCap} title="Sin docentes" text="Registra docentes para asociarlos a estudiantes." />} />
      </div>
      {form && (
        <Modal open onClose={() => setForm(null)} size="lg" title={form.id ? "Editar profesor" : "Nuevo profesor"}>
          <div className="f-grid">
            <FormSec icon={<GraduationCap size={15} />}>Datos del docente</FormSec>
            <Field label="Nombre completo" required error={errs.nombre} span="c-6"><input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus placeholder="Prof. María Pérez" /></Field>
            <Field label="Escuela" span="c-6"><select className="select" value={form.escuelaId} onChange={(e) => setForm({ ...form, escuelaId: e.target.value })}><option value="">— Seleccione —</option>{db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></Field>
            <Field label="Teléfono" span="c-4"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="0414-000.00.00" /></Field>
            <Field label="Correo" span="c-8"><input className="input" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="correo@ejemplo.com" /></Field>
            <Field label="Observaciones" span="c-12"><textarea className="textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          </div>
          <FormFoot onCancel={() => setForm(null)} onSave={guardar} saveDisabled={!form.nombre.trim()} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   ESTUDIANTES (formulario adaptable + expediente)
   ============================================================ */
const nuevoEst = (seq: number): Estudiante => ({
  id: "", pedido: `P-${seq}`, nombre: "", telefono: "", representante: "", ci: "", escuelaId: "", docenteId: "",
  grado: "Bachiller", seccion: "A", paqueteId: "premium", precioPaquete: PAQUETES.premium.precioBase,
  adicionales: [], pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "", observaciones: "",
  codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
});
export function EstudianteForm({ initial, onClose }: { initial: Partial<Estudiante>; onClose: () => void }) {
  const { db, saveEstudiante, success, ocrDraft, setOcrDraft, tasa } = useApp();
  const [f, setF] = useState<Estudiante>(() => {
    const base = { ...nuevoEst(db.seqPedido), ...initial } as Estudiante;
    if (ocrDraft && !base.nombre) { base.nombre = ocrNombreCompleto(ocrDraft); base.ci = ocrDraft.ci || base.ci; }
    return base;
  });
  useEffect(() => { if (ocrDraft) setOcrDraft(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [errs, setErrs] = useState<Record<string, string>>({});
  const t = estudianteTotales(f);
  const set = (p: Partial<Estudiante>) => setF((x) => ({ ...x, ...p }));
  const guardar = async () => {
    const er: Record<string, string> = {};
    if (!f.nombre.trim()) er.nombre = "El nombre es obligatorio";
    setErrs(er); if (Object.keys(er).length) return;
    const ok = await confirmGuardar();
    if (!ok) return;
    saveEstudiante({ ...f, id: f.id || "e-" + uid() }); success(); onClose();
  };
  const { confirm } = useApp();
  const confirmGuardar = () => confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
  const alCambiarPaquete = (id: string) => set({ paqueteId: id, precioPaquete: PAQUETES[id]?.precioBase ?? f.precioPaquete });
  return (
    <Modal open onClose={onClose} size="xl" title={f.id ? `Editar estudiante · ${f.pedido}` : `Nuevo estudiante · ${f.pedido}`}>
      <div className="f-grid">
        <FormSec icon={<User size={15} />}>Información básica</FormSec>
        <Field label="Nombre del alumno" required error={errs.nombre} span="c-6"><input className={`input ${errs.nombre ? "err" : ""}`} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} autoFocus placeholder="Nombre y apellido" /></Field>
        <Field label="Cédula" span="c-3"><input className="input" value={f.ci} onChange={(e) => set({ ci: e.target.value })} placeholder="V-00.000.000" /></Field>
        <Field label="Fecha de nacimiento" span="c-3"><input type="date" className="input" value={f.fechaNacimiento || ""} onChange={(e) => set({ fechaNacimiento: e.target.value })} /></Field>
        <Field label="Teléfono del alumno" span="c-4"><input className="input" value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} placeholder="0414-000.00.00" /></Field>
        <Field label="Correo" span="c-4"><input className="input" value={f.email || ""} onChange={(e) => set({ email: e.target.value })} placeholder="correo@ejemplo.com" /></Field>
        <Field label="Dirección" span="c-4"><input className="input" value={f.direccion || ""} onChange={(e) => set({ direccion: e.target.value })} placeholder="Sector, calle, casa" /></Field>

        <FormSec icon={<Users size={15} />}>Representantes</FormSec>
        <Field label="Representante" span="c-4"><input className="input" value={f.representante} onChange={(e) => set({ representante: e.target.value })} placeholder="Nombre del representante" /></Field>
        <Field label="C.I. del representante" span="c-4"><input className="input" value={f.representanteCi || ""} onChange={(e) => set({ representanteCi: e.target.value })} placeholder="V-00.000.000" /></Field>
        <Field label="Teléfono del representante" span="c-4"><input className="input" value={f.telefonoRepresentante || ""} onChange={(e) => set({ telefonoRepresentante: e.target.value })} placeholder="0414-000.00.00" /></Field>
        <Field label="Tutor 2 (opcional)" span="c-4"><input className="input" value={f.tutor2 || ""} onChange={(e) => set({ tutor2: e.target.value })} /></Field>
        <Field label="Alergias / salud" span="c-4"><input className="input" value={f.alergias || ""} onChange={(e) => set({ alergias: e.target.value })} placeholder="Ninguna" /></Field>

        <FormSec icon={<School size={15} />}>Académico</FormSec>
        <Field label="Escuela" span="c-4"><select className="select" value={f.escuelaId} onChange={(e) => set({ escuelaId: e.target.value })}><option value="">— Seleccione —</option>{db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></Field>
        <Field label="Docente" span="c-4"><select className="select" value={f.docenteId} onChange={(e) => set({ docenteId: e.target.value })}><option value="">— Seleccione —</option>{db.docentes.filter((d) => !f.escuelaId || d.escuelaId === f.escuelaId).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Field>
        <Field label="Grado" span="c-2"><select className="select" value={f.grado} onChange={(e) => set({ grado: e.target.value })}>{getGrados(db.config).map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Sección" span="c-2"><select className="select" value={f.seccion} onChange={(e) => set({ seccion: e.target.value })}>{getSecciones(db.config).map((s) => <option key={s}>{s}</option>)}</select></Field>

        <FormSec icon={<Package size={15} />}>Paquete y precio</FormSec>
        <Field label="Paquete" span="c-4"><select className="select" value={f.paqueteId} onChange={(e) => alCambiarPaquete(e.target.value)}>{Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — {fmtUSD(p.precioBase)}</option>)}</select></Field>
        <Field label="Precio negociado (USD)" span="c-4"><input type="number" className="input" value={f.precioPaquete} onChange={(e) => set({ precioPaquete: Number(e.target.value) || 0 })} /></Field>
        <Field label="Talla de camisa" span="c-2"><select className="select" value={f.tallaCamisa || ""} onChange={(e) => set({ tallaCamisa: e.target.value })}><option value="">—</option>{getTallas(db.config).map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Talla de anillo" span="c-2"><input className="input" value={f.tallaAnillo || ""} onChange={(e) => set({ tallaAnillo: e.target.value })} placeholder="18" /></Field>
        <Field label="Observaciones" span="c-12"><textarea className="textarea" value={f.observaciones} onChange={(e) => set({ observaciones: e.target.value })} /></Field>
      </div>
      <FormFoot total={fmtUSD(t.total)} sub={`≈ ${fmtBs(t.total * tasa.usd)} a tasa del día`} onCancel={onClose} onSave={guardar} saveDisabled={!f.nombre.trim()} />
    </Modal>
  );
}

function Expediente({ est, onClose }: { est: Estudiante; onClose: () => void }) {
  const { db, saveEstudiante, addPago, deletePago, setPedidoEstado, saveCodigos, confirm, success, toast, tasa } = useApp();
  const [tab, setTab] = useState<"datos" | "pagos" | "pedido" | "qr">("datos");
  const [pago, setPago] = useState({ monto: "", metodo: "Divisas $", bs: false, referencia: "", fecha: todayISO(), observacion: "" });
  const [cod, setCod] = useState(est.codigos);
  const [extra, setExtra] = useState(est.codigosExtra || []);
  const [formOpen, setFormOpen] = useState(false);
  const t = estudianteTotales(est);
  const idxPedido = ESTADOS_PEDIDO.indexOf(est.estadoPedido);
  const alTasa = (bs: boolean, monto: number) => bs ? monto / tasa.usd : monto;
  const guardarPago = async () => {
    const m = Number(pago.monto);
    if (!m || m <= 0) { toast("Indica un monto válido", "err"); return; }
    const usd = alTasa(pago.bs, m);
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Abono de ${pago.bs ? fmtBs(m) : fmtUSD(m)} (≈ ${fmtUSD(usd)}) a tasa ${fmtBs(tasa.usd)}.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    addPago(est.id, { id: "pg-" + uid(), fecha: pago.fecha, monto: m, metodo: pago.metodo, bs: pago.bs, tasa: tasa.usd, usd, referencia: pago.referencia, observacion: pago.observacion });
    success("Abono registrado · saldo actualizado");
    setPago({ monto: "", metodo: "Divisas $", bs: false, referencia: "", fecha: todayISO(), observacion: "" });
  };
  const quitarPago = async (p: Pago) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: "Se eliminará el abono y se recalculará el saldo.", confirmText: "Eliminar", danger: true });
    if (!ok) return; deletePago(est.id, p.id); toast("Abono eliminado", "warn");
  };
  const avanzar = async (estado: string) => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `El pedido pasará a "${estado}".`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setPedidoEstado(est.id, estado);
    success(estado === "Entregado" ? "Pedido entregado · fecha registrada" : "Estado actualizado");
  };
  const guardarCod = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique los códigos de fotografía antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveCodigos(est.id, cod, extra); success("Códigos guardados");
  };
  const metodos = [{ nombre: "Divisas $", bs: false }, { nombre: "Pago Móvil", bs: true }, { nombre: "Zelle", bs: false }, { nombre: "Efectivo Bs", bs: true }, { nombre: "Trueque", bs: false }];
  return (
    <Drawer open onClose={onClose} title={<span className="d-flex align-items-center gap-2"><span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 36, height: 36, background: "var(--jyg-navy)", color: "#ffd970", fontSize: 13 }}>{est.nombre[0]}</span>{est.nombre} <Badge tone="blue">{est.pedido}</Badge></span>}>
      {/* Resumen */}
      <div className="row g-2 mb-3">
        <div className="col-4"><div className="card p-3 text-center"><div className="font-display fw-bold tabular-nums" style={{ color: "var(--jyg-navy)", fontSize: 17 }}>{fmtUSD(t.total)}</div><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>Total</div></div></div>
        <div className="col-4"><div className="card p-3 text-center"><div className="font-display fw-bold tabular-nums" style={{ color: "var(--ok)", fontSize: 17 }}>{fmtUSD(t.abonado)}</div><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>Abonado</div></div></div>
        <div className="col-4"><div className="card p-3 text-center"><div className="font-display fw-bold tabular-nums" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)", fontSize: 17 }}>{fmtUSD(t.saldo)}</div><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>Saldo</div></div></div>
      </div>
      <Bar pct={t.total ? (t.abonado / t.total) * 100 : 0} color={t.saldo > 0 ? "var(--warn)" : "var(--ok)"} />
      <div className="d-flex justify-content-between mt-1 mb-3" style={{ fontSize: 11, color: "var(--ink-faint)" }}><span>Estado: <b style={{ color: "var(--ink)" }}>{t.estadoPago}</b></span><span className="tabular-nums">Saldo en Bs: <b className="tabular-nums">{fmtBs(t.saldo * tasa.usd)}</b></span></div>

      {/* Tabs */}
      <div className="d-flex gap-1 mb-3 rounded-3 p-1" style={{ background: "var(--card-bg-2)" }}>
        {([["datos", "Datos"], ["pagos", "Pagos"], ["pedido", "Pedido"], ["qr", "QR"]] as const).map(([k, l]) => (
          <button key={k} className="btn btn-sm flex-grow-1" style={tab === k ? { background: "var(--jyg-navy)", color: "#fff" } : { background: "transparent", color: "var(--ink-soft)" }} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "datos" && (
        <div>
          <div className="row g-2" style={{ fontSize: 13 }}>
            {[["Cédula", est.ci || "S/C"], ["Teléfono", est.telefono || "—"], ["Representante", est.representante || "—"], ["Tel. representante", est.telefonoRepresentante || "—"], ["Escuela", escNombre(db, est.escuelaId)], ["Docente", docNombre(db, est.docenteId)], ["Grado / Sección", `${est.grado} "${est.seccion}"`], ["Nacimiento", est.fechaNacimiento ? fmtFecha(est.fechaNacimiento) : "—"], ["Talla camisa", est.tallaCamisa || "—"], ["Registro", fmtFecha(est.fechaRegistro)]].map(([k, v]) => (
              <div key={k} className="col-6"><div className="p-2 rounded-3" style={{ background: "var(--card-bg-2)" }}><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>{k}</div><b style={{ fontSize: 12.5 }}>{v}</b></div></div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm mt-3" onClick={() => setFormOpen(true)}><UserPlus size={14} /> Editar información</button>
        </div>
      )}

      {tab === "pagos" && (
        <div>
          <div className="card p-3 mb-3" style={{ background: "var(--card-bg-2)" }}>
            <div className="f-grid" style={{ gap: 10 }}>
              <Field label={`Monto (${pago.bs ? "Bs" : "USD"})`} span="c-4"><input type="number" className="input" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} placeholder="0.00" /></Field>
              <Field label="Método" span="c-4"><select className="select" value={pago.metodo} onChange={(e) => { const m = metodos.find((x) => x.nombre === e.target.value); setPago({ ...pago, metodo: e.target.value, bs: m?.bs ?? false }); }}>{metodos.map((m) => <option key={m.nombre}>{m.nombre}</option>)}</select></Field>
              <Field label="Fecha" span="c-4"><input type="date" className="input" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></Field>
              <Field label="Referencia" span="c-6"><input className="input" value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} placeholder="N° de referencia" /></Field>
              <Field label="Observación" span="c-6"><input className="input" value={pago.observacion} onChange={(e) => setPago({ ...pago, observacion: e.target.value })} /></Field>
            </div>
            <div className="d-flex align-items-center justify-content-between mt-2 flex-wrap gap-2">
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Tasa del día <b className="tabular-nums">{fmtBs(tasa.usd)}</b> → equivale a <b className="tabular-nums">{pago.monto ? (pago.bs ? fmtUSD(alTasa(true, Number(pago.monto))) : fmtBs(Number(pago.monto) * tasa.usd)) : "—"}</b></span>
              <button className="btn btn-gold btn-sm" onClick={guardarPago}><Banknote size={14} /> Registrar abono</button>
            </div>
          </div>
          {est.pagos.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Sin abonos registrados.</p> : (
            <div className="d-flex flex-column gap-2">
              {[...est.pagos].reverse().map((p) => (
                <div key={p.id} className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: "var(--card-bg-2)" }}>
                  <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 34, height: 34, background: p.bs ? "var(--tint-warn)" : "var(--tint-ok)", color: p.bs ? "var(--warn)" : "var(--ok)", flexShrink: 0 }}>{p.bs ? <Banknote size={15} /> : <CreditCard size={15} />}</span>
                  <span className="flex-grow-1" style={{ minWidth: 0 }}>
                    <span className="d-block font-display fw-semibold tabular-nums" style={{ fontSize: 13 }}>{p.bs ? fmtBs(p.monto) : fmtUSD(p.usd)} <span style={{ color: "var(--ink-faint)", fontWeight: 400, fontSize: 11 }}>≈ {p.bs ? fmtUSD(p.usd) : fmtBs(p.monto * p.tasa)}</span></span>
                    <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.metodo} · {fmtFecha(p.fecha)} · tasa {fmtBs(p.tasa)}{p.referencia ? ` · Ref ${p.referencia}` : ""}</span>
                  </span>
                  <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => quitarPago(p)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "pedido" && (
        <div>
          <div className="d-flex align-items-center mb-3" style={{ fontSize: 13 }}><Package size={16} style={{ color: "var(--jyg-navy)", marginRight: 8 }} /><b>{PAQUETES[est.paqueteId].nombre}</b><span style={{ color: "var(--ink-faint)", marginLeft: 8 }}>{fmtUSD(est.precioPaquete)}</span></div>
          <div className="mb-3">
            {ESTADOS_PEDIDO.map((s, i) => (
              <div key={s} className="d-flex align-items-center gap-2 py-1">
                <span className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: 22, height: 22, fontSize: 10, fontWeight: 700, background: i < idxPedido ? "var(--ok)" : i === idxPedido ? "var(--jyg-gold)" : "var(--card-bg-2)", color: i <= idxPedido ? "#fff" : "var(--ink-faint)", flexShrink: 0 }}>{i < idxPedido ? <Check size={12} /> : i + 1}</span>
                <span style={{ fontSize: 13, color: i === idxPedido ? "var(--jyg-gold-deep)" : i < idxPedido ? "var(--ink)" : "var(--ink-faint)", fontWeight: i === idxPedido ? 600 : 400 }}>{s}</span>
                {i === idxPedido && <Badge tone="gold" dot>actual</Badge>}
                {s === "Entregado" && est.fechaEntrega && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{fmtFecha(est.fechaEntrega)}</span>}
              </div>
            ))}
          </div>
          {idxPedido < ESTADOS_PEDIDO.length - 1 && <button className="btn btn-primary btn-sm" onClick={() => avanzar(ESTADOS_PEDIDO[idxPedido + 1])}>Pasar a "{ESTADOS_PEDIDO[idxPedido + 1]}"</button>}
          <div className="mt-3"><SectionHead title="Adicionales" /><p style={{ fontSize: 13, color: "var(--ink-soft)" }}>{est.adicionales.length ? est.adicionales.map((a) => `${a.cantidad}× ${a.producto}${a.talla ? ` (${a.talla})` : ""}`).join(", ") : "Sin adicionales"}</p></div>
        </div>
      )}

      {tab === "qr" && (
        <div className="text-center">
          <div className="d-inline-block p-3 rounded-4" style={{ background: "#fff", border: "1.5px solid var(--line)" }}><QR value={`JYG|${est.pedido}|${est.nombre}|${est.ci}|${escNombre(db, est.escuelaId)}|${est.grado}-${est.seccion}|${PAQUETES[est.paqueteId].nombre}|Total ${fmtUSD(t.total)}|Saldo ${fmtUSD(t.saldo)}`} size={180} /></div>
          <p className="mt-2 mb-1 font-display fw-semibold" style={{ fontSize: 13.5 }}>{est.pedido} · {est.nombre}</p>
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>Contiene pedido, identidad, paquete, totales y saldo. Se actualiza al guardar.</p>
          <button className="btn btn-soft btn-sm mt-2" onClick={() => saveEstudiante(est)}><QrCode size={14} /> Refrescar QR</button>
        </div>
      )}

      {/* Códigos de fotografía (siempre visibles abajo en la tab pedido) */}
      {tab === "pedido" && (
        <div className="mt-3">
          <SectionHead title="Códigos de fotografía" desc="Localiza rápido las fotos en producción" actions={<button className="btn btn-gold btn-xs" onClick={() => setExtra([...extra, { id: uid(), label: "", codigo: "" }])}><Plus size={12} /> Código adicional</button>} />
          <div className="f-grid" style={{ gap: 8 }}>
            {([["carnetAlumno", "Carnet Alumno"], ["carnetRep", "Carnet Representante"], ["firmaLibro", "Firma Libro"], ["togaBirrete", "Toga y Birrete"], ["fotoLibre", "Foto Libre"], ["fotoAdicional", "Foto Adicional"]] as const).map(([k, l]) => (
              <Field key={k} label={l} span="c-6"><input className="input" value={cod[k]} onChange={(e) => setCod({ ...cod, [k]: e.target.value })} placeholder="Código" /></Field>
            ))}
            {extra.map((x, i) => (
              <div key={x.id} className="c-6 d-flex gap-1 align-items-end">
                <input className="input" value={x.label} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} placeholder="Concepto" style={{ flex: 1 }} />
                <input className="input" value={x.codigo} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, codigo: e.target.value } : y)))} placeholder="Código" style={{ flex: 1 }} />
                <button className="icon-btn danger" style={{ width: 36, height: 38 }} onClick={() => setExtra(extra.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm mt-2" onClick={guardarCod}><Check size={14} /> Guardar códigos</button>
        </div>
      )}

      {formOpen && <EstudianteForm initial={est} onClose={() => setFormOpen(false)} />}
    </Drawer>
  );
}

export function Estudiantes() {
  const { db, param, setParam, deleteEstudiante, confirm, toast, tasa } = useApp();
  const [q, setQ] = useState(""); const [fEsc, setFEsc] = useState(""); const [fGrado, setFGrado] = useState(""); const [fPago, setFPago] = useState("");
  const [formOpen, setFormOpen] = useState<Partial<Estudiante> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { if (param?.open) { setOpenId(param.open); setParam(null); } if (param?.openNew) { setFormOpen({}); setParam(null); } }, [param]); // eslint-disable-line react-hooks/exhaustive-deps
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.estudiantes.filter((e) => {
      const tt = estudianteTotales(e);
      return (!t || [e.nombre, e.ci, e.pedido, e.representante].some((v) => v.toLowerCase().includes(t)))
        && (!fEsc || e.escuelaId === fEsc) && (!fGrado || e.grado === fGrado) && (!fPago || tt.estadoPago === fPago);
    });
  }, [db.estudiantes, q, fEsc, fGrado, fPago]);
  const eliminar = async (e: Estudiante) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a "${e.nombre}" con sus pagos y abonos.`, confirmText: "Eliminar", danger: true });
    if (!ok) return; deleteEstudiante(e.id); toast("Registro eliminado", "warn");
  };
  const cols: Column<Estudiante>[] = [
    { key: "nombre", header: "Estudiante", sortable: true, sortValue: (e) => e.nombre, render: (e) => (<span className="d-flex align-items-center gap-2"><span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 34, height: 34, background: "var(--tint-navy-2)", color: "var(--jyg-navy)", fontSize: 12, flexShrink: 0 }}>{e.nombre[0]}</span><span><span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</span><span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.ci || "S/C"} · {e.representante || "sin representante"}</span></span></span>) },
    { key: "pedido", header: "Pedido", sortable: true, sortValue: (e) => e.pedido, render: (e) => <b className="tabular-nums" style={{ fontSize: 12.5 }}>{e.pedido}</b> },
    { key: "grado", header: "Grado", sortable: true, sortValue: (e) => `${e.grado}-${e.seccion}`, render: (e) => <span style={{ fontSize: 12.5 }}>{e.grado} “{e.seccion}”</span> },
    { key: "paquete", header: "Paquete", sortable: true, sortValue: (e) => PAQUETES[e.paqueteId].nombre, render: (e) => <Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "green" : "blue"}>{PAQUETES[e.paqueteId].nombre}</Badge> },
    { key: "saldo", header: "Saldo", sortable: true, align: "right", sortValue: (e) => estudianteTotales(e).saldo, render: (e) => { const s = estudianteTotales(e).saldo; return <span className="tabular-nums font-display fw-bold" style={{ color: s > 0 ? "var(--danger)" : "var(--ok)", fontSize: 12.5 }}>{fmtUSD(s)}<span className="d-block" style={{ fontSize: 10, color: "var(--ink-faint)", fontWeight: 400 }}>{fmtBs(s * tasa.usd)}</span></span>; } },
    { key: "estado", header: "Estado", sortable: true, sortValue: (e) => e.estadoPedido, render: (e) => <Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge> },
    { key: "acciones", header: "Acciones", align: "right", render: (e) => <RowActions onVer={() => setOpenId(e.id)} onEdit={() => setFormOpen(e)} onDelete={() => eliminar(e)} /> },
  ];
  const abierto = db.estudiantes.find((e) => e.id === openId);
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Estudiantes</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Registro, pagos, pedido y QR de cada graduando</p></div>
        <button className="btn btn-primary" onClick={() => setFormOpen({})}><Plus size={15} /> Nuevo estudiante</button>
      </div>
      <Toolbar count={lista.length} countLabel={lista.length === 1 ? "estudiante" : "estudiantes"}>
        <SearchInput value={q} onChange={setQ} placeholder="Nombre, cédula, pedido…" />
        <FilterSelect value={fEsc} onChange={setFEsc} allLabel="Todas las escuelas" options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} width={190} />
        <FilterSelect value={fGrado} onChange={setFGrado} allLabel="Todos los grados" options={getGrados(db.config).map((g) => ({ v: g, l: g }))} width={150} />
        <FilterSelect value={fPago} onChange={setFPago} allLabel="Estado de pago" options={["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => ({ v: s, l: s }))} width={160} />
      </Toolbar>
      <div className="card p-4">
        <DataTable columns={cols} rows={lista} rowKey={(e) => e.id} onRowClick={(e) => setOpenId(e.id)} empty={<EmptyState icon={Users} title="Sin estudiantes" text="Registra el primer estudiante o usa el escáner de cédula." />} />
      </div>
      {formOpen && <EstudianteForm initial={formOpen} onClose={() => setFormOpen(null)} />}
      {abierto && <Expediente est={abierto} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/* ============================================================
   CLIENTES
   ============================================================ */
export function Clientes() {
  const { db, setRoute } = useApp();
  const [tab, setTab] = useState<"representantes" | "escuelas">("representantes");
  const [q, setQ] = useState("");
  const reps = useMemo(() => {
    const map = new Map<string, { nombre: string; telefono: string; hijos: Estudiante[] }>();
    for (const e of db.estudiantes) {
      const key = (e.representante || e.nombre).toLowerCase() + "|" + e.telefono;
      if (!map.has(key)) map.set(key, { nombre: e.representante || e.nombre, telefono: e.telefono, hijos: [] });
      map.get(key)!.hijos.push(e);
    }
    const t = q.trim().toLowerCase();
    return [...map.values()].filter((r) => !t || r.nombre.toLowerCase().includes(t) || r.telefono.includes(t))
      .map((r) => ({ ...r, total: r.hijos.reduce((s, x) => s + estudianteTotales(x).total, 0), saldo: r.hijos.reduce((s, x) => s + estudianteTotales(x).saldo, 0) }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [db.estudiantes, q]);
  const escs = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.escuelas.filter((e) => !t || e.nombre.toLowerCase().includes(t)).map((e) => {
      const hijos = db.estudiantes.filter((x) => x.escuelaId === e.id);
      return { e, n: hijos.length, vendido: hijos.reduce((s, x) => s + estudianteTotales(x).total, 0), saldo: hijos.reduce((s, x) => s + estudianteTotales(x).saldo, 0) };
    });
  }, [db.escuelas, db.estudiantes, q]);
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Clientes</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Representantes y planteles con su estado de cuenta</p></div>
        <div className="d-flex rounded-pill p-1 gap-1" style={{ background: "var(--card-bg-2)" }}>
          {([["representantes", "Representantes"], ["escuelas", "Escuelas"]] as const).map(([k, l]) => (
            <button key={k} className="btn btn-sm" style={tab === k ? { background: "var(--jyg-navy)", color: "#fff" } : { background: "transparent", color: "var(--ink-soft)" }} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      <Toolbar count={tab === "representantes" ? reps.length : escs.length} countLabel={tab === "representantes" ? "representantes" : "planteles"}>
        <SearchInput value={q} onChange={setQ} placeholder={tab === "representantes" ? "Buscar representante…" : "Buscar escuela…"} />
      </Toolbar>
      {tab === "representantes" ? (
        <div className="card p-4">
          <DataTable
            columns={[
              { key: "nombre", header: "Representante", sortable: true, sortValue: (r: any) => r.nombre, render: (r: any) => (<span className="d-flex align-items-center gap-2"><span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 34, height: 34, background: "var(--tint-gold)", color: "var(--jyg-gold-deep)", fontSize: 11, flexShrink: 0 }}>{r.nombre.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}</span><span><span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{r.nombre}</span><span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}><Phone size={10} style={{ verticalAlign: "-1px" }} /> {r.telefono || "sin teléfono"}</span></span></span>) },
              { key: "hijos", header: "Estudiantes", render: (r: any) => <span style={{ fontSize: 12 }}>{r.hijos.map((h: Estudiante) => h.nombre.split(" ")[0]).join(", ")}</span> },
              { key: "total", header: "Total", align: "right", sortable: true, sortValue: (r: any) => r.total, render: (r: any) => <b className="tabular-nums" style={{ fontSize: 12.5 }}>{fmtUSD(r.total)}</b> },
              { key: "saldo", header: "Saldo", align: "right", sortable: true, sortValue: (r: any) => r.saldo, render: (r: any) => <b className="tabular-nums" style={{ color: r.saldo > 0 ? "var(--danger)" : "var(--ok)", fontSize: 12.5 }}>{fmtUSD(r.saldo)}</b> },
              { key: "acc", header: "", align: "right", render: (r: any) => r.telefono ? <a className="btn btn-soft btn-xs" style={{ textDecoration: "none" }} href={waLink(r.telefono, `Hola ${r.nombre}, le saluda Promociones JyG 🎓.`)} target="_blank" rel="noreferrer"><Send size={12} /> WhatsApp</a> : null },
            ] as Column<any>[]}
            rows={reps} rowKey={(r: any) => r.nombre + r.telefono}
            empty={<EmptyState icon={Users} title="Sin clientes" text="Los representantes aparecen al registrar estudiantes." />}
          />
        </div>
      ) : (
        <div className="row g-3">
          {escs.map(({ e, n, vendido, saldo }, i) => (
            <div key={e.id} className="col-12 col-md-6 col-xl-4">
              <div className="card p-4 h-100 card-lift reveal" style={{ animationDelay: `${i * 50}ms`, cursor: "pointer" }} onClick={() => setRoute("escuelas")}>
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}><Building2 size={20} /></span>
                  <Badge tone={saldo > 0 ? "amber" : "green"} dot>{saldo > 0 ? "Por cobrar" : "Al día"}</Badge>
                </div>
                <h3 className="font-display fw-bold m-0" style={{ fontSize: 15.5 }}>{e.nombre}</h3>
                <p className="mt-1 mb-3" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{e.municipio}, {e.estado} · Dir. {e.director}</p>
                <div className="row g-2 pt-3 border-top" style={{ borderColor: "var(--line-soft)" }}>
                  <div className="col-4"><div className="font-display fw-bold tabular-nums" style={{ fontSize: 16 }}>{n}</div><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>Estudiantes</div></div>
                  <div className="col-4"><div className="font-display fw-bold tabular-nums" style={{ fontSize: 16, color: "var(--jyg-navy)" }}>{fmtUSD(vendido)}</div><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>Vendido</div></div>
                  <div className="col-4"><div className="font-display fw-bold tabular-nums" style={{ fontSize: 16, color: saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(saldo)}</div><div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>Saldo</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <span className="d-none"><MapPin size={1} /><Mail size={1} /><MessageSquare size={1} /><Search size={1} /><Smartphone size={1} /></span>
    </div>
  );
}

/* ============================================================
   VENTAS · PEDIDOS
   ============================================================ */
export function Ventas() {
  const { db, setRoute, deleteEstudiante, confirm, toast, tasa } = useApp();
  const [q, setQ] = useState(""); const [fEstado, setFEstado] = useState("");
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...db.estudiantes].filter((e) => (!t || [e.nombre, e.pedido, e.ci].some((v) => v.toLowerCase().includes(t))) && (!fEstado || e.estadoPedido === fEstado)).sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  }, [db.estudiantes, q, fEstado]);
  const eliminar = async (e: Estudiante) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará el pedido ${e.pedido} de "${e.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return; deleteEstudiante(e.id); toast("Pedido eliminado", "warn");
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Ventas · Pedidos</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Cada estudiante tiene un pedido con su pipeline de producción</p></div>
        <button className="btn btn-primary" onClick={() => setRoute("estudiantes", { openNew: true })}><Plus size={15} /> Nuevo pedido</button>
      </div>
      <div className="row g-2 mb-3">
        {ESTADOS_PEDIDO.map((s) => {
          const n = db.estudiantes.filter((e) => e.estadoPedido === s).length;
          const activo = fEstado === s;
          return (
            <div key={s} className="col-6 col-md">
              <button className="card p-3 w-100 border-0 text-start" style={{ cursor: "pointer", outline: activo ? "2px solid var(--jyg-navy)" : "none", transition: "outline .15s" }} onClick={() => setFEstado(activo ? "" : s)}>
                <div className="font-display fw-bold tabular-nums" style={{ fontSize: 20, color: activo ? "var(--jyg-navy)" : "var(--ink)" }}>{n}</div>
                <div style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: 1 }}>{s}</div>
              </button>
            </div>
          );
        })}
      </div>
      <Toolbar count={lista.length} countLabel={lista.length === 1 ? "pedido" : "pedidos"}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar pedido, estudiante…" />
        <FilterSelect value={fEstado} onChange={setFEstado} allLabel="Todos los estados" options={ESTADOS_PEDIDO.map((s) => ({ v: s, l: s }))} />
      </Toolbar>
      <div className="card p-4">
        <DataTable
          columns={[
            { key: "pedido", header: "N° Pedido", sortable: true, sortValue: (e) => e.pedido, render: (e) => <b className="tabular-nums" style={{ fontSize: 12.5 }}>{e.pedido}</b> },
            { key: "nombre", header: "Estudiante", sortable: true, sortValue: (e) => e.nombre, render: (e) => <span><span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</span><span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.grado} “{e.seccion}”</span></span> },
            { key: "registro", header: "Registro", sortable: true, sortValue: (e) => e.fechaRegistro, render: (e) => <span style={{ fontSize: 12.5 }}>{fmtFecha(e.fechaRegistro)}</span> },
            { key: "paquete", header: "Paquete", sortable: true, sortValue: (e) => PAQUETES[e.paqueteId].nombre, render: (e) => <Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "green" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge> },
            { key: "total", header: "Total", align: "right", sortable: true, sortValue: (e) => estudianteTotales(e).total, render: (e) => <b className="tabular-nums" style={{ fontSize: 12.5 }}>{fmtUSD(estudianteTotales(e).total)}</b> },
            { key: "saldobs", header: "Saldo (Bs)", align: "right", sortable: true, sortValue: (e) => estudianteTotales(e).saldo, render: (e) => { const s = estudianteTotales(e).saldo; return <b className="tabular-nums" style={{ color: s > 0 ? "var(--danger)" : "var(--ok)", fontSize: 12.5 }}>{fmtBs(s * tasa.usd)}</b>; } },
            { key: "estado", header: "Estado", sortable: true, sortValue: (e) => e.estadoPedido, render: (e) => <Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge> },
            { key: "acc", header: "Acciones", align: "right", render: (e) => <RowActions onVer={() => setRoute("estudiantes", { open: e.id })} onEdit={() => setRoute("estudiantes", { open: e.id })} onDelete={() => eliminar(e)} /> },
          ] as Column<Estudiante>[]}
          rows={lista} rowKey={(e) => e.id} onRowClick={(e) => setRoute("estudiantes", { open: e.id })}
          empty={<EmptyState icon={Wallet} title="Sin pedidos" text="Registra estudiantes para generar pedidos automáticamente." />}
        />
      </div>
    </div>
  );
}

/* ============================================================
   COTIZACIONES
   ============================================================ */
const cotVacia = (seq: number): Cotizacion => ({ id: "", numero: `COT-${seq}`, fecha: todayISO(), cliente: "", telefono: "", escuela: "", paqueteId: "premium", adicionales: [], estado: "Pendiente", nota: "" });
export function Cotizaciones() {
  const { db, saveCotizacion, deleteCotizacion, convertirCotizacion, confirm, success, toast } = useApp();
  const [form, setForm] = useState<Cotizacion | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const total = (c: Cotizacion) => (PAQUETES[c.paqueteId]?.precioBase || 0) + c.adicionales.reduce((s, a) => s + a.cantidad * a.precio, 0);
  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.cliente.trim()) er.cliente = "El cliente es obligatorio";
    setErrs(er); if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveCotizacion({ ...form, id: form.id || "c-" + uid() }); success(); setForm(null);
  };
  const eliminar = async (c: Cotizacion) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará la cotización ${c.numero}.`, confirmText: "Eliminar", danger: true });
    if (!ok) return; deleteCotizacion(c.id); toast("Registro eliminado", "warn");
  };
  const convertir = async (c: Cotizacion) => {
    const ok = await confirm({ title: "¿Convertir en venta?", message: `Se creará un pedido a nombre de ${c.cliente} con el paquete ${PAQUETES[c.paqueteId].nombre}.`, confirmText: "Sí, Convertir" });
    if (!ok) return; convertirCotizacion(c.id); success("Cotización convertida en venta");
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Cotizaciones / Ventas</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Presupuestos que se convierten en pedidos con un clic</p></div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(cotVacia(db.seqCot)); }}><Plus size={15} /> Nueva cotización</button>
      </div>
      <div className="row g-3">
        {db.cotizaciones.map((c, i) => (
          <div key={c.id} className="col-12 col-md-6 col-xl-4">
            <div className="card p-4 h-100 card-lift reveal" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap"><h3 className="font-display fw-bold m-0" style={{ fontSize: 15.5 }}>{c.numero}</h3><Badge tone={c.estado === "Aceptada" ? "green" : c.estado === "Rechazada" ? "red" : "amber"} dot>{c.estado}</Badge></div>
                  <p className="mt-1 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{fmtFecha(c.fecha)} · {c.escuela || "Escuela por definir"}</p>
                </div>
                <div className="text-end">
                  <div className="font-display fw-bold tabular-nums" style={{ fontSize: 19, color: "var(--jyg-navy)" }}>{fmtUSD(total(c))}</div>
                  <Badge tone={c.paqueteId === "lujo" ? "gold" : c.paqueteId === "premium" ? "green" : "slate"}>Paq. {PAQUETES[c.paqueteId].nombre}</Badge>
                </div>
              </div>
              <p className="m-0" style={{ fontSize: 13 }}><b className="font-display">{c.cliente}</b> · {c.telefono || "sin teléfono"}</p>
              {c.adicionales.length > 0 && <p className="mt-1 mb-0" style={{ fontSize: 12, color: "var(--ink-soft)" }}>Adicionales: {c.adicionales.map((a) => `${a.cantidad}× ${a.producto}`).join(", ")}</p>}
              {c.nota && <p className="mt-1 mb-0 fst-italic" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{c.nota}</p>}
              <div className="d-flex gap-2 mt-3 flex-wrap">
                {c.estado === "Pendiente" && <button className="btn btn-primary btn-sm" onClick={() => convertir(c)}><GraduationCap size={14} /> Convertir en venta</button>}
                {c.telefono && <a className="btn btn-soft btn-sm" style={{ textDecoration: "none", background: "var(--tint-ok)", color: "var(--ok)" }} href={waLink(c.telefono, `Hola ${c.cliente}, le saluda Promociones JyG 🎓. Su cotización ${c.numero} por ${fmtUSD(total(c))} sigue disponible.`)} target="_blank" rel="noreferrer"><Send size={13} /> WhatsApp</a>}
                <button className="icon-btn" onClick={() => { setErrs({}); setForm(c); }}><Plus size={14} style={{ display: "none" }} /><span className="font-display" style={{ fontSize: 12 }}>Editar</span></button>
                <button className="icon-btn danger" onClick={() => eliminar(c)}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {db.cotizaciones.length === 0 && <div className="card mt-3"><EmptyState icon={Package} title="Sin cotizaciones" text="Crea la primera cotización para un representante." /></div>}
      {form && (
        <Modal open onClose={() => setForm(null)} size="lg" title={form.id ? `Editar ${form.numero}` : `Nueva cotización · ${form.numero}`}>
          <div className="f-grid">
            <Field label="Cliente / Representante" required error={errs.cliente} span="c-6"><input className={`input ${errs.cliente ? "err" : ""}`} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} autoFocus /></Field>
            <Field label="Teléfono" span="c-3"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Estado" span="c-3"><select className="select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Cotizacion["estado"] })}><option>Pendiente</option><option>Aceptada</option><option>Rechazada</option></select></Field>
            <Field label="Escuela" span="c-6"><select className="select" value={form.escuela} onChange={(e) => setForm({ ...form, escuela: e.target.value })}><option value="">—</option>{db.escuelas.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}</select></Field>
            <Field label="Paquete" span="c-6"><select className="select" value={form.paqueteId} onChange={(e) => setForm({ ...form, paqueteId: e.target.value })}>{Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}</select></Field>
            <Field label="Adicionales" span="c-12">
              <select className="select" value="" onChange={(e) => { const prod = getAdicionales(db.config).find((a) => a.nombre === e.target.value); if (prod) setForm({ ...form, adicionales: [...form.adicionales, { producto: prod.nombre, cantidad: 1, precio: prod.precio, talla: "" }] }); }}>
                <option value="" disabled>+ Agregar adicional…</option>
                {getAdicionales(db.config).map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre} — ${a.precio}</option>)}
              </select>
            </Field>
            {form.adicionales.map((a, i) => (
              <div key={i} className="c-6 d-flex align-items-center gap-2">
                <input type="number" min={1} className="input" style={{ width: 64 }} value={a.cantidad} onChange={(e) => setForm({ ...form, adicionales: form.adicionales.map((x, j) => (j === i ? { ...x, cantidad: Number(e.target.value) || 1 } : x)) })} />
                <span className="flex-grow-1" style={{ fontSize: 13 }}>{a.producto}{a.talla ? ` (${a.talla})` : ""}</span>
                <b className="tabular-nums" style={{ fontSize: 12.5 }}>${(a.cantidad * a.precio).toFixed(2)}</b>
                <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => setForm({ ...form, adicionales: form.adicionales.filter((_, j) => j !== i) })}><Trash2 size={12} /></button>
              </div>
            ))}
            <Field label="Nota" span="c-12"><textarea className="textarea" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>
          </div>
          <FormFoot total={fmtUSD(total(form))} sub={`Paquete ${PAQUETES[form.paqueteId].nombre} + ${form.adicionales.length} adicionales`} onCancel={() => setForm(null)} onSave={guardar} saveDisabled={!form.cliente.trim()} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   MENSAJES (plantillas WhatsApp)
   ============================================================ */
const PLANTILLAS = [
  { id: "saldo", nombre: "Recordatorio de saldo", cuerpo: "Hola {{representante}}, le saluda Promociones JyG 🎓. El estudiante {{estudiante}} tiene un saldo pendiente de {{saldo}}. ¿Podemos coordinar el pago?" },
  { id: "entrega", nombre: "Pedido listo para entrega", cuerpo: "¡Hola {{representante}}! 🎉 El paquete de grado de {{estudiante}} ya está listo para entregar. Escríbanos para coordinar la entrega." },
  { id: "cotizacion", nombre: "Seguimiento de cotización", cuerpo: "Hola {{representante}}, le saluda Promociones JyG. Queremos darle seguimiento a la cotización del paquete {{paquete}} para {{estudiante}}." },
];
export function Mensajes() {
  const { db, addMensaje, toast, success } = useApp();
  const [estId, setEstId] = useState(db.estudiantes[0]?.id || "");
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS[0].id);
  const [texto, setTexto] = useState("");
  const est = db.estudiantes.find((e) => e.id === estId);
  const rellenar = (pid: string, eid: string) => {
    const p = PLANTILLAS.find((x) => x.id === pid); const s = db.estudiantes.find((e) => e.id === eid);
    if (!p || !s) return;
    const t = estudianteTotales(s);
    let c = p.cuerpo;
    c = c.split("{{representante}}").join(s.representante || "representante");
    c = c.split("{{estudiante}}").join(s.nombre);
    c = c.split("{{saldo}}").join(fmtUSD(t.saldo));
    c = c.split("{{paquete}}").join(PAQUETES[s.paqueteId].nombre);
    setTexto(c);
  };
  useEffect(() => { rellenar(plantillaId, estId); }, [plantillaId, estId]); // eslint-disable-line react-hooks/exhaustive-deps
  const enviar = () => {
    if (!est) return;
    if (!est.telefono) { toast("Ese estudiante no tiene teléfono registrado", "err"); return; }
    window.open(waLink(est.telefono, texto), "_blank");
    addMensaje({ id: uid(), fecha: todayISO(), destinatario: est.representante || est.nombre, telefono: est.telefono, plantilla: PLANTILLAS.find((p) => p.id === plantillaId)?.nombre || "", texto });
    success("Mensaje preparado en WhatsApp");
  };
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Mensajes</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Plantillas con datos del estudiante · envío por WhatsApp</p></div>
      </div>
      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <div className="card p-4 mb-3">
            <Field label="Destinatario" span="c-12"><select className="select" value={estId} onChange={(e) => setEstId(e.target.value)}>{db.estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} — {e.representante}</option>)}</select></Field>
            {est && <div className="mt-3 p-3 rounded-3" style={{ background: "var(--card-bg-2)", fontSize: 12.5 }}><div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Teléfono</span><b>{est.telefono || "—"}</b></div><div className="d-flex justify-content-between mt-1"><span style={{ color: "var(--ink-faint)" }}>Saldo</span><b style={{ color: estudianteTotales(est).saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(estudianteTotales(est).saldo)}</b></div></div>}
          </div>
          <div className="card p-4">
            <SectionHead title="Plantillas" />
            <div className="d-flex flex-column gap-2">
              {PLANTILLAS.map((p) => (
                <button key={p.id} className="text-start p-3 rounded-3 border-0" style={{ background: plantillaId === p.id ? "var(--tint-navy-2)" : "var(--card-bg-2)", outline: plantillaId === p.id ? "1.5px solid var(--jyg-navy)" : "none", cursor: "pointer", color: "var(--ink)" }} onClick={() => setPlantillaId(p.id)}>
                  <span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{p.nombre}</span>
                  <span className="d-block text-truncate" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{p.cuerpo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-8">
          <div className="card p-4 mb-3">
            <SectionHead title="Mensaje" desc="Se rellena con los datos del estudiante — editable" />
            <textarea className="textarea" style={{ minHeight: 150, fontSize: 14 }} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button className="btn btn-primary mt-3" onClick={enviar} disabled={!est}><Send size={15} /> Enviar por WhatsApp</button>
          </div>
          <div className="card p-4">
            <SectionHead title={`Historial (${db.mensajes.length})`} />
            {db.mensajes.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Sin mensajes enviados.</p> : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 320, overflowY: "auto" }}>
                {db.mensajes.map((m) => (
                  <div key={m.id} className="p-3 rounded-3" style={{ background: "var(--card-bg-2)" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1"><Badge tone="green" dot>WhatsApp</Badge><b className="font-display" style={{ fontSize: 13 }}>{m.destinatario}</b><span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{m.telefono} · {fmtFecha(m.fecha)} · {m.plantilla}</span></div>
                    <p className="m-0 text-truncate" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{m.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
