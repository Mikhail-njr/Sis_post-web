/**
 * Middleware para manejo consistente de errores en respuestas API
 * Sistema POS - Eliminación de código duplicado
 */

/**
 * Maneja errores de API de forma consistente
 * @param {Object} res - Objeto response de Express
 * @param {Error} error - Error a manejar
 * @param {string} operation - Nombre de la operación para logging
 */
function handleApiError(res, error, operation = 'API Operation') {
    console.error(`❌ Error en ${operation}:`, error.message);

    // Log detallado para debugging
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack trace:', error.stack);
    }

    res.status(500).json({
        error: error.message,
        operation: operation,
        timestamp: new Date().toISOString()
    });
}

/**
 * Middleware de Express para manejo global de errores
 * @param {Error} err - Error capturado
 * @param {Object} req - Objeto request
 * @param {Object} res - Objeto response
 * @param {Function} next - Función next
 */
function globalErrorHandler(err, req, res, next) {
    console.error('🔥 Error global capturado:', err.message);

    if (process.env.NODE_ENV === 'development') {
        console.error('Stack completo:', err.stack);
    }

    // No enviar respuesta si ya se envió
    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Contacte al administrador',
        timestamp: new Date().toISOString()
    });
}

/**
 * Wrapper para rutas que necesitan manejo de errores consistente
 * @param {Function} handler - Función handler de la ruta
 * @param {string} operationName - Nombre de la operación
 * @returns {Function} Handler envuelto
 */
function withErrorHandling(handler, operationName = 'API Operation') {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            handleApiError(res, error, operationName);
        }
    };
}

/**
 * Valida parámetros requeridos en una solicitud
 * @param {Object} params - Parámetros a validar
 * @param {Array} required - Lista de parámetros requeridos
 * @throws {Error} Si falta algún parámetro requerido
 */
function validateRequiredParams(params, required) {
    const missing = required.filter(param => !params[param]);
    if (missing.length > 0) {
        throw new Error(`Parámetros requeridos faltantes: ${missing.join(', ')}`);
    }
}

/**
 * Crea un error personalizado para el POS
 * @param {string} message - Mensaje del error
 * @param {string} code - Código del error
 * @param {number} statusCode - Código HTTP
 * @returns {Error} Error personalizado
 */
function createPosError(message, code = 'POS_ERROR', statusCode = 500) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

module.exports = {
    handleApiError,
    globalErrorHandler,
    withErrorHandling,
    validateRequiredParams,
    createPosError
};