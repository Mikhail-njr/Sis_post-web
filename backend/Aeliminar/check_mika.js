const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM clientes WHERE nombre LIKE '%Mika%' OR nombre = 'Mika'", (err, rows) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    
    if (rows && rows.length > 0) {
        console.log('✅ Cliente "Mika" ENCONTRADO en la BD:');
        rows.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.nombre}`);
            console.log(`   ID: ${row.id}`);
            console.log(`   Teléfono: ${row.telefono}`);
            console.log(`   DNI: ${row.dni}`);
            console.log(`   Dirección: ${row.direccion}`);
            console.log(`   Nota: ${row.nota}`);
        });
    } else {
        console.log('❌ Cliente "Mika" NO ENCONTRADO en la BD');
    }
    
    db.close();
});
