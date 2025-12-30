/**
 * Utilidades compartidas para operaciones con lotes
 */

/**
 * Obtiene los lotes activos de un producto con estado de vencimiento
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {number} productId - ID del producto
 * @returns {Promise<Array>} Array de lotes
 */
function getLotesByProductId(db, productId) {
    const query = `
        SELECT
            l.id, l.numero_lote, l.fecha_vencimiento, l.cantidad_inicial, l.cantidad_actual,
            l.costo_unitario, l.notas, l.estado, l.fecha_ingreso,
            CASE
                WHEN DATE(l.fecha_vencimiento) < DATE('now', '-3 hours') THEN 'vencido'
                WHEN DATE(l.fecha_vencimiento) <= DATE('now', '+7 days', '-3 hours') THEN 'proximo_vencer'
                ELSE 'vigente'
            END as estado_vencimiento
        FROM lotes l
        WHERE l.producto_id = ? AND l.estado = 'activo'
        ORDER BY l.fecha_vencimiento ASC
    `;
    return new Promise((resolve, reject) => {
        db.all(query, [productId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Crea un nuevo lote para un producto
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {Object} loteData - Datos del lote
 * @param {number} loteData.producto_id - ID del producto
 * @param {string} loteData.numero_lote - Número del lote
 * @param {string} loteData.fecha_vencimiento - Fecha de vencimiento
 * @param {number} loteData.cantidad_inicial - Cantidad inicial
 * @param {number} loteData.cantidad_actual - Cantidad actual
 * @param {number} loteData.costo_unitario - Costo unitario
 * @param {string} loteData.notas - Notas
 * @returns {Promise<Object>} Resultado de la inserción
 */
function createLote(db, loteData) {
    const query = `
        INSERT INTO lotes (
            producto_id, numero_lote, fecha_vencimiento,
            cantidad_inicial, cantidad_actual, costo_unitario,
            notas, estado, fecha_ingreso
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', datetime('now'))
    `;
    return new Promise((resolve, reject) => {
        db.run(query, [
            loteData.producto_id,
            loteData.numero_lote,
            loteData.fecha_vencimiento,
            loteData.cantidad_inicial,
            loteData.cantidad_actual,
            loteData.costo_unitario,
            loteData.notas
        ], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

/**
 * Actualiza el stock de un producto
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {number} productId - ID del producto
 * @param {number} quantity - Cantidad a agregar (positiva) o restar (negativa)
 * @returns {Promise<Object>} Resultado de la actualización
 */
function updateProductStock(db, productId, quantity) {
    const query = `UPDATE productos SET stock = stock + ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.run(query, [quantity, productId], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

/**
 * Actualiza el lote actual de un producto
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {number} productId - ID del producto
 * @param {number} loteId - ID del lote actual
 * @returns {Promise<Object>} Resultado de la actualización
 */
function updateProductLoteActual(db, productId, loteId) {
    const query = `UPDATE productos SET lote_actual_id = ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.run(query, [loteId, productId], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

/**
 * Obtiene información de producto con lote actual (para verificación)
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {number} productId - ID del producto
 * @returns {Promise<Object|null>} Información del producto con lote
 */
function getProductWithLoteActual(db, productId) {
    const query = `
        SELECT
            p.nombre, p.stock, p.lote_actual_id,
            l.numero_lote, l.cantidad_actual, l.fecha_vencimiento
        FROM productos p
        LEFT JOIN lotes l ON p.lote_actual_id = l.id
        WHERE p.id = ?
    `;
    return new Promise((resolve, reject) => {
        db.get(query, [productId], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

module.exports = {
    getLotesByProductId,
    createLote,
    updateProductStock,
    updateProductLoteActual,
    getProductWithLoteActual
};