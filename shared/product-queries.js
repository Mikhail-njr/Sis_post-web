/**
 * Utilidades compartidas para consultas de productos
 */

/**
 * Busca un producto por código de barras (consulta simple)
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {string} barcode - Código de barras a buscar
 * @returns {Promise<Object|null>} Producto encontrado o null
 */
function findProductByBarcodeSimple(db, barcode) {
    const query = `SELECT id, nombre, stock FROM productos WHERE codigo_barras = ?`;
    return new Promise((resolve, reject) => {
        db.get(query, [barcode], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

/**
 * Busca un producto por código de barras con información de promociones
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {string} barcode - Código de barras a buscar
 * @returns {Promise<Object|null>} Producto encontrado con promociones o null
 */
function findProductByBarcodeWithPromotions(db, barcode) {
    const query = `
        SELECT
            p.id, p.codigo, p.nombre, p.descripcion, p.precio, p.stock, p.categoria, p.codigo_barras,
            COALESCE(pi.descuento_porcentaje, 0) as descuento_porcentaje,
            CASE WHEN pi.descuento_porcentaje > 0 THEN 1 ELSE 0 END as en_promocion
        FROM productos p
        LEFT JOIN promocion_items pi ON p.id = pi.producto_id
        WHERE p.codigo_barras = ?
    `;
    return new Promise((resolve, reject) => {
        db.get(query, [barcode], (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

/**
 * Busca productos por nombre (búsqueda LIKE)
 * @param {sqlite3.Database} db - Instancia de la base de datos
 * @param {string} name - Nombre a buscar
 * @param {number} limit - Límite de resultados (default 10)
 * @returns {Promise<Array>} Array de productos encontrados
 */
function findProductsByName(db, name, limit = 10) {
    const query = `
        SELECT
            p.id, p.codigo, p.nombre, p.descripcion, p.precio, p.stock, p.categoria, p.activo, p.codigo_barras
        FROM productos p
        WHERE p.nombre LIKE ?
        LIMIT ?
    `;
    return new Promise((resolve, reject) => {
        db.all(query, [`%${name}%`, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

module.exports = {
    findProductByBarcodeSimple,
    findProductByBarcodeWithPromotions,
    findProductsByName
};