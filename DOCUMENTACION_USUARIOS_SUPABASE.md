# 📚 Sincronización Automática de Usuarios y Roles con Supabase

## ✅ Característica Implementada

El sistema ahora **sincroniza automáticamente** los usuarios y configuraciones de roles con la base de datos de Supabase cada vez que realizas cambios.

### 🔹 ¿Qué se sincroniza automáticamente?

1. **Usuarios nuevos o modificados** - Cada vez que crees, edites o elimines un usuario
2. **Permisos de roles** - Cambios en los permisos de cada rol (admin, operador, produccion, cobranza)
3. **Estado de roles** - Activación o desactivación de roles completos

---

## 🚀 Cómo Funciona

### Flujo de Guardado de Usuario

```
┌─────────────────────┐
│  Crear/Editar       │
│  Usuario en UI      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  1. Guarda en       │
│  localStorage       │◄─── Persistencia local inmediata
│  (navegador)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Verifica        │
│  conexión Supabase  │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │ ¿Hay      │
     │ conexión? │
     └─────┬─────┘
           │
    ┌──────┴──────┐
    │             │
   SÍ            NO
    │             │
    ▼             ▼
┌────────┐   ┌────────────┐
│ Sync   │   │ Continúa   │
│ a      │   │ normal     │
│ Supa-  │   │ sin error  │
│ base   │   └────────────┘
└────────┘
```

### Código Implementado

#### `saveUsuario()` - Guardar/Crear Usuario
```typescript
const saveUsuario = useCallback(async (u: Usuario) => {
  // 1. Guarda inmediatamente en localStorage
  mutate((d) => ({ ...d, usuarios: upsert(d.usuarios, u) }));
  
  // 2. Sincroniza con Supabase en segundo plano
  (async () => {
    const { supabaseUrl, supabaseKey } = dbRef.current.config;
    if (!supabaseUrl || !supabaseKey) return;
    
    try {
      const { sbClient } = await import("./supabase");
      const client = sbClient(supabaseUrl, supabaseKey);
      
      // Upsert: inserta si no existe, actualiza si existe
      const { error } = await client.from('usuarios').upsert({
        id: u.id, 
        nombre: u.nombre, 
        usuario: u.usuario, 
        email: u.email,
        password: u.password,  // Ya hasheada con SHA-256
        rol: u.rol, 
        activo: u.activo
      });
      
      if (error) console.warn('Supabase: error al guardar usuario:', error.message);
    } catch (e: any) {
      console.warn('Supabase: fallo en sync de usuario:', e?.message || e);
    }
  })();
}, [mutate]);
```

#### `deleteUsuario()` - Eliminar Usuario
```typescript
const deleteUsuario = useCallback(async (id: string) => {
  // 1. Elimina inmediatamente de localStorage
  mutate((d) => ({ ...d, usuarios: d.usuarios.filter((x) => x.id !== id) }));
  
  // 2. Elimina de Supabase en segundo plano
  (async () => {
    const { supabaseUrl, supabaseKey } = dbRef.current.config;
    if (!supabaseUrl || !supabaseKey) return;
    
    try {
      const { sbClient } = await import("./supabase");
      const client = sbClient(supabaseUrl, supabaseKey);
      
      const { error } = await client.from('usuarios').delete().eq('id', id);
      if (error) console.warn('Supabase: error al eliminar usuario:', error.message);
    } catch (e: any) {
      console.warn('Supabase: fallo en sync de usuario:', e?.message || e);
    }
  })();
}, [mutate]);
```

#### `setRolPermisos()` - Sincronizar Permisos de Rol
```typescript
const setRolPermisos = useCallback(async (rol: Rol, rutas: string[]) => {
  // 1. Actualiza localStorage inmediatamente
  mutate((d) => ({
    ...d, 
    config: { 
      ...d.config, 
      rolesPermisos: { 
        ...(d.config.rolesPermisos || {}), 
        [rol]: rutas 
      } as Record<Rol, string[]> 
    },
  }));
  
  // 2. Sincroniza configuración con Supabase
  (async () => {
    const { supabaseUrl, supabaseKey } = dbRef.current.config;
    if (!supabaseUrl || !supabaseKey) return;
    
    try {
      const { sbClient } = await import("./supabase");
      const client = sbClient(supabaseUrl, supabaseKey);
      const cfg = dbRef.current.config;
      const nuevosPermisos = { ...(cfg.rolesPermisos || {}), [rol]: rutas };
      
      const { error } = await client.from('configuracion').upsert({
        id: 'jyg', 
        data: { ...cfg, rolesPermisos: nuevosPermisos }
      });
      
      if (error) console.warn('Supabase: error al guardar permisos:', error.message);
    } catch (e: any) {
      console.warn('Supabase: fallo en sync de permisos:', e?.message || e);
    }
  })();
}, [mutate]);
```

---

## 🔐 Seguridad de Contraseñas

Las contraseñas se guardan **hasheadas con SHA-256** usando un salt único:

```typescript
// Antes de guardar, la contraseña se hashea automáticamente
const password = nuevaPass ? await hashPass(nuevaPass) : form.password;
saveUsuario({ ...form, email, id: form.id || uid(), password });
```

### Configuración del Salt

El salt se configura en `.env.local`:
```bash
PASS_SALT=22fbb9fe2a2c63421e3b69895a2bc59b326b4a3efd2396e71d158abd14d4a3e4
```

**Importante**: Genera un salt único para cada instalación:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📋 Requisitos de Configuración

### 1. Variables de Entorno (.env.local)

```bash
# URL de tu proyecto Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co

# Clave pública (anon key) de Supabase
SUPABASE_KEY=tu-clave-publica-aqui

# Salt único para hashing de contraseñas
PASS_SALT=tu-salt-generado-aleatoriamente
```

