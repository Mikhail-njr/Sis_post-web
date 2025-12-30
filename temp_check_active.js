const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking if Afna product is active...');

db.all(`
    SELECT id, nombre, codigo, activo
    FROM productos
    WHERE id = 405
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Product status:', rows);
    }
    db.close();
});