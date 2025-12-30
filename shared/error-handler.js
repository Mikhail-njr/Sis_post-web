/**
 * Utilidades centralizadas de manejo de errores para el backend
 * Extraído de patrones duplicados en backend/server.js
 */

/**
 * Maneja errores de API y envía respuesta JSON estandarizada
 * @param {Error} error - El error capturado
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} customMessage - Mensaje personalizado opcional
 */
function handleApiError(error, res, customMessage = null) {
    console.error('API Error:', error);
    res.status(500).json({
        error: customMessage || error.message || 'Error interno del servidor'
    });
}

/**
 * Maneja errores de base de datos con rollback automático
 * @param {Error} error - El error capturado
 * @param {Function} dbrun - Función para ejecutar queries de base de datos
 * @param {Object} res - Objeto de respuesta Express (opcional)
 */
async function handleDatabaseError(error, dbrun, res = null) {
    console.error('Database Error:', error);

    try {
        await dbrun("ROLLBACK");
        console.log('Transacción revertida por error');
    } catch (rollbackError) {
        console.error('Error al hacer rollback:', rollbackError);
    }

    if (res) {
        res.status(500).json({
            error: error.message || 'Error en base de datos'
        });
    } else {
        throw error;
    }
}

/**
 * Wrapper para operaciones de base de datos con manejo automático de transacciones
 * @param {Function} dbrun - Función para ejecutar queries
 * @param {Function} operation - Función asíncrona que contiene la operación
 * @param {Object} res - Objeto de respuesta Express (opcional)
 * @returns {Promise} Resultado de la operación
 */
async function withTransaction(dbrun, operation, res = null) {
    try {
        await dbrun("BEGIN TRANSACTION");
        const result = await operation();
        await dbrun("COMMIT");
        return result;
    } catch (error) {
        await handleDatabaseError(error, dbrun, res);
    }
}

/**
 * Envía respuesta de éxito estandarizada
 * @param {Object} res - Objeto de respuesta Express
 * @param {Object} data - Datos a enviar
 * @param {string} message - Mensaje opcional
 */
function sendSuccess(res, data = {}, message = null) {
    res.json({
        success: true,
        ...data,
        ...(message && { message }),
        timestamp: new Date().toISOString()
    });
}

/**
 * Envía respuesta de error estandarizada
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP (default: 400)
 */
function sendError(res, message, statusCode = 400) {
    res.status(statusCode).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    handleApiError,
    handleDatabaseError,
    withTransaction,
    sendSuccess,
    sendError
};