import React, { useMemo, useState } from "react";
import { BarChart3, Boxes, Download, GraduationCap, Wallet } from "lucide-react";
import { useApp } from "../lib/store";
import {
  ESTADOS_PEDIDO, GRADOS, PAQUETES, computeProduccion, downloadFile, estudianteTotales,
  fmtBs, fmtFecha, fmtUSD, toCSV, todayISO,
} from "../lib/data";
import { Badge, Bar, FilterSelect, SectionHead, Toolbar, estadoPagoTone } from "../components/ui";

export default function Reportes() {
  const { db, tasa, toast } = useApp();
  const [fEscuela, setFEscuela] = useState("");
  const [fDocente, setFDocente] = useState("");
  const [fGrado, setFGrado] = useState("");
  const [fSeccion, setFSeccion] = useState("");
  const [fPago, setFPago] = useState("");
  const [fEstado, setFEstado] = useState("");

  const filtrados = useMemo(() => db.estudiantes.filter((e) => {
    const t = estudianteTotales(e);
    if (fEscuela && e.escuelaId !== fEscuela) return false;
    if (fDocente && e.docenteId !== fDocente) return false;
    if (fGrado && e.grado !== fGrado) return false;
    if (fSeccion && e.seccion !== fSeccion) return false;
    if (fPago && t.estadoPago !== fPago) return false;
    if (fEstado && e.estadoPedido !== fEstado) return false;
    return true;
  }), [db.estudiantes, fEscuela, fDocente, fGrado, fSeccion, fPago, fEstado]);

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
  const porGrado = useMemo(() => GRADOS.map((g) => ({ grado: g, n: filtrados.filter((e) => e.grado === g).length })).filter((x) => x.n > 0), [filtrados]);

  const exportFinanzas = () => {
    downloadFile(`reporte-finanzas-${todayISO()}.csv`, toCSV(
      ["Pedido", "Estudiante", "Escuela", "Grado", "Paquete", "Total USD", "Abonado USD", "Saldo USD", "Estado pago", "Estado pedido"],
      filtrados.map((e) => { const t = estudianteTotales(e); return [e.pedido, e.nombre, db.escuelas.find((x) => x.id === e.escuelaId)?.nombre || "", `${e.grado} ${e.seccion}`, PAQUETES[e.paqueteId].nombre, t.total.toFixed(2), t.abonado.toFixed(2), t.saldo.toFixed(2), t.estadoPago, e.estadoPedido]; })
    ));
    toast("Reporte financiero exportado", "ok");
  };
  const exportProduccion = () => {
    const rows = Object.entries(prod.materiales).filter(([, q]) => q > 0).map(([m, q]) => [m, q]);
    downloadFile(`reporte-produccion-${todayISO()}.csv`, toCSV(["Material", "Cantidad"], rows));
    toast("Reporte de producción exportado", "ok");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Administración</div>
          <h1>Reportes</h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Filtra por escuela, docente, grado, sección, pago o producción</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={exportFinanzas}><Download size={15} /> Finanzas CSV</button>
          <button className="btn btn-ghost" onClick={exportProduccion}><Download size={15} /> Producción CSV</button>
        </div>
      </div>

      <Toolbar count={filtrados.length} countLabel={filtrados.length === 1 ? "estudiante filtrado" : "estudiantes filtrados"}>
        <FilterSelect value={fEscuela} onChange={setFEscuela} allLabel="Todas las escuelas" width={185} options={db.escuelas.map((e) => ({ v: e.id, l: e.nombre }))} />
        <FilterSelect value={fDocente} onChange={setFDocente} allLabel="Todos los docentes" width={175} options={db.docentes.map((d) => ({ v: d.id, l: d.nombre }))} />
        <FilterSelect value={fGrado} onChange={setFGrado} allLabel="Todos los grados" width={150} options={GRADOS.map((g) => ({ v: g, l: g }))} />
        <FilterSelect value={fSeccion} onChange={setFSeccion} allLabel="Todas las secciones" width={125} options={["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "U"].map((s) => ({ v: s, l: `Sección ${s}` }))} />
        <FilterSelect value={fPago} onChange={setFPago} allLabel="Estado de pago" width={165} options={["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => ({ v: s, l: s }))} />
        <FilterSelect value={fEstado} onChange={setFEstado} allLabel="Estado de producción" width={165} options={ESTADOS_PEDIDO.map((s) => ({ v: s, l: s }))} />
      </Toolbar>

      <div className="row g-3 mb-4">
        {[
          { l: "Total vendido", v: fmtUSD(fin.vendido), sub: fmtBs(fin.vendido * tasa.usd), c: "var(--jyg-navy)" },
          { l: "Total cobrado", v: fmtUSD(fin.cobrado), sub: fmtBs(fin.cobrado * tasa.usd), c: "var(--ok)" },
          { l: "Total pendiente", v: fmtUSD(fin.pendiente), sub: fmtBs(fin.pendiente * tasa.usd), c: "var(--danger)" },
        ].map((x, i) => (
          <div key={x.l} className="col-12 col-md-4">
            <div className="card p-4 reveal h-100" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="d-flex align-items-center gap-2 text-uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--ink-faint)" }}><Wallet size={13} /> {x.l}</div>
              <div className="font-display fw-bold tabular-nums mt-1" style={{ fontSize: 26, color: x.c }}>{x.v}</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{x.sub} a tasa {fmtBs(tasa.usd)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Producción" desc="Materiales requeridos por los pedidos filtrados" actions={<Boxes size={19} style={{ color: "var(--ink-faint)" }} />} />
            <div className="d-flex flex-column gap-2">
              {Object.entries(prod.materiales).filter(([, q]) => q > 0).length === 0 && <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Sin materiales pendientes con los filtros actuales.</p>}
              {Object.entries(prod.materiales).filter(([, q]) => q > 0).map(([m, q]) => (
                <div key={m} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: "var(--card-bg-2)" }}>
                  <span className="fw-semibold flex-grow-1" style={{ fontSize: 13 }}>{m}</span>
                  <span className="font-display fw-bold" style={{ color: "var(--jyg-navy)" }}>{q}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 mb-0" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Pedidos pendientes: <b className="font-display">{filtrados.filter((e) => e.estadoPedido !== "Entregado").length}</b> · Entregados: <b className="font-display">{filtrados.filter((e) => e.estadoPedido === "Entregado").length}</b>
            </p>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card p-4 h-100">
            <SectionHead title="Estudiantes" desc="Distribución por escuela y grado" actions={<GraduationCap size={19} style={{ color: "var(--ink-faint)" }} />} />
            <div className="d-flex flex-column gap-2 mb-3">
              {porEscuela.map((r, i) => (
                <div key={r.nombre}>
                  <div className="d-flex justify-content-between align-items-baseline mb-1">
                    <span className="font-display fw-semibold text-truncate" style={{ fontSize: 12.5 }}>{r.nombre}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{r.n} est. · <b style={{ color: "var(--jyg-navy)" }}>{fmtUSD(r.vendido)}</b></span>
                  </div>
                  <Bar pct={(r.vendido / Math.max(1, porEscuela[0].vendido)) * 100} color={i === 0 ? "var(--jyg-gold)" : "var(--jyg-navy)"} height={7} />
                </div>
              ))}
            </div>
            <div className="row g-2">
              {porGrado.map((g) => (
                <div key={g.grado} className="col-6">
                  <div className="p-2 rounded-3 d-flex align-items-center justify-content-between" style={{ background: "var(--card-bg-2)" }}>
                    <span className="fw-semibold" style={{ fontSize: 12.5 }}>{g.grado}</span>
                    <Badge tone="blue">{g.n}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mt-4">
        <SectionHead title={`Detalle (${filtrados.length} estudiantes)`} desc="Estado de pago individual con los filtros aplicados" actions={<BarChart3 size={19} style={{ color: "var(--ink-faint)" }} />} />
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
                    <td className="font-display fw-semibold" style={{ fontSize: 12.5 }}>{fmtUSD(t.total)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ok)" }}>{fmtUSD(t.abonado)}</td>
                    <td className="font-display fw-bold" style={{ color: t.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{fmtUSD(t.saldo)}</td>
                    <td><Badge tone={estadoPagoTone(t.estadoPago)} dot>{t.estadoPago}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
