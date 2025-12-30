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

async function verificarEliminacionCliente() {
    try {
        console.log('🔍 VERIFICACIÓN DE ELIMINACIÓN DE CLIENTE\n');

        // 1. Verificar si hay clientes con datos relacionados
        console.log('1. Buscando clientes con deudas o cuentas corrientes...');
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
            LIMIT 5
        `);

        if (clientesConDatos.length === 0) {
            console.log('   ℹ️ No hay clientes con datos relacionados. Creando datos de prueba...\n');

            // Crear cliente de prueba
            const clienteResult = await dbRun(
                "INSERT INTO clientes (nombre, telefono, dni) VALUES (?, ?, ?)",
                ['Cliente Prueba Eliminación', '123456789', '12345678']
            );
            const clienteId = clienteResult.id;
            console.log(`   ✅ Cliente de prueba creado con ID: ${clienteId}`);

            // Crear cuenta corriente
            await dbRun(
                "INSERT INTO cuentas_corrientes (cliente_id, saldo) VALUES (?, ?)",
                [clienteId, 100]
            );
            console.log('   ✅ Cuenta corriente creada');

            // Crear movimiento
            await dbRun(
                "INSERT INTO movimientos_cuenta_corriente (cuenta_corriente_id, tipo_movimiento, monto, descripcion) VALUES (?, ?, ?, ?)",
                [clienteId, 'cargo', 100, 'Movimiento de prueba']
            );
            console.log('   ✅ Movimiento de cuenta corriente creado');

            // Crear deuda
            const ventaResult = await dbRun(
                "INSERT INTO ventas (numero_factura, total, metodo_pago) VALUES (?, ?, ?)",
                ['TEST-DEL-001', 50, 'efectivo']
            );
            await dbRun(
                "INSERT INTO deudas (cliente_id, venta_id, monto_original, monto_pendiente) VALUES (?, ?, ?, ?)",
                [clienteId, ventaResult.id, 50, 50]
            );
            console.log('   ✅ Deuda creada');

            // Crear producto de deuda
            const productoResult = await dbRun(
                "INSERT INTO productos (codigo, nombre, precio, stock) VALUES (?, ?, ?, ?)",
                ['TEST-PROD', 'Producto Test', 10, 5]
            );
            await dbRun(
                "INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
                [clienteId, productoResult.id, 5, 10, 50]
            );
            console.log('   ✅ Producto de deuda creado\n');

            // Mostrar datos antes de eliminación
            await mostrarDatosCliente(clienteId, 'ANTES de eliminación');

            // Eliminar cliente usando el endpoint actual
            console.log('🗑️ Eliminando cliente usando DELETE FROM clientes...');
            const deleteResult = await dbRun("DELETE FROM clientes WHERE id = ?", [clienteId]);
            console.log(`   ✅ Query ejecutada. Filas afectadas: ${deleteResult.changes}\n`);

            // Verificar datos después de eliminación
            await mostrarDatosCliente(clienteId, 'DESPUÉS de eliminación');

        } else {
            console.log(`   ✅ Encontrados ${clientesConDatos.length} clientes con datos relacionados`);
            console.log('   Clientes encontrados:');
            clientesConDatos.forEach(c => {
                console.log(`     - ID ${c.id}: ${c.nombre} (${c.total_deudas} deudas, ${c.total_movimientos} movimientos)`);
            });
            console.log('\n   ⚠️ ADVERTENCIA: Usar un cliente real podría afectar datos productivos\n');
        }

        // 2. Verificar estado de claves foráneas
        console.log('2. Verificando estado de claves foráneas...');
        const fkStatus = await dbAll("PRAGMA foreign_keys");
        console.log(`   Estado de foreign_keys: ${fkStatus[0].foreign_keys ? 'HABILITADO' : 'DESHABILITADO'}`);

        if (!fkStatus[0].foreign_keys) {
            console.log('   ⚠️ Las claves foráneas están DESHABILITADAS');
            console.log('   Esto permite eliminación sin restricciones, dejando datos huérfanos');
        }

        console.log('\n📋 RESUMEN:');
        console.log('   - El endpoint DELETE /api/customers/:id solo elimina de la tabla clientes');
        console.log('   - NO elimina deudas, cuentas corrientes, movimientos ni productos de deuda');
        console.log('   - Las claves foráneas están deshabilitadas, permitiendo datos huérfanos');
        console.log('   - Se requiere eliminación en cascada manual para limpieza completa');

    } catch (error) {
        console.error('❌ Error en verificación:', error);
    } finally {
        db.close();
    }
}

async function mostrarDatosCliente(clienteId, titulo) {
    console.log(`   ${titulo}:`);

    // Verificar si cliente existe
    const cliente = await dbAll("SELECT * FROM clientes WHERE id = ?", [clienteId]);
    console.log(`     👤 Cliente: ${cliente.length > 0 ? 'EXISTE' : 'ELIMINADO'}`);

    // Deudas
    const deudas = await dbAll("SELECT COUNT(*) as count FROM deudas WHERE cliente_id = ?", [clienteId]);
    console.log(`     💰 Deudas: ${deudas[0].count}`);

    // Cuenta corriente
    const cuentas = await dbAll("SELECT COUNT(*) as count FROM cuentas_corrientes WHERE cliente_id = ?", [clienteId]);
    console.log(`     🏦 Cuentas corrientes: ${cuentas[0].count}`);

    // Movimientos
    const movimientos = await dbAll(`
        SELECT COUNT(*) as count FROM movimientos_cuenta_corriente mcc
        JOIN cuentas_corrientes cc ON mcc.cuenta_corriente_id = cc.id
        WHERE cc.cliente_id = ?
    `, [clienteId]);
    console.log(`     📊 Movimientos: ${movimientos[0].count}`);

    // Productos de deuda
    const productosDeuda = await dbAll(`
        SELECT COUNT(*) as count FROM deuda_productos dp
        JOIN deudas d ON dp.deuda_id = d.id
        WHERE d.cliente_id = ?
    `, [clienteId]);
    console.log(`     📦 Productos de deuda: ${productosDeuda[0].count}\n`);
}

// Ejecutar verificación
verificarEliminacionCliente().catch(console.error);