/**
 * Utilidades de Manejo de Errores para el Sistema POS
 * 
 * Este módulo centraliza el manejo de errores y respuestas HTTP
 * para eliminar el código repetido en múltiples archivos.
 */

class ErrorHandler {
    /**
     * Maneja respuestas HTTP y lanza errores estructurados
     * @param {Response} response - Respuesta HTTP
     * @returns {Promise<Object>} - Datos de la respuesta
     */
    static async handleApiResponse(response) {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return await response.json();
    }

    /**
     * Registra errores con contexto
     * @param {string} context - Contexto donde ocurrió el error
     * @param {Error} error - Error a registrar
     */
    static logError(context, error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ Error en ${context}:`, error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Crea un error estructurado
     * @param {string} type - Tipo de error
     * @param {string} message - Mensaje del error
     * @param {Object} details - Detalles adicionales del error
     * @returns {Error} - Error estructurado
     */
    static createError(type, message, details = {}) {
        const error = new Error(message);
        error.type = type;
        error.details = details;
        error.timestamp = new Date().toISOString();
        return error;
    }

    /**
     * Valida campos requeridos y lanza error si faltan
     * @param {Object} data - Datos a validar
     * @param {Array} requiredFields - Campos requeridos
     * @param {string} context - Contexto para el mensaje de error
     */
    static validateRequiredFields(data, requiredFields, context = 'datos') {
        const missingFields = [];
        
        requiredFields.forEach(field => {
            if (data[field] === null || data[field] === undefined || data[field] === '') {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            throw this.createError(
                'VALIDATION_ERROR',
                `Faltan campos requeridos en ${context}: ${missingFields.join(', ')}`
            );
        }
    }

    /**
     * Maneja errores de base de datos
     * @param {Error} error - Error de base de datos
     * @param {string} operation - Operación que falló
     * @returns {Error} - Error manejado
     */
    static handleDatabaseError(error, operation = 'operación') {
        let message = `Error en ${operation}: ${error.message}`;
        
        if (error.code === 'SQLITE_CONSTRAINT') {
            message = `Error de restricción en ${operation}: ${error.message}`;
        } else if (error.code === 'SQLITE_BUSY') {
            message = `Base de datos ocupada durante ${operation}`;
        } else if (error.code === 'SQLITE_CORRUPT') {
            message = `Base de datos corrupta durante ${operation}`;
        }
        
        return this.createError('DATABASE_ERROR', message, {
            code: error.code,
            errno: error.errno
        });
    }

    /**
     * Maneja errores de validación
     * @param {Array} validationErrors - Errores de validación
     * @param {string} context - Contexto de la validación
     * @returns {Error} - Error de validación
     */
    static handleValidationError(validationErrors, context = 'datos') {
        return this.createError('VALIDATION_ERROR', 
            `Errores de validación en ${context}: ${validationErrors.join(', ')}`
        );
    }

    /**
     * Maneja errores de autenticación
     * @param {string} message - Mensaje de error
     * @returns {Error} - Error de autenticación
     */
    static handleAuthError(message = 'Acceso no autorizado') {
        return this.createError('AUTH_ERROR', message);
    }

    /**
     * Maneja errores de recurso no encontrado
     * @param {string} resource - Tipo de recurso
     * @param {string|number} id - ID del recurso
     * @returns {Error} - Error de recurso no encontrado
     */
    static handleNotFoundError(resource, id) {
        return this.createError('NOT_FOUND_ERROR', 
            `${resource} con ID ${id} no encontrado`
        );
    }

    /**
     * Maneja errores de permisos
     * @param {string} action - Acción que requiere permisos
     * @param {string} role - Rol requerido
     * @returns {Error} - Error de permisos
     */
    static handlePermissionError(action, role) {
        return this.createError('PERMISSION_ERROR', 
            `No tiene permisos para realizar ${action}. Se requiere rol: ${role}`
        );
    }

    /**
     * Maneja errores de formato de datos
     * @param {string} field - Campo con formato incorrecto
     * @param {string} expectedFormat - Formato esperado
     * @returns {Error} - Error de formato
     */
    static handleFormatError(field, expectedFormat) {
        return this.createError('FORMAT_ERROR', 
            `Formato incorrecto para ${field}. Se espera: ${expectedFormat}`
        );
    }

    /**
     * Maneja errores de stock insuficiente
     * @param {string} productName - Nombre del producto
     * @param {number} requested - Cantidad solicitada
     * @param {number} available - Cantidad disponible
     * @returns {Error} - Error de stock
     */
    static handleStockError(productName, requested, available) {
        return this.createError('STOCK_ERROR', 
            `Stock insuficiente para ${productName}. Solicitado: ${requested}, Disponible: ${available}`
        );
    }

    /**
     * Maneja errores de conexión
     * @param {string} service - Servicio que falló
     * @returns {Error} - Error de conexión
     */
    static handleConnectionError(service) {
        return this.createError('CONNECTION_ERROR', 
            `No se pudo conectar al servicio: ${service}`
        );
    }

    /**
     * Maneja errores genéricos con formato consistente
     * @param {Error} error - Error original
     * @param {string} context - Contexto del error
     * @returns {Object} - Error formateado para respuesta HTTP
     */
    static formatErrorForResponse(error, context = 'operación') {
        const formattedError = {
            success: false,
            error: {
                message: error.message || 'Error desconocido',
                type: error.type || 'UNKNOWN_ERROR',
                timestamp: error.timestamp || new Date().toISOString(),
                context: context
            }
        };

        if (error.details) {
            formattedError.error.details = error.details;
        }

        return formattedError;
    }

    /**
     * Middleware para Express que maneja errores de manera consistente
     * @param {Error} error - Error capturado
     * @param {Object} req - Request de Express
     * @param {Object} res - Response de Express
     * @param {Function} next - Next de Express
     */
    static expressErrorHandler(error, req, res, next) {
        console.error(`Error en ${req.method} ${req.path}:`, error.message);
        
        const formattedError = this.formatErrorForResponse(error, `${req.method} ${req.path}`);
        
        const statusCode = error.statusCode || error.status || 500;
        res.status(statusCode).json(formattedError);
    }
}

module.exports = ErrorHandler;