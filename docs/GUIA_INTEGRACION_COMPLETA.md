# Guía de Integración Completa del Sistema de Autenticación

## 📋 Resumen

Esta guía documenta el proceso completo para integrar el nuevo sistema de autenticación basado en base de datos al sistema POS existente, reemplazando las credenciales hardcodeadas.

## 🚀 Instalación y Configuración

### Paso 1: Instalación del Sistema de Autenticación

```bash
# Instalar dependencias y crear tablas
node backend/install-complete-auth.js

# Iniciar el servidor de autenticación
node backend/integrate-auth.js
```

### Paso 2: Actualizar el Frontend del POS

```bash
# Actualizar el frontend para integrar autenticación
node frontend/update-pos-auth.js
```

### Paso 3: Probar el Sistema

```bash
# Probar el sistema de autenticación
node backend/test-auth-system.js
```

## 📁 Estructura de Archivos

```
backend/
├── auth-middleware.js              # Middleware de autenticación y autorización
├── migrate-endpoints.js            # Script de migración de endpoints
├── auth-utils.js                   # Utilidades de autenticación
├── auth-endpoints.js               # Endpoints de login y gestión de sesión
├── credentials-endpoints.js        # Endpoints para gestión de credenciales
├── users-endpoints.js              # Endpoints para gestión de usuarios
├── create_usuarios_table.sql       # Script SQL para crear tablas
├── setup-users.js                  # Script para crear tablas e insertar usuario admin
├── install-auth-deps.js            # Script para instalar dependencias
├── integrate-auth.js               # Servidor de prueba para endpoints
├── test-auth-system.js             # Script de pruebas del sistema
└── install-complete-auth.js        # Instalación completa automatizada

frontend/
├── auth-integration.js             # Integración de autenticación para el frontend
├── update-pos-auth.js              # Script para actualizar el frontend del POS
└── auth-example.js                 # Ejemplo de uso de la autenticación

docs/
├── SISTEMA_AUTENTICACION_USUARIOS.md  # Documentación del sistema
└── GUIA_INTEGRACION_COMPLETA.md       # Esta guía

shared/
└── api-client.js                   # Cliente API actualizado
```

## 🔐 Endpoints de Autenticación

### Endpoints Públicos (sin autenticación requerida)

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/change-password` - Cambiar contraseña
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### Endpoints de Gestión de Credenciales (requiere rol admin)

- `GET /api/credentials` - Obtener credenciales actuales
- `PUT /api/credentials` - Cambiar credenciales de login

### Endpoints de Gestión de Usuarios (requiere rol admin)

- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `GET /api/auth-logs` - Ver logs de autenticación

## 👥 Roles de Usuario y Permisos

### Rol Admin
- Acceso completo al sistema
- Puede gestionar usuarios y credenciales
- Puede realizar todas las operaciones

### Rol Cajero
- Acceso a módulos de ventas, productos y cierres
- Puede crear y actualizar productos
- Puede gestionar ventas y cierres de caja
- No puede gestionar usuarios

### Rol Invitado
- Acceso limitado a visualización de datos
- Solo puede ver productos, ventas y promociones
- No puede realizar modificaciones

## 🛠️ Integración del Backend

### 1. Middleware de Autenticación

```javascript
const { authenticateToken, requireAdmin, requireCajeroOrAdmin, checkPermissions } = require('./auth-middleware');

// Ejemplo de uso en un endpoint
app.get('/api/products', 
    authenticateToken,           // Verifica autenticación
    requireCajeroOrAdmin,        // Requiere rol cajero o admin
    checkPermissions(['read_products']), // Verifica permisos específicos
    async (req, res) => {
        // Lógica del endpoint
        console.log('Usuario autenticado:', req.user);
        // ...
    }
);
```

### 2. Tipos de Middleware Disponibles

- `authenticateToken`: Verifica la autenticación del usuario
- `requireAdmin`: Requiere rol de administrador
- `requireCajeroOrAdmin`: Requiere rol de cajero o administrador
- `requireInvitadoOrCajeroOrAdmin`: Requiere cualquier rol válido
- `checkPermissions`: Verifica permisos específicos

### 3. Ejemplos de Uso por Tipo de Endpoint

```javascript
// Endpoints de lectura (todos los roles)
router.get('/api/products', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_products']),
    // ...
);

// Endpoints de escritura (solo admin y cajero)
router.post('/api/products', 
    authenticateToken, 
    requireCajeroOrAdmin,
    checkPermissions(['create_products']),
    // ...
);

// Endpoints de administración (solo admin)
router.delete('/api/users/:id', 
    authenticateToken, 
    requireAdmin,
    checkPermissions(['delete_users']),
    // ...
);
```

## 🎨 Integración del Frontend

### 1. Métodos del ApiClient

```javascript
// Iniciar sesión
await window.ApiClient.login(username, password);

// Verificar autenticación
window.ApiClient.isAuthenticated();

// Obtener usuario actual
window.ApiClient.getCurrentUser();

// Verificar permisos
window.ApiClient.hasPermission('create_products');

// Verificar rol
window.ApiClient.hasRole('admin');

// Hacer solicitudes autenticadas
window.ApiClient.fetch('/api/products');
```

### 2. Elementos de UI con Permisos

```html
<!-- Botón solo para administradores -->
<button class="admin-only" data-permission="delete_products">
    Eliminar Producto
