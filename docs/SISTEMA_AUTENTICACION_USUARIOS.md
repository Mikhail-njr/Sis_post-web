# Sistema de Autenticación con Base de Datos

## Resumen

Se ha implementado un nuevo sistema de autenticación basado en una tabla de usuarios en la base de datos SQLite, reemplazando las credenciales hardcodeadas del sistema original.

## Características del Nuevo Sistema

### 🔐 Seguridad Mejorada
- **Contraseñas encriptadas**: Uso de bcrypt con coste 10
- **Intentos fallidos controlados**: Bloqueo automático después de 5 intentos fallidos (15 minutos)
- **Logs de autenticación**: Registro de todos los intentos de login
- **Roles de usuario**: admin, cajero, invitado

### 🗄️ Base de Datos
- **Tabla `usuarios`**: Almacena todos los usuarios del sistema
- **Tabla `auth_logs`**: Registra eventos de autenticación
- **Índices optimizados**: Para búsquedas rápidas por username y rol
- **Triggers**: Actualizan automáticamente fechas de modificación

## Estructura de la Base de Datos

### Tabla `usuarios`
```sql
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT,
    email TEXT,
    rol TEXT DEFAULT 'admin' CHECK (rol IN ('admin', 'cajero', 'invitado')),
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso DATETIME,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta DATETIME
);
```

### Tabla `auth_logs`
```sql
CREATE TABLE auth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    tipo_evento TEXT CHECK (tipo_evento IN ('login_exitoso', 'login_fallido', 'logout', 'cambio_clave')),
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Instalación y Configuración

### 1. Instalar Dependencias
```bash
cd backend
node install-deps.js
```

### 2. Crear Tabla de Usuarios
```bash
cd backend
node setup-users.js
```

Esto creará:
- La tabla `usuarios` con índices y triggers
- La tabla `auth_logs` para registro de eventos
- Un usuario por defecto: `admin` / `pos123`

### 3. Actualizar el Servidor
Modificar el `server.js` para usar los nuevos endpoints de autenticación.

## Endpoints Disponibles

### 🔓 Autenticación Pública

#### POST `/api/auth/login`
Iniciar sesión con credenciales
```json
{
    "username": "admin",
    "password": "pos123"
}
```

#### POST `/api/auth/change-password`
Cambiar contraseña (requiere autenticación)
```json
{
    "currentPassword": "pos123",
    "newPassword": "nueva_contraseña"
}
```

#### GET `/api/auth/profile`
Obtener perfil del usuario autenticado

#### PUT `/api/auth/profile`
Actualizar perfil (solo nombre y email)

### 👑 Gestión de Usuarios (Admin)

#### GET `/api/auth/users`
Listar todos los usuarios (con filtros)

#### POST `/api/auth/users`
Crear nuevo usuario
```json
{
    "username": "cajero1",
    "password": "contraseña123",
    "nombre_completo": "Cajero Principal",
    "email": "cajero@empresa.com",
    "rol": "cajero"
}
```

#### PUT `/api/auth/users/:id`
Actualizar usuario (no se puede cambiar el username)

#### DELETE `/api/auth/users/:id`
Desactivar usuario (no eliminar físicamente)

#### POST `/api/auth/users/:id/reset-attempts`
Resetear intentos fallidos y desbloquear cuenta

#### GET `/api/auth/auth-logs`
Obtener logs de autenticación

## Roles de Usuario

### Admin
- Puede gestionar todos los usuarios
- Puede ver logs de autenticación
- Puede resetear intentos fallidos
- Acceso completo al sistema

### Cajero
- Puede iniciar sesión
- Puede cambiar su propia contraseña
- Puede ver y actualizar su perfil
- Acceso limitado a funciones de administración

### Invitado
- Acceso de solo lectura
- No puede realizar cambios en el sistema
- Ideal para consultas y reportes

## Seguridad Implementada

### 🔒 Encriptación de Contraseñas
- Uso de bcrypt con coste 10
- Contraseñas nunca se almacenan en texto plano

### 🚫 Protección contra Brute Force
- Límite de 5 intentos fallidos
- Bloqueo automático de 15 minutos
- Reset manual por administrador

### 📝 Auditoría
- Registro de todos los intentos de login
- Registro de cambios de contraseña
- Registro de acceso a perfiles

### 👑 Control de Acceso
- Validación de roles para endpoints administrativos
- Solo admins pueden gestionar usuarios
- Usuarios solo pueden modificar su propio perfil

## Migración del Sistema Antiguo

### Cambios en el Frontend
1. **Actualizar endpoints de login**: `/api/auth/login` en lugar de `/api/test-auth`
2. **Manejar tokens**: El nuevo sistema devuelve un token JWT
3. **Validación de roles**: Mostrar/u ocultar funcionalidades según el rol

### Cambios en el Backend
1. **Reemplazar middleware de autenticación**: Usar validación contra base de datos
2. **Actualizar endpoints protegidos**: Verificar roles de usuario
3. **Mantener compatibilidad**: Los endpoints antiguos pueden seguir funcionando temporalmente

## Ejemplo de Uso

### Login
```javascript
// Frontend
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'admin',
        password: 'pos123'
    })
});

const data = await response.json();
if (data.success) {
    localStorage.setItem('authToken', data.token);
    // Redirigir al dashboard
}
```

### Verificación de Rol
```javascript
// Middleware de verificación de rol
function requireRole(role) {
    return (req, res, next) => {
        const user = getUserFromToken(req.headers.authorization);
        if (user.rol !== role) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        next();
    };
}
```

## Troubleshooting

### Usuario Bloqueado
Si un usuario es bloqueado por intentos fallidos:
1. Un administrador debe usar: `POST /api/auth/users/:id/reset-attempts`
2. O esperar 15 minutos a que se desbloquee automáticamente

### Contraseña Olvidada
Actualmente no hay sistema de recuperación de contraseñas. Un administrador debe:
1. Crear una nueva contraseña para el usuario
2. Notificar al usuario de la nueva contraseña

### Errores Comunes
- **"Credenciales inválidas"**: Verificar username y password
- **"Cuenta bloqueada"**: Resetear intentos fallidos
- **"Acceso denegado"**: Verificar rol del usuario

## Próximas Mejoras

- [ ] Sistema de recuperación de contraseñas por email
- [ ] JWT tokens con expiración
- [ ] Panel de administración de usuarios en el frontend
- [ ] Estadísticas de seguridad y auditoría
- [ ] Integración con LDAP/Active Directory
- [ ] Autenticación de dos factores (2FA)