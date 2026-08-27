import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, HelpCircle, Pencil, Search, Trash2, X } from "lucide-react";
import QRCodeLib from "qrcode";
import { useApp } from "../lib/store";

/* ================= hooks vivos ================= */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), interval); return () => clearInterval(iv); }, [interval]);
  return now;
}
export function useReloj(interval = 1000) {
  const now = useNow(interval);
  const d = new Date(now);
  const hora = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fecha = d.toLocaleDateString("es-VE", { weekday: "short", day: "2-digit", month: "short" });
  return { now, hora, fecha, completa: `${fecha} · ${hora}` };
}
export function useCountUp(target: number, dur = 850): number {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

/* ================= QR (SVG, sin dependencias de React) ================= */
export function QR({ value, size = 92, className }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCodeLib.toString(value || " ", { type: "svg", margin: 1, errorCorrectionLevel: "M", width: size })
      .then((s) => { if (alive) setSvg(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [value, size]);
  return <span className={className} style={{ display: "inline-flex", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/* ================= badges / tonos ================= */
export const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "var(--tint-navy-2)", fg: "var(--jyg-navy)" },
  green: { bg: "var(--tint-ok)", fg: "var(--ok)" },
  gold: { bg: "var(--tint-gold)", fg: "var(--jyg-gold-deep)" },
  amber: { bg: "var(--tint-warn)", fg: "var(--warn)" },
  red: { bg: "var(--tint-danger)", fg: "var(--danger)" },
  slate: { bg: "var(--card-bg-2)", fg: "var(--ink-faint)" },
};
export function Badge({ tone = "slate", dot, children, style }: { tone?: string; dot?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  const t = TONES[tone] || TONES.slate;
  return <span className="badge" style={{ background: t.bg, color: t.fg, ...style }}>{dot && <span className="dot" />}{children}</span>;
}
export const estadoPedidoTone = (s: string) => (s === "Entregado" ? "green" : s === "Registrado" ? "slate" : "blue");
export const estadoPagoTone = (s: string) => (s === "Pagado Completo" ? "green" : s === "Sin Abonos" ? "red" : "amber");
export function Bar({ pct, color = "var(--jyg-navy)", height = 9 }: { pct: number; color?: string; height?: number }) {
  return <div className="progress" style={{ height }}><div className="bar bar-anim" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} /></div>;
}
export function Switch({ checked, onChange, gold }: { checked: boolean; onChange: (v: boolean) => void; gold?: boolean }) {
  return (
    <label className={`switch ${gold ? "gold" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

/* ================= Modal / Drawer ================= */
export function Modal({ open, onClose, title, children, footer, size }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: "lg" | "xl" }) {
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size || ""}`}>
        <div className="modal-content">
          {title !== undefined && (
            <div className="modal-header">
              <h5 className="modal-title flex-grow-1">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
            </div>
          )}
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="overlay" style={{ zIndex: 2990 }} onMouseDown={onClose} />
      <aside className="offcanvas offcanvas-end glass show" style={{ width: "min(640px,100vw)", position: "fixed", zIndex: 3010 }}>
        <div className="offcanvas-header">
          <h5 className="offcanvas-title font-display fw-semibold" style={{ fontSize: 16.5 }}>{title}</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
        </div>
        <div className="offcanvas-body" style={{ padding: "16px 22px 40px" }}>{children}</div>
      </aside>
    </>
  );
}

/* ================= Formularios adaptables ================= */
export function Field({ label, required, error, hint, children, span = "c-6" }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; span?: string }) {
  return (
    <label className={span}>
      <span className="form-label d-block">{label} {required && <span style={{ color: "var(--danger)" }}>*</span>}</span>
      {children}
      {error && <span className="d-block mt-1" style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>}
      {!error && hint && <span className="d-block mt-1" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{hint}</span>}
    </label>
  );
}
/* Separador de sección dentro de un formulario */
export function FormSec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="f-sec"><i>{icon}</i><span>{children}</span></div>;
}
/* Pie de formulario con total vivo + acciones */
export function FormFoot({ total, sub, onCancel, onSave, saveDisabled }: { total?: React.ReactNode; sub?: React.ReactNode; onCancel: () => void; onSave: () => void; saveDisabled?: boolean }) {
  return (
    <div className="form-foot">
      {total !== undefined && <div className="form-total"><b style={{ color: "var(--jyg-navy)" }}>{total}</b>{sub && <small>{sub}</small>}</div>}
      <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      <button className="btn btn-primary" onClick={onSave} disabled={saveDisabled}><CheckCircle2 size={15} /> Sí, Guardar</button>
    </div>
  );
}

export function SectionHead({ title, desc, actions }: { title: React.ReactNode; desc?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <h3>{title}</h3>
        {desc && <p className="desc">{desc}</p>}
      </div>
      {actions}
    </div>
  );
}
export function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="empty">
      <span className="d-flex align-items-center justify-content-center rounded-4" style={{ width: 56, height: 56, background: "var(--card-bg-2)", color: "var(--ink-faint)" }}><Icon size={24} /></span>
      <b>{title}</b>
      <span style={{ fontSize: 12.5 }}>{text}</span>
    </div>
  );
}

