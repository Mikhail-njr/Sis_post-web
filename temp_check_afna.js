const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking for products with "Afna"...');

db.all(`
    SELECT id, nombre, codigo, LOWER(nombre) as nombre_lower
    FROM productos
    WHERE LOWER(nombre) LIKE '%afna%' OR LOWER(codigo) LIKE '%afna%'
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Found products:', rows.length);
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Nombre: ${row.nombre}, Código: ${row.codigo}`);
        });
    }
    db.close();
});