import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote, Check, CreditCard, Eye, FileText, GraduationCap, ImagePlus, Package, Plus,
  QrCode, Receipt, ScanLine, Trash2, Users, Wallet, X,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante, Pago } from "../lib/data";
import {
  ADICIONALES, ESTADOS_PEDIDO, GRADOS, PAQUETES, SECCIONES, TALLAS, estudianteTotales,
  fmtBs, fmtFecha, fmtUSD, todayISO, uid,
} from "../lib/data";
import {
  Badge, Drawer, EmptyState, Field, FilterSelect, Modal, RowActions, SearchInput, SectionHead,
  Toolbar, estadoPagoTone, estadoPedidoTone,
} from "../components/ui";
import { TarjetaQR, Credencial } from "./EtiquetasQR";

const codVacios = () => ({ carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" });
const nuevo = (seq: number): Estudiante => ({
  id: "", pedido: `P-${seq}`, nombre: "", telefono: "", representante: "", ci: "",
  escuelaId: "", docenteId: "", grado: "Bachiller", seccion: "A", paqueteId: "premium",
  precioPaquete: PAQUETES.premium.precioBase, adicionales: [], pagos: [],
  estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "", observaciones: "", codigos: codVacios(),
});

export default function Estudiantes() {
  const { db, param, setParam, setOcrOpen, tasa, deleteEstudiante, confirm, toast } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [fGrado, setFGrado] = useState("");
  const [fPago, setFPago] = useState("");
  const [formOpen, setFormOpen] = useState<Partial<Estudiante> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (param?.open) setOpenId(param.open);
    if (param?.openNew) setFormOpen(nuevo(db.seqPedido));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...db.estudiantes]
      .filter((e) => {
        if (t && ![e.nombre, e.ci, e.pedido, e.representante].some((v) => v.toLowerCase().includes(t))) return false;
        if (fEscuela && e.escuelaId !== fEscuela) return false;
        if (fGrado && e.grado !== fGrado) return false;
        if (fPago && estudianteTotales(e).estadoPago !== fPago) return false;
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.estudiantes, q, fEscuela, fGrado, fPago]);

  const abiertos = db.estudiantes.filter((e) => e.id === openId);

  const eliminarEstudiante = async (e: Estudiante) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a "${e.nombre}" con sus pagos y abonos.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteEstudiante(e.id);
    toast("Estudiante eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Estudiantes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            {db.estudiantes.length} registrados · {db.estudiantes.filter((e) => estudianteTotales(e).saldo > 0.009).length} con saldo pendiente
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={() => setOcrOpen(true)} title="Escanear cédula o partida de nacimiento"><ScanLine size={16} /> Escanear documento</button>
          <button className="btn btn-primary" onClick={() => setFormOpen(nuevo(db.seqPedido))}><Plus size={16} /> Nuevo estudiante</button>
        </div>
      </div>

      <Toolbar count={lista.length} countLabel={lista.length === 1 ? "estudiante" : "estudiantes"}>
        <SearchInput value={q} onChange={setQ} placeholder="Nombre, cédula, pedido…" />
        <FilterSelect value={fEscuela} onChange={setFEscuela} allLabel="Todas las escuelas" width={190} options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} />
        <FilterSelect value={fGrado} onChange={setFGrado} allLabel="Todos los grados" width={150} options={GRADOS.map((g) => ({ v: g, l: g }))} />
        <FilterSelect value={fPago} onChange={setFPago} allLabel="Estado de pago" width={170} options={["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => ({ v: s, l: s }))} />
      </Toolbar>

      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="tbl">
            <thead><tr><th>Estudiante</th><th>Pedido</th><th>Grado</th><th>Paquete</th><th>Total</th><th>Saldo</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>
              {lista.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setOpenId(e.id)}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 36, height: 36, fontSize: 12.5, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>{e.nombre[0]}</span>
                        <div style={{ lineHeight: 1.25 }}>
                          <div className="font-display fw-semibold" style={{ fontSize: 13.5 }}>{e.nombre}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.ci || "S/C"} · {db.escuelas.find((x) => x.id === e.escuelaId)?.nombre || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-display fw-bold" style={{ fontSize: 12.5 }}>{e.pedido}</td>
                    <td style={{ fontSize: 12.5 }}>{e.grado} “{e.seccion}”</td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{fmtUSD(t.total)}</td>
                    <td className="font-display fw-bold" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(t.saldo)}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td><RowActions onVer={() => setOpenId(e.id)} onEdit={() => setFormOpen(e)} onDelete={() => eliminarEstudiante(e)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={GraduationCap} title="Sin estudiantes" text="Registra el primero o escanea una cédula con el OCR." />}
      </div>

      {formOpen && <EstudianteForm initial={formOpen} onClose={() => { setFormOpen(null); if (param?.openNew) setParam(null); }} />}
      {abiertos.map((e) => (
        <Expediente key={e.id} est={e} onClose={() => { setOpenId(null); if (param?.open) setParam(null); }} tasaUsd={tasa.usd} onEditar={() => setFormOpen(e)} />
      ))}
      <span className="d-none"><CreditCard size={1} /></span>
    </div>
  );
}

/* ---------------- Formulario ---------------- */
function EstudianteForm({ initial, onClose }: { initial: Partial<Estudiante>; onClose: () => void }) {
  const { db, saveEstudiante, success, ocrDraft, setOcrDraft, tasa } = useApp();
  const [f, setF] = useState<Estudiante>(() => {
    const base = { ...nuevo(db.seqPedido), ...initial } as Estudiante;
    if (ocrDraft?.nombre && !base.nombre) base.nombre = ocrDraft.nombre;
    if (ocrDraft?.ci && !base.ci) base.ci = ocrDraft.ci;
    return base;
  });

  useEffect(() => { if (ocrDraft) { setOcrDraft(null); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = estudianteTotales(f);

  const guardar = () => {
    if (!f.nombre.trim()) return;
    saveEstudiante(f);
    success();
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={f.id ? `Editar ${f.pedido}` : `Nuevo estudiante · ${f.pedido}`}>
      <div className="form-section" style={{ marginTop: 4 }}>Información básica</div>
      <div className="row g-3">
        <Field label="Nombre del alumno" required className="col-md-6">
          <input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus placeholder="Nombre y apellido" />
        </Field>
        <Field label="Cédula (C.I.)" className="col-md-3"><input className="input" placeholder="V-00.000.000" value={f.ci} onChange={(e) => setF({ ...f, ci: e.target.value })} /></Field>
        <Field label="Teléfono" className="col-md-3"><input className="input" placeholder="0412-0000000" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Field>
        <Field label="Representante" className="col-md-12"><input className="input" placeholder="Nombre del representante" value={f.representante} onChange={(e) => setF({ ...f, representante: e.target.value })} /></Field>
      </div>

      <div className="form-section">Académico</div>
      <div className="row g-3">
        <Field label="Escuela" className="col-md-6">
          <select className="select" value={f.escuelaId} onChange={(e) => setF({ ...f, escuelaId: e.target.value })}>
            <option value="">— Seleccione —</option>
            {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Field>
        <Field label="Docente" className="col-md-6">
          <select className="select" value={f.docenteId} onChange={(e) => setF({ ...f, docenteId: e.target.value })}>
            <option value="">— Seleccione —</option>
            {db.docentes.filter((d) => !f.escuelaId || d.escuelaId === f.escuelaId).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </Field>
        <Field label="Grado" className="col-md-6">
          <select className="select" value={f.grado} onChange={(e) => setF({ ...f, grado: e.target.value })}>{GRADOS.map((g) => <option key={g}>{g}</option>)}</select>
        </Field>
        <Field label="Sección" className="col-md-6">
          <select className="select" value={f.seccion} onChange={(e) => setF({ ...f, seccion: e.target.value })}>{SECCIONES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
      </div>

      <div className="form-section">Paquete y precio</div>
      <div className="row g-3">
        <Field label="Paquete de grado" className="col-md-5">
          <select className="select" value={f.paqueteId} onChange={(e) => setF({ ...f, paqueteId: e.target.value, precioPaquete: PAQUETES[e.target.value].precioBase })}>
            {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}
          </select>
        </Field>
        <Field label="Precio del paquete (USD)" className="col-md-3">
          <input type="number" className="input" value={f.precioPaquete} onChange={(e) => setF({ ...f, precioPaquete: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Observaciones" className="col-md-4">
          <input className="input" placeholder="Opcional" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
        </Field>
      </div>

      <div className="card p-3 mt-4" style={{ background: "var(--card-bg-2)", border: "1px dashed var(--line)" }}>
        <SectionHead title="Adicionales" desc="Productos extra del pedido" />
        {f.adicionales.map((a, i) => (
          <div key={i} className="d-flex align-items-center gap-2 py-1" style={{ fontSize: 13 }}>
            <span className="flex-grow-1">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span>
            <b className="font-display">${(a.cantidad * a.precio).toFixed(2)}</b>
            <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => setF({ ...f, adicionales: f.adicionales.filter((_, j) => j !== i) })}><X size={13} /></button>
          </div>
        ))}
        <select className="select mt-2" defaultValue="" onChange={(e) => {
          const prod = ADICIONALES.find((a) => a.nombre === e.target.value);
          if (prod) setF({ ...f, adicionales: [...f.adicionales, { producto: prod.nombre, cantidad: 1, precio: prod.precio, talla: prod.talla ? (prod.tallaNumerica ? "18" : "M") : "" }] });
          e.target.value = "";
        }}>
          <option value="" disabled>+ Agregar adicional…</option>
          {ADICIONALES.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre} — ${a.precio}</option>)}
        </select>
      </div>

      <div className="d-flex align-items-center justify-content-between mt-4 flex-wrap gap-3 rounded-3 px-3 py-3" style={{ background: "linear-gradient(140deg, color-mix(in srgb, var(--jyg-navy) 10%, var(--card-bg)), var(--card-bg))", border: "1px solid var(--line-soft)" }}>
        <div>
          <div className="text-uppercase" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: "var(--ink-faint)" }}>Total del pedido · tasa {fmtBs(tasa.usd)}/$</div>
          <div className="d-flex align-items-baseline gap-2 flex-wrap">
            <span className="font-display fw-bold tabular-nums" style={{ fontSize: 22, color: "var(--jyg-navy)", letterSpacing: "-0.5px" }}>{fmtUSD(t.total)}</span>
            <span className="tabular-nums" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>≈ {fmtBs(t.total * tasa.usd)}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={!f.nombre.trim()}><Check size={15} /> Sí, Guardar</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Expediente (Drawer de vidrio) ---------------- */
function Expediente({ est, onClose, tasaUsd, onEditar }: { est: Estudiante; onClose: () => void; tasaUsd: number; onEditar?: () => void }) {
  const { db, saveEstudiante, deletePago, setPedidoEstado, saveCodigos, confirm, success, toast, addPago, tasa } = useApp();
  const [tab, setTab] = useState<"datos" | "pagos" | "pedido" | "qr">("datos");
  const [vistaQr, setVistaQr] = useState<"tarjeta" | "credencial">("tarjeta");
  const [pago, setPago] = useState({ monto: "", metodo: "Pago Móvil", bs: false, referencia: "", observacion: "", fecha: todayISO() });
  const [codigos, setCodigos] = useState(est.codigos);

  const t = estudianteTotales(est);
  const escuela = db.escuelas.find((e) => e.id === est.escuelaId);
  const docente = db.docentes.find((d) => d.id === est.docenteId);

  const agregarPago = async () => {
    const m = Number(pago.monto);
    if (!m || m <= 0) { toast("Indica un monto válido", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Se registrará un abono de ${pago.bs ? fmtBs(m) : fmtUSD(m)} a nombre de ${est.nombre}.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    const usd = pago.bs ? m / tasaUsd : m;
    const p: Pago = { id: uid(), fecha: pago.fecha, monto: m, metodo: pago.metodo, bs: pago.bs, tasa: tasaUsd, usd, referencia: pago.referencia, observacion: pago.observacion };
    addPago(est.id, p);
    setPago({ monto: "", metodo: "Pago Móvil", bs: false, referencia: "", observacion: "", fecha: todayISO() });
    success("Abono registrado");
  };
  const quitarPago = async (p: Pago) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará el abono de ${fmtUSD(p.usd)}.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePago(est.id, p.id);
    toast("Abono eliminado", "warn");
  };
  const guardarCodigos = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveCodigos(est.id, codigos);
    success();
  };

  const TABS = [
    { id: "datos" as const, label: "Datos", icon: Users },
    { id: "pagos" as const, label: "Pagos", icon: Wallet },
    { id: "pedido" as const, label: "Pedido", icon: Package },
    { id: "qr" as const, label: "QR", icon: QrCode },
  ];

  return (
    <Drawer open onClose={onClose} title={<span className="d-flex align-items-center gap-2"><span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 34, height: 34, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>{est.nombre[0]}</span>{est.nombre} <Badge tone="blue">{est.pedido}</Badge></span>}>
      {onEditar && (
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <span className="text-truncate" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            {est.grado} “{est.seccion}” · {db.escuelas.find((x) => x.id === est.escuelaId)?.nombre || "Escuela sin asignar"}
          </span>
          <button className="btn btn-soft btn-sm flex-shrink-0" onClick={onEditar} title="Abrir el formulario de registro del estudiante">
            <FileText size={14} /> Ver formulario
          </button>
        </div>
      )}
      <div className="d-flex gap-1 mb-3 rounded-3 p-1" style={{ background: "var(--tint-slate)" }}>
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn btn-sm border-0 flex-fill font-display fw-semibold" style={{ background: tab === tb.id ? "var(--card-bg)" : "transparent", color: tab === tb.id ? "var(--jyg-navy)" : "var(--ink-soft)", boxShadow: tab === tb.id ? "var(--shadow-1)" : "none" }}>
            <tb.icon size={14} className="me-1" />{tb.label}
          </button>
        ))}
      </div>

      {/* Resumen siempre visible */}
      <div className="row g-2 mb-3">
        <div className="col-4"><div className="card p-3 text-center"><div className="font-display fw-bold" style={{ color: "var(--jyg-navy)" }}>{fmtUSD(t.total)}</div><div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase" }}>Total</div></div></div>
        <div className="col-4"><div className="card p-3 text-center"><div className="font-display fw-bold" style={{ color: "var(--ok)" }}>{fmtUSD(t.abonado)}</div><div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase" }}>Abonado</div></div></div>
        <div className="col-4"><div className="card p-3 text-center"><div className="font-display fw-bold" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(t.saldo)}</div><div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase" }}>Saldo</div></div></div>
      </div>

      {tab === "datos" && (
        <div className="card p-4">
          <div className="d-flex flex-column gap-2" style={{ fontSize: 13.5 }}>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Cédula</span><b>{est.ci || "S/C"}</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Teléfono</span><b>{est.telefono || "—"}</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Representante</span><b>{est.representante || "—"}</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Escuela</span><b>{escuela?.nombre || "—"}</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Docente</span><b>{docente?.nombre || "—"}</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Grado / Sección</span><b>{est.grado} “{est.seccion}”</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Paquete</span><Badge tone={est.paqueteId === "lujo" ? "gold" : est.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[est.paqueteId].nombre}</Badge></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Registro</span><b>{fmtFecha(est.fechaRegistro)}</b></div>
          </div>
          <div className="mt-3">
            <SectionHead title="Incluye el paquete" />
            <div className="d-flex flex-wrap gap-1">
              {PAQUETES[est.paqueteId].incluye.map((i) => <Badge key={i} tone="slate">{i}</Badge>)}
            </div>
          </div>
          {est.adicionales.length > 0 && (
            <div className="mt-3">
              <SectionHead title="Adicionales" />
              <div className="d-flex flex-wrap gap-1">
                {est.adicionales.map((a, i) => <Badge key={i} tone="gold">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</Badge>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "pagos" && (
        <div className="d-flex flex-column gap-3">
          <div className="card p-4">
            <SectionHead title="Registrar abono" desc={`Tasa del día: ${fmtBs(tasaUsd)}/$`} />
            <div className="row g-2">
              <Field label="Monto" className="col-4">
                <div className="input-group">
                  <span className="input-group-text">{pago.bs ? "Bs" : "$"}</span>
                  <input type="number" className="form-control" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
                </div>
              </Field>
              <Field label="Método" className="col-4">
                <select className="select" value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
                  {["Pago Móvil", "Zelle", "Divisas $", "Efectivo Bs", "Trueque"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Fecha" className="col-4"><input type="date" className="input" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></Field>
              <Field label="Referencia" className="col-6"><input className="input" value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} /></Field>
              <Field label="Observación" className="col-6"><input className="input" value={pago.observacion} onChange={(e) => setPago({ ...pago, observacion: e.target.value })} /></Field>
              <div className="col-12 d-flex align-items-center gap-2">
                <label className="d-flex align-items-center gap-2" style={{ fontSize: 12.5, cursor: "pointer", color: "var(--ink-soft)" }}>
                  <input type="checkbox" checked={pago.bs} onChange={(e) => setPago({ ...pago, bs: e.target.checked })} /> El monto está en Bolívares
                </label>
                <button className="btn btn-primary btn-sm ms-auto" onClick={agregarPago}><Banknote size={14} /> Registrar abono</button>
              </div>
            </div>
            {Number(pago.monto) > 0 && (
              <p className="mt-2 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                Equivale a <b style={{ color: "var(--jyg-navy)" }}>{pago.bs ? fmtUSD(Number(pago.monto) / tasaUsd) : fmtBs(Number(pago.monto) * tasaUsd)}</b> a tasa {fmtBs(tasaUsd)}
              </p>
            )}
          </div>

          <div className="card p-4">
            <SectionHead title={`Historial (${est.pagos.length})`} />
            {est.pagos.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Aún no hay abonos registrados.</p>
            ) : (
              <div className="table-responsive">
                <table className="tbl">
                  <thead><tr><th>Fecha</th><th>Método</th><th>Monto</th><th>USD</th><th>Ref.</th><th></th></tr></thead>
                  <tbody>
                    {est.pagos.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontSize: 12.5 }}>{fmtFecha(p.fecha)}</td>
                        <td style={{ fontSize: 12.5 }}>{p.metodo}</td>
                        <td className="tabular-nums" style={{ fontSize: 12.5 }}>{p.bs ? fmtBs(p.monto) : fmtUSD(p.monto)}</td>
                        <td className="font-display fw-bold" style={{ color: "var(--ok)" }}>{fmtUSD(p.usd)}</td>
                        <td style={{ fontSize: 12 }}>{p.referencia || "—"}</td>
                        <td><button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => quitarPago(p)}><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-2 d-flex justify-content-between" style={{ fontSize: 13 }}>
              <span style={{ color: "var(--ink-faint)" }}>Estado de pago</span>
              <Badge tone={estadoPagoTone(t.estadoPago)} dot>{t.estadoPago}</Badge>
            </div>
          </div>
        </div>
      )}

      {tab === "pedido" && (
        <div className="card p-4">
          <SectionHead title="Pipeline de producción" desc="Estado actual del pedido" />
          <div className="stepper mb-4">
            {ESTADOS_PEDIDO.map((s, i) => {
              const idx = ESTADOS_PEDIDO.indexOf(est.estadoPedido);
              const estado = i < idx ? "done" : i === idx ? "current" : "";
              return (
                <div key={s} className={`step ${estado}`}>
                  <span className="bubble">{i < idx ? <Check size={13} /> : i + 1}</span>
                  <span className="lbl">{s}</span>
                </div>
              );
            })}
          </div>
          <div className="d-flex flex-wrap gap-1 mb-3">
            {ESTADOS_PEDIDO.map((s) => (
              <button key={s} className={`btn btn-sm ${est.estadoPedido === s ? "btn-primary" : "btn-ghost"}`} onClick={() => { setPedidoEstado(est.id, s); if (s === "Entregado") success("Pedido marcado como entregado"); }}>
                {s}
              </button>
            ))}
          </div>
          <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Fecha de registro</span><b>{fmtFecha(est.fechaRegistro)}</b></div>
            <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Fecha de entrega</span><b>{est.fechaEntrega ? fmtFecha(est.fechaEntrega) : "Pendiente"}</b></div>
          </div>

          <div className="mt-4">
            <SectionHead title="Códigos de fotografía" desc="Para localizar las fotos en producción" />
            <div className="row g-2">
              {([["carnetAlumno", "Carnet Alumno"], ["carnetRep", "Carnet Representante"], ["firmaLibro", "Firma Libro"], ["togaBirrete", "Toga y Birrete"], ["fotoLibre", "Foto Libre"], ["fotoAdicional", "Foto Adicional"]] as const).map(([k, lbl]) => (
                <Field key={k} label={lbl} className="col-md-6">
                  <input className="input" value={codigos[k]} onChange={(e) => setCodigos({ ...codigos, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
            <button className="btn btn-primary btn-sm mt-3" onClick={guardarCodigos}><ImagePlus size={14} /> Guardar códigos</button>
          </div>
        </div>
      )}

      {tab === "qr" && (
        <div className="card p-4">
          <SectionHead title={vistaQr === "tarjeta" ? "Tarjeta de grado 7×5 cm" : "Credencial QR"} desc="Haz clic en la tarjeta para voltearla" actions={
            <div className="d-flex rounded-pill p-1 gap-1" style={{ background: "var(--tint-slate)" }}>
              <button className="btn btn-sm border-0" style={{ background: vistaQr === "tarjeta" ? "var(--card-bg)" : "transparent", color: vistaQr === "tarjeta" ? "var(--jyg-navy)" : "var(--ink-soft)", borderRadius: 99 }} onClick={() => setVistaQr("tarjeta")}>Tarjeta</button>
              <button className="btn btn-sm border-0" style={{ background: vistaQr === "credencial" ? "var(--card-bg)" : "transparent", color: vistaQr === "credencial" ? "var(--jyg-navy)" : "var(--ink-soft)", borderRadius: 99 }} onClick={() => setVistaQr("credencial")}>Credencial</button>
            </div>
          } />
          <div className="d-flex justify-content-center py-3">
            {vistaQr === "tarjeta"
              ? <TarjetaQR est={est} escuelaNombre={escuela?.nombre || ""} tasaHoy={tasaUsd} />
              : <Credencial est={est} escuelaNombre={escuela?.nombre || ""} tasaHoy={tasaUsd} />}
          </div>
          <p className="text-center mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            El QR contiene pedido, identidad, paquete, totales y saldo — escanéalo para verificar.
          </p>
        </div>
      )}

      <span className="d-none"><Eye size={1} /><Receipt size={1} /></span>
    </Drawer>
  );
}
