const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const sqlPath = path.join(__dirname, 'backend', 'add_cliente_id_to_ventas.sql');

const db = new sqlite3.Database(dbPath);

fs.readFile(sqlPath, 'utf8', (err, sql) => {
    if (err) {
        console.error('Error reading SQL file:', err);
        return;
    }

    db.run(sql, (err) => {
        if (err) {
            console.error('Error executing SQL:', err);
            return;
        }
        console.log('SQL executed successfully');
        db.close();
    });
});