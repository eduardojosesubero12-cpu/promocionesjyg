import React, { useMemo, useState } from "react";
import { Building2, ChevronRight, Contact, Phone, School, Search } from "lucide-react";
import { useApp } from "../lib/store";
import { PAQUETES, estudianteTotales, fmtUSD, waLink } from "../lib/data";
import { Badge, EmptyState } from "../components/ui";

export default function Clientes() {
  const { db, setRoute } = useApp();
  const [tab, setTab] = useState<"representantes" | "escuelas">("representantes");
  const [q, setQ] = useState("");

  const representantes = useMemo(() => {
    const map = new Map<string, { nombre: string; telefono: string; hijos: typeof db.estudiantes }>();
    for (const e of db.estudiantes) {
      const key = (e.representante || e.nombre).toLowerCase() + "|" + e.telefono;
      if (!map.has(key)) map.set(key, { nombre: e.representante || e.nombre, telefono: e.telefono, hijos: [] });
      map.get(key)!.hijos.push(e);
    }
    const t = q.trim().toLowerCase();
    return [...map.values()]
      .filter((r) => !t || r.nombre.toLowerCase().includes(t) || r.telefono.includes(t))
      .map((r) => {
        const total = r.hijos.reduce((s, h) => s + estudianteTotales(h).total, 0);
        const saldo = r.hijos.reduce((s, h) => s + estudianteTotales(h).saldo, 0);
        return { ...r, total, saldo };
      })
      .sort((a, b) => b.saldo - a.saldo);
  }, [db.estudiantes, q]);

  const escuelas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.escuelas
      .filter((e) => !t || e.nombre.toLowerCase().includes(t))
      .map((e) => {
        const hijos = db.estudiantes.filter((x) => x.escuelaId === e.id);
        const vendido = hijos.reduce((s, h) => s + estudianteTotales(h).total, 0);
        const saldo = hijos.reduce((s, h) => s + estudianteTotales(h).saldo, 0);
        return { e, n: hijos.length, vendido, saldo };
      });
  }, [db.escuelas, db.estudiantes, q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Clientes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Representantes y planteles con su estado de cuenta</p>
        </div>
        <div className="flex rounded-full p-1 gap-1" style={{ background: "var(--slate-tint)" }}>
          {([["representantes", Contact, "Representantes"], ["escuelas", School, "Escuelas"]] as const).map(([t, Ic, lbl]) => (
            <button key={t} onClick={() => setTab(t)} className="flex items-center gap-1.5 border-none cursor-pointer font-display font-semibold text-[12.5px] px-4 py-2 rounded-full transition-all" style={{ background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? "var(--blue)" : "var(--ink-soft)", boxShadow: tab === t ? "var(--shadow-sm)" : "none" }}>
              <Ic size={14} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-5 flex items-center gap-2.5 max-w-[460px]">
        <Search size={16} style={{ color: "var(--ink-faint)" }} />
        <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder={tab === "representantes" ? "Buscar representante o teléfono…" : "Buscar escuela…"} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {tab === "representantes" ? (
        representantes.length === 0 ? (
          <div className="card"><EmptyState icon={Contact} title="Sin clientes" text="Los representantes aparecen al registrar estudiantes." /></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Representante</th><th>Estudiantes</th><th>Paquetes</th><th>Total</th><th>Saldo</th><th></th></tr></thead>
                <tbody>
                  {representantes.map((r) => (
                    <tr key={r.nombre + r.telefono}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12.5px]" style={{ background: "var(--gold-tint)", color: "var(--gold-deep)" }}>
                            {r.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </span>
                          <div className="leading-tight">
                            <div className="font-display font-semibold text-[13.5px]">{r.nombre}</div>
                            <div className="text-[11.5px] flex items-center gap-1" style={{ color: "var(--ink-faint)" }}><Phone size={11} /> {r.telefono || "sin teléfono"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          {r.hijos.map((h) => <span key={h.id} className="text-[12.5px]">{h.nombre} <span style={{ color: "var(--ink-faint)" }}>· {h.pedido}</span></span>)}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {r.hijos.map((h) => <Badge key={h.id} tone={h.paqueteId === "lujo" ? "gold" : h.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[h.paqueteId].nombre}</Badge>)}
                        </div>
                      </td>
                      <td className="font-display font-semibold text-[13px]">{fmtUSD(r.total)}</td>
                      <td className="font-display font-bold text-[13.5px]" style={{ color: r.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(r.saldo)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {r.telefono && (
                            <a className="btn btn-soft btn-xs" href={waLink(r.telefono, `Hola ${r.nombre}, le saluda Promociones JyG 🎓.`)} target="_blank" rel="noreferrer">WhatsApp</a>
                          )}
                          <button className="icon-btn" title="Ver estudiantes" onClick={() => setRoute("estudiantes")}><ChevronRight size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {escuelas.map(({ e, n, vendido, saldo }, i) => (
            <div key={e.id} className="card p-5 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><Building2 size={20} /></div>
                <Badge tone={saldo > 0 ? "amber" : "green"} dot>{saldo > 0 ? "Por cobrar" : "Al día"}</Badge>
              </div>
              <h3 className="font-display font-bold text-[15.5px] m-0">{e.nombre}</h3>
              <p className="text-[12.5px] mt-0.5 mb-3" style={{ color: "var(--ink-soft)" }}>{e.municipio}, {e.estado} · Dir. {e.director}</p>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
                <div><div className="font-display font-bold text-[17px]">{n}</div><div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>Estudiantes</div></div>
                <div><div className="font-display font-bold text-[17px]" style={{ color: "var(--blue)" }}>{fmtUSD(vendido)}</div><div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>Vendido</div></div>
                <div><div className="font-display font-bold text-[17px]" style={{ color: saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(saldo)}</div><div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>Saldo</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
