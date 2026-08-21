import React, { useMemo, useState } from "react";
import {
  CalendarDays, CalendarPlus, Camera, Check, ChevronLeft, ChevronRight, Clock, MessageSquare,
  Pencil, Plus, Smartphone, Trash2,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { Evento, MensajeLog, Sesion } from "../lib/data";
import { PAQUETES, PLANTILLAS_MENSAJE, estudianteTotales, fmtFecha, fmtUSD, todayISO, uid, waLink } from "../lib/data";
import { Badge, EmptyState, Field, Modal, SectionHead } from "../components/ui";

/* ================= SESIONES FOTOGRÁFICAS ================= */
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lista.map((s, i) => {
          const es = db.escuelas.find((x) => x.id === s.escuelaId);
          const n = db.estudiantes.filter((e) => e.escuelaId === s.escuelaId).length;
          return (
            <div key={s.id} className="card p-5 reveal transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-display flex-shrink-0" style={{ background: s.estado === "Realizada" ? "var(--green-tint)" : "var(--blue)", color: s.estado === "Realizada" ? "var(--green)" : "#fff" }}>
                  <span className="text-[18px] font-bold leading-none">{s.fecha.slice(8, 10)}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-80">{new Date(s.fecha + "T12:00").toLocaleDateString("es-VE", { month: "short" })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-[15px] m-0 truncate">{es?.nombre || "Escuela"}</h3>
                    <Badge tone={s.estado === "Realizada" ? "green" : "blue"} dot>{s.estado}</Badge>
                  </div>
                  <p className="text-[12.5px] mt-0.5 mb-2" style={{ color: "var(--ink-soft)" }}><Clock size={12} className="inline mr-1" />{s.hora} h · 📷 {s.fotografo} · {n} estudiantes</p>
                  {s.nota && <p className="text-[12px] italic m-0 mb-2" style={{ color: "var(--ink-faint)" }}>{s.nota}</p>}
                  {s.estado === "Realizada" && <Badge tone="gold">{s.fotos} fotos capturadas</Badge>}
                </div>
                <div className="flex flex-col gap-1">
                  <button className="icon-btn" onClick={() => { setErrs({}); setForm(s); }}><Pencil size={15} /></button>
                  <button className="icon-btn danger" onClick={() => eliminar(s)}><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lista.length === 0 && <div className="card"><EmptyState icon={Camera} title="Sin sesiones" text="Agenda la primera toma fotográfica." /></div>}

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar sesión" : "Nueva sesión fotográfica"}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Escuela" required error={errs.escuelaId} className="col-span-2">
              <select className={`select ${errs.escuelaId ? "err" : ""}`} value={form.escuelaId} onChange={(e) => setForm({ ...form, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Fecha"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora"><input type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Fotógrafo(a)" required error={errs.fotografo}>
              <input className={`input ${errs.fotografo ? "err" : ""}`} value={form.fotografo} onChange={(e) => setForm({ ...form, fotografo: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className="select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Sesion["estado"] })}>
                <option>Agendada</option><option>Realizada</option>
              </select>
            </Field>
            {form.estado === "Realizada" && <Field label="Fotos capturadas"><input type="number" min={0} className="input" value={form.fotos} onChange={(e) => setForm({ ...form, fotos: Number(e.target.value) || 0 })} /></Field>}
            <Field label="Nota" className="col-span-2"><textarea className="textarea" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= AGENDA ================= */
const TIPO_EVENTO: Record<string, { label: string; color: string }> = {
  sesion: { label: "Sesión", color: "var(--blue)" },
  entrega: { label: "Entrega", color: "var(--green)" },
  cobranza: { label: "Cobranza", color: "var(--amber)" },
  otro: { label: "Otro", color: "var(--gold)" },
};

export function Agenda() {
  const { db, saveEvento, deleteEvento, confirm, success, toast } = useApp();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<Evento | null>(null);

  const dias = useMemo(() => {
    const inicio = new Date(mes);
    const dow = (mes.getDay() + 6) % 7;
    inicio.setDate(mes.getDate() - dow);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
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
        <button className="btn btn-primary" onClick={() => setForm({ id: "", fecha: hoyISO, hora: "10:00", titulo: "", tipo: "otro" })}><CalendarPlus size={16} /> Nuevo evento</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[17px] m-0 capitalize">{mes.toLocaleDateString("es-VE", { month: "long", year: "numeric" })}</h3>
            <div className="flex gap-1.5">
              <button className="icon-btn" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>
              <button className="btn btn-soft btn-sm" onClick={() => { const d = new Date(); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hoy</button>
              <button className="icon-btn" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight size={17} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center font-display font-semibold text-[11px] uppercase tracking-wider py-1" style={{ color: "var(--ink-faint)" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {dias.map((d) => {
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const evs = eventosDe(iso);
              const esHoy = iso === hoyISO;
              const delMes = d.getMonth() === mes.getMonth();
              return (
                <button key={iso} onClick={() => setForm({ id: "", fecha: iso, hora: "10:00", titulo: "", tipo: "otro" })}
                  className="min-h-[74px] rounded-xl p-1.5 text-left border-none cursor-pointer transition-all hover:scale-[1.03]"
                  style={{ background: esHoy ? "var(--blue-tint-2)" : "var(--surface-2)", opacity: delMes ? 1 : 0.45, border: esHoy ? "1.5px solid var(--blue)" : "1.5px solid transparent" }}>
                  <span className="font-display font-bold text-[12px] block" style={{ color: esHoy ? "var(--blue)" : "var(--ink-soft)" }}>{d.getDate()}</span>
                  <span className="flex flex-col gap-0.5 mt-1">
                    {evs.slice(0, 2).map((e) => (
                      <span key={e.id} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md truncate" style={{ background: `color-mix(in srgb, ${TIPO_EVENTO[e.tipo].color} 16%, transparent)`, color: TIPO_EVENTO[e.tipo].color }}>{e.titulo}</span>
                    ))}
                    {evs.length > 2 && <span className="text-[9px] font-bold px-1" style={{ color: "var(--ink-faint)" }}>+{evs.length - 2} más</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5 h-fit">
          <SectionHead title="Próximos eventos" />
          {proximos.length === 0 ? (
            <p className="text-[13px] m-0 py-4" style={{ color: "var(--ink-faint)" }}>Nada agendado. Haz clic en un día para crear.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {proximos.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl group" style={{ background: "var(--surface-2)" }}>
                  <span className="w-2.5 h-9 rounded-full flex-shrink-0" style={{ background: TIPO_EVENTO[e.tipo].color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-[13px] truncate">{e.titulo}</div>
                    <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{fmtFecha(e.fecha)} · {e.hora} h · {TIPO_EVENTO[e.tipo].label}</div>
                  </div>
                  <button className="icon-btn danger opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => eliminar(e)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title="Nuevo evento en agenda">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Título" required className="col-span-2">
              <input className="input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Entrega de pedidos — Valencia" autoFocus />
            </Field>
            <Field label="Fecha"><input type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Hora"><input type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></Field>
            <Field label="Tipo" className="col-span-2">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TIPO_EVENTO).map(([k, v]) => (
                  <button key={k} onClick={() => setForm({ ...form, tipo: k as Evento["tipo"] })} className="btn btn-sm" style={form.tipo === k ? { background: v.color, color: "#fff" } : { background: "var(--surface-2)", color: "var(--ink-soft)", border: "1.5px solid var(--border)" }}>{v.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Escuela (opcional)" className="col-span-2">
              <select className="select" value={form.escuelaId || ""} onChange={(e) => setForm({ ...form, escuelaId: e.target.value || undefined })}>
                <option value="">— Ninguna —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
          </div>
        </Modal>
      )}
      <span className="hidden"><CalendarDays size={1} /></span>
    </div>
  );
}

/* ================= MENSAJES ================= */
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

      <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-5">
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <Field label="Destinatario (estudiante)">
              <select className="select" value={estId} onChange={(e) => setEstId(e.target.value)}>
                {db.estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} — {e.representante || "—"}</option>)}
              </select>
            </Field>
            {est && (
              <div className="mt-3 p-3 rounded-xl text-[12.5px]" style={{ background: "var(--surface-2)" }}>
                <div className="flex justify-between"><span style={{ color: "var(--ink-faint)" }}>Teléfono</span><b>{est.telefono || "—"}</b></div>
                <div className="flex justify-between mt-1"><span style={{ color: "var(--ink-faint)" }}>Saldo</span><b style={{ color: estudianteTotales(est).saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(estudianteTotales(est).saldo)}</b></div>
              </div>
            )}
          </div>
          <div className="card p-4">
            <SectionHead title="Plantillas" />
            <div className="flex flex-col gap-2">
              {PLANTILLAS_MENSAJE.map((p) => (
                <button key={p.id} onClick={() => setPlantillaId(p.id)} className="text-left p-3 rounded-xl border-none cursor-pointer transition-all hover:translate-x-1" style={{ background: plantillaId === p.id ? "var(--blue-tint-2)" : "var(--surface-2)", outline: plantillaId === p.id ? "1.5px solid var(--blue)" : "1.5px solid transparent", color: "var(--ink)" }}>
                  <span className="block font-display font-semibold text-[13px]">{p.nombre}</span>
                  <span className="block text-[11.5px] truncate" style={{ color: "var(--ink-faint)" }}>{p.cuerpo.slice(0, 60)}…</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <SectionHead title="Vista previa del mensaje" desc="Se rellena automáticamente con los datos del estudiante — editable" />
            <textarea className="textarea" style={{ minHeight: 170, fontSize: 14 }} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" style={{ background: "#1f9d55" }} onClick={enviarWA} disabled={!est}><Smartphone size={16} /> Enviar por WhatsApp</button>
              <button className="btn btn-ghost" onClick={() => rellenar(plantillaId, estId)}>Restaurar plantilla</button>
            </div>
          </div>
          <div className="card p-5">
            <SectionHead title={`Historial (${db.mensajes.length})`} />
            {db.mensajes.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Sin mensajes enviados" text="Los mensajes enviados quedarán registrados aquí." />
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {db.mensajes.map((m: MensajeLog) => (
                  <div key={m.id} className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge tone="green" dot>WhatsApp</Badge>
                      <span className="font-display font-semibold text-[13px]">{m.destinatario}</span>
                      <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{m.telefono} · {fmtFecha(m.fecha)} · {m.plantilla}</span>
                    </div>
                    <p className="text-[12.5px] m-0 truncate" style={{ color: "var(--ink-soft)" }}>{m.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
