/**
 * Middleware de redirección para endpoints en español
 * Este middleware redirige automáticamente las solicitudes a endpoints en español
 * hacia sus equivalentes en inglés, manteniendo compatibilidad hacia atrás
 */

const express = require('express');

// Mapeo de endpoints en español a inglés
const SPANISH_TO_ENGLISH_ENDPOINTS = {
    // Autenticación
    '/api/auth-test': '/api/test-auth',
    '/api/test-auth': '/api/test-auth', // Ya está en inglés, pero mantener para compatibilidad
    
    // Reset de datos
    '/api/reset-data': '/api/reset-data', // Ya está en inglés
    
    // Clientes (mantener compatibilidad)
    '/api/clientes': '/api/customers',
    '/api/clientes/cuenta-corriente': '/api/customers/cuenta-corriente',
    
    // Deudas
    '/api/debts': '/api/debts',
    '/api/debts/:id': '/api/debts/:id',
    '/api/debts/:id/payment': '/api/debts/:id/payment',
    '/api/debts/:id/payments': '/api/debts/:id/payments',
    '/api/debts-with-current-total': '/api/debts-with-current-total',
    '/api/debts/update-prices': '/api/debts/update-prices',
    '/api/debts/update-prices-selective': '/api/debts/update-prices-selective',
    '/api/debts/diagnostics': '/api/debts/diagnostics',
    '/api/debts/fix-missing-products': '/api/debts/fix-missing-products',
    '/api/debts/validate-consistency': '/api/debts/validate-consistency',
    
    // Productos
    '/api/products': '/api/products',
    '/api/products/search': '/api/products/search',
    '/api/products/with-discounts': '/api/products/with-discounts',
    '/api/products/:id': '/api/products/:id',
    
    // Ventas
    '/api/sales': '/api/sales',
    '/api/sales/cuenta-corriente': '/api/sales/cuenta-corriente',
    
    // Cierres de caja
    '/api/cierres': '/api/cierres',
    '/api/check-pending-closures': '/api/check-pending-closures',
    
    // Operaciones
    '/api/operations-log': '/api/operations-log',
    '/api/reset-data': '/api/reset-data',
    '/api/restore-backup': '/api/restore-backup',
    
    // Configuración
    '/api/settings/logging-enabled': '/api/settings/logging-enabled',
    
    // Métricas
    '/api/stats': '/api/stats',
    
    // Licencias
    '/api/license-status': '/api/license-status',
    '/api/can-generate-reports': '/api/can-generate-reports',
    
    // Otros
    '/api/debug-sales': '/api/debug-sales',
    '/api/health': '/api/health'
};

// Endpoints que deben ser eliminados (duplicados)
const ENDPOINTS_TO_REMOVE = [
    '/api/auth-test', // Duplicado de /api/test-auth
    '/api/reset-data' // Duplicado (ya existe)
];

/**
 * Middleware para redirigir endpoints en español
 */
function endpointRedirectMiddleware(req, res, next) {
    const originalPath = req.path;
    const originalMethod = req.method;
    
    // Verificar si es una solicitud que debe ser redirigida
    const redirectPath = SPANISH_TO_ENGLISH_ENDPOINTS[originalPath];
    
    if (redirectPath) {
        // Verificar si el endpoint de destino existe
        const targetExists = checkEndpointExists(redirectPath, originalMethod);
        
        if (targetExists) {
            console.log(`🔄 Redirigiendo endpoint español: ${originalPath} → ${redirectPath}`);
            
            // Si es una solicitud GET, hacer redirección HTTP 301
            if (originalMethod === 'GET') {
                return res.redirect(301, redirectPath);
            } else {
                // Para otros métodos, simplemente cambiar la ruta internamente
                req.originalUrl = req.originalUrl.replace(originalPath, redirectPath);
                req.url = req.url.replace(originalPath, redirectPath);
                return next();
            }
        } else {
            console.warn(`⚠️ Endpoint de destino no encontrado: ${redirectPath}`);
            return res.status(404).json({
                error: 'Endpoint no encontrado',
                original_path: originalPath,
                suggested_path: redirectPath
            });
        }
    }
    
    next();
}

/**
 * Verificar si un endpoint existe en el router
 * Esta es una implementación simplificada
 */
function checkEndpointExists(path, method) {
    // Para una implementación más robusta, se podría usar un sistema de registro
    // de endpoints o inspeccionar el router de Express
    return true; // Por ahora asumimos que todos los mapeados existen
}

/**
 * Middleware para detectar endpoints obsoletos
 */
function obsoleteEndpointMiddleware(req, res, next) {
    const originalPath = req.path;
    
    if (ENDPOINTS_TO_REMOVE.includes(originalPath)) {
        console.log(`🗑️ Endpoint obsoleto detectado: ${originalPath}`);
        return res.status(410).json({
            error: 'Endpoint obsoleto',
            message: 'Este endpoint ha sido eliminado. Por favor use el endpoint en inglés correspondiente.',
            original_path: originalPath,
            suggestion: getReplacementEndpoint(originalPath)
        });
    }
    
    next();
}

/**
 * Obtener el endpoint de reemplazo para un endpoint obsoleto
 */
function getReplacementEndpoint(obsoletePath) {
    switch (obsoletePath) {
        case '/api/auth-test':
            return '/api/test-auth';

        case '/api/reset-data':
            return '/api/reset-data'; // Ya está en inglés
        default:
            return null;
    }
}

module.exports = {
    endpointRedirectMiddleware,
    obsoleteEndpointMiddleware,
    SPANISH_TO_ENGLISH_ENDPOINTS,
    ENDPOINTS_TO_REMOVE
};