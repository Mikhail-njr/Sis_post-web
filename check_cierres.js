// Script to check cash closures in database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        return;
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

db.all(`
    SELECT id, fecha, fecha_cierre, dinero_inicial, total_ventas, total_esperado, diferencia, cantidad_ventas, tipo_cierre, notas
    FROM cierres_caja
    ORDER BY fecha_cierre DESC, fecha DESC
`, [], (err, rows) => {
    if (err) {
        console.error('❌ Error consultando cierres:', err.message);
        return;
    }

    console.log(`📊 Total de cierres encontrados: ${rows.length}`);

    if (rows.length === 0) {
        console.log('⚠️ No hay cierres de caja registrados en la base de datos');
        console.log('💡 Esto explica por qué el historial no muestra cierres');
    } else {
        console.log('📋 Lista de cierres:');
        rows.forEach((cierre, index) => {
            console.log(`${index + 1}. ID: ${cierre.id}`);
            console.log(`   Fecha: ${cierre.fecha_cierre || cierre.fecha}`);
            console.log(`   Dinero Inicial: $${cierre.dinero_inicial}`);
            console.log(`   Total Ventas: $${cierre.total_ventas}`);
            console.log(`   Total Esperado: $${cierre.total_esperado}`);
            console.log(`   Diferencia: $${cierre.diferencia}`);
            console.log(`   Cantidad Ventas: ${cierre.cantidad_ventas}`);
            console.log(`   Tipo: ${cierre.tipo_cierre || 'normal'}`);
            if (cierre.notas) console.log(`   Notas: ${cierre.notas}`);
            console.log('---');
        });
    }

    db.close((err) => {
        if (err) {
            console.error('❌ Error cerrando DB:', err.message);
        } else {
            console.log('✅ Conexión cerrada');
        }
    });
});