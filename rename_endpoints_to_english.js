#!/usr/bin/env node
/**
 * Script para cambiar todos los endpoints de español a inglés en backend/server.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'server.js');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Mapeo de cambios (español -> inglés)
const replacements = [
    // Endpoints de clientes
    { from: /app\.get\('\/api\/clientes'/g, to: "app.get('/api/customers'" },
    { from: /app\.post\('\/api\/clientes'/g, to: "app.post('/api/customers'" },
    { from: /app\.put\('\/api\/clientes/g, to: "app.put('/api/customers" },
    { from: /app\.delete\('\/api\/clientes/g, to: "app.delete('/api/customers" },
    { from: /\/api\/clientes\//g, to: '/api/customers/' },
    { from: /\/api\/clientes'/g, to: "/api/customers'" },
    
    // Endpoints de deudas
    { from: /app\.get\('\/api\/deudas'/g, to: "app.get('/api/debts'" },
    { from: /app\.post\('\/api\/deudas'/g, to: "app.post('/api/debts'" },
    { from: /app\.put\('\/api\/deudas/g, to: "app.put('/api/debts" },
    { from: /\/api\/deudas\//g, to: '/api/debts/' },
    { from: /\/api\/deudas'/g, to: "/api/debts'" },
    
    // Endpoints de ventas
    { from: /app\.post\('\/api\/ventas/g, to: "app.post('/api/sales" },
    { from: /\/api\/ventas\//g, to: '/api/sales/' },
    { from: /\/api\/ventas'/g, to: "/api/sales'" },
    
    // Logs con [UNIFICADO]
    { from: /console\.log\('🔍 \[UNIFICADO\]/g, to: "console.log('🔍" },
    { from: /console\.log\('➕ \[UNIFICADO\]/g, to: "console.log('➕" },
    { from: /console\.log\('✏️ \[UNIFICADO\]/g, to: "console.log('✏️" },
    { from: /console\.log\('🗑️ \[UNIFICADO\]/g, to: "console.log('🗑️" },
];

// Aplicar reemplazos
replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
});

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Endpoints renombrados de español a inglés en backend/server.js');
console.log('📝 Cambios realizados:');
console.log('   - /api/clientes -> /api/customers');
console.log('   - /api/deudas -> /api/debts');
console.log('   - /api/ventas -> /api/sales');
console.log('\n🚀 Ahora ejecuta: node backend/server.js');
