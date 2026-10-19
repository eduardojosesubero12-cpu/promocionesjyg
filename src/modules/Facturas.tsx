import React, { useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import { Check, Download, Printer, Smartphone, Globe } from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante } from "../lib/data";
import { PAQUETES, estudianteTotales, fmtBs, fmtFecha, fmtUSD, todayISO, waLink } from "../lib/data";
import { EmptyState, useNow } from "../components/ui";

const qrPayload = (e: Estudiante, escuela: string) => {
  const t = estudianteTotales(e);
  return ["JYG", e.nombre, e.ci || "S/C", escuela, `${e.grado} "${e.seccion}"`,
    `Paq.${PAQUETES[e.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`, `Saldo ${fmtUSD(t.saldo)}`].join("|");
};

/* ---------- Código de barras tipo Code-39 (autocontenido, sin dependencias) ---------- */
const C39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
  "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "nnnwwnwnn", "9": "wnnnnnwnw",
  A: "wnnwnnnnw", B: "nnwwnnnnw", C: "wnwwnnnnn", D: "nnnwwnnnw", E: "wnnwwnnnn", F: "nnwwwnnnn",
  G: "nnnwnnwnw", H: "nnnwwnwnn", I: "wnnnnnwnw", J: "wnnnnwnnw", K: "nnwnnnwnw", L: "wnwnnnnwn",
  M: "nnwwnnnwn", N: "nnnwnnnww", O: "wnnwnnnww", P: "nnwwnnnww", Q: "nnnwnwnnn", R: "wnnwnwnnn",
  S: "nnwwnwnnn", T: "nnnwnnnnw", U: "wnnnnwnnw", V: "nnwnnwnnw", W: "wnwnnnnnw", X: "nnwwnnnnw",
  Y: "nnnwnwnnw", Z: "nnnnwnwnw", "-": "nnnwnnnnw", ".": "wnnnnwnnw", " ": "nnwnnnnnn", "*": "nnnwnwnnn",
};
const barWidths = (txt: string): number[] => {
  const seq = `*${txt.toUpperCase().replace(/[^A-Z0-9\-. ]/g, "")}*`;
  const out: number[] = [];
  for (const ch of seq) {
    const pat = C39[ch] || C39[" "];
    for (const b of pat) out.push(b === "w" ? 3 : 1);
    out.push(1); // separador entre caracteres
  }
  return out;
};

function Barcode({ text, height = 34 }: { text: string; height?: number }) {
  const widths = useMemo(() => barWidths(text), [text]);
  return (
    <div className="t-barcode" aria-label={`Código de barras ${text}`}>
      {widths.map((w, i) => <i key={i} style={{ width: w, height }} />)}
    </div>
  );
}

