# Implementación del Sistema de Deudas

## Resumen

El sistema de deudas **NO estaba implementado** en el backend actual. Se ha creado una implementación completa del backend siguiendo las especificaciones proporcionadas.

## Estado Actual

### ❌ Frontend (No Implementado)
Las siguientes funciones **NO existen** en [`frontend/script.js`](frontend/script.js):
- `cargarClientesDeudas()`
- `mostrarTablaClientesDeudas()`
- `verDeudas()`
- `actualizarDeuda()`
- `editarDeuda()`
- `eliminarDeuda()`

### ❌ Backend (No Implementado)
Los siguientes endpoints **NO existían**:
- `GET /api/clientes/deudas-resumen`
- `GET /api/clientes/:clienteId/deudas-con-productos`
- `PUT /api/clientes/:clienteId/actualizar-deudas`
- `POST /api/ventas/cuenta-corriente`
- `GET /api/clientes`

### ❌ Base de Datos (No Implementado)
Las tablas necesarias **NO existían**:
- `deudas`
- `deuda_productos`

## ✅ Implementación Completada

Se han creado los siguientes archivos para implementar el sistema de deudas:

### 1. Base de Datos
**Archivo:** [`backend/create_deudas_table.sql`](backend/create_deudas_table.sql)

Contiene:
- Creación de tabla `deudas` con campos: cliente_id, monto_total, monto_pendiente, estado, fecha_vencimiento, etc.
- Creación de tabla `deuda_productos` para asociar productos a deudas
- Índices para optimizar consultas
- Trigger para actualización automática de timestamps
- Datos de ejemplo

### 2. Repositorio de Datos
**Archivo:** [`backend/repositories/debts-repository.js`](backend/repositories/debts-repository.js)

Clase `DebtsRepository` con métodos:
- `createDebt()` - Crear nueva deuda con productos asociados
- `getDebtsSummary()` - Obtener resumen de deudas por cliente
- `getDebtsByClientWithProducts()` - Obtener deudas de cliente con productos y precios actuales
- `updateDebtsWithCurrentPrices()` - Actualizar deudas con precios actuales de productos
- `clientExists()` - Verificar existencia de cliente
- `productExists()` - Verificar existencia de producto

### 3. Endpoints API
**Archivo:** [`backend/debts-endpoints.js`](backend/debts-endpoints.js)

Endpoints REST implementados:
- `GET /api/clientes/deudas-resumen` - Listar clientes con resumen de deudas
- `GET /api/clientes/:clienteId/deudas-con-productos` - Obtener deudas de cliente con productos
- `PUT /api/clientes/:clienteId/actualizar-deudas` - Recalcular deudas con precios actuales
- `POST /api/ventas/cuenta-corriente` - Crear nueva deuda (venta a cuenta corriente)
- `GET /api/clientes` - Listar todos los clientes
- `GET /api/clientes/:id` - Obtener cliente por ID

### 4. Validadores
**Archivo:** [`backend/validators/debt-validator.js`](backend/validators/debt-validator.js)

Funciones de validación:
- `validateDebtData()` - Validar datos para creación de deudas
- `validateDebtUpdateData()` - Validar datos para actualización de deudas

### 5. Script de Instalación
**Archivo:** [`backend/install-debts-system.js`](backend/install-debts-system.js)

Script para instalar el sistema de deudas:
- Crea tablas necesarias
- Verifica existencia de clientes y productos
- Crea datos de ejemplo
- Muestra resumen de instalación

## Nomenclatura Implementada

Se ha seguido estrictamente la nomenclatura solicitada:

### Variables y Funciones JS (camelCase)
```javascript
// Ejemplos en el backend
const clienteId = req.params.clienteId;
const montoPendiente = debtData.monto_pendiente;
const productosValidados = [];
function validateDebtData() {}
function createDebt() {}
```

### API Backend (snake_case)
```javascript
// Endpoints
GET /api/clientes/deudas-resumen
PUT /api/clientes/:cliente_id/actualizar-deudas
POST /api/ventas/cuenta-corriente
```

### Campos BD (snake_case)
```sql
-- Tabla deudas
cliente_id INTEGER NOT NULL,
monto_total REAL NOT NULL,
monto_pendiente REAL NOT NULL,
fecha_vencimiento DATE,
descripcion TEXT

-- Tabla deuda_productos
deuda_id INTEGER NOT NULL,
producto_id INTEGER NOT NULL,
precio_unitario REAL NOT NULL,
precio_actual REAL
```

## Instalación

Para instalar el sistema de deudas:

```bash
cd backend
node install-debts-system.js
```

Esto creará las tablas necesarias, verificará la existencia de datos y creará ejemplos si es necesario.

## Uso

Una vez instalado, los endpoints estarán disponibles para ser consumidos por el frontend:

```javascript
// Ejemplo de uso desde el frontend
const response = await fetch('/api/clientes/deudas-resumen', {
    headers: { 'Authorization': 'Basic ' + btoa(username + ':' + password) }
});
const clientesConDeudas = await response.json();
```

## Próximos Pasos

1. **Frontend**: Implementar las funciones JavaScript solicitadas en [`frontend/script.js`](frontend/script.js)
2. **Integración**: Conectar el frontend con los endpoints del backend
3. **UI**: Crear interfaces para visualizar y gestionar deudas

## Notas

- El backend implementa todas las funcionalidades solicitadas
- Se utiliza autenticación básica para todas las rutas
- Las transacciones SQL garantizan consistencia de datos
- Los precios de productos se actualizan automáticamente cuando cambian
- El sistema maneja correctamente los estados de deuda (pendiente, parcial, vencida, pagada)