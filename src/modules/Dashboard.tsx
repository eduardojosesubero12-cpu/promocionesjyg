import React, { useMemo, useState } from "react";
import {
  Banknote, Boxes, CalendarClock, Camera, CircleDollarSign, Gem, GraduationCap, Medal, Package,
  RefreshCw, School, ShoppingBag, Star, TrendingUp, Users, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import {
  ADICIONALES, PAQUETES, cobrosSemanales, computeProduccion, estudianteTotales, fmtBs,
  fmtFecha, fmtFechaHoraViva, fmtHaceSegundos, fmtUSD, waLink,
} from "../lib/data";
import { Badge, Bar, SectionHead, estadoPedidoTone, useCountUp, useNow } from "../components/ui";

function CountMoney({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const v = useCountUp(value);
  return <>{prefix}{v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}

export default function Dashboard() {
  const { db, user, tasa, setRoute, refreshTasa, tasaLoading } = useApp();
  const [comboTab, setComboTab] = useState<"combos" | "adicionales">("combos");
  const now = useNow(1000);

  const fin = useMemo(() => {
    let vendido = 0, cobrado = 0;
    for (const e of db.estudiantes) { const t = estudianteTotales(e); vendido += t.total; cobrado += t.abonado; }
    return { vendido, cobrado, pendiente: Math.max(0, vendido - cobrado) };
  }, [db.estudiantes]);

  const prod = useMemo(() => computeProduccion(db.estudiantes.filter((e) => e.estadoPedido !== "Entregado")), [db.estudiantes]);
  const semana = useMemo(() => cobrosSemanales(db.estudiantes), [db.estudiantes]);
  const maxSem = Math.max(1, ...semana.map((d) => d.total));
  const recientes = useMemo(() => [...db.estudiantes].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro)).slice(0, 6), [db.estudiantes]);

  const ranking = useMemo(() => db.escuelas.map((es) => {
    const hijos = db.estudiantes.filter((e) => e.escuelaId === es.id);
    return { nombre: es.nombre, n: hijos.length, vendido: hijos.reduce((s, e) => s + estudianteTotales(e).total, 0) };
  }).sort((a, b) => b.vendido - a.vendido), [db.escuelas, db.estudiantes]);
  const maxRank = Math.max(1, ...ranking.map((r) => r.vendido));

  const adicionalesCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of ADICIONALES) m[a.nombre] = 0;
    for (const e of db.estudiantes) for (const a of e.adicionales) m[a.producto] = (m[a.producto] || 0) + a.cantidad;
    return m;
  }, [db.estudiantes]);

  const tiles = [
    { icon: School, label: "Escuelas", value: db.escuelas.length, color: "var(--blue)", bg: "var(--blue-tint-2)" },
    { icon: Users, label: "Docentes", value: db.docentes.length, color: "var(--gold-deep)", bg: "var(--gold-tint)" },
    { icon: GraduationCap, label: "Estudiantes", value: db.estudiantes.length, color: "var(--green)", bg: "var(--green-tint)" },
    { icon: ShoppingBag, label: "Pedidos", value: db.estudiantes.length, color: "var(--amber)", bg: "var(--amber-tint)" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Panel administrador</div>
          <h1>Hola, {user?.nombre.split(" ")[0]} 🎓</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Resumen general de Promociones JyG — temporada de grados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setRoute("estudiantes", { openNew: true })}><GraduationCap size={16} /> Registrar estudiante</button>
      </div>

      {/* Franja de tasa del día */}
      <div className="card p-4 mb-6 flex items-center gap-4 flex-wrap reveal" style={{ background: "linear-gradient(120deg, var(--surface) 55%, var(--blue-tint-2))" }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--blue)", color: "#ffd970" }}>
          <CircleDollarSign size={22} />
        </div>
        <div className="min-w-[150px]">
          <div className="text-[10.5px] font-display font-semibold uppercase tracking-[1.2px]" style={{ color: "var(--ink-faint)" }}>Tasa del día · BCV / Paralelo</div>
          <div className="font-display text-[24px] font-bold leading-tight">{fmtBs(tasa.usd)} <span className="text-[13px] font-semibold" style={{ color: "var(--ink-faint)" }}>/ $1</span></div>
        </div>
        {tasa.eur > 0 && (
          <div className="min-w-[120px]">
            <div className="text-[10.5px] font-display font-semibold uppercase tracking-[1.2px]" style={{ color: "var(--ink-faint)" }}>Euro</div>
            <div className="font-display text-[17px] font-bold leading-tight">{fmtBs(tasa.eur)} <span className="text-[12px] font-semibold" style={{ color: "var(--ink-faint)" }}>/ €1</span></div>
          </div>
        )}
        <TasaSpark data={db.historialTasas.slice(-7)} />
        <div className="ml-auto text-right">
          <Badge tone={tasa.source === "api" ? "green" : tasa.source === "manual" ? "amber" : "slate"} dot>
            {tasa.source === "api" ? "ve.dolarapi.com en vivo" : tasa.source === "manual" ? "Tasa manual" : "Última tasa conocida"}
          </Badge>
          <div className="flex gap-1.5 justify-end mt-2 flex-wrap">
            <button className="btn btn-ghost btn-sm" onClick={refreshTasa} disabled={tasaLoading}>
              <RefreshCw size={13} className={tasaLoading ? "spin" : ""} /> {tasaLoading ? "Consultando…" : "Actualizar"}
            </button>
            <button className="btn btn-soft btn-sm" onClick={() => setRoute("integraciones")}>Historial diario</button>
          </div>
          <div className="mt-1.5 text-[11px]" style={{ color: "var(--ink-faint)" }}>
            <span className="font-semibold" style={{ color: "var(--ink-soft)" }}>{fmtFechaHoraViva(tasa.updated, now)}</span>
            {" · "}{fmtHaceSegundos(tasa.updated, now)}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {tiles.map((t, i) => <TileStat key={t.label} {...t} delay={i * 60} />)}
      </div>

      {/* Cobranza + combos */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-6">
        <div className="card p-5 xl:col-span-2 reveal" style={{ animationDelay: "80ms" }}>
          <SectionHead title="Resumen de cobranza" desc="Vendido, cobrado y pendiente en USD y Bs" />
          <div className="flex flex-col gap-4">
            {[
              { l: "Total vendido", v: fin.vendido, c: "var(--blue)" },
              { l: "Total cobrado", v: fin.cobrado, c: "var(--green)" },
              { l: "Total pendiente", v: fin.pendiente, c: "var(--red)" },
            ].map((x) => (
              <div key={x.l}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12.5px] font-semibold" style={{ color: "var(--ink-soft)" }}>{x.l}</span>
                  <span className="font-display font-bold text-[17px]" style={{ color: x.c }}><CountMoney value={x.v} /></span>
                </div>
                <Bar pct={fin.vendido ? (x.v / fin.vendido) * 100 : 0} color={x.c} />
                <div className="text-[11px] mt-1" style={{ color: "var(--ink-faint)" }}>{fmtBs(x.v * tasa.usd)} a tasa del día</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl text-[12px]" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>
            <CalendarClock size={13} className="inline mr-1.5" style={{ color: "var(--blue)" }} />
            Cobros últimos 7 días: <b className="font-display"><CountMoney value={semana.reduce((s, d) => s + d.total, 0)} /></b>
          </div>
        </div>

        <div className="card p-5 xl:col-span-3 reveal" style={{ animationDelay: "140ms" }}>
          <SectionHead title="Cobros de la semana" desc="Abonos registrados por día (USD)" actions={<TrendingUp size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="flex items-end gap-2.5" style={{ height: 165 }}>
            {semana.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title={`${d.label}: ${fmtUSD(d.total)}`}>
                <span className="text-[10.5px] font-display font-bold" style={{ color: d.total > 0 ? "var(--blue)" : "var(--ink-faint)" }}>{d.total > 0 ? `$${Math.round(d.total)}` : ""}</span>
                <div className="w-full rounded-t-lg transition-all hover:opacity-80" style={{ height: `${Math.max(4, (d.total / maxSem) * 110)}px`, background: d.total > 0 ? "linear-gradient(180deg, var(--blue-500), var(--blue))" : "var(--surface-2)" }} />
                <span className="text-[10.5px] font-semibold uppercase" style={{ color: "var(--ink-faint)" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Combos / adicionales + ranking + pedidos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-5 reveal" style={{ animationDelay: "100ms" }}>
          <div className="flex rounded-full p-1 gap-1 mb-4" style={{ background: "var(--slate-tint)" }}>
            {([["combos", "Combos"], ["adicionales", "Adicionales"]] as const).map(([k, lbl]) => (
              <button key={k} onClick={() => setComboTab(k)} className="flex-1 border-none cursor-pointer font-display font-semibold text-[12.5px] px-3 py-2 rounded-full transition-all" style={{ background: comboTab === k ? "var(--surface)" : "transparent", color: comboTab === k ? "var(--blue)" : "var(--ink-soft)", boxShadow: comboTab === k ? "var(--shadow-sm)" : "none" }}>
                {lbl} solicitados
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {comboTab === "combos"
              ? Object.values(PAQUETES).map((p) => {
                const Ic = p.id === "lujo" ? Gem : p.id === "premium" ? Star : Package;
                const n = prod.combos[p.id] || 0;
                const max = Math.max(1, ...Object.values(prod.combos));
                return (
                  <div key={p.id} className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", color: p.color }}><Ic size={15} /></span>
                      <span className="font-display font-semibold text-[13px] flex-1">Paquete {p.nombre}</span>
                      <span className="font-display font-bold text-[17px]">{n}</span>
                    </div>
                    <Bar pct={(n / max) * 100} color={p.color} height={7} />
                  </div>
                );
              })
              : ADICIONALES.map((a) => (
                <div key={a.nombre} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
                  <span className="font-display text-[12.5px] font-semibold flex-1">{a.nombre}</span>
                  <span className="font-display font-bold">{adicionalesCount[a.nombre] || 0}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="card p-5 reveal" style={{ animationDelay: "160ms" }}>
          <SectionHead title="Ranking de escuelas" desc="Por monto vendido" />
          <div className="flex flex-col gap-3">
            {ranking.map((r, i) => (
              <div key={r.nombre}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-bold text-[12px] w-5" style={{ color: i === 0 ? "var(--gold-deep)" : "var(--ink-faint)" }}>{i + 1}</span>
                  <span className="font-display font-semibold text-[12.5px] flex-1 truncate">{r.nombre}</span>
                  <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{r.n} est.</span>
                  <span className="font-display font-bold text-[13px]" style={{ color: "var(--blue)" }}>{fmtUSD(r.vendido)}</span>
                </div>
                <Bar pct={(r.vendido / maxRank) * 100} color={i === 0 ? "var(--gold)" : "var(--blue)"} height={7} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[["Básico", prod.combos.basico || 0], ["Premium", prod.combos.premium || 0], ["Lujo", prod.combos.lujo || 0]].map(([l, n]) => (
              <div key={String(l)} className="p-2.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <div className="font-display font-bold text-[18px]">{n}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 reveal" style={{ animationDelay: "220ms" }}>
          <SectionHead title="Pedidos recientes" desc="Últimos registros" />
          <div className="flex flex-col gap-2">
            {recientes.map((e) => {
              const t = estudianteTotales(e);
              return (
                <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="text-left p-3 rounded-xl border-none cursor-pointer transition-all hover:translate-x-1" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-[13px] truncate">{e.nombre}</span>
                    <Badge tone={estadoPedidoTone(e.estadoPedido)}>{e.estadoPedido}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                    <span>{e.pedido} · {fmtFecha(e.fechaRegistro)}</span>
                    <span className="font-display font-bold" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{t.saldo > 0 ? `Saldo ${fmtUSD(t.saldo)}` : "Pagado"}</span>
                  </div>
                  {t.saldo > 0 && e.telefono && (
                    <a className="text-[11px] font-bold mt-1 inline-block" style={{ color: "#1f9d55" }} href={waLink(e.telefono, `Hola ${e.representante || ""}, le saluda Promociones JyG 🎓. El pedido ${e.pedido} de ${e.nombre} tiene un saldo de ${fmtUSD(t.saldo)}.`)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
                      <Wallet size={11} className="inline mr-1" />Recordar por WhatsApp
                    </a>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Materiales en cola */}
      <div className="card p-5 mt-5 reveal" style={{ animationDelay: "260ms" }}>
        <SectionHead title="Materiales en cola de producción" desc="Calculados automáticamente de los pedidos pendientes" actions={<button className="btn btn-soft btn-sm" onClick={() => setRoute("produccion")}><Boxes size={14} /> Ver producción</button>} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["Afiche 30x40", "Foto 8x12", "Medalla", "Estola", "Llavero"].map((m) => (
            <div key={m} className="p-3 rounded-xl text-center" style={{ background: "var(--surface-2)" }}>
              <Medal size={16} className="mx-auto mb-1.5" style={{ color: "var(--gold-deep)" }} />
              <div className="font-display font-bold text-[19px]">{prod.materiales[m] || 0}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{m}</div>
            </div>
          ))}
        </div>
      </div>

      <span className="hidden"><Banknote size={1} /><Camera size={1} /></span>
    </div>
  );
}

function TileStat({ icon: Icon, label, value, color, bg, delay }: { icon: any; label: string; value: number; color: string; bg: string; delay: number }) {
  const v = useCountUp(value);
  return (
    <div className="card p-4 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${delay}ms` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, color }}>
        <Icon size={19} />
      </div>
      <div className="font-display text-[24px] font-bold leading-none">{Math.round(v)}</div>
      <div className="text-[11.5px] font-semibold mt-1" style={{ color: "var(--ink-soft)" }}>{label}</div>
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
