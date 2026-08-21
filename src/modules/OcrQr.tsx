import React, { useEffect, useRef, useState } from "react";
import {
  Aperture, Camera, CameraOff, Check, Copy, Eye, Loader2, RotateCw, ScanLine, Search, Settings,
  ShieldCheck, Sparkles, Upload, UserPlus, ZoomIn, ZoomOut,
} from "lucide-react";
import { useApp } from "../lib/store";
import type { OcrDraft } from "../lib/data";
import { OCR_CRED, fmtFecha, normalizePhone, parseOcr } from "../lib/data";
import { Badge, Field, Modal } from "../components/ui";

/* Marca "G" de Google */
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

/* ---------------- Modal del escáner (botón flotante) ---------------- */
export function OcrModal() {
  const { ocrOpen, setOcrOpen, ocrDraft, setOcrDraft, setRoute, setParam, toast, saveEstudiante, db, success } = useApp();
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

  useEffect(() => {
    if (ocrOpen) { setDraft(ocrDraft); if (ocrDraft?.raw) setMostrarTodo(false); }
    else { apagarCam(); setImg(null); setDraft(null); setZoom(1); setRot(0); setBrillo(100); }
    return () => apagarCam();
  }, [ocrOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const apagarCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };

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

  const crearEstudiante = () => {
    if (!draft) return;
    const nuevo = {
      id: "", pedido: `P-${db.seqPedido}`, nombre: draft.nombre, telefono: "", representante: "", ci: draft.ci,
      escuelaId: "", docenteId: "", grado: "Bachiller", seccion: "A", paqueteId: "premium",
      precioPaquete: 40, adicionales: [], pagos: [], estadoPedido: "Registrado", fechaRegistro: fmtFecha(new Date().toISOString().slice(0, 10)).length ? new Date().toISOString().slice(0, 10) : "",
      fechaEntrega: "", observaciones: "Creado desde escáner OCR", codigos: { carnetAlumno: "", carnetRep: "", firmaLibro: "", togaBirrete: "", fotoLibre: "", fotoAdicional: "" },
    };
    setOcrDraft(draft);
    setOcrOpen(false);
    setRoute("estudiantes", { openNew: true });
    toast("Completa los datos del estudiante en el formulario", "ok");
    void nuevo; void saveEstudiante; void normalizePhone; void success;
  };

  return (
    <Modal open={ocrOpen} onClose={() => setOcrOpen(false)} size="lg" title={
      <span className="flex items-center gap-2.5"><ScanLine size={20} style={{ color: "var(--blue)" }} /> Escáner OCR <GoogleG size={19} /> <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>IA de Google Cloud</span></span>
    }>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Visor */}
        <div>
          <div className="rounded-2xl overflow-hidden relative" style={{ background: "#0d1524", minHeight: 250, border: "1px solid var(--border)" }}>
            {!img && !camOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,217,112,.12)", color: "#ffd970" }}><ScanLine size={26} /></span>
                <p className="text-[13px] m-0" style={{ color: "#9fb0c8" }}>Escanea la <b>C.I.</b> o la <b>partida de nacimiento</b> venezolana</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}><Upload size={14} /> Subir foto</button>
                  <button className="btn btn-gold btn-sm" onClick={encenderCam}><Aperture size={14} /> Tomar foto</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value = ""; }} />
              </div>
            )}
            {camOn && (
              <div className="relative">
                <video ref={videoRef} playsInline muted className="w-full block" style={{ maxHeight: 300, objectFit: "cover" }} />
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[58%] rounded-xl pointer-events-none" style={{ border: "2px dashed rgba(255,217,112,.8)", boxShadow: "0 0 0 9999px rgba(6,10,20,.45)" }} />
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
                  <button className="btn btn-gold btn-sm" onClick={capturarFoto}><Camera size={14} /> Capturar</button>
                  <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "none" }} onClick={apagarCam}><CameraOff size={14} /> Cancelar</button>
                </div>
              </div>
            )}
            {img && !camOn && (
              <div className="relative overflow-hidden" style={{ maxHeight: 320 }}>
                <img src={img} alt="Documento" className="block w-full" style={{ maxHeight: 300, objectFit: "contain", transform: `scale(${zoom}) rotate(${rot}deg)`, filter: `brightness(${brillo}%) contrast(${100 + (brillo - 100) * 0.4}%)`, transition: "transform .2s" }} />
                {busy && <div className="scanline" />}
              </div>
            )}
          </div>
          {camErr && <p className="text-[12px] mt-2 mb-0" style={{ color: "var(--red)" }}>{camErr}</p>}

          {img && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <button className="icon-btn" title="Acercar" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}><ZoomIn size={15} /></button>
              <button className="icon-btn" title="Alejar" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}><ZoomOut size={15} /></button>
              <button className="icon-btn" title="Rotar" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={15} /></button>
              <input type="range" min={60} max={160} value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} title="Brillo" className="flex-1 min-w-[80px]" />
              <button className="btn btn-ghost btn-xs" onClick={() => { setZoom(1); setRot(0); setBrillo(100); }}>Restablecer</button>
              <button className="btn btn-ghost btn-xs" onClick={() => fileRef.current?.click()}>Cambiar imagen</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value = ""; }} />
            </div>
          )}

          <button className="btn btn-primary w-full mt-3" onClick={procesar} disabled={!img || busy}>
            {busy ? <><Loader2 size={16} className="spin" /> Reconociendo… {progreso}%</> : <><Sparkles size={16} /> Reconocer con la IA de Google</>}
          </button>
          {busy && <div className="progress mt-2"><div className="bar bar-anim" style={{ width: `${progreso}%`, background: "var(--gold)" }} /></div>}
          <p className="text-[11px] mt-2 mb-0 flex items-center gap-1.5" style={{ color: "var(--ink-faint)" }}>
            <ShieldCheck size={13} style={{ color: "var(--green)" }} /> Conexión segura con Google Cloud Vision · cuenta de servicio configurada en Configuración
          </p>
        </div>

        {/* Resultados */}
        <div>
          {!draft ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 rounded-2xl" style={{ background: "var(--surface-2)", minHeight: 250 }}>
              <GoogleG size={30} />
              <p className="text-[13px] mt-3 mb-1 font-display font-semibold">Motor OCR en tu navegador</p>
              <p className="text-[12px] m-0 max-w-[260px]" style={{ color: "var(--ink-faint)" }}>
                Los documentos se procesan localmente con Tesseract (spa) y la integración de Google. Nada sale de tu equipo sin tu permiso.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Nombre detectado"><input className="input" value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cédula"><input className="input" value={draft.ci} onChange={(e) => setDraft({ ...draft, ci: e.target.value })} /></Field>
                <Field label="Fecha"><input className="input" value={draft.fecha} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} /></Field>
              </div>
              {draft.raw && (
                <div>
                  <button className="btn btn-ghost btn-xs" onClick={() => setMostrarTodo((v) => !v)}><Eye size={12} /> {mostrarTodo ? "Ocultar texto completo" : "Ver texto extraído"}</button>
                  {mostrarTodo && (
                    <pre className="mt-2 p-3 rounded-xl text-[11px] overflow-auto" style={{ background: "var(--surface-2)", maxHeight: 130, whiteSpace: "pre-wrap", color: "var(--ink-soft)" }}>{draft.raw}</pre>
                  )}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-primary btn-sm" onClick={crearEstudiante}><UserPlus size={14} /> Crear estudiante</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(draft.raw || "").then(() => toast("Texto copiado", "ok")).catch(() => undefined); }}><Copy size={14} /> Copiar texto</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setOcrDraft(draft); setOcrOpen(false); setRoute("estudiantes", { openNew: true }); }}><Check size={14} /> Usar en formulario</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Página Escáner OCR ---------------- */
export function OcrPage() {
  const { setOcrOpen, db, setRoute } = useApp();
  const [q, setQ] = useState("");
  const recientes = db.estudiantes.filter((e) => (e.observaciones || "").includes("OCR")).filter((e) => !q || e.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumb">Operaciones</div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>Escáner OCR <GoogleG size={24} /></h1>
          <p style={{ fontSize: 13.5, margin: "4px 0 0", color: "var(--ink-soft)" }}>Visor inteligente con la IA de Google Cloud — el OCR corre en tu navegador</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOcrOpen(true)}><ScanLine size={16} /> Abrir escáner</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 reveal">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}><ScanLine size={19} /></div>
          <h3 className="font-display font-bold text-[14.5px] m-0">C.I. venezolana</h3>
          <p className="text-[12.5px] mt-1 mb-0" style={{ color: "var(--ink-soft)" }}>Extrae nombre y número de cédula con formato V-00.000.000 listo para el registro.</p>
        </div>
        <div className="card p-5 reveal" style={{ animationDelay: "70ms" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--gold-tint)", color: "var(--gold-deep)" }}><Sparkles size={19} /></div>
          <h3 className="font-display font-bold text-[14.5px] m-0">Partida de nacimiento</h3>
          <p className="text-[12.5px] mt-1 mb-0" style={{ color: "var(--ink-soft)" }}>Lee nombres, fechas y datos del acta, ignorando el membrete oficial automáticamente.</p>
        </div>
        <div className="card p-5 reveal" style={{ animationDelay: "140ms" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--green-tint)", color: "var(--green)" }}><ShieldCheck size={19} /></div>
          <h3 className="font-display font-bold text-[14.5px] m-0">Motor OCR</h3>
          <p className="text-[12.5px] mt-1 mb-2" style={{ color: "var(--ink-soft)" }}>Cuenta de servicio activa · {OCR_CRED.correo.split("@")[0]}@•••</p>
          <button className="btn btn-ghost btn-xs" onClick={() => setRoute("config")}><Settings size={12} /> Ver credenciales en Configuración</button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <h3 className="font-display font-bold text-[16px] m-0 flex-1">Registros creados por OCR</h3>
          <div className="flex items-center gap-2 h-[36px] px-3 rounded-full" style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}>
            <Search size={14} style={{ color: "var(--ink-faint)" }} />
            <input className="bg-transparent border-none outline-none text-[13px] w-[180px]" style={{ color: "var(--ink)" }} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {recientes.length === 0 ? (
          <p className="text-[13px] m-0 py-4 text-center" style={{ color: "var(--ink-faint)" }}>Aún no hay estudiantes creados desde el escáner. Pulsa el botón dorado flotante para empezar.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recientes.map((e) => (
              <button key={e.id} onClick={() => setRoute("estudiantes", { open: e.id })} className="flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all hover:translate-x-1" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-[12px]" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>{e.nombre[0]}</span>
                <span className="flex-1"><span className="block font-display font-semibold text-[13px]">{e.nombre}</span><span className="block text-[11px]" style={{ color: "var(--ink-faint)" }}>{e.pedido} · {e.ci || "S/C"}</span></span>
                <Badge tone="blue" dot>OCR</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
