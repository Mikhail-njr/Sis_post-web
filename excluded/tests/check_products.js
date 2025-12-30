const db = require('./database-sqlite.js').getDB();

db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log(`Total de productos en la base de datos: ${row.count}`);

    // Mostrar algunos productos de ejemplo
    db.all("SELECT codigo, nombre, categoria, stock FROM productos LIMIT 10", (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('\nPrimeros 10 productos:');
            rows.forEach(row => {
                console.log(`${row.codigo}: ${row.nombre} (${row.categoria}) - Stock: ${row.stock}`);
            });
        }
        db.close();
    });
});