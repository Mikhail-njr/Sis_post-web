# Sistema de Modularización del Dashboard

Este directorio contiene el sistema de carga dinámica de componentes para reducir el tamaño del archivo `dashboard.html` (original: **433.08 KB**).

## Resultados de la Extracción

Se han extraído los siguientes componentes:

### Secciones Extraídas (7 archivos)
| Archivo | Tamaño |
|---------|--------|
| `sections/dashboard-promociones.html` | 1.11 KB |
| `sections/dashboard-metricas.html` | 1.67 KB |
| `sections/dashboard-productos.html` | 1.74 KB |
| `sections/dashboard-lotes.html` | 2.72 KB |
| `sections/dashboard-historial-cierres.html` | 1.05 KB |
| `sections/dashboard-proveedores.html` | 2.83 KB |
| `sections/dashboard-operations-log.html` | 2.44 KB |

### Modales Extraídos (21 archivos)
| Archivo | Tamaño |
|---------|--------|
| `modals/notificationsModal.html` | 1.69 KB |
| `modals/createOrderModal.html` | 9.95 KB |
| `modals/createLoteModal.html` | 1.46 KB |
| `modals/confirmDeliveryModal.html` | 3.13 KB |
| `modals/editLoteModal.html` | 10.46 KB |
| `modals/cierreModal.html` | 5.88 KB |
| `modals/retroactiveClosureModal.html` | 1.63 KB |
| `modals/editModal.html` | 14.84 KB |
| `modals/addModal.html` | 11.17 KB |
| `modals/addSupplierModal.html` | 7.25 KB |
| `modals/editSupplierModal.html` | 6.88 KB |
| `modals/addClientModal.html` | 4.23 KB |
| `modals/editClientModal.html` | 2.39 KB |
| `modals/clientDebtsModal.html` | 0.64 KB |
| `modals/debtsUpdateSummaryModal.html` | 0.86 KB |
| `modals/debtsSummaryModal.html` | 0.75 KB |
| `modals/paymentHistoryModal.html` | 0.64 KB |
| `modals/createPromotionModal.html` | 10.03 KB |
| `modals/reportOptionsModal.html` | 3.18 KB |
| `modals/supportModal.html` | 1.87 KB |
| `modals/invoiceDetailsModal.html` | 0.77 KB |

**Total extraído: 113.24 KB (26.1% de reducción)**

## Estructura

```
dashboard-components/
├── dashboard-includes.js      # Loader de componentes
├── dashboard-templates.js     # Templates JS (alternativo)
├── extract-sections.js       # Script extractor
├── README.md                 # Este archivo
├── sections/                 # Secciones del dashboard
│   ├── dashboard-promociones.html
│   ├── dashboard-metricas.html
│   ├── dashboard-productos.html
│   ├── dashboard-lotes.html
│   ├── dashboard-historial-cierres.html
│   ├── dashboard-proveedores.html
│   └── dashboard-operations-log.html
└── modals/                   # Modales del dashboard
    ├── notificationsModal.html
    ├── createOrderModal.html
    ├── createLoteModal.html
    ├── confirmDeliveryModal.html
    ├── editLoteModal.html
    ├── cierreModal.html
    ├── retroactiveClosureModal.html
    ├── editModal.html
    ├── addModal.html
    ├── addSupplierModal.html
    ├── editSupplierModal.html
    ├── addClientModal.html
    ├── editClientModal.html
    ├── clientDebtsModal.html
    ├── debtsUpdateSummaryModal.html
    ├── debtsSummaryModal.html
    ├── paymentHistoryModal.html
    ├── createPromotionModal.html
    ├── reportOptionsModal.html
    ├── supportModal.html
    └── invoiceDetailsModal.html
```

## Uso del Loader

### Cargar un componente específico

```javascript
// Cargar un modal bajo demanda
const html = await DashboardLoader.loadComponent('notificationsModal');
document.getElementById('modal-container').innerHTML = html;
```

### Precargar componentes

```javascript
// Precargar modales que se abrirán pronto
await DashboardLoader.preloadComponents([
    'editModal', 
    'addModal',
    'cierreModal'
]);
```

### Sistema de carga diferida (Lazy Loading)

Agregar el atributo `data-lazy-load` a cualquier elemento:

```html
<div id="productos-section" data-lazy-load="productos-section">
    <!-- Se cargará automáticamente cuando el DOM esté listo -->
</div>
```

## Beneficios

1. **Reducción del tamaño inicial**: ~26% del código movido a archivos externos
2. **Mantenimiento más fácil**: Cada componente está en su propio archivo
3. **Carga bajo demanda**: Los modales solo se cargan cuando se necesitan
4. **Cacheo automático**: Los componentes se cachean después de la primera carga

## Implementación en dashboard.html

Para usar este sistema, agregar al final del body:

```html
<script src="dashboard-components/dashboard-includes.js"></script>
```

## Notas Importantes

- El archivo `dashboard.html` original **NO debe modificarse** directamente
- Para usar los componentes extraídos, es necesario crear un nuevo archivo (ej: `dashboard.modular.html`)
- La migración debe ser gradual para mantener la compatibilidad con el JavaScript existente
- Los IDs de los elementos deben mantenerse iguales para que las funciones JavaScript existentes funcionen
