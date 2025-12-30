// Utilidades para manejo consistente de errores en el backend

/**
 * Maneja errores de forma consistente en rutas HTTP
 * @param {Error} error - El error que ocurrió
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} customMessage - Mensaje personalizado opcional
 * @param {number} statusCode - Código de estado HTTP (default: 500)
 */
function handleHttpError(error, res, customMessage = null, statusCode = 500) {
    console.error('❌ Error HTTP:', error);

    const errorMessage = customMessage || error.message || 'Error interno del servidor';

    res.status(statusCode).json({
        error: errorMessage,
        timestamp: new Date().toISOString()
    });
}

/**
 * Maneja errores en transacciones de base de datos
 * @param {Error} error - El error que ocurrió
 * @param {Function} dbRun - Función para ejecutar queries de rollback
 * @param {string} operation - Descripción de la operación que falló
 */
async function handleTransactionError(error, dbRun, operation = 'operación') {
    console.error(`❌ Error en transacción (${operation}):`, error);

    try {
        await dbRun("ROLLBACK");
        console.log('🔄 Rollback ejecutado correctamente');
    } catch (rollbackError) {
        console.error('❌ Error durante rollback:', rollbackError);
    }

    throw error; // Re-lanzar para que sea manejado por el caller
}

/**
 * Middleware para manejo global de errores
 */
function errorMiddleware(err, req, res, next) {
    console.error('💥 Error no manejado:', err);

    // No enviar respuesta si ya se envió
    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
}

/**
 * Valida parámetros requeridos y lanza error si faltan
 * @param {Object} params - Objeto con los parámetros a validar
 * @param {Array} required - Array con los nombres de parámetros requeridos
 * @throws {Error} Si falta algún parámetro requerido
 */
function validateRequired(params, required) {
    const missing = required.filter(key => !params[key] || params[key] === '');

    if (missing.length > 0) {
        throw new Error(`Los siguientes campos son requeridos: ${missing.join(', ')}`);
    }
}

/**
 * Crea respuesta de éxito estándar
 * @param {Object} res - Objeto de respuesta Express
 * @param {any} data - Datos a enviar
 * @param {string} message - Mensaje opcional
 * @param {number} statusCode - Código de estado (default: 200)
 */
function sendSuccess(res, data = null, message = 'Operación exitosa', statusCode = 200) {
    const response = {
        success: true,
        message,
        timestamp: new Date().toISOString()
    };

    if (data !== null) {
        response.data = data;
    }

    res.status(statusCode).json(response);
}

/**
 * Ejecuta una operación dentro de una transacción de base de datos
 * @param {Function} dbRun - Función para ejecutar queries
 * @param {Function} operation - Función asíncrona que contiene la operación a ejecutar
 * @param {string} operationName - Nombre de la operación para logging
 * @returns {Promise} Resultado de la operación
 */
async function executeInTransaction(dbRun, operation, operationName = 'operación') {
    await dbRun("BEGIN TRANSACTION");

    try {
        const result = await operation();
        await dbRun("COMMIT");
        console.log(`✅ Transacción completada: ${operationName}`);
        return result;
    } catch (error) {
        console.error(`❌ Error en transacción (${operationName}):`, error);
        await dbRun("ROLLBACK");
        console.log('🔄 Rollback ejecutado correctamente');
        throw error;
    }
}

/**
 * Wrapper para operaciones críticas que requieren rollback automático
 * @param {Function} dbRun - Función para ejecutar queries
 * @param {Function} operation - Función asíncrona que contiene la operación
 * @param {string} operationName - Nombre de la operación para logging
 * @returns {Promise} Resultado de la operación
 */
async function withTransaction(dbRun, operation, operationName = 'operación') {
    return executeInTransaction(dbRun, operation, operationName);
}

module.exports = {
    handleHttpError,
    handleTransactionError,
    errorMiddleware,
    validateRequired,
    sendSuccess,
    executeInTransaction,
    withTransaction
};