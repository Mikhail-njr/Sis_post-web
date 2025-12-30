const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend/pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

async function createTestClientWithDebts() {
    console.log('🧪 Creando cliente de prueba con deudas y cuenta corriente...\n');

    const timestamp = Date.now();

    try {
        // Iniciar transacción
        await dbRun("BEGIN TRANSACTION");

        // 1. Crear cliente de prueba
        console.log('1. 👤 Creando cliente de prueba...');
        const clientResult = await dbRun(
            "INSERT INTO clientes (nombre, telefono, direccion, dni, nota) VALUES (?, ?, ?, ?, ?)",
            ['Cliente Prueba Eliminación', '123456789', 'Dirección de Prueba', '12345678', 'Cliente creado para pruebas de eliminación']
        );
        const clienteId = clientResult.id;
        console.log(`   ✅ Cliente creado con ID: ${clienteId}`);

        // 2. Crear cuenta corriente
        console.log('\n2. 💰 Creando cuenta corriente...');
        const cuentaResult = await dbRun(
            "INSERT INTO cuentas_corrientes (cliente_id, saldo) VALUES (?, ?)",
            [clienteId, 150.50]
        );
        const cuentaId = cuentaResult.id;
        console.log(`   ✅ Cuenta corriente creada con ID: ${cuentaId}`);

        // 3. Crear movimientos en cuenta corriente
        console.log('\n3. 📊 Creando movimientos de cuenta corriente...');
        await dbRun(
            "INSERT INTO movimientos_cuenta_corriente (cuenta_corriente_id, tipo_movimiento, monto, descripcion) VALUES (?, ?, ?, ?)",
            [cuentaId, 'cargo', 100.00, `Compra a crédito - Factura TEST-${timestamp}-001`]
        );
        await dbRun(
            "INSERT INTO movimientos_cuenta_corriente (cuenta_corriente_id, tipo_movimiento, monto, descripcion) VALUES (?, ?, ?, ?)",
            [cuentaId, 'cargo', 50.50, `Compra a crédito - Factura TEST-${timestamp}-002`]
        );
        await dbRun(
            "INSERT INTO movimientos_cuenta_corriente (cuenta_corriente_id, tipo_movimiento, monto, descripcion) VALUES (?, ?, ?, ?)",
            [cuentaId, 'abono', 25.00, `Pago parcial - Factura TEST-${timestamp}-001`]
        );
        console.log('   ✅ Movimientos creados');

        // 4. Crear ventas de prueba
        console.log('\n4. 🧾 Creando ventas de prueba...');
        const venta1Result = await dbRun(
            "INSERT INTO ventas (numero_factura, total, metodo_pago) VALUES (?, ?, ?)",
            [`TEST-${timestamp}-001`, 100.00, 'cuenta_corriente']
        );
        const venta2Result = await dbRun(
            "INSERT INTO ventas (numero_factura, total, metodo_pago) VALUES (?, ?, ?)",
            [`TEST-${timestamp}-002`, 50.50, 'cuenta_corriente']
        );
        console.log(`   ✅ Ventas creadas: ${venta1Result.id}, ${venta2Result.id}`);

        // 5. Crear deudas
        console.log('\n5. 💳 Creando deudas...');
        await dbRun(
            "INSERT INTO deudas (cliente_id, venta_id, monto_original, monto_pendiente, estado) VALUES (?, ?, ?, ?, ?)",
            [clienteId, venta1Result.id, 100.00, 75.00, 'pendiente']
        );
        await dbRun(
            "INSERT INTO deudas (cliente_id, venta_id, monto_original, monto_pendiente, estado) VALUES (?, ?, ?, ?, ?)",
            [clienteId, venta2Result.id, 50.50, 50.50, 'pendiente']
        );
        console.log('   ✅ Deudas creadas');

        // 6. Crear productos de deuda (opcional pero recomendado)
        console.log('\n6. 📦 Creando productos de deuda...');

        // Primero crear productos si no existen
        let producto1Id, producto2Id;
        const existingProducts = await dbAll("SELECT id, nombre FROM productos LIMIT 2");

        if (existingProducts.length >= 2) {
            producto1Id = existingProducts[0].id;
            producto2Id = existingProducts[1].id;
        } else {
            // Crear productos de prueba
            const prod1Result = await dbRun(
                "INSERT INTO productos (codigo, nombre, precio, stock) VALUES (?, ?, ?, ?)",
                ['TEST-PROD-001', 'Producto Prueba 1', 25.00, 10]
            );
            const prod2Result = await dbRun(
                "INSERT INTO productos (codigo, nombre, precio, stock) VALUES (?, ?, ?, ?)",
                ['TEST-PROD-002', 'Producto Prueba 2', 12.50, 5]
            );
            producto1Id = prod1Result.id;
            producto2Id = prod2Result.id;
        }

        // Insertar productos de deuda para venta 1
        await dbRun(
            "INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
            [1, producto1Id, 2, 25.00, 50.00] // deuda_id = 1 (primera deuda creada)
        );
        await dbRun(
            "INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
            [1, producto2Id, 2, 12.50, 25.00]
        );

        // Insertar productos de deuda para venta 2
        await dbRun(
            "INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
            [2, producto1Id, 1, 25.00, 25.00] // deuda_id = 2 (segunda deuda creada)
        );
        await dbRun(
            "INSERT INTO deuda_productos (deuda_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
            [2, producto2Id, 1, 12.50, 12.50]
        );

        console.log('   ✅ Productos de deuda creados');

        await dbRun("COMMIT");

        console.log('\n✅ CLIENTE DE PRUEBA CREADO EXITOSAMENTE');
        console.log(`   ID del cliente: ${clienteId}`);
        console.log('   Nombre: Cliente Prueba Eliminación');
        console.log('   Deudas: 2 (montos: $100 y $50.50)');
        console.log('   Cuenta corriente: Sí (saldo: $150.50)');
        console.log('   Movimientos: 3 (2 cargos, 1 abono)');

        console.log('\n🔍 Ahora puedes ejecutar test_delete_client_detailed.js para probar la eliminación');

    } catch (error) {
        await dbRun("ROLLBACK");
        console.error('❌ Error creando cliente de prueba:', error);
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

// Ejecutar creación
createTestClientWithDebts().catch(console.error);