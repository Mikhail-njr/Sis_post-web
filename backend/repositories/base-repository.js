/**
 * Repositorio base para operaciones de base de datos
 * Implementa el patrón Repository para centralizar operaciones CRUD
 */

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }

    /**
     * Ejecuta una consulta SELECT
     */
    async find(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Ejecuta una consulta SELECT que retorna una fila
     */
    async findOne(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Ejecuta una consulta INSERT, UPDATE, DELETE
     */
    async execute(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes, lastID: this.lastID });
            });
        });
    }

    /**
     * Encuentra todos los registros
     */
    async findAll() {
        return this.find(`SELECT * FROM ${this.tableName}`);
    }

    /**
     * Encuentra por ID
     */
    async findById(id) {
        return this.findOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    }

    /**
     * Crea un nuevo registro
     */
    async create(data) {
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => data[col]);

        const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        return this.execute(sql, values);
    }

    /**
     * Actualiza un registro por ID
     */
    async update(id, data) {
        const columns = Object.keys(data);
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const values = [...columns.map(col => data[col]), id];

        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
        return this.execute(sql, values);
    }

    /**
     * Elimina un registro por ID
     */
    async delete(id) {
        return this.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    }

    /**
     * Cuenta registros
     */
    async count(whereClause = '', params = []) {
        const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
        const result = await this.findOne(sql, params);
        return result ? result.count : 0;
    }
}

module.exports = { BaseRepository };