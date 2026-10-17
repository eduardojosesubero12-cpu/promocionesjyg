# 🎓 CRM Promociones JyG — Paquetes de Grado

Sistema de gestión (CRM) para **Promociones JyG**, empresa venezolana de paquetes de graduación.
Construido con **React 18 + Vite + TypeScript + Bootstrap 5**, con tasa del día en vivo
([ve.dolarapi.com](https://ve.dolarapi.com)), escaneo de cédulas con IA (Qwen vía OpenRouter),
tarjetas QR 7×5 cm y respaldo opcional en Supabase.

## ✨ Módulos

| Sección | Módulos |
|---|---|
| **Principal** | Dashboard (indicadores, tasa del día, pipeline de producción) |
| **CRM** | Clientes · Escuelas · Profesores · Estudiantes · Ventas/Pedidos · Paquetes · Cotizaciones · Mensajes |
| **Operaciones** | Sesiones Fotográficas · Agenda/Calendario · Producción · Tarjetas QR · Facturación · Escáner Inteligente |
| **Administración** | Reportes · Usuarios (roles y permisos) |
| **Sistema** | Configuración · Integraciones (Supabase) |

### Características clave

- **Tasa del día** en USD y EUR desde `ve.dolarapi.com`, con conversión automática Bs ⇄ $ en cada abono.
- **Escáner Inteligente**: extrae N° de cédula, nombres, apellidos y nacimiento de una foto (Qwen3-VL vía OpenRouter).
- **Tarjetas QR 7×5 cm** (tipo tarjeta de crédito) con frente/reverso imprimibles por lotes; al escanear abren el **Portal del estudiante**.
- **Portal autónomo**: archivo HTML descargable con todos los datos del estudiante, compartible a cualquier dispositivo.
- **Roles y permisos** editables con switches (Administrador, Operador, Producción, Cobranza), guardados permanentemente.
- **Catálogos editables**: adicionales (precios y tallas), grados, secciones y tallas de ropa desde Configuración.
- **Confirmaciones** estilo SweetAlert en cada guardar/eliminar.
- Datos persistidos en el navegador; sincronización opcional con **Supabase**.

## 🚀 Ejecutar localmente

```bash
npm install
npm run dev      # desarrollo
npm run build    # producción (carpeta dist/)
```

## 🔐 Configuración de claves (¡nunca en el código!)

Las claves son **secretos** y no deben vivir en el repositorio. Se configuran desde la app:

1. **Escáner Inteligente** → Configuración → *Motor de Escaneo Inteligente* → pega tu **API Key de OpenRouter** y prueba la conexión.
2. **Supabase** (opcional) → Integraciones → pega la **URL del proyecto** y la **anon key**.

Ambas quedan guardadas en el navegador (y en Supabase si sincronizas).

## ☁️ Desplegar en Vercel y conectar el login con Supabase

Este CRM es **Vite + React** (no Next.js), por lo que las variables de entorno
se leen desde `import.meta.env`. El cliente unificado está en
`src/lib/supabase.ts` (`sbClient`) con `persistSession: true` y
`autoRefreshToken: true`: la sesión iniciada con correo/contraseña **sobrevive
a recargas en producción** y el JWT se refresca solo. La sesión Auth se guarda
bajo una clave aislada por proyecto (`sb-<ref>-crm-auth`), para que
`promocionesjyg.vercel.app` y `localhost:3000` nunca compartan tokens.

### Paso 1 — Supabase → Authentication → URL Configuration
- **Site URL:** `https://promocionesjyg.vercel.app`
- **Redirect URLs:** añade `https://promocionesjyg.vercel.app/**` y `http://localhost:3000/**`

### Paso 2 — Vercel → Project `promocionesjyg` → Settings → Environment Variables
Agrega (categoría *Production*, *Preview* y *Development*) y **Redeploy**:

| Variable (Vercel) | Equivale a | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `VITE_SUPABASE_URL` | `https://kdzofrxquzhtixzjtgmx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` | tu anon/public key del proyecto |

> El código acepta **ambos prefijos** (`VITE_*` o `NEXT_PUBLIC_*`), así que
> puedes usar cualquiera de los dos nombres sin tocar el fuente.

En local, copia `.env.example` a `.env` con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

### Paso 3 — Verificar el login en producción
1. Abre `https://promocionesjyg.vercel.app` → inicia sesión con correo y contraseña.
2. El login valida en **dos capas**: Supabase Auth (bcrypt + JWT en servidor) y la tabla espejo `usuarios` (equivalente al chequeo contra `team_members`): si el miembro no existe o `activo = false`, el acceso se rechaza con mensaje claro y sesión cerrada.
3. Recarga la página (F5): debes permanecer dentro del CRM (sesión persistida + reanudada con flag `verified`).
4. Al pulsar **Salir**, el JWT de Auth se elimina (`signOut`).

⚠️ Nunca subas la `service_role` key a las variables públicas de Vercel: esa clave solo se pega en **Integraciones** (modo automático) y permanece en el navegador del administrador.

## 📤 Publicar en GitHub

El proyecto incluye scripts que publican con un **historial limpio** (sin commits que contengan secretos):

```bash
# En Git Bash / Linux / macOS:
bash publicar-github.sh

# En PowerShell (Windows):
powershell -ExecutionPolicy Bypass -File .\publicar-github.ps1
```

El script:
1. Verifica que el código no contenga secretos.
2. Crea una rama huérfana (historial nuevo de 1 commit).
3. Publica en la rama remota `crm-for-graduation-packages-6f794` con `--force`.
4. Instala el hook `pre-commit` (`.githooks/`) que bloquea futuros commits con secretos.

> ⚠️ Si una clave estuvo expuesta alguna vez en el código, **rotala**:
> - OpenRouter → https://openrouter.ai/keys (revoca y crea una nueva).
> - Cuenta de servicio de Google → Google Cloud → IAM → Cuentas de servicio.

## 🗂️ Estructura

```
├── index.html        # Punto de entrada (Bootstrap 5 + boxicons CDN + Poppins/Lato)
├── style.css         # Diseño original de la plantilla (sidebar cóncavo, navbar, tablas)
├── script.js         # Comportamiento original de la plantilla (menú, búsqueda, modo oscuro)
├── publicar-github.sh / .ps1   # Publicación en GitHub con historial limpio
└── src/
    ├── components/   # Shell (sidebar + navbar) y UI compartida (modal, tablas, alertas)
    ├── lib/          # data.ts (catálogos), store.tsx (estado global), supabase.ts
    ├── modules/      # Las 19 páginas del CRM
    └── App.tsx       # Router + ErrorBoundary
```

> **Nota:** `style.css` y `script.js` son los archivos de la plantilla original de diseño
> (sidebar con curvas cóncavas, navbar, tablas y modo oscuro). La app React los replica en
> `src/index.css` y `src/components/Shell.tsx` para mantener ese lenguaje visual en todo el CRM.
