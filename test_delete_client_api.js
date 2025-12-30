const fetch = require('node-fetch');

async function testDeleteClientAPI() {
    console.log('🧪 Probando eliminación de cliente via API...\n');

    const clientId = 18; // ID del cliente de prueba creado
    const url = `http://localhost:3000/api/customers/${clientId}`;

    try {
        console.log(`1. 📤 Enviando DELETE request a: ${url}`);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('admin:pos123').toString('base64')
            }
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const result = await response.json();
            console.log('   ✅ Respuesta exitosa:', result);

            // Verificar que no queden datos huérfanos
            console.log('\n2. 🔍 Verificando eliminación completa...');
            await verifyDeletion(clientId);

        } else {
            const error = await response.text();
            console.log('   ❌ Error en la respuesta:', error);
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

async function verifyDeletion(clientId) {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
    const db = new sqlite3.Database(dbPath);

    try {
        // Verificar que el cliente ya no existe
        const cliente = await dbAll("SELECT id, nombre FROM clientes WHERE id = ?", [clientId]);
        console.log(`   - Cliente ID ${clientId}: ${cliente.length === 0 ? '✅ ELIMINADO' : '❌ AÚN EXISTE'}`);

        // Verificar deudas
        const deudas = await dbAll("SELECT COUNT(*) as count FROM deudas WHERE cliente_id = ?", [clientId]);
        console.log(`   - Deudas del cliente: ${deudas[0].count === 0 ? '✅ ELIMINADAS' : `❌ ${deudas[0].count} RESTANTES`}`);

        // Verificar cuenta corriente
        const cuentas = await dbAll("SELECT COUNT(*) as count FROM cuentas_corrientes WHERE cliente_id = ?", [clientId]);
        console.log(`   - Cuenta corriente: ${cuentas[0].count === 0 ? '✅ ELIMINADA' : `❌ ${cuentas[0].count} RESTANTES`}`);

        // Verificar movimientos (aunque no deberían existir sin cuenta corriente)
        const movimientos = await dbAll(`
            SELECT COUNT(*) as count FROM movimientos_cuenta_corriente
            WHERE cuenta_corriente_id IN (
                SELECT id FROM cuentas_corrientes WHERE cliente_id = ?
            )
        `, [clientId]);
        console.log(`   - Movimientos de cuenta corriente: ${movimientos[0].count === 0 ? '✅ ELIMINADOS' : `❌ ${movimientos[0].count} RESTANTES`}`);

        // Verificar productos de deuda
        const productosDeuda = await dbAll(`
            SELECT COUNT(*) as count FROM deuda_productos
            WHERE deuda_id IN (
                SELECT id FROM deudas WHERE cliente_id = ?
            )
        `, [clientId]);
        console.log(`   - Productos de deuda: ${productosDeuda[0].count === 0 ? '✅ ELIMINADOS' : `❌ ${productosDeuda[0].count} RESTANTES`}`);

        const allClean = cliente.length === 0 && deudas[0].count === 0 && cuentas[0].count === 0 &&
                        movimientos[0].count === 0 && productosDeuda[0].count === 0;

        console.log(`\n${allClean ? '🎉 ¡ELIMINACIÓN COMPLETA EXITOSA!' : '⚠️ Hay datos huérfanos restantes'}`);

    } catch (error) {
        console.error('Error verificando eliminación:', error);
    } finally {
        db.close();
    }
}

// Función auxiliar
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
        const db = new sqlite3.Database(dbPath);

        db.all(query, params, (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Ejecutar prueba
testDeleteClientAPI().catch(console.error);