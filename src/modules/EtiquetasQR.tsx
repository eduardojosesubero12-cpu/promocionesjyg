import React, { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  CreditCard, Download, GraduationCap, Printer, QrCode, RefreshCw, Search, School, Sparkles, Wallet,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante } from "../lib/data";
import { PAQUETES, estudianteTotales, fmtBs, fmtUSD, toCSV, downloadFile, todayISO, fmtFecha } from "../lib/data";
import { Badge, EmptyState, estadoPagoTone, estadoPedidoTone } from "../components/ui";

/* ================= TARJETA QR · estilo tarjeta de crédito · 70 × 50 mm ================= */

const qrPayload = (e: Estudiante, escuelaNombre: string) => {
  const t = estudianteTotales(e);
  return [
    "JYG", e.pedido, e.nombre, e.ci || "S/C", escuelaNombre, `${e.grado} "${e.seccion}"`,
    `Paq.${PAQUETES[e.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`,
    `Saldo ${fmtUSD(t.saldo)}`, `Abonos ${t.partes}`,
  ].join("|");
};

export function TarjetaQR({ est, escuelaNombre, tasaHoy }: { est: Estudiante; escuelaNombre: string; tasaHoy: number }) {
  const [flip, setFlip] = useState(false);
  const t = estudianteTotales(est);
  const anio = new Date().getFullYear();
  const pagado = t.saldo <= 0.009;

  return (
    <div className="tarj-zoom">
      <div className="tarj-flip" onClick={() => setFlip((v) => !v)} title="Clic para voltear la tarjeta" role="button" aria-label={`Tarjeta de ${est.nombre}`}>
        <div className={`tarj-inner ${flip ? "volteada" : ""}`}>
          {/* ---- FRENTE ---- */}
          <div className="tarj frente">
            <div className="tarj-brillo" />
            <div className="frente-in">
              <div className="tarj-head">
                <span className="tarj-logo"><GraduationCap size={13} /></span>
                <span className="tarj-marca">Promociones <b>JyG</b><br />Pase de Grado</span>
                <svg className="tarj-nfc" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 8.5a9 9 0 0 1 0 7" /><path d="M9 6a13 13 0 0 1 0 12" /><path d="M13 4a17 17 0 0 1 0 16" />
                </svg>
              </div>

              <div className="tarj-main">
                <div className="tarj-info">
                  <div className="tarj-nombre">{est.nombre}</div>
                  <div className="tarj-linea">{est.ci || "S/C"} &nbsp;·&nbsp; {est.grado} “{est.seccion}”</div>
                  <div className="tarj-linea opaca">{escuelaNombre || "Escuela por asignar"}</div>
                  <div className="tarj-chips">
                    <span className="tarj-chipemv" />
                    <span className="tarj-badge">{PAQUETES[est.paqueteId].nombre}</span>
                  </div>
                </div>
                <div className="tarj-qrbox">
                  <QRCode value={qrPayload(est, escuelaNombre)} size={92} level="M" />
                  <span>{est.pedido}</span>
                </div>
              </div>

              <div className="tarj-foot">
                <span>Tarjeta de Grado</span>
                <span className="num">{est.grado === "Bachiller" || est.grado === "Técnicos" ? "Promoción " : "Clase "}{anio}</span>
              </div>
            </div>
          </div>

          {/* ---- REVERSO ---- */}
          <div className="tarj reverso">
            <div className="tarj-brillo" />
            <div className="reverso-in">
              <div className="tarj-banda" />
              <div className="tarj-back-body">
                <div className="tarj-cap">
                  <span>Resumen de pago</span>
                  <small>Tasa {fmtBs(tasaHoy)}/$ · {fmtFecha(todayISO())}</small>
                </div>
                <div className="tarj-rows">
                  <div className="tarj-row">
                    <span className="l">Paquete + adicionales</span>
                    <span className="v">{fmtUSD(t.total)}<small>{fmtBs(t.total * tasaHoy)}</small></span>
                  </div>
                  <div className="tarj-row">
                    <span className="l">Abonado ({t.partes} {t.partes === 1 ? "pago" : "pagos"})</span>
                    <span className="v">{fmtUSD(t.abonado)}<small>a tasa de cada pago</small></span>
                  </div>
                  <div className={`tarj-row saldo ${pagado ? "pagado" : ""}`}>
                    <span className="l">{pagado ? "Estado: PAGADO ✓" : "Saldo pendiente"}</span>
                    <span className="v">{pagado ? "$0.00" : fmtUSD(t.saldo)}<small>{pagado ? "Cuenta liquidada" : fmtBs(t.saldo * tasaHoy)}</small></span>
                  </div>
                </div>
                <div className="tarj-rep">Rep.: {est.representante || "—"} · {est.telefono || "sin teléfono"}</div>
              </div>
              <div className="tarj-firma" style={{ margin: "0 3.8mm 6.2mm" }}>
                <i>{est.nombre}</i>
                <span>FIRMA AUTORIZADA</span>
              </div>
              <div className="tarj-back-foot">
                <span>Válida para entrega del paquete</span>
                <span>JyG · {anio}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= PÁGINA: TARJETAS QR POR LOTES ================= */

export default function EtiquetasQRPage() {
  const { db, tasa, toast } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [grupo, setGrupo] = useState<"escuela" | "grado" | "ninguno">("escuela");
  const [printIds, setPrintIds] = useState<string[] | null>(null);

  const escuelaDe = (id: string) => db.escuelas.find((e) => e.id === id);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.estudiantes
      .filter((e) => (!t || [e.nombre, e.ci, e.pedido, e.representante].some((v) => v.toLowerCase().includes(t))) && (!fEscuela || e.escuelaId === fEscuela))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.estudiantes, q, fEscuela]);

  const grupos = useMemo(() => {
    const map = new Map<string, Estudiante[]>();
    for (const e of lista) {
      const key = grupo === "escuela"
        ? (escuelaDe(e.escuelaId)?.nombre || "Sin escuela")
        : grupo === "grado"
          ? `${e.grado} · Sección “${e.seccion}”`
          : "Todas las tarjetas";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, grupo, db.escuelas]);

  const saldoTotal = lista.reduce((s, e) => s + estudianteTotales(e).saldo, 0);
  const pagados = lista.filter((e) => estudianteTotales(e).saldo <= 0.009).length;

  const imprimir = (ids: string[] | null) => {
    if (!ids || ids.length === 0) { toast("No hay tarjetas para imprimir", "warn"); return; }
    setPrintIds(ids);
    setTimeout(() => window.print(), 90);
    setTimeout(() => setPrintIds(null), 1400);
  };

  const exportar = () => {
    const rows = lista.map((e) => {
      const t = estudianteTotales(e);
      return [e.pedido, e.nombre, e.ci, escuelaDe(e.escuelaId)?.nombre || "", `${e.grado} ${e.seccion}`, PAQUETES[e.paqueteId].nombre, t.total.toFixed(2), t.abonado.toFixed(2), t.saldo.toFixed(2), t.estadoPago];
    });
    downloadFile(`tarjetas-qr-jyg-${todayISO()}.csv`, toCSV(["Pedido", "Estudiante", "C.I.", "Escuela", "Grado", "Paquete", "Total USD", "Abonado USD", "Saldo USD", "Estado pago"], rows));
    toast("Listado de tarjetas exportado", "ok");
  };

  const imprimirTodo = () => imprimir(lista.map((e) => e.id));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Tarjetas QR</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Tarjeta de grado tamaño crédito <b>7 × 5 cm</b> · frente con QR e identidad · reverso con pagos, tasa y saldos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={exportar}><Download size={15} /> Exportar CSV</button>
          <button className="btn btn-primary" onClick={imprimirTodo}><Printer size={15} /> Imprimir todas ({lista.length})</button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: CreditCard, l: "Tarjetas generadas", v: String(lista.length), c: "var(--blue)", bg: "var(--blue-tint-2)" },
          { icon: Wallet, l: "Saldo por cobrar", v: fmtUSD(saldoTotal), c: saldoTotal > 0 ? "var(--red)" : "var(--green)", bg: "var(--red-tint)" },
          { icon: Sparkles, l: "Pagadas completas", v: String(pagados), c: "var(--green)", bg: "var(--green-tint)" },
          { icon: QrCode, l: "Tasa del día", v: fmtBs(tasa.usd), c: "var(--gold-deep)", bg: "var(--gold-tint)" },
        ].map((k, i) => (
          <div key={k.l} className="card p-4 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg, color: k.c }}><k.icon size={19} /></span>
              <div>
                <div className="font-display font-bold text-[17px] leading-tight" style={{ color: k.c }}>{k.v}</div>
                <div className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{k.l}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 flex flex-wrap gap-2.5 items-center">
        <div className="flex items-center gap-2 h-[38px] px-3 rounded-full flex-1 min-w-[190px]" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
          <Search size={15} style={{ color: "var(--ink-faint)" }} />
          <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar estudiante, pedido, cédula…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select !w-[220px]" value={fEscuela} onChange={(e) => setFEscuela(e.target.value)}>
          <option value="">Todas las escuelas</option>
          {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <div className="flex rounded-full p-1 gap-1" style={{ background: "var(--slate-tint)" }}>
          {([["escuela", "Por escuela"], ["grado", "Por grado"], ["ninguno", "Sin grupo"]] as const).map(([g, lbl]) => (
            <button key={g} onClick={() => setGrupo(g)} className="border-none cursor-pointer font-display font-semibold text-[12px] px-3.5 py-2 rounded-full transition-all" style={{ background: grupo === g ? "var(--surface)" : "transparent", color: grupo === g ? "var(--blue)" : "var(--ink-soft)", boxShadow: grupo === g ? "var(--shadow-sm)" : "none" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Lotes */}
      {lista.length === 0 ? (
        <div className="card"><EmptyState icon={CreditCard} title="Sin tarjetas" text="Registra estudiantes para generar sus tarjetas QR de grado." /></div>
      ) : (
        grupos.map(([nombre, estudiantes]) => {
          const saldoGrupo = estudiantes.reduce((s, e) => s + estudianteTotales(e).saldo, 0);
          return (
            <section key={nombre} className="mb-8">
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><School size={17} /></span>
                <div className="flex-1 min-w-[180px]">
                  <h3 className="font-display font-bold text-[16.5px] m-0">{nombre}</h3>
                  <p style={{ fontSize: 12, margin: 0, color: "var(--ink-faint)" }}>
                    {estudiantes.length} {estudiantes.length === 1 ? "tarjeta" : "tarjetas"} · por cobrar <b style={{ color: saldoGrupo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(saldoGrupo)}</b>
                  </p>
                </div>
                {grupo !== "ninguno" && (
                  <button className="btn btn-soft btn-sm" onClick={() => imprimir(estudiantes.map((e) => e.id))}>
                    <Printer size={14} /> Imprimir este lote
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-7">
                {estudiantes.map((e, i) => {
                  const t = estudianteTotales(e);
                  return (
                    <div key={e.id} className="reveal" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
                      <TarjetaQR est={e} escuelaNombre={escuelaDe(e.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />
                      <div className="mt-2.5 mb-1 flex items-center justify-center gap-1.5 flex-wrap" style={{ maxWidth: 280 }}>
                        <Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge>
                        <Badge tone={estadoPagoTone(t.estadoPago)}>{t.estadoPago}</Badge>
                      </div>
                      <div className="flex justify-center">
                        <button className="btn btn-ghost btn-xs" onClick={() => imprimir([e.id])}><Printer size={12} /> Imprimir individual</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <p className="text-center mt-6 mb-0" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
        <RefreshCw size={11} className="inline mr-1" style={{ verticalAlign: "-1.5px" }} />
        Cada tarjeta se imprime con <b>frente y reverso</b> lado a lado en <b>70 × 50 mm</b> (tamaño tarjeta) — guillotina por la línea punteada y lamina.
        El QR contiene pedido, identidad, paquete, totales, abonos y saldo.
      </p>

      {/* Hoja de impresión */}
      <div className="print-sheet print-sheet--tarj">
        {(printIds ? lista.filter((e) => printIds.includes(e.id)) : []).map((e) => (
          <TarjetaQR key={e.id} est={e} escuelaNombre={escuelaDe(e.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />
        ))}
      </div>
    </div>
  );
}
