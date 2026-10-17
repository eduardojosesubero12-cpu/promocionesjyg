import React, { useState } from "react";
import { GraduationCap, Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, Sparkles, AlertCircle, KeyRound, ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { useApp } from "../lib/store";
import { ROL_LABEL, ROL_DESC, PASS_REGLAS } from "../lib/data";
import { ROLES_INFO } from "../lib/data";

/* Credenciales de administrador por defecto */
export const CREDENCIALES_ADMIN = {
  email: "admin@jyg.com.ve",
  pass: "JyG-Admin-2026",
};

export default function Login() {
  const { login, db, solicitarRecuperacion, restablecerPass } = useApp();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [shake, setShake] = useState(false);
  /* ---- Modo recuperación: login | rec-solicitar | rec-codigo ---- */
  const [modo, setModo] = useState<"login" | "rec-solicitar" | "rec-codigo">("login");
  const [recCorreo, setRecCorreo] = useState("");
  const [recCodigo, setRecCodigo] = useState("");
  const [recNueva, setRecNueva] = useState("");
  const [recConfirmar, setRecConfirmar] = useState("");
  const [recMsg, setRecMsg] = useState("");
  const [recOk, setRecOk] = useState(false);
  const [recVerNueva, setRecVerNueva] = useState(false);

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

  /* ---- Handlers de recuperación de contraseña ---- */
  const pedirCodigo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!recCorreo.trim()) { setRecMsg("Escribe el correo o usuario registrado."); return; }
    setCargando(true); setRecMsg("");
    const r = await solicitarRecuperacion(recCorreo);
    setCargando(false);
    if (!r.ok) { setRecMsg(r.error || "No se pudo generar el código."); disparar(); return; }
    setRecCodigo(r.codigo || "");
    setModo("rec-codigo");
  };
  const definirNueva = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setRecMsg("");
    if (recNueva !== recConfirmar) { setRecMsg("La confirmación no coincide con la nueva contraseña."); disparar(); return; }
    setCargando(true);
    const r = await restablecerPass(recCorreo, recCodigo, recNueva);
    setCargando(false);
    if (!r.ok) { setRecMsg(r.error || "No se pudo cambiar la contraseña."); disparar(); return; }
    setRecOk(true);
    setPass(""); setEmail(recCorreo);
  };
  const volverLogin = () => {
    setModo("login"); setRecMsg(""); setRecOk(false); setRecNueva(""); setRecConfirmar(""); setRecCorreo(""); setRecCodigo("");
  };

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
        {modo === "login" && (
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

          <div style={{ textAlign: "right", margin: "-4px 0 8px" }}>
            <button
              type="button"
              onClick={() => { setRecCorreo(email); setModo("rec-solicitar"); setError(""); }}
              style={{ background: "none", border: "none", color: "#667eea", fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={cargando}>
            {cargando ? <span className="spinner" /> : <LogIn size={17} />}
            {cargando ? "Verificando…" : "Entrar al CRM"}
          </button>

          <div className="login-creds">
            <div className="login-creds-title"><ShieldCheck size={14} /> Credenciales de Administrador</div>
            <div className="login-cred-row">
              <span className="login-cred-label">Usuario:</span>
              <code className="login-cred-code">admin@jyg.com.ve</code>
            </div>
            <div className="login-cred-row">
              <span className="login-cred-label">Contraseña:</span>
              <code className="login-cred-code">JyG-Admin-2026</code>
            </div>
            <button 
              type="button" 
              className="login-autofill-btn"
              onClick={() => acceder(CREDENCIALES_ADMIN.email, CREDENCIALES_ADMIN.pass)}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "8px 12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <LogIn size={14} /> Autocompletar y entrar como Administrador
            </button>
            <p className="login-hint" style={{ margin: "12px 0 0", fontSize: 11.5 }}>
              Usa estas credenciales para ingresar como administrador y gestionar los demás usuarios desde <b>Administración → Usuarios</b>.
            </p>
          </div>
        </form>
        )}

        {/* ==================== RECUPERAR CONTRASEÑA — paso 1: correo ==================== */}
        {modo === "rec-solicitar" && (
        <form className={`login-card ${shake ? "shake" : ""}`} onSubmit={pedirCodigo}>
          <div className="login-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><KeyRound size={20} /> Recuperar contraseña</h2>
            <p>Escribe el correo registrado en tu cuenta. Generaremos un código temporal de 6 dígitos válido por 30 minutos.</p>
          </div>

          <label className="login-field">
            <span>Correo o usuario registrado</span>
            <div className="login-input">
              <Mail size={16} />
              <input type="text" placeholder="correo@jyg.com.ve" value={recCorreo} onChange={(e) => { setRecCorreo(e.target.value); setRecMsg(""); }} autoComplete="username" autoFocus />
            </div>
          </label>

          {recMsg && (
            <div className="login-error"><AlertCircle size={15} /> {recMsg}</div>
          )}

          <button type="submit" className="login-submit" disabled={cargando}>
            {cargando ? <span className="spinner" /> : <KeyRound size={17} />}
            {cargando ? "Generando código…" : "Generar código"}
          </button>

          <button type="button" onClick={volverLogin} style={{ background: "none", border: "none", color: "#667eea", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
            <ArrowLeft size={14} /> Volver al inicio de sesión
          </button>
          <p className="login-hint" style={{ marginTop: 10 }}>
            Si no puedes acceder a tu cuenta, pide al <b>administrador</b> que te asigne una clave temporal desde <b>Administración → Equipo JyG → 🔑</b>.
          </p>
        </form>
        )}

        {/* ==================== RECUPERAR CONTRASEÑA — paso 2: código + clave nueva ==================== */}
        {modo === "rec-codigo" && (
        <form className={`login-card ${shake ? "shake" : ""}`} onSubmit={definirNueva}>
          {!recOk ? (
            <>
              <div className="login-head">
                <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><KeyRound size={20} /> Ingresa tu código</h2>
                <p>Código generado para <b>{recCorreo}</b>. Dura 30 minutos y solo se muestra una vez.</p>
              </div>

              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 12, padding: "14px 16px", marginBottom: 16, textAlign: "center", color: "#fff",
              }}>
                <small style={{ opacity: 0.85, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Tu código temporal es</small>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, fontFamily: "monospace", margin: "4px 0" }}>{recCodigo}</div>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(recCodigo).catch(() => {}); }}
                  style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <Copy size={13} /> Copiar código
                </button>
                <p style={{ fontSize: 11, marginTop: 8, opacity: 0.9 }}>Si otra persona pidió este código por ti, compártelo solo por canal seguro.</p>
              </div>

              <label className="login-field">
                <span>Nueva contraseña</span>
                <div className="login-input">
                  <Lock size={16} />
                  <input type={recVerNueva ? "text" : "password"} placeholder="Nueva contraseña segura" value={recNueva} onChange={(e) => { setRecNueva(e.target.value); setRecMsg(""); }} autoComplete="new-password" />
                  <button type="button" className="login-eye" onClick={() => setRecVerNueva(!recVerNueva)} aria-label="Mostrar contraseña">
                    {recVerNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {/* Lista de requisitos en vivo */}
              <div style={{ margin: "-6px 0 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
                {PASS_REGLAS.map((r) => {
                  const ok = r.test(recNueva);
                  return (
                    <span key={r.label} style={{ fontSize: 11.5, color: ok ? "#16a34a" : "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                      {ok ? <CheckCircle2 size={12} /> : "○"} {r.label}
                    </span>
                  );
                })}
              </div>

              <label className="login-field">
                <span>Confirmar nueva contraseña</span>
                <div className="login-input">
                  <ShieldCheck size={16} />
                  <input type={recVerNueva ? "text" : "password"} placeholder="Repite la nueva contraseña" value={recConfirmar} onChange={(e) => { setRecConfirmar(e.target.value); setRecMsg(""); }} autoComplete="new-password" />
                </div>
              </label>

              {recMsg && <div className="login-error"><AlertCircle size={15} /> {recMsg}</div>}

              <button type="submit" className="login-submit" disabled={cargando || !recNueva || recNueva !== recConfirmar}>
                {cargando ? <span className="spinner" /> : <ShieldCheck size={17} />}
                {cargando ? "Guardando en la nube…" : "Cambiar contraseña"}
              </button>

              <button type="button" onClick={volverLogin} style={{ background: "none", border: "none", color: "#667eea", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
                <ArrowLeft size={14} /> Cancelar y volver al login
              </button>
            </>
          ) : (
            <>
              <div className="login-head" style={{ textAlign: "center" }}>
                <div style={{ margin: "0 auto 12px", width: 64, height: 64, borderRadius: "50%", background: "rgba(22,163,74,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                  <CheckCircle2 size={36} />
                </div>
                <h2>¡Contraseña actualizada!</h2>
                <p>Tu nueva contraseña ya se guardó <b>en Supabase al instante</b> para todos los dispositivos. Ya puedes iniciar sesión con ella.</p>
              </div>
              <button type="button" className="login-submit" onClick={volverLogin}>
                <LogIn size={17} /> Ir al inicio de sesión
              </button>
            </>
          )}
        </form>
        )}
      </main>
    </div>
  );
}
