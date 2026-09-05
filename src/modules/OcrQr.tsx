import React, { useEffect, useRef, useState } from "react";
import {
  Aperture, Camera, CameraOff, Check, Copy, Eye, GraduationCap, Loader2, RotateCw, ScanLine,
  Search, Settings, ShieldCheck, Sparkles, Upload, UserPlus, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { OcrDraft } from "../lib/data";
import { OCR_CRED, fmtFecha, parseOcr, todayISO } from "../lib/data";
import { Badge, Field, Modal } from "../components/ui";

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

/* Modal del escáner (lo abre el botón flotante) */
export function OcrModal() {
  const { ocrOpen, setOcrOpen, setOcrDraft, setRoute, toast } = useApp();
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [brillo, setBrillo] = useState(100);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const apagarCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };

  useEffect(() => {
    if (!ocrOpen) { apagarCam(); setImg(null); setDraft(null); setZoom(1); setRot(0); setBrillo(100); }
    return () => apagarCam();
  }, [ocrOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const leerArchivo = (f: File) => {
    const r = new FileReader();
    r.onload = () => { setImg(r.result as string); setDraft(null); setMostrarTodo(false); };
    r.readAsDataURL(f);
  };

  const encenderCam = async () => {
    setCamErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } } });
      streamRef.current = s;
      setCamOn(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => undefined); } }, 60);
    } catch {
      setCamErr("No se pudo acceder a la cámara. Verifica los permisos del navegador o usa la opción de subir archivo.");
    }
  };

  const capturarFoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setImg(c.toDataURL("image/jpeg", 0.92));
    apagarCam();
    setDraft(null);
  };

  const procesar = async () => {
    if (!img) return;
    setBusy(true); setProgreso(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("spa", 1, {
        logger: (m: any) => { if (m.status === "recognizing text") setProgreso(Math.round((m.progress || 0) * 100)); },
      });
      const { data } = await worker.recognize(img);
      await worker.terminate();
      const d = parseOcr(data.text || "");
      setDraft({ ...d, raw: data.text || "" });
      if (!d.nombre && !d.ci) toast("No se detectaron campos — intenta con mejor luz o enfoque", "warn");
      else toast("Documento reconocido con la IA de Google", "ok");
    } catch {
      toast("El motor OCR no pudo procesar la imagen", "err");
    } finally { setBusy(false); }
  };

  const usarEnFormulario = () => {
    if (draft) setOcrDraft(draft);
    setOcrOpen(false);
    setRoute("estudiantes", { openNew: true });
    toast("Completa los datos del estudiante en el formulario", "ok");
  };

  return (
    <Modal open={ocrOpen} onClose={() => setOcrOpen(false)} size="lg" title={
      <span className="d-flex align-items-center gap-2"><ScanLine size={20} style={{ color: "var(--jyg-navy)" }} /> Escáner OCR <GoogleG size={19} /> <span className="badge" style={{ background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>IA de Google Cloud</span></span>
    }>
      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="rounded-4 position-relative overflow-hidden" style={{ background: "#0d1524", minHeight: 250, border: "1px solid var(--line)" }}>
            {!img && !camOn && (
              <div className="position-absolute top-0 bottom-0 start-0 end-0 d-flex flex-column align-items-center justify-content-center gap-2 p-4 text-center">
                <span className="d-flex align-items-center justify-content-center rounded-4" style={{ width: 56, height: 56, background: "rgba(255,217,112,0.12)", color: "#ffd970" }}><ScanLine size={26} /></span>
                <p style={{ fontSize: 13, margin: 0, color: "#9fb0c8" }}>Escanea la <b>C.I.</b> o la <b>partida de nacimiento</b> venezolana</p>
                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> Subir foto</button>
                  <button className="btn btn-gold btn-sm" onClick={encenderCam}><Aperture size={14} /> Tomar foto</button>
                </div>
              </div>
            )}
            {camOn && (
              <div className="position-relative">
                <video ref={videoRef} playsInline muted className="w-100 d-block" style={{ maxHeight: 300, objectFit: "cover" }} />
                <div className="position-absolute rounded-3" style={{ inset: "21% 8%", border: "2px dashed rgba(255,217,112,0.8)", boxShadow: "0 0 0 9999px rgba(6,10,20,0.45)", pointerEvents: "none" }} />
                <div className="position-absolute bottom-0 start-0 end-0 d-flex justify-content-center gap-2 pb-3">
                  <button className="btn btn-gold btn-sm" onClick={capturarFoto}><Camera size={14} /> Capturar</button>
                  <button className="btn btn-sm border-0" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }} onClick={apagarCam}><CameraOff size={14} /> Cancelar</button>
                </div>
              </div>
            )}
            {img && !camOn && (
              <div className="position-relative overflow-hidden" style={{ maxHeight: 320 }}>
                <img src={img} alt="Documento" className="w-100 d-block" style={{ maxHeight: 300, objectFit: "contain", transform: `scale(${zoom}) rotate(${rot}deg)`, filter: `brightness(${brillo}%) contrast(${100 + (brillo - 100) * 0.4}%)`, transition: "transform .2s" }} />
                {busy && <div className="scanline" />}
              </div>
            )}
          </div>
          {camErr && <p className="mt-2 mb-0" style={{ fontSize: 12, color: "var(--danger)" }}>{camErr}</p>}

          {img && (
            <div className="d-flex align-items-center gap-1 mt-2 flex-wrap">
              <button className="icon-btn" title="Acercar" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}><ZoomIn size={15} /></button>
              <button className="icon-btn" title="Alejar" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}><ZoomOut size={15} /></button>
              <button className="icon-btn" title="Rotar" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={15} /></button>
              <input type="range" min={60} max={160} value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} title="Brillo" className="flex-grow-1" style={{ minWidth: 80 }} />
              <button className="btn btn-ghost btn-xs" onClick={() => { setZoom(1); setRot(0); setBrillo(100); }}>Restablecer</button>
              <button className="btn btn-ghost btn-xs" onClick={() => fileRef.current?.click()}>Cambiar imagen</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value = ""; }} />

          <button className="btn btn-primary w-100 mt-3" onClick={procesar} disabled={!img || busy}>
            {busy ? <><Loader2 size={16} className="spin" /> Reconociendo… {progreso}%</> : <><Sparkles size={16} /> Reconocer con la IA de Google</>}
          </button>
          {busy && <div className="progress mt-2"><div className="bar bar-anim" style={{ width: `${progreso}%`, background: "var(--jyg-gold)" }} /></div>}
          <p className="d-flex align-items-center gap-1 mt-2 mb-0" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            <ShieldCheck size={13} style={{ color: "var(--ok)" }} /> Conexión segura con Google Cloud Vision · OCR local en tu navegador
          </p>
        </div>

        <div className="col-12 col-md-6">
          {!draft ? (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4 rounded-4" style={{ background: "var(--card-bg-2)", minHeight: 250 }}>
              <GoogleG size={30} />
              <p className="font-display fw-semibold mt-3 mb-1" style={{ fontSize: 13.5 }}>Motor OCR en tu navegador</p>
              <p style={{ fontSize: 12, margin: 0, maxWidth: 260, color: "var(--ink-faint)" }}>
                Los documentos se procesan localmente con Tesseract (spa) y la integración de Google. Nada sale de tu equipo sin tu permiso.
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <Field label="Nombres detectados"><input className="input" value={draft.nombres} onChange={(e) => setDraft({ ...draft, nombres: e.target.value })} /></Field>
              <div className="row g-3">
                <Field span="c-6" label="Cédula"><input className="input" value={draft.ci} onChange={(e) => setDraft({ ...draft, ci: e.target.value })} /></Field>
                <Field span="c-6" label="Fecha"><input className="input" value={draft.fecha} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} /></Field>
              </div>
              {draft.raw && (
                <div>
                  <button className="btn btn-ghost btn-xs" onClick={() => setMostrarTodo((v) => !v)}><Eye size={12} /> {mostrarTodo ? "Ocultar texto completo" : "Ver texto extraído"}</button>
                  {mostrarTodo && (
                    <pre className="mt-2 p-3 rounded-3 overflow-auto" style={{ background: "var(--card-bg-2)", maxHeight: 130, whiteSpace: "pre-wrap", fontSize: 11, color: "var(--ink-soft)" }}>{draft.raw}</pre>
                  )}
                </div>
              )}
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-primary btn-sm" onClick={usarEnFormulario}><UserPlus size={14} /> Usar en formulario</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(draft.raw || "").then(() => toast("Texto copiado", "ok")).catch(() => undefined); }}><Copy size={14} /> Copiar texto</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* Página Escáner OCR */
export function OcrPage() {
  const { setOcrOpen, db, setRoute } = useApp();
  const [q, setQ] = useState("");
  const recientes = db.estudiantes.filter((e) => (e.observaciones || "").toLowerCase().includes("ocr")).filter((e) => !q || e.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1 className="d-flex align-items-center gap-2">Escáner OCR <GoogleG size={24} /></h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Visor inteligente con la IA de Google Cloud — el OCR corre en tu navegador</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOcrOpen(true)}><ScanLine size={16} /> Abrir escáner</button>
      </div>

      <div className="row g-4 mb-4">
        {[
          { icon: ScanLine, t: "C.I. venezolana", d: "Extrae nombre y número de cédula con formato V-00.000.000 listo para el registro.", c: "var(--jyg-navy)", bg: "var(--tint-navy-2)" },
          { icon: Sparkles, t: "Partida de nacimiento", d: "Lee nombres, fechas y datos del acta, ignorando el membrete oficial automáticamente.", c: "var(--jyg-gold-deep)", bg: "var(--tint-gold)" },
          { icon: ShieldCheck, t: "Motor OCR", d: "Cuenta de servicio activa · " + OCR_CRED.correo.split("@")[0] + "@•••", c: "var(--ok)", bg: "var(--tint-ok)" },
        ].map((x, i) => (
          <div key={x.t} className="col-12 col-md-4">
            <div className="card p-4 h-100 reveal card-lift" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="d-flex align-items-center justify-content-center rounded-3 mb-3" style={{ width: 44, height: 44, background: x.bg, color: x.c }}><x.icon size={20} /></div>
              <h3 className="font-display fw-bold m-0" style={{ fontSize: 14.5 }}>{x.t}</h3>
              <p style={{ fontSize: 12.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>{x.d}</p>
              {x.t === "Motor OCR" && <button className="btn btn-ghost btn-xs mt-3 w-100" onClick={() => setRoute("config")}><Settings size={12} /> Ver credenciales en Configuración</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <h3 className="font-display fw-bold flex-grow-1 m-0" style={{ fontSize: 16 }}>Registros creados por OCR</h3>
          <div className="d-flex align-items-center gap-2 rounded-pill px-3" style={{ background: "var(--card-bg-2)", border: "1.5px solid var(--line)", height: 36 }}>
            <Search size={14} style={{ color: "var(--ink-faint)" }} />
            <input className="border-0 bg-transparent" style={{ outline: "none", width: 180, fontSize: 13, color: "var(--ink)" }} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {recientes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-faint)", textAlign: "center", padding: "16px 0" }}>Aún no hay estudiantes creados desde el escáner. Pulsa el botón dorado flotante para empezar.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {recientes.map((e) => (
              <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="d-flex align-items-center gap-2 p-2 rounded-3 border-0 text-start w-100" style={{ background: "var(--card-bg-2)", color: "var(--ink)", cursor: "pointer" }}>
                <span className="d-flex align-items-center justify-content-center rounded-3 font-display fw-bold" style={{ width: 36, height: 36, fontSize: 12, background: "var(--tint-navy-2)", color: "var(--jyg-navy)" }}>{e.nombre[0]}</span>
                <span className="flex-grow-1"><span className="d-block font-display fw-semibold" style={{ fontSize: 13 }}>{e.nombre}</span><span className="d-block" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{e.pedido} · {e.ci || "S/C"}</span></span>
                <Badge tone="blue" dot>OCR</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="d-none"><GraduationCap size={1} /><Check size={1} /><X size={1} />{fmtFecha(todayISO())}</span>
    </div>
  );
}
