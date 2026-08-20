import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  Banknote, Check, CreditCard, Eye, GraduationCap, ImagePlus, Package, Pencil, Plus, Printer,
  QrCode, ScanLine, Search, Trash2, Wallet, X,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { AdicionalItem, Estudiante, Pago } from "../lib/data";
import {
  ADICIONALES, CODIGO_PREFIJOS, ESTADOS_PEDIDO, GRADOS, PAQUETES, SECCIONES, TALLAS,
  estudianteTotales, fmtBs, fmtFecha, fmtUSD, todayISO, uid,
} from "../lib/data";
import { Badge, Drawer, EmptyState, Field, Modal, SectionHead, estadoPagoTone, estadoPedidoTone } from "../components/ui";
import { TarjetaQR } from "./EtiquetasQR";

/* ================= FORMULARIO ================= */

const vacio = (): Estudiante => ({
  id: "", nombre: "", telefono: "", representante: "", ci: "", escuelaId: "", docenteId: "",
  grado: "Sexto Grado", seccion: "A", paqueteId: "premium", precioPaquete: 40, adicionales: [],
  pagos: [], estadoPedido: "Registrado", fechaRegistro: todayISO(), fechaEntrega: "", pedido: "",
  observaciones: "", codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
});

function EstudianteForm({ initial, onClose }: { initial: Partial<Estudiante>; onClose: () => void }) {
  const { db, saveEstudiante, confirm, success, toast } = useApp();
  const [f, setF] = useState<Estudiante>({ ...vacio(), ...initial, id: initial?.id || uid() });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const esNuevo = !initial?.id || !db.estudiantes.some((e) => e.id === initial.id);
  const set = (patch: Partial<Estudiante>) => setF((x) => ({ ...x, ...patch }));
  const docentesDeEscuela = db.docentes.filter((d) => d.escuelaId === f.escuelaId);

  const [nuevoAd, setNuevoAd] = useState({ producto: ADICIONALES[0].nombre, cantidad: 1, talla: "" });

  const guardar = async () => {
    const er: Record<string, string> = {};
    if (!f.nombre.trim()) er.nombre = "Nombre obligatorio";
    if (!f.escuelaId) er.escuelaId = "Selecciona la escuela";
    setErrs(er);
    if (Object.keys(er).length) { toast("Revisa los campos marcados", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveEstudiante(f);
    success();
    onClose();
  };

  const addAd = () => {
    const prod = ADICIONALES.find((a) => a.nombre === nuevoAd.producto)!;
    const item: AdicionalItem = { producto: prod.nombre, cantidad: Math.max(1, nuevoAd.cantidad), precio: prod.precio, talla: nuevoAd.talla };
    set({ adicionales: [...f.adicionales, item] });
    setNuevoAd({ producto: ADICIONALES[0].nombre, cantidad: 1, talla: "" });
  };

  const total = f.precioPaquete + f.adicionales.reduce((s, a) => s + a.cantidad * a.precio, 0);

  return (
    <Modal open onClose={onClose} size="lg" title={esNuevo ? "Nuevo estudiante" : "Editar estudiante"} subtitle={esNuevo ? "Al guardar se genera el número de pedido automáticamente" : `Pedido ${f.pedido || "—"}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre del alumno" required error={errs.nombre} className="md:col-span-2">
          <input className={`input ${errs.nombre ? "err" : ""}`} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Nombre y apellido" />
        </Field>
        <Field label="Cédula de identidad"><input className="input" value={f.ci} onChange={(e) => set({ ci: e.target.value })} placeholder="V-00.000.000" /></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => set({ telefono: e.target.value })} placeholder="0414-000.00.00" /></Field>
        <Field label="Representante"><input className="input" value={f.representante} onChange={(e) => set({ representante: e.target.value })} /></Field>
        <Field label="Escuela" required error={errs.escuelaId}>
          <select className={`select ${errs.escuelaId ? "err" : ""}`} value={f.escuelaId} onChange={(e) => set({ escuelaId: e.target.value, docenteId: "" })}>
            <option value="">— Seleccione —</option>
            {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Field>
        <Field label="Docente">
          <select className="select" value={f.docenteId} onChange={(e) => set({ docenteId: e.target.value })}>
            <option value="">— Seleccione —</option>
            {docentesDeEscuela.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </Field>
        <Field label="Grado">
          <select className="select" value={f.grado} onChange={(e) => set({ grado: e.target.value })}>
            {GRADOS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Sección">
          <select className="select" value={f.seccion} onChange={(e) => set({ seccion: e.target.value })}>
            {SECCIONES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Paquete">
          <select className="select" value={f.paqueteId} onChange={(e) => { const p = PAQUETES[e.target.value]; set({ paqueteId: p.id, precioPaquete: p.precioBase }); }}>
            {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}
          </select>
        </Field>
        <Field label="Precio del paquete (USD)" hint="El administrador puede usar cualquier precio configurable">
          <select className="select" value={f.precioPaquete} onChange={(e) => set({ precioPaquete: Number(e.target.value) })}>
            {[...new Set([...db.config.preciosPaquetes, f.precioPaquete])].sort((a, b) => a - b).map((p) => <option key={p} value={p}>${p}</option>)}
          </select>
        </Field>
      </div>

      {/* Adicionales */}
      <div className="card p-4 mt-4" style={{ background: "var(--surface-2)" }}>
        <SectionHead title="Artículos adicionales" desc="Tazas, franelas, monturas y más — con talla si aplica" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Producto" className="col-span-2">
            <select className="select" value={nuevoAd.producto} onChange={(e) => setNuevoAd({ ...nuevoAd, producto: e.target.value, talla: "" })}>
              {ADICIONALES.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre} — ${a.precio}</option>)}
            </select>
          </Field>
          <Field label="Cantidad"><input type="number" min={1} className="input" value={nuevoAd.cantidad} onChange={(e) => setNuevoAd({ ...nuevoAd, cantidad: Number(e.target.value) || 1 })} /></Field>
          {(() => {
            const prod = ADICIONALES.find((a) => a.nombre === nuevoAd.producto);
            return prod?.conTalla ? (
              <Field label={prod.tallaNumerica ? "Talla (número)" : "Talla"}>
                <select className="select" value={nuevoAd.talla} onChange={(e) => setNuevoAd({ ...nuevoAd, talla: e.target.value })}>
                  <option value="">—</option>
                  {(prod.tallaNumerica ? ["14", "15", "16", "17", "18", "19", "20", "21", "22"] : TALLAS).map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Subtotal"><div className="input flex items-center font-display font-bold" style={{ background: "var(--surface)" }}>${((ADICIONALES.find((a) => a.nombre === nuevoAd.producto)?.precio || 0) * (nuevoAd.cantidad || 1)).toFixed(2)}</div></Field>
            );
          })()}
        </div>
        <button className="btn btn-soft btn-sm mt-3" onClick={addAd}><Plus size={14} /> Agregar al pedido</button>

        {f.adicionales.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {f.adicionales.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] p-2 rounded-lg" style={{ background: "var(--surface)" }}>
                <span className="flex-1 font-display font-semibold">{a.cantidad}× {a.producto}{a.talla ? ` · Talla ${a.talla}` : ""}</span>
                <b className="font-display">${(a.cantidad * a.precio).toFixed(2)}</b>
                <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => set({ adicionales: f.adicionales.filter((_, j) => j !== i) })}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
          <span className="font-display font-semibold text-[13px]" style={{ color: "var(--ink-soft)" }}>Total del pedido</span>
          <span className="font-display font-bold text-[20px]" style={{ color: "var(--blue)" }}>{fmtUSD(total)}</span>
        </div>
      </div>

      <Field label="Observaciones" className="mt-4">
        <textarea className="textarea" value={f.observaciones} onChange={(e) => set({ observaciones: e.target.value })} />
      </Field>

      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
      </div>
    </Modal>
  );
}

/* ================= CREDENCIAL CLÁSICA ================= */

export function Credencial({ est, escuelaNombre }: { est: Estudiante; escuelaNombre: string }) {
  const t = estudianteTotales(est);
  const qrValue = `JYG|${est.pedido}|${est.nombre}|${est.ci}|${est.grado} ${est.seccion}|${PAQUETES[est.paqueteId].nombre}|${escuelaNombre}|Saldo ${fmtUSD(t.saldo)}`;
  return (
    <div className="cred">
      <div className="cred-top">
        <GraduationCap size={22} style={{ color: "#ffd970" }} />
        <div>
          <b>Promociones JyG</b>
          <small>Pase de grado · {est.pedido}</small>
        </div>
      </div>
      <div className="cred-body">
        <div className="cred-qr"><QRCode value={qrValue} size={96} /></div>
        <div className="cred-data">
          <b>{est.nombre}</b>
          {est.ci && <div>C.I. {est.ci}</div>}
          <div>{est.grado} · Sección “{est.seccion}”</div>
          <div style={{ color: "#5a6478" }}>{escuelaNombre}</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ background: "#e6f2fd", color: "#104172", borderRadius: 99, padding: "2px 9px", fontSize: 10.5, fontWeight: 700, fontFamily: "Poppins" }}>
              Paquete {PAQUETES[est.paqueteId].nombre}
            </span>
          </div>
        </div>
      </div>
      <div className="cred-foot">
        <span>{new Date().getFullYear()} · Promoción</span>
        <span style={{ fontWeight: 700, color: "#104172", fontFamily: "Poppins" }}>🎓 {est.grado === "Bachiller" || est.grado === "Técnicos" ? "Bachilleres" : "Grado"}</span>
      </div>
    </div>
  );
}

/* ================= PESTAÑA QR (tarjeta / credencial) ================= */

function QrTab({ est, escuelaNombre, tasaHoy, vista, setVista }: {
  est: Estudiante; escuelaNombre: string; tasaHoy: number;
  vista: "tarjeta" | "credencial"; setVista: (v: "tarjeta" | "credencial") => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex rounded-full p-1 gap-1 mb-6" style={{ background: "var(--slate-tint)" }}>
        {([["tarjeta", CreditCard, "Tarjeta QR 7×5"], ["credencial", QrCode, "Credencial"]] as const).map(([v, Ic, lbl]) => (
          <button key={v} onClick={() => setVista(v)} className="flex items-center gap-1.5 border-none cursor-pointer font-display font-semibold text-[12.5px] px-4 py-2 rounded-full transition-all" style={{ background: vista === v ? "var(--surface)" : "transparent", color: vista === v ? "var(--blue)" : "var(--ink-soft)", boxShadow: vista === v ? "var(--shadow-sm)" : "none" }}>
            <Ic size={14} /> {lbl}
          </button>
        ))}
      </div>

      {vista === "tarjeta" ? (
        <TarjetaQR est={est} escuelaNombre={escuelaNombre} tasaHoy={tasaHoy} />
      ) : (
        <Credencial est={est} escuelaNombre={escuelaNombre} />
      )}

      <button className="btn btn-primary mt-7" onClick={() => setTimeout(() => window.print(), 80)}>
        <Printer size={15} /> Imprimir {vista === "tarjeta" ? "tarjeta" : "credencial"}
      </button>
      <p style={{ fontSize: 12, marginTop: 12, marginBottom: 0, textAlign: "center", maxWidth: 380, color: "var(--ink-faint)" }}>
        {vista === "tarjeta"
          ? "La tarjeta se imprime en 70 × 50 mm (tamaño crédito) con frente y reverso lado a lado. El QR guarda pedido, identidad, totales, abonos y saldo."
          : "La credencial contiene el número de pedido y los datos del estudiante para localizarlo en producción y entrega."}
      </p>
    </div>
  );
}

/* ================= EXPEDIENTE ================= */

function Expediente({ est, onClose, onEdit, qrVista, setQrVista }: {
  est: Estudiante; onClose: () => void; onEdit: () => void;
  qrVista: "tarjeta" | "credencial"; setQrVista: (v: "tarjeta" | "credencial") => void;
}) {
  const { db, addPago, deletePago, setPedidoEstado, saveCodigos, confirm, success, toast, tasa } = useApp();
  const [tab, setTab] = useState<"pagos" | "paquete" | "pedido" | "codigos" | "qr">("pagos");
  const t = estudianteTotales(est);
  const escuela = db.escuelas.find((e) => e.id === est.escuelaId);
  const docente = db.docentes.find((d) => d.id === est.docenteId);

  const [pFecha, setPFecha] = useState(todayISO());
  const [pMonto, setPMonto] = useState("");
  const [pMetodo, setPMetodo] = useState(db.config.metodos.find((m) => m.activo)?.id || "m1");
  const [pRef, setPRef] = useState("");
  const [pObs, setPObs] = useState("");

  const metodo = db.config.metodos.find((m) => m.id === pMetodo);
  const montoNum = Number(pMonto) || 0;
  const usdEq = metodo?.bs ? montoNum / (tasa.usd || 1) : montoNum;

  const registrarAbono = async () => {
    if (montoNum <= 0) { toast("Indica un monto válido", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Abono de ${metodo?.bs ? fmtBs(montoNum) : fmtUSD(montoNum)} (${fmtUSD(usdEq)}) a tasa ${fmtBs(tasa.usd)}.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    addPago(est.id, { fecha: pFecha, monto: montoNum, metodo: metodo?.nombre || "", bs: !!metodo?.bs, tasa: tasa.usd, usd: Math.round(usdEq * 100) / 100, referencia: pRef, observacion: pObs });
    const nuevoSaldo = t.saldo - usdEq;
    success();
    setPMonto(""); setPRef(""); setPObs("");
    if (nuevoSaldo <= 0.009) toast(`🎉 ${est.nombre} quedó PAGADO COMPLETO`, "ok");
  };

  const quitarPago = async (p: Pago) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará el abono de ${fmtUSD(p.usd)} del ${fmtFecha(p.fecha)}.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePago(est.id, p.id);
    toast("Abono eliminado — saldo recalculado", "warn");
  };

  const avanzarEstado = async (estado: string) => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `El pedido ${est.pedido} pasará a "${estado}"${estado === "Entregado" ? " y se registrará la fecha de entrega" : ""}.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setPedidoEstado(est.id, estado);
    success();
  };

  const idxEstado = ESTADOS_PEDIDO.indexOf(est.estadoPedido);

  return (
    <Drawer open onClose={onClose}>
      <div className="p-5">
        <div className="flex items-start gap-3.5 mb-5">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-[20px] flex-shrink-0" style={{ background: "linear-gradient(150deg, var(--blue), #0b2e52)", color: "#ffd970" }}>
            {est.nombre[0]}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-[20px] m-0 truncate">{est.nombre}</h2>
            <p style={{ fontSize: 12.5, margin: "2px 0 0", color: "var(--ink-soft)" }}>
              {est.pedido} · {est.grado} “{est.seccion}” · {escuela?.nombre || "Sin escuela"}
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Badge tone={estadoPedidoTone(est.estadoPedido)} dot>{est.estadoPedido}</Badge>
              <Badge tone={estadoPagoTone(t.estadoPago)}>{t.estadoPago}</Badge>
              <Badge tone="blue">Paquete {PAQUETES[est.paqueteId].nombre}</Badge>
            </div>
          </div>
          <button className="icon-btn" onClick={onEdit} title="Editar"><Pencil size={16} /></button>
          <button className="icon-btn danger" onClick={onClose} title="Cerrar"><X size={17} /></button>
        </div>

        {/* Resumen de dinero */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { l: "Total pedido", v: fmtUSD(t.total), sub: fmtBs(t.total * tasa.usd), c: "var(--blue)" },
            { l: "Abonado", v: fmtUSD(t.abonado), sub: `${t.partes} pago${t.partes === 1 ? "" : "s"}`, c: "var(--green)" },
            { l: "Saldo", v: fmtUSD(t.saldo), sub: fmtBs(t.saldo * tasa.usd), c: t.saldo > 0 ? "var(--red)" : "var(--green)" },
          ].map((x) => (
            <div key={x.l} className="card p-3.5 text-center">
              <div className="text-[10px] font-display font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{x.l}</div>
              <div className="font-display font-bold text-[17px] mt-0.5" style={{ color: x.c }}>{x.v}</div>
              <div className="text-[10.5px]" style={{ color: "var(--ink-faint)" }}>{x.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {([["pagos", Wallet, "Pagos"], ["paquete", Package, "Paquete"], ["pedido", Eye, "Pedido"], ["codigos", ImagePlus, "Códigos"], ["qr", QrCode, "QR"]] as const).map(([k, Ic, lbl]) => (
            <button key={k} onClick={() => setTab(k)} className="flex items-center gap-1.5 border-none cursor-pointer font-display font-semibold text-[12.5px] px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap" style={{ background: tab === k ? "var(--blue)" : "var(--surface)", color: tab === k ? "#fff" : "var(--ink-soft)", border: tab === k ? "none" : "1px solid var(--border)" }}>
              <Ic size={14} /> {lbl}
            </button>
          ))}
        </div>

        {tab === "pagos" && (
          <div>
            <div className="card p-4 mb-4">
              <SectionHead title="Registrar abono" desc={`Tasa del día: ${fmtBs(tasa.usd)} por $1 — los pagos en Bs se convierten automáticamente`} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha"><input type="date" className="input" value={pFecha} onChange={(e) => setPFecha(e.target.value)} /></Field>
                <Field label="Método de pago">
                  <select className="select" value={pMetodo} onChange={(e) => setPMetodo(e.target.value)}>
                    {db.config.metodos.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </Field>
                <Field label={metodo?.bs ? "Monto (Bs)" : "Monto (USD)"} hint={metodo?.bs ? `Equivalente: ${fmtUSD(usdEq)} a tasa ${fmtBs(tasa.usd)}` : undefined}>
                  <input type="number" min={0} step="0.01" className="input" value={pMonto} onChange={(e) => setPMonto(e.target.value)} placeholder={metodo?.bs ? "0,00" : "0.00"} />
                </Field>
                <Field label="Referencia"><input className="input" value={pRef} onChange={(e) => setPRef(e.target.value)} placeholder="N° de operación" /></Field>
                <Field label="Observación" className="col-span-2"><input className="input" value={pObs} onChange={(e) => setPObs(e.target.value)} /></Field>
              </div>
              <button className="btn btn-primary mt-3" onClick={registrarAbono}><Banknote size={15} /> Registrar abono</button>
            </div>

            <SectionHead title={`Historial de pagos (${est.pagos.length})`} />
            {est.pagos.length === 0 ? (
              <div className="card"><EmptyState icon={Wallet} title="Sin abonos registrados" text="Registra el primer pago con la tasa del día." /></div>
            ) : (
              <div className="flex flex-col gap-2">
                {[...est.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p) => (
                  <div key={p.id} className="card p-3.5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--green-tint)", color: "var(--green)" }}><Banknote size={17} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-[13.5px]">{fmtUSD(p.usd)} <span className="font-normal text-[12px]" style={{ color: "var(--ink-faint)" }}>· {p.metodo}{p.bs ? ` (${fmtBs(p.monto)})` : ""}</span></div>
                      <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{fmtFecha(p.fecha)} · tasa {fmtBs(p.tasa)}{p.referencia ? ` · Ref. ${p.referencia}` : ""}</div>
                    </div>
                    <button className="icon-btn danger" onClick={() => quitarPago(p)}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "paquete" && (
          <div>
            <div className="card p-4 mb-4" style={{ borderLeft: `4px solid ${PAQUETES[est.paqueteId].color}` }}>
              <SectionHead title={`Paquete ${PAQUETES[est.paqueteId].nombre}`} desc={`Precio: ${fmtUSD(est.precioPaquete)}`} />
              <ul className="m-0 p-0 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {PAQUETES[est.paqueteId].incluye.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px]"><Check size={14} style={{ color: "var(--green)" }} /> {i}</li>
                ))}
              </ul>
            </div>
            {est.adicionales.length > 0 && (
              <div className="card p-4">
                <SectionHead title="Adicionales" />
                {est.adicionales.map((a, i) => (
                  <div key={i} className="flex justify-between text-[13.5px] py-1.5 border-b last:border-0" style={{ borderColor: "var(--border-soft)" }}>
                    <span>{a.cantidad}× {a.producto}{a.talla ? ` · Talla ${a.talla}` : ""}</span>
                    <b className="font-display">${(a.cantidad * a.precio).toFixed(2)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "pedido" && (
          <div>
            <div className="card p-5 mb-4">
              <SectionHead title="Pipeline de producción" desc="Cambia el estado — al entregar se registra la fecha automáticamente" />
              <div className="stepper mb-5">
                {ESTADOS_PEDIDO.map((s, i) => (
                  <div key={s} className={`step ${i < idxEstado ? "done" : i === idxEstado ? "current" : ""}`}>
                    <span className="bubble">{i < idxEstado ? "✓" : i + 1}</span>
                    <span className="lbl">{s}</span>
                  </div>
                ))}
              </div>
              <select className="select" value={est.estadoPedido} onChange={(e) => avanzarEstado(e.target.value)}>
                {ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3.5">
                <span className="block font-display font-semibold uppercase text-[10px] tracking-wider" style={{ color: "var(--ink-faint)" }}>Fecha de registro</span>
                <b>{fmtFecha(est.fechaRegistro)}</b>
              </div>
              <div className="card p-3.5" style={{ background: est.fechaEntrega ? "var(--green-tint)" : undefined }}>
                <span className="block font-display font-semibold uppercase text-[10px] tracking-wider" style={{ color: "var(--ink-faint)" }}>Fecha de entrega</span>
                <b style={{ color: est.fechaEntrega ? "var(--green)" : "var(--ink-faint)" }}>{est.fechaEntrega ? fmtFecha(est.fechaEntrega) : "Pendiente"}</b>
              </div>
            </div>
            <div className="card p-4 mt-3 text-[13px]" style={{ color: "var(--ink-soft)" }}>
              <b style={{ color: "var(--ink)" }}>Datos:</b> {est.ci || "S/C"} · Rep. {est.representante || "—"} · {est.telefono || "sin teléfono"}
              {docente && <> · Docente: {docente.nombre}</>}
              {est.observaciones && <p className="m-0 mt-2 italic">{est.observaciones}</p>}
            </div>
          </div>
        )}

        {tab === "codigos" && <CodigosPanel est={est} onSave={saveCodigos} confirm={confirm} success={success} />}

        {tab === "qr" && (
          <QrTab est={est} escuelaNombre={escuela?.nombre || ""} tasaHoy={tasa.usd} vista={qrVista} setVista={setQrVista} />
        )}
      </div>
    </Drawer>
  );
}

function CodigosPanel({ est, onSave, confirm, success }: { est: Estudiante; onSave: (id: string, c: Estudiante["codigos"]) => void; confirm: any; success: any }) {
  const [c, setC] = useState({ ...est.codigos });
  const guardar = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    onSave(est.id, c);
    success();
  };
  return (
    <div className="card p-4">
      <SectionHead title="Códigos de fotografía" desc="Permiten localizar rápidamente las fotos durante producción" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CODIGO_PREFIJOS.map(([k, lbl]) => (
          <Field key={k} label={lbl}>
            <input className="input" value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} placeholder="F-0000" />
          </Field>
        ))}
      </div>
      <button className="btn btn-primary mt-4" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
    </div>
  );
}

/* ================= PÁGINA ================= */

export default function Estudiantes() {
  const { db, param, setParam, deleteEstudiante, confirm, toast, ocrDraft, setOcrDraft, setOcrOpen, tasa, user } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [fGrado, setFGrado] = useState("");
  const [fSeccion, setFSeccion] = useState("");
  const [fPago, setFPago] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [formOpen, setFormOpen] = useState<Partial<Estudiante> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [qrVista, setQrVista] = useState<"tarjeta" | "credencial">("tarjeta");

  useEffect(() => {
    if (param?.open) { setOpenId(param.open); setParam(null); }
    if (param?.openNew) { setFormOpen({}); setParam(null); }
  }, [param, setParam]);

  useEffect(() => {
    if (ocrDraft) {
      setFormOpen({ nombre: ocrDraft.nombre, ci: ocrDraft.ci });
      toast("Datos OCR cargados en el formulario", "ok");
      setOcrDraft(null);
    }
  }, [ocrDraft, setOcrDraft, toast]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.estudiantes.filter((e) => {
      const tt = estudianteTotales(e);
      if (t && ![e.nombre, e.ci, e.pedido, e.representante, e.telefono].some((v) => v.toLowerCase().includes(t))) return false;
      if (fEscuela && e.escuelaId !== fEscuela) return false;
      if (fGrado && e.grado !== fGrado) return false;
      if (fSeccion && e.seccion !== fSeccion) return false;
      if (fPago && tt.estadoPago !== fPago) return false;
      if (fEstado && e.estadoPedido !== fEstado) return false;
      return true;
    });
  }, [db.estudiantes, q, fEscuela, fGrado, fSeccion, fPago, fEstado]);

  const abierto = openId ? db.estudiantes.find((e) => e.id === openId) : null;
  const escuelaDe = (id: string) => db.escuelas.find((e) => e.id === id);
  const puedeEditar = user?.rol === "admin" || user?.rol === "operador" || user?.rol === "cobranza";

  const eliminar = async (e: Estudiante) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a ${e.nombre} con su pedido ${e.pedido}, pagos y códigos.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteEstudiante(e.id);
    toast("Registro eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Estudiantes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>{lista.length} estudiantes · cada uno con su pedido, pagos y tarjeta QR</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={() => setOcrOpen(true)} title="Escanear cédula o partida de nacimiento"><ScanLine size={16} /> Escanear documento</button>
          <button className="btn btn-primary" onClick={() => setFormOpen({})}><Plus size={16} /> Nuevo estudiante</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-5 flex flex-wrap gap-2.5 items-center">
        <div className="flex items-center gap-2 h-[38px] px-3 rounded-full flex-1 min-w-[200px]" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--ink-faint)" }} />
          <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar nombre, cédula, pedido, representante…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select !w-[180px]" value={fEscuela} onChange={(e) => setFEscuela(e.target.value)}><option value="">Escuela</option>{db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <select className="select !w-[140px]" value={fGrado} onChange={(e) => setFGrado(e.target.value)}><option value="">Grado</option>{GRADOS.map((g) => <option key={g}>{g}</option>)}</select>
        <select className="select !w-[110px]" value={fSeccion} onChange={(e) => setFSeccion(e.target.value)}><option value="">Secc.</option>{SECCIONES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select !w-[160px]" value={fPago} onChange={(e) => setFPago(e.target.value)}><option value="">Estado de pago</option>{["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select !w-[150px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}><option value="">Pedido</option>{ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Estudiante</th><th>Pedido</th><th>Grado</th><th>Paquete</th><th>Total</th><th>Saldo</th><th>Estado pago</th><th>Pedido</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => setOpenId(e.id)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12px] flex-shrink-0" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>{e.nombre[0]}</span>
                        <div className="leading-tight">
                          <div className="font-display font-semibold text-[13.5px]">{e.nombre}</div>
                          <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.ci || "S/C"} · {escuelaDe(e.escuelaId)?.nombre || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-display font-bold text-[12.5px]">{e.pedido}</td>
                    <td className="text-[12.5px]">{e.grado} “{e.seccion}”</td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td className="font-display font-semibold text-[13px]">{fmtUSD(t.total)}</td>
                    <td className="font-display font-bold text-[13px]" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(t.saldo)}</td>
                    <td><Badge tone={estadoPagoTone(t.estadoPago)} dot>{t.estadoPago}</Badge></td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)}>{e.estadoPedido}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                        <button className="icon-btn" title="Tarjeta / Credencial QR" onClick={() => setOpenId(e.id)}><QrCode size={16} /></button>
                        {puedeEditar && <button className="icon-btn" title="Editar" onClick={() => setFormOpen(e)}><Pencil size={15} /></button>}
                        {user?.rol === "admin" && <button className="icon-btn danger" title="Eliminar" onClick={() => eliminar(e)}><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={GraduationCap} title="Sin resultados" text="Ajusta los filtros o registra un nuevo estudiante." />}
      </div>

      {/* Hoja de impresión (respeta la vista QR elegida) */}
      {abierto && (
        <div className={`print-sheet ${qrVista === "tarjeta" ? "print-sheet--tarj" : ""}`}>
          {qrVista === "tarjeta"
            ? <TarjetaQR est={abierto} escuelaNombre={escuelaDe(abierto.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />
            : <Credencial est={abierto} escuelaNombre={escuelaDe(abierto.escuelaId)?.nombre || ""} />}
        </div>
      )}

      {formOpen && <EstudianteForm initial={formOpen} onClose={() => setFormOpen(null)} />}
      {abierto && !formOpen && (
        <Expediente est={abierto} onClose={() => setOpenId(null)} onEdit={() => setFormOpen(abierto)} qrVista={qrVista} setQrVista={setQrVista} />
      )}
    </div>
  );
}
