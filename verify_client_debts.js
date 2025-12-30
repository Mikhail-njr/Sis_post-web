const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar base de datos
const dbPath = path.join(__dirname, 'backend', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando cliente y deudas en cuenta corriente...\n');

db.serialize(() => {
    // Verificar cliente
    db.all("SELECT id, nombre, telefono, dni FROM clientes ORDER BY id DESC LIMIT 5", (err, clientes) => {
        if (err) {
            console.error('❌ Error obteniendo clientes:', err.message);
            return;
        }
        
        console.log(`📋 Clientes encontrados: ${clientes.length}\n`);
        
        if (clientes.length > 0) {
            clientes.forEach((cliente, index) => {
                console.log(`--- Cliente ${index + 1} ---`);
                console.log(`ID: ${cliente.id}`);
                console.log(`Nombre: ${cliente.nombre}`);
                console.log(`Teléfono: ${cliente.telefono || 'No registrado'}`);
                console.log(`DNI: ${cliente.dni || 'No registrado'}`);
                console.log('');
            });
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
            ORDER BY d.id DESC LIMIT 10
        `, (err, deudas) => {
            if (err) {
                console.error('❌ Error obteniendo deudas:', err.message);
                return;
            }
            
            console.log(`💰 Deudas encontradas: ${deudas.length}`);
            if (deudas.length > 0) {
                deudas.forEach((deuda, index) => {
                    console.log(`--- Deuda ${index + 1} ---`);
                    console.log(`ID: ${deuda.id}`);
                    console.log(`Cliente: ${deuda.cliente_nombre || 'Sin nombre'}`);
                    console.log(`Venta ID: ${deuda.venta_id || 'Sin venta'}`);
                    console.log(`Monto: $${deuda.monto}`);
                    console.log(`Monto pendiente: $${deuda.monto_pendiente}`);
                    console.log(`Estado: ${deuda.estado}`);
                    console.log(`Creado: ${deuda.created_at}`);
                    console.log('');
                });
            }
            
            // Verificar integridad referencial
            db.get(`
                SELECT COUNT(*) as sin_cliente
                FROM deudas d
                LEFT JOIN clientes c ON d.cliente_id = c.id
                WHERE c.id IS NULL
            `, (err, result) => {
                if (err) {
                    console.error('❌ Error verificando integridad:', err.message);
                    return;
                }
                
                if (result.sin_cliente > 0) {
                    console.log(`⚠️  Deudas sin cliente asociado: ${result.sin_cliente}`);
                } else {
                    console.log(`✅ Todas las deudas tienen cliente asociado`);
                }
                
                console.log('\n✅ Verificación completada exitosamente');
                db.close();
            });
        });
    });
});