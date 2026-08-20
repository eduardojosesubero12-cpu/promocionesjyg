import React, { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { CheckCircle2, Printer, Search, Smartphone, Ticket as TicketIcon, School, Users } from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante, Pago } from "../lib/data";
import { PAQUETES, estudianteTotales, fmtBs, fmtUSD, fmtFecha, todayISO, uid, waLink } from "../lib/data";
import { EmptyState, Badge } from "../components/ui";

/* ---------- Código de barras decorativo (a partir del pedido) ---------- */
function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    for (const ch of (seed + seed).slice(0, 28)) {
      out.push(((ch.charCodeAt(0) % 3) + 1));
      out.push(1);
    }
    return out;
  }, [seed]);
  return (
    <div className="t-barcode" aria-hidden="true">
      {bars.map((w, i) => <i key={i} style={{ width: w }} />)}
    </div>
  );
}

/* ---------- Línea de un abono: divisa ⇄ bolívares ---------- */
function PagoRow({ p, tasaHoy }: { p: Pago; tasaHoy: number }) {
  const esBs = p.bs;
  const montoBs = esBs ? p.monto : p.usd * (p.tasa || tasaHoy);
  const montoUsd = esBs ? (p.tasa ? p.monto / p.tasa : p.usd) : p.monto;
  const tasa = p.tasa || tasaHoy;
  return (
    <div style={{ marginBottom: 7 }}>
      <div className="t-line">
        <span className="l">{p.fecha} · {p.metodo}</span>
        <span className="r t-bold">{fmtUSD(montoUsd)}</span>
      </div>
      {p.referencia && (
        <div className="t-sm t-muted">Ref: {p.referencia}</div>
      )}
      <div className="t-sm t-muted">
        {esBs ? <>Bs. {montoBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} → divisa</> : <>→ Bs. {montoBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })}</>}
        {" "}· tasa {tasa.toLocaleString("es-VE", { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

/* ---------- Texto del ticket para WhatsApp ---------- */
export function textoTicket(opts: {
  est: Estudiante; escuelaNombre: string; docenteNombre: string; tasaHoy: number; empresa: { nombre: string; rif: string; telefono: string; direccion: string };
}): string {
  const { est, escuelaNombre, docenteNombre, tasaHoy, empresa } = opts;
  const t = estudianteTotales(est);
  const pagado = t.saldo <= 0.009;
  const folio = `${est.pedido}-${todayISO().split("-").join("")}`;
  const num = (n: number) => n.toLocaleString("es-VE", { maximumFractionDigits: 2 });
  const sep = "━━━━━━━━━━━━━━━━";
  const L: string[] = [];

  L.push(`🧾 *${empresa.nombre.toUpperCase()}*`);
  if (empresa.rif) L.push(`RIF: ${empresa.rif}`);
  if (empresa.direccion) L.push(empresa.direccion);
  if (empresa.telefono) L.push(`📞 ${empresa.telefono}`);
  L.push(sep);
  L.push(`*TICKET DE PAGO* · Pedido ${est.pedido}`);
  L.push(`Folio: ${folio} · ${fmtFecha(todayISO())}`);
  L.push("");
  L.push(`👨‍🎓 *Estudiante:* ${est.nombre}`);
  if (est.ci) L.push(`C.I.: ${est.ci}`);
  L.push(`🏫 Escuela: ${escuelaNombre || "Por asignar"}`);
  L.push(`📚 Grado: ${est.grado} · Sección “${est.seccion}”`);
  L.push(`👩‍🏫 Profesor(a): ${docenteNombre || "Por asignar"}`);
  if (est.representante) L.push(`👤 Representante: ${est.representante}`);
  L.push("");
  L.push(`📦 *Paquete ${PAQUETES[est.paqueteId].nombre}* — ${fmtUSD(est.precioPaquete)}`);
  est.adicionales.forEach((a) => L.push(`   + ${a.cantidad}× ${a.producto}${a.talla ? ` (Talla ${a.talla})` : ""} — ${fmtUSD(a.cantidad * a.precio)}`));
  L.push("");
  L.push(`💵 *Abonos registrados (${est.pagos.length})*`);
  if (est.pagos.length === 0) L.push("   Sin abonos todavía.");
  est.pagos.forEach((p, i) => {
    const tasaP = p.tasa || tasaHoy;
    const montoUsd = p.bs ? (p.tasa ? p.monto / p.tasa : p.usd) : p.monto;
    const montoBs = p.bs ? p.monto : p.usd * tasaP;
    L.push(`${i + 1}. ${fmtFecha(p.fecha)} · ${p.metodo}`);
    L.push(`   ${fmtUSD(montoUsd)} ⇄ Bs. ${num(montoBs)} (tasa ${num(tasaP)})`);
    if (p.referencia) L.push(`   Ref: ${p.referencia}`);
  });
  L.push(sep);
  L.push(`Total del paquete: *${fmtUSD(t.total)}* = Bs. ${num(t.total * tasaHoy)}`);
  L.push(`Abonado: ${fmtUSD(t.abonado)} = Bs. ${num(t.abonado * tasaHoy)}`);
  L.push(pagado
    ? `✅ *SALDO: $0.00 — PAGADO COMPLETO*`
    : `⚠️ *SALDO PENDIENTE: ${fmtUSD(t.saldo)}* = Bs. ${num(t.saldo * tasaHoy)}`);
  L.push(`(Tasa del día: Bs. ${num(tasaHoy)} por $1)`);
  L.push("");
  L.push(`🔐 La tarjeta de grado incluye un código QR para verificar este pago.`);
  L.push("¡Gracias por su compra! 🎓");
  return L.join("\n");
}

/* ---------- Ticket térmico ---------- */
export function Ticket({ est, escuelaNombre, docenteNombre, tasaHoy, now }: {
  est: Estudiante; escuelaNombre: string; docenteNombre: string; tasaHoy: number; now: number;
}) {
  const t = estudianteTotales(est);
  const pagado = t.saldo <= 0.009;
  const emision = new Date(now);
  const hora = emision.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const empresa = useApp().db.config.empresa;
  const folio = `${est.pedido}-${todayISO().split("-").join("")}`;

  const qrPayload = [
    "JYG", est.pedido, est.nombre, est.ci || "S/C", escuelaNombre, `${est.grado} "${est.seccion}"`,
    `Paq.${PAQUETES[est.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`,
    `Saldo ${fmtUSD(t.saldo)}`, `Abonos ${t.partes}`,
  ].join("|");

  return (
    <div>
      <div className="ticket">
        {/* sello */}
        <span className={`t-stamp ${pagado ? "pagado" : "saldo"}`}>{pagado ? "PAGADO" : "SALDO"}</span>

        {/* encabezado empresa */}
        <div className="t-center">
          <div className="t-titulo">{empresa.nombre}</div>
          <div className="t-sm">RIF: {empresa.rif}</div>
          <div className="t-sm t-muted">{empresa.direccion}</div>
          <div className="t-sm t-muted">Tel: {empresa.telefono}</div>
        </div>

        <hr className="t-dashed" />

        <div className="t-center">
          <div className="t-section">TICKET DE PAGO</div>
          <div className="t-sm">N° {folio}</div>
          <div className="t-sm t-muted">{fmtFecha(todayISO())} · {hora}</div>
        </div>

        <hr className="t-dashed" />

        {/* estudiante */}
        <div className="t-section">ESTUDIANTE</div>
        <div className="t-line"><span className="l">Nombre:</span><span className="r t-bold">{est.nombre}</span></div>
        <div className="t-line"><span className="l">C.I.:</span><span className="r">{est.ci || "—"}</span></div>
        <div className="t-line"><span className="l">Pedido:</span><span className="r">{est.pedido}</span></div>
        <div className="t-line"><span className="l">Escuela:</span><span className="r">{escuelaNombre || "—"}</span></div>
        <div className="t-line"><span className="l">Profesor:</span><span className="r">{docenteNombre || "—"}</span></div>
        <div className="t-line"><span className="l">Grado:</span><span className="r">{est.grado} "{est.seccion}"</span></div>
        <div className="t-line"><span className="l">Registro:</span><span className="r">{fmtFecha(est.fechaRegistro)}</span></div>

        <hr className="t-dashed" />

        {/* detalle del pedido */}
        <div className="t-section">DETALLE DEL PEDIDO</div>
        <div className="t-line">
          <span className="l">Paquete {PAQUETES[est.paqueteId].nombre}</span>
          <span className="r t-bold">{fmtUSD(est.precioPaquete)}</span>
        </div>
        {est.adicionales.map((a, i) => (
          <div className="t-line t-sm" key={i}>
            <span className="l">+ {a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span>
            <span className="r">{fmtUSD(a.cantidad * a.precio)}</span>
          </div>
        ))}

        <hr className="t-dashed" />

        {/* abonos */}
        <div className="t-section">ABONOS RECIBIDOS ({t.partes})</div>
        {est.pagos.length === 0 && <div className="t-sm t-muted">Sin abonos registrados.</div>}
        {est.pagos.map((p) => <PagoRow key={p.id} p={p} tasaHoy={tasaHoy} />)}

        <hr className="t-dashed" />

        {/* totales */}
        <div className="t-line t-bold"><span className="l">TOTAL PAQUETE</span><span className="r">{fmtUSD(t.total)}</span></div>
        <div className="t-sm t-muted t-line"><span className="l"> </span><span className="r">≈ {fmtBs(t.total * tasaHoy)}</span></div>
        <div className="t-line t-bold"><span className="l">ABONADO</span><span className="r">{fmtUSD(t.abonado)}</span></div>
        <div className="t-line t-bold" style={{ fontSize: 12.5 }}>
          <span className="l">SALDO PENDIENTE</span>
          <span className="r" style={{ color: pagado ? "#0aaa67" : "#e5342b" }}>{fmtUSD(t.saldo)}</span>
        </div>
        <div className="t-sm t-muted t-line"><span className="l"> </span><span className="r">≈ {fmtBs(t.saldo * tasaHoy)}</span></div>

        <hr className="t-dashed" />

        {/* QR del estudiante */}
        <div className="t-qr">
          <div><QRCode value={qrPayload} size={86} level="M" /></div>
          <span className="t-sm t-muted">Escanea para ver el expediente</span>
        </div>

        <hr className="t-dashed" />

        <Barcode seed={est.pedido} />
        <div className="t-center t-sm">{est.pedido}</div>
        <div className="t-center t-bold" style={{ marginTop: 6 }}>¡GRACIAS POR SU COMPRA!</div>
        <div className="t-center t-sm t-muted">{empresa.nombre}</div>
        <div className="t-center t-sm t-muted">Tasa del día: {fmtBs(tasaHoy)} / $1</div>
      </div>
      <div className="ticket-tear" />
    </div>
  );
}

/* ---------- Página de Facturación ---------- */
export default function Facturas() {
  const { db, tasa, param, setParam, addMensaje, toast, success } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [printEst, setPrintEst] = useState<Estudiante | null>(null);
  const [now, setNow] = useState(Date.now());
  const [enviados, setEnviados] = useState<Record<string, number>>({});

  // reloj vivo para la hora de emisión
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

  /* Enviar el ticket por WhatsApp al representante del estudiante */
  const enviarWhatsApp = (e?: Estudiante) => {
    const est = e || sel;
    if (!est) return;
    if (!est.telefono) {
      toast("Ese estudiante no tiene teléfono registrado — edítalo en Estudiantes", "err");
      return;
    }
    const texto = textoTicket({
      est,
      escuelaNombre: escuelaDe(est.escuelaId)?.nombre || "",
      docenteNombre: docenteDe(est.docenteId)?.nombre || "",
      tasaHoy: tasa.usd,
      empresa: db.config.empresa,
    });
    window.open(waLink(est.telefono, texto), "_blank");
    addMensaje({
      id: uid(), fecha: todayISO(),
      destinatario: est.representante || est.nombre, telefono: est.telefono,
      plantilla: "Ticket de pago (Facturación)", texto,
    });
    setEnviados((v) => ({ ...v, [est.id]: Date.now() }));
    success("Ticket enviado por WhatsApp");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Facturación</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>
            Ticket de pago estilo impresora térmica · datos de la empresa, abonos divisa ⇄ bolívares y QR del estudiante · envío directo por WhatsApp
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={imprimir} disabled={!sel}>
            <Printer size={15} /> Imprimir ticket
          </button>
          <button className="btn btn-primary" style={{ background: "linear-gradient(150deg, #25d366, #128c4b)", boxShadow: "0 8px 20px -8px rgba(37,211,102,0.55)" }}
            onClick={() => enviarWhatsApp()} disabled={!sel}>
            <Smartphone size={15} /> Enviar por WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        {/* Selector de estudiante */}
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
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12px] flex-shrink-0" style={{ background: activo ? "var(--blue)" : "var(--border)", color: activo ? "#fff" : "var(--ink-soft)" }}>
                    {e.nombre[0]}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-semibold text-[13px] truncate">{e.nombre}</span>
                    <span className="block text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.pedido} · {escuelaDe(e.escuelaId)?.nombre || "—"}</span>
                  </span>
                  <Badge tone={t.saldo > 0 ? "red" : "green"} dot>{t.saldo > 0 ? fmtUSD(t.saldo) : "Pagado"}</Badge>
                  {e.telefono && (
                    <span role="button" title={`Enviar ticket de ${e.nombre} por WhatsApp`} onClick={(ev) => { ev.stopPropagation(); enviarWhatsApp(e); }}
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

        {/* Vista previa del ticket */}
        <div className="flex flex-col items-center gap-4">
          {sel ? (
            <div className="reveal" key={sel.id}>
              <Ticket
                est={sel}
                escuelaNombre={escuelaDe(sel.escuelaId)?.nombre || ""}
                docenteNombre={docenteDe(sel.docenteId)?.nombre || ""}
                tasaHoy={tasa.usd}
                now={now}
              />
              <div className="flex items-center justify-center gap-2 text-[11.5px] mt-3" style={{ color: "var(--ink-faint)" }}>
                <School size={13} /> {escuelaDe(sel.escuelaId)?.nombre || "Escuela sin asignar"}
                <span>·</span>
                <Users size={13} /> {docenteDe(sel.docenteId)?.nombre || "Profesor sin asignar"}
              </div>

              {/* Acción WhatsApp del estudiante seleccionado */}
              <div className="flex items-center justify-center gap-2.5 mt-4 flex-wrap">
                <button className="btn btn-sm" style={{ background: "var(--green-tint)", color: "#128c4b", border: "1.5px solid #25d36655" }}
                  onClick={() => enviarWhatsApp(sel)} disabled={!sel.telefono}>
                  <Smartphone size={14} />
                  {sel.telefono ? `Enviar al ${sel.representante ? "representante" : "estudiante"} · ${sel.telefono}` : "Sin teléfono registrado"}
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

      {/* Hoja de impresión */}
      <div className="print-sheet print-sheet--ticket">
        {printEst && (
          <Ticket
            est={printEst}
            escuelaNombre={escuelaDe(printEst.escuelaId)?.nombre || ""}
            docenteNombre={docenteDe(printEst.docenteId)?.nombre || ""}
            tasaHoy={tasa.usd}
            now={now}
          />
        )}
      </div>
    </div>
  );
}
