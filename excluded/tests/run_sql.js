const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const sqlFile = path.join(__dirname, 'insert_products.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
    }
});

fs.readFile(sqlFile, 'utf8', (err, sql) => {
    if (err) {
        console.error('❌ Error leyendo archivo SQL:', err.message);
        db.close();
        process.exit(1);
    }

    // Ejecutar el SQL
    db.exec(sql, (err) => {
        if (err) {
            console.error('❌ Error ejecutando SQL:', err.message);
        } else {
            console.log('✅ SQL ejecutado exitosamente');
        }
        db.close();
    });
});