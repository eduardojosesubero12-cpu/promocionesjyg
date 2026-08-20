import React from "react";
import { AppProvider, useApp } from "./lib/store";
import type { Route } from "./lib/store";
import Shell from "./components/Shell";
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

const ROUTES: Record<Route, React.ComponentType> = {
  dashboard: Dashboard,
  clientes: Clientes,
  escuelas: Escuelas,
  docentes: Docentes,
  estudiantes: Estudiantes,
  ventas: Pedidos,
  cotizaciones: Cotizaciones,
  paquetes: Paquetes,
  mensajes: Mensajes,
  sesiones: Sesiones,
  agenda: Agenda,
  produccion: Produccion,
  qr: EtiquetasQRPage,
  ocr: OcrPage,
  reportes: Reportes,
  usuarios: Usuarios,
  config: Configuracion,
  integraciones: Integraciones,
};

function Router() {
  const { route, ocrOpen, setOcrOpen } = useApp();
  const Page = ROUTES[route] || Dashboard;
  return (
    <Shell>
      <Page />
      {ocrOpen && <OcrModal onClose={() => setOcrOpen(false)} />}
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
