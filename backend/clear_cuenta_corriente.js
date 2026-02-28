/**
 * Script para eliminar todos los datos de cuenta corriente
 * Esto incluye: deudas, productos de deudas, pagos de deudas
 * NO elimina los clientes, solo las cuentas corrientes
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🗑️  Iniciando limpieza de cuenta corriente...\n');

db.serialize(() => {
    // Iniciar transacción
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
            console.error('❌ Error iniciando transacción:', err.message);
            return;
        }
    });

    // 1. Eliminar pagos de deudas
    db.run('DELETE FROM pagos_deudas', function(err) {
        if (err) {
            console.error('❌ Error eliminando pagos_deudas:', err.message);
            db.run('ROLLBACK');
            return;
        }
        console.log(`✅ Eliminados ${this.changes} registros de pagos_deudas`);
    });

    // 2. Eliminar productos de deudas
    db.run('DELETE FROM deuda_productos', function(err) {
        if (err) {
            console.error('❌ Error eliminando deuda_productos:', err.message);
            db.run('ROLLBACK');
            return;
        }
        console.log(`✅ Eliminados ${this.changes} registros de deuda_productos`);
    });

    // 3. Eliminar deudas
    db.run('DELETE FROM deudas', function(err) {
        if (err) {
            console.error('❌ Error eliminando deudas:', err.message);
            db.run('ROLLBACK');
            return;
        }
        console.log(`✅ Eliminadas ${this.changes} deudas`);

        // Confirmar transacción
        db.run('COMMIT', (err) => {
            if (err) {
                console.error('❌ Error confirmando transacción:', err.message);
                return;
            }

            console.log('\n🎉 Limpieza completada exitosamente!');
            console.log('📊 Resumen:');
            console.log('   - Todos los datos de cuenta corriente eliminados');
            console.log('   - Los clientes NO fueron eliminados');

            db.close();
        });
    });
});
