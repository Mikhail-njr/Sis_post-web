const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificación completa del cliente en cuenta corriente...\n');

db.serialize(() => {
    // Verificar cliente
    db.get("SELECT * FROM clientes WHERE id = 27", (err, cliente) => {
        if (err) {
            console.error('❌ Error obteniendo cliente:', err.message);
            return;
        }
        
        if (!cliente) {
            console.log('❌ Cliente no encontrado');
            return;
        }
        
        console.log('👤 DATOS DEL CLIENTE:');
        console.log(`   ID: ${cliente.id}`);
        console.log(`   Nombre: ${cliente.nombre}`);
        console.log(`   Teléfono: ${cliente.telefono || 'No registrado'}`);
        console.log(`   DNI: ${cliente.dni || 'No registrado'}`);
        console.log(`   Dirección: ${cliente.direccion || 'No especificada'}`);
        console.log(`   Nota: ${cliente.nota || 'Sin notas'}`);
        console.log(`   Creado: ${cliente.created_at}`);
        console.log(`   Actualizado: ${cliente.updated_at || 'No actualizado'}`);
        console.log('');
        
        // Verificar ventas asociadas
        db.all(`
            SELECT v.*, 
                   c.nombre as cliente_nombre
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE v.cliente_id = ?
            ORDER BY v.id DESC
        `, [cliente.id], (err, ventas) => {
            if (err) {
                console.error('❌ Error obteniendo ventas:', err.message);
                return;
            }
            
            console.log(`🛒 VENTAS ASOCIADAS: ${ventas.length}`);
            if (ventas.length > 0) {
                ventas.forEach((venta, index) => {
                    console.log(`   --- Venta ${index + 1} ---`);
                    console.log(`   ID: ${venta.id}`);
                    console.log(`   Cliente: ${venta.cliente_nombre || 'Sin nombre'}`);
                    console.log(`   Total: $${venta.total}`);
                    console.log(`   Tipo de pago: ${venta.tipo_pago || 'No especificado'}`);
                    console.log(`   Estado: ${venta.estado || 'No especificado'}`);
                    console.log(`   Creado: ${venta.created_at}`);
                    console.log('');
                });
            } else {
                console.log('   ℹ️  No hay ventas registradas para este cliente');
                console.log('');
            }
            
            // Verificar deudas asociadas
            db.all(`
                SELECT d.*, 
                       c.nombre as cliente_nombre,
                       v.id as venta_id,
                       v.total as venta_total
                FROM deudas d
                LEFT JOIN clientes c ON d.cliente_id = c.id
                LEFT JOIN ventas v ON d.venta_id = v.id
                WHERE d.cliente_id = ?
                ORDER BY d.id DESC
            `, [cliente.id], (err, deudas) => {
                if (err) {
                    console.error('❌ Error obteniendo deudas:', err.message);
                    return;
                }
                
                console.log(`💰 DEUDAS ASOCIADAS: ${deudas.length}`);
                if (deudas.length > 0) {
                    deudas.forEach((deuda, index) => {
                        console.log(`   --- Deuda ${index + 1} ---`);
                        console.log(`   ID: ${deuda.id}`);
                        console.log(`   Cliente: ${deuda.cliente_nombre || 'Sin nombre'}`);
                        console.log(`   Venta ID: ${deuda.venta_id || 'Sin venta'}`);
                        console.log(`   Monto: $${deuda.monto}`);
                        console.log(`   Monto pendiente: $${deuda.monto_pendiente}`);
                        console.log(`   Estado: ${deuda.estado}`);
                        console.log(`   Creado: ${deuda.created_at}`);
                        console.log('');
                    });
                } else {
                    console.log('   ✅ No hay deudas pendientes para este cliente');
                    console.log('');
                }
                
                // Verificar pagos asociados
                db.all(`
                    SELECT p.*, 
                           c.nombre as cliente_nombre,
                           d.id as deuda_id
                    FROM pagos p
                    LEFT JOIN clientes c ON p.cliente_id = c.id
                    LEFT JOIN deudas d ON p.deuda_id = d.id
                    WHERE p.cliente_id = ?
                    ORDER BY p.id DESC
                `, [cliente.id], (err, pagos) => {
                    if (err) {
                        console.error('❌ Error obteniendo pagos:', err.message);
                        return;
                    }
                    
                    console.log(`💳 PAGOS ASOCIADOS: ${pagos.length}`);
                    if (pagos.length > 0) {
                        pagos.forEach((pago, index) => {
                            console.log(`   --- Pago ${index + 1} ---`);
                            console.log(`   ID: ${pago.id}`);
                            console.log(`   Cliente: ${pago.cliente_nombre || 'Sin nombre'}`);
                            console.log(`   Deuda ID: ${pago.deuda_id || 'Sin deuda'}`);
                            console.log(`   Monto: $${pago.monto}`);
                            console.log(`   Tipo: ${pago.tipo || 'No especificado'}`);
                            console.log(`   Creado: ${pago.created_at}`);
                            console.log('');
                        });
                    } else {
                        console.log('   ℹ️  No hay pagos registrados para este cliente');
                        console.log('');
                    }
                    
                    console.log('✅ VERIFICACIÓN COMPLETA DEL CLIENTE FINALIZADA');
                    console.log('');
                    console.log('RESUMEN:');
                    console.log(`   - Cliente: ${cliente.nombre} (ID: ${cliente.id})`);
                    console.log(`   - Teléfono: ${cliente.telefono || 'No registrado'}`);
                    console.log(`   - DNI: ${cliente.dni || 'No registrado'}`);
                    console.log(`   - Ventas: ${ventas.length}`);
                    console.log(`   - Deudas: ${deudas.length}`);
                    console.log(`   - Pagos: ${pagos.length}`);
                    
                    db.close();
                });
            });
        });
    });
});