import React, { useState } from "react";
import { Check, Gem, Package, Plus, Shirt, Star, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import { ADICIONALES, PAQUETES, TALLAS, fmtBs } from "../lib/data";
import { Badge, SectionHead } from "../components/ui";

export default function Paquetes() {
  const { db, setConfig, confirm, success, toast, tasa } = useApp();
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const agregarPrecio = async () => {
    const n = Number(nuevoPrecio);
    if (!n || n <= 0) { toast("Precio inválido", "err"); return; }
    if (db.config.precios.includes(n)) { toast("Ese precio ya existe", "warn"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ precios: [...db.config.precios, n].sort((a, b) => a - b) });
    success();
    setNuevoPrecio("");
  };
  const quitarPrecio = async (p: number) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará el precio $${p} del catálogo.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    setConfig({ precios: db.config.precios.filter((x) => x !== p) });
    toast("Precio eliminado", "warn");
  };

  const iconos: Record<string, any> = { basico: Package, premium: Star, lujo: Gem };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Paquetes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Combos de grado, lista de precios y catálogo de adicionales</p>
        </div>
      </div>

      {/* Combos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {Object.values(PAQUETES).map((p, i) => {
          const Icon = iconos[p.id];
          const vendidos = db.estudiantes.filter((e) => e.paqueteId === p.id).length;
          return (
            <div key={p.id} className="card p-5 reveal relative overflow-hidden transition-all hover:-translate-y-1.5 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 70}ms`, borderTop: `4px solid ${p.color}` }}>
              <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full opacity-[0.08] pointer-events-none" style={{ background: p.color }} />
              <div className="flex items-center gap-3 mb-3">
                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-2)", color: p.color }}><Icon size={21} /></span>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[16px] m-0">Paquete {p.nombre}</h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{vendidos} vendidos</span>
                </div>
                <span className="font-display font-bold text-[20px]" style={{ color: p.color }}>${p.precioBase}</span>
              </div>
              <ul className="m-0 p-0 flex flex-col gap-1.5" style={{ listStyle: "none" }}>
                {p.incluye.map((x) => (
                  <li key={x} className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--green-tint)", color: "var(--green)" }}><Check size={10} strokeWidth={3} /></span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Lista de precios */}
        <div className="card p-5">
          <SectionHead title="Precios de paquetes" desc={`Configurables · sugerencia en el formulario a tasa ${fmtBs(tasa.usd)}`} />
          <div className="flex flex-wrap gap-2 mb-4">
            {db.config.precios.map((p) => (
              <span key={p} className="badge group" style={{ background: "var(--blue-tint-2)", color: "var(--blue)", padding: "7px 12px", fontSize: 13 }}>
                <b className="font-display">${p}</b>
                <button className="border-none bg-transparent cursor-pointer p-0 ml-1 opacity-50 hover:opacity-100" style={{ color: "var(--red)" }} onClick={() => quitarPrecio(p)} title="Quitar precio"><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" className="input" style={{ maxWidth: 140 }} placeholder="Ej: 75" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
            <button className="btn btn-primary" onClick={agregarPrecio}><Plus size={15} /> Agregar precio</button>
          </div>
        </div>

        {/* Adicionales */}
        <div className="card p-5">
          <SectionHead title="Artículos adicionales" desc="Catálogo con tallas para el taller" actions={<Shirt size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="tbl">
              <thead><tr><th>Producto</th><th>Precio</th><th>Equiv. Bs</th><th>Tallas</th></tr></thead>
              <tbody>
                {ADICIONALES.map((a) => (
                  <tr key={a.nombre}>
                    <td className="font-display font-semibold text-[13px]">{a.nombre}</td>
                    <td className="font-display font-bold text-[13px]" style={{ color: "var(--blue)" }}>${a.precio}</td>
                    <td className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{fmtBs(a.precio * tasa.usd)}</td>
                    <td>
                      {a.conTalla ? (
                        <div className="flex flex-wrap gap-1">{(a.material === "Anillo" ? ["6", "7", "8", "9", "10"] : TALLAS).map((t) => <Badge key={t} tone="slate">{t}</Badge>)}</div>
                      ) : <span style={{ color: "var(--ink-faint)" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