/* ---------- QR vectorial (SVG inline, sin dependencias ni red) ---------- */
/* Generador mínimo QR: versión 3-M, modo byte, máscara 0. */
function makeQRMatrix(text: string): number[][] {
  const SIZE = 29, DATA_CW = 50, ECC_CW = 15; // V3-M: 50 datos + 15 EC, bloque único
  // Tablas log/exp en GF(256) con polinomio 0x11D
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const gmul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  // Polinomio generador Reed-Solomon de grado ECC_CW
  let gen = [1];
  for (let i = 0; i < ECC_CW; i++) {
    const q = [...gen, 0];
    for (let j = 0; j < gen.length; j++) q[j] ^= gmul(gen[j], EXP[i]);
    gen = q;
  }
  // Codewords de datos: cabecera modo byte + longitud (8 bits) + payload UTF-8 + relleno
  const utf8 = new TextEncoder().encode(text);
  const maxBytes = Math.min(utf8.length, 41); // capacidad V2-V3 modo byte
  const bytes: number[] = [(4 << 4) | (maxBytes >> 4), ((maxBytes & 15) << 4) | (utf8[0] ?? 0)];
  for (let i = 1; i < maxBytes; i++) bytes.push(utf8[i]);
  while (bytes.length < DATA_CW) bytes.push(bytes.length & 1 ? 0xec : 0x11);
  // ECC por división sintética
  const ec = new Array(ECC_CW).fill(0);
  for (const d of bytes) {
    const f = d ^ ec[0];
    ec.shift(); ec.push(0);
    for (let j = 0; j < ECC_CW; j++) ec[j] ^= gmul(gen[j + 1], f);
  }
  const bits: number[] = [];
  for (const cw of [...bytes, ...ec]) for (let k = 7; k >= 0; k--) bits.push((cw >> k) & 1);

  const m: number[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(-1)); // -1 libre, 2 reservado
  const fnMap: boolean[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false)); // módulos de función (no enmascarables)
  const set = (r: number, c: number, v: number) => { if (r >= 0 && c >= 0 && r < SIZE && c < SIZE) { m[r][c] = v ? 1 : 0; fnMap[r][c] = true; } };
  const reserve = (r: number, c: number) => { if (r >= 0 && c >= 0 && r < SIZE && c < SIZE && m[r][c] === -1) { m[r][c] = 2; fnMap[r][c] = true; } };
  // Patrones de posición + separadores
  for (const [fr, fc] of [[0, 0], [0, SIZE - 7], [SIZE - 7, 0]])
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      if (r < 0 || r > 6 || c < 0 || c > 6) { reserve(fr + r, fc + c); continue; }
      const on = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      set(fr + r, fc + c, on ? 1 : 0);
    }
  // Patrones de temporización
  for (let i = 8; i < SIZE - 8; i++) { set(6, i, i % 2 === 0 ? 1 : 0); set(i, 6, i % 2 === 0 ? 1 : 0); }
  // Patrones de alineación (V3: centros en 6 y 22; el de (6,6) se omite por solapar el patrón de posición)
  for (const [ar, ac] of [[6, 22], [22, 6], [22, 22]])
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
      if (ar + r < 0 || ac + c < 0 || ar + r >= SIZE || ac + c >= SIZE) continue;
      set(ar + r, ac + c, Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0);
    }
  // Módulo oscuro fijo
  set(SIZE - 8, 8, 1);
  // Zonas del patrón de formato reservadas
  for (let i = 0; i <= 8; i++) { reserve(8, i); reserve(i, 8); }
  for (let i = 0; i < 8; i++) { reserve(8, SIZE - 1 - i); reserve(SIZE - 1 - i, 8); }
  // Colocación de datos en zigzag estándar (columnas por pares de derecha a izquierda, saltando la 6)
  let bi = 0;
  let row = SIZE - 1, dir = -1;
  for (let v = SIZE - 1; v > 0; v -= 2) {
    if (v === 6) v = 5;
    for (;;) {
      for (const cc of [v, v - 1]) {
        if (cc < 0 || m[row][cc] !== -1) continue;
        m[row][cc] = bi < bits.length ? bits[bi++] : 0;
      }
      row += dir;
      if (row < 0 || row >= SIZE) { row = dir === -1 ? SIZE - 1 : 0; dir = -dir; break; }
    }
  }
  // Máscara 0: invertir cuando (fila+columna) es par, solo en módulos de datos
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!fnMap[r][c] && (r + c) % 2 === 0) m[r][c] ^= 1;
  // Bits de formato: nivel M (00) + máscara 0 (000), BCH(15,5) y XOR final
  const fmt = 0b10101000000100; // resultado precalculado de (0b00000<<10 | restoBCH) ^ máscara
  const putF = (r: number, c: number, bitIndex: number) => { m[r][c] = (fmt >> bitIndex) & 1; };
  for (let i = 0; i <= 5; i++) putF(8, i, i);
  putF(8, 7, 6); putF(8, 8, 7); putF(7, 8, 8);
  for (let i = 9; i < 15; i++) putF(14 - i, 8, i);
  for (let i = 0; i < 8; i++) putF(SIZE - 1 - i, 8, i);
  for (let i = 8; i < 15; i++) putF(8, SIZE - 11 + i, i);
  return m;
}

