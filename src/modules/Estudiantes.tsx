import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  Banknote, Check, CreditCard, Eye, GraduationCap, ImagePlus, Package, Pencil, Plus, Printer,
  QrCode, Receipt, ScanLine, Search, Trash2, Users, Wallet, X,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante, Pago } from "../lib/data";
import {
  ADICIONALES, ESTADOS_PEDIDO, GRADOS, PAQUETES, SECCIONES, TALLAS, estudianteTotales,
  fmtBs, fmtFecha, fmtUSD, todayISO, uid,
} from "../lib/data";
import { Badge, Drawer, EmptyState, Field, Modal, SectionHead, estadoPagoTone, estadoPedidoTone } from "../components/ui";
import { TarjetaQR } from "./EtiquetasQR";

const codVacios = () => ({ carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" });
const nuevo = (seq: number): Estudiante => ({
  id: "", pedido: `P-${seq}`, nombre: "", telefono: "", representante: "", ci: "",
  escuelaId: "", docenteId: "", grado: "Bachiller", seccion: "A", paqueteId: "premium",
  precioPaquete: PAQUETES.premium.precioBase, adicionales: [], pagos: [],
  estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "", observaciones: "", codigos: codVacios(),
});

export default function Estudiantes() {
  const { db, param, setParam, setOcrOpen, tasa } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [fGrado, setFGrado] = useState("");
  const [fPago, setFPago] = useState("");
  const [formOpen, setFormOpen] = useState<Partial<Estudiante> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [vistaQr, setVistaQr] = useState<"tarjeta" | "credencial">("tarjeta");

  /* Parámetros de ruta (abrir expediente, nuevo, borrador OCR) */
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Estudiantes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>{db.estudiantes.length} registrados · {db.estudiantes.filter((e) => estudianteTotales(e).saldo > 0.009).length} con saldo pendiente</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={() => setOcrOpen(true)} title="Escanear cédula o partida de nacimiento"><ScanLine size={16} /> Escanear documento</button>
          <button className="btn btn-primary" onClick={() => setFormOpen(nuevo(db.seqPedido))}><Plus size={16} /> Nuevo estudiante</button>
        </div>
      </div>

      <div className="card p-4 mb-5 flex flex-wrap gap-2.5 items-center">
        <div className="flex items-center gap-2 h-[38px] px-3 rounded-full flex-1 min-w-[190px]" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--ink-faint)" }} />
          <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Nombre, cédula, pedido…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select !w-[180px]" value={fEscuela} onChange={(e) => setFEscuela(e.target.value)}><option value="">Escuela</option>{db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <select className="select !w-[140px]" value={fGrado} onChange={(e) => setFGrado(e.target.value)}><option value="">Grado</option>{GRADOS.map((g) => <option key={g}>{g}</option>)}</select>
        <select className="select !w-[160px]" value={fPago} onChange={(e) => setFPago(e.target.value)}><option value="">Estado de pago</option>{["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Estudiante</th><th>Pedido</th><th>Grado</th><th>Paquete</th><th>Total</th><th>Saldo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => setOpenId(e.id)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12.5px]" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>{e.nombre[0]}</span>
                        <div className="leading-tight">
                          <div className="font-display font-semibold text-[13.5px]">{e.nombre}</div>
                          <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.ci || "S/C"} · {db.escuelas.find((x) => x.id === e.escuelaId)?.nombre || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-display font-bold text-[12.5px]">{e.pedido}</td>
                    <td className="text-[12.5px]">{e.grado} “{e.seccion}”</td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td className="font-display font-semibold text-[13px]">{fmtUSD(t.total)}</td>
                    <td className="font-display font-bold text-[13px]" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(t.saldo)}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td><div className="flex justify-end gap-1"><button className="icon-btn" title="Credencial QR"><QrCode size={16} /></button><Eye size={15} style={{ color: "var(--ink-faint)" }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={GraduationCap} title="Sin estudiantes" text="Registra el primero o escanea una cédula con el OCR." />}
      </div>

      {formOpen && <EstudianteForm initial={formOpen} onClose={() => setFormOpen(null)} />}
      {abiertos.map((e) => (
        <Expediente key={e.id} est={e} onClose={() => { setOpenId(null); if (param?.open) setParam(null); }} vistaQr={vistaQr} setVistaQr={setVistaQr} tasaUsd={tasa.usd} />
      ))}
      <span className="hidden"><CreditCard size={1} /></span>
    </div>
  );
}

/* ---------------- Formulario ---------------- */
function EstudianteForm({ initial, onClose }: { initial: Partial<Estudiante>; onClose: () => void }) {
  const { db, saveEstudiante, setOcrDraft, ocrDraft, confirm, success, toast, tasa } = useApp();
  const [f, setF] = useState<Estudiante>(() => ({ ...nuevo(db.seqPedido), ...initial } as Estudiante));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const esNuevo = !initial.id;

  useEffect(() => {
    if (ocrDraft && esNuevo && ocrDraft.nombre) {
      setF((x) => ({ ...x, nombre: x.nombre || ocrDraft.nombre, ci: x.ci || ocrDraft.ci }));
      toast("Datos del OCR aplicados al formulario", "ok");
      setOcrDraft(null);
    }
  }, [ocrDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    const er: Record<string, string> = {};
    if (!f.nombre.trim()) er.nombre = "El nombre es obligatorio";
    if (!f.escuelaId) er.escuelaId = "Selecciona la escuela";
    if (f.precioPaquete <= 0) er.precioPaquete = "Precio inválido";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveEstudiante({ ...f, id: f.id || uid() });
    success();
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={esNuevo ? `Nuevo estudiante · Pedido ${f.pedido}` : `Editar ${f.nombre}`}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre del alumno" required error={errs.nombre} className="col-span-2">
          <input className={`input ${errs.nombre ? "err" : ""}`} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus />
        </Field>
        <Field label="Cédula"><input className="input" value={f.ci} onChange={(e) => setF({ ...f, ci: e.target.value })} placeholder="V-00.000.000" /></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="0414-000.00.00" /></Field>
        <Field label="Representante"><input className="input" value={f.representante} onChange={(e) => setF({ ...f, representante: e.target.value })} /></Field>
        <Field label="Escuela" required error={errs.escuelaId}>
          <select className={`select ${errs.escuelaId ? "err" : ""}`} value={f.escuelaId} onChange={(e) => setF({ ...f, escuelaId: e.target.value })}>
            <option value="">— Seleccione —</option>
            {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Field>
        <Field label="Docente">
          <select className="select" value={f.docenteId} onChange={(e) => setF({ ...f, docenteId: e.target.value })}>
            <option value="">—</option>
            {db.docentes.filter((d) => !f.escuelaId || d.escuelaId === f.escuelaId).map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </Field>
        <Field label="Grado">
          <select className="select" value={f.grado} onChange={(e) => setF({ ...f, grado: e.target.value })}>{GRADOS.map((g) => <option key={g}>{g}</option>)}</select>
        </Field>
        <Field label="Sección">
          <select className="select" value={f.seccion} onChange={(e) => setF({ ...f, seccion: e.target.value })}>{SECCIONES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Paquete" hint={`Tasa del día: ${fmtBs(tasa.usd)} por $1`}>
          <select className="select" value={f.paqueteId} onChange={(e) => setF({ ...f, paqueteId: e.target.value, precioPaquete: PAQUETES[e.target.value].precioBase })}>
            {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}
          </select>
        </Field>
        <Field label="Precio del paquete ($)" required error={errs.precioPaquete}>
          <input type="number" min={1} className={`input ${errs.precioPaquete ? "err" : ""}`} value={f.precioPaquete} onChange={(e) => setF({ ...f, precioPaquete: Number(e.target.value) || 0 })} list="precios-jyg" />
        </Field>
        <datalist id="precios-jyg">{db.config.precios.map((p) => <option key={p} value={p} />)}</datalist>
        <Field label="Observaciones" className="col-span-2"><textarea className="textarea" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} /></Field>
      </div>

      {/* Adicionales */}
      <div className="card p-4 mt-4" style={{ background: "var(--surface-2)" }}>
        <SectionHead title="Artículos adicionales" />
        {f.adicionales.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px] py-1.5 flex-wrap">
            <span className="flex-1 min-w-[140px]">{a.cantidad}× {a.producto} {a.talla && <Badge tone="blue">{a.talla}</Badge>}</span>
            <b className="font-display">${(a.cantidad * a.precio).toFixed(2)}</b>
            <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => setF({ ...f, adicionales: f.adicionales.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
          </div>
        ))}
        <select className="select mt-2" defaultValue="" onChange={(e) => {
          const prod = ADICIONALES.find((x) => x.nombre === e.target.value);
          if (prod) setF({ ...f, adicionales: [...f.adicionales, { producto: prod.nombre, cantidad: 1, precio: prod.precio, talla: prod.conTalla ? TALLAS[2] : "" }] });
          e.target.value = "";
        }}>
          <option value="" disabled>+ Agregar adicional…</option>
          {ADICIONALES.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre} — ${a.precio}{a.conTalla ? " (tallas)" : ""}</option>)}
        </select>
      </div>
    </Modal>
  );
}

/* ---------------- Expediente (drawer) ---------------- */
function Expediente({ est, onClose, vistaQr, setVistaQr, tasaUsd }: { est: Estudiante; onClose: () => void; vistaQr: "tarjeta" | "credencial"; setVistaQr: (v: "tarjeta" | "credencial") => void; tasaUsd: number }) {
  const { db, saveEstudiante, deleteEstudiante, addPago, deletePago, setPedidoEstado, saveCodigos, confirm, success, toast } = useApp();
  const [tab, setTab] = useState<"datos" | "pagos" | "pedido" | "qr">("datos");
  const t = estudianteTotales(est);
  const escuela = db.escuelas.find((e) => e.id === est.escuelaId);
  const docente = db.docentes.find((d) => d.id === est.docenteId);

  const eliminar = async () => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a ${est.nombre} con sus ${est.pagos.length} pagos.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteEstudiante(est.id);
    toast("Registro eliminado", "warn");
    onClose();
  };

  const imprimirQr = () => {
    const win = window.open("", "_blank", "width=760,height=620");
    if (!win) return;
    const payload = [
      "JYG", est.pedido, est.nombre, est.ci || "S/C", escuela?.nombre || "", `${est.grado} "${est.seccion}"`,
      `Paq.${PAQUETES[est.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`, `Saldo ${fmtUSD(t.saldo)}`,
    ].join("|");
    win.document.write(`<html><head><title>Credencial ${est.pedido}</title></head><body style="font-family:Arial,sans-serif;text-align:center;padding:24px">
      <h3 style="margin:0 0 4px;color:#104172">Promociones JyG · Tarjeta de Grado</h3>
      <p style="margin:0 0 14px;color:#666;font-size:13px">${est.nombre} · ${est.grado} “${est.seccion}” · ${escuela?.nombre || ""}</p>
      <div style="display:inline-block;padding:14px;border:2px solid #104172;border-radius:14px">
        <svg id="qr"></svg>
      </div>
      <p style="font-size:12px;color:#666">Pedido ${est.pedido} · Total ${fmtUSD(t.total)} · Saldo ${fmtUSD(t.saldo)}</p>
      <script src="https://cdn.jsdelivr.net/npm/qrcode-svg@1.1.0/lib/qrcode.min.js"><\/script>
      <script>new QRCode({content:${JSON.stringify(payload)},container:"svg-viewbox",width:220,height:220,padding:2}).svg().replace(/<\\?xml[^>]*>/,"");document.getElementById("qr").outerHTML=new QRCode({content:${JSON.stringify(payload)},width:220,height:220,padding:2,ecl:"M"}).svg();setTimeout(function(){window.print()},400);<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <Drawer open onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-[16px]" style={{ background: "linear-gradient(150deg, var(--blue), #0b2e52)", color: "#ffd970" }}>{est.nombre[0]}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-[19px] m-0 truncate">{est.nombre}</h2>
            <p className="text-[12px] m-0" style={{ color: "var(--ink-faint)" }}>{est.pedido} · {est.ci || "S/C"} · {escuela?.nombre || "Sin escuela"}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { l: "Total", v: fmtUSD(t.total), c: "var(--blue)" },
            { l: "Abonado", v: fmtUSD(t.abonado), c: "var(--green)" },
            { l: "Saldo", v: fmtUSD(t.saldo), c: t.saldo > 0 ? "var(--red)" : "var(--green)" },
          ].map((x) => (
            <div key={x.l} className="card p-3 text-center">
              <div className="font-display font-bold text-[15px]" style={{ color: x.c }}>{x.v}</div>
              <div className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{x.l}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 mb-4 flex-wrap">
          <Badge tone={estadoPedidoTone(est.estadoPedido)} dot>{est.estadoPedido}</Badge>
          <Badge tone={estadoPagoTone(t.estadoPago)}>{t.estadoPago}</Badge>
          <Badge tone="slate">{fmtBs(t.saldo * tasaUsd)} de saldo hoy</Badge>
        </div>

        <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "var(--surface-2)" }}>
          {([["datos", Users, "Datos"], ["pagos", Wallet, "Pagos"], ["pedido", Package, "Pedido"], ["qr", QrCode, "QR"]] as const).map(([id, Ic, lbl]) => (
            <button key={id} onClick={() => setTab(id)} className="flex-1 flex items-center justify-center gap-1.5 border-none cursor-pointer font-display font-semibold text-[12px] py-2 rounded-lg transition-all" style={{ background: tab === id ? "var(--surface)" : "transparent", color: tab === id ? "var(--blue)" : "var(--ink-faint)", boxShadow: tab === id ? "var(--shadow-sm)" : "none" }}>
              <Ic size={13} /> {lbl}
            </button>
          ))}
        </div>

        {tab === "datos" && <TabDatos est={est} escuelaNombre={escuela?.nombre || ""} docenteNombre={docente?.nombre || ""} />}
        {tab === "pagos" && <TabPagos est={est} tasaUsd={tasaUsd} addPago={addPago} deletePago={deletePago} confirm={confirm} success={success} toast={toast} metodos={db.config.metodos} />}
        {tab === "pedido" && <TabPedido est={est} setPedidoEstado={setPedidoEstado} saveCodigos={saveCodigos} toast={toast} />}
        {tab === "qr" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex rounded-full p-1 gap-1" style={{ background: "var(--surface-2)" }}>
              {([["tarjeta", "Tarjeta 7×5 cm"], ["credencial", "Credencial"]] as const).map(([v, lbl]) => (
                <button key={v} onClick={() => setVistaQr(v)} className="border-none cursor-pointer font-display font-semibold text-[11.5px] px-3.5 py-1.5 rounded-full transition-all" style={{ background: vistaQr === v ? "var(--surface)" : "transparent", color: vistaQr === v ? "var(--blue)" : "var(--ink-faint)", boxShadow: vistaQr === v ? "var(--shadow-sm)" : "none" }}>{lbl}</button>
              ))}
            </div>
            {vistaQr === "tarjeta"
              ? <TarjetaQR est={est} escuelaNombre={escuela?.nombre || ""} tasaHoy={tasaUsd} />
              : <Credencial est={est} escuelaNombre={escuela?.nombre || ""} />}
            <div className="flex gap-2 flex-wrap justify-center">
              <button className="btn btn-primary btn-sm" onClick={imprimirQr}><Printer size={14} /> Imprimir</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { saveEstudiante(est); success("Datos del estudiante sincronizados"); }}><ImagePlus size={14} /> Refrescar</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button className="btn btn-danger btn-sm" onClick={eliminar}><Trash2 size={14} /> Eliminar estudiante</button>
        </div>
      </div>
    </Drawer>
  );
}

function TabDatos({ est, escuelaNombre, docenteNombre }: { est: Estudiante; escuelaNombre: string; docenteNombre: string }) {
  const filas: [string, string][] = [
    ["Teléfono", est.telefono || "—"], ["Representante", est.representante || "—"], ["Escuela", escuelaNombre || "—"],
    ["Docente", docenteNombre || "—"], ["Grado / Sección", `${est.grado} “${est.seccion}”`],
    ["Paquete", `${PAQUETES[est.paqueteId].nombre} — ${fmtUSD(est.precioPaquete)}`],
    ["Registro", fmtFecha(est.fechaRegistro)], ["Entrega", est.fechaEntrega ? fmtFecha(est.fechaEntrega) : "Pendiente"],
  ];
  return (
    <div className="card p-4">
      <div className="flex flex-col gap-2">
        {filas.map(([l, v]) => (
          <div key={l} className="flex justify-between gap-3 text-[13px] pb-2 border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
            <span style={{ color: "var(--ink-faint)" }}>{l}</span>
            <span className="font-display font-semibold text-right">{v}</span>
          </div>
        ))}
      </div>
      {est.adicionales.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
          <div className="text-[11px] font-display font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-faint)" }}>Adicionales</div>
          {est.adicionales.map((a, i) => (
            <div key={i} className="flex justify-between text-[12.5px] py-0.5"><span>{a.cantidad}× {a.producto} {a.talla && `(${a.talla})`}</span><b className="font-display">{fmtUSD(a.cantidad * a.precio)}</b></div>
          ))}
        </div>
      )}
      {est.observaciones && <p className="text-[12.5px] italic mt-3 mb-0" style={{ color: "var(--ink-faint)" }}>{est.observaciones}</p>}
    </div>
  );
}

function TabPagos({ est, tasaUsd, addPago, deletePago, confirm, success, toast, metodos }: {
  est: Estudiante; tasaUsd: number; addPago: (id: string, p: Pago) => void; deletePago: (id: string, pid: string) => void;
  confirm: (o: any) => Promise<boolean>; success: (t?: string) => void; toast: (t: string, tone?: any) => void;
  metodos: { id: string; nombre: string; bs: boolean; activo: boolean }[];
}) {
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState(metodos.find((m) => m.activo)?.nombre || "Divisas $");
  const [esBs, setEsBs] = useState(metodos.find((m) => m.activo)?.bs || false);
  const [ref, setRef] = useState("");
  const [obs, setObs] = useState("");
  const t = estudianteTotales(est);
  const met = metodos.find((m) => m.nombre === metodo);

  const montoNum = Number(monto) || 0;
  const usdEquiv = esBs ? montoNum / tasaUsd : montoNum;
  const bsEquiv = esBs ? montoNum : montoNum * tasaUsd;

  const guardar = async () => {
    if (montoNum <= 0) { toast("Indica un monto válido", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Abono de ${esBs ? fmtBs(montoNum) : fmtUSD(montoNum)} a la tasa del día ${fmtBs(tasaUsd)}. El saldo se actualizará automáticamente.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    addPago(est.id, { id: uid(), fecha: todayISO(), monto: montoNum, metodo, bs: esBs, tasa: tasaUsd, usd: +usdEquiv.toFixed(2), referencia: ref, observacion: obs });
    success();
    setPagoAbierto(false); setMonto(""); setRef(""); setObs("");
    const nuevoSaldo = Math.max(0, t.saldo - usdEquiv);
    if (nuevoSaldo <= 0.009) toast("¡Pago completado! Estado: PAGADO", "ok");
  };

  const quitar = async (p: Pago) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará el abono del ${fmtFecha(p.fecha)}.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePago(est.id, p.id);
    toast("Abono eliminado", "warn");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-semibold text-[13.5px]">Abonos ({est.pagos.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setPagoAbierto((v) => !v)}><Plus size={14} /> Registrar abono</button>
      </div>

      {pagoAbierto && (
        <div className="card p-4 mb-4 reveal" style={{ borderColor: "var(--blue-500)" }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={esBs ? "Monto (Bs)" : "Monto ($)"} required>
              <input type="number" min={0} className="input" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
            </Field>
            <Field label="Método de pago">
              <select className="select" value={metodo} onChange={(e) => { setMetodo(e.target.value); const m = metodos.find((x) => x.nombre === e.target.value); setEsBs(!!m?.bs); }}>
                {metodos.filter((m) => m.activo).map((m) => <option key={m.id}>{m.nombre}</option>)}
              </select>
            </Field>
            <Field label="Referencia (pago móvil / Zelle)"><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
            <Field label="Observación"><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
          </div>
          {montoNum > 0 && (
            <div className="mt-3 p-3 rounded-xl text-[12.5px] flex flex-wrap gap-x-5 gap-y-1" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>
              <span><Banknote size={12} className="inline mr-1" /> Conversión a tasa {fmtBs(tasaUsd)}:</span>
              <b>{esBs ? `${fmtBs(montoNum)} = ${fmtUSD(usdEquiv)}` : `${fmtUSD(montoNum)} = ${fmtBs(bsEquiv)}`}</b>
              <span>Saldo quedaría: <b style={{ color: t.saldo - usdEquiv <= 0.009 ? "var(--green)" : "var(--red)" }}>{fmtUSD(Math.max(0, t.saldo - usdEquiv))}</b></span>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary btn-sm" onClick={guardar}><Check size={14} /> Sí, Guardar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPagoAbierto(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {est.pagos.length === 0 ? (
        <div className="card"><EmptyState icon={Receipt} title="Sin abonos" text="Registra el primer pago de este estudiante." /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...est.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p) => (
            <div key={p.id} className="card p-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--green-tint)", color: "var(--green)" }}><Banknote size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-[14px]">{p.bs ? fmtBs(p.monto) : fmtUSD(p.monto)}</span>
                  <Badge tone="blue">{p.metodo}</Badge>
                  {p.referencia && <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Ref {p.referencia}</span>}
                </div>
                <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                  {fmtFecha(p.fecha)} · tasa {fmtBs(p.tasa)} → equivale {p.bs ? fmtUSD(p.usd) : fmtBs(p.monto * (p.tasa || tasaUsd))}
                </div>
              </div>
              <button className="icon-btn danger" onClick={() => quitar(p)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabPedido({ est, setPedidoEstado, saveCodigos, toast }: { est: Estudiante; setPedidoEstado: (id: string, s: string) => void; saveCodigos: (id: string, c: Estudiante["codigos"]) => void; toast: (t: string, tone?: any) => void }) {
  const idx = ESTADOS_PEDIDO.indexOf(est.estadoPedido);
  const [cod, setCod] = useState(est.codigos);
  const LABELS: [keyof Estudiante["codigos"], string][] = [
    ["carnetAlumno", "Carnet Alumno"], ["carnetRep", "Carnet Representante"], ["firmaLibro", "Firma Libro"],
    ["togaBirrete", "Toga y Birrete"], ["fotoLibre", "Foto Libre"], ["fotoAdicional", "Foto Adicional"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <SectionHead title="Estado del pedido" desc={`N° ${est.pedido} · registrado el ${fmtFecha(est.fechaRegistro)}`} />
        <div className="stepper">
          {ESTADOS_PEDIDO.map((s, i) => (
            <div key={s} className={`step ${i < idx ? "done" : i === idx ? "current" : ""}`}>
              <span className="bubble">{i < idx ? "✓" : i + 1}</span>
              <span className="lbl">{s}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {ESTADOS_PEDIDO.map((s) => (
            <button key={s} className={`btn btn-xs ${est.estadoPedido === s ? "btn-primary" : "btn-ghost"}`} onClick={() => { setPedidoEstado(est.id, s); if (s === "Entregado") toast(`Pedido entregado el ${fmtFecha(todayISO())}`, "ok"); else toast(`Estado: ${s}`, "ok"); }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <SectionHead title="Códigos de fotografía" desc="Para localizar las fotos en producción" />
        <div className="grid grid-cols-2 gap-3">
          {LABELS.map(([k, lbl]) => (
            <Field key={k} label={lbl}>
              <input className="input" value={cod[k]} onChange={(e) => setCod({ ...cod, [k]: e.target.value })} placeholder="Ej: F-1024" />
            </Field>
          ))}
        </div>
        <button className="btn btn-soft btn-sm mt-3" onClick={() => { saveCodigos(est.id, cod); toast("Códigos guardados", "ok"); }}><Check size={14} /> Guardar códigos</button>
      </div>
    </div>
  );
}

/* ---------------- Credencial compacta ---------------- */
function Credencial({ est, escuelaNombre }: { est: Estudiante; escuelaNombre: string }) {
  const { db } = useApp();
  const t = estudianteTotales(est);
  const payload = ["JYG", est.pedido, est.nombre, est.ci || "S/C", escuelaNombre, `${est.grado} "${est.seccion}"`, `Paq.${PAQUETES[est.paqueteId].nombre}`, `Saldo ${fmtUSD(t.saldo)}`].join("|");
  return (
    <div className="cred">
      <div className="cred-top">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,217,112,.2)", color: "#ffd970" }}><GraduationCap size={19} /></span>
        <div><b>{db.config.empresa.nombre}</b><small>Tarjeta de Grado · {new Date().getFullYear()}</small></div>
      </div>
      <div className="cred-body">
        <span className="cred-qr"><QRCode value={payload} size={104} /></span>
        <div className="cred-data">
          <b>{est.nombre}</b>
          {est.ci || "S/C"} · {est.pedido}<br />
          {est.grado} “{est.seccion}”<br />
          {escuelaNombre || "—"}<br />
          Paquete {PAQUETES[est.paqueteId].nombre}
        </div>
      </div>
      <div className="cred-foot"><span>Total {fmtUSD(t.total)}</span><span style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>Saldo {fmtUSD(t.saldo)}</span></div>
    </div>
  );
}
