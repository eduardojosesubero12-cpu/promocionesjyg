import React, { useMemo, useState } from "react";
import {
  ArrowRight, Check, FileText, GraduationCap, Pencil, Plus, Receipt, Search, Smartphone, Trash2, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { AdicionalItem, Cotizacion } from "../lib/data";
import { ADICIONALES, ESTADOS_PEDIDO, PAQUETES, estudianteTotales, fmtBs, fmtFecha, fmtUSD, todayISO, uid, waLink } from "../lib/data";
import { Badge, EmptyState, Field, Modal, SectionHead, estadoPedidoTone } from "../components/ui";

/* ================= PEDIDOS (VENTAS) ================= */

export function Pedidos() {
  const { db, setRoute, tasa } = useApp();
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("");

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...db.estudiantes]
      .filter((e) => (!t || [e.nombre, e.pedido, e.ci].some((v) => v.toLowerCase().includes(t))) && (!fEstado || e.estadoPedido === fEstado))
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  }, [db.estudiantes, q, fEstado]);

  const porEstado = (s: string) => db.estudiantes.filter((e) => e.estadoPedido === s).length;

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {ESTADOS_PEDIDO.map((s, i) => (
          <button key={s} onClick={() => setFEstado(fEstado === s ? "" : s)} className="card p-3.5 text-left cursor-pointer transition-all hover:-translate-y-1 reveal" style={{ animationDelay: `${i * 50}ms`, outline: fEstado === s ? "2px solid var(--blue)" : "none" }}>
            <div className="font-display font-bold text-[21px]" style={{ color: estadoPedidoTone(s) === "green" ? "var(--green)" : estadoPedidoTone(s) === "gold" ? "var(--gold-deep)" : estadoPedidoTone(s) === "slate" ? "var(--slate)" : "var(--blue)" }}>{porEstado(s)}</div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{s}</div>
          </button>
        ))}
      </div>

      <div className="card p-4 mb-5 flex flex-wrap gap-2.5 items-center">
        <div className="flex items-center gap-2 h-[38px] px-3 rounded-full flex-1 min-w-[200px]" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--ink-faint)" }} />
          <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar pedido, estudiante…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select !w-[170px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>N° Pedido</th><th>Estudiante</th><th>Fecha registro</th><th>Paquete</th><th>Total</th><th>Saldo (Bs)</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => setRoute("estudiantes", { open: e.id })}>
                    <td className="font-display font-bold text-[13px]">{e.pedido}</td>
                    <td>
                      <div className="font-display font-semibold text-[13.5px]">{e.nombre}</div>
                      <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.grado} “{e.seccion}”</div>
                    </td>
                    <td className="text-[12.5px]">{fmtFecha(e.fechaRegistro)}</td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td className="font-display font-semibold text-[13px]">{fmtUSD(t.total)}</td>
                    <td className="font-display font-bold text-[12.5px]" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtBs(t.saldo * tasa.usd)}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td><button className="btn btn-soft btn-xs">Abrir <ArrowRight size={11} /></button></td>
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

/* ================= COTIZACIONES ================= */

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
    saveCotizacion({ ...form, id: form.id || uid() });
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
    const ok = await confirm({ title: "¿Convertir en venta?", message: `Se creará un estudiante con el pedido a nombre de ${c.cliente} con el paquete ${PAQUETES[c.paqueteId].nombre}.`, confirmText: "Sí, Convertir" });
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {db.cotizaciones.map((c, i) => (
          <div key={c.id} className="card p-5 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-[15.5px] m-0">{c.numero}</h3>
                  <Badge tone={c.estado === "Aceptada" ? "green" : c.estado === "Rechazada" ? "red" : "amber"} dot>{c.estado}</Badge>
                </div>
                <p className="text-[12px] mt-0.5 mb-0" style={{ color: "var(--ink-faint)" }}>{fmtFecha(c.fecha)} · {c.escuela || "Escuela por definir"}</p>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-[19px]" style={{ color: "var(--blue)" }}>{fmtUSD(total(c))}</div>
                <Badge tone={c.paqueteId === "lujo" ? "gold" : c.paqueteId === "premium" ? "blue" : "slate"}>Paq. {PAQUETES[c.paqueteId].nombre}</Badge>
              </div>
            </div>
            <p className="text-[13px] m-0"><b className="font-display">{c.cliente}</b> · {c.telefono || "sin teléfono"}</p>
            {c.adicionales.length > 0 && (
              <p className="text-[12px] mt-1 mb-0" style={{ color: "var(--ink-soft)" }}>
                Adicionales: {c.adicionales.map((a) => `${a.cantidad}× ${a.producto}`).join(", ")}
              </p>
            )}
            {c.nota && <p className="text-[12px] italic mt-1.5 mb-0" style={{ color: "var(--ink-faint)" }}>{c.nota}</p>}
            <div className="flex gap-2 mt-4 flex-wrap">
              {c.estado === "Pendiente" && <button className="btn btn-primary btn-sm" onClick={() => convertir(c)}><GraduationCap size={14} /> Convertir en venta</button>}
              {c.telefono && (
                <a className="btn btn-soft btn-sm" style={{ background: "var(--green-tint)", color: "#1f9d55" }} href={waLink(c.telefono, `Hola ${c.cliente}, le saluda Promociones JyG 🎓. Su cotización ${c.numero} por ${fmtUSD(total(c))} (Paquete ${PAQUETES[c.paqueteId].nombre}) sigue disponible. ¿La reservamos?`)} target="_blank" rel="noreferrer">
                  <Smartphone size={13} /> Enviar WhatsApp
                </a>
              )}
              <button className="icon-btn" onClick={() => { setErrs({}); setForm(c); }}><Pencil size={15} /></button>
              <button className="icon-btn danger" onClick={() => eliminar(c)}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {db.cotizaciones.length === 0 && <div className="card"><EmptyState icon={Receipt} title="Sin cotizaciones" text="Crea la primera cotización para un representante." /></div>}

      {form && (
        <Modal open onClose={() => setForm(null)} size="lg" title={form.id ? `Editar ${form.numero}` : "Nueva cotización"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cliente / Representante" required error={errs.cliente}>
              <input className={`input ${errs.cliente ? "err" : ""}`} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} autoFocus />
            </Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Escuela" className="col-span-2">
              <select className="select" value={form.escuela} onChange={(e) => setForm({ ...form, escuela: e.target.value })}>
                <option value="">—</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Paquete">
              <select className="select" value={form.paqueteId} onChange={(e) => setForm({ ...form, paqueteId: e.target.value })}>
                {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className="select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Cotizacion["estado"] })}>
                <option>Pendiente</option><option>Aceptada</option><option>Rechazada</option>
              </select>
            </Field>
          </div>

          <div className="card p-4 mt-4" style={{ background: "var(--surface-2)" }}>
            <SectionHead title="Adicionales" />
            {form.adicionales.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] py-1.5">
                <span className="flex-1">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span>
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

          <Field label="Nota" className="mt-4"><textarea className="textarea" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>

          <div className="flex items-center justify-between mt-5">
            <span className="font-display font-bold text-[18px]" style={{ color: "var(--blue)" }}>Total: {fmtUSD(total(form))}</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
            </div>
          </div>
        </Modal>
      )}
      <span className="hidden"><FileText size={1} /></span>
    </div>
  );
}
