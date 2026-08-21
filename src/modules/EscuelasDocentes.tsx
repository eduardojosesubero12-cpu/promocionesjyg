import React, { useMemo, useState } from "react";
import { Building2, Check, GraduationCap, Pencil, Plus, School, Search, Trash2, Users } from "lucide-react";
import { useApp } from "../lib/store";
import type { Docente, Escuela } from "../lib/data";
import { Badge, EmptyState, Field, Modal } from "../components/ui";

const escVacia = (): Escuela => ({ id: "", nombre: "", director: "", telefono: "", direccion: "", estado: "", municipio: "", anioEscolar: "2025-2026", observaciones: "" });
const docVacio = (): Docente => ({ id: "", nombre: "", telefono: "", escuelaId: "", correo: "", observaciones: "" });

export function Escuelas() {
  const { db, saveEscuela, deleteEscuela, confirm, success, toast } = useApp();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Escuela | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.escuelas.filter((e) => !t || [e.nombre, e.director, e.municipio].some((v) => v.toLowerCase().includes(t)));
  }, [db.escuelas, q]);

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "El nombre es obligatorio";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveEscuela({ ...form, id: form.id || "es-" + Math.random().toString(36).slice(2, 8) });
    success();
    setForm(null);
  };
  const eliminar = async (e: Escuela) => {
    const n = db.estudiantes.filter((x) => x.escuelaId === e.id).length;
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: n > 0 ? `"${e.nombre}" tiene ${n} estudiantes asociados.` : `Se eliminará "${e.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteEscuela(e.id);
    toast("Registro eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Escuelas</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Planteles atendidos por Promociones JyG</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(escVacia()); }}><Plus size={16} /> Nueva escuela</button>
      </div>

      <div className="card p-4 mb-5 flex items-center gap-2.5 max-w-[460px]">
        <Search size={16} style={{ color: "var(--ink-faint)" }} />
        <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar escuela…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Escuela</th><th>Director</th><th>Teléfono</th><th>Ubicación</th><th>Año escolar</th><th>Estudiantes</th><th></th></tr></thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><Building2 size={16} /></span>
                      <div><div className="font-display font-semibold text-[13.5px]">{e.nombre}</div>{e.observaciones && <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.observaciones}</div>}</div>
                    </div>
                  </td>
                  <td className="text-[13px]">{e.director}</td>
                  <td className="text-[13px] tabular-nums">{e.telefono}</td>
                  <td className="text-[12.5px]">{e.municipio}, {e.estado}</td>
                  <td><Badge tone="blue">{e.anioEscolar}</Badge></td>
                  <td className="font-display font-bold" style={{ color: "var(--blue)" }}>{db.estudiantes.filter((x) => x.escuelaId === e.id).length}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="icon-btn" onClick={() => { setErrs({}); setForm(e); }}><Pencil size={15} /></button>
                      <button className="icon-btn danger" onClick={() => eliminar(e)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={School} title="Sin escuelas" text="Registra el primer plantel para comenzar." />}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar escuela" : "Nueva escuela"}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre de la escuela" required error={errs.nombre} className="col-span-2">
              <input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
            </Field>
            <Field label="Director(a)"><input className="input" value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Municipio"><input className="input" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></Field>
            <Field label="Estado"><input className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} /></Field>
            <Field label="Año escolar"><input className="input" value={form.anioEscolar} onChange={(e) => setForm({ ...form, anioEscolar: e.target.value })} /></Field>
            <Field label="Dirección"><input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></Field>
            <Field label="Observaciones" className="col-span-2"><textarea className="textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Docentes() {
  const { db, saveDocente, deleteDocente, confirm, success, toast } = useApp();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Docente | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.docentes.filter((d) => !t || [d.nombre, d.correo].some((v) => v.toLowerCase().includes(t)));
  }, [db.docentes, q]);

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "El nombre es obligatorio";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveDocente({ ...form, id: form.id || "do-" + Math.random().toString(36).slice(2, 8) });
    success();
    setForm(null);
  };
  const eliminar = async (d: Docente) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a "${d.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteDocente(d.id);
    toast("Registro eliminado", "warn");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">CRM</div>
          <h1>Profesores</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Docentes enlace de cada plantel</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(docVacio()); }}><Plus size={16} /> Nuevo profesor</button>
      </div>

      <div className="card p-4 mb-5 flex items-center gap-2.5 max-w-[460px]">
        <Search size={16} style={{ color: "var(--ink-faint)" }} />
        <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar profesor…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Profesor(a)</th><th>Escuela</th><th>Teléfono</th><th>Correo</th><th>Estudiantes</th><th></th></tr></thead>
            <tbody>
              {lista.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12.5px]" style={{ background: "var(--green-tint)", color: "var(--green)" }}>{d.nombre[0]}</span>
                      <div><div className="font-display font-semibold text-[13.5px]">{d.nombre}</div>{d.observaciones && <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{d.observaciones}</div>}</div>
                    </div>
                  </td>
                  <td className="text-[12.5px]">{db.escuelas.find((e) => e.id === d.escuelaId)?.nombre || "—"}</td>
                  <td className="text-[13px] tabular-nums">{d.telefono}</td>
                  <td className="text-[12.5px]">{d.correo}</td>
                  <td className="font-display font-bold" style={{ color: "var(--blue)" }}>{db.estudiantes.filter((x) => x.docenteId === d.id).length}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="icon-btn" onClick={() => { setErrs({}); setForm(d); }}><Pencil size={15} /></button>
                      <button className="icon-btn danger" onClick={() => eliminar(d)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={Users} title="Sin profesores" text="Registra docentes para asociarlos a estudiantes." />}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar profesor" : "Nuevo profesor"}
          footer={<><button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del docente" required error={errs.nombre} className="col-span-2">
              <input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
            </Field>
            <Field label="Escuela" className="col-span-2">
              <select className="select" value={form.escuelaId} onChange={(e) => setForm({ ...form, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Correo"><input className="input" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></Field>
            <Field label="Observaciones" className="col-span-2"><textarea className="textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      <span className="hidden"><GraduationCap size={1} /></span>
    </div>
  );
}
