#!/usr/bin/env node
/**
 * Script para agregar los endpoints faltantes al backend
 * Estos endpoints actúan como alias/wrappers de los endpoints existentes
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Verificar si ya existen los endpoints
if (content.includes('debts-summary')) {
    console.log('✅ Endpoints ya existen en server.js');
    process.exit(0);
}

// Los nuevos endpoints que agregaremos ANTES de app.listen
const newEndpoints = `

// ============================================================
// ALIAS ENDPOINTS - Para compatibilidad con frontend en inglés
// ============================================================

/**
 * GET /api/customers/debts-summary
 * Alias para GET /api/debts-with-current-total
 * Obtiene resumen de deudas de todos los clientes
 */
app.get('/api/customers/debts-summary', async (req, res) => {
    try {
        // Simplemente redirigir la request al endpoint real
        req.url = '/api/debts-with-current-total';
        return app._router.handle(req, res);
    } catch (error) {
        console.error('Error en GET /api/customers/debts-summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen de deudas' });
    }
});

/**
 * GET /api/customers/:cliente_id/debts-with-products
 * Obtiene deudas con productos de un cliente específico
 */
app.get('/api/customers/:cliente_id/debts-with-products', async (req, res) => {
    try {
        const { cliente_id } = req.params;
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
        
        // Simular una request GET a /api/debts-with-current-total?cliente_id=X
        const response = await fetch(\`\${req.protocol}://\${req.get('host')}/api/debts-with-current-total?cliente_id=\${cliente_id}\`, {
            headers,
            method: 'GET'
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al obtener deudas' });
        }
        
        const deudas = await response.json();
        res.json(deudas);
        
    } catch (error) {
        console.error('Error en GET /api/customers/:cliente_id/debts-with-products:', error);
        res.status(500).json({ error: 'Error al obtener deudas con productos' });
    }
});

/**
 * PUT /api/customers/:cliente_id/update-debts
 * Alias para POST /api/debts/update-prices
 * Actualiza los precios en las deudas de un cliente
 */
app.put('/api/customers/:cliente_id/update-debts', async (req, res) => {
    try {
        const { cliente_id } = req.params;
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
        
        // Usar el endpoint de actualización de precios
        const response = await fetch(\`\${req.protocol}://\${req.get('host')}/api/debts/update-prices\`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ cliente_id, ...req.body })
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al actualizar deudas' });
        }
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        console.error('Error en PUT /api/customers/:cliente_id/update-debts:', error);
        res.status(500).json({ error: 'Error al actualizar deudas' });
    }
});

/**
 * POST /api/sales/credit-account
 * Alias para POST /api/sales/cuenta-corriente
 * Crea una venta a crédito/cuenta corriente
 */
app.post('/api/sales/credit-account', async (req, res) => {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
        
        // Usar el endpoint real de venta a cuenta corriente
        const response = await fetch(\`\${req.protocol}://\${req.get('host')}/api/sales/cuenta-corriente\`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error al crear venta a crédito' });
        }
        
        const result = await response.json();
        res.json(result);
        
    } catch (error) {
        console.error('Error en POST /api/sales/credit-account:', error);
        res.status(500).json({ error: 'Error al crear venta a crédito' });
    }
});

`;

// Encontrar la línea donde colocar los nuevos endpoints (antes de app.listen)
const listenIndex = content.lastIndexOf('app.listen(');
if (listenIndex === -1) {
    console.error('❌ No se encontró app.listen en server.js');
    process.exit(1);
}

// Insertar los nuevos endpoints
content = content.slice(0, listenIndex) + newEndpoints + '\n' + content.slice(listenIndex);

// Guardar el archivo
fs.writeFileSync(serverPath, content, 'utf8');

console.log('✅ Endpoints alias agregados correctamente a server.js');
console.log('📝 Endpoints agregados:');
console.log('   - GET /api/customers/debts-summary');
console.log('   - GET /api/customers/:cliente_id/debts-with-products');
console.log('   - PUT /api/customers/:cliente_id/update-debts');
console.log('   - POST /api/sales/credit-account');
console.log('\n⚠️ IMPORTANTE: Reinicia el servidor para que los cambios surtan efecto');
