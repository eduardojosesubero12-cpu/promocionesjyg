import React, { useState } from "react";
import { Check, Gem, Package, Plus, Shirt, Star, Tag, Trash2, X } from "lucide-react";
import { useApp } from "../lib/store";
import { ADICIONALES, PAQUETES, TALLAS, fmtUSD } from "../lib/data";
import { Badge, SectionHead } from "../components/ui";

export default function Paquetes() {
  const { db, setConfig, confirm, success, toast } = useApp();
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const agregarPrecio = async () => {
    const n = Number(nuevoPrecio);
    if (!n || n <= 0) { toast("Precio inválido", "err"); return; }
    if (db.config.preciosPaquetes.includes(n)) { toast("Ese precio ya existe", "warn"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Se agregará ${fmtUSD(n)} a la lista de precios configurables.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ preciosPaquetes: [...db.config.preciosPaquetes, n].sort((a, b) => a - b) });
    success();
    setNuevoPrecio("");
  };

  const quitarPrecio = async (p: number) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará ${fmtUSD(p)} de los precios disponibles.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    setConfig({ preciosPaquetes: db.config.preciosPaquetes.filter((x) => x !== p) });
    toast("Precio eliminado", "warn");
  };

  const iconos: Record<string, any> = { basico: Package, premium: Star, lujo: Gem };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Paquetes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Los tres combos de grado y el catálogo de artículos adicionales</p>
        </div>
      </div>

      {/* Tarjetas de paquetes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {Object.values(PAQUETES).map((p, i) => {
          const Ic = iconos[p.id];
          return (
            <div key={p.id} className="card p-6 reveal relative overflow-hidden transition-all hover:-translate-y-1.5 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 80}ms`, borderTop: `5px solid ${p.color}` }}>
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10" style={{ background: p.color }} />
              <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${p.color}1a`, color: p.color }}><Ic size={23} /></span>
                <div>
                  <h3 className="font-display font-bold text-[19px] m-0">Paquete {p.nombre}</h3>
                  <p className="text-[11.5px] m-0" style={{ color: "var(--ink-faint)" }}>desde {fmtUSD(p.precioBase)}</p>
                </div>
              </div>
              <ul className="m-0 p-0 flex flex-col gap-2">
                {p.incluye.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                    <Check size={15} style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Precios configurables */}
        <div className="card p-5">
          <SectionHead title="Precios de paquetes" desc="Tabla configurable — el administrador puede agregar más precios" actions={<Tag size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="flex flex-wrap gap-2 mb-4">
            {db.config.preciosPaquetes.map((p) => (
              <span key={p} className="badge group" style={{ background: "var(--blue-tint-2)", color: "var(--blue)", padding: "7px 13px", fontSize: 13 }}>
                <b className="font-display">${p}</b>
                <button onClick={() => quitarPrecio(p)} className="border-none bg-transparent cursor-pointer p-0 ml-0.5" style={{ color: "inherit", opacity: 0.55 }} title="Quitar precio"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" min={1} className="input" style={{ maxWidth: 150 }} placeholder="Nuevo precio $" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
            <button className="btn btn-primary" onClick={agregarPrecio}><Plus size={15} /> Agregar</button>
          </div>
        </div>

        {/* Catálogo de adicionales */}
        <div className="card p-5">
          <SectionHead title="Artículos adicionales" desc="Catálogo configurable con tallas para textil y anillos" actions={<Shirt size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="tbl">
              <thead><tr><th>Producto</th><th>Precio</th><th>Tallas</th></tr></thead>
              <tbody>
                {ADICIONALES.map((a) => (
                  <tr key={a.nombre}>
                    <td className="font-display font-semibold text-[13px]">{a.nombre}</td>
                    <td className="font-display font-bold" style={{ color: "var(--blue)" }}>${a.precio}</td>
                    <td>
                      {a.conTalla ? (
                        <div className="flex flex-wrap gap-1">
                          {(a.tallaNumerica ? ["14–22"] : TALLAS).map((t) => <Badge key={t} tone="slate">{t}</Badge>)}
                        </div>
                      ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <span className="hidden"><Trash2 size={1} /></span>
    </div>
  );
}
