import React, { useMemo } from "react";
import {
  AlertTriangle, Boxes, Camera, CheckCircle2, CircleDollarSign, Crown, Factory, Gem, GraduationCap,
  ImageOff, Package, Receipt, RefreshCw, School, ShoppingBag, Users, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import {
  ADICIONALES, PAQUETES, cobrosSemanales, computeProduccion, estudianteTotales,
  fmtBs, fmtHaceSegundos, fmtUSD,
} from "../lib/data";
import { Badge, Bar, SectionHead, useCountUp, useNow, estadoPedidoTone } from "../components/ui";

const FlagUS = () => (
  <svg className="rb-flag" viewBox="0 0 19 14" aria-hidden="true">
    <rect width="19" height="14" fill="#b22234" />
    {[1, 3, 5, 7, 9, 11].map((y) => <rect key={y} y={y} width="19" height="1" fill="#fff" />)}
    <rect width="8" height="7" fill="#3c3b6e" />
    {[[1.5, 1.2], [4, 1.2], [6.5, 1.2], [2.7, 2.6], [5.2, 2.6], [1.5, 4], [4, 4], [6.5, 4], [2.7, 5.4], [5.2, 5.4]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="0.45" fill="#fff" />
    ))}
  </svg>
);
const FlagEU = () => (
  <svg className="rb-flag" viewBox="0 0 19 14" aria-hidden="true">
    <rect width="19" height="14" fill="#003399" />
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6 - Math.PI / 2;
      return <circle key={i} cx={9.5 + Math.cos(a) * 4.2} cy={7 + Math.sin(a) * 4.2} r="0.6" fill="#ffcc00" />;
    })}
  </svg>
);

function Spark({ vals }: { vals: number[] }) {
  if (vals.length < 2) return null;
  const W = 96, H = 30, P = 3;
  const min = Math.min(...vals), mx = Math.max(...vals), span = Math.max(0.01, mx - min);
  const x = (i: number) => P + (i * (W - P * 2)) / (vals.length - 1);
  const y = (v: number) => P + (H - P * 2) * (1 - (v - min) / span);
  return (
    <svg className="rb-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="3" />
    </svg>
  );
}

