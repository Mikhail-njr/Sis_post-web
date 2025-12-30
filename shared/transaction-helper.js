/**
 * Helper para manejo consistente de transacciones de base de datos
 * Sistema POS - Eliminación de código duplicado
 */

const { dbrun } = require('../backend/database-sqlite');

/**
 * Ejecuta una función dentro de una transacción de base de datos
 * @param {Function} callback - Función a ejecutar dentro de la transacción
 * @returns {Promise} Resultado de la función callback
 */
async function executeTransaction(callback) {
    await dbrun("begin transaction");
    try {
        const result = await callback();
        await dbrun("commit");
        return result;
    } catch (error) {
        await dbrun("rollback");
        throw error;
    }
}

/**
 * Ejecuta una función con manejo de rollback automático en caso de error
 * @param {Function} callback - Función a ejecutar
 * @returns {Promise} Resultado de la función callback
 */
async function withRollback(callback) {
    try {
        return await callback();
    } catch (error) {
        await dbrun("rollback");
        throw error;
    }
}

/**
 * Wrapper para operaciones críticas que requieren rollback automático
 * @param {Function} operation - Operación a ejecutar
 * @param {string} operationName - Nombre de la operación para logging
 * @returns {Promise} Resultado de la operación
 */
async function safeDatabaseOperation(operation, operationName = 'Database Operation') {
    console.log(`🔄 Iniciando ${operationName}...`);

    await dbrun("begin transaction");
    try {
        const result = await operation();
        await dbrun("commit");
        console.log(`✅ ${operationName} completada exitosamente`);
        return result;
    } catch (error) {
        await dbrun("rollback");
        console.error(`❌ Error en ${operationName}:`, error.message);
        throw error;
    }
}

module.exports = {
    executeTransaction,
    withRollback,
    safeDatabaseOperation
};