import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, X } from "lucide-react";
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

/* Tonos */
export const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "var(--blue-tint-2)", fg: "var(--blue)" },
  gold: { bg: "var(--gold-tint)", fg: "var(--gold-deep)" },
  green: { bg: "var(--green-tint)", fg: "var(--green)" },
  red: { bg: "var(--red-tint)", fg: "var(--red)" },
  amber: { bg: "var(--amber-tint)", fg: "var(--amber)" },
  slate: { bg: "var(--slate-tint)", fg: "var(--slate)" },
};
export function Badge({ tone = "slate", dot, children, className, style }: { tone?: string; dot?: boolean; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const t = TONES[tone] || TONES.slate;
  return <span className={`badge ${className || ""}`} style={{ background: t.bg, color: t.fg, ...style }}>{dot && <span className="dot" />}{children}</span>;
}
export const estadoPedidoTone = (s: string) => s === "Entregado" ? "green" : s === "Registrado" ? "slate" : "blue";
export const estadoPagoTone = (s: string) => s === "Pagado Completo" ? "green" : s === "Sin Abonos" ? "red" : "amber";

export function Bar({ pct, color = "var(--blue)", height = 8 }: { pct: number; color?: string; height?: number }) {
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
      <div className={`modal ${size || ""}`}>
        {title !== undefined && (
          <div className="modal-head">
            <h3 className="flex-1">{title}</h3>
            <button className="icon-btn" onClick={onClose}><X size={17} /></button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="overlay" style={{ zIndex: 3050, alignItems: "stretch", padding: 0, justifyContent: "flex-end" }} onMouseDown={onClose} />
      <aside className="drawer">{children}</aside>
    </>
  );
}

export function Field({ label, required, error, hint, children, className }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="block font-display text-[12px] font-semibold mb-1.5" style={{ color: "var(--ink-soft)" }}>
        {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
      </span>
      {children}
      {error && <span className="block text-[11.5px] mt-1" style={{ color: "var(--red)" }}>{error}</span>}
      {!error && hint && <span className="block text-[11px] mt-1" style={{ color: "var(--ink-faint)" }}>{hint}</span>}
    </label>
  );
}

export function SectionHead({ title, desc, actions }: { title: React.ReactNode; desc?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div className="flex-1 min-w-0">
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
      <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)", color: "var(--ink-faint)" }}><Icon size={24} /></span>
      <b>{title}</b>
      <span className="text-[12.5px]">{text}</span>
    </div>
  );
}

/* SweetAlert: confirmación + éxito (globales del store) */
export function ConfirmHost() {
  const { confirmState, resolveConfirm } = useApp() as any;
  if (!confirmState) return null;
  const danger = confirmState.danger;
  return (
    <div className="overlay" style={{ zIndex: 5000 }}>
      <div className="modal" style={{ maxWidth: 430, textAlign: "center" }}>
        <div className="swal-icon" style={{ background: danger ? "var(--red-tint)" : "var(--blue-tint-2)", color: danger ? "var(--red)" : "var(--blue)" }}>
          {danger ? <AlertTriangle size={38} strokeWidth={2.2} /> : <HelpCircle size={38} strokeWidth={2.2} />}
        </div>
        <h3 className="font-display text-[19px] font-bold m-0">{confirmState.title}</h3>
        <p className="text-[13.5px] mt-2 mb-0" style={{ color: "var(--ink-soft)" }}>{confirmState.message}</p>
        <div className="flex justify-center gap-2.5 mt-6 pb-1">
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
      <div className="modal" style={{ maxWidth: 400, textAlign: "center" }}>
        <div className="swal-icon" style={{ background: "var(--green-tint)", color: "var(--green)" }}>
          <CheckCircle2 size={40} strokeWidth={2.2} />
        </div>
        <h3 className="font-display text-[18px] font-bold m-0">{successState.title || "Registro guardado correctamente"}</h3>
        <div className="flex justify-center mt-5 pb-1">
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
