const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking FTS table for "Afna"...');

db.all(`
    SELECT rowid, *
    FROM productos_fts
    WHERE productos_fts MATCH 'afna* OR afna'
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('FTS matches:', rows.length);
        rows.forEach(row => {
            console.log('Row:', row);
        });
    }
    db.close();
});