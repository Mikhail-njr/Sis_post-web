const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

async function testDeleteClient() {
    console.log('🧪 PRUEBA DETALLADA: Eliminación de Cliente\n');

    try {
        // 1. Verificar estructura de tablas relacionadas
        console.log('1. 📋 Estructura de tablas relacionadas con clientes:');

        const tables = ['clientes', 'deudas', 'cuentas_corrientes', 'movimientos_cuenta_corriente'];
        for (const table of tables) {
            const pragma = await dbAll(`PRAGMA table_info(${table})`);
            console.log(`\n   Tabla: ${table}`);
            pragma.forEach(col => {
                console.log(`   - ${col.name}: ${col.type} ${col.pk ? '(PK)' : ''} ${col.notnull ? '(NOT NULL)' : ''}`);
            });
        }

        // 2. Verificar restricciones de clave foránea
        console.log('\n2. 🔗 Restricciones de clave foránea:');
        const foreignKeys = await dbAll("PRAGMA foreign_key_list(clientes)");
        console.log('   Claves foráneas que referencian a clientes:', foreignKeys.length);

        // 3. Buscar cliente de prueba con datos relacionados
        console.log('\n3. 🔍 Buscando cliente con datos relacionados...');
        const clientesConDatos = await dbAll(`
            SELECT
                c.id,
                c.nombre,
                COUNT(d.id) as total_deudas,
                COUNT(cc.id) as tiene_cuenta_corriente,
                COUNT(mcc.id) as total_movimientos
            FROM clientes c
            LEFT JOIN deudas d ON c.id = d.cliente_id
            LEFT JOIN cuentas_corrientes cc ON c.id = cc.cliente_id
            LEFT JOIN movimientos_cuenta_corriente mcc ON cc.id = mcc.cuenta_corriente_id
            GROUP BY c.id, c.nombre
            HAVING total_deudas > 0 OR tiene_cuenta_corriente > 0
            LIMIT 1
        `);

        if (clientesConDatos.length === 0) {
            console.log('   ❌ No se encontraron clientes con datos relacionados para probar');
            return;
        }

        const clientePrueba = clientesConDatos[0];
        console.log(`   ✅ Cliente encontrado: ID ${clientePrueba.id} - ${clientePrueba.nombre}`);
        console.log(`      - Deudas: ${clientePrueba.total_deudas}`);
        console.log(`      - Tiene cuenta corriente: ${clientePrueba.tiene_cuenta_corriente > 0 ? 'Sí' : 'No'}`);
        console.log(`      - Movimientos: ${clientePrueba.total_movimientos}`);

        // 4. Intentar eliminación con el código actual
        console.log('\n4. 🗑️ Intentando eliminación con código actual...');

        try {
            const result = await dbRun("DELETE FROM clientes WHERE id = ?", [clientePrueba.id]);
            console.log(`   ✅ Eliminación exitosa: ${result.changes} registro(s) eliminado(s)`);

            // Verificar si quedaron datos huérfanos
            const deudasHuérfanas = await dbAll("SELECT COUNT(*) as count FROM deudas WHERE cliente_id = ?", [clientePrueba.id]);
            const cuentasHuérfanas = await dbAll("SELECT COUNT(*) as count FROM cuentas_corrientes WHERE cliente_id = ?", [clientePrueba.id]);

            console.log('\n5. 🔍 Verificación de datos huérfanos:');
            console.log(`   - Deudas huérfanas: ${deudasHuérfanas[0].count}`);
            console.log(`   - Cuentas corrientes huérfanas: ${cuentasHuérfanas[0].count}`);

            if (deudasHuérfanas[0].count > 0 || cuentasHuérfanas[0].count > 0) {
                console.log('   ❌ ¡HAY DATOS HUÉRFANOS! La eliminación no es completa.');
            } else {
                console.log('   ✅ No hay datos huérfanos.');
            }

        } catch (deleteError) {
            console.log(`   ❌ Error en eliminación: ${deleteError.message}`);

            // Verificar si es por restricciones de clave foránea
            if (deleteError.message.includes('FOREIGN KEY constraint failed')) {
                console.log('   🔗 Error causado por restricciones de clave foránea (datos relacionados impiden eliminación)');
            }
        }

        // 6. Propuesta de eliminación completa
        console.log('\n6. 💡 PROPUESTA: Eliminación completa del cliente');
        console.log('   Para eliminar completamente un cliente, se debe:');
        console.log('   1. Eliminar movimientos_cuenta_corriente asociados');
        console.log('   2. Eliminar cuentas_corrientes del cliente');
        console.log('   3. Eliminar deudas del cliente');
        console.log('   4. Eliminar el cliente');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        db.close();
    }
}

// Funciones auxiliares
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

// Ejecutar prueba
testDeleteClient().catch(console.error);