const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
    }
});

// Función para hacer queries más fácil
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

async function limpiarDatosHuerfanos() {
    try {
        console.log('\n🧹 LIMPIEZA DE DATOS HUÉRFANOS - CLIENTES Y CUENTA CORRIENTE\n');
        console.log('=' .repeat(70));

        // Verificar estado de claves foráneas
        const fkStatus = await dbAll("PRAGMA foreign_keys");
        console.log(`🔒 Estado actual de foreign_keys: ${fkStatus[0].foreign_keys ? 'HABILITADO' : 'DESHABILITADO'}`);

        // Confirmación antes de proceder
        console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará datos inconsistentes permanentemente.');
        console.log('   Asegúrate de tener un respaldo de la base de datos antes de continuar.');
        console.log('   ¿Deseas proceder con la limpieza? (s/n)');

        // Simular confirmación para este script automatizado
        const proceder = true; // Cambiar a false para requerir confirmación manual

        if (!proceder) {
            console.log('   ❌ Operación cancelada por el usuario');
            return;
        }

        console.log('   ✅ Procediendo con la limpieza...\n');

        // 1. Eliminar productos de deuda huérfanos (deuda_id no existe)
        console.log('1. 🗑️ Eliminando productos de deuda huérfanos...');
        const productosHuerfanos = await dbAll(`
            SELECT dp.id, dp.deuda_id
            FROM deuda_productos dp
            LEFT JOIN deudas d ON dp.deuda_id = d.id
            WHERE d.id IS NULL
        `);

        if (productosHuerfanos.length > 0) {
            console.log(`   Encontrados ${productosHuerfanos.length} productos huérfanos`);
            await dbRun("DELETE FROM deuda_productos WHERE deuda_id NOT IN (SELECT id FROM deudas)");
            console.log('   ✅ Productos de deuda huérfanos eliminados');
        } else {
            console.log('   ℹ️ No se encontraron productos de deuda huérfanos');
        }

        // 2. Eliminar deudas huérfanas (cliente_id no existe)
        console.log('\n2. 🗑️ Eliminando deudas huérfanas...');
        const deudasHuerfanas = await dbAll(`
            SELECT d.id, d.cliente_id, d.venta_id
            FROM deudas d
            LEFT JOIN clientes c ON d.cliente_id = c.id
            WHERE c.id IS NULL
        `);

        if (deudasHuerfanas.length > 0) {
            console.log(`   Encontradas ${deudasHuerfanas.length} deudas huérfanas`);
            console.log('   Detalles de deudas a eliminar:');
            deudasHuerfanas.forEach((deuda, index) => {
                console.log(`     ${index + 1}. ID: ${deuda.id}, Cliente: ${deuda.cliente_id}, Venta: ${deuda.venta_id}`);
            });

            // Eliminar productos de deuda primero
            await dbRun("DELETE FROM deuda_productos WHERE deuda_id IN (SELECT id FROM deudas WHERE cliente_id NOT IN (SELECT id FROM clientes))");

            // Eliminar deudas huérfanas
            await dbRun("DELETE FROM deudas WHERE cliente_id NOT IN (SELECT id FROM clientes)");
            console.log('   ✅ Deudas huérfanas eliminadas');
        } else {
            console.log('   ℹ️ No se encontraron deudas huérfanas');
        }

        // 3. Eliminar cuentas corrientes huérfanas (cliente_id no existe)
        console.log('\n3. 🗑️ Eliminando cuentas corrientes huérfanas...');
        const cuentasHuerfanas = await dbAll(`
            SELECT cc.id, cc.cliente_id, cc.saldo
            FROM cuentas_corrientes cc
            LEFT JOIN clientes c ON cc.cliente_id = c.id
            WHERE c.id IS NULL
        `);

        if (cuentasHuerfanas.length > 0) {
            console.log(`   Encontradas ${cuentasHuerfanas.length} cuentas huérfanas`);
            console.log('   Detalles de cuentas a eliminar:');
            cuentasHuerfanas.forEach((cuenta, index) => {
                console.log(`     ${index + 1}. ID: ${cuenta.id}, Cliente: ${cuenta.cliente_id}, Saldo: $${cuenta.saldo}`);
            });

            // Eliminar movimientos primero
            await dbRun("DELETE FROM movimientos_cuenta_corriente WHERE cuenta_corriente_id IN (SELECT id FROM cuentas_corrientes WHERE cliente_id NOT IN (SELECT id FROM clientes))");

            // Eliminar cuentas huérfanas
            await dbRun("DELETE FROM cuentas_corrientes WHERE cliente_id NOT IN (SELECT id FROM clientes)");
            console.log('   ✅ Cuentas corrientes huérfanas eliminadas');
        } else {
            console.log('   ℹ️ No se encontraron cuentas corrientes huérfanas');
        }

        // 4. Verificar movimientos huérfanos (cuenta_corriente_id no existe)
        console.log('\n4. 🗑️ Verificando movimientos huérfanos...');
        const movimientosHuerfanos = await dbAll(`
            SELECT mcc.id, mcc.cuenta_corriente_id
            FROM movimientos_cuenta_corriente mcc
            LEFT JOIN cuentas_corrientes cc ON mcc.cuenta_corriente_id = cc.id
            WHERE cc.id IS NULL
        `);

        if (movimientosHuerfanos.length > 0) {
            console.log(`   Encontrados ${movimientosHuerfanos.length} movimientos huérfanos`);
            await dbRun("DELETE FROM movimientos_cuenta_corriente WHERE cuenta_corriente_id NOT IN (SELECT id FROM cuentas_corrientes)");
            console.log('   ✅ Movimientos huérfanos eliminados');
        } else {
            console.log('   ℹ️ No se encontraron movimientos huérfanos');
        }

        // 5. Verificar deudas sin productos asociados (pueden ser válidas, pero las reportamos)
        console.log('\n5. 📋 Verificando deudas sin productos asociados...');
        const deudasSinProductos = await dbAll(`
            SELECT d.id, d.cliente_id, d.venta_id, d.monto_original, c.nombre as cliente_nombre
            FROM deudas d
            LEFT JOIN clientes c ON d.cliente_id = c.id
            LEFT JOIN deuda_productos dp ON d.id = dp.deuda_id
            WHERE dp.deuda_id IS NULL
        `);

        if (deudasSinProductos.length > 0) {
            console.log(`   Encontradas ${deudasSinProductos.length} deudas sin productos`);
            console.log('   Estas deudas pueden ser válidas (por ejemplo, deudas manuales)');
            console.log('   Detalles:');
            deudasSinProductos.forEach((deuda, index) => {
                console.log(`     ${index + 1}. ID: ${deuda.id}, Cliente: ${deuda.cliente_nombre || 'DESCONOCIDO'}, Venta: ${deuda.venta_id}, Monto: $${deuda.monto_original}`);
            });
        } else {
            console.log('   ✅ No se encontraron deudas sin productos');
        }

        // 6. Verificación final
        console.log('\n✅ VERIFICACIÓN FINAL');
        console.log('-' .repeat(40));

        const verificacionFinal = await dbAll(`
            SELECT
                (SELECT COUNT(*) FROM deudas d LEFT JOIN clientes c ON d.cliente_id = c.id WHERE c.id IS NULL) as deudas_huerfanas,
                (SELECT COUNT(*) FROM cuentas_corrientes cc LEFT JOIN clientes c ON cc.cliente_id = c.id WHERE c.id IS NULL) as cuentas_huerfanas,
                (SELECT COUNT(*) FROM movimientos_cuenta_corriente mcc LEFT JOIN cuentas_corrientes cc ON mcc.cuenta_corriente_id = cc.id WHERE cc.id IS NULL) as movimientos_huerfanos,
                (SELECT COUNT(*) FROM deuda_productos dp LEFT JOIN deudas d ON dp.deuda_id = d.id WHERE d.id IS NULL) as productos_huerfanos
        `);

        const final = verificacionFinal[0];
        console.log(`   Deudas huérfanas: ${final.deudas_huerfanas}`);
        console.log(`   Cuentas corrientes huérfanas: ${final.cuentas_huerfanas}`);
        console.log(`   Movimientos huérfanos: ${final.movimientos_huerfanos}`);
        console.log(`   Productos de deuda huérfanos: ${final.productos_huerfanos}`);

        const totalHuerfanos = final.deudas_huerfanas + final.cuentas_huerfanas + final.movimientos_huerfanos + final.productos_huerfanos;

        if (totalHuerfanos === 0) {
            console.log('\n🎉 ¡LIMPIEZA COMPLETA EXITOSA!');
            console.log('   No se detectaron datos huérfanos después de la limpieza');
            console.log('   La integridad referencial entre clientes y cuenta corriente es correcta');
        } else {
            console.log('\n⚠️  AÚN QUEDAN DATOS HUÉRFANOS');
            console.log('   Se recomienda revisar manualmente las causas');
        }

        // 7. Estadísticas finales
        console.log('\n📈 ESTADÍSTICAS FINALES');
        console.log('-' .repeat(40));
        const estadisticas = await dbAll(`
            SELECT
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COUNT(*) FROM cuentas_corrientes) as total_cuentas,
                (SELECT COUNT(*) FROM deudas) as total_deudas,
                (SELECT COUNT(*) FROM movimientos_cuenta_corriente) as total_movimientos,
                (SELECT COUNT(*) FROM deuda_productos) as total_productos_deuda
        `);

        const stats = estadisticas[0];
        console.log(`   Clientes: ${stats.total_clientes}`);
        console.log(`   Cuentas corrientes: ${stats.total_cuentas}`);
        console.log(`   Deudas: ${stats.total_deudas}`);
        console.log(`   Movimientos: ${stats.total_movimientos}`);
        console.log(`   Productos de deuda: ${stats.total_productos_deuda}`);

        console.log('\n💡 RECOMENDACIONES PARA PREVENIR DATOS HUÉRFANOS:');
        console.log('   1. Habilitar claves foráneas: PRAGMA foreign_keys = ON');
        console.log('   2. Implementar eliminación en cascada para relaciones críticas');
        console.log('   3. Validar integridad referencial antes de operaciones de eliminación');
        console.log('   4. Crear procedimientos de auditoría periódica');
        console.log('   5. Considerar usar triggers para mantener consistencia automática');

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    } finally {
        db.close();
        console.log('\n=== FIN DE LA LIMPIEZA ===\n');
    }
}

// Ejecutar limpieza
limpiarDatosHuerfanos().catch(console.error);