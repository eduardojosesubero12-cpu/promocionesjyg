import React from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AppProvider, useApp, type Route } from "./lib/store";
import Shell from "./components/Shell";
import { ConfirmHost, SuccessHost, ToastHost } from "./components/ui";
import Dashboard from "./modules/Dashboard";
import { Escuelas, Docentes, Estudiantes, Clientes, Ventas, Cotizaciones, Mensajes } from "./modules/CRM";
import Paquetes from "./modules/Paquetes";
import { Sesiones, Agenda, Produccion, EtiquetasQRPage, OcrModal, OcrPage, Facturas } from "./modules/Operaciones";
import { Reportes, Usuarios, Configuracion, Integraciones } from "./modules/Admin";
import Login from "./modules/Login";

const ROUTES: Record<Route, React.ComponentType> = {
  dashboard: Dashboard, clientes: Clientes, escuelas: Escuelas, docentes: Docentes,
  estudiantes: Estudiantes, ventas: Ventas, paquetes: Paquetes, cotizaciones: Cotizaciones,
  mensajes: Mensajes, sesiones: Sesiones, agenda: Agenda, produccion: Produccion,
  qr: EtiquetasQRPage, facturas: Facturas, ocr: OcrPage,
  reportes: Reportes, usuarios: Usuarios, config: Configuracion, integraciones: Integraciones,
};

function Router() {
  const { route } = useApp();
  const Page = ROUTES[route] || Dashboard;
  return <Page />;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e9edf3", fontFamily: "Poppins, sans-serif", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", maxWidth: 470, textAlign: "center", boxShadow: "0 24px 60px -18px rgba(16,65,114,.35)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "#fde9e7", color: "#e5342b", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800 }}>!</div>
            <h2 style={{ margin: "14px 0 6px", fontSize: 20, color: "#1a2332" }}>El CRM encontró un problema</h2>
            <p style={{ color: "#4d5a6e", fontSize: 13.5, margin: 0 }}>
              Tus datos están guardados en este navegador. Reinicia la vista para continuar; si persiste, restaura el último respaldo desde Configuración.
            </p>
            <p style={{ color: "#8b97a9", fontSize: 11.5 }}>{String(this.state.error.message || this.state.error)}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{ marginTop: 14, height: 42, padding: "0 22px", borderRadius: 12, border: "none", background: "linear-gradient(150deg,#104172,#0c3560)", color: "#fff", fontFamily: "Poppins", fontWeight: 600, cursor: "pointer" }}>
              Reiniciar CRM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Gate de acceso: sin sesión iniciada solo se muestra la pantalla de login */
function Gate() {
  const { sesion } = useApp();
  if (!sesion) return <Login />;
  return (
    <>
      <Shell>
        <Router />
      </Shell>
      <OcrModal />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Gate />
        <ConfirmHost />
        <SuccessHost />
        <ToastHost />
      </AppProvider>
      <SpeedInsights />
    </ErrorBoundary>
  );
}
