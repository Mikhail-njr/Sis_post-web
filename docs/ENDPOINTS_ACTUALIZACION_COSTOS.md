# 🔧 Endpoints de Actualización de Costos Unitarios

## 📋 Resumen de Endpoints

Este documento detalla los endpoints específicos que manejan la actualización del `costo_unitario` (precio de compra) en el sistema POS.

## 🔄 Endpoints de Creación y Actualización

### 1. **POST /api/lotes** - Creación Manual de Lotes

**Descripción:** Crea un nuevo lote con su respectivo costo unitario.

**Solicitud:**
```json
{
    "producto_id": 123,
    "numero_lote": "L001-2025",
    "fecha_vencimiento": "2026-12-31",
    "cantidad_inicial": 100,
    "costo_unitario": 50.75,
    "notas": "Lote comprado al proveedor XYZ"
}
```

**Proceso de Validación:**
```javascript
// Validaciones realizadas
- producto_id: debe existir en la tabla productos
- numero_lote: debe ser único para el producto
- fecha_vencimiento: debe ser una fecha válida
- cantidad_inicial: debe ser mayor que 0
- costo_unitario: puede ser null o un número positivo
- notas: campo opcional
```

**Almacenamiento:**
```javascript
// SQL ejecutado
INSERT INTO lotes (
    producto_id, numero_lote, fecha_vencimiento, 
    cantidad_inicial, cantidad_actual, costo_unitario, notas
) VALUES (?, ?, ?, ?, ?, ?, ?)
```

**Respuesta Exitosa:**
```json
{
    "success": true,
    "message": "Lote creado exitosamente",
    "lote_id": 456,
    "costo_unitario": 50.75
}
```

### 2. **PUT /api/lotes/:id** - Actualización de Lote

**Descripción:** Actualiza los datos de un lote existente, incluyendo el costo unitario.

**Solicitud:**
```json
{
    "numero_lote": "L001-2025-REV",
    "fecha_vencimiento": "2027-06-30",
    "costo_unitario": 52.00,
    "notas": "Lote actualizado con nuevo costo"
}
```

**Proceso de Actualización:**
```javascript
// Validaciones realizadas
- El lote debe existir
- No se puede modificar cantidad_actual directamente (se maneja por movimientos)
- costo_unitario: puede actualizarse si el lote está activo
- Se registra el cambio para auditoría
```

**SQL de Actualización:**
```sql
UPDATE lotes 
SET numero_lote = ?, fecha_vencimiento = ?, costo_unitario = ?, notas = ?
WHERE id = ? AND estado = 'activo'
```

**Auditoría de Cambios:**
```javascript
// Registro de cambios
if (costo_unitario !== undefined && oldLote.costo_unitario !== costo_unitario) {
    changes.push(`costo: ${oldLote.costo_unitario} → ${costo_unitario}`);
}
```

### 3. **POST /api/supplier-orders/:id/confirm-delivery** - Recepción de Pedido

**Descripción:** Confirma la recepción de un pedido de proveedor y crea lotes automáticamente con los costos unitarios.

**Solicitud:**
```json
{
    "fecha_entrega": "2025-12-29",
    "observaciones": "Entrega completa",
    "items": [
        {
            "producto_id": 123,
            "cantidad_recibida": 50,
            "costo_unitario": 45.50,
            "fecha_vencimiento": "2026-06-30"
        }
    ],
    "items_extra": [
        {
            "producto_id": 456,
            "nombre": "Producto Extra",
            "cantidad_recibida": 10,
            "costo_unitario": 30.00,
            "fecha_vencimiento": "2026-12-31"
        }
    ]
}
```

**Proceso de Validación de Costos:**
```javascript
// Validación para cada item
for (const item of items) {
    const costoUnitario = parseFloat(item.costo_unitario);
    if (isNaN(costoUnitario) || costoUnitario < 0) {
        throw new Error(`Costo unitario inválido para el producto ${item.producto_id}`);
    }
    
    // Validación de cantidad
    if (item.cantidad_recibida <= 0) {
        throw new Error(`Cantidad recibida inválida para el producto ${item.producto_id}`);
    }
}
```