</button>

<!-- Botón para cajeros y administradores -->
<button class="cajero-only" data-permission="create_sales">
    Crear Venta
</button>

<!-- Botón para todos los roles -->
<button data-permission="read_products">
    Ver Productos
</button>
```

### 3. Actualización de UI según Permisos

```javascript
// El script auth-integration.js se encarga de:
// 1. Mostrar/ocultar elementos según permisos
// 2. Actualizar menús según rol
// 3. Manejar el estado de autenticación
// 4. Redirigir según rol después del login
```

## 📊 Base de Datos

### Tabla `usuarios`

```sql
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT,
    email TEXT,
    rol TEXT DEFAULT 'invitado',
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `auth_logs`

```sql
CREATE TABLE auth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    tipo_evento TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Seguridad Implementada

### 1. Encriptación de Contraseñas
- Uso de bcrypt con coste 10
- Almacenamiento seguro de contraseñas

### 2. Control de Intentos Fallidos
- Bloqueo automático después de 5 intentos fallidos
- Bloqueo de 15 minutos por seguridad

### 3. Auditoría Completa
- Registro de todos los eventos de autenticación
- Logs de acceso, intentos fallidos y operaciones

### 4. Validación de Roles
- Control de acceso basado en roles
- Permisos específicos por operación

## 🧪 Pruebas del Sistema

### 1. Pruebas Automáticas

```bash
# Ejecutar pruebas del sistema
node backend/test-auth-system.js
```

### 2. Pruebas Manuales

1. **Login Exitoso**: Probar con credenciales válidas
2. **Login Fallido**: Probar con credenciales incorrectas
3. **Bloqueo por Intentos**: Probar múltiples intentos fallidos
4. **Permisos**: Probar acceso a endpoints según rol
5. **Cambio de Credenciales**: Probar cambio de usuario y contraseña

### 3. Pruebas de Frontend

1. **Formulario de Login**: Verificar que funcione correctamente
2. **Menú de Usuario**: Verificar que muestre información correcta
3. **Permisos en UI**: Verificar que se oculten/muestren elementos según rol
4. **Redirección**: Verificar redirección según rol después del login

## 📈 Migración de Endpoints Existentes

### 1. Proceso de Migración

1. **Identificar endpoints existentes** que necesitan autenticación
2. **Agregar middleware de autenticación** a cada endpoint
3. **Definir permisos requeridos** para cada operación
4. **Actualizar lógica de endpoints** para usar `req.user`
5. **Probar endpoints** con diferentes roles

### 2. Ejemplo de Migración

```javascript
// Endpoint original (sin autenticación)
app.get('/api/products', async (req, res) => {
    const products = await db.all("SELECT * FROM products");
    res.json(products);
});

// Endpoint migrado (con autenticación)
app.get('/api/products', 
    authenticateToken, 
    requireInvitadoOrCajeroOrAdmin,
    checkPermissions(['read_products']),
    async (req, res) => {
        console.log('Usuario autenticado:', req.user);
        
        const products = await db.all("SELECT * FROM products");
        res.json(products);
    }
);
```

### 3. Script de Migración

El archivo `backend/migrate-endpoints.js` contiene ejemplos completos de cómo migrar todos los endpoints del sistema POS.

## 🚨 Consideraciones de Seguridad

### 1. Almacenamiento de Credenciales
- Las credenciales se almacenan en localStorage para persistencia
- Se recomienda usar HTTPS en producción
- Considerar el uso de tokens JWT en lugar de credenciales en localStorage

### 2. Validación de Permisos
- Siempre validar permisos en el backend, nunca confiar en el frontend
- Usar el middleware `checkPermissions` para validaciones específicas
- Registrar todas las operaciones en el log de autenticación

### 3. Manejo de Errores
- No revelar información sensible en mensajes de error
- Registrar errores en el log de autenticación
- Manejar adecuadamente los errores de autenticación

## 🔧 Solución de Problemas

### 1. Problemas Comunes

**Error 401 - No autorizado**
- Verificar credenciales de login
- Verificar que el usuario esté activo
- Verificar que no esté bloqueado por intentos fallidos

**Error 403 - Acceso denegado**
- Verificar rol del usuario
- Verificar permisos requeridos para el endpoint
- Verificar que el usuario tenga los permisos necesarios

**Error 423 - Cuenta bloqueada**
- Esperar 15 minutos o más
- Verificar que no haya intentos fallidos recientes
- Contactar al administrador si el problema persiste

### 2. Depuración

```javascript
// Verificar estado de autenticación
console.log('¿Autenticado?', window.ApiClient.isAuthenticated());
console.log('Usuario actual:', window.ApiClient.getCurrentUser());
console.log('Tiene permiso?', window.ApiClient.hasPermission('create_products'));
```

## 📞 Soporte

Para soporte técnico o consultas:
- Email: mikhail.njr@gmail.com
- Teléfono: +54 3434721177
- Horario: Lunes a Viernes 9:00 - 18:00

---

**⚠️ Importante**: Este sistema reemplaza completamente las credenciales hardcodeadas del sistema original. Asegúrate de respaldar cualquier configuración existente antes de implementar.