# 📋 Esquema SQL Actualizado - CRM Promociones JyG

## ✅ Cambios Realizados

Se ha actualizado el esquema SQL para incluir las columnas **`email`** y **`password`** en la tabla `usuarios`, permitiendo el almacenamiento completo de credenciales de usuarios con sus roles.

---

## 🔧 Tabla de Usuarios Actualizada

### Estructura Completa

```sql
create table if not exists usuarios (
  id text primary key,
  nombre text default '',
  usuario text default '',
  email text default '',
  password text default '',
  rol text default 'operador',
  activo boolean default true
);
```

### Columnas Nuevas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `email` | text | Correo electrónico del usuario |
| `password` | text | Contraseña hasheada con SHA-256 + salt |

---

## 📦 Scripts SQL Disponibles

### 1. **Esquema Completo** (`SUPABASE_SCHEMA_SEGURO`)
Script idempotente que crea las 18 tablas del sistema:
- Crea tablas si no existen
- Agrega columnas faltantes
- Habilita RLS (Row Level Security)
- Configura políticas de acceso
- Activa tiempo real (Realtime)

**Uso:** Ejecutar en Supabase → SQL Editor

### 2. **Migración** (`MIGRACIONES_SQL`)
Script para actualizar instalaciones existentes:
- Agrega columnas `email` y `password` a tabla `usuarios`
- No modifica datos existentes
- Seguro de ejecutar múltiples veces

---

## 🚀 Cómo Aplicar los Cambios

### Para Instalaciones Nuevas

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia el contenido de `SUPABASE_SCHEMA_SEGURO` desde `/workspace/src/lib/data.ts`
3. Ejecuta el script completo
4. En el CRM: **Integraciones** → **"Verificar ahora"**

### Para Instalaciones Existentes

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia el contenido de `MIGRACIONES_SQL` desde `/workspace/src/lib/data.ts` (líneas 663-768)
3. Ejecuta el script de migración
4. Las columnas `email` y `password` se agregarán automáticamente
5. En el CRM: **Integraciones** → **"Subir base completa"**

---

## 🔐 Seguridad de Contraseñas

Las contraseñas se almacenan con:
- **Hash SHA-256** con salt único
- Salt configurado en variable de entorno `PASS_SALT`
- Migración automática de contraseñas en texto plano

**Ejemplo de hash:**
```javascript
// Contraseña: "JyG-Admin-2026"
// Hash resultante: "5f0ae2cbb..."
```

---

## 📊 Todas las Tablas del Sistema (18)

1. `escuelas` - Instituciones educativas
2. `docentes` - Profesores
3. `estudiantes` - Estudiantes y pedidos
4. `pagos` - Pagos y abonos
5. `adicionales_items` - Productos adicionales
6. `cotizaciones` - Cotizaciones
7. `cotizacion_items` - Items de cotización
8. `sesiones` - Sesiones fotográficas
9. `eventos` - Eventos y citas
10. `mensajes` - Logs de mensajes
11. **`usuarios`** - Usuarios del sistema ✨ *ACTUALIZADA*
12. `historial_tasas` - Historial de tasas de cambio
13. `paquetes_escuelas` - Paquetes por escuela
14. `configuracion` - Configuración del CRM
15. `facturas` - Registro de facturación
16. `tarjetas_qr` - Log de tarjetas QR
17. `escaneos_ocr` - Log de escaneos OCR
18. `registros_produccion` - Control de producción

---

## ✅ Verificación Post-Migración

Después de aplicar el esquema, verifica:

```sql
-- Verificar columnas de la tabla usuarios
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;

-- Debería mostrar: id, nombre, usuario, email, password, rol, activo
```

---

## 🔄 Sincronización Automática

Una vez actualizado el esquema:
- Los nuevos usuarios se guardan automáticamente en Supabase
- Los cambios de contraseñas se sincronizan inmediatamente
- Los roles y permisos se persisten en la nube
- El sistema funciona offline si Supabase no está disponible

---

**Fecha de actualización:** Septiembre 2025  
**Versión del esquema:** 2.1  
**Tablas totales:** 18
