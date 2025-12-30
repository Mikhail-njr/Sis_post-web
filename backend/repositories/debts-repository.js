const Database = require('./database-sqlite');

/**
 * Clase para gestionar operaciones CRUD de deudas
 */
class DebtsRepository {
    constructor() {
        this.db = Database.getDB();
    }

    /**
     * Crear una nueva deuda con sus productos asociados
     * @param {Object} debtData - Datos de la deuda
     * @param {Array} products - Productos asociados a la deuda
     * @returns {Promise<Object>} - Deuda creada con productos
     */
    async createDebt(debtData, products) {
        return new Promise((resolve, reject) => {
            this.db.serialize(async () => {
                try {
                    // Iniciar transacción
                    this.db.run('BEGIN TRANSACTION');

                    // Insertar deuda
                    const debtInsertSql = `
                        INSERT INTO deudas (
                            cliente_id, monto_total, monto_pendiente, estado, 
                            fecha_vencimiento, descripcion, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const debtValues = [
                        debtData.cliente_id,
                        debtData.monto_total,
                        debtData.monto_pendiente,
                        debtData.estado || 'pendiente',
                        debtData.fecha_vencimiento,
                        debtData.descripcion || '',
                        new Date().toISOString(),
                        new Date().toISOString()
                    ];

                    this.db.run(debtInsertSql, debtValues, function(err) {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(err);
                        }

                        const debtId = this.lastID;

                        // Insertar productos asociados
                        if (products && products.length > 0) {
                            const productInsertSql = `
                                INSERT INTO deuda_productos (
                                    deuda_id, producto_id, cantidad, precio_unitario, 
                                    subtotal, precio_actual, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;

                            let insertedProducts = 0;
                            const totalProducts = products.length;

                            products.forEach((product, index) => {
                                const productValues = [
                                    debtId,
                                    product.producto_id,
                                    product.cantidad,
                                    product.precio_unitario,
                                    product.subtotal,
                                    product.precio_actual || product.precio_unitario,
                                    new Date().toISOString()
                                ];

                                this.db.run(productInsertSql, productValues, function(err) {
                                    if (err) {
                                        this.db.run('ROLLBACK');
                                        return reject(err);
                                    }

                                    insertedProducts++;

                                    if (insertedProducts === totalProducts) {
                                        // Confirmar transacción
                                        this.db.run('COMMIT', (err) => {
                                            if (err) {
                                                return reject(err);
                                            }

                                            // Obtener deuda creada con productos
                                            this.db.get(`
                                                SELECT d.*, c.nombre as cliente_nombre, c.telefono, c.dni, c.direccion
                                                FROM deudas d
                                                JOIN clientes c ON d.cliente_id = c.id
                                                WHERE d.id = ?
                                            `, [debtId], (err, debt) => {
                                                if (err) {
                                                    return reject(err);
                                                }

                                                this.db.all(`
                                                    SELECT dp.*, p.nombre as producto_nombre, p.codigo as producto_codigo
                                                    FROM deuda_productos dp
                                                    JOIN productos p ON dp.producto_id = p.id
                                                    WHERE dp.deuda_id = ?
                                                `, [debtId], (err, products) => {
                                                    if (err) {
                                                        return reject(err);
                                                    }

                                                    resolve({
                                                        ...debt,
                                                        productos: products
                                                    });
                                                });
                                            });
                                        });
                                    }
                                });
                            });
                        } else {
                            // Confirmar transacción sin productos
                            this.db.run('COMMIT', (err) => {
                                if (err) {
                                    return reject(err);
                                }

                                // Obtener deuda creada
                                this.db.get(`
                                    SELECT d.*, c.nombre as cliente_nombre, c.telefono, c.dni, c.direccion
                                    FROM deudas d
                                    JOIN clientes c ON d.cliente_id = c.id
                                    WHERE d.id = ?
                                `, [debtId], (err, debt) => {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve(debt);
                                });
                            });
                        }
                    });
                } catch (error) {
                    this.db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }

    /**
     * Obtener resumen de deudas por cliente
     * @returns {Promise<Array>} - Clientes con resumen de deudas
     */
    async getDebtsSummary() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.telefono,
                    c.dni,
                    c.direccion,
                    COALESCE(SUM(d.monto_pendiente), 0) as total_deuda,
                    COALESCE(SUM(CASE WHEN d.estado = 'pendiente' THEN d.monto_pendiente ELSE 0 END), 0) as deuda_pendiente,
                    COALESCE(SUM(CASE WHEN d.estado = 'vencida' THEN d.monto_pendiente ELSE 0 END), 0) as deuda_vencida,
                    COUNT(d.id) as cantidad_deudas
                FROM clientes c
                LEFT JOIN deudas d ON c.id = d.cliente_id AND d.monto_pendiente > 0
                GROUP BY c.id, c.nombre, c.telefono, c.dni, c.direccion
                HAVING total_deuda > 0
                ORDER BY total_deuda DESC
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    /**
     * Obtener deudas de un cliente específico con productos y precios actuales
     * @param {number} clienteId - ID del cliente
     * @returns {Promise<Array>} - Deudas con productos y precios actualizados
     */
    async getDebtsByClientWithProducts(clienteId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    d.id,
                    d.monto_total,
                    d.monto_pendiente,
                    d.estado,
                    d.fecha_creacion,
                    d.fecha_vencimiento,
                    d.descripcion,
                    dp.producto_id,
                    p.nombre as producto_nombre,
                    p.codigo as producto_codigo,
                    dp.cantidad,
                    dp.precio_unitario,
                    dp.subtotal,
                    p.precio as precio_actual
                FROM deudas d
                JOIN deuda_productos dp ON d.id = dp.deuda_id
                JOIN productos p ON dp.producto_id = p.id
                WHERE d.cliente_id = ? AND d.monto_pendiente > 0
                ORDER BY d.fecha_creacion DESC, dp.id
            `;

            this.db.all(sql, [clienteId], (err, rows) => {
                if (err) {
                    return reject(err);
                }

                // Agrupar productos por deuda
                const debtsMap = new Map();

                rows.forEach(row => {
                    if (!debtsMap.has(row.id)) {
                        debtsMap.set(row.id, {
                            id: row.id,
                            monto_total: row.monto_total,
                            monto_pendiente: row.monto_pendiente,
                            estado: row.estado,
                            fecha_creacion: row.fecha_creacion,
                            fecha_vencimiento: row.fecha_vencimiento,
                            descripcion: row.descripcion,
                            productos: []
                        });
                    }

                    debtsMap.get(row.id).productos.push({
                        producto_id: row.producto_id,
                        producto_nombre: row.producto_nombre,
                        producto_codigo: row.producto_codigo,
                        cantidad: row.cantidad,
                        precio_unitario: row.precio_unitario,
                        subtotal: row.subtotal,
                        precio_actual: row.precio_actual
                    });
                });

                resolve(Array.from(debtsMap.values()));
            });
        });
    }

    /**
     * Actualizar deudas de un cliente recalculando precios con valores actuales
     * @param {number} clienteId - ID del cliente
     * @returns {Promise<Object>} - Resultado de la actualización
     */
    async updateDebtsWithCurrentPrices(clienteId) {
        return new Promise((resolve, reject) => {
            this.db.serialize(async () => {
                try {
                    this.db.run('BEGIN TRANSACTION');

                    // Obtener deudas pendientes del cliente
                    const debtsSql = `
                        SELECT d.id, d.monto_total, d.monto_pendiente
                        FROM deudas d
                        WHERE d.cliente_id = ? AND d.monto_pendiente > 0
                    `;

                    this.db.all(debtsSql, [clienteId], (err, debts) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(err);
                        }

                        if (debts.length === 0) {
                            this.db.run('COMMIT');
                            return resolve({ updated: 0, message: 'No hay deudas para actualizar' });
                        }

                        let updatedCount = 0;
                        const totalDebts = debts.length;

                        debts.forEach((debt, index) => {
                            // Obtener productos de la deuda
                            this.db.all(`
                                SELECT dp.*, p.precio as precio_actual
                                FROM deuda_productos dp
                                JOIN productos p ON dp.producto_id = p.id
                                WHERE dp.deuda_id = ?
                            `, [debt.id], (err, products) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    return reject(err);
                                }

                                // Calcular nuevo monto basado en precios actuales
                                const nuevoMontoTotal = products.reduce((sum, p) => {
                                    return sum + (p.cantidad * p.precio_actual);
                                }, 0);

                                // Actualizar deuda con nuevo monto
                                this.db.run(`
                                    UPDATE deudas 
                                    SET monto_total = ?, monto_pendiente = ?, estado = ?,
                                        updated_at = ?
                                    WHERE id = ?
                                `, [
                                    nuevoMontoTotal,
                                    nuevoMontoTotal, // Si es cuenta corriente, el pendiente es el total
                                    this.calculateDebtStatus(nuevoMontoTotal),
                                    new Date().toISOString(),
                                    debt.id
                                ], (err) => {
                                    if (err) {
                                        this.db.run('ROLLBACK');
                                        return reject(err);
                                    }

                                    updatedCount++;

                                    // Actualizar precios en productos de deuda
                                    products.forEach((product, pIndex) => {
                                        this.db.run(`
                                            UPDATE deuda_productos 
                                            SET precio_actual = ?, subtotal = ?
                                            WHERE id = ?
                                        `, [
                                            product.precio_actual,
                                            product.cantidad * product.precio_actual,
                                            product.id
                                        ], (err) => {
                                            if (err) {
                                                this.db.run('ROLLBACK');
                                                return reject(err);
                                            }

                                            // Cuando se actualicen todos los productos de todas las deudas
                                            if (pIndex === products.length - 1 && updatedCount === totalDebts) {
                                                this.db.run('COMMIT', (err) => {
                                                    if (err) {
                                                        return reject(err);
                                                    }

                                                    resolve({
                                                        updated: updatedCount,
                                                        message: `Se actualizaron ${updatedCount} deudas con precios actuales`
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                } catch (error) {
                    this.db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }

    /**
     * Calcular estado de deuda basado en monto pendiente
     * @param {number} montoPendiente - Monto pendiente de la deuda
     * @returns {string} - Estado de la deuda
     */
    calculateDebtStatus(montoPendiente) {
        if (montoPendiente <= 0) return 'pagada';
        if (montoPendiente > 0) return 'pendiente';
        return 'pendiente';
    }

    /**
     * Verificar si existe un cliente
     * @param {number} clienteId - ID del cliente
     * @returns {Promise<boolean>} - True si existe
     */
    async clientExists(clienteId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id FROM clientes WHERE id = ?', [clienteId], (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            });
        });
    }

    /**
     * Verificar si existe un producto
     * @param {number} productoId - ID del producto
     * @returns {Promise<boolean>} - True si existe
     */
    async productExists(productoId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id FROM productos WHERE id = ?', [productoId], (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            });
        });
    }

    /**
     * Obtener cliente por ID
     * @param {number} clienteId - ID del cliente
     * @returns {Promise<Object|null>} - Datos del cliente
     */
    async getClientById(clienteId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM clientes WHERE id = ?', [clienteId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    /**
     * Obtener producto por ID
     * @param {number} productoId - ID del producto
     * @returns {Promise<Object|null>} - Datos del producto
     */
    async getProductById(productoId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM productos WHERE id = ?', [productoId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }
}

module.exports = DebtsRepository;