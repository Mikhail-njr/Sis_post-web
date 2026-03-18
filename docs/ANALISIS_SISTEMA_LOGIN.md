# Análisis del Sistema de Login - Plan de Refactorización

## Resumen Ejecutivo

Se ha realizado un análisis completo del sistema de autenticación del proyecto. El sistema actual presenta múltiples implementaciones de autenticación que coexisten, resultando en código duplicado y potenciales conflictos. Este documento documenta los hallazgos para preparar la refactorización.

---

## 1. Archivos del Sistema de Autenticación

### Backend

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `backend/auth-utils.js` | Utilidades de autenticación (validateUser, createUser, etc.) | ✅ Activo |
| `backend/auth-middleware.js` | Middleware de autenticación Basic Auth | ✅ Activo |
| `backend/jwt-auth.js` | Implementación de JWT (parcialmente implementado) | ⚠️ Parcial |
| `backend/credentials-endpoints.js` | Endpoints para gestión de credenciales admin | ✅ Activo |
| `backend/users-endpoints.js` | Endpoints para gestión de usuarios y login | ✅ Activo |
| `backend/setup-users.js` | Script de configuración inicial de usuarios | ✅ Activo |
| `backend/integrate-auth.js` | Servidor de integración de autenticación | ⚠️ Alternativo |

### Frontend

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `frontend/auth-integration.js` | Integración de autenticación del frontend | ✅ Activo |
| `frontend/fix_credentials_modal.js` | Solución para modal de credenciales | ✅ Activo |
| `frontend/update-pos-auth.js` | Script de actualización del POS | ⚠️ Utility |
| `frontend/utils.js` | Funciones unificadas de login | ✅ Activo |

---

## 2. Código Duplicado Identificado

### 2.1 Validación de Credenciales Basic Auth

La misma lógica de validación de Basic Auth se repite en múltiples archivos:

**Patrón repetido (código idéntico o muy similar):**
```javascript
// Extraer credenciales del header
const authHeader = req.headers.authorization;
const base64Credentials = authHeader.split(' ')[1];
const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
const [username, password] = credentials.split(':');

// Validar contra base de datos
const user = await db.get("SELECT * FROM usuarios WHERE username = ? AND activo = 1", [username]);
const isValidPassword = await bcrypt.compare(password, user.password_hash);
```

**Archivos donde se repite:**
- [`backend/auth-middleware.js`](backend/auth-middleware.js:17-27) - Línea 17-46
- [`backend/credentials-endpoints.js`](backend/credentials-endpoints.js:16-30) - Líneas 16-30, 182-195, 227-240, 322-335, 417-430, 480-493
- [`backend/users-endpoints.js`](backend/users-endpoints.js:58-85) - Líneas 58-85
- [`backend/jwt-auth.js`](backend/jwt-auth.js:94-155) - Líneas 94-155

### 2.2 Validación de Usuario

La función `validateUser` en [`auth-utils.js`](backend/auth-utils.js:29-74) es utilizada en:
- [`backend/users-endpoints.js`](backend/users-endpoints.js:36) - Línea 36
- [`backend/credentials-endpoints.js`](backend/credentials-endpoints.js:21) - Línea 21
- [`backend/auth-middleware.js`](backend/auth-middleware.js:28) - Línea 28
- [`backend/jwt-auth.js`](backend/jwt-auth.js:210) - Línea 210

### 2.3 Definición de Permisos por Rol

La definición de permisos por rol está duplicada en:
- [`backend/auth-middleware.js`](backend/auth-middleware.js:193-218) - Líneas 193-218
- [`frontend/auth-integration.js`](frontend/auth-integration.js:112-137) - Líneas 112-137

---

## 3. Funciones que Piden Credenciales

### 3.1 Frontend - Funciones con `prompt()`

Se identificaron **múltiples funciones** en [`frontend/dashboard.js`](frontend/dashboard.js) que piden credenciales mediante `prompt()`:

| Línea | Función | Propósito |
|-------|---------|-----------|
| 1241-1246 | `prompt('Usuario:')` | Login manual |
| 1319-1335 | `prompt()` | Crear backup |
| 1462-1488 | `prompt()` | Restaurar backup |
| 1527-1540 | `prompt()` | Limpiar promociones |
| 3323-3332 | `prompt()` | Limpiar registro |
| 3661-3670 | `prompt()` | Cancelar venta |
| 3973-3980 | `prompt()` | Generar reporte |
| 5102-5106 | `prompt()` | Generar reporte detallado |

### 3.2 Header de Autenticación Repetido

El mismo patrón de creación de header Basic Auth se repite **más de 40 veces** en [`frontend/dashboard.js`](frontend/dashboard.js):

```javascript
const headers = { 'Content-Type': 'application/json' };
if (authCredentials) {
    headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
}
```

### 3.3 Otras funciones del frontend que usan credenciales

- [`frontend/script.js`](frontend/script.js:1061-1063) - Múltiples lugares
- [`frontend/cierre-caja-functions.js`](frontend/cierre-caja-functions.js:32-35)
- [`frontend/openConfirmDeliveryModal.js`](frontend/openConfirmDeliveryModal.js:41-44)
- [`frontend/dashboard-performance.js`](frontend/dashboard-performance.js:212-214)
- [`frontend/barcode-scanner.js`](frontend/barcode-scanner.js:956-959)

