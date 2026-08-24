import React, { useMemo, useState } from "react";
import { Check, GraduationCap, Pencil, Plus, Receipt, Smartphone, Trash2, Wallet } from "lucide-react";
import { useApp } from "../lib/store";
import type { AdicionalItem, Cotizacion, Estudiante } from "../lib/data";
import { ADICIONALES, ESTADOS_PEDIDO, PAQUETES, estudianteTotales, fmtBs, fmtFecha, fmtUSD, todayISO, uid, waLink } from "../lib/data";
import { Badge, EmptyState, Field, FilterSelect, Modal, RowActions, SearchInput, SectionHead, Toolbar, estadoPedidoTone } from "../components/ui";

export function Pedidos() {
  const { db, setRoute, tasa, deleteEstudiante, confirm, toast } = useApp();
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("");

  const eliminarPedido = async (e: Estudiante) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará el pedido ${e.pedido} de "${e.nombre}" con sus pagos.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteEstudiante(e.id);
    toast("Pedido eliminado", "warn");
  };

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...db.estudiantes]
      .filter((e) => (!t || [e.nombre, e.pedido, e.ci].some((v) => v.toLowerCase().includes(t))) && (!fEstado || e.estadoPedido === fEstado))
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  }, [db.estudiantes, q, fEstado]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Ventas · Pedidos</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Cada estudiante tiene un pedido con su pipeline de producción</p>
        </div>
        <button className="btn btn-primary" onClick={() => setRoute("estudiantes", { openNew: true })}><Plus size={16} /> Nuevo pedido</button>
      </div>

      <div className="row g-3 mb-4">
        {ESTADOS_PEDIDO.map((s, i) => {
          const n = db.estudiantes.filter((e) => e.estadoPedido === s).length;
          const tone = estadoPedidoTone(s);
          const color = tone === "green" ? "var(--ok)" : tone === "slate" ? "var(--slate)" : "var(--jyg-navy)";
          return (
            <div key={s} className="col-6 col-md">
              <button className="card p-3 w-100 text-start reveal border-0" style={{ animationDelay: `${i * 50}ms`, outline: fEstado === s ? "2px solid var(--jyg-navy)" : "none", cursor: "pointer" }} onClick={() => setFEstado(fEstado === s ? "" : s)}>
                <div className="font-display fw-bold tabular-nums" style={{ fontSize: 21, color }}>{n}</div>
                <div className="text-uppercase" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "var(--ink-faint)" }}>{s}</div>
              </button>
            </div>
          );
        })}
      </div>

      <Toolbar count={lista.length} countLabel={lista.length === 1 ? "pedido" : "pedidos"}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar pedido, estudiante o cédula…" />
        <FilterSelect value={fEstado} onChange={setFEstado} allLabel="Todos los estados" width={180} options={ESTADOS_PEDIDO.map((s) => ({ v: s, l: s }))} />
      </Toolbar>

      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="tbl">
            <thead><tr><th>N° Pedido</th><th>Estudiante</th><th>Registro</th><th>Paquete</th><th>Total</th><th>Saldo (Bs)</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>
              {lista.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setRoute("estudiantes", { open: e.id })}>
                    <td className="font-display fw-bold" style={{ fontSize: 13 }}>{e.pedido}</td>
                    <td>
                      <div className="font-display fw-semibold" style={{ fontSize: 13.5 }}>{e.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.grado} “{e.seccion}”</div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{fmtFecha(e.fechaRegistro)}</td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{fmtUSD(t.total)}</td>
                    <td className="font-display fw-bold" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtBs(t.saldo * tasa.usd)}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td><RowActions onVer={() => setRoute("estudiantes", { open: e.id })} onEdit={() => setRoute("estudiantes", { open: e.id })} onDelete={() => eliminarPedido(e)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={Wallet} title="Sin pedidos" text="Registra estudiantes para generar pedidos automáticamente." />}
      </div>
    </div>
  );
}

const cotVacia = (): Cotizacion => ({ id: "", numero: "", fecha: todayISO(), cliente: "", telefono: "", escuela: "", paqueteId: "premium", adicionales: [], estado: "Pendiente", nota: "" });

