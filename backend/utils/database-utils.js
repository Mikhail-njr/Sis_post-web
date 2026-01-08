/**
 * Utilidades de Base de Datos para el Sistema POS
 * 
 * Este módulo centraliza todas las operaciones de base de datos
 * para eliminar el código repetido en múltiples archivos.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseUtils {
    constructor() {
        this.dbPath = path.join(__dirname, '../../backend/pos_database.sqlite');
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Error conectando a SQLite:', err.message);
                throw err;
            } else {
                console.log('✅ Conectado a la base de datos SQLite');
            }
        });
    }

    /**
     * Ejecuta una consulta SELECT y devuelve todas las filas
     * @param {string} query - Consulta SQL
     * @param {Array} params - Parámetros de la consulta
     * @returns {Promise<Array>} - Resultado de la consulta
     */
    async dbAll(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('❌ Error en consulta dbAll:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Ejecuta una consulta INSERT, UPDATE o DELETE
     * @param {string} query - Consulta SQL
     * @param {Array} params - Parámetros de la consulta
     * @returns {Promise<Object>} - Resultado con ID y cambios
     */
    async dbRun(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    console.error('❌ Error en consulta dbRun:', err.message);
                    reject(err);
                } else {
                    resolve({ 
                        id: this.lastID, 
                        changes: this.changes 
                    });
                }
            });
        });
    }

    /**
     * Ejecuta una consulta SELECT y devuelve una sola fila
     * @param {string} query - Consulta SQL
     * @param {Array} params - Parámetros de la consulta
     * @returns {Promise<Object>} - Primera fila del resultado
     */
    async dbGet(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    console.error('❌ Error en consulta dbGet:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Inicia una transacción
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        return new Promise((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Confirma una transacción
     * @returns {Promise<void>}
     */
    async commitTransaction() {
        return new Promise((resolve, reject) => {
            this.db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Revierte una transacción
     * @returns {Promise<void>}
     */
    async rollbackTransaction() {
        return new Promise((resolve, reject) => {
            this.db.run('ROLLBACK', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Verifica la integridad de la base de datos
     * @returns {Promise<string>} - Resultado de la verificación
     */
    async checkIntegrity() {
        const result = await this.dbAll('PRAGMA integrity_check');
        return result[0]['integrity_check'];
    }

    /**
     * Obtiene estadísticas de la base de datos
     * @returns {Promise<Object>} - Estadísticas de tablas
     */
    async getDatabaseStats() {
        const tables = ['clientes', 'productos', 'ventas', 'deudas'];
        const stats = {};

        for (const table of tables) {
            const result = await this.dbGet(`SELECT COUNT(*) as count FROM ${table}`);
            stats[table] = result.count;
        }

        return stats;
    }

    /**
     * Cierra la conexión a la base de datos
     */
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando la base de datos:', err.message);
            } else {
                console.log('✅ Conexión a la base de datos cerrada');
            }
        });
    }
}

// Exportar instancia única
module.exports = new DatabaseUtils();