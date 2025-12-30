/**
 * Middleware para respuestas HTTP estándar
 * Reduce duplicación en el manejo de respuestas
 */

/**
 * Respuesta de éxito estándar
 * @param {Object} res - Response object
 * @param {Object} data - Datos a enviar
 * @param {number} statusCode - Código de estado HTTP (default: 200)
 */
function sendSuccess(res, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        ...data
    });
}

/**
 * Respuesta de error estándar
 * @param {Object} res - Response object
 * @param {string|Error} error - Error message or Error object
 * @param {number} statusCode - Código de estado HTTP (default: 500)
 */
function sendError(res, error, statusCode = 500) {
    const message = error instanceof Error ? error.message : error;
    return res.status(statusCode).json({
        success: false,
        error: message
    });
}

/**
 * Respuesta de error interno del servidor (500)
 * @param {Object} res - Response object
 * @param {string|Error} error - Error message or Error object
 */
function sendServerError(res, error) {
    return sendError(res, error, 500);
}

/**
 * Respuesta de no encontrado (404)
 * @param {Object} res - Response object
 * @param {string} message - Mensaje personalizado (default: 'Recurso no encontrado')
 */
function sendNotFound(res, message = 'Recurso no encontrado') {
    return sendError(res, message, 404);
}

/**
 * Respuesta de solicitud incorrecta (400)
 * @param {Object} res - Response object
 * @param {string} message - Mensaje de error
 */
function sendBadRequest(res, message) {
    return sendError(res, message, 400);
}

/**
 * Respuesta de no autorizado (401)
 * @param {Object} res - Response object
 * @param {string} message - Mensaje de error (default: 'No autorizado')
 */
function sendUnauthorized(res, message = 'No autorizado') {
    return sendError(res, message, 401);
}

/**
 * Respuesta de prohibido (403)
 * @param {Object} res - Response object
 * @param {string} message - Mensaje de error (default: 'Acceso prohibido')
 */
function sendForbidden(res, message = 'Acceso prohibido') {
    return sendError(res, message, 403);
}

/**
 * Respuesta de conflicto (409)
 * @param {Object} res - Response object
 * @param {string} message - Mensaje de error
 */
function sendConflict(res, message) {
    return sendError(res, message, 409);
}

/**
 * Middleware para manejar errores de manera consistente
 * Envuelve funciones async y maneja errores automáticamente
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(error => {
            console.error('Error en ruta:', error);
            sendServerError(res, error);
        });
    };
}

/**
 * Middleware para validar que los campos requeridos estén presentes
 * @param {Array} requiredFields - Campos requeridos
 */
function validateRequired(requiredFields) {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            return sendBadRequest(res, `Campos requeridos faltantes: ${missingFields.join(', ')}`);
        }

        next();
    };
}

/**
 * Respuesta de creación exitosa (201)
 * @param {Object} res - Response object
 * @param {Object} data - Datos del recurso creado
 */
function sendCreated(res, data = {}) {
    return sendSuccess(res, data, 201);
}

/**
 * Respuesta de actualización exitosa (200)
 * @param {Object} res - Response object
 * @param {Object} data - Datos actualizados
 */
function sendUpdated(res, data = {}) {
    return sendSuccess(res, data, 200);
}

/**
 * Respuesta de eliminación exitosa (200)
 * @param {Object} res - Response object
 * @param {Object} data - Datos adicionales
 */
function sendDeleted(res, data = {}) {
    return sendSuccess(res, { message: 'Eliminado exitosamente', ...data }, 200);
}

/**
 * Respuesta de lista paginada
 * @param {Object} res - Response object
 * @param {Array} items - Items de la lista
 * @param {Object} pagination - Información de paginación
 */
function sendPaginated(res, items, pagination = {}) {
    return sendSuccess(res, {
        items,
        pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || items.length,
            total: pagination.total || items.length,
            ...pagination
        }
    });
}

module.exports = {
    sendSuccess,
    sendError,
    sendServerError,
    sendNotFound,
    sendBadRequest,
    sendUnauthorized,
    sendForbidden,
    sendConflict,
    sendCreated,
    sendUpdated,
    sendDeleted,
    sendPaginated,
    asyncHandler,
    validateRequired
};