export function Cotizaciones() {
  const { db, saveCotizacion, deleteCotizacion, convertirCotizacion, confirm, success, toast } = useApp();
  const [form, setForm] = useState<Cotizacion | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const total = (c: Cotizacion) => (PAQUETES[c.paqueteId]?.precioBase || 0) + c.adicionales.reduce((s, a) => s + a.cantidad * a.precio, 0);

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.cliente.trim()) er.cliente = "Cliente obligatorio";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveCotizacion({ ...form, id: form.id || uid(), numero: form.numero || `COT-${String(db.seqCot).padStart(4, "0")}` });
    success();
    setForm(null);
  };
  const eliminar = async (c: Cotizacion) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará la cotización ${c.numero}.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteCotizacion(c.id);
    toast("Registro eliminado", "warn");
  };
  const convertir = async (c: Cotizacion) => {
    const ok = await confirm({ title: "¿Convertir en venta?", message: `Se creará un estudiante con pedido a nombre de ${c.cliente} con el paquete ${PAQUETES[c.paqueteId].nombre}.`, confirmText: "Sí, Convertir" });
    if (!ok) return;
    convertirCotizacion(c.id);
    success("Cotización convertida en venta");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Cotizaciones / Ventas</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Presupuestos que se convierten en pedidos con un clic</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(cotVacia()); }}><Plus size={16} /> Nueva cotización</button>
      </div>

      <div className="row g-4">
        {db.cotizaciones.map((c, i) => (
          <div key={c.id} className="col-12 col-lg-6 col-xl-4">
            <div className="card p-4 h-100 reveal card-lift" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
              <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h3 className="font-display fw-bold m-0" style={{ fontSize: 15.5 }}>{c.numero}</h3>
                    <Badge tone={c.estado === "Aceptada" ? "green" : c.estado === "Rechazada" ? "red" : "amber"} dot>{c.estado}</Badge>
                  </div>
                  <p style={{ fontSize: 12, margin: "2px 0 0", color: "var(--ink-faint)" }}>{fmtFecha(c.fecha)} · {c.escuela || "Escuela por definir"}</p>
                </div>
                <div className="text-end">
                  <div className="font-display fw-bold" style={{ fontSize: 19, color: "var(--jyg-navy)" }}>{fmtUSD(total(c))}</div>
                  <Badge tone={c.paqueteId === "lujo" ? "gold" : c.paqueteId === "premium" ? "blue" : "slate"}>Paq. {PAQUETES[c.paqueteId].nombre}</Badge>
                </div>
              </div>
              <p style={{ fontSize: 13, margin: 0 }}><b className="font-display">{c.cliente}</b> · {c.telefono || "sin teléfono"}</p>
              {c.adicionales.length > 0 && <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--ink-soft)" }}>Adicionales: {c.adicionales.map((a) => `${a.cantidad}× ${a.producto}`).join(", ")}</p>}
              {c.nota && <p className="fst-italic" style={{ fontSize: 12, margin: "6px 0 0", color: "var(--ink-faint)" }}>{c.nota}</p>}
              <div className="d-flex gap-2 mt-3 flex-wrap">
                {c.estado === "Pendiente" && <button className="btn btn-primary btn-sm" onClick={() => convertir(c)}><GraduationCap size={14} /> Convertir en venta</button>}
                {c.telefono && (
                  <a className="btn btn-soft btn-sm" style={{ background: "var(--tint-ok)", color: "#1f9d55" }} href={waLink(c.telefono, `Hola ${c.cliente}, le saluda Promociones JyG 🎓. Su cotización ${c.numero} por ${fmtUSD(total(c))} sigue disponible.`)} target="_blank" rel="noreferrer">
                    <Smartphone size={13} /> WhatsApp
                  </a>
                )}
                <span className="ms-auto d-flex gap-1">
                  <button className="icon-btn" onClick={() => { setErrs({}); setForm(c); }} title="Editar"><Pencil size={15} /></button>
                  <button className="icon-btn danger" onClick={() => eliminar(c)} title="Eliminar"><Trash2 size={15} /></button>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {db.cotizaciones.length === 0 && <div className="card mt-3"><EmptyState icon={Receipt} title="Sin cotizaciones" text="Crea la primera cotización para un representante." /></div>}

      {form && (
        <Modal open onClose={() => setForm(null)} size="lg" title={form.id ? `Editar ${form.numero}` : "Nueva cotización"}>
          <div className="row g-3">
            <Field label="Cliente / Representante" required error={errs.cliente} className="col-md-6">
              <input className={`input ${errs.cliente ? "err" : ""}`} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} autoFocus />
            </Field>
            <Field label="Teléfono" className="col-md-6"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Escuela" className="col-12">
              <select className="select" value={form.escuela} onChange={(e) => setForm({ ...form, escuela: e.target.value })}>
                <option value="">—</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Paquete" className="col-md-6">
              <select className="select" value={form.paqueteId} onChange={(e) => setForm({ ...form, paqueteId: e.target.value })}>
                {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}
              </select>
            </Field>
            <Field label="Estado" className="col-md-6">
              <select className="select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Cotizacion["estado"] })}>
                <option>Pendiente</option><option>Aceptada</option><option>Rechazada</option>
              </select>
            </Field>
          </div>
          <div className="card p-3 mt-3" style={{ background: "var(--card-bg-2)" }}>
            <SectionHead title="Adicionales" />
            {form.adicionales.map((a, i) => (
              <div key={i} className="d-flex align-items-center gap-2 py-1" style={{ fontSize: 13 }}>
                <span className="flex-grow-1">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span>
                <b className="font-display">${(a.cantidad * a.precio).toFixed(2)}</b>
                <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => setForm({ ...form, adicionales: form.adicionales.filter((_, j) => j !== i) })}><Trash2 size={13} /></button>
              </div>
            ))}
            <select className="select mt-2" defaultValue="" onChange={(e) => {
              const prod = ADICIONALES.find((a) => a.nombre === e.target.value);
              if (prod) setForm({ ...form, adicionales: [...form.adicionales, { producto: prod.nombre, cantidad: 1, precio: prod.precio, talla: "" } as AdicionalItem] });
              e.target.value = "";
            }}>
              <option value="" disabled>+ Agregar adicional…</option>
              {ADICIONALES.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre} — ${a.precio}</option>)}
            </select>
          </div>
          <Field label="Nota" className="mt-3"><textarea className="textarea" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>
          <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
            <span className="font-display fw-bold" style={{ fontSize: 18, color: "var(--jyg-navy)" }}>Total: {fmtUSD(total(form))}</span>
            <div className="d-flex gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
