#!/usr/bin/env node
/**
 * Script para cambiar CORRECTAMENTE todos los endpoints de español a inglés en frontend
 */

const fs = require('fs');
const path = require('path');

// Archivos a actualizar
const files = [
    'frontend/index.html',
    'frontend/script.js',
    'frontend/utils.js',
    'frontend/diagnostic-clientes-cuenta-corriente.js'
];

// Mapeo de cambios (español -> inglés)
const replacements = [
    // Endpoints con rutas completas
    { from: `/clientes/deudas-resumen`, to: `/customers/debts-summary` },
    { from: `/clientes/deudas-con-productos`, to: `/customers/debts-with-products` },
    { from: `/clientes/actualizar-deudas`, to: `/customers/update-debts` },
    { from: `/clientes/deudas`, to: `/customers/debts` },
    { from: `/clientes/cuenta-corriente`, to: `/customers/credit-account` },
    
    // Endpoints raíz en español
    { from: `/clientes'`, to: `/customers'` },
    { from: `/clientes"`, to: `/customers"` },
    { from: `/productos'`, to: `/products'` },
    { from: `/productos"`, to: `/products"` },
    { from: `/ventas'`, to: `/sales'` },
    { from: `/ventas"`, to: `/sales"` },
    { from: `/ventas/`, to: `/sales/` },
    { from: `/deudas'`, to: `/debts'` },
    { from: `/deudas"`, to: `/debts"` },
    { from: `/deudas/`, to: `/debts/` },
    { from: `/proveedores'`, to: `/suppliers'` },
    { from: `/proveedores"`, to: `/suppliers"` },
    { from: `/lotes'`, to: `/batches'` },
    { from: `/lotes"`, to: `/batches"` },
    { from: `/cierres'`, to: `/closures'` },
    { from: `/cierres"`, to: `/closures"` },
    { from: `/promociones'`, to: `/promotions'` },
    { from: `/promociones"`, to: `/promotions"` },
    { from: `/metricas'`, to: `/metrics'` },
    { from: `/metricas"`, to: `/metrics"` },
];

console.log('📝 Actualizando endpoints en archivos frontend...\n');

files.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ Archivo no encontrado: ${filePath}`);
        return;
    }
    
    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;
        let changeCount = 0;
        
        replacements.forEach(({ from, to }) => {
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            
            if (matches) {
                content = content.replace(regex, to);
                changed = true;
                changeCount += matches.length;
            }
        });
        
        if (changed) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ ${filePath} - ${changeCount} cambios realizados`);
        } else {
            console.log(`⏭️ ${filePath} - Sin cambios necesarios`);
        }
    } catch (error) {
        console.error(`❌ Error procesando ${filePath}: ${error.message}`);
    }
});

console.log('\n✅ Endpoints frontend actualizados de español a inglés');
console.log('🚀 Recarga el navegador para ver los cambios');
