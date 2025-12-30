const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Testing simple search query for "Afna"...');

const query = `
    SELECT p.id, p.nombre, p.codigo
    FROM productos p
    WHERE p.activo = 1 AND (
        LOWER(p.nombre) LIKE LOWER(?) OR
        LOWER(p.codigo) LIKE LOWER(?)
    )
    ORDER BY p.nombre ASC
    LIMIT 50 OFFSET 0
`;

const params = ['%afna%', '%afna%'];

db.all(query, params, (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Results:', rows.length);
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Nombre: ${row.nombre}, Código: ${row.codigo}`);
        });
    }
    db.close();
});