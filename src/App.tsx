import React from "react";
import { AppProvider, useApp, type Route } from "./lib/store";
import Shell from "./components/Shell";
import { ConfirmHost, SuccessHost, ToastHost } from "./components/ui";
import Dashboard from "./modules/Dashboard";
import Clientes from "./modules/Clientes";
import { Escuelas, Docentes } from "./modules/EscuelasDocentes";
import Estudiantes from "./modules/Estudiantes";
import { Pedidos, Cotizaciones } from "./modules/Ventas";
import Paquetes from "./modules/Paquetes";
import Produccion from "./modules/Produccion";
import Reportes from "./modules/Reportes";
import { OcrModal, OcrPage } from "./modules/OcrQr";
import EtiquetasQRPage from "./modules/EtiquetasQR";
import { Sesiones, Agenda, Mensajes } from "./modules/AgendaMensajes";
import { Usuarios, Configuracion, Integraciones } from "./modules/Admin";
import Facturas from "./modules/Facturas";

const ROUTES: Record<Route, React.ComponentType> = {
  dashboard: Dashboard, clientes: Clientes, escuelas: Escuelas, docentes: Docentes,
  estudiantes: Estudiantes, ventas: Pedidos, cotizaciones: Cotizaciones, paquetes: Paquetes,
  mensajes: Mensajes, sesiones: Sesiones, agenda: Agenda, produccion: Produccion,
  qr: EtiquetasQRPage, ocr: OcrPage, facturas: Facturas,
  reportes: Reportes, usuarios: Usuarios, config: Configuracion, integraciones: Integraciones,
};

function Router() {
  const { route } = useApp();
  const Page = ROUTES[route] || Dashboard;
  return <Page />;
}

/* Si algo falla en ejecución, muestra una pantalla de recuperación en vez de dejar la app en blanco */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#eef1f6", fontFamily: "Poppins, sans-serif", padding: 24 }}>
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Shell>
          <Router />
        </Shell>
        <OcrModal />
        <ConfirmHost />
        <SuccessHost />
        <ToastHost />
      </AppProvider>
    </ErrorBoundary>
  );
}