function QRBox({ value, size = 92 }: { value: string; size?: number }) {
  const path = useMemo(() => {
    try {
      const m = makeQRMatrix(value);
      const n = m.length;
      let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c] === 1) d += `M${c} ${r}h1v1h-1z`;
      return { d, n };
    } catch { return null; }
  }, [value]);
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${path.n + 2} ${path.n + 2}`} shapeRendering="crispEdges" role="img" aria-label="Código QR de verificación">
      <rect x={-1} y={-1} width={path.n + 2} height={path.n + 2} fill="#ffffff" />
      <path d={path.d} fill="#20201c" />
    </svg>
  );
}

function PagoRow({ fecha, metodo, refp, usd, tasaDia }: { fecha: string; metodo: string; refp: string; usd: number; tasaDia: number }) {
  return (
    <div className="t-pago">
      <div className="t-line">
        <span className="l">{fmtFecha(fecha)} · {metodo}</span>
        <span className="r t-bold">{fmtUSD(usd)}</span>
      </div>
      <div className="t-line t-muted t-sm">
        <span className="l">Ref: {refp || "—"}</span>
        <span className="r">{fmtBs(usd * tasaDia)} Bs @ {fmtBs(tasaDia)}</span>
      </div>
    </div>
  );
}

function Ticket({ est, escuelaNombre, tasaHoy }: { est: Estudiante; escuelaNombre: string; tasaHoy: number }) {
  const { db } = useApp();
  const t = estudianteTotales(est);
  const pagado = t.saldo <= 0.009;
  const now = useNow(30000);
  const folio = `${est.pedido}-${todayISO().replace(/-/g, "")}`;
  const emisor = db.config?.empresa?.nombre || "JYG";

  return (
    <div className="ticket-wrap">
      {/* guía de corte superior */}
      <div className="ticket-cut ticket-cut--top" aria-hidden="true">
        <span className="scissors">✂</span><span className="cut-label">CORTE</span>
      </div>

      <div className="ticket">
        <div className={pagado ? "t-stamp pagado" : "t-stamp saldo"}>{pagado ? "PAGADO" : "SALDO"}</div>

        {/* margen perforado tipo papel térmico */}
        <div className="t-perf t-perf--left" aria-hidden="true" />
        <div className="t-perf t-perf--right" aria-hidden="true" />

        <div className="t-content">
          <div className="t-center">
            <div className="t-empresa">{emisor}</div>
            <div className="t-muted t-xs">RIF: {db.config.empresa.rif}</div>
            <div className="t-muted t-xs">{db.config.empresa.direccion}</div>
            <div className="t-muted t-xs">Tel: {db.config.empresa.telefono}</div>
          </div>
          <div className="t-double" aria-hidden="true" />
          <div className="t-center t-titulo">TICKET DE PAGO</div>
          <div className="t-center t-xs t-muted">Folio {folio} · {fmtFecha(todayISO())}</div>
          <hr className="t-dashed" />

          <div className="t-line"><span className="l t-muted">Estudiante</span><span className="r t-bold">{est.nombre}</span></div>
          <div className="t-line"><span className="l t-muted">C.I.</span><span className="r">{est.ci || "S/C"}</span></div>
          <div className="t-line"><span className="l t-muted">Escuela</span><span className="r">{escuelaNombre || "—"}</span></div>
          <div className="t-line"><span className="l t-muted">Grado/Sección</span><span className="r">{est.grado} "{est.seccion}"</span></div>
          <div className="t-line"><span className="l t-muted">Representante</span><span className="r">{est.representante || "—"}</span></div>
          <hr className="t-dashed" />

          <div className="t-section">· DETALLE DEL PEDIDO ·</div>
          <div className="t-line"><span className="l">Paq. {PAQUETES[est.paqueteId].nombre}</span><span className="r t-bold">{fmtUSD(est.precioPaquete)}</span></div>
          {est.adicionales.map((a, i) => (
            <div key={i} className="t-line"><span className="l">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span><span className="r">{fmtUSD(a.cantidad * a.precio)}</span></div>
          ))}
          <div className="t-totalbox">
            <div className="t-line t-bold"><span className="l">TOTAL</span><span className="r">{fmtUSD(t.total)}</span></div>
            <div className="t-line t-muted t-xs"><span className="l">Equiv. en Bs</span><span className="r">{fmtBs(t.total * tasaHoy)}</span></div>
          </div>
          <hr className="t-dashed" />

          <div className="t-section">· ABONOS ({est.pagos.length}) ·</div>
          {est.pagos.length === 0 ? (
            <div className="t-muted t-xs t-center mb-1">— Sin abonos registrados —</div>
          ) : (
            est.pagos.map((p) => <PagoRow key={p.id} fecha={p.fecha} metodo={p.metodo} refp={p.referencia} usd={p.usd} tasaDia={p.tasa} />)
          )}
          <div className="t-line t-bold"><span className="l">ABONADO</span><span className="r">{fmtUSD(t.abonado)}</span></div>
          <div className={"t-line t-bold " + (pagado ? "t-ok" : "t-danger")}>
            <span className="l">{pagado ? "= PAGADO COMPLETO =" : "> SALDO PENDIENTE <"}</span><span className="r">{fmtUSD(t.saldo)}</span>
          </div>
          {!pagado && (
            <div className="t-line t-muted t-xs"><span className="l">Saldo en Bs</span><span className="r">{fmtBs(t.saldo * tasaHoy)}</span></div>
          )}
          <hr className="t-dashed" />

          <div className="t-qr">
            <QRBox value={qrPayload(est, escuelaNombre)} />
            <span className="t-xs t-muted">Escanea para verificar este ticket</span>
          </div>
          <Barcode text={folio} />
          <div className="t-center t-xs t-muted t-code">{folio}</div>
          <hr className="t-dashed" />

          <div className="t-center t-sm">¡Gracias por su compra! 🎓</div>
          <div className="t-center t-xs t-muted">Tasa del día {fmtBs(tasaHoy)} Bs/$</div>
          <div className="t-center t-xs t-muted">Emitido {new Date(now).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          <div className="t-center t-ascii" aria-hidden="true">* * *   G R A C I A S   * * *</div>
        </div>

        {/* borde inferior aserrado */}
        <div className="t-serrated" aria-hidden="true" />
      </div>

      {/* sombra de papel + guía de corte inferior */}
      <div className="ticket-cut" aria-hidden="true">
        <span className="scissors">✂</span><span className="cut-label">CORTE</span>
      </div>
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

  const descargarPortalHTML = () => {
    if (!sel) return;
    const html = generarPortalHTML(sel, escuelaDe(sel.escuelaId)?.nombre || "", tasa.usd);
    const blob = new Blob([html], { type: "text/html" });
    descargarBlob(blob, `portal-${sel.pedido}-${todayISO()}.html`);
    toast("Portal HTML descargado", "ok");
  };

  const generarPortalHTML = (est: Estudiante, escuelaNombre: string, tasaHoy: number): string => {
    const t = estudianteTotales(est);
    const pagado = t.saldo <= 0.009;
    const folio = `${est.pedido}-${todayISO().replace(/-/g, "")}`;
    const bars = barWidths(folio).map((w, i) => `<i style="width:${w}px"></i>`).join("");
    let svg = "";
    try {
      const m = makeQRMatrix(qrPayload(est, escuelaNombre));
      const n = m.length;
      let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c] === 1) d += `M${c} ${r}h1v1h-1z`;
      svg = `<svg width="120" height="120" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path d="${d}" fill="#20201c"/></svg>`;
    } catch { svg = ""; }
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const emp = db.config?.empresa || { nombre: "JYG", rif: "", direccion: "", telefono: "" };
    const row = (l: string, v: string, cls = "") => `<div class="ln ${cls}"><span>${esc(l)}</span><b>${esc(v)}</b></div>`;
    const hr = '<div class="dash"></div>';
    const pagosHtml = est.pagos.length === 0
      ? '<div class="mut center sm">— Sin abonos registrados —</div>'
      : est.pagos.map(p => row(`${fmtFecha(p.fecha)} · ${p.metodo}`, fmtUSD(p.usd), "bold") + row(`Ref: ${p.referencia || "—"}`, `${fmtBs(p.usd * p.tasa)} Bs @ ${fmtBs(p.tasa)}`, "mut sm")).join("");
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket ${folio}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#efe9de;display:flex;justify-content:center;padding:24px 12px;font-family:"Courier New",ui-monospace,Menlo,monospace}
.tw{width:100%;max-width:384px}
.cut{display:flex;align-items:center;gap:8px;color:#8a8578;font-size:10px;letter-spacing:2px;padding:4px 2px}
.cut::before,.cut::after{content:"";flex:1;border-top:1.5px dashed #b9b4a6}
.paper{position:relative;background:#fdfdf9;color:#20201c;font-size:12px;line-height:1.55;padding:20px 18px 8px;
 box-shadow:0 24px 44px -14px rgba(30,25,10,.35),0 2px 4px rgba(0,0,0,.08);
 background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.028) 0 2px,transparent 2px 9px),repeating-linear-gradient(0deg,rgba(0,0,0,.015) 0 1px,transparent 1px 4px)}
.paper::after{content:"";display:block;height:10px;margin:0 -18px;
 background:linear-gradient(-45deg,transparent 5px,#fdfdf9 5px),linear-gradient(45deg,transparent 5px,#fdfdf9 5px);
 background-size:10px 10px;background-repeat:repeat-x;transform:translateY(9px)}
.center{text-align:center}.sm{font-size:10.5px}.xs{font-size:9.5px}.mut{color:#7a7870}.bold{font-weight:700}
.emp{font-weight:800;font-size:15px;letter-spacing:1px;text-transform:uppercase}
.dbl{border-top:3px double #20201c;margin:10px 0}
.dash{border-top:1.5px dashed #c7c4bc;margin:10px 0}
.titulo{font-size:14px;letter-spacing:4px;font-weight:800}
.ln{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.ln b{text-align:right;white-space:nowrap}
.sec{letter-spacing:2px;font-weight:700;font-size:10.5px;color:#5a5850;text-align:center;margin:6px 0 8px}
.totalbox{border:2px solid #20201c;padding:7px 8px;margin-top:8px}
.ok{color:#0a7a45}.danger{color:#c0241c}
.stamp{position:absolute;top:44%;right:4px;transform:rotate(-14deg);font-family:Arial,sans-serif;font-weight:900;font-size:24px;letter-spacing:4px;padding:5px 14px;border:4px double currentColor;border-radius:10px;opacity:.85}
.stamp.pagado{color:#0a7a45}.stamp.saldo{color:#c0241c}
.qr{display:flex;flex-direction:column;align-items:center;gap:6px;margin:14px 0 10px}
.barcode{display:flex;justify-content:center;align-items:stretch;height:34px;gap:0;margin:10px 0 2px}
.barcode i{background:#20201c;height:100%}
.ascii{letter-spacing:3px;font-weight:700;margin:8px 0 12px}
@media print{body{background:#fff;padding:0}.paper{box-shadow:none}.tw{max-width:80mm}}
</style></head><body>
<div class="tw">
 <div class="cut">✂ CORTE</div>
 <div class="paper">
  <div class="stamp ${pagado ? "pagado" : "saldo"}">${pagado ? "PAGADO" : "SALDO"}</div>
  <div class="center"><div class="emp">${esc(emp.nombre)}</div>
   <div class="mut xs">RIF: ${esc(emp.rif)}</div><div class="mut xs">${esc(emp.direccion)}</div><div class="mut xs">Tel: ${esc(emp.telefono)}</div></div>
  <div class="dbl"></div>
  <div class="center titulo">TICKET DE PAGO</div>
  <div class="center mut xs">Folio ${folio} · ${fmtFecha(todayISO())}</div>
  ${hr}
  ${row("Estudiante", est.nombre, "bold")}
  ${row("C.I.", est.ci || "S/C")}
  ${row("Escuela", escuelaNombre || "—")}
  ${row("Grado/Sección", `${est.grado} "${est.seccion}"`)}
  ${row("Representante", est.representante || "—")}
  ${hr}
  <div class="sec">· DETALLE DEL PEDIDO ·</div>
  ${row(`Paq. ${PAQUETES[est.paqueteId].nombre}`, fmtUSD(est.precioPaquete), "bold")}
  ${est.adicionales.map(a => row(`${a.cantidad}× ${a.producto}${a.talla ? ` (${a.talla})` : ""}`, fmtUSD(a.cantidad * a.precio))).join("")}
  <div class="totalbox">${row("TOTAL", fmtUSD(t.total), "bold")}${row("Equiv. en Bs", fmtBs(t.total * tasaHoy), "mut xs")}</div>
  ${hr}
  <div class="sec">· ABONOS (${est.pagos.length}) ·</div>
  ${pagosHtml}
  ${row("ABONADO", fmtUSD(t.abonado), "bold")}
  ${row(pagado ? "= PAGADO COMPLETO =" : "> SALDO PENDIENTE <", fmtUSD(t.saldo), `bold ${pagado ? "ok" : "danger"}`)}
  ${!pagado ? row("Saldo en Bs", fmtBs(t.saldo * tasaHoy), "mut xs") : ""}
  ${hr}
  <div class="qr">${svg}<span class="mut xs">Escanea para verificar este ticket</span></div>
  <div class="barcode">${bars}</div>
  <div class="center mut xs">${folio}</div>
  ${hr}
  <div class="center sm">¡Gracias por su compra! 🎓</div>
  <div class="center mut xs">Tasa del día ${fmtBs(tasaHoy)} Bs/$</div>
  <div class="center mut xs">Emitido ${new Date().toLocaleString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  <div class="center ascii">* * * G R A C I A S * * *</div>
 </div>
 <div class="cut">✂ CORTE</div>
</div>
</body></html>`;
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
            Ticket de pago estilo impresora térmica · descarga la captura <b>completa en JPG</b>, envíala por WhatsApp o descarga el <b>Portal HTML</b>
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={descargarImagen} disabled={!sel || capturando}><Download size={15} /> Descargar JPG</button>
          <button className="btn btn-ghost" onClick={descargarPortalHTML} disabled={!sel}><Globe size={15} /> Descargar Portal HTML</button>
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
                <button className="btn btn-soft btn-sm" onClick={descargarPortalHTML}><Globe size={14} /> Descargar Portal HTML</button>
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
