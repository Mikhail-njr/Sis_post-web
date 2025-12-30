const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Crea y retorna una conexión a la base de datos SQLite
 * @returns {sqlite3.Database} Instancia de la base de datos
 */
function createDatabaseConnection() {
    const dbPath = path.join(__dirname, '..', 'backend', 'pos_database.sqlite');
    return new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error conectando a SQLite:', err.message);
            throw err;
        }
        console.log('✅ Conectado a la base de datos');
    });
}

module.exports = {
    createDatabaseConnection
};