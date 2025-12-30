const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Función para buscar cliente Mika
async function checkMikaDebt() {
    try {
        console.log('\n🔍 Buscando cliente "Mika"...');
        
        // 1. Buscar cliente por nombre (insensible a mayúsculas/minúsculas)
        const customers = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM clientes WHERE LOWER(nombre) LIKE ? ORDER BY id", ['%mika%'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`\n📋 Clientes encontrados con nombre similar a "Mika": ${customers.length}`);

        if (customers.length === 0) {
            console.log('❌ No se encontró ningún cliente con el nombre "Mika"');
            return;
        }

        // Mostrar todos los clientes encontrados
        customers.forEach((customer, index) => {
            console.log(`\n${index + 1}. Cliente encontrado:`);
            console.log(`   ID: ${customer.id}`);
            console.log(`   Nombre: ${customer.nombre}`);
            console.log(`   Teléfono: ${customer.telefono || 'No especificado'}`);
            console.log(`   Dirección: ${customer.direccion || 'No especificada'}`);
            console.log(`   DNI: ${customer.dni || 'No especificado'}`);
            console.log(`   Nota: ${customer.nota || 'No especificada'}`);
            console.log(`   Creado: ${customer.created_at}`);
        });

        // 2. Verificar cuentas corrientes para cada cliente encontrado
        for (const customer of customers) {
            console.log(`\n💳 Verificando cuenta corriente para ${customer.nombre}...`);
            
            const cuentas = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        cc.*,
                        c.nombre as cliente_nombre
                    FROM cuentas_corrientes cc
                    JOIN clientes c ON cc.cliente_id = c.id
                    WHERE cc.cliente_id = ?
                `, [customer.id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (cuentas.length === 0) {
                console.log(`   ⚠️  ${customer.nombre} no tiene cuenta corriente activa`);
            } else {
                cuentas.forEach((cuenta, index) => {
                    console.log(`   ${index + 1}. Cuenta corriente encontrada:`);
                    console.log(`      ID: ${cuenta.id}`);
                    console.log(`      Cliente: ${cuenta.cliente_nombre}`);
                    console.log(`      Saldo: $${cuenta.saldo}`);
                    console.log(`      Creada: ${cuenta.created_at}`);
                    console.log(`      Actualizada: ${cuenta.updated_at}`);
                    
                    if (cuenta.saldo > 0) {
                        console.log(`      💰 Tiene saldo pendiente (adeuda)`);
                    } else if (cuenta.saldo < 0) {
                        console.log(`      💰 Tiene saldo a favor (tiene crédito)`);
                    } else {
                        console.log(`      💰 Saldo al día`);
                    }
                });
            }

            // 3. Verificar deudas pendientes
            console.log(`\n💸 Verificando deudas pendientes para ${customer.nombre}...`);
            
            const deudas = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        d.*,
                        c.nombre as cliente_nombre,
                        v.numero_factura,
                        v.created_at as venta_fecha,
                        dp.producto_id,
                        p.nombre as producto_nombre,
                        dp.cantidad,
                        dp.precio_unitario,
                        dp.subtotal
                    FROM deudas d
                    JOIN clientes c ON d.cliente_id = c.id
                    JOIN ventas v ON d.venta_id = v.id
                    JOIN deuda_productos dp ON d.id = dp.deuda_id
                    JOIN productos p ON dp.producto_id = p.id
                    WHERE d.cliente_id = ? AND d.estado = 'pendiente'
                    ORDER BY d.created_at DESC
                `, [customer.id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (deudas.length === 0) {
                console.log(`   ✅ ${customer.nombre} no tiene deudas pendientes`);
            } else {
                console.log(`   ❌ ${customer.nombre} tiene ${deudas.length} deudas pendientes`);
                
                // Agrupar deudas por factura
                const deudasPorFactura = {};
                deudas.forEach(deuda => {
                    if (!deudasPorFactura[deuda.numero_factura]) {
                        deudasPorFactura[deuda.numero_factura] = {
                            factura: deuda.numero_factura,
                            fecha: deuda.venta_fecha,
                            monto_original: deuda.monto_original,
                            monto_pendiente: deuda.monto_pendiente,
                            productos: []
                        };
                    }
                    deudasPorFactura[deuda.numero_factura].productos.push({
                        nombre: deuda.producto_nombre,
                        cantidad: deuda.cantidad,
                        precio_unitario: deuda.precio_unitario,
                        subtotal: deuda.subtotal
                    });
                });

                // Mostrar resumen de deudas
                Object.values(deudasPorFactura).forEach((deuda, index) => {
                    console.log(`\n   Factura #${index + 1}: ${deuda.factura}`);
                    console.log(`      Fecha: ${deuda.fecha}`);
                    console.log(`      Monto original: $${deuda.monto_original}`);
                    console.log(`      Monto pendiente: $${deuda.monto_pendiente}`);
                    console.log(`      Productos: ${deuda.productos.length}`);
                    deuda.productos.forEach(producto => {
                        console.log(`         - ${producto.nombre}: ${producto.cantidad} x $${producto.precio_unitario} = $${producto.subtotal}`);
                    });
                });

                // Calcular totales
                const totalDeuda = Object.values(deudasPorFactura).reduce((sum, d) => sum + d.monto_pendiente, 0);
                console.log(`\n   💸 TOTAL DEUDA PENDIENTE: $${totalDeuda}`);
            }

            // 4. Verificar movimientos en cuenta corriente
            if (cuentas.length > 0) {
                console.log(`\n📝 Verificando movimientos en cuenta corriente para ${customer.nombre}...`);
                
                const movimientos = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT 
                            mc.*,
                            cc.saldo as saldo_después
                        FROM movimientos_cuenta_corriente mc
                        JOIN cuentas_corrientes cc ON mc.cuenta_corriente_id = cc.id
                        WHERE cc.cliente_id = ?
                        ORDER BY mc.created_at DESC
                        LIMIT 20
                    `, [customer.id], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                if (movimientos.length === 0) {
                    console.log(`   ℹ️  No hay movimientos registrados en la cuenta corriente`);
                } else {
                    console.log(`   📊 Últimos ${movimientos.length} movimientos:`);
                    movimientos.forEach((mov, index) => {
                        const tipo = mov.tipo_movimiento === 'cargo' ? '➕ CARGO' : '➖ ABONO';
                        console.log(`      ${index + 1}. ${tipo} - $${mov.monto} - ${mov.created_at}`);
                        console.log(`         Descripción: ${mov.descripcion || 'Sin descripción'}`);
                        console.log(`         Saldo después: $${mov.saldo_después}`);
                    });
                }
            }

            console.log('\n' + '='.repeat(60));
        }

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Error cerrando la base de datos:', err.message);
            } else {
                console.log('\n✅ Conexión a la base de datos cerrada');
            }
            process.exit(0);
        });
    }
}

// Ejecutar la verificación
checkMikaDebt();