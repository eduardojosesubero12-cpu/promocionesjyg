import React, { useMemo } from "react";
import { ArrowRight, Boxes, CalendarDays, Camera, CheckCircle2, CircleDollarSign, Download, FileWarning, GraduationCap, PackageCheck, RefreshCw, School, Sparkles, Users, Wallet } from "lucide-react";
import { useApp } from "../lib/store";
import type { Route } from "../lib/store";
import { ESTADOS_PEDIDO, PAQUETES, cobrosSemanales, computeProduccion, downloadFile, estudianteTotales, fmtBs, fmtFecha, fmtHaceSegundos, fmtUSD, toCSV, todayISO } from "../lib/data";
import { Badge, Bar, useCountUp, useNow } from "../components/ui";

function Spark({ vals }: { vals: number[] }) {
  if (vals.length < 2) return null;
  const W = 90, H = 26, P = 3;
  const min = Math.min(...vals), mx = Math.max(...vals), span = Math.max(0.01, mx - min);
  const x = (i: number) => P + (i * (W - P * 2)) / (vals.length - 1);
  const y = (v: number) => P + (H - P * 2) * (1 - (v - min) / span);
  return (
    <svg className="rb-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="2.6" />
    </svg>
  );
}
function Kpi({ icon: Icon, label, value, money, sub, bg, fg, onClick, delay }: any) {
  const v = useCountUp(value);
  return (
    <div className="kpi reveal" style={{ animationDelay: `${delay}ms` }} onClick={onClick}>
      <span className="ic" style={{ background: bg, color: fg }}><Icon size={20} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="v" style={{ color: fg }}>{money ? fmtUSD(v) : Math.round(v).toLocaleString("es-VE")}</div>
        <div className="k">{label}</div>
        {sub && <div className="s tabular-nums">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { db, tasa, refreshTasa, tasaLoading, setRoute, alerts, user } = useApp();
  const now = useNow(1000);
  const est = db.estudiantes;
  const k = useMemo(() => {
    let vendido = 0, cobrado = 0;
    for (const e of est) { const t = estudianteTotales(e); vendido += t.total; cobrado += t.abonado; }
    return { vendido, cobrado, pendiente: Math.max(0, vendido - cobrado) };
  }, [est]);
  const prod = useMemo(() => computeProduccion(est), [est]);
  const semana = useMemo(() => cobrosSemanales(est), [est]);
  const histUsd = useMemo(() => [...db.historialTasas].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-8).map((h) => h.usd), [db.historialTasas]);
  const entregados = est.filter((e) => e.estadoPedido === "Entregado").length;
  const maxSemana = Math.max(1, ...semana.map((d) => d.total));
  const cross = tasa.usd > 0 && tasa.eur > 0 ? tasa.eur / tasa.usd : 0;
  const saludo = new Date(now).getHours() < 12 ? "Buenos días" : new Date(now).getHours() < 19 ? "Buenas tardes" : "Buenas noches";

  const exportar = () => {
    downloadFile(`reporte-temporada-${todayISO()}.csv`, toCSV(
      ["Pedido", "Estudiante", "C.I.", "Escuela", "Grado", "Sección", "Paquete", "Total", "Abonado", "Saldo", "Estado pago", "Estado pedido"],
      est.map((e) => { const t = estudianteTotales(e); const esc = db.escuelas.find((x) => x.id === e.escuelaId); return [e.pedido, e.nombre, e.ci, esc?.nombre || "", e.grado, e.seccion, PAQUETES[e.paqueteId].nombre, t.total.toFixed(2), t.abonado.toFixed(2), t.saldo.toFixed(2), t.estadoPago, e.estadoPedido]; })
    ));
  };
  const ir = (r: Route) => setRoute(r);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Panel administrador · {new Date(now).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1>{saludo}, {user.nombre.split(" ")[0]} 👋</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Resumen de la temporada de grados · <b className="tabular-nums">{est.length}</b> estudiantes registrados
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportar}><Download size={15} /> Exportar temporada</button>
      </div>

      {/* ---- Pizarra de tasa del día ---- */}
      <div className="rate-board mb-4 reveal">
        <div className="rb-grid">
          <div className="rb-cell">
            <span className="rb-k">Dólar · tasa del día <span className="rb-live"><i />{tasa.apiOk ? "en vivo" : "respaldo"}</span></span>
            <span className="rb-v tabular-nums">{tasaLoading ? "…" : fmtBs(tasa.usd)}<small>Bs / $</small></span>
            <span className="rb-s"><Spark vals={histUsd} />{histUsd.length > 1 ? ` últimos ${histUsd.length} cierres · ve.dolarapi.com` : "ve.dolarapi.com"}</span>
          </div>
          <div className="rb-cell">
            <span className="rb-k">Euro · tasa del día</span>
            <span className="rb-v gold tabular-nums">{tasaLoading ? "…" : fmtBs(tasa.eur)}<small>Bs / €</small></span>
            <span className="rb-s">{cross > 0 ? `1 € ≈ ${cross.toFixed(3)} $` : "fuente oficial BCV"}</span>
          </div>
          <button className="rb-btn" onClick={() => void refreshTasa()} disabled={tasaLoading}>
            <RefreshCw size={14} className={tasaLoading ? "spin" : ""} />
            {tasaLoading ? "Consultando…" : `Actualizar · ${fmtHaceSegundos(tasa.updated, now)}`}
          </button>
        </div>
      </div>

      {/* ---- Indicadores ---- */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-xl-2"><Kpi icon={School} label="Escuelas" value={db.escuelas.length} bg="var(--tint-navy-2)" fg="var(--jyg-navy)" onClick={() => ir("escuelas")} delay={0} /></div>
        <div className="col-6 col-md-4 col-xl-2"><Kpi icon={GraduationCap} label="Docentes" value={db.docentes.length} bg="var(--tint-gold)" fg="var(--jyg-gold-deep)" onClick={() => ir("docentes")} delay={40} /></div>
        <div className="col-6 col-md-4 col-xl-2"><Kpi icon={Users} label="Estudiantes" value={est.length} bg="var(--tint-ok)" fg="var(--ok)" onClick={() => ir("estudiantes")} delay={80} /></div>
        <div className="col-6 col-md-4 col-xl-2"><Kpi icon={Boxes} label="Pedidos" value={est.length} sub={`${entregados} entregados`} bg="var(--tint-navy-2)" fg="var(--jyg-navy)" onClick={() => ir("ventas")} delay={120} /></div>
        <div className="col-6 col-md-4 col-xl-2"><Kpi icon={CircleDollarSign} label="Cobrado" value={k.cobrado} money sub={fmtBs(k.cobrado * tasa.usd)} bg="var(--tint-ok)" fg="var(--ok)" onClick={() => ir("reportes")} delay={160} /></div>
        <div className="col-6 col-md-4 col-xl-2"><Kpi icon={Wallet} label="Pendiente" value={k.pendiente} money sub={fmtBs(k.pendiente * tasa.usd)} bg="var(--tint-danger)" fg="var(--danger)" onClick={() => ir("reportes")} delay={200} /></div>
      </div>

      {/* ---- Pipeline de producción ---- */}
      <div className="card p-4 mb-4 reveal" style={{ animationDelay: "120ms" }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="font-display fw-semibold m-0" style={{ fontSize: 16.5 }}>Línea de producción</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => ir("produccion")}>Ver producción <ArrowRight size={13} /></button>
        </div>
        <div className="pipe">
          {ESTADOS_PEDIDO.map((s, i) => {
            const n = est.filter((e) => e.estadoPedido === s).length;
            const pct = est.length ? (n / est.length) * 100 : 0;
            const colores = ["var(--jyg-navy)", "var(--jyg-navy-500)", "var(--jyg-gold-deep)", "var(--warn)", "var(--ok)"];
            return (
              <div key={s} className="pipe-step" onClick={() => ir("ventas")} style={{ borderTop: `3px solid ${colores[i]}` }}>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="n tabular-nums" style={{ color: colores[i] }}>{n}</span>
                  <span className="lbl">{s}</span>
                </div>
                <Bar pct={pct} color={colores[i]} height={6} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="row g-3">
        {/* ---- Cobros de la semana ---- */}
        <div className="col-12 col-xl-7">
          <div className="card p-4 h-100 reveal" style={{ animationDelay: "160ms" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h3 className="font-display fw-semibold m-0" style={{ fontSize: 16.5 }}>Cobros de la semana</h3>
              <Badge tone="green" dot>{fmtUSD(semana.reduce((s, d) => s + d.total, 0))}</Badge>
            </div>
            <div className="d-flex align-items-end gap-2" style={{ height: 150 }}>
              {semana.map((d, i) => (
                <div key={i} className="flex-grow-1 d-flex flex-column align-items-center gap-1" title={`${d.label}: ${fmtUSD(d.total)} · ${d.abonos} abonos`}>
                  <span className="tabular-nums" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{d.abonos > 0 ? d.abonos : ""}</span>
                  <div className="w-100 rounded-3 bar-anim" style={{ height: `${Math.max(4, (d.total / maxSemana) * 100)}%`, background: i === semana.length - 1 ? "linear-gradient(180deg, var(--jyg-gold), var(--jyg-gold-deep))" : "linear-gradient(180deg, var(--jyg-navy-500), var(--jyg-navy))", transition: "height .6s" }} />
                  <span style={{ fontSize: 10.5, color: "var(--ink-faint)", textTransform: "capitalize" }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Combos solicitados ---- */}
        <div className="col-12 col-xl-5">
          <div className="card p-4 h-100 reveal" style={{ animationDelay: "200ms" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h3 className="font-display fw-semibold m-0" style={{ fontSize: 16.5 }}>Combos solicitados</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => ir("paquetes")}>Paquetes</button>
            </div>
            {Object.values(PAQUETES).map((p) => {
              const n = prod.combos[p.id] || 0;
              const pct = est.length ? (n / est.length) * 100 : 0;
              return (
                <div key={p.id} className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="font-display fw-semibold" style={{ fontSize: 13 }}>{p.nombre} <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>· {fmtUSD(p.precioBase)}</span></span>
                    <span className="tabular-nums font-display fw-bold" style={{ color: p.color }}>{n}</span>
                  </div>
                  <Bar pct={pct} color={p.color} height={8} />
                </div>
              );
            })}
            <div className="alert-row mt-3" onClick={() => ir("reportes")}>
              <Sparkles size={16} style={{ color: "var(--jyg-gold-deep)" }} />
              <span className="flex-grow-1" style={{ fontSize: 12.5 }}>Ver adicionales solicitados y materiales</span>
              <ArrowRight size={14} style={{ color: "var(--ink-faint)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Alertas + próximos ---- */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-xl-7">
          <div className="card p-4 reveal" style={{ animationDelay: "240ms" }}>
            <h3 className="font-display fw-semibold mb-3" style={{ fontSize: 16.5 }}>Alertas operativas</h3>
            {alerts.length === 0 ? (
              <div className="d-flex align-items-center gap-2 p-3 rounded-3" style={{ background: "var(--tint-ok)", color: "var(--ok)", fontSize: 13.5 }}>
                <CheckCircle2 size={17} /> Todo al día — sin pagos pendientes ni pedidos detenidos.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {alerts.map((a) => (
                  <button key={a.key} className="alert-row" onClick={() => setRoute(a.route)}>
                    {a.key === "pagos" ? <Wallet size={16} style={{ color: "var(--danger)" }} /> : a.key === "fotos" ? <Camera size={16} style={{ color: "var(--warn)" }} /> : a.key === "saldo" ? <FileWarning size={16} style={{ color: "var(--danger)" }} /> : <PackageCheck size={16} style={{ color: "var(--ok)" }} />}
                    <span className="flex-grow-1" style={{ minWidth: 0 }}>
                      <span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{a.title}</span>
                      <span className="d-block" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{a.desc}</span>
                    </span>
                    <ArrowRight size={14} style={{ color: "var(--ink-faint)" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-12 col-xl-5">
          <div className="card p-4 reveal" style={{ animationDelay: "280ms" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h3 className="font-display fw-semibold m-0" style={{ fontSize: 16.5 }}>Agenda próxima</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => ir("agenda")}>Calendario</button>
            </div>
            {db.eventos.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Sin eventos programados.</p>
            ) : [...db.eventos].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 4).map((e) => (
              <div key={e.id} className="d-flex align-items-center gap-3 p-2 rounded-3 mb-2" style={{ background: "var(--card-bg-2)" }}>
                <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 40, height: 40, background: "var(--tint-navy-2)", color: "var(--jyg-navy)", flexShrink: 0 }}><CalendarDays size={17} /></span>
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 12.5 }}>{e.titulo}</span>
                  <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{fmtFecha(e.fecha)} · {e.hora} h</span>
                </span>
                <Badge tone={e.tipo === "entrega" ? "green" : e.tipo === "cobranza" ? "amber" : "blue"}>{e.tipo}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
