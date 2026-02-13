# Sistema de Autenticación con Base de Datos - POS

## 📋 Resumen

Este sistema reemplaza las credenciales hardcodeadas del sistema POS original por un sistema de autenticación basado en base de datos SQLite con encriptación bcrypt, múltiples roles de usuario y auditoría completa.

## 🚀 Instalación Rápida

### Paso 1: Instalación Completa
```bash
node backend/install-complete-auth.js
```

### Paso 2: Iniciar el Servidor
```bash
node backend/integrate-auth.js
```

### Paso 3: Probar el Sistema
```bash
node backend/test-auth-system.js
```

## 📁 Estructura de Archivos

```
backend/
├── create_usuarios_table.sql      # Script SQL para crear tablas
├── setup-users.js                 # Script para crear tablas e insertar usuario admin
├── auth-utils.js                  # Utilidades de autenticación (bcrypt, validaciones)
├── auth-endpoints.js              # Endpoints de login y gestión de sesión
├── credentials-endpoints.js       # Endpoints para gestión de credenciales
├── users-endpoints.js             # Endpoints para gestión de usuarios
├── install-auth-deps.js           # Script para instalar dependencias
├── integrate-auth.js              # Servidor de prueba para endpoints
├── test-auth-system.js            # Script de pruebas del sistema
└── install-complete-auth.js       # Instalación completa automatizada

docs/
└── SISTEMA_AUTENTICACION_USUARIOS.md  # Documentación completa

frontend/
└── dashboard.html                   # Modal de configuración actualizado
```

## 🔐 Endpoints Disponibles

### Autenticación Pública
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/change-password` - Cambiar contraseña
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### Gestión de Credenciales (Admin)
- `GET /api/credentials` - Obtener credenciales actuales
- `PUT /api/credentials` - Cambiar credenciales de login

### Gestión de Usuarios (Admin)
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `GET /api/auth-logs` - Ver logs de autenticación

## 👥 Roles de Usuario

1. **admin** - Acceso completo al sistema, puede gestionar usuarios y credenciales
2. **cajero** - Acceso a módulos de ventas, productos y cierres
3. **invitado** - Acceso limitado a visualización de datos

## 🔒 Seguridad Implementada

- **Encriptación bcrypt** con coste 10 para contraseñas
- **Control de intentos fallidos** (bloqueo automático después de 5 intentos)
- **Auditoría completa** de todas las operaciones de autenticación
- **Validación de roles** para cada endpoint
- **Protección contra SQL injection** con consultas preparadas

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

## 🎯 Credenciales por Defecto

- **Usuario**: `admin`
- **Contraseña**: `pos123`
- **Rol**: `admin`

## 🛠️ Uso del Sistema

### 1. Panel de Control
Accede al panel de control en `http://localhost:3000` y haz clic en "🔐 Credenciales" para:
- Ver credenciales actuales
- Cambiar nombre de usuario y contraseña
- Gestionar usuarios del sistema

### 2. Login en el POS
En la pantalla de login del POS, utiliza las credenciales configuradas en el panel de control.

### 3. Gestión de Usuarios
Desde el panel de control, los administradores pueden:
- Crear nuevos usuarios
- Asignar roles
- Desactivar usuarios
- Ver historial de actividades

## 🧪 Pruebas

El script `test-auth-system.js` realiza pruebas completas del sistema:
- Login exitoso y fallido
- Cambio de contraseña
- Gestión de usuarios
- Control de intentos fallidos
- Auditoría de logs

## 📈 Beneficios del Nuevo Sistema

✅ **Elimina credenciales hardcodeadas** del código  
✅ **Permite múltiples usuarios** con diferentes roles  
✅ **Mejora la seguridad** con encriptación bcrypt  
✅ **Control de acceso** basado en roles  
✅ **Auditoría completa** de actividades  
✅ **Bloqueo automático** contra ataques de fuerza bruta  
✅ **Mantenimiento fácil** mediante endpoints REST  

## 🔧 Integración con el POS Existente

Para integrar este sistema al POS existente:

1. **Actualizar el frontend** para usar los nuevos endpoints de login
2. **Modificar el middleware** de autenticación en el backend
3. **Implementar validación** de roles en las interfaces
4. **Migrar gradualmente** los endpoints existentes

## 📞 Soporte

Para soporte técnico o consultas:
- Email: mikhail.njr@gmail.com
- Teléfono: +54 3434721177
- Horario: Lunes a Viernes 9:00 - 18:00

---

**⚠️ Importante**: Este sistema reemplaza completamente las credenciales hardcodeadas del sistema original. Asegúrate de respaldar cualquier configuración existente antes de implementar.