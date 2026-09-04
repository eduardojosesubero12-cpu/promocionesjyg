import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture, Box, CalendarDays, Camera, CameraOff, Check, Copy, CreditCard, Download, Eye, EyeOff,
  Factory, GraduationCap, ImageDown, Loader2, Pencil, Printer, QrCode, RotateCw, ScanLine, Search,
  ShieldCheck, Sparkles, Trash2, Upload, UserPlus, Users, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Estudiante, Evento, OcrDraft, Sesion } from "../lib/data";
import {
  ESTADOS_PEDIDO, OPENROUTER_MODELOS, ORDEN_MATERIALES, PAQUETES, buildPortalData, codigosCompletos,
  computeProduccion, downloadFile, estudianteTotales, extractWithQwen, fmtBs, fmtFecha,
  fmtUSD, generarPortalHtml, ocrNombreCompleto, parseOcrLocal, portalUrl, slugEstudiante, todayISO, uid,
} from "../lib/data";
import { Badge, Bar, EmptyState, Field, FilterSelect, FormFoot, FormSec, Modal, QR, SearchInput, SectionHead, Toolbar, estadoPagoTone, estadoPedidoTone, useNow } from "../components/ui";

/* ============================================================
   SESIONES FOTOGRÁFICAS
   ============================================================ */
const sesionVacia = (): Sesion => ({ id: "", escuelaId: "", fecha: todayISO(), hora: "09:00", fotografo: "", estado: "Agendada", fotos: 0, nota: "" });

