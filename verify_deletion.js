const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando eliminación del cliente ID 18...\n');

db.serialize(() => {
    // Verificar cliente
    db.get('SELECT id, nombre FROM clientes WHERE id = 18', (err, row) => {
        console.log('Cliente ID 18:', row ? '❌ AÚN EXISTE' : '✅ ELIMINADO');
    });

    // Verificar deudas
    db.get('SELECT COUNT(*) as count FROM deudas WHERE cliente_id = 18', (err, row) => {
        console.log('Deudas del cliente:', row.count === 0 ? '✅ ELIMINADAS' : `❌ ${row.count} RESTANTES`);
    });

    // Verificar cuenta corriente
    db.get('SELECT COUNT(*) as count FROM cuentas_corrientes WHERE cliente_id = 18', (err, row) => {
        console.log('Cuenta corriente:', row.count === 0 ? '✅ ELIMINADA' : `❌ ${row.count} RESTANTES`);
    });

    // Verificar movimientos
    db.get('SELECT COUNT(*) as count FROM movimientos_cuenta_corriente WHERE cuenta_corriente_id IN (SELECT id FROM cuentas_corrientes WHERE cliente_id = 18)', (err, row) => {
        console.log('Movimientos de cuenta corriente:', row.count === 0 ? '✅ ELIMINADOS' : `❌ ${row.count} RESTANTES`);
    });

    // Verificar productos de deuda
    db.get('SELECT COUNT(*) as count FROM deuda_productos WHERE deuda_id IN (SELECT id FROM deudas WHERE cliente_id = 18)', (err, row) => {
        console.log('Productos de deuda:', row.count === 0 ? '✅ ELIMINADOS' : `❌ ${row.count} RESTANTES`);
        db.close();
    });
});