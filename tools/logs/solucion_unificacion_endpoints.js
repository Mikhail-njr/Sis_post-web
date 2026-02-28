/**
 * SOLUCIÓN: Desactivación del Middleware de Unificación Problemático
 * 
 * Este módulo proporciona una configuración de endpoints SIN redirecciones
 * que causan bucles infinitos (ERR_TOO_MANY_REDIRECTS)
 * 
 * ⚠️ IMPORTANTE: El middleware anterior causaba bucles en endpoints como:
 * /api/productos/with-discounts -> /api/productoooo... (bucle infinito)
 */

const express = require('express');

/**
 * Middleware PASIVO: Solo registra, no modifica URLs
 * Evita bucles infinitos mientras mantiene compatibilidad
 */
function createLoggingMiddleware() {
    return (req, res, next) => {
        const url = req.url || '';
        const method = req.method || 'GET';
        
        // Solo loguear endpoints /api/
        if (url.startsWith('/api/')) {
            console.log(`📨 ${method} ${url}`);
        }
        
        next();
    };
}

/**
 * Endpoints disponibles en el sistema (usa los que EXISTEN)
 * NO crear redirecciones, usar directamente
 */
const endpointMap = {
    // Endpoints EN ESPAÑOL (canónicos - USAR ESTOS)
    clientes: '/api/clientes',
    productos: '/api/productos',
    ventas: '/api/ventas',
    deudas: '/api/deudas',
    proveedores: '/api/proveedores',
    lotes: '/api/lotes',
    cierres: '/api/cierres',
    operaciones: '/api/operaciones',
    promociones: '/api/promociones',
    metricas: '/api/metricas',
    ordenesProveedor: '/api/ordenes-proveedor', // <-- agregado

    // Endpoints EN INGLÉS (COMPATIBLE pero NO usar en nuevo código)
    customers: '/api/customers',
    products: '/api/products',
    sales: '/api/sales',
    debts: '/api/debts',
    suppliers: '/api/suppliers',
    batches: '/api/batches',
    closures: '/api/closures',
    operations: '/api/operations',
    promotions: '/api/promotions',
    metrics: '/api/metrics',
    supplierOrders: '/api/supplier-orders' // <-- agregado
};

/**
 * SOLUCIÓN: Usar endpoints que YA EXISTEN en el servidor
 * En lugar de crear middleware que cause bucles
 */
function configureEndpoints(app) {
    console.log('⚠️ ADVERTENCIA: Middleware de unificación DESACTIVADO');
    console.log('✅ Usar endpoints directamente (español o inglés, ambos soportados)');
    console.log('\n📋 Endpoints recomendados (español):');
    console.log('   - GET /api/clientes');
    console.log('   - GET /api/productos');
    console.log('   - GET /api/ventas');
    console.log('   - GET /api/deudas');
    console.log('   - GET /api/proveedores');
    console.log('   - GET /api/ordenes-proveedor'); // <-- agregado
    console.log('   - GET /api/lotes'); // <-- agregado
    console.log('\n');
    
    // Info endpoint
    app.get('/api/endpoints-info', (req, res) => {
        res.json({
            message: 'Información de endpoints disponibles',
            canonical: endpointMap,
            note: 'Usar endpoints en ESPAÑOL. Los endpoints en inglés también funcionan pero no se garantiza compatibilidad futura'
        });
    });
}

/**
 * Exportar configuración
 */
module.exports = {
    createLoggingMiddleware,
    configureEndpoints,
    endpointMap
};

/**
 * Si se ejecuta directamente, mostrar información
 */
if (require.main === module) {
    console.log('📋 Endpoints disponibles:');
    console.log(JSON.stringify(endpointMap, null, 2));
}

// Ejemplo de uso de confirmación de entrega con manejo de errores
async function confirmarEntrega(orderId, bodyToSend, headers) {
    try {
        console.log('🟢 Body enviado a confirm-delivery:', JSON.stringify(bodyToSend, null, 2));
        const response = await fetch(`${window.ApiClient.API_BASE}/supplier-orders/${orderId}/confirm-delivery`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bodyToSend)
        });
        // ...manejo de la respuesta...
    } catch (error) {
        console.error('Error confirmando entrega:', error);
        showAlert('Error al confirmar entrega: ' + error.message, 'error');
    }
}