export function Sesiones() {
  const { db, saveSesion, deleteSesion, confirm, success, toast } = useApp();
  const [form, setForm] = useState<Sesion | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.escuelaId) er.escuelaId = "Selecciona la escuela";
    if (!form.fotografo.trim()) er.fotografo = "Indica el fotógrafo";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveSesion({ ...form, id: form.id || uid() });
    success();
    setForm(null);
  };
  const eliminar = async (s: Sesion) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: "Se eliminará la sesión fotográfica.", confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteSesion(s.id);
    toast("Registro eliminado", "warn");
  };
  const lista = [...db.sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Sesiones Fotográficas</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Tomas de toga, birrete, carnet y firma de libro por plantel</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(sesionVacia()); }}>Agregar sesión</button>
      </div>

      <div className="row g-3">
        {lista.map((s, i) => {
          const es = db.escuelas.find((x) => x.id === s.escuelaId);
          const n = db.estudiantes.filter((e) => e.escuelaId === s.escuelaId).length;
          return (
            <div key={s.id} className="col-12 col-md-6 col-xl-4">
              <div className="card p-3 p-md-4 h-100 reveal card-lift" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <div className="d-flex align-items-start gap-3">
                  <div className="d-flex flex-column align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 58, height: 58, background: s.estado === "Realizada" ? "var(--tint-ok)" : "linear-gradient(150deg,var(--jyg-navy),#0b2e52)", color: s.estado === "Realizada" ? "var(--ok)" : "#ffd970" }}>
                    <span className="font-display fw-bold" style={{ fontSize: 18, lineHeight: 1 }}>{s.fecha.slice(8, 10)}</span>
                    <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, opacity: .8 }}>{new Date(s.fecha + "T12:00").toLocaleDateString("es-VE", { month: "short" })}</span>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h3 className="font-display fw-bold text-truncate m-0" style={{ fontSize: 14.5 }}>{es?.nombre || "Escuela"}</h3>
                      <Badge tone={s.estado === "Realizada" ? "green" : "blue"} dot>{s.estado}</Badge>
                    </div>
                    <p className="m-0 mt-1" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {s.hora} h · <Camera size={11} className="me-1" style={{ verticalAlign: -1 }} />{s.fotografo} · {n} estudiantes
                    </p>
                    {s.nota && <p className="m-0 mt-1" style={{ fontSize: 11.5, fontStyle: "italic", color: "var(--ink-faint)" }}>{s.nota}</p>}
                    {s.estado === "Realizada" && <div className="mt-2"><Badge tone="gold">{s.fotos} fotos capturadas</Badge></div>}
                  </div>
                  <div className="d-flex flex-column gap-1">
                    <button className="icon-btn" title="Editar" style={{ width: 30, height: 30 }} onClick={() => { setErrs({}); setForm(s); }}><Pencil size={13} /></button>
                    <button className="icon-btn danger" title="Eliminar" style={{ width: 30, height: 30 }} onClick={() => eliminar(s)}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lista.length === 0 && <div className="card mt-3"><EmptyState icon={Camera} title="Sin sesiones" text="Agenda la primera toma fotográfica." /></div>}

      {form && (
        <Modal open onClose={() => setForm(null)} size="lg" title={form.id ? "Editar sesión" : "Nueva sesión fotográfica"}>
          <div className="f-grid">
            <FormSec icon={<Camera size={15} />}>Datos de la toma</FormSec>
            <Field label="Escuela" required error={errs.escuelaId} span="c-12">
              <select className={`select ${errs.escuelaId ? "err" : ""}`} value={form.escuelaId} onChange={(e) => setForm({ ...form, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Fecha" span="c-4"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora" span="c-4"><input type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Fotógrafo(a)" required error={errs.fotografo} span="c-4">
              <input className={`input ${errs.fotografo ? "err" : ""}`} value={form.fotografo} onChange={(e) => setForm({ ...form, fotografo: e.target.value })} />
            </Field>
            <Field label="Estado" span="c-4">
              <select className="select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Sesion["estado"] })}>
                <option>Agendada</option><option>Realizada</option>
              </select>
            </Field>
            {form.estado === "Realizada" && (
              <Field label="Fotos capturadas" span="c-4">
                <input type="number" min={0} className="input" value={form.fotos} onChange={(e) => setForm({ ...form, fotos: Number(e.target.value) || 0 })} />
              </Field>
            )}
            <Field label="Nota" span="c-12"><textarea className="textarea" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>
          </div>
          <FormFoot onCancel={() => setForm(null)} onSave={guardar} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   AGENDA / CALENDARIO
   ============================================================ */
const TIPO_EVENTO: Record<string, { label: string; color: string }> = {
  sesion: { label: "Sesión", color: "var(--jyg-navy-500)" },
  entrega: { label: "Entrega", color: "var(--ok)" },
  cobranza: { label: "Cobranza", color: "var(--warn)" },
  otro: { label: "Otro", color: "var(--jyg-gold-deep)" },
};

export function Agenda() {
  const { db, saveEvento, deleteEvento, confirm, success, toast } = useApp();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<Evento | null>(null);
  const hoyISO = todayISO();

  const dias = useMemo(() => {
    const inicio = new Date(mes);
    const dow = (mes.getDay() + 6) % 7;
    inicio.setDate(mes.getDate() - dow);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
  }, [mes]);
  const eventosDe = (iso: string) => db.eventos.filter((e) => e.fecha === iso);
  const proximos = [...db.eventos].filter((e) => e.fecha >= hoyISO).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 6);

  const guardar = async () => {
    if (!form || !form.titulo.trim()) { toast("Escribe un título para el evento", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveEvento({ ...form, id: form.id || uid() });
    success();
    setForm(null);
  };
  const eliminar = async (e: Evento) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `"${e.titulo}" se quitará de la agenda.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteEvento(e.id);
    toast("Evento eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Agenda / Calendario</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Sesiones, entregas y rutas de cobranza del mes</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({ id: "", fecha: hoyISO, hora: "10:00", titulo: "", tipo: "otro" })}>Nuevo evento</button>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <div className="card p-3 p-md-4">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <h3 className="font-display fw-bold m-0 text-capitalize" style={{ fontSize: 17 }}>{mes.toLocaleDateString("es-VE", { month: "long", year: "numeric" })}</h3>
              <div className="d-flex gap-1 align-items-center">
                <button className="icon-btn" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><i className="bi bi-chevron-left" /></button>
                <button className="btn btn-soft btn-sm" onClick={() => { const d = new Date(); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hoy</button>
                <button className="icon-btn" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><i className="bi bi-chevron-right" /></button>
              </div>
            </div>
            <div className="row g-1 mb-1">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="col text-center font-display fw-semibold" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: "var(--ink-faint)", padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div className="row g-1">
              {dias.map((d) => {
                const iso = d.toISOString().slice(0, 10);
                const evs = eventosDe(iso);
                const esHoy = iso === hoyISO;
                const delMes = d.getMonth() === mes.getMonth();
                return (
                  <div key={iso} className="col" style={{ width: "calc(100%/7)", flex: "0 0 calc(100%/7)" }}>
                    <button onClick={() => setForm({ id: "", fecha: iso, hora: "10:00", titulo: "", tipo: "otro" })}
                      className="w-100 border-0 rounded-3 text-start"
                      style={{ minHeight: 72, padding: "6px 7px", background: esHoy ? "var(--tint-navy-2)" : "var(--card-bg-2)", opacity: delMes ? 1 : .4, outline: esHoy ? "1.5px solid var(--jyg-navy-500)" : "1.5px solid transparent", cursor: "pointer", transition: "transform .18s, box-shadow .18s" }}>
                      <span className="font-display fw-bold d-block" style={{ fontSize: 12, color: esHoy ? "var(--jyg-navy)" : "var(--ink-soft)" }}>{d.getDate()}</span>
                      <span className="d-flex flex-column gap-1 mt-1">
                        {evs.slice(0, 2).map((e) => (
                          <span key={e.id} className="text-truncate d-block rounded-2 px-1" style={{ fontSize: 9, fontWeight: 700, background: `color-mix(in srgb, ${TIPO_EVENTO[e.tipo].color} 16%, transparent)`, color: TIPO_EVENTO[e.tipo].color }}>
                            {e.titulo}
                          </span>
                        ))}
                        {evs.length > 2 && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-faint)" }}>+{evs.length - 2} más</span>}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="card p-3 p-md-4">
            <SectionHead title="Próximos eventos" />
            {proximos.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)", padding: "10px 0" }}>Nada agendado. Haz clic en un día para crear.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {proximos.map((e) => (
                  <div key={e.id} className="d-flex align-items-center gap-2 rounded-3 p-2" style={{ background: "var(--card-bg-2)" }}>
                    <span className="rounded-pill flex-shrink-0" style={{ width: 9, height: 30, background: TIPO_EVENTO[e.tipo].color }} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="font-display fw-semibold text-truncate" style={{ fontSize: 12.5 }}>{e.titulo}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{fmtFecha(e.fecha)} · {e.hora} h · {TIPO_EVENTO[e.tipo].label}</div>
                    </div>
                    <button className="icon-btn danger" style={{ width: 28, height: 28 }} onClick={() => eliminar(e)}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title="Nuevo evento en agenda">
          <div className="f-grid">
            <Field label="Título" required span="c-12">
              <input className="input" autoFocus value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Entrega de paquetes — Valencia" />
            </Field>
            <Field label="Fecha" span="c-4"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora" span="c-4"><input type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Tipo" span="c-4">
              <select className="select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Evento["tipo"] })}>
                {Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Escuela (opcional)" span="c-12">
              <select className="select" value={form.escuelaId || ""} onChange={(e) => setForm({ ...form, escuelaId: e.target.value || undefined })}>
                <option value="">— Ninguna —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          <FormFoot onCancel={() => setForm(null)} onSave={guardar} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   PRODUCCIÓN
   ============================================================ */
export function Produccion() {
  const { db, setRoute } = useApp();
  const [fEstado, setFEstado] = useState("");

  const base = useMemo(() => db.estudiantes.filter((e) => (!fEstado || e.estadoPedido === fEstado) && e.estadoPedido !== "Entregado"), [db.estudiantes, fEstado]);
  const prod = useMemo(() => computeProduccion(base), [base]);
  const sinFotos = useMemo(() => db.estudiantes.filter((e) => !codigosCompletos(e) && e.estadoPedido !== "Entregado"), [db.estudiantes]);

  const materiales = useMemo(() => {
    const rows = ORDEN_MATERIALES.map((m) => ({ nombre: m, cantidad: prod.materiales[m] || 0 }));
    for (const [m, q] of Object.entries(prod.materiales)) if (!ORDEN_MATERIALES.includes(m)) rows.push({ nombre: m, cantidad: q });
    return rows;
  }, [prod]);
  const maxMat = Math.max(1, ...materiales.map((m) => m.cantidad));

  const exportar = () => {
    downloadFile("produccion-jyg.csv", ["Material", "Cantidad"].join(";") + "\n" + materiales.filter((m) => m.cantidad > 0).map((m) => `${m.nombre};${m.cantidad}`).join("\n"));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Producción</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>El sistema calcula automáticamente los materiales necesarios · {base.length} pedidos en cola</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select className="select" style={{ width: 180 }} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="">Pedidos pendientes</option>
            {ESTADOS_PEDIDO.filter((s) => s !== "Entregado").map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={exportar}><Download size={15} /> Exportar</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {Object.values(PAQUETES).map((p, i) => (
          <div key={p.id} className="col-12 col-md-4">
            <div className="card p-3 reveal" style={{ animationDelay: `${i * 60}ms`, borderLeft: `4px solid ${p.color}` }}>
              <div className="d-flex align-items-center justify-content-between">
                <span className="font-display fw-semibold" style={{ fontSize: 13.5, color: p.color }}>Paquete {p.nombre}</span>
                <span className="font-display fw-bold" style={{ fontSize: 24 }}>{prod.combos[p.id] || 0}</span>
              </div>
              <p className="m-0 mt-1" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>en cola de producción</p>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100">
            <SectionHead title="Total de solicitud" desc="Materiales generados automáticamente por paquete + adicionales" />
            <div className="d-flex flex-column gap-2">
              {materiales.map((m) => (
                <div key={m.nombre} className="d-flex align-items-center gap-3">
                  <span className="text-truncate fw-semibold" style={{ fontSize: 13, width: 165, color: "var(--ink-soft)" }}>{m.nombre}</span>
                  <div className="flex-grow-1"><Bar pct={(m.cantidad / maxMat) * 100} color={m.cantidad > 0 ? "var(--jyg-navy)" : "var(--line)"} /></div>
                  <span className="font-display fw-bold" style={{ fontSize: 15, width: 38, textAlign: "right" }}>{m.cantidad}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-3 d-flex align-items-center gap-2" style={{ background: "var(--tint-navy-2)", color: "var(--jyg-navy)", fontSize: 12.5 }}>
              <Box size={16} /> Ejemplo: 100 paquetes Lujo → 100 afiches 30x40, 100 estolas, 200 fotos 6x8, 100 llaveros.
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6 d-flex flex-column gap-3">
          <div className="card p-3 p-md-4">
            <SectionHead title="Adicionales solicitados" desc="Con desglose de tallas para el taller" />
            {Object.keys(prod.adicionales).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)", padding: "8px 0" }}>Sin adicionales en la cola actual.</p>
            ) : (
              <div className="table-responsive">
                <table className="tbl">
                  <thead><tr><th>Producto</th><th>Cantidad</th><th>Tallas</th></tr></thead>
                  <tbody>
                    {Object.entries(prod.adicionales).map(([nombre, info]) => (
                      <tr key={nombre}>
                        <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{nombre}</td>
                        <td className="font-display fw-bold">{info.cantidad}</td>
                        <td>{Object.keys(info.tallas).length ? <div className="d-flex flex-wrap gap-1">{Object.entries(info.tallas).map(([t, n]) => <Badge key={t} tone="blue">{t}: {n}</Badge>)}</div> : <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-3 p-md-4">
            <SectionHead title="Pedidos sin fotografías" desc="Códigos de fotografía incompletos" />
            {sinFotos.length === 0 ? (
              <p className="d-flex align-items-center gap-2 m-0 py-2" style={{ color: "var(--ok)", fontSize: 13 }}><Check size={16} /> Todos los pedidos tienen sus códigos completos</p>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 250, overflowY: "auto" }}>
                {sinFotos.map((e) => {
                  const faltan = Object.values(e.codigos).filter((c) => !c).length;
                  return (
                    <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="d-flex align-items-center gap-2 p-2 rounded-3 border-0 text-start" style={{ background: "var(--card-bg-2)", cursor: "pointer", color: "var(--ink)" }}>
                      <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold flex-shrink-0" style={{ width: 34, height: 34, background: "var(--tint-warn)", color: "var(--warn)", fontSize: 12 }}>{(e.nombre || "?")[0]}</span>
                      <span className="flex-grow-1" style={{ minWidth: 0 }}>
                        <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 13 }}>{e.nombre} · {e.pedido}</span>
                        <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{db.escuelas.find((x) => x.id === e.escuelaId)?.nombre}</span>
                      </span>
                      <Badge tone="amber" dot>{faltan} códigos</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-3 p-md-4 mt-3">
        <SectionHead title="Cola de producción" desc="Clic en una fila para abrir el expediente" />
        <div className="table-responsive">
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Estudiante</th><th>Paquete</th><th>Adicionales</th><th>Estado</th><th>Saldo</th></tr></thead>
            <tbody>
              {[...base].sort((a, b) => a.fechaRegistro.localeCompare(b.fechaRegistro)).map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setRoute("estudiantes", { open: e.id })}>
                    <td className="font-display fw-bold" style={{ fontSize: 12.5 }}>{e.pedido}</td>
                    <td>
                      <div className="font-display fw-semibold" style={{ fontSize: 13.5 }}>{e.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.grado} “{e.seccion}”</div>
                    </td>
                    <td><Badge tone={e.paqueteId === "lujo" ? "gold" : e.paqueteId === "premium" ? "green" : "slate"}>{PAQUETES[e.paqueteId].nombre}</Badge></td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{e.adicionales.map((a) => `${a.cantidad}× ${a.producto}`).join(", ") || "—"}</td>
                    <td><Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge></td>
                    <td className="font-display fw-bold tabular-nums" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)", fontSize: 13 }}>{fmtUSD(t.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {base.length === 0 && <EmptyState icon={Factory} title="Cola vacía" text="No hay pedidos pendientes de producción." />}
      </div>
    </div>
  );
}

/* ============================================================
   TARJETAS QR (70 × 50 mm) + CREDENCIAL
   ============================================================ */
const qrPayload = (e: Estudiante, escuelaNombre: string) => {
  const t = estudianteTotales(e);
  return ["JYG", e.pedido, e.nombre, e.ci || "S/C", escuelaNombre, `${e.grado} "${e.seccion}"`, `Paq.${PAQUETES[e.paqueteId].nombre}`, `Total ${fmtUSD(t.total)}`, `Abonado ${fmtUSD(t.abonado)}`, `Saldo ${fmtUSD(t.saldo)}`, `Abonos ${t.partes}`].join("|");
};

export function TarjetaQR({ est, escuelaNombre, tasaHoy }: { est: Estudiante; escuelaNombre: string; tasaHoy: number }) {
  const [flip, setFlip] = useState(false);
  const t = estudianteTotales(est);
  const anio = new Date().getFullYear();
  const pagado = t.saldo <= 0.009;
  return (
    <div className="tarj-zoom">
      <div className="tarj-flip" onClick={() => setFlip((v) => !v)} title="Clic para voltear" role="button">
        <div className={`tarj-inner ${flip ? "volteada" : ""}`}>
          <div className="tarj">
            <div className="in">
              <div className="tarj-head">
                <span className="tarj-logo"><GraduationCap size={13} /></span>
                <span className="tarj-marca">Promociones <b>JyG</b><br />Pase de Grado</span>
              </div>
              <div className="tarj-main">
                <div className="tarj-info">
                  <div className="tarj-nombre">{est.nombre}</div>
                  <div className="tarj-linea">{est.ci || "S/C"} · {est.grado} “{est.seccion}”</div>
                  <div className="tarj-linea opaca">{escuelaNombre || "Escuela por asignar"}</div>
                  <div className="tarj-chips">
                    <span className="tarj-chipemv" />
                    <span className="tarj-badge">{PAQUETES[est.paqueteId].nombre}</span>
                  </div>
                </div>
                <div className="tarj-qrbox">
                  <QR value={qrPayload(est, escuelaNombre)} size={92} />
                  <span>{est.pedido}</span>
                </div>
              </div>
              <div className="tarj-foot">
                <span>Tarjeta de Grado</span>
                <span>{est.grado === "Bachiller" || est.grado === "Técnicos" ? "Promoción " : "Clase "}{anio}</span>
              </div>
            </div>
          </div>
          <div className="tarj tarj-back">
            <div className="tarj-banda" />
            <div className="in">
              <div className="tarj-cap">
                <span>Resumen de pago</span>
                <small>Tasa {fmtBs(tasaHoy)}/$ · {fmtFecha(todayISO())}</small>
              </div>
              <div className="tarj-rows">
                <div className="tarj-row"><span className="l">Paquete + adicionales</span><span className="v">{fmtUSD(t.total)}<small>{fmtBs(t.total * tasaHoy)}</small></span></div>
                <div className="tarj-row"><span className="l">Abonado ({t.partes} {t.partes === 1 ? "pago" : "pagos"})</span><span className="v">{fmtUSD(t.abonado)}<small>a tasa de cada pago</small></span></div>
                <div className={`tarj-row saldo ${pagado ? "pagado" : ""}`}><span className="l">{pagado ? "Estado: PAGADO" : "Saldo pendiente"}</span><span className="v">{pagado ? "$0.00" : fmtUSD(t.saldo)}<small>{pagado ? "Cuenta liquidada" : fmtBs(t.saldo * tasaHoy)}</small></span></div>
              </div>
              <div className="tarj-rep">Rep.: {est.representante || "—"} · {est.telefono || "sin teléfono"}</div>
              <div className="tarj-firma"><i>{est.nombre}</i><span>FIRMA AUTORIZADA</span></div>
            </div>
            <div className="tarj-back-foot"><span>Válida para entrega del paquete</span><span>JyG · {anio}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EtiquetasQRPage() {
  const { db, tasa, toast, logTarjeta } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [grupo, setGrupo] = useState<"escuela" | "grado" | "ninguno">("escuela");
  const [printIds, setPrintIds] = useState<string[] | null>(null);

  const escuelaDe = (id: string) => db.escuelas.find((e) => e.id === id);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.estudiantes.filter((e) => (!t || [e.nombre, e.ci, e.pedido, e.representante].some((v) => v.toLowerCase().includes(t))) && (!fEscuela || e.escuelaId === fEscuela)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.estudiantes, q, fEscuela]);

  const grupos = useMemo(() => {
    const map = new Map<string, Estudiante[]>();
    for (const e of lista) {
      const key = grupo === "escuela" ? (escuelaDe(e.escuelaId)?.nombre || "Sin escuela") : grupo === "grado" ? `${e.grado} · Sección “${e.seccion}”` : "Todas las tarjetas";
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
    const lote = `LOTE-${todayISO()}`;
    db.estudiantes.filter((e) => ids.includes(e.id)).forEach((e) =>
      logTarjeta({ estudianteId: e.id, estudiante: e.nombre, accion: ids.length > 1 ? "Impresión por lote" : "Impresión individual", lote })
    );
    setTimeout(() => window.print(), 90);
    setTimeout(() => setPrintIds(null), 1400);
  };
  const exportar = () => {
    const rows = lista.map((e) => { const t = estudianteTotales(e); return [e.pedido, e.nombre, e.ci, escuelaDe(e.escuelaId)?.nombre || "", `${e.grado} ${e.seccion}`, PAQUETES[e.paqueteId].nombre, t.total.toFixed(2), t.abonado.toFixed(2), t.saldo.toFixed(2), t.estadoPago]; });
    downloadFile(`tarjetas-qr-jyg-${todayISO()}.csv`, "Pedido;Estudiante;C.I.;Escuela;Grado;Paquete;Total USD;Abonado USD;Saldo USD;Estado pago\n" + rows.map((r) => r.join(";")).join("\n"));
    toast("Listado de tarjetas exportado", "ok");
  };

  const kpis = [
    { icon: CreditCard, l: "Tarjetas generadas", v: String(lista.length), c: "var(--jyg-navy)", bg: "var(--tint-navy-2)" },
    { icon: Users, l: "Saldo por cobrar", v: fmtUSD(saldoTotal), c: saldoTotal > 0 ? "var(--danger)" : "var(--ok)", bg: saldoTotal > 0 ? "var(--tint-danger)" : "var(--tint-ok)" },
    { icon: Check, l: "Pagadas completas", v: String(pagados), c: "var(--ok)", bg: "var(--tint-ok)" },
    { icon: QrCode, l: "Tasa del día", v: fmtBs(tasa.usd), c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Tarjetas QR</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Tarjeta de grado tamaño crédito <b>7 × 5 cm</b> · frente con QR e identidad · reverso con pagos, tasa y saldos</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={exportar}><Download size={15} /> Exportar CSV</button>
          <button className="btn btn-primary" onClick={() => imprimir(lista.map((e) => e.id))}><Printer size={15} /> Imprimir todas ({lista.length})</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {kpis.map((k, i) => (
          <div key={k.l} className="col-6 col-md-3">
            <div className="kpi reveal" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="ic" style={{ background: k.bg, color: k.c }}><k.icon size={19} /></span>
              <span>
                <span className="v d-block" style={{ color: k.c }}>{k.v}</span>
                <span className="k d-block">{k.l}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-3 mb-3 d-flex align-items-center gap-2 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar estudiante, pedido, cédula…" wide />
        <FilterSelect value={fEscuela} onChange={setFEscuela} allLabel="Todas las escuelas" width={210} options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} />
        <div className="d-flex rounded-pill p-1 gap-1 ms-auto" style={{ background: "var(--card-bg-2)" }}>
          {([["escuela", "Por escuela"], ["grado", "Por grado"], ["ninguno", "Sin grupo"]] as const).map(([g, lbl]) => (
            <button key={g} onClick={() => setGrupo(g)} className="border-0 font-display fw-semibold rounded-pill" style={{ fontSize: 12, padding: "7px 14px", background: grupo === g ? "var(--card-bg)" : "transparent", color: grupo === g ? "var(--jyg-navy)" : "var(--ink-soft)", boxShadow: grupo === g ? "var(--shadow-1)" : "none", cursor: "pointer" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="card"><EmptyState icon={CreditCard} title="Sin tarjetas" text="Registra estudiantes para generar sus tarjetas QR de grado." /></div>
      ) : (
        grupos.map(([nombre, estudiantes]) => {
          const saldoGrupo = estudiantes.reduce((s, e) => s + estudianteTotales(e).saldo, 0);
          return (
            <section key={nombre} className="mb-4">
              <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
                <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 38, height: 38, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}><GraduationCap size={17} /></span>
                <div className="flex-grow-1" style={{ minWidth: 180 }}>
                  <h3 className="font-display fw-bold m-0" style={{ fontSize: 16.5 }}>{nombre}</h3>
                  <p style={{ fontSize: 12, margin: 0, color: "var(--ink-faint)" }}>
                    {estudiantes.length} {estudiantes.length === 1 ? "tarjeta" : "tarjetas"} · por cobrar <b style={{ color: saldoGrupo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(saldoGrupo)}</b>
                  </p>
                </div>
                {grupo !== "ninguno" && <button className="btn btn-soft btn-sm" onClick={() => imprimir(estudiantes.map((e) => e.id))}><Printer size={14} /> Imprimir este lote</button>}
              </div>
              <div className="d-flex flex-wrap" style={{ gap: 28 }}>
                {estudiantes.map((e, i) => {
                  const t = estudianteTotales(e);
                  return (
                    <div key={e.id} className="reveal" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
                      <TarjetaQR est={e} escuelaNombre={escuelaDe(e.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />
                      <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap mt-2 mb-1" style={{ width: "105mm" }}>
                        <Badge tone={estadoPedidoTone(e.estadoPedido)} dot>{e.estadoPedido}</Badge>
                        <Badge tone={estadoPagoTone(t.estadoPago)}>{t.estadoPago}</Badge>
                      </div>
                      <div className="d-flex justify-content-center">
                        <button className="btn btn-ghost btn-xs" onClick={() => imprimir([e.id])}><Printer size={12} /> Imprimir</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <div className="print-sheet">
        {(printIds ? lista.filter((e) => printIds.includes(e.id)) : []).map((e) => (
          <TarjetaQR key={e.id} est={e} escuelaNombre={escuelaDe(e.escuelaId)?.nombre || ""} tasaHoy={tasa.usd} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ESCÁNER INTELIGENTE (Qwen vía OpenRouter + respaldo local)
   ============================================================ */
export function OcrModal() {
  const { ocrOpen, setOcrOpen, setOcrDraft, setRoute, toast, db } = useApp();
  const orKey = (db.config.openRouterKey || "").trim();
  const orModel = db.config.openRouterModel || OPENROUTER_MODELOS[0].id;
  const usaQwen = orKey.length > 0;
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [brillo, setBrillo] = useState(100);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const apagarCam = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCamOn(false); };
  useEffect(() => {
    if (!ocrOpen) { apagarCam(); setImg(null); setDraft(null); setZoom(1); setRot(0); setBrillo(100); }
    return () => apagarCam();
  }, [ocrOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const leerArchivo = (f: File) => { const r = new FileReader(); r.onload = () => { setImg(r.result as string); setDraft(null); setMostrarTodo(false); }; r.readAsDataURL(f); };
  const encenderCam = async () => {
    setCamErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } } });
      streamRef.current = s; setCamOn(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => undefined); } }, 60);
    } catch { setCamErr("No se pudo acceder a la cámara. Verifica los permisos del navegador o usa la opción de subir archivo."); }
  };
  const capturarFoto = () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setImg(c.toDataURL("image/jpeg", 0.92)); apagarCam(); setDraft(null);
  };
  const procesar = async () => {
    if (!img) return;
    setBusy(true); setProgreso(usaQwen ? 30 : 0);
    try {
      if (usaQwen) {
        const d = await extractWithQwen(img, orKey, orModel);
        setDraft(d);
        if (!d.nombres && !d.ci) toast("Qwen no detectó campos — intenta con mejor luz o enfoque", "warn");
        else toast(`Documento reconocido con ${OPENROUTER_MODELOS.find((m) => m.id === orModel)?.nombre || "Qwen"}`, "ok");
      } else {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("spa", 1, { logger: (m: any) => { if (m.status === "recognizing text") setProgreso(Math.round((m.progress || 0) * 100)); } });
        const { data } = await worker.recognize(img);
        await worker.terminate();
        const d = parseOcrLocal(data.text || "");
        setDraft({ ...d, raw: data.text || "" });
        if (!d.nombres && !d.ci) toast("No se detectaron campos — intenta con mejor luz o enfoque", "warn");
        else toast("Documento reconocido con OCR local", "ok");
      }
    } catch (e: any) { toast(e?.message || "El motor OCR no pudo procesar la imagen", "err"); }
    finally { setBusy(false); }
  };
  const usarEnFormulario = () => {
    if (draft) setOcrDraft(draft);
    setOcrOpen(false);
    setRoute("estudiantes", { openNew: true });
    toast("Completa los datos del estudiante en el formulario", "ok");
  };

  const CampoOcr = ({ icon, label, placeholder, value, onChange, ok }: { icon: React.ReactNode; label: string; placeholder: string; value: string; onChange: (v: string) => void; ok: boolean }) => (
    <div>
      <label className="form-label d-flex align-items-center gap-1">{label} {ok && <Check size={12} style={{ color: "var(--ok)" }} />}</label>
      <div className={`ocr-field ${ok ? "okk" : ""}`}>
        <span className="oi">{icon}</span>
        <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Modal open={ocrOpen} onClose={() => setOcrOpen(false)} size="xl" title={
      <span className="d-flex align-items-center gap-2 flex-wrap">
        <ScanLine size={20} style={{ color: "var(--jyg-navy)" }} /> Escáner Inteligente
        <span className="badge" style={{ background: usaQwen ? "var(--tint-ok)" : "var(--tint-warn)", color: usaQwen ? "var(--ok)" : "var(--warn)" }}>
          {usaQwen ? `Qwen · ${OPENROUTER_MODELOS.find((m) => m.id === orModel)?.nombre || "OpenRouter"}` : "OCR local (sin API key)"}
        </span>
      </span>
    }>
      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="rounded-4 position-relative overflow-hidden" style={{ background: "#0d1524", minHeight: 470, border: "1px solid var(--line)" }}>
            {!img && !camOn && (
              <div className="position-absolute top-0 bottom-0 start-0 end-0 d-flex flex-column align-items-center justify-content-center p-4 text-center ocr-view">
                <div className="ocr-frame mb-3">
                  <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
                  <div className="ocr-id">
                    <span className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 34, height: 34, background: "rgba(255,217,112,0.14)", color: "#ffd970" }}><ScanLine size={17} /></span>
                    <span className="text-start">
                      <span className="d-block font-display fw-bold" style={{ fontSize: 10.5, color: "#e6ecf7", letterSpacing: .5 }}>REPÚBLICA BOLIVARIANA DE VENEZUELA</span>
                      <span className="d-block tabular-nums" style={{ fontSize: 13, color: "#ffd970", fontWeight: 700 }}>V-00.000.000</span>
                    </span>
                  </div>
                  <span className="ocr-scanline" />
                </div>
                <p className="font-display fw-semibold mb-1" style={{ fontSize: 14, color: "#e6ecf7" }}>Cédula de identidad o partida de nacimiento</p>
                <p style={{ fontSize: 11.5, margin: "0 0 14px", color: "#8fa1bd", maxWidth: 270 }}>Coloca el documento con buena luz y enfoque — la IA lee los datos por ti.</p>
                <div className="d-flex flex-column gap-2 w-100" style={{ maxWidth: 250 }}>
                  <button className="ocr-action gold" onClick={encenderCam}>
                    <span className="oa-ic"><Aperture size={19} /></span>
                    <span className="text-start">
                      <span className="d-block font-display fw-bold" style={{ fontSize: 13 }}>Tomar foto</span>
                      <span className="d-block" style={{ fontSize: 10.5, opacity: .85 }}>Con la cámara del dispositivo</span>
                    </span>
                  </button>
                  <button className="ocr-action" onClick={() => fileRef.current?.click()}>
                    <span className="oa-ic"><Upload size={19} /></span>
                    <span className="text-start">
                      <span className="d-block font-display fw-bold" style={{ fontSize: 13 }}>Subir imagen</span>
                      <span className="d-block" style={{ fontSize: 10.5, opacity: .85 }}>Desde galería o archivos</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
            {camOn && (
              <div className="position-relative">
                <video ref={videoRef} playsInline muted className="w-100 d-block" style={{ maxHeight: 300, objectFit: "cover" }} />
                <div className="position-absolute rounded-3" style={{ inset: "21% 8%", border: "2px dashed rgba(255,217,112,0.8)", boxShadow: "0 0 0 9999px rgba(6,10,20,0.45)", pointerEvents: "none" }} />
                <div className="position-absolute bottom-0 start-0 end-0 d-flex justify-content-center gap-2 pb-3">
                  <button className="btn btn-gold btn-sm" onClick={capturarFoto}><Camera size={14} /> Capturar</button>
                  <button className="btn btn-sm border-0" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }} onClick={apagarCam}><CameraOff size={14} /> Cancelar</button>
                </div>
              </div>
            )}
            {img && !camOn && (
              <div className="position-relative overflow-hidden" style={{ maxHeight: 320 }}>
                <img src={img} alt="Documento" className="w-100 d-block" style={{ maxHeight: 300, objectFit: "contain", transform: `scale(${zoom}) rotate(${rot}deg)`, filter: `brightness(${brillo}%) contrast(${100 + (brillo - 100) * 0.4}%)`, transition: "transform .2s" }} />
                {busy && <div className="scanline" />}
              </div>
            )}
          </div>
          {camErr && <p className="mt-2 mb-0" style={{ fontSize: 12, color: "var(--danger)" }}>{camErr}</p>}

          {img && (
            <div className="d-flex align-items-center gap-1 mt-2 flex-wrap">
              <button className="icon-btn" title="Acercar" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}><ZoomIn size={15} /></button>
              <button className="icon-btn" title="Alejar" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}><ZoomOut size={15} /></button>
              <button className="icon-btn" title="Rotar" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={15} /></button>
              <input type="range" min={60} max={160} value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} title="Brillo" className="flex-grow-1" style={{ minWidth: 80 }} />
              <button className="btn btn-ghost btn-xs" onClick={() => { setZoom(1); setRot(0); setBrillo(100); }}>Restablecer</button>
              <button className="btn btn-ghost btn-xs" onClick={() => fileRef.current?.click()}>Cambiar imagen</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value = ""; }} />

          <button className="btn btn-primary w-100 mt-3" onClick={procesar} disabled={!img || busy}>
            {busy ? <><Loader2 size={16} className="spin" /> Reconociendo… {progreso}%</> : <><Sparkles size={16} /> {usaQwen ? "Reconocer con Qwen (IA)" : "Reconocer con OCR local"}</>}
          </button>
          {busy && <div className="progress mt-2"><div className="bar bar-anim" style={{ width: `${progreso}%`, background: "var(--jyg-gold)" }} /></div>}
          {!usaQwen && (
            <button className="btn btn-gold btn-sm w-100 mt-2" onClick={() => { setOcrOpen(false); setRoute("config"); }}>
              Configurar API key de Qwen (recomendado)
            </button>
          )}
          <p className="d-flex align-items-center gap-1 mt-2 mb-0" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            <ShieldCheck size={13} style={{ color: usaQwen ? "var(--ok)" : "var(--warn)" }} />
            {usaQwen ? "Qwen vía OpenRouter · la API key está guardada en tu base de datos Supabase" : "Sin API key configurada · usando OCR local de respaldo"}
          </p>
        </div>

        <div className="col-12 col-md-6">
          {!draft ? (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4 rounded-4" style={{ background: "var(--card-bg-2)", minHeight: 250 }}>
              <span className="d-flex align-items-center justify-content-center rounded-4" style={{ width: 52, height: 52, background: usaQwen ? "var(--tint-ok)" : "var(--tint-warn)", color: usaQwen ? "var(--ok)" : "var(--warn)" }}><Sparkles size={24} /></span>
              <p className="font-display fw-semibold mt-3 mb-1" style={{ fontSize: 13.5 }}>{usaQwen ? "Motor Qwen activo" : "Motor de respaldo (OCR local)"}</p>
              <p style={{ fontSize: 12, margin: 0, maxWidth: 260, color: "var(--ink-faint)" }}>
                {usaQwen ? "Qwen vía OpenRouter lee cédulas y partidas con alta precisión. Tu API key está guardada de forma segura en Supabase." : "Configura tu API key de OpenRouter en Configuración para activar Qwen y obtener mejor precisión."}
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="p-3 rounded-3 d-flex align-items-center gap-2" style={{ background: "var(--tint-ok)", color: "var(--ok)", fontSize: 12.5 }}>
                <Check size={15} /> Datos extraídos por separado — verifica y corrige antes de registrar
              </div>
              <CampoOcr icon={<CreditCard size={15} style={{ color: "var(--jyg-navy)" }} />} label="N° Cédula / Identificador" placeholder="V-00.000.000" value={draft.ci} onChange={(v) => setDraft({ ...draft, ci: v })} ok={!!draft.ci} />
              <CampoOcr icon={<UserPlus size={15} style={{ color: "var(--jyg-gold-deep)" }} />} label="Nombres" placeholder="Nombres del titular" value={draft.nombres} onChange={(v) => setDraft({ ...draft, nombres: v })} ok={!!draft.nombres} />
              <CampoOcr icon={<Users size={15} style={{ color: "var(--jyg-gold-deep)" }} />} label="Apellidos" placeholder="Apellidos del titular" value={draft.apellidos} onChange={(v) => setDraft({ ...draft, apellidos: v })} ok={!!draft.apellidos} />
              <CampoOcr icon={<CalendarDays size={15} style={{ color: "var(--ok)" }} />} label="Fecha de nacimiento" placeholder="AAAA-MM-DD" value={draft.fecha} onChange={(v) => setDraft({ ...draft, fecha: v })} ok={!!draft.fecha} />
              {draft.raw && (
                <div>
                  <button className="btn btn-ghost btn-xs" onClick={() => setMostrarTodo((v) => !v)}><Eye size={12} /> {mostrarTodo ? "Ocultar texto completo" : "Ver texto extraído"}</button>
                  {mostrarTodo && <pre className="mt-2 p-3 rounded-3 overflow-auto" style={{ background: "var(--card-bg-2)", maxHeight: 130, whiteSpace: "pre-wrap", fontSize: 11, color: "var(--ink-soft)" }}>{draft.raw}</pre>}
                </div>
              )}
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-primary btn-sm" onClick={usarEnFormulario}><UserPlus size={14} /> Usar en formulario</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(draft.raw || "").then(() => toast("Texto copiado", "ok")).catch(() => undefined); }}><Copy size={14} /> Copiar texto</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function OcrPage() {
  const { setOcrOpen, db, setRoute } = useApp();
  const [q, setQ] = useState("");
  const usaQwen = (db.config.openRouterKey || "").trim().length > 0;
  const recientes = db.estudiantes.filter((e) => (e.observaciones || "").toLowerCase().includes("ocr")).filter((e) => !q || e.nombre.toLowerCase().includes(q.toLowerCase()));
  const tarjetas = [
    { icon: ScanLine, t: "C.I. venezolana", d: "Extrae N° de cédula, nombres, apellidos y fecha de nacimiento por separado, listos para el registro.", c: "var(--jyg-navy)", bg: "var(--tint-navy-2)" },
    { icon: Sparkles, t: "Partida de nacimiento", d: "Lee nombres, fechas y datos del acta, ignorando el membrete oficial automáticamente.", c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)" },
    { icon: ShieldCheck, t: "Motor " + (usaQwen ? "Qwen activo" : "OCR local"), d: usaQwen ? `Qwen vía OpenRouter · modelo ${OPENROUTER_MODELOS.find((m) => m.id === (db.config.openRouterModel || ""))?.nombre || "Qwen3-VL 30B"}` : "Configura tu API key de OpenRouter en Configuración para activar Qwen.", c: usaQwen ? "var(--ok)" : "var(--warn)", bg: usaQwen ? "var(--tint-ok)" : "var(--tint-warn)" },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1 className="d-flex align-items-center gap-2">Escáner Inteligente</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Extrae datos de cédulas con <b>Qwen vía OpenRouter</b> · la API key se guarda en tu base de datos Supabase</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOcrOpen(true)}><ScanLine size={16} /> Abrir escáner</button>
      </div>

      <div className="row g-3 mb-3">
        {tarjetas.map((x, i) => (
          <div key={x.t} className="col-12 col-md-4">
            <div className="card p-3 p-md-4 h-100 reveal card-lift" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="d-flex align-items-center justify-content-center rounded-3 mb-3" style={{ width: 44, height: 44, background: x.bg, color: x.c }}><x.icon size={20} /></div>
              <h3 className="font-display fw-bold m-0" style={{ fontSize: 14.5 }}>{x.t}</h3>
              <p style={{ fontSize: 12.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>{x.d}</p>
              {i === 2 && <button className="btn btn-ghost btn-xs mt-3 w-100" onClick={() => setRoute("config")}>Ver configuración del motor</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-3 p-md-4">
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <h3 className="font-display fw-bold flex-grow-1 m-0" style={{ fontSize: 16 }}>Registros creados por OCR</h3>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar…" />
        </div>
        {recientes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", textAlign: "center", padding: "16px 0" }}>Aún no hay estudiantes creados desde el escáner. Pulsa el botón dorado flotante para empezar.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {recientes.map((e) => (
              <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="d-flex align-items-center gap-2 p-2 rounded-3 border-0 text-start w-100" style={{ background: "var(--card-bg-2)", color: "var(--ink)", cursor: "pointer" }}>
                <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold flex-shrink-0" style={{ width: 36, height: 36, fontSize: 12, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>{(e.nombre || "?")[0]}</span>
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 13 }}>{e.nombre}</span>
                  <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.pedido} · {e.ci || "S/C"}</span>
                </span>
                <Badge tone="blue" dot>OCR</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="d-none"><Search size={1} /><X size={1} /><EyeOff size={1} /><ImageDown size={1} /></span>
    </div>
  );
}

/* ============================================================
   FACTURACIÓN — ticket térmico + captura + portal HTML
   ============================================================ */
export function Facturas() {
  const { db, tasa, toast, logFactura } = useApp();
  const [q, setQ] = useState("");
  const [fEscuela, setFEscuela] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [printEst, setPrintEst] = useState<Estudiante | null>(null);
  const [capturando, setCapturando] = useState(false);
  const [enviados, setEnviados] = useState<Record<string, number>>({});
  const ticketRef = useRef<HTMLDivElement>(null);
  const now = useNow(1000);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.estudiantes.filter((e) => (!t || [e.nombre, e.ci, e.pedido, e.representante].some((v) => v.toLowerCase().includes(t))) && (!fEscuela || e.escuelaId === fEscuela)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [db.estudiantes, q, fEscuela]);
  const sel = db.estudiantes.find((e) => e.id === selId) || lista[0] || null;
  const escuelaDe = (id: string) => db.escuelas.find((e) => e.id === id);
  const docenteDe = (id: string) => db.docentes.find((d) => d.id === id);

  const imprimir = () => {
    if (!sel) return;
    setPrintEst(sel);
    logFactura({ numero: `F-${sel.pedido.replace("P-", "")}`, estudianteId: sel.id, estudiante: sel.nombre, total: estudianteTotales(sel).total, accion: "Impresión de ticket" });
    setTimeout(() => window.print(), 90);
    setTimeout(() => setPrintEst(null), 1400);
  };
  const capturar = async (): Promise<Blob | null> => {
    const node = ticketRef.current;
    if (!node) { toast("Selecciona un estudiante primero", "warn"); return null; }
    try {
      const { toJpeg } = await import("html-to-image");
      const w = node.offsetWidth, h = node.offsetHeight;
      const dataUrl = await toJpeg(node, { quality: 0.95, pixelRatio: 3, cacheBust: true, skipFonts: true, width: w, height: h, canvasWidth: w * 3, canvasHeight: h * 3, style: { transform: "none", margin: "0" } });
      return await (await fetch(dataUrl)).blob();
    } catch { toast("No se pudo capturar el ticket", "err"); return null; }
  };
  const descargarImagen = async () => {
    setCapturando(true);
    const blob = await capturar();
    setCapturando(false);
    if (!blob || !sel) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ticket-${sel.pedido}-${todayISO()}.jpg`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    logFactura({ numero: `F-${sel.pedido.replace("P-", "")}`, estudianteId: sel.id, estudiante: sel.nombre, total: estudianteTotales(sel).total, accion: "Descarga de captura JPG" });
    toast("Captura descargada como JPG", "ok");
  };
  const enviarWhatsApp = async () => {
    if (!sel) return;
    setCapturando(true);
    const blob = await capturar();
    setCapturando(false);
    if (!blob) return;
    if (!sel.telefono) { toast("Ese estudiante no tiene teléfono registrado", "err"); return; }
    const nombre = `ticket-${sel.pedido}-${todayISO()}.jpg`;
    const file = new File([blob], nombre, { type: "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: any) => Promise<void> };
    const t = estudianteTotales(sel);
    const texto = `🧾 Ticket de pago — ${sel.nombre} (${sel.pedido}). Total ${fmtUSD(t.total)} · Saldo ${fmtUSD(t.saldo)}`;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share!({ files: [file], title: `Ticket ${sel.pedido}`, text: texto }); } catch { return; }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = nombre; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      const tel = sel.telefono.replace(/\D/g, "").replace(/^0/, "58");
      window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, "_blank");
      toast("Captura descargada — adjúntala en el chat abierto", "ok");
    }
    setEnviados((v) => ({ ...v, [sel.id]: Date.now() }));
    logFactura({ numero: `F-${sel.pedido.replace("P-", "")}`, estudianteId: sel.id, estudiante: sel.nombre, total: estudianteTotales(sel).total, accion: "Envío por WhatsApp" });
  };
  const descargarPortal = () => {
    if (!sel) return;
    const pd = buildPortalData(sel, escuelaDe(sel.escuelaId)?.nombre || "", docenteDe(sel.docenteId)?.nombre || "", db.config.empresa.nombre, tasa.usd);
    downloadFile(`Portal-${sel.nombre.split(" ").slice(0, 2).join("-")}-${sel.pedido}.html`, generarPortalHtml(pd, portalUrl(sel)), "text/html");
    toast("Portal HTML descargado — ábrelo en cualquier dispositivo", "ok");
  };

  const t = sel ? estudianteTotales(sel) : null;
  const folio = sel ? `F-${sel.pedido.replace("P-", "")}-${todayISO().split("-").join("").slice(2)}` : "";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Facturación</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Ticket estilo impresora térmica · descarga la captura <b>completa en JPG</b>, envíala por WhatsApp o descarga el Portal HTML</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={descargarImagen} disabled={!sel || capturando}><ImageDown size={15} /> Descargar JPG</button>
          <button className="btn btn-ghost" onClick={imprimir} disabled={!sel}><Printer size={15} /> Imprimir</button>
          <button className="btn btn-primary" onClick={enviarWhatsApp} disabled={!sel || capturando} style={{ background: "linear-gradient(150deg,#25d366,#128c4b)" }}>
            {capturando ? <Loader2 size={15} className="spin" /> : <CreditCard size={15} />} Enviar por WhatsApp
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-5 col-xl-4">
          <div className="card p-3 p-md-4">
            <div className="d-flex flex-column gap-2 mb-3">
              <SearchInput value={q} onChange={setQ} placeholder="Buscar estudiante…" wide />
              <FilterSelect value={fEscuela} onChange={setFEscuela} allLabel="Todas las escuelas" width={220} options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} />
            </div>
            <div className="d-flex flex-column gap-2" style={{ maxHeight: 520, overflowY: "auto" }}>
              {lista.map((e) => {
                const tt = estudianteTotales(e);
                const activa = sel?.id === e.id;
                return (
                  <button key={e.id} onClick={() => setSelId(e.id)} className="d-flex align-items-center gap-2 p-2 rounded-3 border-0 text-start w-100" style={{ background: activa ? "var(--tint-navy-2)" : "var(--card-bg)", outline: activa ? "1.5px solid var(--jyg-navy-500)" : "1.5px solid var(--line-soft)", cursor: "pointer", color: "var(--ink)" }}>
                    <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold flex-shrink-0" style={{ width: 38, height: 38, fontSize: 13, background: activa ? "var(--jyg-navy)" : "var(--tint-navy-2)", color: activa ? "#ffd970" : "var(--jyg-navy)" }}>{(e.nombre || "?")[0]}</span>
                    <span className="flex-grow-1" style={{ minWidth: 0 }}>
                      <span className="d-block font-display fw-semibold text-truncate" style={{ fontSize: 13 }}>{e.nombre}</span>
                      <span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.pedido} · {escuelaDe(e.escuelaId)?.nombre || "—"}</span>
                    </span>
                    <span className="d-flex flex-column align-items-end gap-1">
                      <Badge tone={estadoPagoTone(tt.estadoPago)}>{tt.estadoPago === "Pagado Completo" ? "Pagado" : tt.estadoPago === "Sin Abonos" ? "Sin abonos" : "Parcial"}</Badge>
                      {enviados[e.id] && <span style={{ fontSize: 9.5, color: "var(--ok)", fontWeight: 700 }}>enviado ✓</span>}
                    </span>
                  </button>
                );
              })}
              {lista.length === 0 && <EmptyState icon={Users} title="Sin estudiantes" text="Registra estudiantes para facturar." />}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7 col-xl-8">
          {sel && t ? (
            <div className="d-flex flex-column align-items-center">
              <div className={`ticket-capture ${capturando ? "capturando" : ""}`} ref={ticketRef}>
                <div className="ticket">
                  {t.saldo <= 0.009 ? <div className="t-stamp pagado">PAGADO</div> : t.abonado > 0 ? <div className="t-stamp saldo">SALDO</div> : null}
                  <div className="t-center">
                    <div className="t-titulo">{db.config.empresa.nombre.toUpperCase()}</div>
                    <div className="t-sm t-muted">RIF {db.config.empresa.rif}</div>
                    <div className="t-sm t-muted">{db.config.empresa.direccion}</div>
                    <div className="t-sm t-muted">Tel: {db.config.empresa.telefono}</div>
                  </div>
                  <hr className="t-dashed" />
                  <div className="t-line"><span className="l">TICKET DE PAGO</span><span className="r t-bold">{folio}</span></div>
                  <div className="t-line t-sm t-muted"><span className="l">{fmtFecha(todayISO())}</span><span className="r">{new Date(now).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</span></div>
                  <hr className="t-dashed" />
                  <div className="t-section">ESTUDIANTE</div>
                  <div className="t-line"><span className="l">{sel.nombre}</span><span className="r">{sel.ci || "S/C"}</span></div>
                  <div className="t-line t-sm t-muted"><span className="l">{escuelaDe(sel.escuelaId)?.nombre || "Escuela por asignar"}</span><span className="r">{sel.grado} “{sel.seccion}”</span></div>
                  <div className="t-line t-sm t-muted"><span className="l">Prof: {docenteDe(sel.docenteId)?.nombre || "—"}</span><span className="r">{sel.pedido}</span></div>
                  {sel.representante && <div className="t-line t-sm t-muted"><span className="l">Rep: {sel.representante}</span><span className="r">{sel.telefono}</span></div>}
                  <hr className="t-dashed" />
                  <div className="t-section">DETALLE DEL PEDIDO</div>
                  <div className="t-line"><span className="l">Paquete {PAQUETES[sel.paqueteId].nombre}</span><span className="r t-bold">{fmtUSD(sel.precioPaquete)}</span></div>
                  {sel.adicionales.map((a, i) => (
                    <div key={i} className="t-line t-sm"><span className="l">{a.cantidad}× {a.producto}{a.talla ? ` (${a.talla})` : ""}</span><span className="r">{fmtUSD(a.cantidad * a.precio)}</span></div>
                  ))}
                  <hr className="t-dashed" />
                  <div className="t-section">ABONOS ({t.partes})</div>
                  {sel.pagos.length === 0 ? <div className="t-sm t-muted">Sin abonos registrados</div> : sel.pagos.map((p) => (
                    <div key={p.id} className="mb-1">
                      <div className="t-line t-sm"><span className="l">{fmtFecha(p.fecha)} · {p.metodo}</span><span className="r t-bold">{p.bs ? fmtBs(p.monto) : fmtUSD(p.monto)}</span></div>
                      <div className="t-line t-sm t-muted">
                        <span className="l">{p.bs ? `≈ ${fmtUSD(p.usd)}` : `≈ ${fmtBs(p.monto * p.tasa)}`} · tasa {p.tasa.toFixed(2)}</span>
                        <span className="r">{p.referencia ? `Ref ${p.referencia}` : ""}</span>
                      </div>
                    </div>
                  ))}
                  <hr className="t-dashed" />
                  <div className="t-line"><span className="l t-bold">TOTAL</span><span className="r t-bold">{fmtUSD(t.total)}</span></div>
                  <div className="t-line t-sm t-muted"><span className="l">en bolívares (tasa {tasa.usd.toFixed(2)})</span><span className="r">{fmtBs(t.total * tasa.usd)}</span></div>
                  <div className="t-line"><span className="l t-bold">ABONADO</span><span className="r t-bold">{fmtUSD(t.abonado)}</span></div>
                  <div className="t-line"><span className="l t-bold">{t.saldo <= 0.009 ? "ESTADO: PAGADO" : "SALDO"}</span><span className="r t-bold">{t.saldo <= 0.009 ? fmtUSD(0) : `${fmtUSD(t.saldo)} · ${fmtBs(t.saldo * tasa.usd)}`}</span></div>
                  <hr className="t-dashed" />
                  <div className="t-center t-sm t-muted">¡Gracias por su compra! 🎓</div>
                </div>
                <div className="ticket-tear" />
              </div>

              <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap mt-3">
                <button className="btn btn-soft btn-sm" onClick={descargarPortal}><Download size={14} /> Descargar Portal HTML</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(portalUrl(sel)).then(() => toast("Enlace del portal copiado", "ok")).catch(() => undefined); }}><Copy size={14} /> Copiar enlace del portal</button>
              </div>
              <p className="text-center mt-2 mb-0" style={{ fontSize: 10.5, color: "var(--ink-faint)", maxWidth: 420 }}>
                El Portal HTML es autocontenido: ábrelo o compártelo y se verá en cualquier dispositivo sin necesidad del CRM. Enlace corto: <span className="tabular-nums">…/#/p/{slugEstudiante(sel)}.jyg</span>
              </p>
            </div>
          ) : (
            <div className="card"><EmptyState icon={CreditCard} title="Selecciona un estudiante" text="Elige un estudiante de la lista para generar su ticket." /></div>
          )}
        </div>
      </div>

      <div className="print-sheet print-sheet--ticket">
        {printEst && <div><div className="ticket" style={{ boxShadow: "none" }}><div className="t-center"><div className="t-titulo">{db.config.empresa.nombre.toUpperCase()}</div></div></div></div>}
      </div>
    </div>
  );
}
