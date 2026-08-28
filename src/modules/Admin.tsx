import React, { useMemo, useRef, useState } from "react";
import {
  BarChart3, Boxes, Check, Copy, Download, Eye, EyeOff, GraduationCap, History, KeyRound,
  Package, Pencil, Plug, Plus, Save, ScanLine, ShieldCheck, Sparkles, Trash2, Upload, UserCog, Users, Wallet, X,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { CatAdicional, PaqueteEscuela, Rol, Usuario } from "../lib/data";
import {
  ACCESOS_DEFAULT, API_DOLARES, API_EUROS, DB_TABLES, MODULOS_GRUPOS, OPENROUTER_MODELOS, ORDEN_MATERIALES,
  PAQUETES, ROL_DESC, ROL_LABEL, ROLES_INFO, SUPABASE_SQL, TODOS_MODULOS,
  computeProduccion, downloadFile, estudianteTotales, fmtBs, fmtFecha, fmtFechaHoraViva, fmtHaceSegundos,
  fmtUSD, getAdicionales, getGrados, getSecciones, getTallas, toCSV, todayISO, uid,
} from "../lib/data";
import {
  Badge, Bar, EmptyState, Field, FilterSelect, FormFoot, FormSec, Modal, SearchInput, SectionHead,
  Switch, Toolbar, estadoPagoTone, useNow,
} from "../components/ui";

/* ============================================================
   REPORTES
   ============================================================ */
export function Reportes() {
  const { db, tasa, toast } = useApp();
  const [fEscuela, setFEscuela] = useState("");
  const [fDocente, setFDocente] = useState("");
  const [fGrado, setFGrado] = useState("");
  const [fSeccion, setFSeccion] = useState("");
  const [fPago, setFPago] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(() => db.estudiantes.filter((e) => {
    const t = estudianteTotales(e);
    if (fEscuela && e.escuelaId !== fEscuela) return false;
    if (fDocente && e.docenteId !== fDocente) return false;
    if (fGrado && e.grado !== fGrado) return false;
    if (fSeccion && e.seccion !== fSeccion) return false;
    if (fPago && t.estadoPago !== fPago) return false;
    if (fEstado && e.estadoPedido !== fEstado) return false;
    if (desde && e.fechaRegistro < desde) return false;
    if (hasta && e.fechaRegistro > hasta) return false;
    return true;
  }), [db.estudiantes, fEscuela, fDocente, fGrado, fSeccion, fPago, fEstado, desde, hasta]);

  const fin = useMemo(() => {
    let vendido = 0, cobrado = 0;
    for (const e of filtrados) { const t = estudianteTotales(e); vendido += t.total; cobrado += t.abonado; }
    return { vendido, cobrado, pendiente: Math.max(0, vendido - cobrado) };
  }, [filtrados]);
  const prod = useMemo(() => computeProduccion(filtrados.filter((e) => e.estadoPedido !== "Entregado")), [filtrados]);
  const porEscuela = useMemo(() => db.escuelas.map((es) => {
    const hijos = filtrados.filter((e) => e.escuelaId === es.id);
    return { nombre: es.nombre, n: hijos.length, vendido: hijos.reduce((s, e) => s + estudianteTotales(e).total, 0) };
  }).filter((x) => x.n > 0).sort((a, b) => b.vendido - a.vendido), [db.escuelas, filtrados]);
  const maxV = Math.max(1, porEscuela[0]?.vendido || 1);

  const exportFin = () => {
    downloadFile(`reporte-finanzas-${todayISO()}.csv`, toCSV(
      ["Pedido", "Estudiante", "Escuela", "Grado", "Registro", "Total USD", "Abonado USD", "Saldo USD", "Estado pago", "Estado pedido"],
      filtrados.map((e) => { const t = estudianteTotales(e); return [e.pedido, e.nombre, db.escuelas.find((x) => x.id === e.escuelaId)?.nombre || "", `${e.grado} ${e.seccion}`, e.fechaRegistro, t.total.toFixed(2), t.abonado.toFixed(2), t.saldo.toFixed(2), t.estadoPago, e.estadoPedido]; })
    ));
    toast("Reporte financiero exportado", "ok");
  };
  const exportProd = () => {
    downloadFile(`reporte-produccion-${todayISO()}.csv`, toCSV(["Material", "Cantidad"], Object.entries(prod.materiales).filter(([, q]) => q > 0).map(([m, q]) => [m, q])));
    toast("Reporte de producción exportado", "ok");
  };

  const kpis = [
    { icon: Wallet, l: "Total vendido", v: fmtUSD(fin.vendido), s: fmtBs(fin.vendido * tasa.usd), c: "var(--jyg-navy)", bg: "var(--tint-navy-2)" },
    { icon: Check, l: "Total cobrado", v: fmtUSD(fin.cobrado), s: fmtBs(fin.cobrado * tasa.usd), c: "var(--ok)", bg: "var(--tint-ok)" },
    { icon: History, l: "Total pendiente", v: fmtUSD(fin.pendiente), s: fmtBs(fin.pendiente * tasa.usd), c: "var(--danger)", bg: "var(--tint-danger)" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Reportes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Filtra por escuela, docente, grado, sección, pago, producción o fecha</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={exportFin}><Download size={15} /> Finanzas CSV</button>
          <button className="btn btn-primary" onClick={exportProd}><Download size={15} /> Producción CSV</button>
        </div>
      </div>

      <Toolbar count={filtrados.length} countLabel={filtrados.length === 1 ? "estudiante filtrado" : "estudiantes filtrados"}>
        <FilterSelect value={fEscuela} onChange={setFEscuela} allLabel="Escuela" width={180} options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} />
        <FilterSelect value={fDocente} onChange={setFDocente} allLabel="Docente" width={165} options={db.docentes.map((d) => ({ v: d.id, l: d.nombre }))} />
        <FilterSelect value={fGrado} onChange={setFGrado} allLabel="Grado" width={140} options={getGrados(db.config).map((g) => ({ v: g, l: g }))} />
        <FilterSelect value={fSeccion} onChange={setFSeccion} allLabel="Sección" width={110} options={getSecciones(db.config).map((s) => ({ v: s, l: s }))} />
        <FilterSelect value={fPago} onChange={setFPago} allLabel="Estado de pago" width={160} options={["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => ({ v: s, l: s }))} />
        <FilterSelect value={fEstado} onChange={setFEstado} allLabel="Producción" width={145} options={["Registrado", "Producción", "Impresión", "Empaque", "Entregado"].map((s) => ({ v: s, l: s }))} />
        <span className="d-flex align-items-center gap-1" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          <input type="date" className="input" style={{ width: 140, height: 34, fontSize: 12 }} value={desde} onChange={(e) => setDesde(e.target.value)} title="Desde" />
          →
          <input type="date" className="input" style={{ width: 140, height: 34, fontSize: 12 }} value={hasta} onChange={(e) => setHasta(e.target.value)} title="Hasta" />
        </span>
      </Toolbar>

      <div className="row g-3 mb-3">
        {kpis.map((k, i) => (
          <div key={k.l} className="col-12 col-md-4">
            <div className="card p-3 p-md-4 reveal" style={{ animationDelay: `${i * 70}ms`, borderLeft: `4px solid ${k.c}` }}>
              <div className="d-flex align-items-center gap-3">
                <span className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 46, height: 46, background: k.bg, color: k.c }}><k.icon size={20} /></span>
                <div>
                  <div className="font-display fw-bold" style={{ fontSize: 22, color: k.c, fontVariantNumeric: "tabular-nums" }}>{k.v}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--ink-faint)" }}>{k.l}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{k.s}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100">
            <SectionHead title="Producción" desc="Materiales requeridos por los pedidos filtrados" />
            {Object.entries(prod.materiales).filter(([, q]) => q > 0).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)", padding: "8px 0" }}>Sin materiales pendientes con los filtros actuales.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {ORDEN_MATERIALES.filter((m) => (prod.materiales[m] || 0) > 0).map((m) => {
                  const q = prod.materiales[m] || 0;
                  const mx = Math.max(...Object.values(prod.materiales));
                  return (
                    <div key={m} className="d-flex align-items-center gap-3">
                      <span className="fw-semibold text-truncate" style={{ fontSize: 13, width: 150, color: "var(--ink-soft)" }}>{m}</span>
                      <div className="flex-grow-1"><Bar pct={(q / mx) * 100} /></div>
                      <span className="font-display fw-bold" style={{ width: 38, textAlign: "right" }}>{q}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Pedidos pendientes: <b className="font-display">{filtrados.filter((e) => e.estadoPedido !== "Entregado").length}</b> · Entregados: <b className="font-display">{filtrados.filter((e) => e.estadoPedido === "Entregado").length}</b>
            </p>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100">
            <SectionHead title="Estudiantes por escuela" desc="Distribución del monto vendido" />
            {porEscuela.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-faint)", padding: "8px 0" }}>Sin datos con los filtros actuales.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {porEscuela.map((r, i) => (
                  <div key={r.nombre}>
                    <div className="d-flex justify-content-between align-items-baseline mb-1">
                      <span className="font-display fw-semibold text-truncate" style={{ fontSize: 12.5 }}>{i === 0 ? "★ " : ""}{r.nombre}</span>
                      <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{r.n} est. · <b style={{ color: "var(--jyg-navy)" }}>{fmtUSD(r.vendido)}</b></span>
                    </div>
                    <Bar pct={(r.vendido / maxV) * 100} color={i === 0 ? "var(--jyg-gold-deep)" : "var(--jyg-navy)"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-3 p-md-4 mt-3">
        <SectionHead title={`Detalle (${filtrados.length} estudiantes)`} desc="Estado de pago individual con los filtros aplicados" />
        <div className="table-responsive">
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Estudiante</th><th>Escuela</th><th>Grado</th><th>Registro</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Estado</th></tr></thead>
            <tbody>
              {filtrados.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id}>
                    <td className="font-display fw-bold" style={{ fontSize: 12 }}>{e.pedido}</td>
                    <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</td>
                    <td style={{ fontSize: 12 }}>{db.escuelas.find((x) => x.id === e.escuelaId)?.nombre || "—"}</td>
                    <td style={{ fontSize: 12 }}>{e.grado} “{e.seccion}”</td>
                    <td style={{ fontSize: 12 }}>{fmtFecha(e.fechaRegistro)}</td>
                    <td className="font-display fw-semibold tabular-nums" style={{ fontSize: 12.5 }}>{fmtUSD(t.total)}</td>
                    <td className="tabular-nums" style={{ color: "var(--ok)", fontSize: 12.5 }}>{fmtUSD(t.abonado)}</td>
                    <td className="font-display fw-bold tabular-nums" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)", fontSize: 12.5 }}>{fmtUSD(t.saldo)}</td>
                    <td><Badge tone={estadoPagoTone(t.estadoPago)} dot>{t.estadoPago}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && <EmptyState icon={BarChart3} title="Sin resultados" text="Ajusta los filtros para ver el detalle." />}
      </div>
    </div>
  );
}

/* ============================================================
   USUARIOS — roles, accesos y equipo
   ============================================================ */
const uVacio = (): Usuario => ({ id: "", nombre: "", usuario: "", rol: "operador", activo: true });

export function Usuarios() {
  const { db, user, saveUsuario, deleteUsuario, setCurrentUser, setRolPermisos, setRolActivo, confirm, success, toast } = useApp();
  const [rolSel, setRolSel] = useState<Rol>("admin");
  const [form, setForm] = useState<Usuario | null>(null);
  const [guardado, setGuardado] = useState(0);
  const [verMatriz, setVerMatriz] = useState(true);

  const permisos = (rol: Rol) => db.config.rolesPermisos?.[rol] ?? ACCESOS_DEFAULT[rol];
  const rolActivo = (rol: Rol) => db.config.rolesActivos?.[rol] !== false;
  const flash = () => { setGuardado(Date.now()); setTimeout(() => setGuardado(0), 1600); };

  const togglePermiso = (rol: Rol, ruta: string) => {
    const actual = permisos(rol);
    setRolPermisos(rol, actual.includes(ruta) ? actual.filter((r) => r !== ruta) : [...actual, ruta]);
    flash();
  };
  const toggleRol = async (rol: Rol) => {
    const activos = db.usuarios.filter((u) => u.rol === rol && u.activo).length;
    const encender = !rolActivo(rol);
    if (!encender && activos > 0) {
      const ok = await confirm({ title: "¿Desactivar este rol?", message: `${activos} usuario(s) con rol ${ROL_LABEL[rol]} perderán el acceso al sistema.`, confirmText: "Sí, desactivar", danger: true });
      if (!ok) return;
    }
    setRolActivo(rol, encender);
    flash();
  };
  const guardarU = async () => {
    if (!form || !form.nombre.trim() || !form.usuario.trim()) { toast("Completa nombre y usuario", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveUsuario({ ...form, id: form.id || uid() });
    success();
    setForm(null);
  };
  const eliminarU = async (u: Usuario) => {
    if (u.id === user.id) { toast("No puedes eliminar al usuario en sesión", "err"); return; }
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará a "${u.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deleteUsuario(u.id);
    toast("Usuario eliminado", "warn");
  };
  const cambiarRol = async (u: Usuario, rol: Rol) => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `${u.nombre} pasará a tener el rol ${ROL_LABEL[rol]}.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    saveUsuario({ ...u, rol });
    success("Rol actualizado");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Usuarios</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Roles y accesos del equipo JyG — los cambios se guardan al instante</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm(uVacio())}><Plus size={16} /> Nuevo usuario</button>
      </div>

      {/* Sesión actual */}
      <div className="card p-3 p-md-4 mb-3 d-flex align-items-center gap-3 flex-wrap" style={{ borderLeft: "4px solid var(--jyg-gold)" }}>
        <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 48, height: 48, background: "linear-gradient(150deg,var(--jyg-navy),#0b2e52)", color: "#ffd970", fontSize: 16 }}>{user.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
        <div className="flex-grow-1" style={{ minWidth: 160 }}>
          <div className="font-display fw-bold" style={{ fontSize: 15.5 }}>{user.nombre} <Badge tone="gold">Sesión actual</Badge></div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>@{user.usuario} · {ROL_LABEL[user.rol]} · {permisos(user.rol).length} de {TODOS_MODULOS.length} módulos activos</div>
        </div>
        <span className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: "var(--ok)", fontWeight: 700 }}>
          <span className="dot" style={{ background: "var(--ok)" }} /> En línea
        </span>
      </div>

      {/* Tarjetas de rol con switch */}
      <div className="row g-3 mb-3">
        {ROLES_INFO.map((r, i) => {
          const nUsers = db.usuarios.filter((u) => u.rol === r.id && u.activo).length;
          const activo = rolActivo(r.id);
          const nPermisos = permisos(r.id).length;
          const sel = rolSel === r.id;
          return (
            <div key={r.id} className="col-12 col-md-6 col-xl-3">
              <div className={`role-card reveal h-100 ${sel ? "sel" : ""}`} style={{ ["--rc" as any]: r.color, animationDelay: `${i * 60}ms`, opacity: activo ? 1 : 0.55 }} onClick={() => setRolSel(r.id)}>
                <div className="d-flex align-items-center gap-2">
                  <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 40, height: 40, background: `color-mix(in srgb, ${r.color} 14%, transparent)`, color: r.color }}><i className={`bi bi-${r.icon}`} style={{ fontSize: 18 }} /></span>
                  <div className="flex-grow-1">
                    <div className="font-display fw-bold" style={{ fontSize: 14 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.desc}</div>
                  </div>
                  <span onClick={(e) => e.stopPropagation()}>
                    <Switch checked={activo} onChange={() => void toggleRol(r.id)} />
                  </span>
                </div>
                <div className="d-flex gap-2 flex-wrap mt-1">
                  <Badge tone="blue"><Users size={11} /> {nUsers} usuarios</Badge>
                  <Badge tone={activo ? "green" : "slate"}>{nPermisos} módulos</Badge>
                  {sel && <Badge tone="gold">Editando accesos</Badge>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matriz de accesos */}
      <div className="card p-3 p-md-4 mb-3">
        <SectionHead
          title={`Accesos del rol: ${ROL_LABEL[rolSel]}`}
          desc={ROL_DESC[rolSel]}
          actions={
            <div className="d-flex align-items-center gap-2">
              {guardado > 0 && <Badge tone="green" dot>Guardado</Badge>}
              <button className="btn btn-ghost btn-xs" onClick={() => setVerMatriz(!verMatriz)}>{verMatriz ? "Ocultar matriz" : "Ver matriz"}</button>
              <button className="btn btn-soft btn-xs" onClick={() => { setRolPermisos(rolSel, [...TODOS_MODULOS]); flash(); }}>Marcar todos</button>
              <button className="btn btn-ghost btn-xs" onClick={() => { setRolPermisos(rolSel, []); flash(); }}>Quitar todos</button>
            </div>
          }
        />
        {verMatriz && (
          <div className="row g-3">
            {MODULOS_GRUPOS.map((g) => {
              const enGrupo = g.items.filter((i) => permisos(rolSel).includes(i.ruta)).length;
              return (
                <div key={g.seccion} className="col-12 col-md-6 col-xl-4">
                  <div className="rounded-3 p-2 p-md-3 h-100" style={{ background: "var(--card-bg-2)" }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className={`bi bi-${g.icon}`} style={{ color: "var(--jyg-gold-deep)" }} />
                      <span className="font-display fw-bold" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: 1 }}>{g.seccion}</span>
                      <Badge tone={enGrupo === g.items.length ? "green" : enGrupo === 0 ? "red" : "amber"}>{enGrupo}/{g.items.length}</Badge>
                    </div>
                    <div className="d-flex flex-column">
                      {g.items.map((m) => {
                        const on = permisos(rolSel).includes(m.ruta);
                        return (
                          <div key={m.ruta} className={`perm-row ${on ? "on" : ""}`}>
                            <span className="perm-dot" style={{ background: on ? "var(--ok)" : "var(--line)" }} />
                            <span className="flex-grow-1" style={{ fontSize: 13 }}>{m.label}</span>
                            <Switch checked={on} onChange={() => togglePermiso(rolSel, m.ruta)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Equipo */}
      <div className="card p-3 p-md-4">
        <SectionHead title={`Equipo JyG (${db.usuarios.length})`} desc="Activa, desactiva o reasigna el rol de cada miembro" />
        <div className="row g-3">
          {db.usuarios.map((u, i) => (
            <div key={u.id} className="col-12 col-md-6 col-xl-4">
              <div className="user-card h-100" style={{ opacity: u.activo ? 1 : 0.55 }}>
                <span className="av" style={{ width: 44, height: 44, fontSize: 14 }}>{u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="font-display fw-bold text-truncate" style={{ fontSize: 13.5 }}>{u.nombre} {u.id === user.id && <Badge tone="gold">Usted</Badge>}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>@{u.usuario}</div>
                  <select className="select mt-1" style={{ height: 30, fontSize: 12 }} value={u.rol} onChange={(e) => void cambiarRol(u, e.target.value as Rol)}>
                    {ROLES_INFO.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div className="d-flex flex-column align-items-end gap-1">
                  <Switch checked={u.activo} onChange={async (v) => {
                    if (!v && u.id === user.id) { toast("No puedes desactivar al usuario en sesión", "err"); return; }
                    saveUsuario({ ...u, activo: v });
                    toast(v ? "Usuario activado" : "Usuario desactivado", v ? "ok" : "warn");
                  }} />
                  <div className="d-flex gap-1">
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title="Editar" onClick={() => setForm(u)}><Pencil size={12} /></button>
                    <button className="icon-btn danger" style={{ width: 28, height: 28 }} title="Eliminar" onClick={() => void eliminarU(u)}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {form && (
        <Modal open onClose={() => setForm(null)} title={form.id ? "Editar usuario" : "Nuevo usuario"}>
          <div className="f-grid">
            <FormSec icon={<UserCog size={15} />}>Credenciales</FormSec>
            <Field label="Nombre completo" required span="c-12"><input className="input" autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
            <Field label="Usuario (login)" required span="c-6"><input className="input" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></Field>
            <Field label="Rol" span="c-6">
              <select className="select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
                {ROLES_INFO.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
          </div>
          <FormFoot onCancel={() => setForm(null)} onSave={() => void guardarU()} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */
const peVacio = (): PaqueteEscuela => ({ id: "", escuelaId: "", nombre: "", tipoPaqueteId: "premium", precio: 45, articulos: PAQUETES.premium.incluye.map((n) => ({ nombre: n, cantidad: 1 })), nota: "", activo: true, creado: todayISO() });

export function Configuracion() {
  const { db, setConfig, confirm, success, toast, tasa, refreshTasa, setOcrOpen, exportBackup, importBackup, savePaqueteEscuela, deletePaqueteEscuela } = useApp();
  const [emp, setEmp] = useState({ ...db.config.empresa });
  const [tasaM, setTasaM] = useState(String(db.config.tasaManualUSD || db.config.tasaFallback));
  const [orKey, setOrKey] = useState(db.config.openRouterKey || "");
  const [orModel, setOrModel] = useState(db.config.openRouterModel || OPENROUTER_MODELOS[0].id);
  const [verOr, setVerOr] = useState(false);
  const [orTest, setOrTest] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [peForm, setPeForm] = useState<PaqueteEscuela | null>(null);
  const [nuevoProd, setNuevoProd] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaTalla, setNuevaTalla] = useState<"" | "letras" | "numerica">("");
  const [nuevoItem, setNuevoItem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const adicionales = getAdicionales(db.config);
  const grados = getGrados(db.config);
  const secciones = getSecciones(db.config);
  const tallas = getTallas(db.config);

  const guardarEmpresa = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Se actualizarán los datos de la empresa en tickets y portal.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ empresa: emp });
    success();
  };
  const guardarTasa = async () => {
    const n = Number(tasaM);
    if (!n || n <= 0) { toast("Tasa inválida", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `La tasa manual ${fmtBs(n)}/$ quedará activa y registrada en el historial.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ usarApi: false, usarTasaManual: true, tasaManualUSD: n, tasaFallback: n });
    refreshTasa();
    success("Tasa manual guardada");
  };
  const toggleApi = () => {
    const irApi = db.config.usarTasaManual || !db.config.usarApi;
    setConfig({ usarApi: irApi, usarTasaManual: false });
    if (irApi) { toast("Consultando ve.dolarapi.com…", "ok"); refreshTasa(); }
    else toast("Usando tasa manual", "warn");
  };
  const guardarOr = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "La API key y el modelo se guardarán en tu base de datos Supabase.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ openRouterKey: orKey.trim(), openRouterModel: orModel });
    success("Motor Qwen configurado");
  };
  const probarOr = async () => {
    const k = orKey.trim();
    if (!k) { toast("Pega primero tu API key de OpenRouter", "warn"); return; }
    setOrTest("busy");
    try {
      const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${k}` } });
      if (!r.ok) throw new Error(`OpenRouter respondió ${r.status}`);
      const j = await r.json();
      setOrTest("ok");
      toast(`Conectado ✓ · ${j?.data?.length || "varios"} modelos disponibles`, "ok");
    } catch (e: any) { setOrTest("fail"); toast(e?.message || "No se pudo conectar", "err"); }
  };
  const copiar = (t: string, q: string) => { navigator.clipboard?.writeText(t).then(() => toast(`${q} copiado`, "ok")).catch(() => toast("No se pudo copiar", "err")); };

  /* Catálogo editable */
  const setCat = (lista: CatAdicional[]) => setConfig({ adicionales: lista });
  const agregarProd = async () => {
    const p = Number(nuevoPrecio);
    if (!nuevoProd.trim() || !p || p <= 0) { toast("Completa nombre y precio válido", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Se agregará "${nuevoProd}" al catálogo de adicionales.`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setCat([...adicionales, { nombre: nuevoProd.trim(), precio: p, talla: nuevaTalla }]);
    success("Producto agregado");
    setNuevoProd(""); setNuevoPrecio(""); setNuevaTalla("");
  };
  const quitarProd = async (nombre: string) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará "${nombre}" del catálogo.`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    setCat(adicionales.filter((a) => a.nombre !== nombre));
    toast("Producto eliminado", "warn");
  };
  const editarPrecioProd = (nombre: string, precio: number) => setCat(adicionales.map((a) => (a.nombre === nombre ? { ...a, precio } : a)));
  const editarTallaProd = (nombre: string, talla: "" | "letras" | "numerica") => setCat(adicionales.map((a) => (a.nombre === nombre ? { ...a, talla } : a)));

  /* Listas editables */
  const agregarItem = async (tipo: "grados" | "secciones" | "tallas") => {
    const v = nuevoItem.trim();
    if (!v) { toast("Escribe un valor", "err"); return; }
    const actual = tipo === "grados" ? grados : tipo === "secciones" ? secciones : tallas;
    if (actual.includes(v)) { toast("Ese valor ya existe", "warn"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: `Se agregará "${v}".`, confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig(tipo === "grados" ? { grados: [...actual, v] } : tipo === "secciones" ? { secciones: [...actual, v] } : { tallas: [...actual, v] });
    success();
    setNuevoItem("");
  };
  const quitarItem = async (tipo: "grados" | "secciones" | "tallas", v: string) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará "${v}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    const actual = tipo === "grados" ? grados : tipo === "secciones" ? secciones : tallas;
    setConfig(tipo === "grados" ? { grados: actual.filter((x) => x !== v) } : tipo === "secciones" ? { secciones: actual.filter((x) => x !== v) } : { tallas: actual.filter((x) => x !== v) });
    toast("Eliminado", "warn");
  };

  const guardarPe = async () => {
    if (!peForm || !peForm.nombre.trim() || !peForm.escuelaId) { toast("Completa nombre y escuela", "err"); return; }
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Verifique la información antes de continuar.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    savePaqueteEscuela({ ...peForm, id: peForm.id || uid(), creado: peForm.creado || todayISO() });
    success();
    setPeForm(null);
  };
  const eliminarPe = async (p: PaqueteEscuela) => {
    const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se eliminará "${p.nombre}".`, confirmText: "Eliminar", danger: true });
    if (!ok) return;
    deletePaqueteEscuela(p.id);
    toast("Paquete eliminado", "warn");
  };

  const ListaEditor = ({ tipo, titulo, icono, items }: { tipo: "grados" | "secciones" | "tallas"; titulo: string; icono: React.ReactNode; items: string[] }) => (
    <div className="rounded-3 p-3 h-100" style={{ background: "var(--card-bg-2)" }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        {icono}
        <span className="font-display fw-bold" style={{ fontSize: 13 }}>{titulo}</span>
        <Badge tone="blue">{items.length}</Badge>
      </div>
      <div className="d-flex flex-wrap gap-1 mb-2">
        {items.map((g) => (
          <span key={g} className="badge" style={{ background: "var(--card-bg)", color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
            {g}
            <button className="border-0 bg-transparent p-0 d-flex" style={{ color: "var(--ink-faint)", cursor: "pointer" }} onClick={() => void quitarItem(tipo, g)}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="d-flex gap-1">
        <input className="input" style={{ height: 32, fontSize: 12 }} placeholder="Nuevo…" value={nuevoItem} onChange={(e) => setNuevoItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void agregarItem(tipo); }} />
        <button className="btn btn-soft btn-xs" onClick={() => void agregarItem(tipo)}><Plus size={12} /></button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Sistema</div>
          <h1>Configuración</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Empresa, tasa del día, motor de escaneo, catálogos y respaldo</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={() => { downloadFile(`respaldo-jyg-${todayISO()}.json`, exportBackup(), "application/json"); toast("Respaldo descargado", "ok"); }}><Download size={15} /> Exportar respaldo</button>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Restaurar</button>
          <input ref={fileRef} type="file" accept="application/json" className="d-none" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            const ok = await confirm({ title: "¿Restaurar este respaldo?", message: "Se reemplazarán todos los datos actuales del navegador.", confirmText: "Sí, Restaurar", danger: true });
            if (!ok) return;
            const texto = await f.text();
            if (importBackup(texto)) success("Respaldo restaurado"); else toast("El archivo no es un respaldo válido", "err");
          }} />
        </div>
      </div>

      <div className="row g-3">
        {/* Empresa */}
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100">
            <SectionHead title="Datos de la empresa" desc="Aparecen en tickets, portal y mensajes" />
            <div className="f-grid">
              <Field label="Nombre" span="c-6"><input className="input" value={emp.nombre} onChange={(e) => setEmp({ ...emp, nombre: e.target.value })} /></Field>
              <Field label="RIF" span="c-6"><input className="input" value={emp.rif} onChange={(e) => setEmp({ ...emp, rif: e.target.value })} /></Field>
              <Field label="Dirección" span="c-12"><input className="input" value={emp.direccion} onChange={(e) => setEmp({ ...emp, direccion: e.target.value })} /></Field>
              <Field label="Teléfono" span="c-6"><input className="input" value={emp.telefono} onChange={(e) => setEmp({ ...emp, telefono: e.target.value })} /></Field>
              <span className="c-6 d-flex align-items-end"><button className="btn btn-primary w-100" onClick={() => void guardarEmpresa()}><Save size={15} /> Guardar empresa</button></span>
            </div>
          </div>
        </div>

        {/* Tasa del día */}
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100">
            <SectionHead title="Tasa del día" desc="Fuente oficial BCV vía ve.dolarapi.com" actions={
              <Badge tone={db.config.usarTasaManual ? "amber" : "green"} dot>{db.config.usarTasaManual ? "Tasa manual" : tasa.apiOk ? "DolarAPI en vivo" : "Respaldo"}</Badge>
            } />
            <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3" style={{ background: "var(--card-bg-2)" }}>
              <div>
                <div className="font-display fw-bold tabular-nums" style={{ fontSize: 24, color: "var(--jyg-navy)" }}>{fmtBs(tasa.usd)}<small style={{ fontSize: 11, opacity: .6 }}> /$</small></div>
                {tasa.eur > 0 && <div className="tabular-nums" style={{ fontSize: 13, color: "var(--jyg-gold-deep)" }}>{fmtBs(tasa.eur)} /€</div>}
              </div>
              <div className="ms-auto text-end" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {tasa.apiOk ? "Actualizada desde la API" : "Última tasa conocida"}<br />
                <a href={API_DOLARES} target="_blank" rel="noreferrer" style={{ color: "var(--jyg-navy)" }}>dolares</a> · <a href={API_EUROS} target="_blank" rel="noreferrer" style={{ color: "var(--jyg-navy)" }}>euros</a>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-end">
              <div className="flex-grow-1" style={{ minWidth: 140 }}>
                <label className="form-label">Tasa manual (Bs por $1)</label>
                <input type="number" step="0.01" className="input" value={tasaM} onChange={(e) => setTasaM(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => void guardarTasa()}><Save size={15} /> Guardar manual</button>
              <button className="btn btn-soft" onClick={toggleApi}>{db.config.usarTasaManual || !db.config.usarApi ? "Volver a la API" : "Usar manual"}</button>
            </div>
          </div>
        </div>

        {/* Motor de escaneo Qwen */}
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100" style={{ borderTop: "3px solid var(--jyg-gold)" }}>
            <SectionHead title="Motor de Escaneo · Qwen" desc="IA vía OpenRouter — la API key se guarda en Supabase" actions={
              <Badge tone={(db.config.openRouterKey || "").trim() ? "green" : "amber"} dot>{(db.config.openRouterKey || "").trim() ? "Configurado" : "Sin API key"}</Badge>
            } />
            <Field label="API Key de OpenRouter" hint="sk-or-v1-… · consíguela gratis en openrouter.ai/keys">
              <div className="d-flex gap-1">
                <input type={verOr ? "text" : "password"} className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="sk-or-v1-…" value={orKey} onChange={(e) => setOrKey(e.target.value)} />
                <button className="icon-btn" title={verOr ? "Ocultar" : "Mostrar"} onClick={() => setVerOr(!verOr)}>{verOr ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </Field>
            <div className="mt-3">
              <Field label="Modelo Qwen">
                <select className="select" value={orModel} onChange={(e) => setOrModel(e.target.value)}>
                  {OPENROUTER_MODELOS.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.recomendado ? " · recomendado" : ""} — {m.desc}</option>)}
                </select>
              </Field>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <button className="btn btn-primary btn-sm" onClick={() => void guardarOr()}><Save size={14} /> Guardar en Supabase</button>
              <button className="btn btn-ghost btn-sm" onClick={() => void probarOr()} disabled={orTest === "busy"}>
                <Plug size={14} className={orTest === "busy" ? "spin" : ""} />
                {orTest === "busy" ? "Probando…" : orTest === "ok" ? "Conectado ✓" : orTest === "fail" ? "Reintentar" : "Probar conexión"}
              </button>
              <button className="btn btn-soft btn-sm" onClick={() => setOcrOpen(true)}><ScanLine size={14} /> Abrir escáner</button>
            </div>
          </div>
        </div>

        {/* Cuenta de servicio OCR (referencia) */}
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100">
            <SectionHead title="Cuenta de servicio OCR" desc="Credenciales de Google Cloud Vision (referencia)" actions={<Badge tone="green" dot>Activa</Badge>} />
            <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
              <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: "var(--card-bg-2)" }}>
                <KeyRound size={14} style={{ color: "var(--jyg-navy)" }} />
                <span className="flex-grow-1 text-truncate tabular-nums" style={{ color: "var(--ink-soft)", fontSize: 12 }}>ocr-esca@thermal-scene-505819-t0.iam.gserviceaccount.com</span>
                <button className="icon-btn" style={{ width: 28, height: 28 }} title="Copiar" onClick={() => copiar("ocr-esca@thermal-scene-505819-t0.iam.gserviceaccount.com", "Correo")}><Copy size={12} /></button>
              </div>
              <p className="m-0" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                <ShieldCheck size={12} style={{ verticalAlign: -2, color: "var(--ok)" }} /> La clave privada no se guarda en el código por seguridad — se administra desde Google Cloud IAM.
              </p>
            </div>
          </div>
        </div>

        {/* Catálogo de adicionales editable */}
        <div className="col-12">
          <div className="card p-3 p-md-4">
            <SectionHead title="Catálogo de adicionales" desc="Edita precios y tallas, agrega o elimina productos — los cambios se guardan al instante" actions={<Badge tone="blue">{adicionales.length} productos</Badge>} />
            <div className="table-responsive">
              <table className="tbl">
                <thead><tr><th>Producto</th><th style={{ width: 130 }}>Precio USD</th><th style={{ width: 190 }}>Talla</th><th style={{ width: 70 }} className="text-end">Acción</th></tr></thead>
                <tbody>
                  {adicionales.map((a) => (
                    <tr key={a.nombre}>
                      <td className="font-display fw-semibold" style={{ fontSize: 13 }}>{a.nombre}</td>
                      <td>
                        <input type="number" step="0.5" min="0" className="input" style={{ height: 32, width: 110, fontSize: 12.5 }} defaultValue={a.precio} onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== a.precio) editarPrecioProd(a.nombre, v); }} />
                      </td>
                      <td>
                        <div className="d-flex rounded-pill p-1 gap-1" style={{ background: "var(--card-bg-2)", width: "fit-content" }}>
                          {([["", "Sin"], ["letras", "XS–XXL"], ["numerica", "N°"]] as const).map(([v, l]) => (
                            <button key={v} onClick={() => editarTallaProd(a.nombre, v)} className="border-0 font-display fw-semibold rounded-pill" style={{ fontSize: 10.5, padding: "3px 9px", background: a.talla === v ? "var(--card-bg)" : "transparent", color: a.talla === v ? "var(--jyg-navy)" : "var(--ink-faint)", boxShadow: a.talla === v ? "var(--shadow-1)" : "none", cursor: "pointer" }}>{l}</button>
                          ))}
                        </div>
                      </td>
                      <td className="text-end"><button className="icon-btn danger" style={{ width: 28, height: 28 }} title="Eliminar" onClick={() => void quitarProd(a.nombre)}><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-3 align-items-end">
              <div><label className="form-label">Nuevo producto</label><input className="input" style={{ width: 190 }} placeholder="Ej: Gorro de grado" value={nuevoProd} onChange={(e) => setNuevoProd(e.target.value)} /></div>
              <div><label className="form-label">Precio USD</label><input type="number" step="0.5" min="0" className="input" style={{ width: 110 }} placeholder="0.00" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} /></div>
              <div>
                <label className="form-label">Talla</label>
                <select className="select" style={{ width: 130 }} value={nuevaTalla} onChange={(e) => setNuevaTalla(e.target.value as any)}>
                  <option value="">Sin talla</option><option value="letras">Letras (XS–XXL)</option><option value="numerica">Numérica</option>
                </select>
              </div>
              <button className="btn btn-gold" onClick={() => void agregarProd()}><Plus size={15} /> Agregar producto</button>
            </div>
          </div>
        </div>

        {/* Grados, secciones y tallas */}
        <div className="col-12">
          <div className="card p-3 p-md-4">
            <SectionHead title="Grados, Secciones y Tallas" desc="Listas desplegables del sistema — agrega o elimina valores" />
            <div className="row g-3">
              <div className="col-12 col-md-4"><ListaEditor tipo="grados" titulo="Grados" icono={<GraduationCap size={15} style={{ color: "var(--jyg-navy)" }} />} items={grados} /></div>
              <div className="col-12 col-md-4"><ListaEditor tipo="secciones" titulo="Secciones" icono={<Users size={15} style={{ color: "var(--jyg-navy)" }} />} items={secciones} /></div>
              <div className="col-12 col-md-4"><ListaEditor tipo="tallas" titulo="Tallas de ropa" icono={<Boxes size={15} style={{ color: "var(--jyg-navy)" }} />} items={tallas} /></div>
            </div>
          </div>
        </div>

        {/* Paquetes por escuela */}
        <div className="col-12">
          <div className="card p-3 p-md-4">
            <SectionHead title="Paquetes por escuela" desc="Combos negociados con cada plantel, con sus artículos" actions={
              <button className="btn btn-primary btn-sm" onClick={() => setPeForm(peVacio())}><Plus size={14} /> Asignar paquete</button>
            } />
            {db.paquetesEscuelas.length === 0 ? (
              <EmptyState icon={Package} title="Sin paquetes asignados" text="Crea el primer paquete negociado por escuela." />
            ) : (
              <div className="row g-3">
                {db.paquetesEscuelas.map((p) => {
                  const es = db.escuelas.find((e) => e.id === p.escuelaId);
                  const tipo = PAQUETES[p.tipoPaqueteId];
                  return (
                    <div key={p.id} className="col-12 col-md-6 col-xl-4">
                      <div className="card p-3 h-100 card-lift" style={{ borderLeft: `4px solid ${tipo?.color || "var(--jyg-navy)"}`, opacity: p.activo ? 1 : 0.55 }}>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="font-display fw-bold" style={{ fontSize: 14 }}>{p.nombre}</span>
                          <Badge tone={p.tipoPaqueteId === "lujo" ? "gold" : p.tipoPaqueteId === "premium" ? "green" : "slate"}>{tipo?.nombre || "Personalizado"}</Badge>
                          <Badge tone={p.activo ? "green" : "red"} dot>{p.activo ? "Activo" : "Inactivo"}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0" }}>{es?.nombre || "Escuela"} · <b className="font-display" style={{ color: "var(--jyg-navy)", fontSize: 16 }}>{fmtUSD(p.precio)}</b></div>
                        <div className="d-flex flex-wrap gap-1 mb-2">
                          {p.articulos.slice(0, 5).map((a) => <span key={a.nombre} className="badge" style={{ background: "var(--card-bg-2)", color: "var(--ink-soft)", fontSize: 10 }}>{a.cantidad}× {a.nombre}</span>)}
                          {p.articulos.length > 5 && <span className="badge" style={{ background: "var(--card-bg-2)", color: "var(--ink-faint)", fontSize: 10 }}>+{p.articulos.length - 5}</span>}
                        </div>
                        {p.nota && <p className="m-0 mb-2" style={{ fontSize: 11, fontStyle: "italic", color: "var(--ink-faint)" }}>{p.nota}</p>}
                        <div className="d-flex gap-1 mt-auto">
                          <button className="btn btn-soft btn-xs" onClick={() => setPeForm(p)}><Pencil size={11} /> Editar</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => { savePaqueteEscuela({ ...p, activo: !p.activo }); toast(p.activo ? "Paquete desactivado" : "Paquete activado", "warn"); }}>{p.activo ? "Desactivar" : "Activar"}</button>
                          <button className="icon-btn danger" style={{ width: 26, height: 26 }} onClick={() => void eliminarPe(p)}><Trash2 size={11} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {peForm && (
        <Modal open onClose={() => setPeForm(null)} size="lg" title={peForm.id ? "Editar paquete por escuela" : "Asignar paquete a escuela"}>
          <div className="f-grid">
            <FormSec icon={<Package size={15} />}>Identificación</FormSec>
            <Field label="Nombre del paquete" required span="c-6"><input className="input" autoFocus value={peForm.nombre} onChange={(e) => setPeForm({ ...peForm, nombre: e.target.value })} placeholder="Ej: Paquete VIP Bolívar" /></Field>
            <Field label="Escuela" required span="c-6">
              <select className="select" value={peForm.escuelaId} onChange={(e) => setPeForm({ ...peForm, escuelaId: e.target.value })}>
                <option value="">— Seleccione —</option>
                {db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Tipo de paquete" span="c-4">
              <select className="select" value={peForm.tipoPaqueteId} onChange={(e) => {
                const t = e.target.value;
                setPeForm({ ...peForm, tipoPaqueteId: t, articulos: PAQUETES[t] ? PAQUETES[t].incluye.map((n) => ({ nombre: n, cantidad: 1 })) : peForm.articulos, precio: PAQUETES[t] ? PAQUETES[t].precioBase : peForm.precio });
              }}>
                {Object.values(PAQUETES).map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${p.precioBase}</option>)}
                <option value="personalizado">Personalizado</option>
              </select>
            </Field>
            <Field label="Precio negociado (USD)" span="c-4"><input type="number" min="0" step="0.5" className="input" value={peForm.precio} onChange={(e) => setPeForm({ ...peForm, precio: Number(e.target.value) || 0 })} /></Field>
            <Field label="Activo" span="c-4">
              <div className="d-flex align-items-center gap-2 h-100"><Switch checked={peForm.activo} onChange={(v) => setPeForm({ ...peForm, activo: v })} /> <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{peForm.activo ? "Disponible para ventas" : "Pausado"}</span></div>
            </Field>
            <FormSec icon={<Boxes size={15} />}>Artículos incluidos</FormSec>
            <div className="c-12 d-flex flex-column gap-1">
              {peForm.articulos.map((a, i) => (
                <div key={i} className="d-flex align-items-center gap-2">
                  <input className="input" style={{ height: 34 }} value={a.nombre} onChange={(e) => setPeForm({ ...peForm, articulos: peForm.articulos.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)) })} />
                  <input type="number" min="1" className="input" style={{ height: 34, width: 80 }} value={a.cantidad} onChange={(e) => setPeForm({ ...peForm, articulos: peForm.articulos.map((x, j) => (j === i ? { ...x, cantidad: Number(e.target.value) || 1 } : x)) })} />
                  <button className="icon-btn danger" style={{ width: 30, height: 30 }} onClick={() => setPeForm({ ...peForm, articulos: peForm.articulos.filter((_, j) => j !== i) })}><X size={13} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-xs w-100" onClick={() => setPeForm({ ...peForm, articulos: [...peForm.articulos, { nombre: "Nuevo artículo", cantidad: 1 }] })}><Plus size={12} /> Agregar artículo</button>
            </div>
            <Field label="Nota / acuerdo" span="c-12"><textarea className="textarea" value={peForm.nota} onChange={(e) => setPeForm({ ...peForm, nota: e.target.value })} /></Field>
          </div>
          <FormFoot onCancel={() => setPeForm(null)} onSave={() => void guardarPe()} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   INTEGRACIONES — Supabase + historial de tasas
   ============================================================ */
export function Integraciones() {
  const { db, setConfig, confirm, success, toast, testCloud, syncToCloud, restoreFromCloud, syncInfo, syncing, rtEstado, deleteTasaHistorial, clearTasaHistorial } = useApp();
  const [sbUrl, setSbUrl] = useState(db.config.supabaseUrl);
  const [sbKey, setSbKey] = useState(db.config.supabaseKey);
  const [verKey, setVerKey] = useState(false);
  const [test, setTest] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [testInfo, setTestInfo] = useState<{ tablas: number; filas: number } | null>(null);
  const [verSql, setVerSql] = useState(false);
  const [tabEstado, setTabEstado] = useState<Record<string, "busy" | "ok" | "err">>({});
  const [autoSync, setAutoSync] = useState(db.config.autoSyncCloud);
  const now = useNow(1000);
  const histRef = useRef<HTMLInputElement>(null);

  const guardarSb = async () => {
    const ok = await confirm({ title: "¿Desea guardar este registro?", message: "Las credenciales de Supabase se guardarán en este navegador.", confirmText: "Sí, Guardar" });
    if (!ok) return;
    setConfig({ supabaseUrl: sbUrl.trim(), supabaseKey: sbKey.trim(), autoSyncCloud: autoSync });
    success("Credenciales de Supabase guardadas");
  };
  const probar = async () => {
    setTest("busy");
    try {
      const info = await testCloud(sbUrl.trim(), sbKey.trim());
      setTestInfo(info);
      setTest("ok");
      toast(`Conectado ✓ · ${info.tablas} tablas · ${info.filas} filas`, "ok");
    } catch (e: any) { setTest("fail"); toast(e?.message || "No se pudo conectar", "err"); }
  };
  const subir = async () => {
    const ok = await confirm({ title: "¿Subir la base completa a Supabase?", message: "Las 14 tablas del CRM reemplazarán los datos actuales en la nube.", confirmText: "Sí, Subir" });
    if (!ok) return;
    await syncToCloud((t, s) => setTabEstado((v) => ({ ...v, [t]: s })));
  };
  const restaurar = async () => {
    const ok = await confirm({ title: "¿Restaurar desde Supabase?", message: "Los datos locales se reemplazarán por los de la nube.", confirmText: "Sí, Restaurar", danger: true });
    if (!ok) return;
    await restoreFromCloud();
  };

  const paso1 = sbUrl.trim().length > 0 && sbKey.trim().length > 0;
  const paso2 = test === "ok";
  const hist = [...db.historialTasas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultimos = hist.slice(-14);
  const maxUsd = Math.max(...ultimos.map((h) => h.usd), 1);
  const minUsd = Math.min(...ultimos.map((h) => h.usd));
  const W = 560, H = 120, P = 10;
  const pts = ultimos.map((h, i) => `${P + (i * (W - P * 2)) / Math.max(1, ultimos.length - 1)},${P + (H - P * 2) * (1 - (h.usd - minUsd) / Math.max(0.01, maxUsd - minUsd))}`).join(" ");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Sistema</div>
          <h1>Integraciones</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Base de datos en Supabase, historial de la tasa del día y APIs conectadas</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Badge tone={rtEstado === "on" ? "green" : rtEstado === "error" ? "red" : "slate"} dot>
            Tiempo real: {rtEstado === "on" ? "Conectado" : rtEstado === "error" ? "Sin conexión" : "Inactivo"}
          </Badge>
          {syncInfo && (
            <Badge tone={syncInfo.ok ? "green" : "red"} dot>
              {syncInfo.msg} · {fmtHaceSegundos(syncInfo.last, now)}
            </Badge>
          )}
        </div>
      </div>

      {/* Barra de progreso de pasos */}
      <div className="card p-3 mb-3 d-flex align-items-center gap-2 flex-wrap">
        {[
          { n: 1, t: "Conectar", done: paso1 },
          { n: 2, t: "Crear esquema SQL", done: paso2 },
          { n: 3, t: "Sincronizar datos", done: syncInfo?.ok || false },
        ].map((p, i) => (
          <React.Fragment key={p.n}>
            {i > 0 && <span className="flex-grow-1" style={{ minWidth: 30, height: 2, background: p.done ? "var(--ok)" : "var(--line)", borderRadius: 2 }} />}
            <span className="d-flex align-items-center gap-2">
              <span className="d-flex align-items-center justify-content-center rounded-circle font-display fw-bold" style={{ width: 28, height: 28, fontSize: 12, background: p.done ? "var(--ok)" : "var(--card-bg-2)", color: p.done ? "#fff" : "var(--ink-faint)", transition: "background .3s" }}>{p.done ? <Check size={14} /> : p.n}</span>
              <span className="font-display fw-semibold" style={{ fontSize: 12.5, color: p.done ? "var(--ok)" : "var(--ink-soft)" }}>{p.t}</span>
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="row g-3">
        {/* Paso 1: conexión */}
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100" style={{ borderLeft: "4px solid var(--jyg-navy)" }}>
            <SectionHead title="1 · Proyecto Supabase del equipo JyG" desc="Ya conectado — cada cambio se sube solo y se lee en tiempo real" actions={
              <Badge tone={paso1 ? "green" : "slate"} dot>{paso1 ? "Conectado y automático" : "Sin configurar"}</Badge>
            } />
            <Field label="URL del proyecto">
              <input className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="https://xxxx.supabase.co" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
            </Field>
            <div className="mt-3">
              <Field label="Anon key (pública)">
                <div className="d-flex gap-1">
                  <input type={verKey ? "text" : "password"} className="input" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="eyJhbGciOi…" value={sbKey} onChange={(e) => setSbKey(e.target.value)} />
                  <button className="icon-btn" title={verKey ? "Ocultar" : "Mostrar"} onClick={() => setVerKey(!verKey)}>{verKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </Field>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-3 align-items-center">
              <button className="btn btn-primary btn-sm" onClick={() => void guardarSb()}><Save size={14} /> Guardar credenciales</button>
              <button className="btn btn-ghost btn-sm" onClick={() => void probar()} disabled={test === "busy"}>
                <Plug size={14} className={test === "busy" ? "spin" : ""} />
                {test === "busy" ? "Probando…" : test === "ok" ? `Conectado ✓ (${testInfo?.tablas} tablas)` : test === "fail" ? "Reintentar" : "Probar conexión"}
              </button>
            </div>
            <label className="d-flex align-items-center gap-2 mt-3" style={{ fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}>
              <Switch checked={autoSync} onChange={(v) => { setAutoSync(v); setConfig({ autoSyncCloud: v }); toast(v ? "Auto-sincronización activada (cada cambio)" : "Auto-sincronización apagada", "ok"); }} />
              Sincronizar automáticamente tras cada cambio (2.5 s)
            </label>
            <p className="mt-2 mb-0 d-flex align-items-center gap-2" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              <i className="bi bi-broadcast-pin" style={{ color: rtEstado === "on" ? "var(--ok)" : "var(--ink-faint)" }} />
              Lectura en tiempo real: los cambios hechos en otro dispositivo aparecen aquí al instante.
            </p>
            <p className="mt-2 mb-0" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
              <ShieldCheck size={12} style={{ verticalAlign: -2, color: "var(--ok)" }} /> La anon key es pública por diseño; la seguridad la da RLS en Supabase.
            </p>
          </div>
        </div>

        {/* Paso 2: esquema */}
        <div className="col-12 col-xl-6">
          <div className="card p-3 p-md-4 h-100" style={{ borderLeft: "4px solid var(--jyg-gold)" }}>
            <SectionHead title="2 · Crear el esquema SQL" desc="Una tabla por módulo (14 en total) — SQL Editor en Supabase" actions={
              <button className="btn btn-soft btn-xs" onClick={() => setVerSql(!verSql)}>{verSql ? "Ocultar SQL" : "Ver SQL"}</button>
            } />
            {verSql ? (
              <div className="position-relative">
                <pre className="p-3 rounded-3 overflow-auto" style={{ background: "#0d1524", color: "#a8c6e8", fontSize: 10.5, maxHeight: 220, fontFamily: "ui-monospace, Menlo, monospace" }}>{SUPABASE_SQL}</pre>
                <button className="btn btn-gold btn-xs position-absolute" style={{ top: 10, right: 10 }} onClick={() => { navigator.clipboard?.writeText(SUPABASE_SQL).then(() => toast("Esquema SQL copiado", "ok")).catch(() => undefined); }}><Copy size={11} /> Copiar</button>
              </div>
            ) : (
              <div className="row g-2">
                {DB_TABLES.map((t) => (
                  <div key={t.tabla} className="col-6 col-md-4">
                    <div className="sb-table-item">
                      <span className="tname flex-grow-1 text-truncate">{t.tabla}</span>
                      {tabEstado[t.tabla] === "busy" && <span className="spin" style={{ color: "var(--warn)" }}><i className="bi bi-arrow-repeat" /></span>}
                      {tabEstado[t.tabla] === "ok" && <Check size={13} style={{ color: "var(--ok)" }} />}
                      {tabEstado[t.tabla] === "err" && <X size={13} style={{ color: "var(--danger)" }} />}
                      {!tabEstado[t.tabla] && <span className="dot" style={{ background: "var(--line)", boxShadow: "none" }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Paso 3: sincronización */}
        <div className="col-12">
          <div className="card p-3 p-md-4" style={{ borderLeft: "4px solid var(--ok)" }}>
            <SectionHead title="3 · Sincronizar datos" desc="Sube la base completa o restáurala desde la nube" actions={syncing && <Badge tone="amber" dot>Sincronizando…</Badge>} />
            <div className="row g-3">
              <div className="col-12 col-md-7">
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-primary" onClick={() => void subir()} disabled={syncing || !paso1}><Upload size={15} /> Subir base completa</button>
                  <button className="btn btn-ghost" onClick={() => void restaurar()} disabled={syncing || !paso1}><Download size={15} /> Restaurar desde la nube</button>
                </div>
                <div className="mt-3 p-3 rounded-3" style={{ background: "var(--card-bg-2)", fontSize: 12.5 }}>
                  {syncInfo ? (
                    <>
                      <b style={{ color: syncInfo.ok ? "var(--ok)" : "var(--danger)" }}>{syncInfo.msg}</b>
                      <div style={{ color: "var(--ink-faint)", fontSize: 11.5 }}>{fmtFechaHoraViva(syncInfo.last, now)} · {fmtHaceSegundos(syncInfo.last, now)}</div>
                    </>
                  ) : "Aún no hay movimientos. Los datos viven en este navegador hasta que sincronices."}
                </div>
              </div>
              <div className="col-12 col-md-5">
                <div className="p-3 rounded-3 h-100" style={{ background: "var(--tint-navy-2)", fontSize: 12.5, color: "var(--ink-soft)" }}>
                  <b className="font-display" style={{ color: "var(--jyg-navy)" }}>¿Y cuando JyG crezca?</b>
                  <p className="m-0 mt-1">Supabase (PostgreSQL) soporta multi-sucursal, reportes SQL y app propia. El CRM exporta/importa JSON, así que migrar es directo.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de tasas */}
        <div className="col-12">
          <div className="card p-3 p-md-4">
            <SectionHead title="Historial de la tasa del día" desc="Cierre diario registrado automáticamente desde ve.dolarapi.com" actions={
              <div className="d-flex gap-2">
                <button className="btn btn-ghost btn-xs" onClick={() => { downloadFile(`historial-tasas-${todayISO()}.csv`, toCSV(["Fecha", "USD Bs", "EUR Bs", "Paralelo Bs", "Fuente"], hist.map((h) => [h.fecha, h.usd, h.euro, h.paralelo, h.fuente]))); toast("Historial exportado", "ok"); }}><Download size={12} /> Exportar CSV</button>
                <button className="btn btn-ghost btn-xs" onClick={async () => { const ok = await confirm({ title: "¿Limpiar el historial?", message: "Se eliminarán todos los registros de tasas guardados.", confirmText: "Sí, limpiar", danger: true }); if (ok) { clearTasaHistorial(); toast("Historial limpio", "warn"); } }}><Trash2 size={12} /> Limpiar</button>
              </div>
            } />
            {ultimos.length > 1 && (
              <div className="rounded-3 p-3 mb-3" style={{ background: "var(--card-bg-2)" }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Sparkles size={14} style={{ color: "var(--jyg-gold-deep)" }} />
                  <span className="font-display fw-bold" style={{ fontSize: 12.5 }}>Últimos {ultimos.length} cierres (USD)</span>
                  <span className="ms-auto tabular-nums" style={{ fontSize: 12, color: "var(--ink-faint)" }}>mín {fmtBs(minUsd)} · máx {fmtBs(maxUsd)}</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-100" style={{ maxHeight: 140 }}>
                  <polyline points={pts} fill="none" stroke="var(--jyg-navy-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={pts.split(" ").pop()?.split(",")[0]} cy={pts.split(" ").pop()?.split(",")[1]} r="4" fill="var(--jyg-gold-deep)" />
                </svg>
              </div>
            )}
            <div className="table-responsive">
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>USD (Bs)</th><th>EUR (Bs)</th><th>Paralelo (Bs)</th><th>Fuente</th><th className="text-end">Acción</th></tr></thead>
                <tbody>
                  {[...hist].reverse().map((h) => (
                    <tr key={h.id}>
                      <td className="font-display fw-semibold" style={{ fontSize: 12.5 }}>{fmtFecha(h.fecha)}</td>
                      <td className="tabular-nums fw-bold" style={{ color: "var(--jyg-navy)", fontSize: 13 }}>{fmtBs(h.usd)}</td>
                      <td className="tabular-nums" style={{ color: "var(--jyg-gold-deep)", fontSize: 13 }}>{fmtBs(h.euro)}</td>
                      <td className="tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{fmtBs(h.paralelo)}</td>
                      <td><Badge tone={h.fuente === "dolarapi" ? "blue" : "amber"} dot>{h.fuente === "dolarapi" ? "DolarAPI" : "Manual"}</Badge></td>
                      <td className="text-end">
                        <button className="icon-btn danger" style={{ width: 26, height: 26 }} title="Eliminar" onClick={async () => { const ok = await confirm({ title: "¿Está seguro de eliminar este registro?", message: `Se quitará la tasa del ${fmtFecha(h.fecha)}.`, confirmText: "Eliminar", danger: true }); if (ok) { deleteTasaHistorial(h.id); toast("Registro eliminado", "warn"); } }}><Trash2 size={11} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hist.length === 0 && <EmptyState icon={History} title="Sin historial" text="La tasa se registra automáticamente cada día desde la API." />}
          </div>
        </div>
      </div>
      <span className="d-none"><Wallet size={1} /><UserCog size={1} /><SearchInput value="" onChange={() => undefined} placeholder="" /><FilterSelect value="" onChange={() => undefined} allLabel="" options={[]} /><Toolbar count={0} countLabel=""><span /></Toolbar></span>
    </div>
  );
}
