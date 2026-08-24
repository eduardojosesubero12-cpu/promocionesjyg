import React, { useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toJpeg } from "html-to-image";
import { Check, Download, Printer, Smartphone } from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante } from "../lib/data";
import { PAQUETES, estudianteTotales, fmtBs, fmtFecha, fmtUSD, todayISO, waLink } from "../lib/data";
import { EmptyState, useNow } from "../components/ui";

const qrPayload = (e: Estudiante, escuela: string) => {
  const t = estudianteTotales(e);
  return ["JYG", e.pedido, e.nombre, e.ci || "S/C", escuela, `${e.grado} "${e.seccion}"`,
    `Paq.${PAQUETES[e.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`, `Saldo ${fmtUSD(t.saldo)}`].join("|");
};

function PagoRow({ fecha, metodo, refp, usd, tasaDia }: { fecha: string; metodo: string; refp: string; usd: number; tasaDia: number }) {
  return (
    <div>
      <div className="t-line">
        <span className="l">{fmtFecha(fecha)} · {metodo}</span>
        <span className="r t-bold">{fmtUSD(usd)}</span>
      </div>
      <div className="t-line t-muted t-sm">
        <span className="l">Ref: {refp || "—"} · tasa {fmtBs(tasaDia)}</span>
        <span className="r">{fmtBs(usd * tasaDia)}</span>
      </div>
    </div>
  );
}

