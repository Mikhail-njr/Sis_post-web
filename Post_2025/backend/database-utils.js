/**
 * Utilidades de base de datos compartidas
 * Centraliza patrones comunes de transacciones y manejo de errores
 */

/**
 * Ejecuta una operación dentro de una transacción de base de datos
 * @param {Function} operation - Función asíncrona que contiene la operación
 * @returns {Promise} Resultado de la operación
 */
async function executeInTransaction(operation) {
    // Iniciar transacción
    await dbrun("BEGIN TRANSACTION");

    try {
        const result = await operation();

        // Confirmar transacción
        await dbrun("COMMIT");
        return result;

    } catch (error) {
        // Revertir transacción en caso de error
        await dbrun("ROLLBACK");
        throw error;
    }
}

/**
 * Helper simplificado para transacciones - alias de executeInTransaction
 * @param {Function} operation - Función asíncrona que contiene la operación
 * @returns {Promise} Resultado de la operación
 */
async function withTransaction(operation) {
    return executeInTransaction(operation);
}

/**
 * Patrón común de respuesta de error para Express
 * @param {object} res - Objeto response de Express
 * @param {Error} error - Error ocurrido
 */
function sendErrorResponse(res, error) {
    console.error('Error en operación:', error);
    res.status(500).json({
        error: error.message || 'Error interno del servidor'
    });
}

/**
 * Patrón común de respuesta exitosa para Express
 * @param {object} res - Objeto response de Express
 * @param {object} data - Datos a enviar
 * @param {number} status - Código de estado HTTP (default: 200)
 */
function sendSuccessResponse(res, data, status = 200) {
    res.status(status).json({
        success: true,
        ...data
    });
}

module.exports = {
    executeInTransaction,
    withTransaction,
    sendErrorResponse,
    sendSuccessResponse
};