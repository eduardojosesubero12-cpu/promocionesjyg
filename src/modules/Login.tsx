import React, { useState } from "react";
import { GraduationCap, Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { useApp } from "../lib/store";
import { ROL_LABEL, ROL_DESC } from "../lib/data";
import { ROLES_INFO } from "../lib/data";

/* Credenciales de acceso rápido (para el primer uso) */
export const CREDENCIALES_ACCESO = [
  { rol: "admin" as const, email: "admin@jyg.com.ve", pass: "JyG-Admin-2026" },
  { rol: "operador" as const, email: "registro@jyg.com.ve", pass: "JyG-Registro-2026" },
  { rol: "produccion" as const, email: "produccion@jyg.com.ve", pass: "JyG-Produccion-2026" },
  { rol: "cobranza" as const, email: "cobranza@jyg.com.ve", pass: "JyG-Cobranza-2026" },
];

export default function Login() {
  const { login, db } = useApp();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [shake, setShake] = useState(false);

  const enviar = async (e?: React.FormEvent, em?: string, pw?: string) => {
    e?.preventDefault();
    const correo = em ?? email;
    const clave = pw ?? pass;
    if (!correo.trim() || !clave) { setError("Escribe tu correo y tu contraseña."); disparar(); return; }
    setCargando(true); setError("");
    const r = await login(correo, clave);
    setCargando(false);
    if (!r.ok) { setError(r.error || "No se pudo iniciar sesión."); disparar(); return; }
    /* El gate de App detecta la sesión y entra al CRM */
  };
  const disparar = () => { setShake(true); setTimeout(() => setShake(false), 450); };

  const acceder = (em: string, pw: string) => { setEmail(em); setPass(pw); void enviar(undefined, em, pw); };

  return (
    <div className="login-root">
      {/* Panel de marca (izquierda) */}
      <aside className="login-brand">
        <div className="login-brand-inner">
          <div className="login-logo">
            <span className="login-logo-mark"><GraduationCap size={30} /></span>
            <div>
              <b>Promociones JyG</b>
              <small>CRM de Grados</small>
            </div>
          </div>
          <div className="login-hero">
            <span className="login-tag"><Sparkles size={13} /> Temporada de Grados 2026</span>
            <h1>Cada graduando,<br />su paquete,<br />su momento.</h1>
            <p>Escuelas, estudiantes, pagos a tasa del día, producción y tarjetas QR — todo tu equipo sincronizado en tiempo real.</p>
          </div>
          <div className="login-stats">
            <div><b>{db.escuelas.length}</b><span>Escuelas</span></div>
            <div><b>{db.estudiantes.length}</b><span>Estudiantes</span></div>
            <div><b>{db.usuarios.length}</b><span>Usuarios</span></div>
          </div>
          <div className="login-foot"><ShieldCheck size={13} /> Sesión segura · Supabase en tiempo real</div>
        </div>
        <div className="login-cap" aria-hidden="true"><GraduationCap size={230} /></div>
      </aside>

      {/* Formulario (derecha) */}
      <main className="login-main">
        <form className={`login-card ${shake ? "shake" : ""}`} onSubmit={enviar}>
          <div className="login-head">
            <h2>Iniciar sesión</h2>
            <p>Accede con el correo y la contraseña de tu rol.</p>
          </div>

          <label className="login-field">
            <span>Correo electrónico</span>
            <div className="login-input">
              <Mail size={16} />
              <input type="email" placeholder="correo@jyg.com.ve" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} autoComplete="username" />
            </div>
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <div className="login-input">
              <Lock size={16} />
              <input type={verPass ? "text" : "password"} placeholder="••••••••••" value={pass} onChange={(e) => { setPass(e.target.value); setError(""); }} autoComplete="current-password" />
              <button type="button" className="login-eye" onClick={() => setVerPass(!verPass)} aria-label="Mostrar contraseña">
                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="login-error">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={cargando}>
            {cargando ? <span className="spinner" /> : <LogIn size={17} />}
            {cargando ? "Verificando…" : "Entrar al CRM"}
          </button>

          <div className="login-divider"><span>Acceso rápido por rol</span></div>

          <div className="login-roles">
            {CREDENCIALES_ACCESO.map((c) => {
              const info = ROLES_INFO.find((r) => r.id === c.rol);
              return (
                <button key={c.rol} type="button" className="login-role" onClick={() => acceder(c.email, c.pass)} disabled={cargando}>
                  <span className="lr-ic" style={{ background: `color-mix(in srgb, ${info?.color} 15%, transparent)`, color: info?.color }}>
                    <i className={`bi bi-${info?.icon}`} />
                  </span>
                  <span className="lr-txt">
                    <b>{ROL_LABEL[c.rol]}</b>
                    <small>{c.email}</small>
                  </span>
                  <i className="bi bi-chevron-right lr-arrow" />
                </button>
              );
            })}
          </div>

          <p className="login-hint">La contraseña se guarda cifrada. El primer acceso migra la clave de forma automática.</p>
        </form>
      </main>
    </div>
  );
}
