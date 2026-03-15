# Índice de Componentes del Dashboard

## Estructura para Mantenimiento

Cada componente está en un archivo separado para facilitar:
- 🔧 **Edición independiente** - Modificar un modal sin tocar los demás
- 👥 **Trabajo en equipo** - Diferentes personas pueden trabajar en diferentes módulos
- 🔍 **Localización de errores** - Encontrar y corregir problemas rápidamente
- 🧪 **Testing** - Probar componentes de forma aislada

---

## MODALES (por funcionalidad)

### Gestión de Productos
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/addModal.html`](modals/addModal.html) | Formulario para crear nuevo producto | ~250 |
| [`modals/editModal.html`](modals/editModal.html) | Formulario para editar producto existente | ~350 |

### Gestión de Proveedores
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/addSupplierModal.html`](modals/addSupplierModal.html) | Crear nuevo proveedor | ~180 |
| [`modals/editSupplierModal.html`](modals/editSupplierModal.html) | Editar proveedor | ~170 |

### Gestión de Clientes
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/addClientModal.html`](modals/addClientModal.html) | Crear nuevo cliente | ~100 |
| [`modals/editClientModal.html`](modals/editClientModal.html) | Editar cliente | ~60 |
| [`modals/clientDebtsModal.html`](modals/clientDebtsModal.html) | Ver deudas del cliente | ~20 |

### Gestión de Lotes
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/createLoteModal.html`](modals/createLoteModal.html) | Crear nuevo lote | ~40 |
| [`modals/editLoteModal.html`](modals/editLoteModal.html) | Editar lote | ~250 |
| [`modals/confirmDeliveryModal.html`](modals/confirmDeliveryModal.html) | Confirmar llegada de productos | ~80 |

### Gestión de Pedidos
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/createOrderModal.html`](modals/createOrderModal.html) | Crear pedido a proveedor | ~250 |

### Caja y Cierres
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/cierreModal.html`](modals/cierreModal.html) | Modal de cierre de caja | ~150 |
| [`modals/retroactiveClosureModal.html`](modals/retroactiveClosureModal.html) | Cierre retroactive | ~40 |

### Promociones y Reportes
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/createPromotionModal.html`](modals/createPromotionModal.html) | Crear promoción | ~250 |
| [`modals/reportOptionsModal.html`](modals/reportOptionsModal.html) | Opciones de reporte | ~80 |
| [`modals/supportModal.html`](modals/supportModal.html) | Soporte técnico | ~50 |

### Deudas
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/debtsSummaryModal.html`](modals/debtsSummaryModal.html) | Resumen de deudas | ~20 |
| [`modals/debtsUpdateSummaryModal.html`](modals/debtsUpdateSummaryModal.html) | Resumen de actualización | ~25 |
| [`modals/paymentHistoryModal.html`](modals/paymentHistoryModal.html) | Historial de pagos | ~20 |

### Utilidades
| Archivo | Descripción | Líneas aprox |
|---------|-------------|--------------|
| [`modals/notificationsModal.html`](modals/notificationsModal.html) | Centro de notificaciones | ~45 |
| [`modals/invoiceDetailsModal.html`](modals/invoiceDetailsModal.html) | Detalles de factura | ~25 |

---

## SECCIONES (del dashboard)

| Archivo | Descripción |
|---------|-------------|
| [`sections/dashboard-promociones.html`](sections/dashboard-promociones.html) | Sección de promociones |
| [`sections/dashboard-metricas.html`](sections/dashboard-metricas.html) | Métricas y estadísticas |
| [`sections/dashboard-productos.html`](sections/dashboard-productos.html) | Lista de productos |
| [`sections/dashboard-lotes.html`](sections/dashboard-lotes.html) | Control de lotes |
| [`sections/dashboard-proveedores.html`](sections/dashboard-proveedores.html) | Lista de proveedores |
| [`sections/dashboard-historial-cierres.html`](sections/dashboard-historial-cierres.html) | Historial de cierres |
| [`sections/dashboard-operations-log.html`](sections/dashboard-operations-log.html) | Registro de operaciones |

---

## Archivos de Sistema

| Archivo | Propósito |
|---------|-----------|
| [`dashboard-includes.js`](dashboard-includes.js) | Loader de componentes |
| [`dashboard-templates.js`](dashboard-templates.js) | Templates JavaScript |
| [`extract-sections.js`](extract-sections.js) | Script extractor |
| [`reduce-dashboard.js`](reduce-dashboard.js) | Script reductor |

---

## Cómo Mantener los Componentes

### 1. Editar un Modal
```bash
# Abrir el archivo del modal específico
code modals/editModal.html
```

### 2. Agregar un Nuevo Campo
1. Editar el archivo del modal correspondiente
2. Actualizar el JavaScript que maneja el formulario
3. Probar la funcionalidad

### 3. Crear un Nuevo Componente
1. Crear archivo en `modals/` o `sections/`
2. Usar el formato de los demás componentes
3. Agregar al índice (este archivo)
4. Actualizar `dashboard-includes.js` si es necesario