function Ticket({ est, escuelaNombre, tasaHoy }: { est: Estudiante; escuelaNombre: string; tasaHoy: number }) {
  const { db } = useApp();
  const t = estudianteTotales(est);
  const pagado = t.saldo <= 0.009;
  const now = useNow(1000);
  const barcode = useMemo(() => Array.from({ length: 28 }, (_, i) => (est.pedido.charCodeAt(i % est.pedido.length) + i * 7) % 3 + 1), [est.pedido]);

  return (
    <div>
      <div className="ticket">
        <div className={pagado ? "t-stamp pagado" : "t-stamp saldo"}>{pagado ? "PAGADO" : "SALDO"}</div>
        <div className="t-center">
          <div className="t-bold" style={{ fontSize: 14 }}>{db.config.empresa.nombre}</div>
          <div className="t-muted t-sm">RIF: {db.config.empresa.rif}</div>
          <div className="t-muted t-sm">{db.config.empresa.direccion}</div>
          <div className="t-muted t-sm">Tel: {db.config.empresa.telefono}</div>
        </div>
        <hr className="t-dashed" />
        <div className="t-center t-titulo">TICKET DE PAGO</div>
        <div className="t-center t-sm t-muted">Folio {est.pedido}-{todayISO().replace(/-/g, "")} · {fmtFecha(todayISO())}</div>
        <hr className="t-dashed" />

        <div className="t-line"><span className="l t-muted">Estudiante</span><span className="r t-bold">{est.nombre}</span></div>
        <div className="t-line"><span className="l t-muted">C.I.</span><span className="r">{est.ci || "S/C"}</span></div>
        <div className="t-line"><span className="l t-muted">Escuela</span><span className="r">{escuelaNombre || "—"}</span></div>
        <div className="t-line"><span className="l t-muted">Grado / Sección</span><span className="r">{est.grado} “{est.seccion}”</span></div>
        <div className="t-line"><span className="l t-muted">Representante</span><span className="r">{est.representante || "—"}</span></div>
        <hr className="t-dashed" />

        <div className="t-section">DETALLE DEL PEDIDO</div>
        <div className="t-line"><span className="l">Paquete {PAQUETES[est.paqueteId].nombre}</span><span className="r t-bold">{fmtUSD(est.precioPaquete)}</span></div>
        {est.adicionales.map((a, i) => (
          <div key={i} className="t-line"><span className="l">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span><span className="r">{fmtUSD(a.cantidad * a.precio)}</span></div>
        ))}
        <div className="t-line t-bold"><span className="l">TOTAL</span><span className="r">{fmtUSD(t.total)}</span></div>
        <div className="t-line t-muted t-sm"><span className="l">Equiv. en Bs (tasa {fmtBs(tasaHoy)})</span><span className="r">{fmtBs(t.total * tasaHoy)}</span></div>
        <hr className="t-dashed" />

        <div className="t-section">ABONOS ({est.pagos.length})</div>
        {est.pagos.length === 0 ? (
          <div className="t-muted t-sm">Sin abonos registrados</div>
        ) : (
          est.pagos.map((p) => <PagoRow key={p.id} fecha={p.fecha} metodo={p.metodo} refp={p.referencia} usd={p.usd} tasaDia={p.tasa} />)
        )}
        <div className="t-line t-bold"><span className="l">ABONADO</span><span className="r">{fmtUSD(t.abonado)}</span></div>
        <div className="t-line t-bold" style={{ color: pagado ? "var(--ok)" : "var(--danger)" }}>
          <span className="l">{pagado ? "PAGADO COMPLETO" : "SALDO PENDIENTE"}</span><span className="r">{fmtUSD(t.saldo)}</span>
        </div>
        <div className="t-line t-muted t-sm"><span className="l">Saldo en Bs</span><span className="r">{fmtBs(t.saldo * tasaHoy)}</span></div>
        <hr className="t-dashed" />

        <div className="t-qr">
          <div><QRCode value={qrPayload(est, escuelaNombre)} size={90} level="M" /></div>
          <span className="t-sm t-muted">Escanea para verificar</span>
        </div>
        <div className="t-barcode">{barcode.map((w, i) => <i key={i} style={{ width: w }} />)}</div>
        <div className="t-center t-sm t-muted">{est.pedido}</div>
        <hr className="t-dashed" />
        <div className="t-center t-sm">¡Gracias por su compra! 🎓</div>
        <div className="t-center t-sm t-muted">Tasa del día {fmtBs(tasaHoy)} · emitido {new Date(now).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div className="ticket-tear" />
    </div>
  );
}

export default function Facturas() {
  const { db, tasa, param, setParam, addMensaje, toast, success } = useApp();
  const [selId, setSelId] = useState<string | null>(param?.est || db.estudiantes[0]?.id || null);
  const [capturando, setCapturando] = useState(false);
  const [printEst, setPrintEst] = useState<Estudiante | null>(null);
  const [enviados, setEnviados] = useState<Record<string, number>>({});
  const ticketRef = useRef<HTMLDivElement>(null);

  const sel = db.estudiantes.find((e) => e.id === selId) || null;
  const escuelaDe = (id: string) => db.escuelas.find((e) => e.id === id);

  const capturar = async (): Promise<Blob | null> => {
    const node = ticketRef.current;
    if (!node) { toast("Selecciona un estudiante primero", "warn"); return null; }
    try {
      const rect = node.getBoundingClientRect();
      const dataUrl = await toJpeg(node, {
        quality: 0.95, pixelRatio: 3, cacheBust: true, skipFonts: true,
        backgroundColor: getComputedStyle(node).backgroundColor || "#e6e1d6",
        width: rect.width, height: rect.height,
        canvasWidth: Math.round(rect.width * 3), canvasHeight: Math.round(rect.height * 3),
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      toast("No se pudo capturar el ticket", "err");
      return null;
    }
  };
  const descargarBlob = (blob: Blob, nombre: string) => {
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };
  const descargarImagen = async () => {
    if (!sel) return;
    setCapturando(true);
    const blob = await capturar();
    setCapturando(false);
    if (!blob) return;
    descargarBlob(blob, `ticket-${sel.pedido}-${todayISO()}.jpg`);
    toast("Captura descargada como JPG", "ok");
  };
  const enviarImagen = async (e?: Estudiante) => {
    const est = e || sel;
    if (!est) return;
    if (!est.telefono) { toast("Ese estudiante no tiene teléfono registrado", "err"); return; }
    setCapturando(true);
    const blob = await capturar();
    setCapturando(false);
    if (!blob) return;
    const nombre = `ticket-${est.pedido}-${todayISO()}.jpg`;
    const file = new File([blob], nombre, { type: "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: any) => Promise<void> };
    const t = estudianteTotales(est);
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share!({ files: [file], title: `Ticket ${est.pedido}`, text: `🧾 Ticket de pago — ${est.nombre}` }); } catch { return; }
    } else {
      descargarBlob(blob, nombre);
      window.open(waLink(est.telefono, `🧾 ¡Hola${est.representante ? " " + est.representante : ""}! Adjunto la captura del ticket de pago de ${est.nombre} (${est.pedido}).`), "_blank");
      toast("Captura descargada — adjúntala en el chat de WhatsApp que se abrió", "ok");
    }
    addMensaje({ id: Math.random().toString(36).slice(2, 10), fecha: todayISO(), destinatario: est.representante || est.nombre, telefono: est.telefono, plantilla: "Ticket de pago — captura (Facturación)", texto: `📷 Captura del ticket ${est.pedido} — ${est.nombre}. Total ${fmtUSD(t.total)} · Abonado ${fmtUSD(t.abonado)} · Saldo ${fmtUSD(t.saldo)} (imagen adjunta).` });
    setEnviados((v) => ({ ...v, [est.id]: Date.now() }));
    success("Captura enviada");
  };

  const imprimir = () => {
    if (!sel) return;
    setPrintEst(sel);
    setTimeout(() => window.print(), 90);
    setTimeout(() => setPrintEst(null), 1400);
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
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={descargarImagen} disabled={!sel || capturando}><Download size={15} /> Descargar JPG</button>
          <button className="btn btn-primary" style={{ background: "linear-gradient(150deg,#25d366,#128c4b)", boxShadow: "0 8px 20px -8px rgba(37,211,102,0.55)" }} onClick={() => enviarImagen()} disabled={!sel || capturando}>
            <Smartphone size={15} /> {capturando ? "Capturando…" : "Enviar captura por WhatsApp"}
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card p-4">
            <div className="font-display fw-semibold mb-2" style={{ fontSize: 14 }}>Selecciona el estudiante</div>
            <select className="select mb-2" value={selId || ""} onChange={(e) => { setSelId(e.target.value); setParam({ est: e.target.value }); }}>
              {db.estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} — {e.pedido}</option>)}
            </select>
            <div className="d-flex flex-column gap-1" style={{ maxHeight: 420, overflowY: "auto" }}>
              {db.estudiantes.map((e) => {
                const t = estudianteTotales(e);
                const activo = e.id === selId;
                return (
                  <button key={e.id} onClick={() => { setSelId(e.id); setParam({ est: e.id }); }} className="d-flex align-items-center gap-2 p-2 rounded-3 border-0 text-start w-100" style={{ background: activo ? "var(--tint-navy-2)" : "var(--card-bg-2)", outline: activo ? "1.5px solid var(--jyg-navy)" : "1.5px solid transparent", color: "var(--ink)", cursor: "pointer" }}>
                    <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold flex-shrink-0" style={{ width: 36, height: 36, fontSize: 12, background: "var(--tint-navy)", color: "var(--jyg-navy)" }}>{e.nombre[0]}</span>
                    <span className="flex-grow-1" style={{ minWidth: 0 }}>
                      <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 13 }}>{e.nombre}</span>
                      <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.pedido} · {escuelaDe(e.escuelaId)?.nombre || "—"}</span>
                    </span>
                    <span className="font-display fw-bold tabular-nums" style={{ fontSize: 12.5, color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(t.saldo)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          {sel ? (
            <div className="card p-4">
              <div ref={ticketRef} className={`ticket-capture ${capturando ? "capturando" : ""}`}>
                <Ticket est={sel} escuelaNombre={escuelaDe(sel.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />
              </div>
              <div className="d-flex justify-content-center gap-2 mt-3 flex-wrap">
                <button className="btn btn-soft btn-sm" onClick={imprimir}><Printer size={14} /> Imprimir ticket</button>
                {sel.telefono && (
                  <button className="btn btn-sm" style={{ background: "var(--tint-ok)", color: "#128c4b", border: "1.5px solid rgba(37,211,102,0.4)" }} onClick={() => enviarImagen(sel)}>
                    <Smartphone size={14} /> Enviar al {sel.representante ? "representante" : "estudiante"} · {sel.telefono}
                  </button>
                )}
                {enviados[sel.id] && (
                  <span className="d-flex align-items-center gap-1 font-display fw-semibold" style={{ fontSize: 11.5, color: "var(--ok)" }}>
                    <Check size={14} /> Enviado a las {new Date(enviados[sel.id]).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="card"><EmptyState icon={Printer} title="Sin estudiantes" text="Registra estudiantes para generar sus tickets de pago." /></div>
          )}
        </div>
      </div>

      <div className="print-sheet print-sheet--ticket">
        {printEst && <Ticket est={printEst} escuelaNombre={escuelaDe(printEst.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />}
      </div>
    </div>
  );
}
