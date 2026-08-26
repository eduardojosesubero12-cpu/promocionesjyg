import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, HelpCircle, Pencil, Search, Trash2, X } from "lucide-react";
import { useApp } from "../lib/store";

/* Reloj vivo */
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
export function useCountUp(target: number, dur = 900): number {
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

/* Tonos de badges */
export const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "var(--tint-navy-2)", fg: "var(--jyg-navy)" },
  gold: { bg: "var(--tint-gold)", fg: "var(--jyg-gold-deep)" },
  green: { bg: "var(--tint-ok)", fg: "var(--ok)" },
  red: { bg: "var(--tint-danger)", fg: "var(--danger)" },
  amber: { bg: "var(--tint-warn)", fg: "var(--warn)" },
  slate: { bg: "var(--tint-slate)", fg: "var(--slate)" },
};
export function Badge({ tone = "slate", dot, children, className, style }: { tone?: string; dot?: boolean; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const t = TONES[tone] || TONES.slate;
  return <span className={`badge ${className || ""}`} style={{ background: t.bg, color: t.fg, ...style }}>{dot && <span className="dot" />}{children}</span>;
}
export const estadoPedidoTone = (s: string) => (s === "Entregado" ? "green" : s === "Registrado" ? "slate" : "blue");
export const estadoPagoTone = (s: string) => (s === "Pagado Completo" ? "green" : s === "Sin Abonos" ? "red" : "amber");

export function Bar({ pct, color = "var(--jyg-navy)", height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="progress" style={{ height }}>
      <div className="bar bar-anim" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: "lg" | "xl" }) {
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal modal-dialog modal-content d-block ${size === "lg" ? "" : ""}`} style={{ maxWidth: size === "lg" ? 820 : size === "xl" ? 1080 : 560, width: "100%" }}>
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
  );
}

/* Expediente: offcanvas de Bootstrap con fondo y panel de vidrio */
export function Drawer({ open, onClose, title = "Expediente", children }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="scrim-glass" onClick={onClose} />
      <div className="offcanvas offcanvas-end glass show" tabIndex={-1} style={{ visibility: "visible", width: "min(620px,100vw)" }}>
        <div className="offcanvas-header border-bottom" style={{ borderColor: "var(--line-soft)" }}>
          <h5 className="offcanvas-title font-display fw-semibold d-flex align-items-center gap-2">
            {title}
          </h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
        </div>
        <div className="offcanvas-body">{children}</div>
      </div>
    </>
  );
}

export function Field({ label, required, error, hint, children, className }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className || ""}>
      <span className="d-block font-display fw-semibold mb-1" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </span>
      {children}
      {error && <span className="d-block mt-1" style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>}
      {!error && hint && <span className="d-block mt-1" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{hint}</span>}
    </label>
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
      <span className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 56, height: 56, background: "var(--card-bg-2)", color: "var(--ink-faint)" }}><Icon size={24} /></span>
      <b>{title}</b>
      <span style={{ fontSize: 12.5 }}>{text}</span>
    </div>
  );
}

/* Acciones por fila: Ver / Editar / Eliminar */
export function RowActions({ onVer, onEdit, onDelete, verLabel = "Ver", editLabel = "Editar", deleteLabel = "Eliminar" }: { onVer?: () => void; onEdit?: () => void; onDelete?: () => void; verLabel?: string; editLabel?: string; deleteLabel?: string }) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };
  return (
    <div className="d-flex justify-content-end gap-1">
      {onVer && <button className="icon-btn" title={verLabel} aria-label={verLabel} onClick={stop(onVer)}><Eye size={15} /></button>}
      {onEdit && <button className="icon-btn" title={editLabel} aria-label={editLabel} onClick={stop(onEdit)}><Pencil size={15} /></button>}
      {onDelete && <button className="icon-btn danger" title={deleteLabel} aria-label={deleteLabel} onClick={stop(onDelete)}><Trash2 size={15} /></button>}
    </div>
  );
}

/* ============================================================
   BARRA DE HERRAMIENTAS HORIZONTAL
   ============================================================ */
export function Toolbar({ children, count, countLabel = "registros" }: { children?: React.ReactNode; count?: number; countLabel?: string }) {
  return (
    <div className="jyg-toolbar">
      <div className="jyg-toolbar-row">{children}</div>
      {count !== undefined && (
        <div className="jyg-toolbar-count">
          <span className="count-pill tabular-nums">{count}</span>
          <span>{countLabel}</span>
        </div>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Buscar…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="tool-search">
      <Search size={15} className="tool-search-ic" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && (
        <button className="tool-search-clear" onClick={() => onChange("")} aria-label="Limpiar búsqueda"><X size={11} /></button>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options, allLabel = "Todos", width = 170 }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; allLabel?: string; width?: number }) {
  return (
    <select className="tool-select" style={{ width }} value={value} onChange={(e) => onChange(e.target.value)} aria-label={allLabel}>
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

/* SweetAlert: confirmación + éxito (globales del store) */
export function ConfirmHost() {
  const { confirmState, resolveConfirm } = useApp() as any;
  if (!confirmState) return null;
  const danger = confirmState.danger;
  return (
    <div className="overlay" style={{ zIndex: 5000 }}>
      <div className="modal modal-dialog modal-content d-block" style={{ maxWidth: 430, textAlign: "center" }}>
        <div className="swal-icon" style={{ background: danger ? "var(--tint-danger)" : "var(--tint-navy-2)", color: danger ? "var(--danger)" : "var(--jyg-navy)" }}>
          {danger ? <AlertTriangle size={38} strokeWidth={2.2} /> : <HelpCircle size={38} strokeWidth={2.2} />}
        </div>
        <h5 className="font-display fw-bold">{confirmState.title}</h5>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{confirmState.message}</p>
        <div className="d-flex justify-content-center gap-2 mt-4 pb-2">
          <button className="btn btn-ghost" onClick={() => resolveConfirm(false)}>Cancelar</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={() => resolveConfirm(true)}>{confirmState.confirmText || "Aceptar"}</button>
        </div>
      </div>
    </div>
  );
}
export function SuccessHost() {
  const { successState } = useApp() as any;
  if (!successState) return null;
  return (
    <div className="overlay" style={{ zIndex: 5000 }}>
      <div className="modal modal-dialog modal-content d-block" style={{ maxWidth: 400, textAlign: "center" }}>
        <div className="swal-icon" style={{ background: "var(--tint-ok)", color: "var(--ok)" }}>
          <CheckCircle2 size={40} strokeWidth={2.2} />
        </div>
        <h5 className="font-display fw-bold">{successState.title}</h5>
        <div className="d-flex justify-content-center mt-4 pb-2">
          <button className="btn btn-primary" onClick={successState.close}>Continuar</button>
        </div>
      </div>
    </div>
  );
}
export function ToastHost() {
  const { toasts } = useApp() as any;
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
