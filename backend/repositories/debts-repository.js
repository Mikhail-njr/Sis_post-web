const Database = require('../database-sqlite');

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
   * @returns {Promise} - Deuda creada con productos
   */
  async createDebt(debtData, products) {
    const db = this.db;

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        try {
          // Iniciar transacción
          db.run('BEGIN TRANSACTION');

          // Insertar deuda
          const debtInsertSql = `
            INSERT INTO deudas (
              cliente_id, monto_original, monto_pendiente, estado,
              fecha_vencimiento, descripcion, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const now = new Date().toISOString();

          const debtValues = [
            debtData.cliente_id,
            debtData.monto_original,
            debtData.monto_pendiente,
            debtData.estado || 'pendiente',
            debtData.fecha_vencimiento,
            debtData.descripcion || '',
            now,
            now
          ];

          db.run(debtInsertSql, debtValues, function (err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            const debtId = this.lastID; // this = statement de sqlite

            // Si hay productos asociados
            if (products && products.length > 0) {
              const productInsertSql = `
                INSERT INTO deuda_productos (
                  deuda_id, producto_id, cantidad, precio_unitario,
                  subtotal, precio_actual, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `;

              let insertedProducts = 0;
              const totalProducts = products.length;

              products.forEach((product) => {
                const productValues = [
                  debtId,
                  product.producto_id,
                  product.cantidad,
                  product.precio_unitario,
                  product.subtotal,
                  product.precio_actual || product.precio_unitario,
                  new Date().toISOString()
                ];

                db.run(productInsertSql, productValues, function (err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }

                  insertedProducts++;

                  if (insertedProducts === totalProducts) {
                    // Confirmar transacción
                    db.run('COMMIT', (err) => {
                      if (err) return reject(err);

                      // Obtener deuda creada con productos
                      db.get(
                        `
                          SELECT d.*, c.nombre as cliente_nombre, c.telefono, c.dni, c.direccion
                          FROM deudas d
                          JOIN clientes c ON d.cliente_id = c.id
                          WHERE d.id = ?
                        `,
                        [debtId],
                        (err, debt) => {
                          if (err) return reject(err);

                          db.all(
                            `
                              SELECT dp.*, p.nombre as producto_nombre, p.codigo as producto_codigo
                              FROM deuda_productos dp
                              JOIN productos p ON dp.producto_id = p.id
                              WHERE dp.deuda_id = ?
                            `,
                            [debtId],
                            (err, productsRows) => {
                              if (err) return reject(err);

                              resolve({
                                ...debt,
                                productos: productsRows
                              });
                            }
                          );
                        }
                      );
                    });
                  }
                });
              });
            } else {
              // Confirmar transacción sin productos
              db.run('COMMIT', (err) => {
                if (err) return reject(err);

                // Obtener deuda creada
                db.get(
                  `
                    SELECT d.*, c.nombre as cliente_nombre, c.telefono, c.dni, c.direccion
                    FROM deudas d
                    JOIN clientes c ON d.cliente_id = c.id
                    WHERE d.id = ?
                  `,
                  [debtId],
                  (err, debt) => {
                    if (err) return reject(err);
                    resolve(debt);
                  }
                );
              });
            }
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  /**
   * Obtener resumen de deudas por cliente
   * @returns {Promise} - Clientes con resumen de deudas
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
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /**
   * Obtener deudas de un cliente específico con productos y precios actuales
   * @param {number} clienteId - ID del cliente
   * @returns {Promise} - Deudas con productos y precios actualizados
   */
  async getDebtsByClientWithProducts(clienteId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          d.id,
          d.monto_original as monto_total,
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
        if (err) return reject(err);

        const debtsMap = new Map();

        rows.forEach((row) => {
          if (!debtsMap.has(row.id)) {
            debtsMap.set(row.id, {
              id: row.id,
              monto_original: row.monto_original || row.monto_total,
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
   * @returns {Promise} - Resultado de la actualización
   */
  async updateDebtsWithCurrentPrices(clienteId) {
    const db = this.db;

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        try {
          db.run('BEGIN TRANSACTION');

          const debtsSql = `
            SELECT d.id, d.monto_original as monto_total, d.monto_pendiente
            FROM deudas d
            WHERE d.cliente_id = ? AND d.monto_pendiente > 0
          `;

          db.all(debtsSql, [clienteId], (err, debts) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }

            if (!debts || debts.length === 0) {
              db.run('COMMIT');
              return resolve({ updated: 0, message: 'No hay deudas para actualizar' });
            }

            let updatedCount = 0;
            const totalDebts = debts.length;

            debts.forEach((debt) => {
              db.all(
                `
                  SELECT dp.*, p.precio as precio_actual
                  FROM deuda_productos dp
                  JOIN productos p ON dp.producto_id = p.id
                  WHERE dp.deuda_id = ?
                `,
                [debt.id],
                (err, products) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }

                  const nuevoMontoTotal = products.reduce((sum, p) => {
                    return sum + p.cantidad * p.precio_actual;
                  }, 0);

                  db.run(
                    `
                      UPDATE deudas
                      SET monto_original = ?, monto_pendiente = ?, estado = ?, updated_at = ?
                      WHERE id = ?
                    `,
                    [
                      nuevoMontoTotal,
                      nuevoMontoTotal,
                      this.calculateDebtStatus(nuevoMontoTotal),
                      new Date().toISOString(),
                      debt.id
                    ],
                    (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                      }

                      let updatedProducts = 0;
                      const totalProducts = products.length;

                      products.forEach((product) => {
                        db.run(
                          `
                            UPDATE deuda_productos
                            SET precio_actual = ?, subtotal = ?
                            WHERE id = ?
                          `,
                          [
                            product.precio_actual,
                            product.cantidad * product.precio_actual,
                            product.id
                          ],
                          (err) => {
                            if (err) {
                              db.run('ROLLBACK');
                              return reject(err);
                            }

                            updatedProducts++;

                            if (
                              updatedProducts === totalProducts
                            ) {
                              updatedCount++;

                              if (updatedCount === totalDebts) {
                                db.run('COMMIT', (err) => {
                                  if (err) return reject(err);
                                  resolve({
                                    updated: updatedCount,
                                    message: `Se actualizaron ${updatedCount} deudas con precios actuales`
                                  });
                                });
                              }
                            }
                          }
                        );
                      });
                    }
                  );
                }
              );
            });
          });
        } catch (error) {
          db.run('ROLLBACK');
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
   * @returns {Promise} - True si existe
   */
  async clientExists(clienteId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM clientes WHERE id = ?',
        [clienteId],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  /**
   * Verificar si existe un producto
   * @param {number} productoId - ID del producto
   * @returns {Promise} - True si existe
   */
  async productExists(productoId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM productos WHERE id = ?',
        [productoId],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  /**
   * Obtener cliente por ID
   * @param {number} clienteId - ID del cliente
   * @returns {Promise} - Datos del cliente
   */
  async getClientById(clienteId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM clientes WHERE id = ?',
        [clienteId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Obtener producto por ID
   * @param {number} productoId - ID del producto
   * @returns {Promise} - Datos del producto
   */
  async getProductById(productoId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM productos WHERE id = ?',
        [productoId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Eliminar todas las deudas de un cliente (borrado completo)
   * @param {number} clienteId - ID del cliente
   * @returns {Promise} - Resultado de la operación
   */
  async clearAllDebts(clienteId) {
    const db = this.db;
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        try {
          db.run('BEGIN TRANSACTION');
          
          // Primero obtener las deudas actuales para reporte
          const selectSql = `
            SELECT id, monto_original, monto_pendiente 
            FROM deudas 
            WHERE cliente_id = ?
          `;
          
          db.all(selectSql, [clienteId], (err, debts) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            if (!debts || debts.length === 0) {
              db.run('COMMIT');
              return resolve({ cleared: 0, totalAmount: 0, message: 'No hay deudas para eliminar' });
            }
            
            const totalAmount = debts.reduce((sum, d) => sum + (d.monto_pendiente || 0), 0);
            const debtIds = debts.map(d => d.id);
            
            // Eliminar productos de las deudas primero
            const deleteProductsSql = `
              DELETE FROM deuda_productos 
              WHERE deuda_id IN (${debtIds.map(() => '?').join(',')})
            `;
            
            db.run(deleteProductsSql, debtIds, (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              
              // Eliminar las deudas
              const deleteDebtsSql = `DELETE FROM deudas WHERE cliente_id = ?`;
              
              db.run(deleteDebtsSql, [clienteId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                
                db.run('COMMIT', (err) => {
                  if (err) return reject(err);
                  resolve({
                    cleared: debtIds.length,
                    totalAmount: totalAmount,
                    message: `Se eliminaron ${debtIds.length} deudas por un total de ${totalAmount.toFixed(2)}`
                  });
                });
              });
            });
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  /**
   * Registrar un pago para una deuda específica
   * @param {number} deudaId - ID de la deuda
   * @param {number} monto - Monto del pago
   * @param {string} descripcion - Descripción opcional del pago
   * @returns {Promise} - Deuda actualizada y registro del pago
   */
  async registerPayment(deudaId, monto, descripcion = '') {
    const db = this.db;

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        try {
          db.run('BEGIN TRANSACTION');

          // Verificar que la deuda existe y obtener datos actuales
          db.get(
            'SELECT * FROM deudas WHERE id = ?',
            [deudaId],
            (err, debt) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }

              if (!debt) {
                db.run('ROLLBACK');
                return reject(new Error('Deuda no encontrada'));
              }

              // Verificar estado actual
              if (debt.estado !== 'pendiente' && debt.estado !== 'vencida') {
                db.run('ROLLBACK');
                return reject(new Error('Solo se pueden registrar pagos en deudas pendientes o vencidas'));
              }

              // Calcular el monto actual basado en precio actual del producto × cantidad
              // Unimos con la tabla productos para obtener el precio vigente
              db.all(
                `SELECT dp.cantidad, p.precio as precio_producto 
                 FROM deuda_productos dp 
                 JOIN productos p ON dp.producto_id = p.id 
                 WHERE dp.deuda_id = ?`,
                [deudaId],
                (err, productos) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }

                  // Calcular total actual: suma de (precio actual del producto × cantidad)
                  const montoActualCalculado = productos.reduce((sum, p) => {
                    return sum + (parseFloat(p.precio_producto || 0) * parseFloat(p.cantidad || 0));
                  }, 0);

                  // Obtener total de pagos ya realizados
                  db.all(
                    `SELECT COALESCE(SUM(monto), 0) as total_pagado FROM pagos_deudas WHERE deuda_id = ?`,
                    [deudaId],
                    (err, pagosResult) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                      }

                      const totalPagado = parseFloat(pagosResult[0]?.total_pagado || 0);
                      const montoPendienteActual = parseFloat((montoActualCalculado - totalPagado).toFixed(2));

                      // Verificar que el monto no exceda el pendiente (basado en precios actuales)
                      if (monto > montoPendienteActual) {
                        db.run('ROLLBACK');
                        return reject(new Error(`El monto del pago (${monto}) no puede ser mayor al monto pendiente (${montoPendienteActual})`));
                      }

                      // Calcular nuevo monto pendiente
                      const nuevoMontoPendiente = parseFloat((montoPendienteActual - monto).toFixed(2));
                      const nuevoEstado = nuevoMontoPendiente === 0 ? 'pagada' : 'pendiente';

                      // Actualizar la deuda
                      db.run(
                        'UPDATE deudas SET monto_pendiente = ?, estado = ?, updated_at = ? WHERE id = ?',
                        [nuevoMontoPendiente, nuevoEstado, new Date().toISOString(), deudaId],
                        (err) => {
                          if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                          }

                          // Registrar el pago en el historial
                          const descripcionPago = descripcion || `Pago registrado - Monto pendiente restante: ${nuevoMontoPendiente.toFixed(2)}`;
                          db.run(
                            'INSERT INTO pagos_deudas (deuda_id, monto, descripcion) VALUES (?, ?, ?)',
                            [deudaId, monto, descripcionPago],
                            (err) => {
                              if (err) {
                                db.run('ROLLBACK');
                                return reject(err);
                              }

                              // Confirmar transacción
                              db.run('COMMIT', (err) => {
                                if (err) return reject(err);

                                // Obtener la deuda actualizada
                                db.get(
                                  'SELECT * FROM deudas WHERE id = ?',
                                  [deudaId],
                                  (err, updatedDebt) => {
                                    if (err) return reject(err);

                                    resolve({
                                      success: true,
                                      debt: updatedDebt,
                                      pago: {
                                        monto: monto,
                                        restante: nuevoMontoPendiente,
                                        completado: nuevoMontoPendiente === 0
                                      }
                                    });
                                  }
                                );
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  /**
   * Obtener historial de pagos de una deuda específica
   * @param {number} deudaId - ID de la deuda
   * @returns {Promise} - Array de pagos realizados
   */
  async getPaymentHistory(deudaId) {
    return new Promise((resolve, reject) => {
      // Verificar que la deuda existe
      this.db.get(
        'SELECT id FROM deudas WHERE id = ?',
        [deudaId],
        (err, debt) => {
          if (err) return reject(err);
          if (!debt) return reject(new Error('Deuda no encontrada'));

          // Obtener historial de pagos
          const sql = `
            SELECT
              id,
              deuda_id,
              monto,
              fecha_pago,
              descripcion,
              created_at
            FROM pagos_deudas
            WHERE deuda_id = ?
            ORDER BY fecha_pago DESC, created_at DESC
          `;

          this.db.all(sql, [deudaId], (err, payments) => {
            if (err) return reject(err);
            resolve(payments || []);
          });
        }
      );
    });
  }

  /**
   * Obtener clientes con cuenta corriente (deudas pendientes)
   * @returns {Promise} - Clientes con saldo pendiente
   */
  async getCustomersWithCredit() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT
          c.id,
          c.nombre,
          c.telefono,
          c.dni,
          COALESCE(SUM(d.monto_pendiente), 0) as saldo_pendiente,
          COUNT(d.id) as cantidad_deudas
        FROM clientes c
        LEFT JOIN deudas d ON c.id = d.cliente_id AND d.estado = 'pendiente' AND d.monto_pendiente > 0
        GROUP BY c.id, c.nombre, c.telefono, c.dni
        HAVING saldo_pendiente > 0 OR cantidad_deudas > 0
        ORDER BY saldo_pendiente DESC, c.nombre ASC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
}

module.exports = DebtsRepository;