/* ================= Toolbar + filtros horizontales ================= */
export function Toolbar({ count, countLabel, children }: { count: number; countLabel: string; children: React.ReactNode }) {
  return (
    <div className="jyg-toolbar card mb-3" style={{ padding: "11px 14px" }}>
      <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1" style={{ minWidth: 0 }}>{children}</div>
      <div className="jyg-toolbar-count"><span className="count-pill tabular-nums">{count}</span> {countLabel}</div>
    </div>
  );
}
export function SearchInput({ value, onChange, placeholder, wide }: { value: string; onChange: (v: string) => void; placeholder: string; wide?: boolean }) {
  return (
    <div className="tool-search" style={{ maxWidth: wide ? 420 : 320 }}>
      <Search size={15} className="tool-search-ic" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button className="tool-search-clear" onClick={() => onChange("")} aria-label="Limpiar"><X size={11} /></button>}
    </div>
  );
}
export function FilterSelect({ value, onChange, allLabel, options, width = 170 }: { value: string; onChange: (v: string) => void; allLabel: string; options: { v: string; l: string }[]; width?: number }) {
  return (
    <select className="tool-select" style={{ width }} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

/* ================= Tabla de datos: orden, paginación y tarjetas en móvil ================= */
export interface Column<T> { key: string; header: React.ReactNode; sortable?: boolean; sortValue?: (r: T) => string | number; render?: (r: T) => React.ReactNode; align?: "left" | "right"; width?: number | string; }
export function DataTable<T>({ columns, rows, rowKey, onRowClick, pageSize: initial = 10, empty }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; pageSize?: number; empty?: React.ReactNode }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(initial);
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = sv(a), bv = sv(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "es", { sensitivity: "base", numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);
  const toggleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey === key) { if (sortDir === "asc") setSortDir("desc"); else { setSortKey(null); setSortDir("asc"); } }
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const s = new Set<number>([1, 2, totalPages - 1, totalPages, safePage - 1, safePage, safePage + 1]);
    const arr = [...s].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | "…")[] = []; let prev = 0;
    for (const n of arr) { if (prev && n - prev > 1) out.push("…"); out.push(n); prev = n; }
    return out;
  }, [totalPages, safePage]);
  const al = (a?: string) => (a === "right" ? "text-end" : "");
  return (
    <div>
      <div className="table-responsive">
        <table className="tbl dt-cards">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th key={c.key} className={`${al(c.align)} ${c.sortable ? "" : ""}`} style={{ width: c.width, cursor: c.sortable ? "pointer" : undefined }} onClick={() => toggleSort(c.key)} title={c.sortable ? "Clic para ordenar" : undefined}>
                    <span className="d-inline-flex align-items-center gap-1">{c.header}{c.sortable && (active ? (sortDir === "asc" ? <ChevronRight size={12} style={{ transform: "rotate(-90deg)", color: "var(--jyg-gold-deep)" }} /> : <ChevronRight size={12} style={{ transform: "rotate(90deg)", color: "var(--jyg-gold-deep)" }} />) : <ChevronsUpDown size={11} style={{ opacity: 0.45 }} />)}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={rowKey(row)} style={{ cursor: onRowClick ? "pointer" : undefined, animationDelay: `${Math.min(i, 8) * 40}ms` }} className="reveal" onClick={() => onRowClick?.(row)}>
                {columns.map((c) => <td key={c.key} data-label={typeof c.header === "string" ? c.header : c.key} className={al(c.align)}>{c.render ? c.render(row) : String((row as any)[c.key] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && empty}
      {sorted.length > 0 && (
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mt-3">
          <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            <span className="tabular-nums">Mostrando <b>{start + 1}–{Math.min(start + pageSize, sorted.length)}</b> de <b>{sorted.length}</b></span>
            <select className="tool-select" style={{ width: 120, height: 32, fontSize: 12 }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
            </select>
          </div>
          <div className="d-flex align-items-center gap-1">
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Anterior"><ChevronLeft size={15} /></button>
            {pages.map((n, i) => n === "…" ? <span key={"e" + i} style={{ padding: "0 4px", color: "var(--ink-faint)" }}>…</span> : (
              <button key={n} className="btn btn-xs tabular-nums" style={n === safePage ? { background: "var(--jyg-navy)", color: "#fff" } : { background: "var(--card-bg-2)", color: "var(--ink-soft)" }} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Siguiente"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RowActions({ onVer, onEdit, onDelete }: { onVer?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };
  return (
    <span className="d-inline-flex gap-1 justify-content-end">
      {onVer && <button className="icon-btn" style={{ width: 31, height: 31 }} title="Ver" onClick={stop(onVer)}><Eye size={14} /></button>}
      {onEdit && <button className="icon-btn" style={{ width: 31, height: 31 }} title="Editar" onClick={stop(onEdit)}><Pencil size={14} /></button>}
      {onDelete && <button className="icon-btn danger" style={{ width: 31, height: 31 }} title="Eliminar" onClick={stop(onDelete)}><Trash2 size={14} /></button>}
    </span>
  );
}

/* ================= Hosts globales (SweetAlert + toasts) ================= */
export function ConfirmHost() {
  const { confirmState, resolveConfirm } = useApp();
  if (!confirmState) return null;
  const danger = confirmState.danger;
  return (
    <div className="overlay" style={{ zIndex: 5000 }}>
      <div className="modal" style={{ maxWidth: 430 }}>
        <div className="modal-content text-center">
          <div className="swal-icon" style={{ background: danger ? "var(--tint-danger)" : "var(--tint-navy-2)", color: danger ? "var(--danger)" : "var(--jyg-navy)" }}>
            {danger ? <AlertTriangle size={36} strokeWidth={2.2} /> : <HelpCircle size={36} strokeWidth={2.2} />}
          </div>
          <h3 className="font-display fw-bold" style={{ fontSize: 18.5 }}>{confirmState.title}</h3>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "6px 0 0" }}>{confirmState.message}</p>
          <div className="d-flex justify-content-center gap-2 mt-4 mb-1">
            <button className="btn btn-ghost" onClick={() => resolveConfirm(false)}>Cancelar</button>
            <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={() => resolveConfirm(true)}>{confirmState.confirmText || "Aceptar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function SuccessHost() {
  const { successState, closeSuccess } = useApp();
  useEffect(() => {
    if (!successState) return;
    const t = setTimeout(closeSuccess, 2200);
    return () => clearTimeout(t);
  }, [successState, closeSuccess]);
  if (!successState) return null;
  return (
    <div className="overlay" style={{ zIndex: 5000 }} onMouseDown={closeSuccess}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-content text-center">
          <div className="swal-icon" style={{ background: "var(--tint-ok)", color: "var(--ok)" }}><CheckCircle2 size={38} strokeWidth={2.2} /></div>
          <h3 className="font-display fw-bold" style={{ fontSize: 18 }}>{successState.title}</h3>
          <div className="d-flex justify-content-center mt-4 mb-1"><button className="btn btn-primary" onClick={closeSuccess}>Continuar</button></div>
        </div>
      </div>
    </div>
  );
}
export function ToastHost() {
  const { toasts } = useApp();
  return (
    <div className="toast-wrap">
      {toasts.map((t: any) => (
        <div key={t.id} className="toast">
          {t.tone === "err" ? <AlertTriangle size={15} style={{ color: "#ff8a80" }} /> : t.tone === "warn" ? <AlertTriangle size={15} style={{ color: "#ffd970" }} /> : <CheckCircle2 size={15} style={{ color: "#69f0ae" }} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
