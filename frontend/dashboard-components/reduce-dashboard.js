/**
 * Dashboard Reductor
 * Elimina los componentes ya extraídos del dashboard.html original
 * y los reemplaza con loaders dinámicos.
 * 
 * USO: node reduce-dashboard.js
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD_PATH = path.join(__dirname, '..', 'dashboard.html');
const OUTPUT_PATH = path.join(__dirname, '..', 'dashboard.min.html');

// Componentes a eliminar (nombre: [inicio, fin] aproximado - búsqueda por patrón)
const COMPONENTS_TO_REMOVE = [
    // Modales - buscar por ID
    { id: 'notificationsModal', start: /<!--\s*Modal de Notificaciones/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'createOrderModal', start: /<!--\s*Modal de Crear Pedido/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'createLoteModal', start: /<!--\s*Modal de Crear Lote/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'confirmDeliveryModal', start: /<!--\s*Modal de Confirmación/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'editLoteModal', start: /<!--\s*Modal de Editar Lote/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'cierreModal', start: /<!--\s*Modal de Cierre de Caja/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'retroactiveClosureModal', start: /<!--\s*Modal de Cierre Retroactivo/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'editModal', start: /<!--\s*Modal de edición de producto/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'addModal', start: /<!--\s*Modal de agregar producto/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'addSupplierModal', start: /<!--\s*Modal de agregar proveedor/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'editSupplierModal', start: /<!--\s*Modal de editar proveedor/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'addClientModal', start: /<!--\s*Modal de agregar cliente/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'editClientModal', start: /<!--\s*Modal de editar cliente/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'clientDebtsModal', start: /<!--\s*Modal de deudas del cliente/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'debtsUpdateSummaryModal', start: /<!--\s*Modal de resumen de actualización/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'debtsSummaryModal', start: /<!--\s*Modal de resumen de deudas/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'paymentHistoryModal', start: /<!--\s*Modal de historial de pagos/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'createPromotionModal', start: /<!--\s*Modal de crear promoción/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'reportOptionsModal', start: /<!--\s*Modal de opciones de reporte/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'supportModal', start: /<!--\s*Modal de soporte/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    { id: 'invoiceDetailsModal', start: /<!--\s*Modal de detalles de factura/i, end: /<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*(Modal|Secci)/i },
    
    // Secciones
    { id: 'promociones-section', start: /<!--\s*Sección de Promociones/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
    { id: 'metricas-section', start: /<!--\s*Sección de Métricas/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
    { id: 'productos-section', start: /<!--\s*Sección de Productos/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
    { id: 'lotes-section', start: /<!--\s*Sección de Lotes/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
    { id: 'historial-cierres-section', start: /<!--\s*Sección de Historial/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
    { id: 'proveedores-section', start: /<!--\s*Sección de Proveedores/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
    { id: 'operations-log-section', start: /<!--\s*Sección de Registro/i, end: /<\/div>\s*<\/div>\s*<!--\s*(Sección|Modal)/i },
];

function createPlaceholder(id) {
    return `<!-- Componente ${id} cargado dinámicamente -->
<div id="${id}" data-dynamic-component="true" data-component-file="dashboard-components/modals/${id}.html"></div>`;
}

function reduceDashboard() {
    console.log('🔄 Reduciendo dashboard.html...\n');
    
    if (!fs.existsSync(DASHBOARD_PATH)) {
        console.error('❌ No se encontró dashboard.html');
        return;
    }
    
    let content = fs.readFileSync(DASHBOARD_PATH, 'utf-8');
    const originalSize = content.length;
    
    console.log(`📄 Tamaño original: ${(originalSize / 1024).toFixed(2)} KB`);
    
    // Agregar script del loader al final del body
    const loaderScript = `
    
    <!-- Dashboard Components Loader -->
    <script src="dashboard-components/dashboard-includes.js"></script>
`;
    
    // Buscar el cierre del body y agregar el script
    content = content.replace('</body>', loaderScript + '</body>');
    
    // Eliminar componentes uno por uno
    let removedCount = 0;
    let removedSize = 0;
    
    for (const comp of COMPONENTS_TO_REMOVE) {
        const startMatch = content.match(comp.start);
        if (startMatch) {
            // Encontrar el inicio
            const startIdx = content.indexOf(startMatch[0]);
            
            // Buscar el final (tomando un segmento grande para buscar)
            const searchRegion = content.substring(startIdx, Math.min(startIdx + 50000, content.length));
            const endMatch = searchRegion.match(comp.end);
            
            if (endMatch) {
                const endIdx = startIdx + searchRegion.indexOf(endMatch[0]) + endMatch[0].length;
                
                // Calcular tamaño de lo que se eliminará
                const compSize = endIdx - startIdx;
                
                // Reemplazar con placeholder
                const placeholder = createPlaceholder(comp.id);
                content = content.substring(0, startIdx) + placeholder + content.substring(endIdx);
                
                removedSize += compSize;
                removedCount++;
                console.log(`  ✅ Eliminado: ${comp.id} (${(compSize / 1024).toFixed(2)} KB)`);
            }
        }
    }
    
    // Guardar archivo reducido
    fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
    
    const newSize = content.length;
    const reduction = originalSize - newSize;
    
    console.log('\n📊 Resumen:');
    console.log(`   - Componentes eliminados: ${removedCount}`);
    console.log(`   - Tamaño eliminado: ${(removedSize / 1024).toFixed(2)} KB`);
    console.log(`   - Nuevo tamaño: ${(newSize / 1024).toFixed(2)} KB`);
    console.log(`   - Reducción: ${((reduction / originalSize) * 100).toFixed(1)}%`);
    console.log(`\n✅ Archivo guardado como: dashboard.min.html`);
}

// Ejecutar
reduceDashboard();
