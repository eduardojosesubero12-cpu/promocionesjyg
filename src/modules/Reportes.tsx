import React, { useMemo, useState } from "react";
import { BarChart3, Boxes, Download, GraduationCap, Wallet } from "lucide-react";
import { useApp } from "../lib/store";
import {
  ESTADOS_PEDIDO, GRADOS, PAQUETES, computeProduccion, downloadFile, estudianteTotales,
  fmtBs, fmtFecha, fmtUSD, toCSV, todayISO,
} from "../lib/data";
import { Badge, Bar, SectionHead, estadoPagoTone } from "../components/ui";

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
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={exportFinanzas}><Download size={15} /> Finanzas CSV</button>
          <button className="btn btn-ghost" onClick={exportProduccion}><Download size={15} /> Producción CSV</button>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap gap-2.5">
        <select className="select !w-[180px]" value={fEscuela} onChange={(e) => setFEscuela(e.target.value)}><option value="">Escuela</option>{db.escuelas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <select className="select !w-[170px]" value={fDocente} onChange={(e) => setFDocente(e.target.value)}><option value="">Docente</option>{db.docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>
        <select className="select !w-[140px]" value={fGrado} onChange={(e) => setFGrado(e.target.value)}><option value="">Grado</option>{GRADOS.map((g) => <option key={g}>{g}</option>)}</select>
        <select className="select !w-[110px]" value={fSeccion} onChange={(e) => setFSeccion(e.target.value)}><option value="">Secc.</option>{["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "U"].map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select !w-[160px]" value={fPago} onChange={(e) => setFPago(e.target.value)}><option value="">Estado de pago</option>{["Sin Abonos", "Primera Parte", "Segunda Parte", "Tercera Parte", "Pagado Completo"].map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select !w-[150px]" value={fEstado} onChange={(e) => setFEstado(e.target.value)}><option value="">Producción</option>{ESTADOS_PEDIDO.map((s) => <option key={s}>{s}</option>)}</select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { l: "Total vendido", v: fmtUSD(fin.vendido), sub: fmtBs(fin.vendido * tasa.usd), c: "var(--blue)" },
          { l: "Total cobrado", v: fmtUSD(fin.cobrado), sub: fmtBs(fin.cobrado * tasa.usd), c: "var(--green)" },
          { l: "Total pendiente", v: fmtUSD(fin.pendiente), sub: fmtBs(fin.pendiente * tasa.usd), c: "var(--red)" },
        ].map((x, i) => (
          <div key={x.l} className="card p-5 reveal" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-2 text-[11px] font-display font-semibold uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}><Wallet size={13} /> {x.l}</div>
            <div className="font-display font-bold text-[26px] mt-1.5" style={{ color: x.c }}>{x.v}</div>
            <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{x.sub} a tasa {fmtBs(tasa.usd)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-5">
          <SectionHead title="Producción" desc="Materiales requeridos por los pedidos filtrados" actions={<Boxes size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="flex flex-col gap-2">
            {Object.entries(prod.materiales).filter(([, q]) => q > 0).length === 0 && <p className="text-[13px] m-0 py-3" style={{ color: "var(--ink-faint)" }}>Sin materiales pendientes con los filtros actuales.</p>}
            {Object.entries(prod.materiales).filter(([, q]) => q > 0).map(([m, q]) => (
              <div key={m} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <span className="text-[13px] font-semibold flex-1">{m}</span>
                <span className="font-display font-bold" style={{ color: "var(--blue)" }}>{q}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] mt-3 mb-0" style={{ color: "var(--ink-faint)" }}>
            Pedidos pendientes: <b className="font-display">{filtrados.filter((e) => e.estadoPedido !== "Entregado").length}</b> · Entregados: <b className="font-display">{filtrados.filter((e) => e.estadoPedido === "Entregado").length}</b>
          </p>
        </div>

        <div className="card p-5">
          <SectionHead title="Estudiantes" desc="Distribución por escuela y grado" actions={<GraduationCap size={19} style={{ color: "var(--ink-faint)" }} />} />
          <div className="flex flex-col gap-2.5 mb-4">
            {porEscuela.map((r, i) => (
              <div key={r.nombre}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-display font-semibold text-[12.5px] truncate">{r.nombre}</span>
                  <span className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{r.n} est. · <b style={{ color: "var(--blue)" }}>{fmtUSD(r.vendido)}</b></span>
                </div>
                <Bar pct={(r.vendido / Math.max(1, porEscuela[0].vendido)) * 100} color={i === 0 ? "var(--gold)" : "var(--blue)"} height={7} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {porGrado.map((g) => (
              <div key={g.grado} className="p-3 rounded-xl flex items-center justify-between" style={{ background: "var(--surface-2)" }}>
                <span className="text-[12.5px] font-semibold">{g.grado}</span>
                <Badge tone="blue">{g.n}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5 mt-5">
        <SectionHead title={`Detalle (${filtrados.length} estudiantes)`} desc="Estado de pago individual con los filtros aplicados" actions={<BarChart3 size={19} style={{ color: "var(--ink-faint)" }} />} />
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Estudiante</th><th>Escuela</th><th>Grado</th><th>Registro</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Estado</th></tr></thead>
            <tbody>
              {filtrados.map((e) => {
                const t = estudianteTotales(e);
                return (
                  <tr key={e.id}>
                    <td className="font-display font-bold text-[12px]">{e.pedido}</td>
                    <td className="font-display font-semibold text-[13px]">{e.nombre}</td>
                    <td className="text-[12px]">{db.escuelas.find((x) => x.id === e.escuelaId)?.nombre || "—"}</td>
                    <td className="text-[12px]">{e.grado} “{e.seccion}”</td>
                    <td className="text-[12px]">{fmtFecha(e.fechaRegistro)}</td>
                    <td className="font-display font-semibold text-[12.5px]">{fmtUSD(t.total)}</td>
                    <td className="text-[12.5px]" style={{ color: "var(--green)" }}>{fmtUSD(t.abonado)}</td>
                    <td className="font-display font-bold text-[12.5px]" style={{ color: t.saldo > 0 ? "var(--red)" : "var(--green)" }}>{fmtUSD(t.saldo)}</td>
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
