import React, { useMemo, useState } from "react";
import { Building2, ChevronRight, Contact, Phone, School } from "lucide-react";
import { useApp } from "../lib/store";
import { PAQUETES, estudianteTotales, fmtUSD, waLink } from "../lib/data";
import { Badge, EmptyState, SearchInput, Toolbar } from "../components/ui";

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
      .map((r) => ({ ...r, total: r.hijos.reduce((s, x) => s + estudianteTotales(x).total, 0), saldo: r.hijos.reduce((s, x) => s + estudianteTotales(x).saldo, 0) }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [db.estudiantes, q]);

  const escuelas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.escuelas.filter((e) => !t || e.nombre.toLowerCase().includes(t)).map((e) => {
      const hijos = db.estudiantes.filter((x) => x.escuelaId === e.id);
      return { e, n: hijos.length, vendido: hijos.reduce((s, x) => s + estudianteTotales(x).total, 0), saldo: hijos.reduce((s, x) => s + estudianteTotales(x).saldo, 0) };
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
        <div className="d-flex rounded-pill p-1 gap-1" style={{ background: "var(--tint-slate)" }}>
          {([["representantes", Contact, "Representantes"], ["escuelas", School, "Escuelas"]] as const).map(([t, Ic, lbl]) => (
            <button key={t} onClick={() => setTab(t)} className="btn btn-sm border-0 d-flex align-items-center gap-1 font-display fw-semibold" style={{ background: tab === t ? "var(--card-bg)" : "transparent", color: tab === t ? "var(--jyg-navy)" : "var(--ink-soft)", boxShadow: tab === t ? "var(--shadow-1)" : "none", borderRadius: 99 }}>
              <Ic size={14} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      <Toolbar count={tab === "representantes" ? representantes.length : escuelas.length} countLabel={tab === "representantes" ? (representantes.length === 1 ? "representante" : "representantes") : (escuelas.length === 1 ? "plantel" : "planteles")}>
        <SearchInput value={q} onChange={setQ} placeholder={tab === "representantes" ? "Buscar representante o teléfono…" : "Buscar escuela…"} />
      </Toolbar>

      {tab === "representantes" ? (
        representantes.length === 0 ? (
          <div className="card"><EmptyState icon={Contact} title="Sin clientes" text="Los representantes aparecen al registrar estudiantes." /></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="tbl">
                <thead><tr><th>Representante</th><th>Estudiantes</th><th>Paquetes</th><th>Total</th><th>Saldo</th><th className="text-end">Acciones</th></tr></thead>
                <tbody>
                  {representantes.map((r) => (
                    <tr key={r.nombre + r.telefono}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 36, height: 36, fontSize: 12.5, background: "var(--tint-gold)", color: "var(--jyg-gold-deep)" }}>
                            {r.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </span>
                          <div style={{ lineHeight: 1.25 }}>
                            <div className="font-display fw-semibold" style={{ fontSize: 13.5 }}>{r.nombre}</div>
                            <div className="d-flex align-items-center gap-1" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}><Phone size={11} /> {r.telefono || "sin teléfono"}</div>
                          </div>
                        </div>
                      </td>
                      <td><div className="d-flex flex-column gap-1">{r.hijos.map((h) => <span key={h.id} style={{ fontSize: 12.5 }}>{h.nombre} <span style={{ color: "var(--ink-faint)" }}>· {h.pedido}</span></span>)}</div></td>
                      <td><div className="d-flex flex-wrap gap-1">{r.hijos.map((h) => <Badge key={h.id} tone={h.paqueteId === "lujo" ? "gold" : h.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[h.paqueteId].nombre}</Badge>)}</div></td>
                      <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{fmtUSD(r.total)}</td>
                      <td className="font-display fw-bold" style={{ color: r.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(r.saldo)}</td>
                      <td>
                        <div className="d-flex justify-content-end gap-1">
                          {r.telefono && <a className="btn btn-soft btn-xs" href={waLink(r.telefono, `Hola ${r.nombre}, le saluda Promociones JyG 🎓.`)} target="_blank" rel="noreferrer">WhatsApp</a>}
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
        <div className="row g-4">
          {escuelas.map(({ e, n, vendido, saldo }, i) => (
            <div key={e.id} className="col-12 col-md-6 col-xl-4">
              <div className="card p-4 h-100 reveal card-lift" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 44, height: 44, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}><Building2 size={20} /></div>
                  <Badge tone={saldo > 0 ? "amber" : "green"} dot>{saldo > 0 ? "Por cobrar" : "Al día"}</Badge>
                </div>
                <h3 className="font-display fw-bold m-0" style={{ fontSize: 15.5 }}>{e.nombre}</h3>
                <p style={{ fontSize: 12.5, margin: "2px 0 12px", color: "var(--ink-soft)" }}>{e.municipio}, {e.estado} · Dir. {e.director}</p>
                <div className="row g-2 pt-3 border-top" style={{ borderColor: "var(--line-soft)" }}>
                  <div className="col-4"><div className="font-display fw-bold" style={{ fontSize: 17 }}>{n}</div><div className="text-uppercase" style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)" }}>Estudiantes</div></div>
                  <div className="col-4"><div className="font-display fw-bold" style={{ fontSize: 17, color: "var(--jyg-navy)" }}>{fmtUSD(vendido)}</div><div className="text-uppercase" style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)" }}>Vendido</div></div>
                  <div className="col-4"><div className="font-display fw-bold" style={{ fontSize: 17, color: saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(saldo)}</div><div className="text-uppercase" style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)" }}>Saldo</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
