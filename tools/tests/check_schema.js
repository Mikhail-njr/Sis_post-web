const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(productos)", (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('Productos table schema:');
    rows.forEach(row => {
        console.log(`${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? 'DEFAULT ' + row.dflt_value : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
    });

    db.close();
});