import React, { useMemo } from "react";
import {
  CircleDollarSign, Crown, Gem, GraduationCap, Package, Receipt, RefreshCw, School,
  ShoppingBag, Users, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import {
  ADICIONALES, PAQUETES, cobrosSemanales, computeProduccion, estudianteTotales,
  fmtBs, fmtFecha, fmtHaceSegundos, fmtUSD,
} from "../lib/data";
import { Badge, Bar, SectionHead, useCountUp, useNow, estadoPedidoTone } from "../components/ui";

function TileStat({ icon: Icon, label, value, c, bg, money, sub, delay }: { icon: any; label: string; value: number; c: string; bg: string; money?: boolean; sub?: string; delay: number }) {
  const v = useCountUp(value);
  return (
    <div className="card p-4 reveal h-100" style={{ animationDelay: `${delay}ms`, borderLeft: `3px solid ${c}` }}>
      <div className="d-flex align-items-center gap-3">
        <span className="stat-ic d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 52, height: 52, background: bg, color: c, boxShadow: `0 6px 14px -6px color-mix(in srgb, ${c} 55%, transparent)` }}>
          <Icon size={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="font-display fw-bold tabular-nums" style={{ color: c, fontSize: 26, letterSpacing: "-0.5px", lineHeight: 1 }}>
            {money ? fmtUSD(v) : Math.round(v)}
          </div>
          <div className="text-uppercase mt-1" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, color: "var(--ink-faint)" }}>{label}</div>
          {sub && <div className="tabular-nums mt-1" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)" }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { db, tasa, tasaLoading, refreshTasa, setRoute } = useApp();
  const now = useNow(1000);

  const k = useMemo(() => {
    let vendido = 0, cobrado = 0;
    for (const e of db.estudiantes) { const t = estudianteTotales(e); vendido += t.total; cobrado += t.abonado; }
    return { vendido, cobrado, pendiente: Math.max(0, vendido - cobrado) };
  }, [db.estudiantes]);

  const combos = useMemo(() => computeProduccion(db.estudiantes).combos, [db.estudiantes]);
  const semana = useMemo(() => cobrosSemanales(db.estudiantes), [db.estudiantes]);
  const maxSemana = Math.max(1, ...semana.map((d) => d.total));
  const mixTotal = Math.max(1, (combos.basico || 0) + (combos.premium || 0) + (combos.lujo || 0));
  const pct = (n: number) => `${Math.round((n / mixTotal) * 100)}% del mix`;
  const entregados = db.estudiantes.filter((e) => e.estadoPedido === "Entregado").length;

  const tiles = [
    { icon: School, label: "Escuelas", value: db.escuelas.length, c: "var(--jyg-navy)", bg: "var(--tint-navy-2)", sub: "planteles activos" },
    { icon: Users, label: "Docentes", value: db.docentes.length, c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)", sub: "en nómina" },
    { icon: GraduationCap, label: "Estudiantes", value: db.estudiantes.length, c: "var(--ok)", bg: "var(--tint-ok)", sub: `${entregados} graduados` },
    { icon: Receipt, label: "Pedidos", value: db.estudiantes.length, c: "var(--jyg-navy-600)", bg: "var(--tint-navy)", sub: "1 por estudiante" },
    { icon: CircleDollarSign, label: "Cobrado", value: k.cobrado, c: "var(--ok)", bg: "var(--tint-ok)", money: true, sub: `≈ ${fmtBs(k.cobrado * tasa.usd)}` },
    { icon: Wallet, label: "Pendiente", value: k.pendiente, c: "var(--danger)", bg: "var(--tint-danger)", money: true, sub: "por cobrar" },
    { icon: Package, label: "Paq. Básicos", value: combos.basico || 0, c: "var(--jyg-navy)", bg: "var(--tint-navy-2)", sub: pct(combos.basico || 0) },
    { icon: Gem, label: "Paq. Premium", value: combos.premium || 0, c: "var(--ok)", bg: "var(--tint-ok)", sub: pct(combos.premium || 0) },
    { icon: Crown, label: "Paq. Lujo", value: combos.lujo || 0, c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)", sub: pct(combos.lujo || 0) },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Inicio</div>
          <h1>Dashboard</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Resumen general de Promociones JyG · tasa del día <b className="tabular-nums">{fmtBs(tasa.usd)}</b>
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => void refreshTasa()} disabled={tasaLoading}>
          <RefreshCw size={15} className={tasaLoading ? "spin" : ""} /> {tasaLoading ? "Consultando…" : `Actualizar · ${fmtHaceSegundos(tasa.updated, now)}`}
        </button>
      </div>

      <div className="row g-3 mb-4">
        {tiles.map((t, i) => (
          <div key={t.label} className="col-6 col-md-4 col-xl">
            <TileStat {...t} delay={i * 45} />
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card p-4 mb-4">
            <SectionHead title="Cobros de la semana" desc="Bolívares y divisas recibidas en los últimos 7 días" actions={<Badge tone="blue" dot>{fmtUSD(k.cobrado)} total</Badge>} />
            <div className="d-flex align-items-end gap-2" style={{ height: 160 }}>
              {semana.map((d, i) => (
                <div key={i} className="flex-fill d-flex flex-column align-items-center gap-1" style={{ minWidth: 0 }}>
                  <span className="tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: d.total > 0 ? "var(--jyg-navy)" : "var(--ink-faint)" }}>{d.total > 0 ? `$${d.total}` : ""}</span>
                  <div className="w-100 rounded-top" style={{ height: `${(d.total / maxSemana) * 110 + 4}px`, background: d.total > 0 ? "linear-gradient(180deg,var(--jyg-navy-500),var(--jyg-navy))" : "var(--card-bg-2)", transition: "height .6s cubic-bezier(.22,1,.36,1)" }} />
                  <span className="text-capitalize" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <SectionHead title="Pedidos recientes" desc="Los últimos estudiantes registrados" actions={<button className="btn btn-soft btn-sm" onClick={() => setRoute("estudiantes")}>Ver todos</button>} />
            <div className="table-responsive">
              <table className="tbl">
                <thead><tr><th>Estudiante</th><th>Grado</th><th>Paquete</th><th>Saldo</th><th>Estado</th></tr></thead>
                <tbody>
                  {db.estudiantes.slice(0, 5).map((e) => {
                    const t = estudianteTotales(e);
                    return (
                      <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setRoute("estudiantes", { open: e.id })}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 32, height: 32, fontSize: 12, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>{e.nombre[0]}</span>
                            <span className="font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5 }}>{e.grado} “{e.seccion}”</td>
                        <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                        <td className="font-display fw-bold" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(t.saldo)}</td>
                        <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card p-4 mb-4">
            <SectionHead title="Ranking de escuelas" desc="Ventas por plantel" />
            <div className="d-flex flex-column gap-3">
              {db.escuelas.map((es, i) => {
                const hijos = db.estudiantes.filter((x) => x.escuelaId === es.id);
                const vendido = hijos.reduce((s, x) => s + estudianteTotales(x).total, 0);
                const max = Math.max(1, ...db.escuelas.map((e2) => db.estudiantes.filter((x) => x.escuelaId === e2.id).reduce((s, x) => s + estudianteTotales(x).total, 0)));
                return (
                  <div key={es.id}>
                    <div className="d-flex justify-content-between align-items-baseline mb-1">
                      <span className="font-display fw-semibold" style={{ fontSize: 12.5 }}>{es.nombre}</span>
                      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{hijos.length} est. · <b style={{ color: "var(--jyg-navy)" }}>{fmtUSD(vendido)}</b></span>
                    </div>
                    <Bar pct={(vendido / max) * 100} color={i === 0 ? "var(--jyg-gold)" : "var(--jyg-navy)"} height={7} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-4">
            <SectionHead title="Adicionales más pedidos" desc="Top de productos extra" />
            <div className="d-flex flex-column gap-2">
              {ADICIONALES.slice(0, 5).map((a) => {
                const cant = db.estudiantes.reduce((s, e) => s + e.adicionales.filter((x) => x.producto === a.nombre).reduce((x, y) => x + y.cantidad, 0), 0);
                return (
                  <div key={a.nombre} className="d-flex align-items-center gap-2 rounded-3 px-3 py-2" style={{ background: "var(--card-bg-2)" }}>
                    <ShoppingBag size={15} style={{ color: "var(--jyg-gold-deep)" }} />
                    <span className="flex-grow-1" style={{ fontSize: 12.5, fontWeight: 600 }}>{a.nombre}</span>
                    <Badge tone="gold">{cant}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
        Registrado {fmtFecha(new Date().toISOString().slice(0, 10))} · {db.estudiantes.length} estudiantes en base de datos
      </div>
    </div>
  );
}
