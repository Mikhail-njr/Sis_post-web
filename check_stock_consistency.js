const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== VERIFICACIÓN DE CONSISTENCIA DE STOCK ===\n');

// Verificar si p.stock coincide con el stock calculado de lotes
db.all(`
    SELECT
        p.id,
        p.nombre,
        p.stock as stock_tabla,
        COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as stock_calculado,
        p.stock - COALESCE(SUM(CASE WHEN l.estado = 'activo' AND DATE(l.fecha_vencimiento) >= DATE('now', '-3 hours') THEN l.cantidad_actual ELSE 0 END), 0) as diferencia
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id
    GROUP BY p.id, p.nombre, p.stock
    HAVING stock_tabla != stock_calculado
    LIMIT 10
`, (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log(`Productos con stock inconsistente: ${rows.length}`);
    if (rows.length > 0) {
        rows.forEach(row => {
            console.log(`  ID ${row.id} (${row.nombre}): tabla=${row.stock_tabla}, calculado=${row.stock_calculado}, diff=${row.diferencia}`);
        });
    } else {
        console.log('  Todos los stocks son consistentes.');
    }

    // Verificar productos sin lotes pero con stock > 0
    db.all(`
        SELECT p.id, p.nombre, p.stock
        FROM productos p
        LEFT JOIN lotes l ON p.id = l.producto_id AND l.estado = 'activo'
        WHERE p.stock > 0 AND l.id IS NULL
        LIMIT 10
    `, (err, rows2) => {
        console.log(`\nProductos con stock en tabla pero sin lotes activos: ${rows2.length}`);
        if (rows2.length > 0) {
            rows2.forEach(row => {
                console.log(`  ID ${row.id} (${row.nombre}): stock=${row.stock}`);
            });
        }

        // Verificar productos con lotes pero stock = 0
        db.all(`
            SELECT
                p.id,
                p.nombre,
                p.stock,
                SUM(CASE WHEN l.estado = 'activo' AND l.cantidad_actual > 0 THEN l.cantidad_actual ELSE 0 END) as stock_lotes
            FROM productos p
            LEFT JOIN lotes l ON p.id = l.producto_id
            WHERE p.stock = 0
            GROUP BY p.id, p.nombre, p.stock
            HAVING stock_lotes > 0
            LIMIT 10
        `, (err, rows3) => {
            console.log(`\nProductos con stock=0 pero con lotes activos: ${rows3.length}`);
            if (rows3.length > 0) {
                rows3.forEach(row => {
                    console.log(`  ID ${row.id} (${row.nombre}): stock=${row.stock}, lotes=${row.stock_lotes}`);
                });
            }

            console.log('\n=== FIN DE VERIFICACIÓN ===');
            db.close();
        });
    });
});