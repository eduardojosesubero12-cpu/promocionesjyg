import React, { useMemo, useState } from "react";
import { Building2, Check, Mail, MapPin, Pencil, Phone, Plus, School, Search, Trash2, Users } from "lucide-react";
import { useApp } from "../lib/store";
import type { Docente, Escuela } from "../lib/data";
import { uid } from "../lib/data";
import { Badge, EmptyState, Field, Modal, SectionHead } from "../components/ui";

/* ================= ESCUELAS ================= */

const escuelaVacia = (): Escuela => ({ id: "", nombre: "", director: "", telefono: "", direccion: "", estado: "", municipio: "", anioEscolar: "2025-2026", observaciones: "" });

export function Escuelas() {
  const { db, saveEscuela, deleteEscuela, confirm, success, toast, user } = useApp();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Escuela | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const puedeEditar = user?.rol === "admin" || user?.rol === "operador";

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.escuelas.filter((e) => !t || [e.nombre, e.director, e.municipio, e.estado].some((v) => v.toLowerCase().includes(t)));
  }, [db.escuelas, q]);

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "Nombre obligatorio";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveEscuela({ ...form, id: form.id || uid() });
    success();
    setForm(null);
  };

  const eliminar = async (e: Escuela) => {
    const n = db.estudiantes.filter((x) => x.escuelaId === e.id).length;
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: n > 0 ? `La escuela tiene ${n} estudiantes asociados. Se eliminará de todas formas.` : `Se eliminará "${e.nombre}".`, confirmText: "Eliminar", danger: true });
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
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Planteles atendidos · una escuela tiene muchos docentes</p>
        </div>
        {puedeEditar && <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(escuelaVacia()); }}><Plus size={16} /> Nueva escuela</button>}
      </div>

      <div className="card p-4 mb-5 flex items-center gap-2.5 max-w-[460px]">
        <Search size={16} style={{ color: "var(--ink-faint)" }} />
        <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar escuela, director, municipio…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {lista.map((e, i) => {
          const nDoc = db.docentes.filter((d) => d.escuelaId === e.id).length;
          const nEst = db.estudiantes.filter((x) => x.escuelaId === e.id).length;
          return (
            <div key={e.id} className="card p-5 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><Building2 size={20} /></div>
                {puedeEditar && (
                  <div className="flex gap-1">
                    <button className="icon-btn" onClick={() => { setErrs({}); setForm(e); }}><Pencil size={15} /></button>
                    {user?.rol === "admin" && <button className="icon-btn danger" onClick={() => eliminar(e)}><Trash2 size={15} /></button>}
                  </div>
                )}
              </div>
              <h3 className="font-display font-bold text-[15.5px] m-0">{e.nombre}</h3>
              <p className="text-[12.5px] mt-1 mb-3" style={{ color: "var(--ink-soft)" }}>Dir. {e.director || "—"} · Año escolar {e.anioEscolar}</p>
              <div className="flex flex-col gap-1.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                <span><Phone size={12} className="inline mr-1.5" style={{ color: "var(--ink-faint)" }} />{e.telefono || "Sin teléfono"}</span>
                <span><MapPin size={12} className="inline mr-1.5" style={{ color: "var(--ink-faint)" }} />{e.municipio}, {e.estado}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Badge tone="blue" dot>{nDoc} docentes</Badge>
                <Badge tone="gold" dot>{nEst} estudiantes</Badge>
              </div>
              {e.observaciones && <p className="text-[11.5px] italic mt-3 mb-0" style={{ color: "var(--ink-faint)" }}>{e.observaciones}</p>}
            </div>
          );
        })}
      </div>
      {lista.length === 0 && <div className="card"><EmptyState icon={School} title="Sin escuelas" text="Registra el primer plantel para empezar." /></div>}

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar escuela" : "Nueva escuela"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre de la escuela" required error={errs.nombre} className="col-span-2">
              <input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
            </Field>
            <Field label="Director(a)"><input className="input" value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} /></Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Estado"><input className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="Carabobo" /></Field>
            <Field label="Municipio"><input className="input" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></Field>
            <Field label="Año escolar"><input className="input" value={form.anioEscolar} onChange={(e) => setForm({ ...form, anioEscolar: e.target.value })} /></Field>
            <Field label="Dirección"><input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></Field>
            <Field label="Observaciones" className="col-span-2"><textarea className="textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= DOCENTES ================= */

