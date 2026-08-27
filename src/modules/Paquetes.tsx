import React, { useState } from "react";
import { Check, Crown, Gem, Package, Plus, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import { PAQUETES, getAdicionales, getTallas, fmtUSD } from "../lib/data";
import { Badge, SectionHead } from "../components/ui";

export default function Paquetes() {
  const { db, setConfig, confirm, success, toast } = useApp();
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const adicionales = getAdicionales(db.config);
  const tallas = getTallas(db.config);
  const agregarPrecio = async () => {
    const n = Number(nuevoPrecio);
    if (!n || n <= 0) { toast("Indica un precio válido", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Se agregará el precio ${fmtUSD(n)} a la lista configurable.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ preciosPaquetes: [...db.config.preciosPaquetes, n].sort((a, b) => a - b) });
    setNuevoPrecio(""); success();
  };
  const quitarPrecio = async (p: number) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará el precio ${fmtUSD(p)}.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    setConfig({ preciosPaquetes: db.config.preciosPaquetes.filter((x) => x !== p) });
    toast("Precio eliminado", "warn");
  };
  const iconos: Record<string, any> = { basico: Package, premium: Gem, lujo: Crown };
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="crumb">CRM</div><h1>Paquetes</h1><p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Los tres combos de grado y el catálogo de adicionales</p></div>
      </div>
      <div className="row g-3 mb-4">
        {Object.values(PAQUETES).map((p, i) => {
          const Ic = iconos[p.id];
          const vendidos = db.estudiantes.filter((e) => e.paqueteId === p.id).length;
          return (
            <div key={p.id} className="col-12 col-md-4">
              <div className="card p-4 h-100 card-lift reveal" style={{ animationDelay: `${i * 70}ms`, borderTop: `3px solid ${p.color}` }}>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 52, height: 52, background: `color-mix(in srgb, ${p.color} 14%, transparent)`, color: p.color }}><Ic size={26} /></span>
                  <div>
                    <h3 className="font-display fw-bold m-0" style={{ fontSize: 18 }}>{p.nombre}</h3>
                    <div className="font-display fw-bold tabular-nums" style={{ color: p.color, fontSize: 22 }}>{fmtUSD(p.precioBase)}</div>
                  </div>
                  <Badge tone={p.id === "lujo" ? "gold" : p.id === "premium" ? "green" : "blue"}>{vendidos} vendidos</Badge>
                </div>
                <div className="d-flex flex-column gap-2">
                  {p.incluye.map((it) => (
                    <div key={it} className="d-flex align-items-center gap-2" style={{ fontSize: 13 }}><Check size={14} style={{ color: p.color, flexShrink: 0 }} /><span>{it}</span></div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <div className="card p-4 h-100">
            <SectionHead title="Precios configurables" desc="Lista que puede ampliar el administrador" />
            <div className="d-flex gap-2 mb-3">
              <input type="number" className="input" placeholder="Nuevo precio (USD)" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
              <button className="btn btn-primary" onClick={agregarPrecio}><Plus size={15} /> Agregar</button>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {db.config.preciosPaquetes.map((p) => (
                <span key={p} className="d-flex align-items-center gap-1 rounded-pill px-3 py-1 font-display fw-semibold tabular-nums" style={{ background: "var(--card-bg-2)", fontSize: 13, color: "var(--jyg-navy)" }}>
                  ${p}
                  <button className="border-0 bg-transparent p-0 d-flex" style={{ color: "var(--ink-faint)", cursor: "pointer" }} onClick={() => quitarPrecio(p)} aria-label={`Quitar ${p}`}><Trash2 size={12} /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-7">
          <div className="card p-4 h-100">
            <SectionHead title="Catálogo de adicionales" desc="Productos extra con precio y tallas" />
            <div className="table-responsive">
              <table className="tbl dt-cards">
                <thead><tr><th>Producto</th><th>Precio</th><th>Tallas</th></tr></thead>
                <tbody>
                  {adicionales.map((a) => (
                    <tr key={a.nombre}>
                      <td data-label="Producto" className="font-display fw-semibold" style={{ fontSize: 13 }}>{a.nombre}</td>
                      <td data-label="Precio" className="font-display fw-bold tabular-nums" style={{ color: "var(--jyg-navy)" }}>{fmtUSD(a.precio)}</td>
                      <td data-label="Tallas">{a.talla ? <Badge tone={a.talla === "numerica" ? "gold" : "blue"}>{a.talla === "numerica" ? "Numérica" : tallas.join(" · ")}</Badge> : <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
