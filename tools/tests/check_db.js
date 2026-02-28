// Script para verificar las tablas en la base de datos
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'backend', 'pos_database.sqlite');

const db = new sqlite3.Database(DB_PATH);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Tablas en la base de datos:');
        rows.forEach(row => {
            console.log('-', row.name);
        });
    }
    db.close();
});