const docenteVacio = (): Docente => ({ id: "", nombre: "", telefono: "", escuelaId: "", correo: "", observaciones: "" });

export function Docentes() {
  const { db, saveDocente, deleteDocente, confirm, success, toast, user } = useApp();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Docente | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const puedeEditar = user?.rol === "admin" || user?.rol === "operador";

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.docentes.filter((d) => !t || [d.nombre, d.correo, d.telefono].some((v) => v.toLowerCase().includes(t)));
  }, [db.docentes, q]);

  const guardar = async () => {
    if (!form) return;
    const er: Record<string, string> = {};
    if (!form.nombre.trim()) er.nombre = "Nombre obligatorio";
    if (!form.escuelaId) er.escuelaId = "Selecciona la escuela";
    setErrs(er);
    if (Object.keys(er).length) return;
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveDocente({ ...form, id: form.id || uid() });
    success();
    setForm(null);
  };

  const eliminar = async (d: Docente) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará al docente "${d.nombre}".`, confirmText: "Eliminar", danger: true });
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
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Docentes por plantel · un docente tiene muchos estudiantes</p>
        </div>
        {puedeEditar && <button className="btn btn-primary" onClick={() => { setErrs({}); setForm(docenteVacio()); }}><Plus size={16} /> Nuevo docente</button>}
      </div>

      <div className="card p-4 mb-5 flex items-center gap-2.5 max-w-[460px]">
        <Search size={16} style={{ color: "var(--ink-faint)" }} />
        <input className="bg-transparent border-none outline-none w-full text-[13.5px]" style={{ color: "var(--ink)" }} placeholder="Buscar docente…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Docente</th><th>Escuela</th><th>Teléfono</th><th>Estudiantes</th><th>Observaciones</th>{puedeEditar && <th></th>}</tr></thead>
            <tbody>
              {lista.map((d) => {
                const n = db.estudiantes.filter((e) => e.docenteId === d.id).length;
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12px]" style={{ background: "var(--gold-tint)", color: "var(--gold-deep)" }}>{d.nombre[0]}</span>
                        <div className="leading-tight">
                          <div className="font-display font-semibold text-[13.5px]">{d.nombre}</div>
                          <div className="text-[11.5px] flex items-center gap-1" style={{ color: "var(--ink-faint)" }}><Mail size={11} /> {d.correo || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-[13px]">{db.escuelas.find((e) => e.id === d.escuelaId)?.nombre || "—"}</td>
                    <td className="text-[13px]">{d.telefono || "—"}</td>
                    <td><Badge tone="blue" dot>{n}</Badge></td>
                    <td className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{d.observaciones || "—"}</td>
                    {puedeEditar && (
                      <td>
                        <div className="flex justify-end gap-1">
                          <button className="icon-btn" onClick={() => { setErrs({}); setForm(d); }}><Pencil size={15} /></button>
                          {user?.rol === "admin" && <button className="icon-btn danger" onClick={() => eliminar(d)}><Trash2 size={15} /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={Users} title="Sin docentes" text="Registra el primer docente del plantel." />}
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar docente" : "Nuevo docente"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del docente" required error={errs.nombre} className="col-span-2">
              <input className={`input ${errs.nombre ? "err" : ""}`} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
            </Field>
            <Field label="Escuela" required error={errs.escuelaId} className="col-span-2">
              <select className={`select ${errs.escuelaId ? "err" : ""}`} value={form.escuelaId} onChange={(e) => setForm({ ...form, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Correo"><input className="input" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></Field>
            <Field label="Observaciones" className="col-span-2"><textarea className="textarea" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}><Check size={15} /> Sí, Guardar</button>
          </div>
        </Modal>
      )}
      <span className="hidden"><SectionHead title="" /></span>
    </div>
  );
}
