import React, { useMemo } from "react";
import {
  AlertTriangle, ArrowRight, Camera, DollarSign, Euro, GraduationCap, Package, Receipt, RefreshCw,
  School, Smartphone, Star, TrendingUp, Users, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import {
  ADICIONALES, PAQUETES, cobrosSemanales, computeProduccion, estudianteTotales, fmtBs, fmtFecha,
  fmtFechaHoraViva, fmtHaceSegundos, fmtUSD, waLink,
} from "../lib/data";
import { Badge, Bar, SectionHead, useCountUp, useNow, estadoPedidoTone } from "../components/ui";

export default function Dashboard() {
  const { db, tasa, refreshTasa, tasaLoading, setRoute, user } = useApp();
  const now = useNow(1000);

  const k = useMemo(() => {
    let cobrado = 0, pendiente = 0, vendido = 0;
    for (const e of db.estudiantes) { const t = estudianteTotales(e); vendido += t.total; cobrado += t.abonado; pendiente += t.saldo; }
    return { vendido, cobrado, pendiente };
  }, [db.estudiantes]);

  const combos = useMemo(() => computeProduccion(db.estudiantes).combos, [db.estudiantes]);
  const semana = useMemo(() => cobrosSemanales(db.estudiantes), [db.estudiantes]);
  const maxSemana = Math.max(1, ...semana.map((s) => s.total));
  const recientes = useMemo(() => [...db.estudiantes].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro)).slice(0, 6), [db.estudiantes]);
  const ranking = useMemo(() =>
    db.escuelas.map((es) => ({ es, n: db.estudiantes.filter((e) => e.escuelaId === es.id).length, vendido: db.estudiantes.filter((e) => e.escuelaId === es.id).reduce((s, e) => s + estudianteTotales(e).total, 0) }))
      .sort((a, b) => b.vendido - a.vendido), [db.escuelas, db.estudiantes]);
  const maxRank = Math.max(1, ...ranking.map((r) => r.vendido));

  const tiles = [
    { icon: School, label: "Escuelas", value: db.escuelas.length, c: "var(--blue)", bg: "var(--blue-tint-2)" },
    { icon: Users, label: "Docentes", value: db.docentes.length, c: "var(--gold-deep)", bg: "var(--gold-tint)" },
    { icon: GraduationCap, label: "Estudiantes", value: db.estudiantes.length, c: "var(--green)", bg: "var(--green-tint)" },
    { icon: Receipt, label: "Pedidos", value: db.estudiantes.length, c: "var(--blue)", bg: "var(--blue-tint-2)" },
    { icon: DollarSign, label: "Cobrado", value: k.cobrado, c: "var(--green)", bg: "var(--green-tint)", money: true },
    { icon: Wallet, label: "Pendiente", value: k.pendiente, c: "var(--red)", bg: "var(--red-tint)", money: true },
    { icon: Package, label: "Paq. Básicos", value: combos.basico || 0, c: "var(--blue)", bg: "var(--blue-tint-2)" },
    { icon: Star, label: "Paq. Premium", value: combos.premium || 0, c: "var(--green)", bg: "var(--green-tint)" },
    { icon: TrendingUp, label: "Paq. Lujo", value: combos.lujo || 0, c: "var(--gold-deep)", bg: "var(--gold-tint)" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Panel de administración</div>
          <h1>Hola, {user.nombre.split(" ")[0]} 👋</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Resumen general de Promociones JyG · temporada {db.escuelas[0]?.anioEscolar || "2025-2026"}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setRoute("estudiantes", { openNew: true })}>
          <GraduationCap size={16} /> Nuevo estudiante
        </button>
      </div>

      {/* Tasa del día */}
      <div className="card p-5 mb-5 reveal relative overflow-hidden">
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full opacity-[0.07] pointer-events-none" style={{ background: "var(--gold)" }} />
        <div className="flex items-center gap-6 flex-wrap">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(150deg, var(--blue), #0b2e52)", color: "#ffd970" }}><DollarSign size={24} /></span>
          <div>
            <div className="text-[10.5px] font-display font-semibold uppercase tracking-[1.2px]" style={{ color: "var(--ink-faint)" }}>Tasa del día · BCV</div>
            <div className="font-display text-[26px] font-bold leading-tight tabular-nums">{fmtBs(tasa.usd)} <span className="text-[13px] font-semibold" style={{ color: "var(--ink-faint)" }}>/ $1</span></div>
          </div>
          {tasa.eur > 0 && (
            <div className="min-w-[120px]">
              <div className="text-[10.5px] font-display font-semibold uppercase tracking-[1.2px] flex items-center gap-1" style={{ color: "var(--ink-faint)" }}><Euro size={11} /> Euro</div>
              <div className="font-display text-[17px] font-bold leading-tight tabular-nums">{fmtBs(tasa.eur)}</div>
            </div>
          )}
          <TasaSpark data={db.historialTasas.slice(-7)} />
          <div className="ml-auto text-right">
            <Badge tone={tasa.source === "api" ? "green" : tasa.source === "manual" ? "amber" : "slate"} dot>
              {tasa.source === "api" ? "ve.dolarapi.com en vivo" : tasa.source === "manual" ? "Tasa manual" : "Última tasa conocida"}
            </Badge>
            <SelloActualizacion updated={tasa.updated} apiOk={tasa.apiOk} fuente={tasa.source} now={now} />
            <div className="flex gap-1.5 justify-end mt-2">
              <button className="btn btn-ghost btn-sm" onClick={refreshTasa} disabled={tasaLoading}>
                <RefreshCw size={13} className={tasaLoading ? "spin" : ""} /> {tasaLoading ? "Consultando…" : "Actualizar"}
              </button>
              <button className="btn btn-soft btn-sm" onClick={() => setRoute("integraciones")}>Historial diario</button>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-9 gap-3 mb-6">
        {tiles.map((t, i) => <TileStat key={t.label} {...t} delay={i * 45} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          {/* Cobros de la semana */}
          <div className="card p-5">
            <SectionHead title="Cobranza · últimos 7 días" desc="Abonos registrados por día" actions={<Badge tone="green">{fmtUSD(semana.reduce((s, x) => s + x.total, 0))}</Badge>} />
            <div className="flex items-end gap-2.5 h-[150px] mt-2">
              {semana.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default" title={fmtUSD(s.total)}>
                  <span className="text-[10px] font-display font-bold opacity-0 group-hover:opacity-100 transition-opacity tabular-nums" style={{ color: "var(--blue)" }}>{s.total > 0 ? fmtUSD(s.total) : ""}</span>
                  <div className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80" style={{ height: `${Math.max(4, (s.total / maxSemana) * 100)}px`, background: i === semana.length - 1 ? "var(--gold)" : "var(--blue)", opacity: 0.55 + (i / semana.length) * 0.45 }} />
                  <span className="text-[10.5px] font-semibold uppercase" style={{ color: "var(--ink-faint)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pedidos recientes */}
          <div className="card p-5">
            <SectionHead title="Pedidos recientes" actions={<button className="btn btn-ghost btn-sm" onClick={() => setRoute("ventas")}>Ver todos <ArrowRight size={13} /></button>} />
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Pedido</th><th>Estudiante</th><th>Paquete</th><th>Registro</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {recientes.map((e) => {
                    const t = estudianteTotales(e);
                    return (
                      <tr key={e.id} className="cursor-pointer" onClick={() => setRoute("estudiantes", { open: e.id })}>
                        <td className="font-display font-bold text-[12.5px]">{e.pedido}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-[11.5px]" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>{e.nombre[0]}</span>
                            <span className="font-display font-semibold text-[13px]">{e.nombre}</span>
                          </div>
                        </td>
                        <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "blue" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                        <td className="text-[12px]">{fmtFecha(e.fechaRegistro)}</td>
                        <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                        <td className="font-display font-bold text-[12.5px] text-right" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(t.saldo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Ranking de escuelas */}
          <div className="card p-5">
            <SectionHead title="Ranking de escuelas" desc="Por monto vendido" />
            <div className="flex flex-col gap-3.5">
              {ranking.map((r, i) => (
                <div key={r.es.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-display font-semibold text-[12.5px] truncate">#{i + 1} {r.es.nombre}</span>
                    <span className="text-[11.5px] tabular-nums" style={{ color: "var(--ink-faint)" }}>{r.n} est. · <b style={{ color: "var(--blue)" }}>{fmtUSD(r.vendido)}</b></span>
                  </div>
                  <Bar pct={(r.vendido / maxRank) * 100} color={i === 0 ? "var(--gold)" : "var(--blue)"} height={8} />
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          <div className="card p-5">
            <SectionHead title="Alertas" desc="Pagos, fotos y entregas" actions={<AlertTriangle size={18} style={{ color: "var(--amber)" }} />} />
            <div className="flex flex-col gap-2.5">
              <button className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all hover:translate-x-1" style={{ background: "var(--red-tint)", color: "var(--ink)" }} onClick={() => setRoute("estudiantes")}>
                <Wallet size={17} style={{ color: "var(--red)" }} />
                <span className="text-[12.5px] flex-1"><b className="font-display">{db.estudiantes.filter((e) => estudianteTotales(e).saldo > 0.009).length}</b> estudiantes con pagos pendientes</span>
              </button>
              <button className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all hover:translate-x-1" style={{ background: "var(--amber-tint)", color: "var(--ink)" }} onClick={() => setRoute("produccion")}>
                <Camera size={17} style={{ color: "var(--amber)" }} />
                <span className="text-[12.5px] flex-1"><b className="font-display">{db.estudiantes.filter((e) => e.estadoPedido !== "Entregado" && Object.values(e.codigos).some((c) => !c.trim())).length}</b> pedidos sin fotografías</span>
              </button>
              <button className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all hover:translate-x-1" style={{ background: "var(--green-tint)", color: "var(--ink)" }} onClick={() => setRoute("ventas")}>
                <Package size={17} style={{ color: "var(--green)" }} />
                <span className="text-[12.5px] flex-1"><b className="font-display">{db.estudiantes.filter((e) => e.estadoPedido === "Empaque").length}</b> pedidos listos para entregar</span>
              </button>
            </div>
          </div>

          {/* Adicionales más pedidos */}
          <div className="card p-5">
            <SectionHead title="Adicionales solicitados" />
            <div className="flex flex-col gap-2">
              {ADICIONALES.slice(0, 5).map((a) => {
                const n = db.estudiantes.reduce((s, e) => s + e.adicionales.filter((x) => x.producto === a.nombre).reduce((z, x) => z + x.cantidad, 0), 0);
                return (
                  <div key={a.nombre} className="flex items-center justify-between text-[12.5px] p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                    <span className="font-semibold" style={{ color: "var(--ink-soft)" }}>{a.nombre}</span>
                    <span className="font-display font-bold" style={{ color: n > 0 ? "var(--blue)" : "var(--ink-faint)" }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <span className="hidden"><Smartphone size={1} /></span>
    </div>
  );
}

function SelloActualizacion({ updated, apiOk, fuente, now }: { updated: number; apiOk: boolean; fuente: string; now: number }) {
  const proximo = updated + 5 * 60 * 1000;
  const resta = Math.max(0, proximo - now);
  const mm = String(Math.floor(resta / 60000));
  const ss = String(Math.floor((resta % 60000) / 1000)).padStart(2, "0");
  return (
    <div className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--ink-faint)" }}>
      <span className="font-semibold tabular-nums" style={{ color: "var(--ink-soft)" }}>{fmtFechaHoraViva(updated, now)}</span>
      <span> · {fmtHaceSegundos(updated, now)}</span>
      {fuente === "api" && apiOk && <span className="ml-1.5 tabular-nums" style={{ color: "var(--blue)" }} title="Autorefresco cada 5 min">↻ {mm}:{ss}</span>}
    </div>
  );
}

function TasaSpark({ data }: { data: { fecha: string; usd: number }[] }) {
  const vals = data.map((d) => d.usd).filter((v) => v > 0);
  if (vals.length < 2) return null;
  const W = 110, H = 38, P = 3;
  const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(0.01, max - min);
  const x = (i: number) => P + (i * (W - P * 2)) / (vals.length - 1);
  const y = (v: number) => P + (H - P * 2) * (1 - (v - min) / span);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const sube = vals[vals.length - 1] >= vals[0];
  return (
    <div className="hidden md:block text-center" title="Evolución de la tasa (últimos 7 cierres)">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 110, height: 38, display: "block" }} aria-hidden="true">
        <polyline points={pts} fill="none" stroke={sube ? "var(--green)" : "var(--red)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="3" fill={sube ? "var(--green)" : "var(--red)"} />
      </svg>
      <div className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: sube ? "var(--green)" : "var(--red)" }}>
        {sube ? "▲" : "▼"} {(((vals[vals.length - 1] - vals[0]) / vals[0]) * 100).toFixed(2)}% · 7d
      </div>
    </div>
  );
}

function TileStat({ icon: Icon, label, value, c, bg, money, delay }: { icon: any; label: string; value: number; c: string; bg: string; money?: boolean; delay: number }) {
  const v = useCountUp(value);
  return (
    <div className="card p-3.5 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] h-full" style={{ animationDelay: `${delay}ms` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg, color: c }}><Icon size={17} /></div>
      <div className="font-display text-[17px] font-bold leading-none tabular-nums" style={{ color: c }}>{money ? fmtUSD(v) : Math.round(v)}</div>
      <div className="text-[10px] font-semibold mt-1" style={{ color: "var(--ink-faint)" }}>{label}</div>
    </div>
  );
}
