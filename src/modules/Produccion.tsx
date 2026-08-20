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

  const base = useMemo(
    () => db.estudiantes.filter((e) => (!fEstado || e.estadoPedido === fEstado) && e.estadoPedido !== "Entregado"),
    [db.estudiantes, fEstado]
  );
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
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            El sistema calcula automáticamente los materiales necesarios · {base.length} pedidos en cola
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="select !w-[170px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="">Pedidos pendientes</option>
            {ESTADOS_PEDIDO.filter((s) => s !== "Entregado").map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={exportar}><Download size={15} /> Exportar</button>
        </div>
      </div>

      {/* Combos en cola */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {Object.values(PAQUETES).map((p, i) => (
          <div key={p.id} className="card p-4 reveal" style={{ animationDelay: `${i * 60}ms`, borderLeft: `4px solid ${p.color}` }}>
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-[13.5px]" style={{ color: p.color }}>Paquete {p.nombre}</span>
              <span className="font-display font-bold text-[24px]">{prod.combos[p.id] || 0}</span>
            </div>
            <p className="text-[11.5px] m-0 mt-1" style={{ color: "var(--ink-faint)" }}>en cola de producción</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionHead title="Total de solicitud" desc="Materiales generados automáticamente por paquete + adicionales" actions={<Factory size={20} style={{ color: "var(--ink-faint)" }} />} />
          <div className="flex flex-col gap-2.5">
            {materiales.map((m) => (
              <div key={m.nombre} className="flex items-center gap-3">
                <span className="text-[13px] font-semibold w-[170px] truncate" style={{ color: "var(--ink-soft)" }}>{m.nombre}</span>
                <div className="flex-1"><Bar pct={(m.cantidad / maxMat) * 100} color={m.cantidad > 0 ? "var(--blue)" : "var(--border)"} height={9} /></div>
                <span className="font-display font-bold text-[15px] w-10 text-right">{m.cantidad}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3.5 rounded-xl text-[12.5px] flex items-center gap-2.5" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>
            <Boxes size={16} /> Ejemplo: 100 paquetes Lujo → 100 afiches 30x40, 100 estolas, 200 fotos 6x8, 100 llaveros.
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <SectionHead title="Adicionales solicitados" desc="Con desglose de tallas para el taller" actions={<Shirt size={20} style={{ color: "var(--ink-faint)" }} />} />
            {Object.keys(prod.adicionales).length === 0 ? (
              <p className="text-[13px] m-0 py-3" style={{ color: "var(--ink-faint)" }}>Sin adicionales en la cola actual.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Producto</th><th>Cantidad</th><th>Tallas</th></tr></thead>
                  <tbody>
                    {Object.entries(prod.adicionales).map(([nombre, info]) => (
                      <tr key={nombre}>
                        <td className="font-display font-semibold text-[13px]">{nombre}</td>
                        <td className="font-display font-bold">{info.cantidad}</td>
                        <td>
                          {Object.keys(info.tallas).length ? (
                            <div className="flex flex-wrap gap-1.5">{Object.entries(info.tallas).map(([t, n]) => <Badge key={t} tone="blue">{t}: {n}</Badge>)}</div>
                          ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-5">
            <SectionHead title="Pedidos sin fotografías" desc="Códigos de fotografía incompletos" actions={<Camera size={20} style={{ color: "var(--ink-faint)" }} />} />
            {sinFotos.length === 0 ? (
              <p className="text-[13px] m-0 py-3 flex items-center gap-2" style={{ color: "var(--green)" }}><ImageOff size={16} /> Todos los pedidos tienen sus códigos completos</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                {sinFotos.map((e) => {
                  const faltan = Object.values(e.codigos).filter((c) => !c).length;
                  return (
                    <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all hover:translate-x-1" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12px] flex-shrink-0" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>{e.nombre[0]}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display font-semibold text-[13px] truncate">{e.nombre} · {e.pedido}</span>
                        <span className="block text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{db.escuelas.find((x) => x.id === e.escuelaId)?.nombre}</span>
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

      <div className="card p-5 mt-5">
        <SectionHead title="Cola de producción" desc="Pedidos ordenados por fecha de registro" />
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Estudiante</th><th>Paquete</th><th>Adicionales</th><th>Estado</th><th>Saldo</th></tr></thead>
            <tbody>
              {[...base].sort((a, b) => a.fechaRegistro.localeCompare(b.fechaRegistro)).map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => setRoute("estudiantes", { open: e.id })}>
                    <td className="font-display font-bold text-[12.5px]">{e.pedido}</td>
                    <td>
                      <div className="font-display font-semibold text-[13.5px]">{e.nombre}</div>
                      <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.grado} “{e.seccion}”</div>
                    </td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{e.adicionales.map((a) => `${a.cantidad}× ${a.producto}`).join(", ") || "—"}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td className="font-display font-bold text-[13px]" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(t.saldo)}</td>
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
