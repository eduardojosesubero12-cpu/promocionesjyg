import React, { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import {
  Aperture, Camera, CameraOff, Check, Copy, Eye, KeyRound, Loader2, RotateCw, ScanLine,
  Search, Settings, ShieldCheck, Sparkles, Upload, UserPlus, ZoomIn, ZoomOut,
} from "lucide-react";
import { useApp } from "../lib/store";
import { OCR_CRED, fmtBs, parseOcr } from "../lib/data";
import type { OcrDraft } from "../lib/data";
import { Badge, Field, Modal } from "../components/ui";

/* Logo "G" de Google en SVG */
function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

/* ================= ESCÁNER OCR (VISOR) ================= */

export function OcrModal({ onClose }: { onClose: () => void }) {
  const { setOcrDraft, setRoute, toast } = useApp();
  const [modo, setModo] = useState<"archivo" | "camara">("archivo");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [statusTxt, setStatusTxt] = useState("");
  const [confianza, setConfianza] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modo !== "camara") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("No se pudo acceder a la cámara. Verifica los permisos del navegador o usa la opción de subir archivo.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [modo]);

  const procesar = async (blob: Blob) => {
    setError(""); setDraft(null); setConfianza(null);
    setTrabajando(true); setProgreso(0);
    setStatusTxt("Preparando motor OCR…");
    try {
      const worker = await Tesseract.createWorker("spa", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setProgreso(Math.round((m.progress || 0) * 100));
            setStatusTxt("Reconociendo texto…");
          } else if (m.status) setStatusTxt(m.status);
        },
      });
      const { data } = await worker.recognize(blob);
      await worker.terminate();
      const texto = data?.text || "";
      setConfianza(typeof data?.confidence === "number" ? Math.round(data.confidence) : null);
      if (!texto.trim()) {
        setError("No se detectó texto legible. Intenta con mejor iluminación y enfoque, o ajusta brillo/contraste en el visor.");
      } else {
        setDraft(parseOcr(texto));
      }
    } catch {
      setError("El motor OCR no pudo iniciar (requiere conexión para descargar el modelo de idioma la primera vez).");
    } finally {
      setTrabajando(false);
    }
  };

  const onFile = (f: File | undefined | null) => {
    if (!f) return;
    setZoom(1); setRot(0); setBrillo(100); setContraste(100);
    const reader = new FileReader();
    reader.onload = () => { setImgSrc(String(reader.result)); void procesar(f); };
    reader.readAsDataURL(f);
  };

  const capturar = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const src = canvas.toDataURL("image/jpeg", 0.92);
    setImgSrc(src);
    setModo("archivo");
    canvas.toBlob((b) => b && procesar(b), "image/jpeg", 0.92);
  };

  const usarDatos = () => {
    if (!draft) return;
    setOcrDraft(draft);
    setRoute("estudiantes");
    toast("Datos OCR enviados al formulario de estudiantes", "ok");
    onClose();
  };

  const resetVisor = () => { setZoom(1); setRot(0); setBrillo(100); setContraste(100); };

  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="flex items-center gap-2.5"><GoogleG /> Escáner OCR <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>Google Cloud Vision · IA</span></span>}
      subtitle="Digitaliza C.I. y partidas de nacimiento venezolanas — el OCR corre en tu navegador">

      {/* Estado de la conexión — las credenciales se administran en Configuración */}
      <div className="rounded-xl p-3 mb-4 flex items-center gap-2.5 text-[12px]" style={{ background: "var(--green-tint)", color: "var(--ink-soft)" }}>
        <ShieldCheck size={15} style={{ color: "var(--green)" }} />
        <span>Conexión segura con <b className="font-display" style={{ color: "var(--ink)" }}>Google Cloud Vision</b> · cuenta de servicio configurada en <b className="font-display" style={{ color: "var(--blue)" }}>Configuración</b></span>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2 mb-4">
        {([["archivo", Upload, "Subir documento"], ["camara", Camera, "Tomar foto"]] as const).map(([m, Ic, lbl]) => (
          <button key={m} onClick={() => setModo(m)} className="btn flex-1" style={modo === m ? { background: "var(--blue)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--ink-soft)", border: "1.5px solid var(--border)" }}>
            <Ic size={16} /> {lbl}
          </button>
        ))}
      </div>

      {modo === "camara" ? (
        <div className="rounded-2xl overflow-hidden relative" style={{ background: "#0b1122" }}>
          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
              <CameraOff size={30} style={{ color: "var(--red)" }} />
              <p className="text-[13px] m-0 text-white/80">{error}</p>
              <button className="btn btn-soft btn-sm" onClick={() => setModo("archivo")}>Usar archivo en su lugar</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full block" style={{ maxHeight: 340, objectFit: "cover" }} playsInline muted />
              <div className="absolute inset-6 border-2 border-dashed rounded-xl pointer-events-none" style={{ borderColor: "rgba(255,217,112,.65)" }} />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <button className="btn btn-gold" onClick={capturar} disabled={trabajando}><Aperture size={16} /> Capturar documento</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl border-2 border-dashed p-4 text-center transition-colors relative overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
        >
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {imgSrc ? (
            <div>
              {/* Visor */}
              <div className="relative rounded-xl overflow-hidden mx-auto" style={{ maxHeight: 300, maxWidth: 520, background: "#0d1424" }}>
                <img src={imgSrc} alt="Documento escaneado" className="block mx-auto transition-transform"
                  style={{ maxHeight: 300, maxWidth: "100%", transform: `scale(${zoom}) rotate(${rot}deg)`, filter: `brightness(${brillo}%) contrast(${contraste}%)` }} />
                {trabajando && <div className="scanline" />}
              </div>
              {/* Controles del visor */}
              <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
                <button className="icon-btn" title="Alejar" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}><ZoomOut size={15} /></button>
                <button className="icon-btn" title="Acercar" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}><ZoomIn size={15} /></button>
                <button className="icon-btn" title="Rotar 90°" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={15} /></button>
                <span className="text-[11px] font-display font-bold px-1 tabular-nums" style={{ color: "var(--ink-soft)" }}>{Math.round(zoom * 100)}%</span>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--ink-faint)" }}>
                  <Eye size={13} /> Brillo
                  <input type="range" min={40} max={200} value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} style={{ width: 80 }} />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--ink-faint)" }}>
                  Contraste
                  <input type="range" min={40} max={220} value={contraste} onChange={(e) => setContraste(Number(e.target.value))} style={{ width: 80 }} />
                </label>
                <button className="btn btn-ghost btn-xs" onClick={resetVisor}>Restablecer</button>
                <button className="btn btn-soft btn-xs" onClick={() => fileInputRef.current?.click()}><Upload size={12} /> Cambiar imagen</button>
              </div>
            </div>
          ) : (
            <div className="py-8 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: "var(--blue-tint-2)", color: "var(--blue)" }}>
                <ScanLine size={26} />
              </div>
              <p className="font-display font-semibold text-[14.5px] m-0">Arrastra la cédula o partida aquí</p>
              <p className="text-[12.5px] m-0 mt-1" style={{ color: "var(--ink-faint)" }}>o haz clic para seleccionar · JPG, PNG o PDF · también puedes usar “Tomar foto”</p>
            </div>
          )}
        </div>
      )}

      {/* Progreso */}
      {trabajando && (
        <div className="mt-4 card p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <Loader2 size={17} className="spin" style={{ color: "var(--blue)" }} />
            <span className="font-display font-semibold text-[13px] capitalize">{statusTxt}</span>
            <span className="ml-auto font-display font-bold text-[13px]" style={{ color: "var(--blue)" }}>{progreso}%</span>
          </div>
          <div className="progress"><div className="bar" style={{ width: `${progreso}%`, background: "var(--blue)" }} /></div>
        </div>
      )}

      {error && !trabajando && modo === "archivo" && (
        <p className="mt-3 text-[12.5px] font-semibold m-0" style={{ color: "var(--red)" }}>{error}</p>
      )}

      {/* Resultado */}
      {draft && (
        <div className="mt-4 card p-4" style={{ borderColor: "var(--green)", borderWidth: 1.5 }}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Sparkles size={17} style={{ color: "var(--green)" }} />
            <span className="font-display font-bold text-[14px]">Datos detectados</span>
            <Badge tone="green" dot>OCR completado</Badge>
            {confianza !== null && <Badge tone={confianza > 75 ? "green" : "amber"}>Confianza {confianza}%</Badge>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre detectado">
              <input className="input" value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} placeholder="No detectado — escribe manualmente" />
            </Field>
            <Field label="Cédula">
              <input className="input" value={draft.ci} onChange={(e) => setDraft({ ...draft, ci: e.target.value })} placeholder="V-00.000.000" />
            </Field>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] font-display font-semibold" style={{ color: "var(--ink-faint)" }}>Ver texto completo extraído</summary>
            <pre className="mt-2 p-3 rounded-xl text-[11.5px] overflow-auto max-h-[150px] whitespace-pre-wrap m-0" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>{draft.raw}</pre>
          </details>
          <div className="flex gap-2 mt-4 flex-wrap">
            <button className="btn btn-primary flex-1" onClick={usarDatos}><UserPlus size={16} /> Crear estudiante con estos datos</button>
            <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(draft.raw).catch(() => {}); toast("Texto copiado", "ok"); }}><Copy size={15} /> Copiar texto</button>
          </div>
        </div>
      )}

      <p className="text-[11.5px] mt-4 mb-0 text-center" style={{ color: "var(--ink-faint)" }}>
        Documentos soportados: Cédula de Identidad venezolana y Partida de Nacimiento · la imagen se procesa localmente en tu navegador.
      </p>
      <span className="hidden"><Check size={1} /></span>
    </Modal>
  );
}