function TileStat({ icon: Icon, label, value, c, bg, money, sub, delay }: { icon: any; label: string; value: number; c: string; bg: string; money?: boolean; sub?: string; delay: number }) {
  const v = useCountUp(value);
  return (
    <div className="card p-3 reveal h-100" style={{ animationDelay: `${delay}ms`, borderLeft: `3px solid ${c}` }}>
      <div className="d-flex align-items-center gap-3">
        <span className="stat-ic d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 46, height: 46, background: bg, color: c, boxShadow: `0 6px 14px -6px color-mix(in srgb, ${c} 55%, transparent)` }}>
          <Icon size={21} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="font-display fw-bold tabular-nums" style={{ color: c, fontSize: 22, letterSpacing: "-0.5px", lineHeight: 1 }}>
            {money ? fmtUSD(v) : Math.round(v)}
          </div>
          <div className="text-uppercase mt-1" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.2, color: "var(--ink-faint)" }}>{label}</div>
          {sub && <div className="tabular-nums mt-1" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { db, tasa, tasaLoading, refreshTasa, setRoute, alerts } = useApp();
  const now = useNow(1000);

  const k = useMemo(() => {
    let vendido = 0, cobrado = 0;
    for (const e of db.estudiantes) { const t = estudianteTotales(e); vendido += t.total; cobrado += t.abonado; }
    return { vendido, cobrado, pendiente: Math.max(0, vendido - cobrado) };
  }, [db.estudiantes]);

  const prod = useMemo(() => computeProduccion(db.estudiantes), [db.estudiantes]);
  const combos = prod.combos;
  const semana = useMemo(() => cobrosSemanales(db.estudiantes), [db.estudiantes]);
  const maxSemana = Math.max(1, ...semana.map((d) => d.total));
  const entregados = db.estudiantes.filter((e) => e.estadoPedido === "Entregado").length;
  const enCola = db.estudiantes.length - entregados;
  const histUsd = useMemo(() => (db.historialTasas || []).slice(-8).map((h) => h.usd).filter((v) => v > 0), [db.historialTasas]);
  const cross = tasa.usd > 0 && tasa.eur > 0 ? tasa.eur / tasa.usd : 0;

  const pipe = [
    { estado: "Registrado", icon: Receipt, c: "var(--jyg-navy-500)" },
    { estado: "Producción", icon: Factory, c: "var(--jyg-gold-deep)" },
    { estado: "Impresión", icon: Camera, c: "var(--ok)" },
    { estado: "Empaque", icon: Boxes, c: "var(--warn)" },
    { estado: "Entregado", icon: CheckCircle2, c: "var(--ok)" },
  ].map((p) => ({ ...p, n: db.estudiantes.filter((e) => e.estadoPedido === p.estado).length }));

  const tiles = [
    { icon: School, label: "Escuelas", value: db.escuelas.length, c: "var(--jyg-navy)", bg: "var(--tint-navy-2)", sub: "planteles activos" },
    { icon: Users, label: "Docentes", value: db.docentes.length, c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)", sub: "en nómina" },
    { icon: GraduationCap, label: "Estudiantes", value: db.estudiantes.length, c: "var(--ok)", bg: "var(--tint-ok)", sub: `${entregados} graduados` },
    { icon: Receipt, label: "Pedidos", value: db.estudiantes.length, c: "var(--jyg-navy-600)", bg: "var(--tint-navy)", sub: `${enCola} en curso` },
    { icon: CircleDollarSign, label: "Cobrado", value: k.cobrado, c: "var(--ok)", bg: "var(--tint-ok)", money: true, sub: `≈ ${fmtBs(k.cobrado * tasa.usd)}` },
    { icon: Wallet, label: "Pendiente", value: k.pendiente, c: "var(--danger)", bg: "var(--tint-danger)", money: true, sub: "por cobrar" },
    { icon: Package, label: "Paq. Básicos", value: combos.basico || 0, c: "var(--jyg-navy)", bg: "var(--tint-navy-2)", sub: "$20 – $48" },
    { icon: Gem, label: "Paq. Premium", value: combos.premium || 0, c: "var(--ok)", bg: "var(--tint-ok)", sub: "$55 – $80" },
    { icon: Crown, label: "Paq. Lujo", value: combos.lujo || 0, c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)", sub: "$110 – $145" },
  ];

  const hora = new Date(now).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  const saludo = new Date(now).getHours() < 12 ? "Buenos días" : new Date(now).getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Panel administrador · {new Date(now).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1>{saludo} 👋</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Resumen general de la temporada de grados · <b className="tabular-nums">{db.estudiantes.length}</b> estudiantes registrados
          </p>
        </div>
        <Badge tone="green" dot><span className="tabular-nums">{hora}</span>&nbsp;· hora local</Badge>
      </div>

      {/* ---- Pizarra de tasa del día ---- */}
      <div className="rate-board mb-4">
        <div className="rb-grid">
          <div className="rb-cell">
            <span className="rb-k"><FlagUS /> Dólar · tasa del día <span className="rb-live"><i />{tasa.apiOk ? "en vivo" : "respaldo"}</span></span>
            <span className="rb-v">{tasaLoading ? "…" : fmtBs(tasa.usd)}<small>Bs / $</small></span>
            <span className="rb-s">
              <span className="rb-spark" style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 10 }}><Spark vals={histUsd} /></span>
              {histUsd.length > 1 ? `últimos ${histUsd.length} cierres` : "ve.dolarapi.com"}
            </span>
          </div>
          <div className="rb-cell">
            <span className="rb-k"><FlagEU /> Euro · tasa del día</span>
            <span className="rb-v gold">{tasaLoading ? "…" : fmtBs(tasa.eur)}<small>Bs / €</small></span>
            <span className="rb-s">{cross > 0 ? `1 € ≈ ${cross.toFixed(3)} $` : "fuente oficial BCV"}</span>
          </div>
          <div className="rb-cell">
            <span className="rb-k">Caja de la temporada</span>
            <span className="rb-v">{fmtUSD(k.cobrado)}</span>
            <span className="rb-s">saldo {fmtUSD(k.pendiente)} · {fmtBs(k.pendiente * tasa.usd)}</span>
          </div>
          <button className="rb-btn" onClick={() => void refreshTasa()} disabled={tasaLoading} title="Consultar ve.dolarapi.com">
            <RefreshCw size={14} className={tasaLoading ? "spin" : ""} />
            {tasaLoading ? "Consultando…" : `Actualizar · ${fmtHaceSegundos(tasa.updated, now)}`}
          </button>
        </div>
      </div>

      {/* ---- Indicadores ---- */}
      <div className="row g-3 mb-4">
        {tiles.map((t, i) => (
          <div key={t.label} className="col-6 col-md-4 col-xl">
            <TileStat {...t} delay={i * 40} />
          </div>
        ))}
      </div>

      {/* ---- Pipeline de producción ---- */}
      <div className="card p-4 mb-4 reveal-up">
        <SectionHead title="Línea de producción" desc="Estado de los pedidos en tiempo real — clic para abrir Producción" actions={<Badge tone="blue" dot>{enCola} en cola</Badge>} />
        <div className="pipe">
          {pipe.map((p, i) => (
            <button key={p.estado} className="pipe-step" style={{ animationDelay: `${i * 60}ms` }} onClick={() => setRoute("produccion")}>
              <span className="ps-ic"><p.icon size={16} style={{ color: p.c }} /></span>
              <span className="ps-n" style={{ color: p.c }}>{p.n}</span>
              <span className="ps-l">{p.estado}</span>
              <span className="ps-bar"><i style={{ width: `${db.estudiantes.length ? (p.n / db.estudiantes.length) * 100 : 0}%`, background: p.c }} /></span>
            </button>
          ))}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card p-4 mb-4 reveal-up">
            <SectionHead title="Cobros de la semana" desc="Divisas recibidas en los últimos 7 días" actions={<Badge tone="blue" dot>{fmtUSD(k.cobrado)} total</Badge>} />
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

          <div className="card p-4 reveal-up">
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
          <div className="card p-4 mb-4 accent-gold reveal-up">
            <SectionHead title="Alertas operativas" desc="Requieren tu atención" actions={<Badge tone="amber" dot>{alerts.length}</Badge>} />
            {alerts.length === 0 ? (
              <div className="d-flex align-items-center gap-2 py-2" style={{ fontSize: 13, color: "var(--ok)" }}>
                <CheckCircle2 size={17} /> Todo al día, sin pendientes.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {alerts.map((a) => (
                  <button key={a.key} className="alert-row" onClick={() => setRoute(a.route)}>
                    <span className="ar-ic" style={{ background: "var(--tint-warn)", color: "var(--warn)" }}>
                      {a.key.includes("foto") ? <ImageOff size={16} /> : <AlertTriangle size={16} />}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="d-block font-display fw-semibold" style={{ fontSize: 12.5 }}>{a.title}</span>
                      <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{a.desc}</span>
                    </span>
                    <span className="ar-n" style={{ color: "var(--warn)" }}>{(a as any).count ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4 mb-4 reveal-up">
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

          <div className="card p-4 reveal-up">
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
    </div>
  );
}
