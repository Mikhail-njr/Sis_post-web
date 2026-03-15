/**
 * Dashboard Component Extractor
 * Herramienta para extraer secciones del dashboard.html original
 * y guardarlas en archivos separados para carga dinámica.
 * 
 * USO: node extract-sections.js
 * 
 * Este script extrae las siguientes secciones del dashboard.html:
 * - Secciones principales (ventas, productos, clientes, etc.)
 * - Modales (editModal, addModal, etc.)
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD_PATH = path.join(__dirname, '..', 'dashboard.html');
const SECTIONS_DIR = path.join(__dirname, 'sections');
const MODALS_DIR = path.join(__dirname, 'modals');

// Patrones para identificar secciones y modales
const SECTION_PATTERNS = {
    'ventas-section': /<!-- Sección de Ventas -->[\s\S]*?<div id="ventas-section" class="dashboard-section">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Fin Sección de Ventas -->/,
    'promociones-section': /<!-- Sección de Promociones -->[\s\S]*?<div id="promociones-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'metricas-section': /<!-- Sección de Métricas[\s\S]*?<div id="metricas-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'productos-section': /<!-- Sección de Productos -->[\s\S]*?<div id="productos-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'lotes-section': /<!-- Sección de Lotes -->[\s\S]*?<div id="lotes-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'historial-cierres-section': /<!-- Sección de Historial de Cierres -->[\s\S]*?<div id="historial-cierres-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'proveedores-section': /<!-- Sección de Proveedores -->[\s\S]*?<div id="proveedores-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'clientes-section': /<!-- Sección de Clientes -->[\s\S]*?<div id="clientes-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/,
    'operations-log-section': /<!-- Sección de Registro de Operaciones -->[\s\S]*?<div id="operations-log-section" class="dashboard-section[\s\S]*?<\/div>\s*<\/div>/
};

const MODAL_PATTERNS = {
    'notificationsModal': /<!-- Modal de Notificaciones[\s\S]*?<div id="notificationsModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'createOrderModal': /<!-- Modal de Crear Pedido[\s\S]*?<div id="createOrderModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'createLoteModal': /<!-- Modal de Crear Lote[\s\S]*?<div id="createLoteModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'confirmDeliveryModal': /<!-- Modal de Confirmación de Llegada[\s\S]*?<div id="confirmDeliveryModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'editLoteModal': /<!-- Modal de Editar Lote[\s\S]*?<div id="editLoteModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'cierreModal': /<!-- Modal de Cierre de Caja[\s\S]*?<div id="cierreModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'retroactiveClosureModal': /<!-- Modal de Cierre Retroactivo[\s\S]*?<div id="retroactiveClosureModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'editModal': /<!-- Modal de edición de producto[\s\S]*?<div id="editModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'addModal': /<!-- Modal de agregar producto[\s\S]*?<div id="addModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'addSupplierModal': /<!-- Modal de agregar proveedor[\s\S]*?<div id="addSupplierModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'editSupplierModal': /<!-- Modal de editar proveedor[\s\S]*?<div id="editSupplierModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'addClientModal': /<!-- Modal de agregar cliente[\s\S]*?<div id="addClientModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'editClientModal': /<!-- Modal de editar cliente[\s\S]*?<div id="editClientModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'clientDebtsModal': /<!-- Modal de deudas del cliente[\s\S]*?<div id="clientDebtsModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'debtsUpdateSummaryModal': /<!-- Modal de resumen de actualización[\s\S]*?<div id="debtsUpdateSummaryModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'debtsSummaryModal': /<!-- Modal de resumen de deudas[\s\S]*?<div id="debtsSummaryModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'paymentHistoryModal': /<!-- Modal de historial de pagos[\s\S]*?<div id="paymentHistoryModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'createPromotionModal': /<!-- Modal de crear promoción[\s\S]*?<div id="createPromotionModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'reportOptionsModal': /<!-- Modal de opciones de reporte[\s\S]*?<div id="reportOptionsModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'supportModal': /<!-- Modal de soporte[\s\S]*?<div id="supportModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'invoiceDetailsModal': /<!-- Modal de detalles de factura[\s\S]*?<div id="invoiceDetailsModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'backupModal': /<!-- Modal de Backup[\s\S]*?<div id="backupModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    'resetModal': /<!-- Modal de Reset[\s\S]*?<div id="resetModal" class="edit-modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Creado directorio: ${dir}`);
    }
}

function extractComponents() {
    console.log('🔍 Leyendo dashboard.html...');
    
    if (!fs.existsSync(DASHBOARD_PATH)) {
        console.error('❌ No se encontró dashboard.html');
        return;
    }
    
    const content = fs.readFileSync(DASHBOARD_PATH, 'utf-8');
    console.log(`📄 Tamaño del archivo: ${(content.length / 1024).toFixed(2)} KB`);
    
    ensureDir(SECTIONS_DIR);
    ensureDir(MODALS_DIR);
    
    let extractedSize = 0;
    let sectionsCount = 0;
    let modalsCount = 0;
    
    // Extraer secciones
    console.log('\n📦 Extrayendo secciones...');
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
        const match = content.match(pattern);
        if (match) {
            const filePath = path.join(SECTIONS_DIR, `dashboard-${name.replace('-section', '')}.html`);
            fs.writeFileSync(filePath, match[0]);
            extractedSize += match[0].length;
            sectionsCount++;
            console.log(`  ✅ ${name} -> sections/dashboard-${name.replace('-section', '')}.html (${(match[0].length / 1024).toFixed(2)} KB)`);
        } else {
            console.log(`  ⚠️ No se encontró: ${name}`);
        }
    }
    
    // Extraer modales
    console.log('\n📦 Extrayendo modales...');
    for (const [name, pattern] of Object.entries(MODAL_PATTERNS)) {
        const match = content.match(pattern);
        if (match) {
            const filePath = path.join(MODALS_DIR, `${name}.html`);
            fs.writeFileSync(filePath, match[0]);
            extractedSize += match[0].length;
            modalsCount++;
            console.log(`  ✅ ${name} -> modals/${name}.html (${(match[0].length / 1024).toFixed(2)} KB)`);
        } else {
            console.log(`  ⚠️ No se encontró: ${name}`);
        }
    }
    
    console.log('\n📊 Resumen:');
    console.log(`   - Secciones extraídas: ${sectionsCount}`);
    console.log(`   - Modales extraídos: ${modalsCount}`);
    console.log(`   - Tamaño total extraído: ${(extractedSize / 1024).toFixed(2)} KB`);
    console.log(`   - Tamaño original: ${(content.length / 1024).toFixed(2)} KB`);
    console.log(`   - Reducción potencial: ${((extractedSize / content.length) * 100).toFixed(1)}%`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    extractComponents();
}

module.exports = { extractComponents };