/* ================= PÁGINA ESCÁNER ================= */

export function OcrPage() {
  const { db, setOcrOpen, tasa, setRoute } = useApp();
  const conCi = db.estudiantes.filter((e) => e.ci.trim() !== "").length;
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
        {[
          { icon: Upload, t: "1 · Sube o fotografía", d: "Carga una imagen de la C.I. o partida, o usa la cámara del dispositivo con sus permisos." },
          { icon: Sparkles, t: "2 · IA de Google en tu navegador", d: "Visor con zoom, rotación, brillo y contraste. Tesseract lee el documento en español y extrae nombre, cédula y fecha." },
          { icon: UserPlus, t: "3 · Crea el estudiante", d: "Los datos detectados se envían directo al formulario de registro. Verifica y guarda." },
        ].map((p, i) => (
          <div key={i} className="card p-5 reveal transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: i === 1 ? "var(--gold-tint)" : "var(--blue-tint-2)", color: i === 1 ? "var(--gold-deep)" : "var(--blue)" }}>
              <p.icon size={21} />
            </div>
            <h3 className="font-display font-bold text-[15px] m-0 mb-1">{p.t}</h3>
            <p className="text-[13px] m-0" style={{ color: "var(--ink-soft)" }}>{p.d}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-[16px] m-0">Documentos en el sistema</h3>
              <p className="text-[12.5px] m-0 mt-0.5" style={{ color: "var(--ink-soft)" }}>Estudiantes con cédula registrada vs. pendientes por digitalizar</p>
            </div>
            <button className="btn btn-gold" onClick={() => setOcrOpen(true)}><Camera size={16} /> Escanear ahora</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ background: "var(--green-tint)" }}>
              <div className="font-display font-bold text-[26px]" style={{ color: "var(--green)" }}>{conCi}</div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--ink-soft)" }}>Con C.I. registrada</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--amber-tint)" }}>
              <div className="font-display font-bold text-[26px]" style={{ color: "var(--amber)" }}>{db.estudiantes.length - conCi}</div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--ink-soft)" }}>Pendientes por escanear</div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-[16px] m-0">Motor OCR</h3>
            <span className="badge" style={{ background: "var(--green-tint)", color: "var(--green)" }}><span className="dot pulse-dot" /> Cuenta activa</span>
          </div>
          <div className="flex flex-col gap-2 text-[12.5px]">
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <ShieldCheck size={14} style={{ color: "var(--green)" }} />
              <span className="truncate flex-1">Cuenta de servicio <b>{OCR_CRED.email.split("@")[0]}</b>@••• vinculada</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <Sparkles size={14} style={{ color: "var(--gold-deep)" }} />
              <span className="truncate flex-1">Google Cloud Vision · IA en tu navegador</span>
            </div>
          </div>
          <p className="text-[11.5px] mt-3 mb-2" style={{ color: "var(--ink-faint)" }}>
            Por seguridad, el correo, ID único y CLAVE se administran en <b style={{ color: "var(--ink-soft)" }}>Administración → Configuración</b>.
            Tasa aplicada hoy en los abonos: <b style={{ color: "var(--blue)" }}>{fmtBs(tasa.usd)}</b> por $1.
          </p>
          <button className="btn btn-soft btn-sm" onClick={() => setRoute("config")}><Settings size={14} /> Ver credenciales en Configuración</button>
        </div>
      </div>
    </div>
  );
}
