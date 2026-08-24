import React, { useMemo, useState } from "react";
import {
  CalendarDays, CalendarPlus, Camera, Check, ChevronLeft, ChevronRight, Clock, MessageSquare,
  Pencil, Plus, Smartphone, Trash2,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Evento, MensajeLog, Sesion } from "../lib/data";
import { PAQUETES, PLANTILLAS_MENSAJE, estudianteTotales, fmtFecha, fmtUSD, todayISO, uid, waLink } from "../lib/data";
import { Badge, EmptyState, Field, Modal, SectionHead } from "../components/ui";

/* ============ SESIONES FOTOGRÁFICAS ============ */
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
  const lista = [...db.sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1>Sesiones Fotográficas</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Tomas de toga, birrete, carnet y firma de libro por plantel</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(sesionVacia()); }}><Plus size={16} /> Nueva sesión</button>
      </div>

      <div className="row g-4">
        {lista.map((s, i) => {
          const es = db.escuelas.find((x) => x.id === s.escuelaId);
          const estudiantes = db.estudiantes.filter((e) => e.escuelaId === s.escuelaId).length;
          return (
            <div key={s.id} className="col-12 col-lg-6 col-xl-4">
              <div className="card p-4 h-100 reveal card-lift" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="d-flex align-items-start gap-3">
                  <div className="d-flex flex-column align-items-center justify-content-center rounded-3 font-display flex-shrink-0" style={{ width: 56, height: 56, background: s.estado === "Realizada" ? "var(--tint-ok)" : "var(--jyg-navy)", color: s.estado === "Realizada" ? "var(--ok)" : "#fff" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{s.fecha.slice(8, 10)}</span>
                    <span className="text-uppercase" style={{ fontSize: 9, letterSpacing: 1, opacity: 0.85 }}>{new Date(s.fecha + "T12:00").toLocaleDateString("es-VE", { month: "short" })}</span>
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h3 className="font-display fw-bold text-truncate m-0" style={{ fontSize: 15 }}>{es?.nombre || "Escuela"}</h3>
                      <Badge tone={s.estado === "Realizada" ? "green" : "blue"} dot>{s.estado}</Badge>
                    </div>
                    <p style={{ fontSize: 12.5, margin: "2px 0 6px", color: "var(--ink-soft)" }}>
                      <Clock size={12} className="me-1" style={{ verticalAlign: "-1.5px" }} />{s.hora} h · 📷 {s.fotografo} · {estudiantes} estudiantes
                    </p>
                    {s.nota && <p className="fst-italic" style={{ fontSize: 12, margin: "0 0 6px", color: "var(--ink-faint)" }}>{s.nota}</p>}
                    {s.estado === "Realizada" && <Badge tone="gold">{s.fotos} fotos capturadas</Badge>}
                  </div>
                  <div className="d-flex flex-column gap-1">
                    <button className="icon-btn" onClick={() => { setErrs({}); setForm(s); }} title="Editar"><Pencil size={15} /></button>
                    <button className="icon-btn danger" onClick={() => eliminar(s)} title="Eliminar"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lista.length === 0 && <div className="card mt-3"><EmptyState icon={Camera} title="Sin sesiones" text="Agenda la primera toma fotográfica." /></div>}

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar sesión" : "Nueva sesión fotográfica"}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="row g-3">
            <Field label="Escuela" required error={errs.escuelaId} className="col-12">
              <select className={`select ${errs.escuelaId ? "err" : ""}`} value={form.escuelaId} onChange={(e) => setForm({ ...form, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Fecha" className="col-md-6"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora" className="col-md-6"><input type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Fotógrafo(a)" required error={errs.fotografo} className="col-md-6">
              <input className={`input ${errs.fotografo ? "err" : ""}`} value={form.fotografo} onChange={(e) => setForm({ ...form, fotografo: e.target.value })} />
            </Field>
            <Field label="Estado" className="col-md-6">
              <select className="select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Sesion["estado"] })}>
                <option>Agendada</option><option>Realizada</option>
              </select>
            </Field>
            {form.estado === "Realizada" && (
              <Field label="Fotos capturadas" className="col-md-6"><input type="number" min={0} className="input" value={form.fotos} onChange={(e) => setForm({ ...form, fotos: Number(e.target.value) || 0 })} /></Field>
            )}
            <Field label="Nota" className="col-12"><textarea className="textarea" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ AGENDA / CALENDARIO ============ */
const TIPO_EVENTO: Record<string, { label: string; color: string }> = {
  sesion: { label: "Sesión", color: "var(--jyg-navy)" },
  entrega: { label: "Entrega", color: "var(--ok)" },
  cobranza: { label: "Cobranza", color: "var(--warn)" },
  otro: { label: "Otro", color: "var(--jyg-gold-deep)" },
};

export function Agenda() {
  const { db, saveEvento, deleteEvento, confirm, success, toast } = useApp();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<Evento | null>(null);

  const dias = useMemo(() => {
    const primerDia = new Date(mes);
    const inicio = new Date(primerDia);
    const dow = (primerDia.getDay() + 6) % 7;
    inicio.setDate(primerDia.getDate() - dow);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [mes]);

  const hoyISO = todayISO();
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
        <button className="btn btn-primary" onClick={() => setForm({ id: "", fecha: hoyISO, hora: "10:00", titulo: "", tipo: "otro" })}>
          <CalendarPlus size={16} /> Nuevo evento
        </button>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h3 className="font-display fw-bold text-capitalize m-0" style={{ fontSize: 17 }}>
                {mes.toLocaleDateString("es-VE", { month: "long", year: "numeric" })}
              </h3>
              <div className="d-flex gap-1">
                <button className="icon-btn" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior"><ChevronLeft size={17} /></button>
                <button className="btn btn-soft btn-sm" onClick={() => { const d = new Date(); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hoy</button>
                <button className="icon-btn" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Mes siguiente"><ChevronRight size={17} /></button>
              </div>
            </div>
            <div className="row g-1 mb-1">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="col text-center font-display fw-semibold text-uppercase py-1" style={{ fontSize: 11, letterSpacing: 1, color: "var(--ink-faint)" }}>{d}</div>
              ))}
            </div>
            <div className="row g-1">
              {dias.map((d) => {
                const iso = d.toISOString().slice(0, 10);
                const evs = eventosDe(iso);
                const esHoy = iso === hoyISO;
                const delMes = d.getMonth() === mes.getMonth();
                return (
                  <div key={iso} className="col" style={{ width: "14.285%", flex: "0 0 14.285%" }}>
                    <button className="w-100 border-0 rounded-3 p-1 text-start" onClick={() => setForm({ id: "", fecha: iso, hora: "10:00", titulo: "", tipo: "otro" })}
                      style={{ minHeight: 74, background: esHoy ? "var(--tint-navy-2)" : "var(--card-bg-2)", opacity: delMes ? 1 : 0.45, border: esHoy ? "1.5px solid var(--jyg-navy)" : "1.5px solid transparent", cursor: "pointer", transition: "transform .15s" }}>
                      <span className="font-display fw-bold d-block" style={{ fontSize: 12, color: esHoy ? "var(--jyg-navy)" : "var(--ink-soft)" }}>{d.getDate()}</span>
                      <span className="d-flex flex-column gap-1 mt-1">
                        {evs.slice(0, 2).map((e) => (
                          <span key={e.id} className="fw-bold px-1 rounded-2 text-truncate" style={{ fontSize: 9.5, background: `color-mix(in srgb, ${TIPO_EVENTO[e.tipo].color} 16%, transparent)`, color: TIPO_EVENTO[e.tipo].color }}>
                            {e.titulo}
                          </span>
                        ))}
                        {evs.length > 2 && <span className="fw-bold px-1" style={{ fontSize: 9, color: "var(--ink-faint)" }}>+{evs.length - 2} más</span>}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card p-4">
            <SectionHead title="Próximos eventos" />
            {proximos.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)", padding: "12px 0" }}>Nada agendado. Haz clic en un día para crear.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {proximos.map((e) => (
                  <div key={e.id} className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: "var(--card-bg-2)" }}>
                    <span className="rounded-pill flex-shrink-0" style={{ width: 10, height: 36, background: TIPO_EVENTO[e.tipo].color }} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="font-display fw-semibold text-truncate" style={{ fontSize: 13 }}>{e.titulo}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{fmtFecha(e.fecha)} · {e.hora} h · {TIPO_EVENTO[e.tipo].label}</div>
                    </div>
                    <button className="icon-btn danger" onClick={() => eliminar(e)} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title="Nuevo evento en agenda">
          <div className="row g-3">
            <Field label="Título" required className="col-12">
              <input className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Entrega de pedidos — Valencia" autoFocus />
            </Field>
            <Field label="Fecha" className="col-md-6"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora" className="col-md-6"><input type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Tipo" className="col-12">
              <div className="d-flex gap-2 flex-wrap">
                {Object.entries(TIPO_EVENTO).map(([k, v]) => (
                  <button key={k} onClick={() => setForm({ ...form, tipo: k as Evento["tipo"] })} className="btn btn-sm" style={form.tipo === k ? { background: v.color, color: "#fff", borderColor: v.color } : { background: "var(--card-bg-2)", color: "var(--ink-soft)", border: "1.5px solid var(--line)" }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Escuela (opcional)" className="col-12">
              <select className="select" value={form.escuelaId || ""} onChange={(e) => setForm({ ...form, escuelaId: e.target.value || undefined })}>
                <option value="">— Ninguna —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ MENSAJES ============ */
export function Mensajes() {
  const { db, addMensaje, success, toast } = useApp();
  const [estId, setEstId] = useState(db.estudiantes[0]?.id || "");
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS_MENSAJE[0].id);
  const [texto, setTexto] = useState("");

  const est = db.estudiantes.find((e) => e.id === estId);
  const plantilla = PLANTILLAS_MENSAJE.find((p) => p.id === plantillaId)!;

  const rellenar = (pid: string, eid: string) => {
    const p = PLANTILLAS_MENSAJE.find((x) => x.id === pid)!;
    const s = db.estudiantes.find((e) => e.id === eid);
    if (!s) return;
    const t = estudianteTotales(s);
    const escuela = db.escuelas.find((x) => x.id === s.escuelaId)?.nombre || "su escuela";
    const rep = (str: string, k: string, v: string) => str.split(k).join(v);
    let cuerpo = p.cuerpo;
    cuerpo = rep(cuerpo, "{{representante}}", s.representante || "representante");
    cuerpo = rep(cuerpo, "{{estudiante}}", s.nombre);
    cuerpo = rep(cuerpo, "{{saldo}}", fmtUSD(t.saldo));
    cuerpo = rep(cuerpo, "{{paquete}}", PAQUETES[s.paqueteId].nombre);
    cuerpo = rep(cuerpo, "{{incluye}}", PAQUETES[s.paqueteId].incluye.slice(0, 4).join(", "));
    cuerpo = rep(cuerpo, "{{precio}}", fmtUSD(t.total));
    cuerpo = rep(cuerpo, "{{escuela}}", escuela);
    setTexto(cuerpo);
  };

  React.useEffect(() => { rellenar(plantillaId, estId); }, [plantillaId, estId]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviarWA = () => {
    if (!est) return;
    if (!texto.trim()) { toast("El mensaje está vacío", "err"); return; }
    window.open(waLink(est.telefono, texto), "_blank");
    addMensaje({ id: uid(), fecha: todayISO(), destinatario: est.representante || est.nombre, telefono: est.telefono, plantilla: plantilla.nombre, texto });
    success("Mensaje registrado en el historial");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Mensajes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Plantillas con datos del estudiante · envío directo por WhatsApp</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="card p-4 mb-4">
            <Field label="Destinatario (estudiante)">
              <select className="select" value={estId} onChange={(e) => setEstId(e.target.value)}>
                {db.estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} — {e.representante}</option>)}
              </select>
            </Field>
            {est && (
              <div className="mt-3 p-3 rounded-3" style={{ background: "var(--card-bg-2)", fontSize: 12.5 }}>
                <div className="d-flex justify-content-between"><span style={{ color: "var(--ink-faint)" }}>Teléfono</span><b>{est.telefono || "—"}</b></div>
                <div className="d-flex justify-content-between mt-1"><span style={{ color: "var(--ink-faint)" }}>Saldo</span><b style={{ color: estudianteTotales(est).saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(estudianteTotales(est).saldo)}</b></div>
              </div>
            )}
          </div>
          <div className="card p-4">
            <SectionHead title="Plantillas" />
            <div className="d-flex flex-column gap-2">
              {PLANTILLAS_MENSAJE.map((p) => (
                <button key={p.id} onClick={() => setPlantillaId(p.id)} className="text-start p-2 rounded-3 border-0 w-100" style={{ background: plantillaId === p.id ? "var(--tint-navy-2)" : "var(--card-bg-2)", outline: plantillaId === p.id ? "1.5px solid var(--jyg-navy)" : "1.5px solid transparent", color: "var(--ink)", cursor: "pointer" }}>
                  <span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{p.nombre}</span>
                  <span className="d-block text-truncate" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{p.cuerpo.slice(0, 60)}…</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="card p-4 mb-4">
            <SectionHead title="Vista previa del mensaje" desc="Se rellena automáticamente con los datos del estudiante — editable" />
            <textarea className="textarea" style={{ minHeight: 170, fontSize: 14 }} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary" style={{ background: "#1f9d55" }} onClick={enviarWA} disabled={!est}>
                <Smartphone size={16} /> Enviar por WhatsApp
              </button>
              <button className="btn btn-ghost" onClick={() => rellenar(plantillaId, estId)}>Restaurar plantilla</button>
            </div>
          </div>

          <div className="card p-4">
            <SectionHead title={`Historial (${db.mensajes.length})`} />
            {db.mensajes.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Sin mensajes enviados" text="Los mensajes enviados quedarán registrados aquí." />
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 340, overflowY: "auto" }}>
                {db.mensajes.map((m: MensajeLog) => (
                  <div key={m.id} className="p-2 rounded-3" style={{ background: "var(--card-bg-2)", border: "1px solid var(--line-soft)" }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <Badge tone="green" dot>WhatsApp</Badge>
                      <span className="font-display fw-semibold" style={{ fontSize: 13 }}>{m.destinatario}</span>
                      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{m.telefono} · {fmtFecha(m.fecha)} · {m.plantilla}</span>
                    </div>
                    <p className="text-truncate m-0" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{m.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="d-none"><CalendarDays size={1} /></span>
    </div>
  );
}
