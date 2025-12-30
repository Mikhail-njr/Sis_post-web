const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        getLastOrderDeliveryDate();
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

async function getLastOrderDeliveryDate() {
    try {
        console.log('🔍 Buscando fecha de entrega del último pedido...\n');

        // Obtener el último pedido creado
        const lastOrder = await dbAll(`
            SELECT pp.*, p.nombre_proveedor
            FROM pedidos_proveedores pp
            JOIN proveedores p ON pp.proveedor_id = p.id
            ORDER BY pp.fecha_pedido DESC, pp.id DESC
            LIMIT 1
        `);

        if (lastOrder.length === 0) {
            console.log('❌ No se encontraron pedidos en la base de datos');
            db.close();
            return;
        }

        const order = lastOrder[0];
        console.log('📋 Último pedido encontrado:');
        console.log(`   Número: ${order.numero_pedido}`);
        console.log(`   Proveedor: ${order.nombre_proveedor}`);
        console.log(`   Fecha del pedido: ${order.fecha_pedido}`);
        console.log(`   Estado: ${order.estado}`);
        console.log(`   Total: $${order.total}`);

        if (order.fecha_entrega) {
            console.log(`   Fecha de entrega: ${order.fecha_entrega}`);
            console.log('\n✅ Fecha de entrega del último pedido: ' + order.fecha_entrega);
        } else {
            console.log('   Fecha de entrega: No especificada');
            console.log('\n⚠️ El último pedido no tiene fecha de entrega especificada');
        }

        // Mostrar resumen de pedidos recientes
        console.log('\n📊 Resumen de pedidos más recientes:');
        const recentOrders = await dbAll(`
            SELECT pp.numero_pedido, p.nombre_proveedor, pp.fecha_pedido, pp.fecha_entrega, pp.estado, pp.total
            FROM pedidos_proveedores pp
            JOIN proveedores p ON pp.proveedor_id = p.id
            ORDER BY pp.fecha_pedido DESC
            LIMIT 5
        `);

        recentOrders.forEach((order, index) => {
            console.log(`${index + 1}. ${order.numero_pedido} - ${order.nombre_proveedor} - ${order.fecha_pedido} - Entrega: ${order.fecha_entrega || 'No especificada'} - Estado: ${order.estado}`);
        });

    } catch (error) {
        console.error('❌ Error obteniendo fecha de entrega del último pedido:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error cerrando la base de datos:', err.message);
            } else {
                console.log('\n✅ Conexión a la base de datos cerrada');
            }
        });
    }
}