### 2. Tablas en Supabase

Asegúrate de tener las tablas creadas ejecutando el script SQL en `src/lib/data.ts`:

```sql
-- Tabla de usuarios
create table if not exists usuarios (
  id text primary key,
  nombre text not null,
  usuario text not null,
  email text not null,
  password text not null,
  rol text not null check (rol in ('admin', 'operador', 'produccion', 'cobranza')),
  activo boolean default true
);

-- Tabla de configuración
create table if not exists configuracion (
  id text primary key,
  data jsonb,
  seq_pedido integer,
  seq_cot integer,
  current_user_id text
);
```

### 3. Row Level Security (RLS)

Configura políticas RLS para proteger los datos:

```sql
-- Habilitar RLS
alter table usuarios enable row level security;
alter table configuracion enable row level security;

-- Políticas básicas (ajustar según necesidades)
create policy "usuarios_all" on usuarios for all using (true) with check (true);
create policy "config_all" on configuracion for all using (true) with check (true);
```

---

## 🎯 Casos de Uso

### ✅ Crear Nuevo Usuario con Rol

1. Ve a **Administración → Usuarios**
2. Haz clic en **"Nuevo Usuario"**
3. Completa los datos:
   - Nombre: "Juan Pérez"
   - Usuario: "juan"
   - Email: "juan@jyg.com.ve"
   - Contraseña: (mínimo 6 caracteres)
   - Rol: "operador"
4. Haz clic en **"Guardar"**

**Resultado:**
- ✅ Usuario guardado en localStorage
- ✅ Usuario sincronizado con tabla `usuarios` en Supabase
- ✅ Contraseña hasheada con SHA-256 + salt

### ✅ Modificar Permisos de un Rol

1. Ve a **Administración → Usuarios → Matriz de Permisos**
2. Selecciona un rol (ej. "operador")
3. Marca/desmarca módulos
4. Los cambios se guardan automáticamente

**Resultado:**
- ✅ Permisos actualizados en localStorage
- ✅ Configuración sincronizada con tabla `configuracion` en Supabase

### ✅ Desactivar un Rol

1. En la matriz de permisos, usa el switch de activación del rol
2. Confirma la acción

**Resultado:**
- ✅ Rol desactivado en localStorage
- ✅ Estado sincronizado con Supabase
- ✅ Usuarios con ese rol pierden acceso

---

## ⚠️ Consideraciones Importantes

### Sincronización en Segundo Plano

La sincronización con Supabase ocurre **asincrónicamente**:
- ✅ El sistema funciona incluso sin conexión a Supabase
- ✅ No hay bloqueo de la interfaz mientras se sincroniza
- ⚠️ Si hay error de conexión, se registra en consola pero no interrumpe el flujo

### Manejo de Errores

Los errores de sincronización se registran pero no muestran alertas al usuario:

```typescript
if (error) console.warn('Supabase: error al guardar usuario:', error.message);
// El usuario sigue trabajando normalmente
```

### Conflictos de Datos

Si múltiples dispositivos editan el mismo usuario simultáneamente:
- **Gana la última escritura** (last-write-wins)
- Se recomienda usar `restoreFromCloud()` para obtener los datos más recientes

---

## 🔍 Monitoreo y Debug

### Ver Logs de Sincronización

Abre la consola del navegador (F12) para ver:
```
Supabase: error al guardar usuario: <mensaje>
Supabase: fallo en sync de permisos: <mensaje>
```

### Verificar Estado en Supabase

Conecta a tu base de datos Supabase y ejecuta:

```sql
-- Ver todos los usuarios
SELECT id, nombre, usuario, email, rol, activo FROM usuarios;

-- Ver configuración de roles
SELECT data->'rolesPermisos' as permisos, 
       data->'rolesActivos' as activos 
FROM configuracion 
WHERE id = 'jyg';
```

---

## 📝 Ejemplo de Usuario Creado

```json
{
  "id": "u5",
  "nombre": "María González",
  "usuario": "maria",
  "email": "maria@jyg.com.ve",
  "password": "5f0ae2cbb8069c94504fd5ae9e473665beb1d698203852d2649e377080fccfc7",
  "rol": "operador",
  "activo": true
}
```

**Nota**: La contraseña está hasheada. El valor original era `JyG-Operador-2026`.

---

## 🔄 Migración de Usuarios Existentes

Si ya tienes usuarios en el sistema:

1. **Al iniciar sesión**, las contraseñas en texto plano se migran automáticamente:
   ```typescript
   if ((u.password || "").startsWith("plain:")) {
     const hash = await hashPass(password);
     mutate((d) => ({ ...d, usuarios: d.usuarios.map((x) => 
       (x.id === u.id ? { ...x, password: hash } : x)) 
     }));
   }
   ```

2. **Sincroniza manualmente** una vez desde Integraciones → Supabase para subir todos los datos existentes.

---

## 🛡️ Mejores Prácticas de Seguridad

1. ✅ **Nunca compartas** el `PASS_SALT`
2. ✅ **Rota la clave pública** de Supabase periódicamente
3. ✅ **Usa HTTPS** en producción
4. ✅ **Habilita RLS** en todas las tablas
5. ✅ **Genera un salt único** por instalación
6. ✅ **No commitees** `.env.local` a Git

---

## 📞 Soporte

Para problemas de sincronización:

1. Verifica la conexión a Supabase en **Integraciones → Supabase**
2. Revisa la consola del navegador (F12) para errores
3. Ejecuta `testCloudNow()` desde la consola para diagnosticar
4. Usa `restoreFromCloud()` si hay conflictos de datos

---

**Documentación actualizada**: 2026  
**Versión del sistema**: 1.0  
**Última modificación**: Sincronización automática de usuarios implementada
