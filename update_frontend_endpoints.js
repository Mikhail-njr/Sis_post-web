#!/usr/bin/env node
/**
 * Script para cambiar todos los endpoints de español a inglés en frontend
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapeo de cambios (español -> inglés)
const replacements = [
    // Clientes
    { from: /\/api\/clientes\//g, to: '/api/customers/' },
    { from: /\/api\/clientes'/g, to: "/api/customers'" },
    { from: /\/api\/clientes"/g, to: '/api/customers"' },
    { from: /\/api\/cliente'/g, to: "/api/customer'" },
    { from: /\/api\/cliente"/g, to: '/api/customer"' },
    
    // Productos
    { from: /\/api\/productos\//g, to: '/api/products/' },
    { from: /\/api\/productos'/g, to: "/api/products'" },
    { from: /\/api\/productos"/g, to: '/api/products"' },
    { from: /\/api\/producto'/g, to: "/api/product'" },
    
    // Ventas
    { from: /\/api\/ventas\//g, to: '/api/sales/' },
    { from: /\/api\/ventas'/g, to: "/api/sales'" },
    { from: /\/api\/ventas"/g, to: '/api/sales"' },
    { from: /\/api\/venta'/g, to: "/api/sale'" },
    
    // Deudas
    { from: /\/api\/deudas\//g, to: '/api/debts/' },
    { from: /\/api\/deudas'/g, to: "/api/debts'" },
    { from: /\/api\/deudas"/g, to: '/api/debts"' },
    { from: /\/api\/deuda'/g, to: "/api/debt'" },
    { from: /\/api\/deuda-/g, to: '/api/debt-' },
    
    // Proveedores
    { from: /\/api\/proveedores\//g, to: '/api/suppliers/' },
    { from: /\/api\/proveedores'/g, to: "/api/suppliers'" },
    { from: /\/api\/proveedor'/g, to: "/api/supplier'" },
    
    // Lotes
    { from: /\/api\/lotes\//g, to: '/api/batches/' },
    { from: /\/api\/lotes'/g, to: "/api/batches'" },
    { from: /\/api\/lote'/g, to: "/api/batch'" },
    
    // Cierres
    { from: /\/api\/cierres\//g, to: '/api/closures/' },
    { from: /\/api\/cierres'/g, to: "/api/closures'" },
    { from: /\/api\/cierre'/g, to: "/api/closure'" },
    
    // Promociones
    { from: /\/api\/promociones\//g, to: '/api/promotions/' },
    { from: /\/api\/promociones'/g, to: "/api/promotions'" },
    { from: /\/api\/promocion'/g, to: "/api/promotion'" },
    
    // Métricas
    { from: /\/api\/metricas\//g, to: '/api/metrics/' },
    { from: /\/api\/metricas'/g, to: "/api/metrics'" },
    { from: /\/api\/metrica'/g, to: "/api/metric'" },
];

// Archivos a procesar
const frontendPath = path.join(__dirname, 'frontend');
const files = glob.sync('**/*.{js,html}', { cwd: frontendPath });

console.log(`📝 Procesando ${files.length} archivos en frontend/...\n`);

files.forEach(file => {
    const filePath = path.join(frontendPath, file);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;
        
        replacements.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                changed = true;
            }
        });
        
        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${file}`);
        }
    } catch (error) {
        console.error(`❌ Error procesando ${file}: ${error.message}`);
    }
});

console.log('\n✅ Endpoints frontend renombrados de español a inglés');
console.log('🚀 El frontend ahora usa endpoints en inglés exclusivamente');
