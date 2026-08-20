import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/* ---------------- Hooks ---------------- */
export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const start = ref.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(iv);
  }, [interval]);
  return now;
}

export function useReloj(mostrarFecha = true, interval = 1000) {
  const now = useNow(interval);
  const d = new Date(now);
  const hora = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fecha = d.toLocaleDateString("es-VE", { weekday: "short", day: "2-digit", month: "short" });
  return { now, hora, fecha, completa: mostrarFecha ? `${fecha} · ${hora}` : hora };
}

/* ---------------- Piezas ---------------- */
const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "var(--blue-tint-2)", fg: "var(--blue)" },
  green: { bg: "var(--green-tint)", fg: "var(--green)" },
  red: { bg: "var(--red-tint)", fg: "var(--red)" },
  amber: { bg: "var(--amber-tint)", fg: "var(--amber)" },
  gold: { bg: "var(--gold-tint)", fg: "var(--gold-deep)" },
  slate: { bg: "var(--slate-tint)", fg: "var(--slate)" },
};
export function Badge({ tone = "slate", children, dot }: { tone?: string; children: React.ReactNode; dot?: boolean }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <span className="badge" style={{ background: t.bg, color: t.fg }}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
export const estadoPagoTone = (s: string) => (s === "Pagado Completo" ? "green" : s === "Sin Abonos" ? "red" : "amber");
export const estadoPedidoTone = (s: string) => (s === "Entregado" ? "green" : s === "Empaque" ? "gold" : s === "Registrado" ? "slate" : "blue");

export function Bar({ pct, color = "var(--blue)", height = 10 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="progress" style={{ height }}>
      <div className="bar bar-anim" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="empty">
      <span style={{ width: 52, height: 52, borderRadius: 16, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)" }}>
        <Icon size={24} />
      </span>
      <b>{title}</b>
      <span style={{ fontSize: 12.5 }}>{text}</span>
    </div>
  );
}

export function Field({ label, error, required, children, hint, className = "" }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; hint?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="font-display" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
      </span>
      {children}
      {hint && !error && <span style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", marginTop: 5 }}>{hint}</span>}
      {error && <span style={{ display: "block", fontSize: 11, color: "var(--red)", fontWeight: 700, marginTop: 5 }}>{error}</span>}
    </label>
  );
}

export function SectionHead({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="section-head" style={{ justifyContent: "space-between" }}>
      <div>
        <h3>{title}</h3>
        {desc && <p className="desc">{desc}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ---------------- Modal / Drawer ---------------- */
export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode; size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal>
        <div className="modal-head">
          <div className="flex-1">
            <h3>{title}</h3>
            {subtitle && <p style={{ fontSize: 12.5, margin: "2px 0 0", color: "var(--ink-soft)" }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="overlay" style={{ zIndex: 3050, alignItems: "stretch", padding: 0 }} onMouseDown={onClose} />
      <div className="drawer">{children}</div>
    </>
  );
}
