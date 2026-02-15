# Implementación de Cuenta Corriente con Facturas

## 📋 Resumen

Este documento describe la implementación del módulo de **Cliente - Cuenta Corriente** basado en el esquema SQL propuesto, integrado con el sistema POS existente.

---

## 🏗️ Arquitectura del Sistema

### Comparación de Esquemas

| Aspecto | Esquema Propuesto | Sistema Actual (SQLite) |
|---------|-------------------|------------------------|
| **Clientes** | `idCliente`, `nombre` | `id`, `nombre`, `telefono`, `dni`, `direccion`, `limite_credito` |
| **Facturas** | Con estado global | Con `total_pagado` y estado granular |
| **Detalle** | Por ítem con estado | Solo tabla `deudas` plana |
| **Pagos** | No especificado | Nueva tabla `pagos` |

### Modelo Híbrido Implementado

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTES                              │
│  id, nombre, telefono, dni, direccion, limite_credito      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       FACTURAS                               │
│  id, numero_factura, cliente_id, estado, total,            │
│  total_pagado, fecha_emision, fecha_vencimiento            │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│    DETALLE_FACTURA     │ │         PAGOS           │
│  id, factura_id,       │ │  id, factura_id, monto, │
│  producto_id, cantidad, │ │  metodo_pago, fecha     │
│  precio, subtotal,      │ │                         │
│  estado                 │ │                         │
└─────────────────────────┘ └─────────────────────────┘
```

---

## 📁 Archivos Creados

### Backend

| Archivo | Descripción |
|---------|-------------|
| [`backend/facturas-endpoints.js`](facturas-endpoints.js) | Endpoints REST para gestión de facturas |
| [`backend/create_cuenta_corriente_tables.sql`](create_cuenta_corriente_tables.sql) | Migración de tablas SQLite |
| [`backend/integrar-facturas.js`](integrar-facturas.js) | Script de integración automática |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| [`frontend/cuenta-corriente-ui.js`](cuenta-corriente-ui.js) | Módulo de interfaz de usuario |

---

## 🔌 API Reference

### Endpoints de Facturas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/facturas` | Listar facturas con filtros |
| `GET` | `/api/facturas/:id` | Obtener factura completa |
| `POST` | `/api/facturas` | Crear factura a CC |
| `POST` | `/api/facturas/:id/pago` | Registrar pago |
| `GET` | `/api/facturas/:id/pagos` | Historial de pagos |
| `GET` | `/api/facturas/clientes/:id/cuenta-corriente` | Estado CC del cliente |

### Ejemplos de Uso

```bash
# Listar facturas pendientes
curl http://localhost:3000/api/facturas?estado=pendiente

# Ver detalle de factura
curl http://localhost:3000/api/facturas/1

# Estado de cuenta de un cliente
curl http://localhost:3000/api/facturas/clientes/1/cuenta-corriente

# Crear factura a CC (POST)
curl -X POST http://localhost:3000/api/facturas \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "items": [
      {"producto_id": 101, "cantidad": 2, "precio_unitario": 150.00}
    ],
    "fecha_vencimiento": "2026-03-15"
  }'

# Registrar pago
curl -X POST http://localhost:3000/api/facturas/1/pago \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 150.00,
    "metodo_pago": "efectivo",
    "observacion": "Pago parcial"
  }'
```

---

## 🗄️ Esquema de Base de Datos

### Tabla: `facturas`

```sql
CREATE TABLE facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_factura VARCHAR(20) UNIQUE NOT NULL,
    cliente_id INTEGER,
    metodo_pago VARCHAR(50) DEFAULT 'cuenta_corriente',
    estado ENUM('pendiente', 'pagada_parcial', 'pagada', 'cancelada'),
    total DECIMAL(10,2) NOT NULL,
    total_pagado DECIMAL(10,2) DEFAULT 0,
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
```

### Tabla: `detalle_factura`

```sql
CREATE TABLE detalle_factura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    estado ENUM('pendiente', 'pagado_parcial', 'pagado', 'eliminado'),
    FOREIGN KEY (factura_id) REFERENCES facturas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);
```

### Tabla: `pagos`

```sql
CREATE TABLE pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('efectivo', 'transferencia', 'debito', 'credito'),
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,
    FOREIGN KEY (factura_id) REFERENCES facturas(id)
);
```

---

## 🚀 Pasos de Instalación

### 1. Ejecutar Migración

```bash
# En la terminal, desde la raíz del proyecto
sqlite3 backend/pos_database.sqlite < backend/create_cuenta_corriente_tables.sql
```

### 2. Integrar Endpoints

```bash
# Opción automática
node backend/integrar-facturas.js

# O manualmente, agregar en backend/server.js:
const facturasRouter = require('./facturas-endpoints');
app.use('/api', facturasRouter);
```

### 3. Incluir Frontend

En tu `index.html` o `dashboard.html`, agregar:

```html
<script src="frontend/cuenta-corriente-ui.js"></script>
```

### 4. Reiniciar Servidor

```bash
npm start
# o
node backend/server.js
```

---

## 🔧 Integración con Frontend Existente

### Uso del Módulo UI

```javascript
// Obtener estado de cuenta de un cliente
const estado = await CuentaCorrienteUI.obtenerEstadoCuenta(1);

// Renderizar tabla de facturas
const facturas = await CuentaCorrienteUI.listarFacturas({ estado: 'pendiente' });
CuentaCorrienteUI.renderizarTablaFacturas(facturas, 'facturas-container');

// Abrir modal de pago
CuentaCorrienteUI.abrirModalPago(facturaId);
```

---

## 📊 Estados de Factura

| Estado | Descripción | Color UI |
|--------|-------------|----------|
| `pendiente` | Sin pagos | Amarillo |
| `pagada_parcial` | Con pagos parciales | Azul |
| `pagada` | Totalmente pagada | Verde |
| `cancelada` | Anulada/Cancelada | Rojo |

---

## 🔄 Triggers Automáticos

El esquema incluye triggers para:

1. **Actualizar límite de crédito**: Se descuenta al crear factura
2. **Restaurar límite de crédito**: Se restituye al pagar totalmente
3. **Actualizar total_pagado**: Se recalcula al insertar pagos

---

## ⚠️ Notas de Compatibilidad

- Los endpoints legacy (`/api/deudas`, `/api/sales/cuenta-corriente`) siguen funcionando
- Se recomienda migrar gradualmente al nuevo esquema
- Los datos existentes en `deudas` pueden coexistir con `facturas`
- Los triggers asumen que `limite_credito` existe en `clientes`

---

## 📝 Mejoras Futuras Sugeridas

1. **Historial completo**: Auditoría de cambios en facturas
2. **Facturación electrónica**: Integración con AFIP
3. **Notificaciones**: Email/SMS de recordatorio de pago
4. **Límites dinámicos**: Algoritmo de scoring crediticio
5. **Reportes**: Estado de cuenta imprimible para clientes

---

## ❓ Soporte

Para dudas o problemas:
- Revisar logs del servidor: `console.log` en los endpoints
- Verificar conexión a SQLite
- Validar formato de fechas (ISO 8601)