**Creación de Lotes Automáticos:**
```javascript
// Generación de número de lote
const loteNumber = `L${order[0].numero_pedido}-${item.producto_id}-${Date.now()}`;

// Creación del lote
await dbRun(
    `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas, fecha_ingreso)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        item.producto_id,
        loteNumber,
        item.fecha_vencimiento,
        item.cantidad_recibida,
        item.cantidad_recibida,
        costoUnitario,  // ← Costo unitario del pedido
        `Lote generado automáticamente - Pedido ${order[0].numero_pedido}`,
        fechaEntregaReal
    ]
);
```

**Procesamiento de Items Extra:**
```javascript
// Para items no solicitados originalmente
for (const extraItem of items_extra) {
    const costoUnitario = parseFloat(extraItem.costo_unitario) || 0;
    
    // Creación del lote para item extra
    await dbRun(
        `INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, notas, fecha_ingreso)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            extraItem.producto_id,
            loteNumber,
            extraItem.fecha_vencimiento,
            extraItem.cantidad_recibida,
            extraItem.cantidad_recibida,
            costoUnitario,  // ← Costo unitario del item extra
            `Item extra del proveedor - Pedido ${order[0].numero_pedido}`,
            fechaEntregaReal
        ]
    );
}
```

## 📊 Endpoints de Consulta de Costos

### 1. **GET /api/products/profitability** - Rentabilidad por Producto

**Descripción:** Obtiene el reporte de rentabilidad incluyendo costos unitarios.

**Respuesta:**
```json
{
    "id": 123,
    "nombre": "Producto Ejemplo",
    "precio_venta": 100.00,
    "costo_promedio_ponderado": 60.50,
    "ganancia_unitaria": 39.50,
    "margen_ganancia_porcentaje": 65.29,
    "ganancia_total_potencial": 3950.00,
    "lote_con_mayor_cantidad": {
        "lote_id": 456,
        "costo_unitario": 58.00,
        "cantidad_actual": 80
    }
}
```

**Cálculo del Costo Promedio Ponderado:**
```sql
SELECT 
    SUM(l.costo_unitario * l.cantidad_actual) / SUM(l.cantidad_actual) as costo_promedio_ponderado
FROM lotes l
WHERE l.producto_id = ? AND l.estado = 'activo' AND l.cantidad_actual > 0
```

### 2. **GET /api/products/:id/lotes** - Detalle de Lotes por Producto

**Descripción:** Obtiene todos los lotes de un producto con sus costos unitarios.

**Respuesta:**
```json
[
    {
        "lote_id": 456,
        "numero_lote": "L001-2025",
        "costo_unitario": 50.75,
        "cantidad_actual": 80,
        "ganancia_unitaria": 49.25,
        "margen_ganancia_porcentaje": 97.04,
        "ganancia_total_lote": 3940.00,
        "fecha_vencimiento": "2026-12-31",
        "estado_vencimiento": "vigente"
    },
    {
        "lote_id": 789,
        "numero_lote": "L002-2025",
        "costo_unitario": 52.00,
        "cantidad_actual": 45,
        "ganancia_unitaria": 48.00,
        "margen_ganancia_porcentaje": 92.31,
        "ganancia_total_lote": 2160.00,
        "fecha_vencimiento": "2026-06-30",
        "estado_vencimiento": "vigente"
    }
]
```

**Cálculos por Lote:**
```sql
SELECT
    l.id as lote_id,
    l.numero_lote,
    l.costo_unitario,
    l.cantidad_actual,
    ROUND(p.precio - l.costo_unitario, 2) as ganancia_unitaria,
    CASE
        WHEN l.costo_unitario > 0
        THEN ROUND(((p.precio - l.costo_unitario) / l.costo_unitario) * 100, 2)
        ELSE NULL
    END as margen_ganancia_porcentaje,
    ROUND(l.cantidad_actual * (p.precio - l.costo_unitario), 2) as ganancia_total_lote
FROM lotes l
JOIN productos p ON l.producto_id = p.id
WHERE l.producto_id = ? AND l.estado = 'activo'
```

## 🛡️ Validaciones y Seguridad

### 1. **Validación de Costos Negativos**
```javascript
// Endpoint: POST /api/lotes
const costoUnitario = parseFloat(req.body.costo_unitario);
if (isNaN(costoUnitario) || costoUnitario < 0) {
    return res.status(400).json({
        success: false,
        message: "El costo unitario debe ser un número positivo o null"
    });
}
```

### 2. **Validación de Costo vs Precio de Venta**
```javascript
// Endpoint: POST /api/supplier-orders/:id/confirm-delivery
const costoUnitario = parseFloat(item.costo_unitario);
const precioVenta = await getPrecioVenta(item.producto_id);

if (costoUnitario > precioVenta) {
    // Alerta de margen negativo
    console.warn(`Alerta: Costo unitario (${costoUnitario}) mayor que precio de venta (${precioVenta}) para el producto ${item.producto_id}`);
    
    // Opcional: permitir o bloquear según política de negocio
    // throw new Error(`Costo unitario no puede ser mayor que el precio de venta`);
}
```

### 3. **Auditoría de Cambios**
```javascript
// Endpoint: PUT /api/lotes/:id
const oldLote = await getLoteById(loteId);
const changes = [];

if (costo_unitario !== undefined && oldLote.costo_unitario !== costo_unitario) {
    changes.push(`costo: ${oldLote.costo_unitario} → ${costo_unitario}`);
}

// Registrar en bitácora de auditoría
if (changes.length > 0) {
    await logAudit({
        accion: 'ACTUALIZACION_LOTE',
        descripcion: `Lote ${loteId} - ${changes.join(', ')}`,
        usuario: req.user.id
    });
}
```

## 📈 Métricas y Monitoreo

### 1. **Métricas de Costos**
```javascript
// Endpoint: GET /api/metrics/costs
{
    "costo_promedio_general": 45.67,
    "costo_maximo": 120.50,
    "costo_minimo": 5.25,
    "productos_con_costo_actualizado": 156,
    "lotes_sin_costo_definido": 23
}
```

### 2. **Alertas de Costos**
```javascript
// Sistema de alertas para costos inusuales
const alertas = [];
if (costoUnitario > precioVenta * 1.2) {
    alertas.push({
        tipo: 'COSTO_ALTO',
        mensaje: `Costo unitario (${costoUnitario}) 20% mayor que precio de venta (${precioVenta})`
    });
}

if (costoUnitario < costoPromedioHistorico * 0.5) {
    alertas.push({
        tipo: 'COSTO_BAJO',
        mensaje: `Costo unitario (${costoUnitario}) 50% menor que el promedio histórico (${costoPromedioHistorico})`
    });
}
```

## 🔧 Mejoras Recomendadas

### 1. **Endpoint de Historial de Costos**
```javascript
// Nuevo endpoint: GET /api/products/:id/cost-history
{
    "producto_id": 123,
    "historial_costos": [
        {
            "fecha": "2025-12-01",
            "costo_unitario": 50.75,
            "fuente": "Creación manual",
            "lote_id": 456
        },
        {
            "fecha": "2025-12-15",
            "costo_unitario": 48.50,
            "fuente": "Pedido proveedor",
            "lote_id": 789
        }
    ]
}
```

### 2. **Endpoint de Comparación de Costos**
```javascript
// Nuevo endpoint: GET /api/products/:id/cost-comparison
{
    "producto_id": 123,
    "costo_actual": 50.75,
    "costo_promedio": 48.50,
    "costo_minimo": 45.00,
    "costo_maximo": 55.00,
    "variacion_porcentaje": 4.62,
    "tendencia": "ALTA"
}
```

### 3. **Validación de Proveedores**
```javascript
// Validar costo unitario contra precios de proveedores registrados
const proveedor = await getProveedorByProducto(item.producto_id);
if (costoUnitario < proveedor.precio_minimo * 0.8) {
    throw new Error(`Costo unitario demasiado bajo para el proveedor registrado`);
}
```

Este documento proporciona una visión completa de cómo se manejan los costos unitarios en tu sistema POS, desde su creación hasta su consulta y validación.