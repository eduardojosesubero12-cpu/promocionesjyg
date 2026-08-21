import React, { useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toJpeg } from "html-to-image";
import {
  CheckCircle2, Download, Loader2, Printer, Search, Smartphone, Ticket as TicketIcon, School, Users,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Config, Estudiante, Pago } from "../lib/data";
import { PAQUETES, estudianteTotales, fmtBs, fmtFecha, fmtUSD, todayISO, uid, waLink } from "../lib/data";
import { EmptyState, Badge } from "../components/ui";

/* ---------- Código de barras decorativo ---------- */
function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    for (const ch of (seed + seed).slice(0, 28)) { out.push(((ch.charCodeAt(0) % 3) + 1)); out.push(1); }
    return out;
  }, [seed]);
  return <div className="t-barcode" aria-hidden="true">{bars.map((w, i) => <i key={i} style={{ width: w }} />)}</div>;
}

/* ---------- Línea de abono: divisa ⇄ bolívares ---------- */
function PagoRow({ p, tasaHoy }: { p: Pago; tasaHoy: number }) {
  const montoBs = p.bs ? p.monto : p.usd * (p.tasa || tasaHoy);
  const montoUsd = p.bs ? (p.tasa ? p.monto / p.tasa : p.usd) : p.monto;
  const tasa = p.tasa || tasaHoy;
  return (
    <div style={{ marginBottom: 7 }}>
      <div className="t-line"><span className="l">{p.fecha} · {p.metodo}</span><span className="r t-bold">{fmtUSD(montoUsd)}</span></div>
      {p.referencia && <div className="t-sm t-muted">Ref: {p.referencia}</div>}
      <div className="t-sm t-muted">
        {p.bs ? <>Bs. {montoBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} → divisa</> : <>→ Bs. {montoBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })}</>}
        {" "}· tasa {tasa.toLocaleString("es-VE", { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

/* ---------- Texto del ticket para WhatsApp ---------- */
export function textoTicket(opts: { est: Estudiante; escuelaNombre: string; docenteNombre: string; tasaHoy: number; empresa: Config["empresa"] }) {
  const { est, escuelaNombre, docenteNombre, tasaHoy, empresa } = opts;
  const t = estudianteTotales(est);
  const L: string[] = [];
  L.push(`🧾 *${empresa.nombre.toUpperCase()}*`);
  L.push(`RIF ${empresa.rif} · ${empresa.telefono}`);
  L.push(empresa.direccion);
  L.push("──────────────");
  L.push(`*TICKET DE PAGO* · Pedido ${est.pedido}`);
  L.push(`Folio ${est.pedido}-${todayISO().split("-").join("")} · ${fmtFecha(todayISO())}`);
  L.push("──────────────");
  L.push(`👤 *${est.nombre}*`);
  if (est.ci) L.push(`C.I. ${est.ci}`);
  L.push(`🏫 ${escuelaNombre || "Escuela por asignar"} · ${est.grado} “${est.seccion}”`);
  if (docenteNombre) L.push(`🧑‍🏫 Prof. ${docenteNombre}`);
  if (est.representante) L.push(`Representante: ${est.representante}`);
  L.push("──────────────");
  L.push(`📦 *Paquete ${PAQUETES[est.paqueteId].nombre}* — ${fmtUSD(est.precioPaquete)}`);
  for (const a of est.adicionales) L.push(`   + ${a.cantidad}× ${a.producto}${a.talla ? ` (${a.talla})` : ""} — ${fmtUSD(a.cantidad * a.precio)}`);
  L.push(`*TOTAL: ${fmtUSD(t.total)}* (${fmtBs(t.total * tasaHoy)})`);
  L.push("──────────────");
  L.push("*ABONOS:*");
  if (est.pagos.length === 0) L.push("   Sin abonos registrados");
  for (const p of est.pagos) {
    const montoBs = p.bs ? p.monto : p.usd * (p.tasa || tasaHoy);
    const montoUsd = p.bs ? (p.tasa ? p.monto / p.tasa : p.usd) : p.monto;
    L.push(`   ${fmtFecha(p.fecha)} · ${p.metodo}${p.referencia ? ` · Ref ${p.referencia}` : ""}`);
    L.push(`   ${p.bs ? `Bs. ${montoBs.toLocaleString("es-VE")}` : fmtUSD(montoUsd)} ${p.bs ? "→ divisa" : "→ Bs"} ${montoBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} (tasa ${(p.tasa || tasaHoy).toLocaleString("es-VE", { maximumFractionDigits: 2 })})`);
  }
  L.push("──────────────");
  L.push(`✅ Abonado: ${fmtUSD(t.abonado)} (${fmtBs(t.abonado * tasaHoy)})`);
  L.push(t.saldo <= 0.009 ? `🎉 *SALDO: $0.00 — PAGADO COMPLETO*` : `⚠️ *SALDO: ${fmtUSD(t.saldo)}* (${fmtBs(t.saldo * tasaHoy)} a tasa de hoy)`);
  L.push(`Tasa del día: ${fmtBs(tasaHoy)}/$`);
  L.push("──────────────");
  L.push("📷 Presente el código QR de su tarjeta de grado para verificar.");
  L.push(`¡Gracias por su compra! 🎓 ${empresa.nombre}`);
  return L.join("\n");
}

/* ---------- Ticket térmico ---------- */
export function Ticket({ est, escuelaNombre, docenteNombre, tasaHoy, now }: {
  est: Estudiante; escuelaNombre: string; docenteNombre: string; tasaHoy: number; now: number;
}) {
  const { db } = useApp();
  const t = estudianteTotales(est);
  const pagado = t.saldo <= 0.009;
  const emision = new Date(now);
  const hora = emision.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const empresa = db.config.empresa;
  const folio = `${est.pedido}-${todayISO().split("-").join("")}`;
  const qrPayload = ["JYG", est.pedido, est.nombre, est.ci || "S/C", escuelaNombre, `${est.grado} "${est.seccion}"`,
    `Paq.${PAQUETES[est.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`, `Saldo ${fmtUSD(t.saldo)}`,
    `Abonos ${t.partes}`, `Tasa ${tasaHoy}`].join("|");

  return (
    <div>
      <div className="ticket">
        <div className={pagado ? "t-stamp pagado" : "t-stamp saldo"}>{pagado ? "PAGADO" : "SALDO"}</div>
        <div className="t-center">
          <div className="t-titulo">{empresa.nombre.toUpperCase()}</div>
          <div className="t-sm">RIF {empresa.rif} · {empresa.telefono}</div>
          <div className="t-sm">{empresa.direccion}</div>
        </div>
        <hr className="t-dashed" />
        <div className="t-center t-section">TICKET DE PAGO</div>
        <div className="t-line t-sm"><span className="l">Pedido</span><span className="r t-bold">{est.pedido}</span></div>
        <div className="t-line t-sm"><span className="l">Folio</span><span className="r">{folio}</span></div>
        <div className="t-line t-sm"><span className="l">Fecha</span><span className="r">{fmtFecha(todayISO())}</span></div>
        <hr className="t-dashed" />
        <div className="t-line"><span className="l">Estudiante</span><span className="r t-bold">{est.nombre}</span></div>
        {est.ci && <div className="t-line t-sm"><span className="l">C.I.</span><span className="r">{est.ci}</span></div>}
        <div className="t-line t-sm"><span className="l">Escuela</span><span className="r">{escuelaNombre || "—"}</span></div>
        <div className="t-line t-sm"><span className="l">Grado / Secc.</span><span className="r">{est.grado} “{est.seccion}”</span></div>
        {docenteNombre && <div className="t-line t-sm"><span className="l">Profesor(a)</span><span className="r">{docenteNombre}</span></div>}
        {est.representante && <div className="t-line t-sm"><span className="l">Representante</span><span className="r">{est.representante}</span></div>}
        <hr className="t-dashed" />
        <div className="t-section">DETALLE DEL PEDIDO</div>
        <div className="t-line"><span className="l">Paquete {PAQUETES[est.paqueteId].nombre}</span><span className="r t-bold">{fmtUSD(est.precioPaquete)}</span></div>
        {est.adicionales.map((a, i) => (
          <div key={i} className="t-line t-sm"><span className="l">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span><span className="r">{fmtUSD(a.cantidad * a.precio)}</span></div>
        ))}
        <div className="t-line" style={{ marginTop: 4 }}><span className="l t-bold">TOTAL</span><span className="r t-bold">{fmtUSD(t.total)}</span></div>
        <div className="t-line t-sm t-muted"><span className="l">Equivalente Bs (tasa de hoy)</span><span className="r">{fmtBs(t.total * tasaHoy)}</span></div>
        <hr className="t-dashed" />
        <div className="t-section">ABONOS ({est.pagos.length})</div>
        {est.pagos.length === 0 && <div className="t-sm t-muted">Sin abonos registrados.</div>}
        {est.pagos.map((p) => <PagoRow key={p.id} p={p} tasaHoy={tasaHoy} />)}
        <hr className="t-dashed" />
        <div className="t-line"><span className="l">Abonado</span><span className="r t-bold" style={{ color: "#0a7c4d" }}>{fmtUSD(t.abonado)}</span></div>
        <div className="t-line t-sm t-muted"><span className="l">Equiv. Bs</span><span className="r">{fmtBs(t.abonado * tasaHoy)}</span></div>
        <div className="t-line" style={{ marginTop: 3 }}><span className="l t-bold">{pagado ? "SALDO" : "SALDO PENDIENTE"}</span><span className="r t-bold" style={{ color: pagado ? "#0a7c4d" : "#c0281f" }}>{fmtUSD(t.saldo)}</span></div>
        {!pagado && <div className="t-line t-sm t-muted"><span className="l">Equiv. Bs a tasa de hoy</span><span className="r">{fmtBs(t.saldo * tasaHoy)}</span></div>}
        <div className="t-line t-sm t-muted"><span className="l">Tasa del día</span><span className="r">{fmtBs(tasaHoy)} / $1</span></div>
        <hr className="t-dashed" />
        <div className="t-center t-sm t-bold">CÓDIGO QR DEL ESTUDIANTE</div>
        <div className="t-qr"><div><QRCode value={qrPayload} size={110} /></div><span className="t-sm">{est.pedido} · {est.nombre}</span></div>
        <Barcode seed={est.pedido + est.ci} />
        <div className="t-center t-sm" style={{ marginTop: 6 }}>¡Gracias por su compra!</div>
        <div className="t-center t-sm t-muted">Emitido {fmtFecha(todayISO())} · {hora}</div>
      </div>
      <div className="ticket-tear" />
    </div>
  );
}

/* ---------- Página ---------- */
export default function Facturas() {
  const { db, tasa, param, setParam, addMensaje, toast, success, dark } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [printEst, setPrintEst] = useState<Estudiante | null>(null);
  const [now, setNow] = useState(Date.now());
  const [enviados, setEnviados] = useState<Record<string, number>>({});
  const [capturando, setCapturando] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.estudiantes
      .filter((e) => (!t || [e.nombre, e.ci, e.pedido].some((v) => v.toLowerCase().includes(t))) && (!fEscuela || e.escuelaId === fEscuela))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.estudiantes, q, fEscuela]);

  const escuelaDe = (id: string) => db.escuelas.find((e) => e.id === id);
  const docenteDe = (id: string) => db.docentes.find((d) => d.id === id);
  const sel: Estudiante | null = db.estudiantes.find((e) => e.id === param?.est) || null;

  const imprimir = () => {
    if (!sel) return;
    setPrintEst(sel);
    setTimeout(() => window.print(), 90);
    setTimeout(() => setPrintEst(null), 1400);
  };

  /* ---------- Captura COMPLETA en JPG ---------- */
  const capturar = async (): Promise<Blob | null> => {
    const node = ticketRef.current;
    if (!node) { toast("Selecciona un estudiante primero", "warn"); return null; }
    node.classList.add("capturando");
    await new Promise((r) => setTimeout(r, 60));
    try {
      const w = node.offsetWidth, hgt = node.offsetHeight;
      const dataUrl = await toJpeg(node, {
        quality: 0.95, pixelRatio: 3, cacheBust: true, skipFonts: true,
        backgroundColor: dark ? "#141d31" : "#d5deea",
        width: w, height: hgt, canvasWidth: w * 3, canvasHeight: hgt * 3,
        style: { transform: "none", margin: "0" },
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      toast("No se pudo capturar el ticket", "err");
      return null;
    } finally {
      node.classList.remove("capturando");
    }
  };

  const descargarBlob = (blob: Blob, nombre: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const descargarImagen = async () => {
    setCapturando(true);
    const blob = await capturar();
    setCapturando(false);
    if (!blob || !sel) return;
    descargarBlob(blob, `ticket-${sel.pedido}-${todayISO()}.jpg`);
    toast("Captura descargada como JPG", "ok");
  };

  /* Enviar captura por WhatsApp */
  const enviarImagen = async (e?: Estudiante) => {
    const est = e || sel;
    if (!est) return;
    if (!est.telefono) { toast("Ese estudiante no tiene teléfono registrado — edítalo en Estudiantes", "err"); return; }
    setCapturando(true);
    const blob = await capturar();
    setCapturando(false);
    if (!blob) return;
    const nombre = `ticket-${est.pedido}-${todayISO()}.jpg`;
    const file = new File([blob], nombre, { type: "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: any) => Promise<void> };
    const t = estudianteTotales(est);
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share!({ files: [file], title: `Ticket ${est.pedido}`, text: `🧾 Ticket de pago — ${est.nombre}` }); }
      catch { return; }
    } else {
      descargarBlob(blob, nombre);
      window.open(waLink(est.telefono, `🧾 ¡Hola${est.representante ? " " + est.representante : ""}! Adjunto la captura del ticket de pago de ${est.nombre} (${est.pedido}).`), "_blank");
      toast("Captura descargada — adjúntala en el chat de WhatsApp que se abrió", "ok");
    }
    addMensaje({ id: uid(), fecha: todayISO(), destinatario: est.representante || est.nombre, telefono: est.telefono, plantilla: "Ticket de pago — captura (Facturación)", texto: `📷 Captura del ticket ${est.pedido} — ${est.nombre}. Total ${fmtUSD(t.total)} · Abonado ${fmtUSD(t.abonado)} · Saldo ${fmtUSD(t.saldo)} (imagen adjunta).` });
    setEnviados((v) => ({ ...v, [est.id]: Date.now() }));
    success("Captura enviada");
  };

  /* Envío por texto (respaldo) */
  const enviarTexto = (e?: Estudiante) => {
    const est = e || sel;
    if (!est) return;
    if (!est.telefono) { toast("Ese estudiante no tiene teléfono registrado", "err"); return; }
    window.open(waLink(est.telefono, textoTicket({ est, escuelaNombre: escuelaDe(est.escuelaId)?.nombre || "", docenteNombre: docenteDe(est.docenteId)?.nombre || "", tasaHoy: tasa.usd, empresa: db.config.empresa })), "_blank");
    setEnviados((v) => ({ ...v, [est.id]: Date.now() }));
    success("Ticket enviado por WhatsApp");
  };

  const enviarFila = async (e: Estudiante) => {
    if (!e.telefono) { toast("Ese estudiante no tiene teléfono registrado", "err"); return; }
    setParam({ est: e.id });
    await new Promise((r) => setTimeout(r, 480));
    await enviarImagen(e);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Facturación</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Ticket de pago estilo impresora térmica · descarga la captura <b>completa en JPG</b> o envíala directo por WhatsApp
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" style={{ background: "linear-gradient(150deg, #25d366, #128c4b)", boxShadow: "0 8px 20px -8px rgba(37,211,102,.55)" }}
            onClick={() => enviarImagen()} disabled={!sel || capturando}>
            {capturando ? <Loader2 size={15} className="spin" /> : <Smartphone size={15} />}
            {capturando ? "Capturando…" : "Enviar captura por WhatsApp"}
          </button>
          <button className="btn btn-ghost" onClick={descargarImagen} disabled={!sel || capturando}><Download size={15} /> Descargar JPG</button>
          <button className="btn btn-ghost" onClick={imprimir} disabled={!sel}><Printer size={15} /> Imprimir</button>
          <button className="btn btn-ghost" onClick={() => enviarTexto()} disabled={!sel} title="Enviar el ticket como texto formateado"><Smartphone size={15} /> Enviar texto</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <div className="card p-4 h-fit">
          <div className="flex items-center gap-2 h-[38px] px-3 rounded-full mb-3" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
            <Search size={15} style={{ color: "var(--ink-faint)" }} />
            <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar estudiante, pedido…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select mb-3" value={fEscuela} onChange={(e) => setFEscuela(e.target.value)}>
            <option value="">Todas las escuelas</option>
            {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
            {lista.map((e) => {
              const t = estudianteTotales(e);
              const activo = sel?.id === e.id;
              return (
                <button key={e.id} onClick={() => setParam({ est: e.id })}
                  className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all hover:translate-x-1"
                  style={{ background: activo ? "var(--blue-tint-2)" : "var(--surface-2)", outline: activo ? "1.5px solid var(--blue)" : "1.5px solid transparent", color: "var(--ink)" }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12px] flex-shrink-0" style={{ background: activo ? "var(--blue)" : "var(--border)", color: activo ? "#fff" : "var(--ink-soft)" }}>{e.nombre[0]}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-semibold text-[13px] truncate">{e.nombre}</span>
                    <span className="block text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.pedido} · {escuelaDe(e.escuelaId)?.nombre || "—"}</span>
                  </span>
                  <Badge tone={t.saldo > 0 ? "red" : "green"} dot>{t.saldo > 0 ? fmtUSD(t.saldo) : "Pagado"}</Badge>
                  {e.telefono && (
                    <span role="button" title={`Enviar captura del ticket de ${e.nombre} por WhatsApp`} onClick={(ev) => { ev.stopPropagation(); void enviarFila(e); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                      style={{ background: "var(--green-tint)", color: "#128c4b" }}>
                      <Smartphone size={13} />
                    </span>
                  )}
                </button>
              );
            })}
            {lista.length === 0 && <EmptyState icon={TicketIcon} title="Sin resultados" text="Ajusta la búsqueda para encontrar estudiantes." />}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {sel ? (
            <div className="reveal" key={sel.id}>
              <div className={`ticket-capture ${capturando ? "capturando" : ""}`} ref={ticketRef}>
                <Ticket est={sel} escuelaNombre={escuelaDe(sel.escuelaId)?.nombre || ""} docenteNombre={docenteDe(sel.docenteId)?.nombre || ""} tasaHoy={tasa.usd} now={now} />
              </div>
              <div className="flex items-center justify-center gap-2 text-[11.5px] mt-3" style={{ color: "var(--ink-faint)" }}>
                <School size={13} /> {escuelaDe(sel.escuelaId)?.nombre || "Escuela sin asignar"}
                <span>·</span>
                <Users size={13} /> {docenteDe(sel.docenteId)?.nombre || "Profesor sin asignar"}
              </div>
              <div className="flex items-center justify-center gap-2.5 mt-4 flex-wrap">
                <button className="btn btn-sm" style={{ background: "var(--green-tint)", color: "#128c4b", border: "1.5px solid #25d36655" }}
                  onClick={() => enviarImagen(sel)} disabled={!sel.telefono || capturando}>
                  {capturando ? <Loader2 size={14} className="spin" /> : <Smartphone size={14} />}
                  {sel.telefono ? `Enviar imagen al ${sel.representante ? "representante" : "estudiante"} · ${sel.telefono}` : "Sin teléfono registrado"}
                </button>
                {enviados[sel.id] && (
                  <span className="flex items-center gap-1.5 text-[11.5px] font-display font-semibold" style={{ color: "var(--green)" }}>
                    <CheckCircle2 size={14} />
                    Enviado a las {new Date(enviados[sel.id]).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="card w-full"><EmptyState icon={TicketIcon} title="Selecciona un estudiante" text="Elige un estudiante de la lista para generar su ticket de pago." /></div>
          )}
        </div>
      </div>

      <div className="print-sheet print-sheet--ticket">
        {printEst && <Ticket est={printEst} escuelaNombre={escuelaDe(printEst.escuelaId)?.nombre || ""} docenteNombre={docenteDe(printEst.docenteId)?.nombre || ""} tasaHoy={tasa.usd} now={now} />}
      </div>
    </div>
  );
}