---

## 4. Sistemas de Autenticación Coexistentes

El proyecto tiene **múltiples sistemas de autenticación** que coexisten:

### 4.1 Sistema Principal (Base de Datos)
- Tabla `usuarios` con contraseñas hasheadas
- Roles: admin, cajero, invitado
- Bloqueo por intentos fallidos

### 4.2 Sistema Legacy (Hardcoded)
- [`backend/server.js`](backend/server.js:87-95) - Middleware `authMiddleware` con credenciales hardcodeadas:
```javascript
const authMiddleware = basicAuth({
    users: { 'admin': 'pos123' },
    // ...
});
```

### 4.3 Sistema JWT (Parcial)
- [`backend/jwt-auth.js`](backend/jwt-auth.js) - Implementación de JWT iniciada pero no completamente integrada

### 4.4 Sistema de Activación (PLUS) - NO CONFUNDIR
- [`frontend/activate.html`](frontend/activate.html) - Sistema separado de activación de licencia PLUS
- [`backend/server.js`](backend/server.js:3192) - Endpoint `/api/deactivate-license`
- **Este sistema es independiente del login de usuario**

---

## 5. Endpoints de Autenticación

### Endpoints Activos (en uso)

| Método | Endpoint | Archivo | Descripción |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | `users-endpoints.js` | Login principal |
| POST | `/api/auth/change-password` | `users-endpoints.js` | Cambiar contraseña |
| GET | `/api/auth/profile` | `users-endpoints.js` | Obtener perfil |
| PUT | `/api/auth/profile` | `users-endpoints.js` | Actualizar perfil |
| GET | `/api/credentials` | `credentials-endpoints.js` | Obtener info admin |
| PUT | `/api/credentials` | `credentials-endpoints.js` | Cambiar credenciales admin |
| GET | `/api/users` | `credentials-endpoints.js` | Listar usuarios |
| POST | `/api/users` | `credentials-endpoints.js` | Crear usuario |
| PUT | `/api/users/:id` | `credentials-endpoints.js` | Actualizar usuario |
| DELETE | `/api/users/:id` | `credentials-endpoints.js` | Eliminar usuario |
| POST | `/api/change-credentials` | `server.js` | Cambio de credenciales (legacy) |
| GET | `/api/test-auth` | `server.js` | Test de autenticación |
| GET | `/api/auth-test` | `server.js` | Test de autenticación |

---

## 6. Recomendaciones para Refactorización

### 6.1 Extraer Validación de Credenciales

Crear una función reutilizable para la validación de Basic Auth:

```javascript
// En backend/auth-helpers.js
async function validateBasicAuth(req, res, next) {
    // Código común de validación
}
```

### 6.2 Centralizar Generación de Headers

En el frontend, crear una función centralizada:

```javascript
// En frontend/auth-integration.js
window.ApiClient.getAuthHeaders = function() {
    const headers = { 'Content-Type': 'application/json' };
    if (authCredentials) {
        headers['Authorization'] = 'Basic ' + btoa(authCredentials.username + ':' + authCredentials.password);
    }
    return headers;
};
```

### 6.3 Unificar Definición de Permisos

Mover la definición de permisos a un único lugar:
- [`backend/auth-permissions.js`](backend/auth-permissions.js) - Definir una vez
- Importar en `auth-middleware.js` y `auth-integration.js`

### 6.4 Eliminar Código Legacy

- Revisar y eliminar el middleware `authMiddleware` hardcodeado en [`server.js`](backend/server.js:87-95)
- Confirmar que el sistema JWT no está en uso antes de eliminar

---

## 7. Plan de Refactorización por Fases

### Fase 1: Documentación y Análisis (Completado ✅)
- [x] Identificar todos los archivos relacionados
- [x] Documentar código duplicado
- [x] Mapear dependencias

### Fase 2: Crear Utilidades Centralizadas
- [ ] Crear `backend/auth-helpers.js` con funciones comunes
- [ ] Crear función centralizada de headers en frontend

### Fase 3: Refactorizar Backend
- [ ] Actualizar `auth-middleware.js` para usar funciones centralizadas
- [ ] Actualizar `credentials-endpoints.js` 
- [ ] Actualizar `users-endpoints.js`
- [ ] Eliminar código duplicado

### Fase 4: Refactorizar Frontend
- [ ] Actualizar `dashboard.js` para usar función centralizada
- [ ] Actualizar `script.js`
- [ ] Actualizar otros archivos

### Fase 5: Pruebas y Validación
- [ ] Probar login
- [ ] Probar cambio de contraseña
- [ ] Probar gestión de usuarios
- [ ] Verificar que no se afecten otras funciones

---

## 8. Notas Importantes

⚠️ **No confundir con el sistema de activación PLUS:**
- El sistema de activación (`/api/deactivate-license`, `frontend/activate.html`) es independiente
- No debe ser modificado durante la refactorización del login de usuario
- Mantener separado para evitar conflictos de funcionalidad

⚠️ **Verificar dependencias antes de modificar:**
- Muchas funciones en `dashboard.js` dependen de `authCredentials`
- Cualquier cambio debe mantener compatibilidad hacia atrás

---

*Documento generado para planificación de refactorización del sistema de login*
*Fecha: 2026-03-17*
