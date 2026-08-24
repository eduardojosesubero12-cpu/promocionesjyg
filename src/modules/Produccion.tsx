import React, { useMemo, useState } from "react";
import { Boxes, Camera, Download, Factory, ImageOff, Shirt } from "lucide-react";
import { useApp } from "../lib/store";
import {
  ESTADOS_PEDIDO, ORDEN_MATERIALES, PAQUETES, codigosCompletos, computeProduccion,
  downloadFile, estudianteTotales, fmtUSD, toCSV,
} from "../lib/data";
import { Badge, Bar, SectionHead, estadoPedidoTone } from "../components/ui";

export default function Produccion() {
  const { db, setRoute } = useApp();
  const [fEstado, setFEstado] = useState("");

  const base = useMemo(() => db.estudiantes.filter((e) => (!fEstado || e.estadoPedido === fEstado) && e.estadoPedido !== "Entregado"), [db.estudiantes, fEstado]);
  const prod = useMemo(() => computeProduccion(base), [base]);
  const sinFotos = useMemo(() => db.estudiantes.filter((e) => !codigosCompletos(e) && e.estadoPedido !== "Entregado"), [db.estudiantes]);

  const materiales = useMemo(() => {
    const rows = ORDEN_MATERIALES.map((m) => ({ nombre: m, cantidad: prod.materiales[m] || 0 }));
    for (const [m, q] of Object.entries(prod.materiales)) if (!ORDEN_MATERIALES.includes(m)) rows.push({ nombre: m, cantidad: q });
    return rows;
  }, [prod]);
  const maxMat = Math.max(1, ...materiales.map((m) => m.cantidad));

  const exportar = () => {
    const rows = materiales.filter((m) => m.cantidad > 0).map((m) => [m.nombre, m.cantidad]);
    downloadFile("produccion-jyg.csv", toCSV(["Material", "Cantidad"], rows));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Producción</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>El sistema calcula automáticamente los materiales necesarios · {base.length} pedidos en cola</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select className="select" style={{ width: 180 }} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="">Pedidos pendientes</option>
            {ESTADOS_PEDIDO.filter((s) => s !== "Entregado").map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={exportar}><Download size={15} /> Exportar</button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {Object.values(PAQUETES).map((p, i) => (
          <div key={p.id} className="col-12 col-md-4">
            <div className="card p-4 reveal" style={{ animationDelay: `${i * 60}ms`, borderLeft: `4px solid ${p.color}` }}>
              <div className="d-flex align-items-center justify-content-between">
                <span className="font-display fw-semibold" style={{ fontSize: 13.5, color: p.color }}>Paquete {p.nombre}</span>
                <span className="font-display fw-bold tabular-nums" style={{ fontSize: 24 }}>{prod.combos[p.id] || 0}</span>
              </div>
              <p style={{ fontSize: 11.5, margin: "4px 0 0", color: "var(--ink-faint)" }}>en cola de producción</p>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Total de solicitud" desc="Materiales generados automáticamente por paquete + adicionales" actions={<Factory size={20} style={{ color: "var(--ink-faint)" }} />} />
            <div className="d-flex flex-column gap-2">
              {materiales.map((m) => (
                <div key={m.nombre} className="d-flex align-items-center gap-3">
                  <span className="fw-semibold text-truncate" style={{ fontSize: 13, width: 160, color: "var(--ink-soft)" }}>{m.nombre}</span>
                  <div className="flex-grow-1"><Bar pct={(m.cantidad / maxMat) * 100} color={m.cantidad > 0 ? "var(--jyg-navy)" : "var(--line)"} height={9} /></div>
                  <span className="font-display fw-bold tabular-nums text-end" style={{ fontSize: 15, width: 40 }}>{m.cantidad}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-3 d-flex align-items-center gap-2" style={{ fontSize: 12.5, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>
              <Boxes size={16} /> Ejemplo: 100 paquetes Lujo → 100 afiches 30x40, 100 estolas, 200 fotos 6x8, 100 llaveros.
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card p-4 mb-4">
            <SectionHead title="Adicionales solicitados" desc="Con desglose de tallas para el taller" actions={<Shirt size={20} style={{ color: "var(--ink-faint)" }} />} />
            {Object.keys(prod.adicionales).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Sin adicionales en la cola actual.</p>
            ) : (
              <div className="table-responsive">
                <table className="tbl">
                  <thead><tr><th>Producto</th><th>Cantidad</th><th>Tallas</th></tr></thead>
                  <tbody>
                    {Object.entries(prod.adicionales).map(([nombre, info]) => (
                      <tr key={nombre}>
                        <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{nombre}</td>
                        <td className="font-display fw-bold">{info.cantidad}</td>
                        <td>{Object.keys(info.tallas).length ? <div className="d-flex flex-wrap gap-1">{Object.entries(info.tallas).map(([t, n]) => <Badge key={t} tone="blue">{t}: {n}</Badge>)}</div> : <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-4">
            <SectionHead title="Pedidos sin fotografías" desc="Códigos de fotografía incompletos" actions={<Camera size={20} style={{ color: "var(--ink-faint)" }} />} />
            {sinFotos.length === 0 ? (
              <p className="d-flex align-items-center gap-2 m-0" style={{ fontSize: 13, color: "var(--ok)" }}><ImageOff size={16} /> Todos los pedidos tienen sus códigos completos</p>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 240, overflowY: "auto" }}>
                {sinFotos.map((e) => {
                  const faltan = Object.values(e.codigos).filter((c) => !c).length;
                  return (
                    <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="d-flex align-items-center gap-2 p-2 rounded-3 border-0 text-start w-100" style={{ background: "var(--card-bg-2)", color: "var(--ink)", cursor: "pointer" }}>
                      <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold flex-shrink-0" style={{ width: 36, height: 36, fontSize: 12, background: "var(--tint-warn)", color: "var(--warn)" }}>{e.nombre[0]}</span>
                      <span className="flex-grow-1" style={{ minWidth: 0 }}>
                        <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 13 }}>{e.nombre} · {e.pedido}</span>
                        <span className="d-block" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{db.escuelas.find((x) => x.id === e.escuelaId)?.nombre}</span>
                      </span>
                      <Badge tone="amber" dot>{faltan} códigos</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 mt-4">
        <SectionHead title="Cola de producción" desc="Pedidos ordenados por fecha de registro" />
        <div className="table-responsive">
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Estudiante</th><th>Paquete</th><th>Adicionales</th><th>Estado</th><th>Saldo</th></tr></thead>
            <tbody>
              {[...base].sort((a, b) => a.fechaRegistro.localeCompare(b.fechaRegistro)).map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setRoute("estudiantes", { open: e.id })}>
                    <td className="font-display fw-bold" style={{ fontSize: 12.5 }}>{e.pedido}</td>
                    <td>
                      <div className="font-display fw-semibold" style={{ fontSize: 13.5 }}>{e.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.grado} “{e.seccion}”</div>
                    </td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{e.adicionales.map((a) => `${a.cantidad}× ${a.producto}`).join(", ") || "—"}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td className="font-display fw-bold" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(t.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
