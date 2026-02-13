# Sistema de Cambio de Credenciales

## Descripción

Se ha implementado un sistema completo para cambiar las credenciales de inicio de sesión del dashboard del Sistema POS. Este sistema permite a los usuarios cambiar su nombre de usuario y contraseña de forma segura.

## Características

### Frontend (dashboard.html)

1. **Modal de Configuración**: 
   - Accesible desde el dropdown "🛠️ Sistema" → "⚙️ Configuraciones"
   - Interfaz intuitiva y segura
   - Validaciones en tiempo real

2. **Validaciones Frontend**:
   - Todos los campos son requeridos
   - El nuevo usuario debe ser diferente del actual
   - Las contraseñas nuevas deben coincidir
   - La contraseña debe tener al menos 3 caracteres
   - Advertencias claras para el usuario

3. **Flujo de Trabajo**:
   - Verificación de credenciales actuales
   - Validación de datos ingresados
   - Llamada al endpoint de cambio
   - Actualización automática de la sesión
   - Cierre del modal y confirmación al usuario

### Backend (server.js)

1. **Endpoint**: `POST /api/change-credentials`
   - Requiere autenticación previa
   - Valida credenciales actuales
   - Actualiza credenciales en el archivo de configuración
   - Regenera el hash de autenticación
   - Actualiza el registro de operaciones

2. **Validaciones Backend**:
   - Credenciales actuales válidas
   - Nuevo usuario diferente del actual
   - Contraseña con longitud mínima
   - Manejo de errores y respuestas JSON

3. **Seguridad**:
   - Uso de bcrypt para hashing de contraseñas
   - Registro de operaciones para auditoría
   - Validación de autenticación en cada solicitud

## Uso

### Para el Usuario

1. Acceder al dashboard
2. Hacer clic en "🛠️ Sistema" en la sección de "Operaciones del Día"
3. Seleccionar "⚙️ Configuraciones"
4. Completar el formulario con:
   - Usuario actual
   - Contraseña actual
   - Nuevo usuario
   - Nueva contraseña
   - Confirmación de nueva contraseña
5. Hacer clic en "Cambiar Credenciales"

### Para el Administrador

Las credenciales maestras están definidas en el backend:
- **Usuario**: `admin`
- **Contraseña**: `BKDLMG`

Estas credenciales no pueden ser cambiadas y sirven como respaldo de acceso.

## Estructura de Archivos

```
frontend/
├── dashboard.html          # Modal y funciones frontend
└── shared/
    └── auth.js            # Gestión de autenticación

backend/
└── server.js              # Endpoint de cambio de credenciales

docs/
└── SISTEMA_CAMBIO_CREDENCIALES.md  # Documentación del sistema

test_change_credentials.js  # Script de pruebas
```

## Endpoints

### POST /api/change-credentials

**Descripción**: Cambia las credenciales de autenticación del sistema

**Headers**:
- `Authorization: Basic <credentials>` (credenciales actuales)
- `Content-Type: application/json`

**Body**:
```json
{
  "newUsername": "nuevo_usuario",
  "newPassword": "nueva_contraseña"
}
```

**Respuestas**:
- `200 OK`: Credenciales cambiadas exitosamente
- `400 Bad Request`: Validación fallida
- `401 Unauthorized`: Credenciales actuales incorrectas
- `500 Internal Server Error`: Error interno del servidor

**Ejemplo de respuesta exitosa**:
```json
{
  "success": true,
  "message": "Credenciales actualizadas exitosamente"
}
```

### GET /api/auth-test

**Descripción**: Endpoint de prueba para validar credenciales

**Headers**:
- `Authorization: Basic <credentials>`

**Respuestas**:
- `200 OK`: Autenticación exitosa
- `401 Unauthorized`: Credenciales inválidas

## Seguridad

1. **Hashing de Contraseñas**: Uso de bcrypt con salt rounds configurables
2. **Validación de Credenciales**: Verificación previa antes del cambio
3. **Registro de Operaciones**: Todas las operaciones son registradas
4. **Sesión Continua**: Las credenciales se actualizan en sessionStorage
5. **Credenciales Maestras**: Siempre disponibles para recuperación

## Pruebas

Se incluye un script de pruebas (`test_change_credentials.js`) que valida:

1. Autenticación con credenciales actuales
2. Cambio de credenciales exitoso
3. Autenticación con nuevas credenciales
4. Invalidación de credenciales antiguas
5. Validaciones de datos (usuario igual, contraseña corta)

### Ejecución de Pruebas

```bash
node test_change_credentials.js
```

## Consideraciones

1. **Sesión Activa**: Después del cambio, el usuario mantiene su sesión activa
2. **Credenciales Maestras**: No pueden ser cambiadas para garantizar acceso
3. **Persistencia**: Los cambios se guardan en el archivo de configuración
4. **Auditoría**: Todas las operaciones son registradas en el log de operaciones

## Mejoras Futuras

1. **Historial de Cambios**: Mantener un historial de cambios de credenciales
2. **Requisitos de Contraseña**: Validaciones más estrictas (mayúsculas, números, etc.)
3. **Confirmación por Email**: Sistema de confirmación adicional
4. **Bloqueo por Intentos**: Prevención de ataques de fuerza bruta
5. **Notificación**: Avisar al usuario sobre el cambio realizado